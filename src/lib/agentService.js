import { supabase } from './supabase'

/**
 * 获取代理联系信息
 * 根据magnet表的id查询对应的phone, email, name
 * 
 * @param {string} magnetId - magnet表的id（对应路由的cId）
 * @returns {Promise<{phone: string, email: string, name: string}|null>} 代理信息或null
 */
export async function getAgentInfo(magnetId) {
  try {
    if (!magnetId) {
      console.error('magnetId 未提供')
      return null
    }

    // 执行SQL查询
    // 注意：Supabase使用RPC调用执行复杂SQL，或者我们可以分步查询
    // 先查询magnet表获取magnet_config_id
    const { data: magnetData, error: magnetError } = await supabase
      .from('magnet')
      .select('magnet_config_id')
      .eq('id', magnetId)
      .single()

    if (magnetError) {
      console.error('查询magnet表失败:', magnetError)
      return null
    }

    if (!magnetData || !magnetData.magnet_config_id) {
      console.error('未找到对应的magnet_config_id')
      return null
    }

    // 再查询magnet_conf_cta表获取联系信息
    const { data: ctaData, error: ctaError } = await supabase
      .from('magnet_conf_cta')
      .select('phone, email, name')
      .eq('magnet_config_id', magnetData.magnet_config_id)
      .single()

    if (ctaError) {
      console.error('查询magnet_conf_cta表失败:', ctaError)
      return null
    }

    if (!ctaData) {
      console.error('未找到对应的联系信息')
      return null
    }

    return {
      phone: ctaData.phone || '',
      email: ctaData.email || '',
      name: ctaData.name || 'James'
    }

  } catch (error) {
    console.error('获取代理信息时发生错误:', error)
    return null
  }
}
