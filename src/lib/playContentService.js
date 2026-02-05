import { apiGetTodayPlayContent } from '../api/backendClient.js'

/**
 * 获取今日播放内容（audio_url 来自 play_news_contents）
 * 应用根据 URL 中的 sn（如 /p/N819HqJYQ123）定位 magnet，不通过 ?magnetId= 传参。
 *
 * @param {{ sn?: string | null, magnetId?: string | null }} opts - sn 来自路由 /p/:sn，magnetId 为 magnet 表 id（如 /tp/:id 时用 cId）
 * @returns {Promise<Object|null>} { id, title, audio_url } 或 null
 */
export async function getTodayPlayContent(opts = null) {
    try {
        const response = await apiGetTodayPlayContent(opts ?? {})
        return response ? response.content : null
    } catch (error) {
        console.error('获取播放内容时发生错误:', error)
        return null
    }
}

/**
 * 获取最新的播放内容（与 getTodayPlayContent 复用同一接口）
 * @param {{ sn?: string | null, magnetId?: string | null }} opts
 */
export async function getLatestPlayContent(opts = null) {
    try {
        const response = await apiGetTodayPlayContent(opts ?? {})
        return response ? response.content : null
    } catch (error) {
        console.error('获取最新播放内容时发生错误:', error)
        return null
    }
}

/**
 * 获取播放内容及元数据
 * @param {{ sn?: string | null, magnetId?: string | null }} opts
 */
export async function getPlayContentWithMeta(opts = null) {
    try {
        return await apiGetTodayPlayContent(opts ?? {})
    } catch (error) {
        console.error('获取最新播放内容时发生错误:', error)
        return null
    }
}
