/**
 * 日志服务 - 统一管理所有日志记录
 * 基于 sessionId 和 cId 追踪用户行为
 */

import { getOrCreateSessionId, getDeviceInfo } from './sessionManager';
import {
    apiLogUserAction,
    apiLogChatMessage,
    apiCreatePlayLog,
    apiUpdatePlayLog,
} from '../api/backendClient.js';

/**
 * 记录用户行为日志
 * @param {object} params - 日志参数
 * @param {string} params.cId - Customer/Magnet ID
 * @param {string} params.actionType - 行为类型
 * @param {number} [params.magnetConfigQaId] - 问题库ID
 * @param {string} [params.conversationId] - 对话ID (Not used in DB)
 * @param {string} [params.questionText] - 问题文本 (Not used in DB)
 * @param {object} [params.context] - 上下文数据 (Not used in DB)
 */
export async function logUserAction({
    cId,
    actionType,
    magnetConfigQaId = null,
    conversationId = null,
    questionText = null,
    context = null,
}) {
    try {
        if (!cId) {
            console.warn('cId is required for logging');
            return;
        }

        const sessionId = getOrCreateSessionId();
        const deviceInfo = getDeviceInfo();

        await apiLogUserAction({
            cId,
            actionType,
            magnetConfigQaId,
            sessionId,
            deviceInfo,
        });

        console.log(`[LOG] Action: ${actionType}`, { cId, sessionId });
    } catch (error) {
        console.error('Error in logUserAction:', error);
    }
}

/**
 * 记录聊天日志
 * @param {object} params - 聊天日志参数
 * @param {string} params.cId - Customer/Magnet ID
 * @param {string} params.conversationId - 对话ID (Not used in DB)
 * @param {string} params.question - 用户问题
 * @param {string} params.answer - AI回答
 * @param {string} [params.answerMethod] - 回答方式 (Not used in DB)
 * @param {number} [params.magnetConfigQaId] - 问题库ID (Not used in DB)
 * @param {number} [params.responseTimeMs] - 响应时间（毫秒） (Not used in DB)
 */
export async function logChatMessage({
    cId,
    conversationId,
    question,
    answer,
    answerMethod = null,
    magnetConfigQaId = null,
    responseTimeMs = null,
}) {
    try {
        if (!cId || !question || !answer) {
            console.warn('cId, question, and answer are required for chat logging');
            return;
        }

        const sessionId = getOrCreateSessionId();
        const deviceInfo = getDeviceInfo();

        await apiLogChatMessage({
            cId,
            conversationId,
            question,
            answer,
            answerMethod,
            magnetConfigQaId,
            responseTimeMs,
            sessionId,
            deviceInfo,
        });

        console.log(`[LOG] Chat:`, { question: question.substring(0, 30) + '...' });
    } catch (error) {
        console.error('Error in logChatMessage:', error);
    }
}

/**
 * 创建播放日志记录
 * @param {object} params - 播放日志参数
 * @param {string} params.cId - Customer/Magnet ID
 * @param {string} params.playContentId - 播放内容ID (Ignored, no column)
 * @param {number} [params.magnetConfigQaId] - 问题库ID
 * @returns {Promise<number|null>} 日志记录ID
 */
export async function createPlayContentLog({
    cId,
    playContentId,
    magnetConfigQaId = null,
}) {
    try {
        if (!cId) {
            console.warn('cId is required for play logging');
            return null;
        }

        const sessionId = getOrCreateSessionId();
        const deviceInfo = getDeviceInfo();

        const id = await apiCreatePlayLog({
            cId,
            playContentId,
            magnetConfigQaId,
            sessionId,
            deviceInfo,
        });

        if (id) {
            console.log(`[LOG] Play started`);
        }

        return id;
    } catch (error) {
        console.error('Error in createPlayContentLog:', error);
        return null;
    }
}

/**
 * 更新播放日志（用于更新播放时长）
 * @param {number} logId - 日志记录ID
 * @param {object} params - 更新参数
 * @param {number} params.duration - 播放时长（秒）
 * @param {number} [params.totalDuration] - 音频总时长（秒） (Ignored)
 */
export async function updatePlayContentLog(logId, { duration, totalDuration = null }) {
    try {
        if (!logId) {
            console.warn('logId is required for updating play log');
            return;
        }

        if (typeof duration !== 'number') {
            console.warn('duration (number) is required for updating play log');
            return;
        }

        const success = await apiUpdatePlayLog(logId, { duration });

        if (success) {
            console.log(`[LOG] Play updated:`, { duration });
        }
    } catch (error) {
        console.error('Error in updatePlayContentLog:', error);
    }
}
