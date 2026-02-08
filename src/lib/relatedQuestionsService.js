/**
 * Related Questions API Service (接口A)
 * 获取推荐问题列表
 *
 * 前端只调用本地 /api/related-questions，由后端代理真实的 Dify 接口。
 * 首屏/刷新推荐问题使用 runStarterWorkflow，走 /api/workflows/run（blocking）。
 */

import { apiGetMagnetStage } from '../api/backendClient.js';
import { getCachedMagnetStageByMagnetId } from './magnetIdService';

// 本地后端代理地址
const API_URL = '/api/related-questions';
const WORKFLOW_RUN_URL = '/api/workflows/run';

// cId(magnet_id) -> stage 缓存（避免每次都请求 /api/magnets/:id/stage）
const stageCache = new Map();

/**
 * 获取推荐问题列表
 * @param {string} cId - Customer ID (magnet_id)
 * @param {string} conversationId - Conversation ID (可选)
 * @returns {Promise<string[]>} 推荐问题数组
 */
export async function getRelatedQuestions(cId, conversationId = '') {
  try {
    let stage = '';

    if (!cId) {
      console.warn('Customer ID (cId) 未提供，使用空字符串');
    } else {
      if (stageCache.has(cId)) {
        stage = stageCache.get(cId) || '';
      } else {
        const cachedStage = getCachedMagnetStageByMagnetId(cId);
        if (cachedStage != null) {
          stage = cachedStage || '';
          stageCache.set(cId, stage);
        } else {
          try {
            stage = await apiGetMagnetStage(cId);
          } catch (err) {
            console.warn('查询 magnet 表异常:', err);
            stage = '';
          } finally {
            stageCache.set(cId, stage || '');
          }
        }
      }
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          magnet_id: cId || '',
          stage: stage || '',
        },
        query: 'anything',
        response_mode: 'streaming',
        conversation_id: conversationId || '',
        user: cId || 'abc-123',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取推荐问题失败:', response.status, errorText);
      return [];
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
              console.error('推荐问题API错误:', data.message);
              return [];
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

    // 解析返回的JSON格式
    // 格式: {"recom": {"recom": ["问题1", "问题2", "问题3"]}, "stage": {...}}
    if (!fullAnswer.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(fullAnswer);

      // 检查是否有 recom.recom 数组
      if (parsed.recom && parsed.recom.recom && Array.isArray(parsed.recom.recom)) {
        return parsed.recom.recom;
      }

      // 兼容其他可能的格式
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
      if (parsed.recom && Array.isArray(parsed.recom)) {
        return parsed.recom;
      }

      console.warn('推荐问题API返回格式不符合预期:', parsed);
      return [];
    } catch (e) {
      console.error('解析推荐问题JSON失败:', e, '原始内容:', fullAnswer);
      // 如果不是JSON，尝试按行分割
      const questions = fullAnswer
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      return questions.length > 0 ? questions : [];
    }

  } catch (error) {
    console.error('获取推荐问题时发生错误:', error);
    return [];
  }
}

/**
 * 运行首屏推荐 workflow（blocking）
 * 用于主流程 chat 的首屏与刷新，以及 MorningBriefing 预加载。
 *
 * @param {string|number} magnetId - magnet 表 id（会转为 number）
 * @returns {Promise<{ answerType: 'recom'|'no_answer', recQuestion?: Array<{ question: string }>, noAnswerTxt?: string }>}
 */
export async function runStarterWorkflow(magnetId) {
  const id = magnetId != null && magnetId !== '' ? Number(magnetId) : 0;
  if (!id || Number.isNaN(id)) {
    console.warn('runStarterWorkflow: invalid magnetId', magnetId);
    return { answerType: 'no_answer', noAnswerTxt: '' };
  }

  try {
    const response = await fetch(WORKFLOW_RUN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { magnet_id: id, stage: '' },
        response_mode: 'blocking',
        user: 'abc-123',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('runStarterWorkflow 失败:', response.status, errorText);
      return { answerType: 'no_answer', noAnswerTxt: '' };
    }

    const json = await response.json();
    const outputs = json?.data?.outputs ?? json?.outputs ?? {};
    const answerType = (outputs.answer_type ?? outputs.answerType ?? 'no_answer').toLowerCase();
    const recQuestion = Array.isArray(outputs.rec_question)
      ? outputs.rec_question.slice(0, 3)
      : Array.isArray(outputs.recQuestion)
        ? outputs.recQuestion.slice(0, 3)
        : [];
    const noAnswerTxt = typeof outputs.no_answer_txt === 'string'
      ? outputs.no_answer_txt
      : typeof outputs.noAnswerTxt === 'string'
        ? outputs.noAnswerTxt
        : '';

    return {
      answerType: answerType === 'recom' ? 'recom' : 'no_answer',
      recQuestion: answerType === 'recom' ? recQuestion : undefined,
      noAnswerTxt: answerType === 'no_answer' ? noAnswerTxt : undefined,
    };
  } catch (error) {
    console.error('runStarterWorkflow 发生错误:', error);
    return { answerType: 'no_answer', noAnswerTxt: '' };
  }
}
