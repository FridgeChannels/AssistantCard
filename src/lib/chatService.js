/**
 * Chat API Service
 * 前端只调用本地 /api/chat-messages，由后端代理请求真实的 Chat API
 */

const API_URL = '/api/chat-messages';

/**
 * Send a chat message and handle streaming response
 * @param {string} query - User's question
 * @param {string} cId - Customer ID (from route parameters)
 * @param {string} conversationId - Conversation ID (optional, for maintaining context)
 * @param {string} agentName - Agent name (optional, defaults to empty string)
 * @returns {Promise<{answer: string, conversationId: string}>}
 */
export async function sendChatMessage(query, cId, conversationId = '', agentName = '') {
  if (!cId) {
    throw new Error('Customer ID (cId) is required.');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          magnet_id: cId,
          agent_name: agentName || '',
        },
        query: query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: cId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API request failed: ${response.status} - ${errorText}`);
    }

    // Check if response is JSON or streaming
    const contentType = response.headers.get('content-type') || '';
    if (debugStream) {
      console.log('[stream] response headers', {
        status: response.status,
        contentType,
        hasBody: !!response.body,
      });
    }

    if (contentType.includes('application/json')) {
      // Non-streaming JSON response
      const data = await response.json();
      return {
        answer: data.answer || "I'm sorry, I didn't receive a valid response. Please try again.",
        answerMethod: data.answer_method,
        conversationId: data.conversation_id || conversationId,
      };
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';
    let answerMethod = null;
    let newConversationId = conversationId;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Try to parse any remaining buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim());
            if (data.answer) {
              fullAnswer = data.answer;
            }
            if (data.answer_method) {
              answerMethod = data.answer_method;
            }
            if (data.conversation_id) {
              newConversationId = data.conversation_id;
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        // Handle SSE format data
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            // Extract answer text (could be partial or complete)
            if (data.answer) {
              fullAnswer = data.answer; // Replace with latest complete answer
            }

            // Extract answer_method
            if (data.answer_method) {
              answerMethod = data.answer_method;
            }

            // Extract conversation_id
            if (data.conversation_id) {
              newConversationId = data.conversation_id;
            }

            // Handle error event
            if (data.event === 'error') {
              const errorMessage = data.message || 'An error occurred while processing your request.';
              const error = new Error(errorMessage);
              error.code = data.code;
              error.status = data.status;
              throw error;
            }

            // Check for end event markers
            if (data.event === 'message_end') {
              break;
            }
          } catch (e) {
            // If it's an error event, re-throw it
            if (e.code && e.status) {
              throw e;
            }
            console.warn('Failed to parse streaming data:', e, line);
          }
        } else if (line.trim().startsWith('{')) {
          // Direct JSON format
          try {
            const data = JSON.parse(line.trim());
            if (data.answer) {
              fullAnswer = data.answer;
            }
            if (data.answer_method) {
              answerMethod = data.answer_method;
            }
            if (data.conversation_id) {
              newConversationId = data.conversation_id;
            }

            // Handle error event (direct JSON format)
            if (data.event === 'error') {
              const errorMessage = data.message || 'An error occurred while processing your request.';
              const error = new Error(errorMessage);
              error.code = data.code;
              error.status = data.status;
              throw error;
            }
          } catch (e) {
            // If it's an error event, re-throw it
            if (e.code && e.status) {
              throw e;
            }
            console.warn('Failed to parse JSON data:', e);
          }
        }
      }
    }

    return {
      answer: fullAnswer || "I'm sorry, I didn't receive a valid response. Please try again.",
      answerMethod: answerMethod,
      conversationId: newConversationId,
    };
  } catch (error) {
    console.error('Chat API call failed:', error);
    throw error;
  }
}

/**
 * Streaming response handler with callbacks (for real-time UI updates)
 * @param {string} query - User's question
 * @param {string} cId - Customer ID
 * @param {string} conversationId - Conversation ID
 * @param {Function} onChunk - Callback when a data chunk is received (chunk: string) => void
 * @param {Function} onComplete - Callback when complete (answer: string, conversationId: string, answerMethod?: string) => void
 * @param {Function} onError - Callback on error (error: Error) => void
 * @param {string} agentName - Agent name (optional, defaults to empty string)
 */
export async function sendChatMessageStream(
  query,
  cId,
  conversationId = '',
  onChunk,
  onComplete,
  onError,
  agentName = ''
) {
  if (!cId) {
    const error = new Error('Customer ID (cId) is required.');
    onError?.(error);
    return;
  }

  try {
    const debugStream =
      typeof window !== 'undefined' &&
      window.localStorage &&
      window.localStorage.getItem('stream_debug') === '1';
    const streamStartAt = Date.now();
    let lastChunkAt = streamStartAt;
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          magnet_id: cId,
          agent_name: agentName || '',
        },
        query: query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: cId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API request failed: ${response.status} - ${errorText}`);
    }

    // Check if response is JSON or streaming
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Non-streaming JSON response (shouldn't happen, but handle it)
      if (debugStream) {
        console.log('[stream] non-streaming JSON response');
      }
      const data = await response.json();
      const answer = data.answer || "I'm sorry, I didn't receive a valid response. Please try again.";
      onChunk?.(answer);
      onComplete?.(answer, data.conversation_id || conversationId, data.answer_method);
      return;
    }

    if (!response.body) {
      if (debugStream) {
        console.log('[stream] missing response body');
      }
      throw new Error('Chat API response body is empty.');
    }

    // Process streaming response (plain text format)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';
    let newConversationId = conversationId;
    let extractedAnswerMethod = null; // Track answer_method from stream
    const appendAnswerChunk = (text) => {
      if (!text) return;
      const normalized = String(text);
      if (normalized.startsWith(fullAnswer)) {
        const delta = normalized.slice(fullAnswer.length);
        if (delta) {
          fullAnswer += delta;
          onChunk?.(delta);
        }
      } else {
        fullAnswer += normalized;
        onChunk?.(normalized);
      }
    };

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer as plain text
        if (buffer.trim()) {
          appendAnswerChunk(buffer.trim());
        }
        break;
      }

      if (debugStream) {
        const now = Date.now();
        console.log('[stream] chunk received', {
          bytes: value?.length || 0,
          msFromStart: now - streamStartAt,
          msSinceLast: now - lastChunkAt,
        });
        lastChunkAt = now;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        // Handle SSE format: data: <JSON>
        if (line.startsWith('data: ')) {
          const content = line.substring(6); // Remove 'data: ' prefix

          try {
            const data = JSON.parse(content);

            // Handle error event
            if (data.event === 'error') {
              const errorMessage = data.message || 'An error occurred while processing your request.';
              const error = new Error(errorMessage);
              error.code = data.code;
              error.status = data.status;
              onError?.(error);
              return; // Exit early on error
            }

            // Extract answer text from message events
            if (data.answer && (data.event === 'message' || data.event === 'agent_message' || !data.event)) {
              appendAnswerChunk(data.answer);
            }

            // Extract answer_method from JSON if present
            if (data.answer_method) {
              extractedAnswerMethod = data.answer_method;
            }

            // Extract conversation_id from JSON if present
            if (data.conversation_id) {
              newConversationId = data.conversation_id;
            }

            // Check for end event markers
            if (data.event === 'message_end' || data.event === 'workflow_finished') {
              break;
            }
          } catch (e) {
            // If not JSON, treat as plain text (fallback)
            console.warn('Failed to parse SSE data as JSON:', e, content);
            appendAnswerChunk(content);
          }
        } else if (line.trim().startsWith('{')) {
          // Direct JSON format (likely error event)
          try {
            const data = JSON.parse(line.trim());

            // Handle error event
            if (data.event === 'error') {
              const errorMessage = data.message || 'An error occurred while processing your request.';
              const error = new Error(errorMessage);
              error.code = data.code;
              error.status = data.status;
              onError?.(error);
              return; // Exit early on error
            }

            // Extract answer from direct JSON
            if (data.answer) {
              appendAnswerChunk(data.answer);
            }

            // Extract answer_method from JSON if present
            if (data.answer_method) {
              extractedAnswerMethod = data.answer_method;
            }

            // Extract conversation_id if present
            if (data.conversation_id) {
              newConversationId = data.conversation_id;
            }
          } catch (e) {
            // Not JSON, treat as plain text
            appendAnswerChunk(line);
          }
        } else {
          // Plain text line (shouldn't happen, but handle it)
          appendAnswerChunk(line);
        }
      }
    }

    onComplete?.(fullAnswer || "I'm sorry, I didn't receive a valid response. Please try again.", newConversationId, extractedAnswerMethod || undefined);
  } catch (error) {
    console.error('Chat API call failed:', error);
    onError?.(error);
  }
}
