import { apiGetMagnetBySn } from '../api/backendClient.js'

// 全局缓存：sn -> magnet_id 映射
const snToMagnetIdCache = new Map()
// 全局缓存：sn -> 完整 magnet 信息（id, solution, cta, formatted, zipCode 等）
const snToMagnetCache = new Map()
// 全局缓存：magnet_id -> stage（避免重复请求 /api/magnets/:id/stage）
const magnetIdToStageCache = new Map()

// 当前会话正在使用的 magnet 信息（方便其他模块直接读取）
let currentMagnetInfo = null
let currentSn = null
let currentMagnetStage = null

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
    currentMagnetInfo = cached
    currentMagnetStage = cached?.stage ?? currentMagnetStage
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
    currentMagnetInfo = data
    currentMagnetStage = data?.stage ?? null
    if (data?.id != null && data?.stage != null) {
      magnetIdToStageCache.set(String(data.id), data.stage || '')
    }
    return data
  } catch (e) {
    console.error('获取 magnet 信息时发生异常:', e)
    return null
  }
}

/**
 * 根据 sn 编号获取 magnet 表中的 id（magnet_id）
 * - 复用 getMagnetBySn 缓存，避免重复请求
 * @param {string} sn - 冰箱贴 SN 编号（来自路由 /p/:sn）
 * @returns {Promise<string|null>} magnet_id 或 null
 */
export async function getMagnetIdBySn(sn) {
  const data = await getMagnetBySn(sn)
  return data?.id ?? null
}

/**
 * 获取当前会话使用的 magnet_id
 * @returns {string|null}
 */
export function getCurrentMagnetId() {
  return currentMagnetInfo?.id || null
}

/**
 * 获取当前会话使用的 magnet.stage（如果已经通过 SN 解析过）
 * @returns {string|null}
 */
export function getCurrentMagnetStage() {
  return currentMagnetStage
}

/**
 * 获取当前会话使用的完整 magnet 信息（兼容引导页：id, formatted, zipCode 等）
 * @returns {{id: string, formatted?: string, zipCode?: string, solution?, cta?}|null}
 */
export function getCurrentMagnetInfo() {
  return currentMagnetInfo
}

/**
 * 获取当前会话使用的 sn（如果已经通过 SN 解析过）
 * @returns {string|null}
 */
export function getCurrentSn() {
  return currentSn
}

/**
 * 仅从缓存中读取指定 sn 对应的 info（不会触发网络请求）
 * @param {string} sn
 * @returns {Object|null}
 */
export function getCachedMagnetInfoBySn(sn) {
  if (!sn) return null
  return snToMagnetCache.get(sn) || null
}

/**
 * 仅从缓存中读取指定 magnet_id 对应的 stage（不会触发网络请求）
 * @param {string} magnetId
 * @returns {string|null}
 */
export function getCachedMagnetStageByMagnetId(magnetId) {
  if (!magnetId) return null
  if (!magnetIdToStageCache.has(String(magnetId))) return null
  return magnetIdToStageCache.get(String(magnetId)) ?? null
}
