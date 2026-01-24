import {
    apiGetTodayPlayContent,
    apiMarkPlayContentAsPlayed,
} from '../api/backendClient.js'

/**
 * 获取今日播放内容
 * 查询逻辑：
 * 1. 优先查询当天的排期内容（scheduled_date = 今天）
 * 2. 如果没有，则获取最新的播放内容
 * 
 * @param {string} customerId - 可选的客户ID，为空则查询全局内容
 * @returns {Promise<Object|null>} 播放内容对象或null
 */
export async function getTodayPlayContent(customerId = null) {
    try {
        // 通过后端 API 获取今日播放内容（后端内部包含 fallback 逻辑）
        const content = await apiGetTodayPlayContent(customerId)
        return content

    } catch (error) {
        console.error('获取播放内容时发生错误:', error)
        return null
    }
}

/**
 * 获取最新的播放内容（作为fallback）
 * 
 * @param {string} customerId - 可选的客户ID
 * @returns {Promise<Object|null>} 最新的播放内容对象或null
 */
export async function getLatestPlayContent(customerId = null) {
    try {
        // 后端已实现 fallback 逻辑，这里复用同一个接口
        const content = await apiGetTodayPlayContent(customerId)
        return content

    } catch (error) {
        console.error('获取最新播放内容时发生错误:', error)
        return null
    }
}

/**
 * 标记内容为已播放
 * 
 * @param {string} contentId - 内容ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function markAsPlayed(contentId) {
    try {
        return await apiMarkPlayContentAsPlayed(contentId)
    } catch (error) {
        console.error('标记已播放时发生错误:', error)
        return false
    }
}
