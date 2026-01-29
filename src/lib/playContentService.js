import { apiGetTodayPlayContent } from '../api/backendClient.js'

/**
 * 获取今日播放内容（audio_url 来自 play_news_contents）
 * 查询逻辑：
 * 1. 若有 magnetId：查 magnet.zip_code；有 zip_code 时先按 zip_code 查 play_news_contents 最新一条，无则查全表最新
 * 2. 无 magnetId 或无 zip_code：查 play_news_contents 全表最新一条
 *
 * @param {string} magnetId - 可选的 magnet ID，用于按 zip_code 优先匹配
 * @returns {Promise<Object|null>} { id, title, audio_url } 或 null
 */
export async function getTodayPlayContent(magnetId = null) {
    try {
        const content = await apiGetTodayPlayContent(magnetId)
        return content
    } catch (error) {
        console.error('获取播放内容时发生错误:', error)
        return null
    }
}

/**
 * 获取最新的播放内容（与 getTodayPlayContent 复用同一接口）
 *
 * @param {string} magnetId - 可选的 magnet ID
 * @returns {Promise<Object|null>} 播放内容对象或 null
 */
export async function getLatestPlayContent(magnetId = null) {
    try {
        const content = await apiGetTodayPlayContent(magnetId)
        return content
    } catch (error) {
        console.error('获取最新播放内容时发生错误:', error)
        return null
    }
}
