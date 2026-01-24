import { apiGetMagnetIdBySn } from '../api/backendClient.js'

// 全局缓存：sn -> magnet_id 映射
const snToMagnetIdCache = new Map()

// 当前会话正在使用的 magnet 信息（方便其他模块直接读取）
let currentMagnetId = null
let currentSn = null

/**
 * 根据 sn 编号获取 magnet 表中的 id（magnet_id）
 * - 先查缓存，再查数据库
 * - 查到后会写入全局缓存，并记录当前 sn / magnet_id
 *
 * @param {string} sn - 冰箱贴 SN 编号（来自路由 /p/:sn）
 * @returns {Promise<string|null>} magnet_id（字符串形式）或 null
 */
export async function getMagnetIdBySn(sn) {
  if (!sn) return null

  // 1. 先查本地缓存
  const cached = snToMagnetIdCache.get(sn)
  if (cached) {
    currentSn = sn
    currentMagnetId = cached
    return cached
  }

  try {
    // 2. 通过后端 API 查询 magnet.id（不在前端直接访问 supabase）
    const magnetId = await apiGetMagnetIdBySn(sn)

    if (!magnetId) {
      console.warn('未找到对应 SN 的 magnet 记录:', sn)
      return null
    }

    // 3. 写入缓存并记录当前上下文
    snToMagnetIdCache.set(sn, magnetId)
    currentSn = sn
    currentMagnetId = magnetId

    return magnetId
  } catch (e) {
    console.error('获取 magnet_id 时发生异常:', e)
    return null
  }
}

/**
 * 获取当前会话使用的 magnet_id（如果已经通过 SN 解析过）
 * @returns {string|null}
 */
export function getCurrentMagnetId() {
  return currentMagnetId
}

/**
 * 获取当前会话使用的 sn（如果已经通过 SN 解析过）
 * @returns {string|null}
 */
export function getCurrentSn() {
  return currentSn
}

/**
 * 仅从缓存中读取指定 sn 对应的 magnet_id（不会触发网络请求）
 * @param {string} sn
 * @returns {string|null}
 */
export function getCachedMagnetIdBySn(sn) {
  if (!sn) return null
  return snToMagnetIdCache.get(sn) || null
}

