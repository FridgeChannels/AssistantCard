/**
 * 日志服务 - 统一管理所有日志记录
 * 基于 sessionId 和 cId 追踪用户行为
 */

import { supabase } from './supabase';
import { getOrCreateSessionId, getDeviceInfo } from './sessionManager';

// 缓存 user_id，避免重复查询
let cachedUserId = null;
let cachedSessionId = null;

/**
 * 获取客户端 IP（通过第三方服务）
 * @returns {Promise<string|null>} IP地址
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
        const data = await response.json();
        return data.ip;
    } catch (e) {
        console.warn('Failed to get IP address:', e);
        return null;
    }
}

/**
 * 获取或创建用户记录
 * @param {string} cId - Customer/Magnet ID
 * @returns {Promise<number|null>} user_id
 */
/**
 * 获取或创建用户记录
 * @param {string} cId - Customer/Magnet ID
 * @returns {Promise<number|null>} user_id
 */
async function getOrCreateUser(cId) {
    const sessionId = getOrCreateSessionId();

    // 如果缓存的 sessionId 和当前一致，直接返回缓存的 userId
    if (cachedUserId && cachedSessionId === sessionId) {
        // 更新访问信息（异步，不等待）
        supabase
            .from('user')
            .update({
                last_access_at: new Date().toISOString(),
            })
            .eq('id', cachedUserId)
            .then(({ error }) => {
                if (error) console.error('Failed to update user access:', error);
            });

        return cachedUserId;
    }

    try {
        // 先查询是否存在
        const { data: existingUser, error: queryError } = await supabase
            .from('user')
            .select('id')
            .eq('session_id', sessionId)
            .maybeSingle();

        if (queryError) {
            console.error('Failed to query user:', queryError);
            return null;
        }

        if (existingUser) {
            cachedUserId = existingUser.id;
            cachedSessionId = sessionId;

            // 更新访问信息（异步，不等待）
            supabase
                .from('user')
                .update({
                    last_access_at: new Date().toISOString(),
                })
                .eq('id', existingUser.id)
                .then(({ error }) => {
                    if (error) console.error('Failed to update user access:', error);
                });

            return existingUser.id;
        }

        // 创建新用户
        const deviceInfo = getDeviceInfo();
        const ipAddress = await getClientIP();

        const { data: newUser, error: insertError } = await supabase
            .from('user')
            .insert({
                session_id: sessionId,
                // magnet_id removed as it doesn't exist in user table
                device_info: JSON.stringify(deviceInfo),
                ip_address: ipAddress,
                user_agent: navigator.userAgent,
                first_access_at: new Date().toISOString(),
                last_access_at: new Date().toISOString(),
                access_count: 1,
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('Failed to create user:', insertError);
            return null;
        }

        if (newUser) {
            cachedUserId = newUser.id;
            cachedSessionId = sessionId;
            return newUser.id;
        }

        return null;
    } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        return null;
    }
}

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

        const userId = await getOrCreateUser(cId);
        if (!userId) {
            console.error('Failed to get user_id for logging');
            return;
        }

        const sessionId = getOrCreateSessionId();
        const deviceInfo = getDeviceInfo();

        // 异步插入日志，不等待结果
        supabase
            .from('user_action_log')
            .insert({
                user_id: userId,
                magnet_id: cId, // Correct column name
                action_type: actionType,
                magnet_config_qa_id: magnetConfigQaId,
                device_info: JSON.stringify(deviceInfo),
                ip_address: null, // Let backend handle or getClientIP if needed (skipped for perf)
                // Removed fields not in schema: session_id, conversation_id, question_text, context, user_agent
            })
            .then(({ error }) => {
                if (error) {
                    console.error('Failed to log user action:', error);
                } else {
                    console.log(`[LOG] Action: ${actionType}`, { cId, sessionId });
                }
            });
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

        const userId = await getOrCreateUser(cId);
        if (!userId) {
            console.error('Failed to get user_id for chat logging');
            return;
        }

        // 异步插入日志，不等待结果
        supabase
            .from('user_chat_log')
            .insert({
                user_id: userId,
                megnet_id: cId, // TYPO in DB Schema: megnet_id
                question: question,
                answer: answer,
                // Removed fields not in schema: conversation_id, session_id, magnet_config_qa_id, answer_method, response_time_ms
            })
            .then(({ error }) => {
                if (error) {
                    console.error('Failed to log chat message:', error);
                } else {
                    console.log(`[LOG] Chat:`, { question: question.substring(0, 30) + '...' });
                }
            });
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

        const userId = await getOrCreateUser(cId);
        if (!userId) {
            console.error('Failed to get user_id for play logging');
            return null;
        }

        const startTime = new Date().toISOString();

        const { data, error } = await supabase
            .from('play_content_log')
            .insert({
                user_id: userId,
                megnet_id: cId, // TYPO in DB Schema: megnet_id
                megnet_config_qa_id: magnetConfigQaId,
                play_time: startTime,
                start_time: startTime,
                duration: 0,
                // Removed fields not in schema: play_content_id, session_id
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create play content log:', error);
            return null;
        }

        console.log(`[LOG] Play started`);
        return data?.id || null;
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

        const endTime = new Date().toISOString();

        // 异步更新日志，不等待结果
        supabase
            .from('play_content_log')
            .update({
                end_time: endTime,
                duration: duration,
                // Removed fields not in schema: total_duration, completion_rate
            })
            .eq('id', logId)
            .then(({ error }) => {
                if (error) {
                    console.error('Failed to update play content log:', error);
                } else {
                    console.log(`[LOG] Play updated:`, { duration });
                }
            });
    } catch (error) {
        console.error('Error in updatePlayContentLog:', error);
    }
}
