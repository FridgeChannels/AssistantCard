import { apiGetMagnetBySn } from '../api/backendClient.js'

// 全局缓存：sn -> magnet_id 映射
const snToMagnetIdCache = new Map()
// 全局缓存：sn -> 完整 magnet 信息（id, solution, cta）
const snToMagnetCache = new Map()

// 当前会话正在使用的 magnet 信息（方便其他模块直接读取）
let currentMagnetId = null
let currentSn = null

/**
 * 根据 sn 获取完整 magnet 信息（id、solution、cta），供 CTA 按钮等使用
 * @param {string} sn - 冰箱贴 SN 编号（来自路由 /p/:sn）
 * @returns {Promise<{ id, solution?, cta? }|null>}
 */
export async function getMagnetBySn(sn) {
  if (!sn) return null

  const cached = snToMagnetCache.get(sn)
  if (cached) {
    currentSn = sn
    currentMagnetId = cached?.id ?? null
    return cached
  }

  try {
    const data = await apiGetMagnetBySn(sn)
    if (!data) {
      console.warn('未找到对应 SN 的 magnet 记录:', sn)
      return null
    }
    snToMagnetCache.set(sn, data)
    snToMagnetIdCache.set(sn, data.id)
    currentSn = sn
    currentMagnetId = data.id
    return data
  } catch (e) {
    console.error('获取 magnet 信息时发生异常:', e)
    return null
  }
}

/**
 * 根据 sn 编号获取 magnet 表中的 id（magnet_id）
 * - 复用 getMagnetBySn 缓存，避免重复请求
 *
 * @param {string} sn - 冰箱贴 SN 编号（来自路由 /p/:sn）
 * @returns {Promise<string|null>} magnet_id（字符串形式）或 null
 */
export async function getMagnetIdBySn(sn) {
  const data = await getMagnetBySn(sn)
  return data?.id ?? null
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

