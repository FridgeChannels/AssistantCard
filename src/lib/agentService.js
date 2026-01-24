import { apiGetAgentInfo } from '../api/backendClient.js'

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

    // 通过后端 API 查询代理信息，避免在前端直接访问 Supabase
    const agentInfo = await apiGetAgentInfo(magnetId)
    if (!agentInfo) {
      console.error('未找到对应的联系信息')
      return null
    }

    return agentInfo

  } catch (error) {
    console.error('获取代理信息时发生错误:', error)
    return null
  }
}
