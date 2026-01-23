import { supabase } from './supabase'

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
        // 获取今天的日期（YYYY-MM-DD格式）
        const today = new Date().toISOString().split('T')[0]

        // 构建查询条件 - 先查询当天的内容
        // 只选择需要的字段：title, id, audio_url
        let query = supabase
            .from('play_contents')
            .select('id, title, audio_url')
            .eq('scheduled_date', today)
            .order('created_at', { ascending: false })
            .limit(1)

        // 如果提供了 customerId，则查询特定客户的内容
        // 否则查询全局内容（customer_id 为 null）
        if (customerId) {
            query = query.eq('customer_id', customerId)
        } else {
            query = query.is('customer_id', null)
        }

        const { data, error } = await query

        if (error) {
            console.error('查询今日播放内容失败:', error)
            throw error
        }

        // 如果找到今日内容，直接返回
        if (data && data.length > 0) {
            console.log('找到今日播放内容:', data[0])
            return data[0]
        }

        // 如果没有今日内容，获取最新的播放内容作为fallback
        console.log('今日无排期内容，获取最新内容...')
        return await getLatestPlayContent(customerId)

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
        // 只选择需要的字段：title, id, audio_url
        let query = supabase
            .from('play_contents')
            .select('id, title, audio_url')
            .order('scheduled_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)

        if (customerId) {
            query = query.eq('customer_id', customerId)
        } else {
            query = query.is('customer_id', null)
        }

        const { data, error } = await query

        if (error) {
            console.error('查询最新播放内容失败:', error)
            throw error
        }

        if (data && data.length > 0) {
            console.log('找到最新播放内容:', data[0])
            return data[0]
        }

        return null

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
        const { error } = await supabase
            .from('play_contents')
            .update({ has_played: true, is_playing: false })
            .eq('id', contentId)

        if (error) {
            console.error('标记已播放失败:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('标记已播放时发生错误:', error)
        return false
    }
}
