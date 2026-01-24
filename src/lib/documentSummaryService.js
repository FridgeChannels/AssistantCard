/**
 * Document Summary API Service (接口B)
 * 获取文档总结内容，用于发送Email或短信
 */

import { env } from '../config/env.js';

// 从环境变量中读取配置，不在前端代码中硬编码 URL 或 Token
const API_URL = env.DOCUMENT_SUMMARY_API_URL;
const API_TOKEN = env.DOCUMENT_SUMMARY_API_TOKEN;

/**
 * 获取文档总结内容
 * @param {string} query - 查询内容（guide状态下返回的内容）
 * @param {string} agentName - 代理名称
 * @param {string} cId - 客户ID（从路由获取）
 * @returns {Promise<{email: string, message: string}>} 包含email和message的对象
 */
export async function getDocumentSummary(query, agentName, cId) {
  try {
    // 如果配置缺失，直接返回空结果，避免在前端暴露默认 URL/Token
    if (!API_URL || !API_TOKEN) {
      console.error('Document Summary API configuration is missing. Please check your environment variables.');
      return {
        email: '',
        message: ''
      };
    }
    if (!query) {
      console.warn('查询内容为空');
      return {
        email: '',
        message: ''
      };
    }

    if (!cId) {
      console.warn('客户ID (cId) 未提供');
      return {
        email: '',
        message: ''
      };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          agent_name: agentName,
          magnet_id: cId,
        },
        query: query,
        response_mode: 'streaming',
        conversation_id: '',
        user: 'abc-123',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取文档总结失败:', response.status, errorText);
      return {
        email: '',
        message: ''
      };
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) {
          fullAnswer += buffer.trim();
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        if (line.startsWith('data: ')) {
          const content = line.substring(6);

          try {
            const data = JSON.parse(content);

            if (data.event === 'error') {
              console.error('文档总结API错误:', data.message);
              return {
                email: '',
                message: ''
              };
            }

            if (data.event === 'message' && data.answer) {
              fullAnswer += data.answer;
            }
          } catch (e) {
            // 忽略JSON解析错误，继续处理
          }
        }
      }
    }

    // 解析返回的JSON对象
    if (!fullAnswer.trim()) {
      return {
        email: '',
        message: ''
      };
    }

    try {
      const parsed = JSON.parse(fullAnswer);

      // 检查返回格式是否符合预期
      if (parsed.email && parsed.message) {
        return {
          email: parsed.email || '',
          message: parsed.message || ''
        };
      }

      // 如果格式不符合，返回原始内容
      return {
        email: fullAnswer,
        message: fullAnswer
      };
    } catch (e) {
      // 如果不是JSON格式，返回原始内容
      return {
        email: fullAnswer,
        message: fullAnswer
      };
    }

  } catch (error) {
    console.error('获取文档总结时发生错误:', error);
    return {
      email: '',
      message: ''
    };
  }
}
