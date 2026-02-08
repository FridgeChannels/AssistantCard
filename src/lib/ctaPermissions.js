/**
 * CTA 权限与 header 单按钮决策
 * 供 MorningBriefing、App.jsx Chat header、AssistantPromptChat header 共用。
 */

// Chat with Leo 按钮显示条件
export const CHAT_WITH_LEO_PERMISSIONS = [
  'MOD_MOD_ASSISTANT',
  'FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE',
  'METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE',
];
// Assistant Prompt 按钮显示条件
export const ASSISTANT_PROMPT_PERMISSIONS = [
  'MOD_MOD_ASSISTANT',
  'FUNC_FUNC_ASSISTANT_CUSTOM_PROMT',
  'METHOD_METHOD_ASSISTANT_CUSTOM_PROMT',
];
// chat_url 按钮显示条件
export const CHAT_URL_PERMISSIONS = [
  'MOD_MOD_ASSISTANT',
  'FUNC_FUNC_ASSISTANT_CHAT_URL',
  'METHOD_METHOD_ASSISTANT_CHAT_URL',
];
// skip_url 按钮显示条件
export const SKIP_URL_PERMISSIONS = [
  'MOD_MOD_CTA',
  'FUNC_FUNC_CTA_ROUTE',
  'METHOD_METHOD_CTA_SKIP',
];
// phone、SMS、email 按钮显示条件
export const CTA_CONTACT_PERMISSIONS = [
  'MOD_MOD_CTA',
  'FUNC_FUNC_CTA_ROUTE',
  'METHOD_METHOD_CTA_CONTACT',
];

/**
 * 将接口返回的 permissions 数组规范化为 Set（支持单/双前缀互推）
 */
export function normalizePermissionSet(permissions = []) {
  const list = Array.isArray(permissions) ? permissions : [];
  const set = new Set();
  list.forEach((perm) => {
    if (!perm) return;
    set.add(perm);
    const match = perm.match(/^(MOD|FUNC|METHOD)_(.+)$/);
    if (!match) return;
    const prefix = match[1];
    const rest = match[2];
    if (rest.startsWith(`${prefix}_`)) {
      set.add(`${prefix}_${rest.slice(prefix.length + 1)}`);
    } else {
      set.add(`${prefix}_${prefix}_${rest}`);
    }
  });
  return set;
}

/**
 * 是否具备 required 中全部权限
 */
export function hasAllPermissions(permissionSet, required = []) {
  if (!required.length) return false;
  const set = permissionSet instanceof Set ? permissionSet : normalizePermissionSet(permissionSet);
  return required.every((p) => set.has(p));
}

/**
 * 是否包含任意 Assistant 相关权限（用于底部 CTA 区域展示判断）
 */
export function hasAnyAssistantPermission(permissionSet) {
  const set = permissionSet instanceof Set ? permissionSet : normalizePermissionSet(permissionSet);
  const assistantPermissions = [
    'MOD_MOD_ASSISTANT',
    'FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE',
    'METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE',
    'FUNC_FUNC_ASSISTANT_CHAT_URL',
    'METHOD_METHOD_ASSISTANT_CHAT_URL',
    'FUNC_FUNC_ASSISTANT_CUSTOM_PROMT',
    'METHOD_METHOD_ASSISTANT_CUSTOM_PROMT',
  ];
  return assistantPermissions.some((p) => set.has(p));
}

/**
 * Header 单 CTA 按钮决策：优先级 chat_url > skip_url > 联系
 * 仅按权限与 cta 字段判断，不应用「冲突」逻辑（冲突逻辑仅用于 MorningBriefing 播放器底部按钮区域，
 * chat 页 header 与 Assistant 位置不冲突，CTA 与 Assistant 可并存）。
 * 当 solution.permissions 为空或未返回时，按优先级展示首个可用的 CTA（兼容未配置权限的 magnet）
 *
 * @param {object|null} cta - magnetContext.cta
 * @param {array} permissions - magnetContext.solution?.permissions
 * @returns {null|{ type: 'chat_url'|'skip_url'|'contact', label: string, href?: string }}
 */
export function getHeaderCta(cta, permissions) {
  if (!cta || typeof cta !== 'object') return null;

  const perms = Array.isArray(permissions) ? permissions : [];
  const permSet = normalizePermissionSet(perms);
  const hasPermissionData = perms.length > 0;

  // 有权限数据时按权限校验（不应用 hasConflict，仅播放器底部使用冲突逻辑）
  if (hasPermissionData) {
    if (cta.chat_url && hasAllPermissions(permSet, CHAT_URL_PERMISSIONS)) {
      return { type: 'chat_url', label: cta.name || 'Chat', href: cta.chat_url };
    }
    if (cta.skip_url && hasAllPermissions(permSet, SKIP_URL_PERMISSIONS)) {
      return { type: 'skip_url', label: cta.name || 'Link', href: cta.skip_url };
    }
    if ((cta.phone || cta.email) && hasAllPermissions(permSet, CTA_CONTACT_PERMISSIONS)) {
      return { type: 'contact', label: cta.name || 'Contact' };
    }
    return null;
  }

  // 无权限数据时按优先级展示首个可用 CTA（兼容旧接口或未配置 solution 的 magnet）
  if (cta.chat_url) return { type: 'chat_url', label: cta.name || 'Chat', href: cta.chat_url };
  if (cta.skip_url) return { type: 'skip_url', label: cta.name || 'Link', href: cta.skip_url };
  if (cta.phone || cta.email) return { type: 'contact', label: cta.name || 'Contact' };
  return null;
}
