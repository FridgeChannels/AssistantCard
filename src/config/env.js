/**
 * Environment configuration module
 * Prioritizes runtime configuration (Docker) over build-time configuration (local development)
 */

function parseCommaSeparatedList(raw) {
  if (raw == null || raw === '') return [];
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function getRuntimeString(key) {
  const fromWindow = typeof window !== 'undefined' && window.ENV ? window.ENV[key] : undefined;
  if (fromWindow != null && String(fromWindow).trim() !== '') return String(fromWindow);
  const v = import.meta.env[key];
  if (v != null && String(v).trim() !== '') return String(v);
  return '';
}

/**
 * SN 列表：隐藏 Briefing / Chat 顶栏的 AssistantIdentity（图标+文案）。未配置时默认为 `1`。
 * 例：VITE_MINIMAL_CHROME_SN_LIST=1,Q74XWZ6211
 */
const minimalChromeSnListRaw = getRuntimeString('VITE_MINIMAL_CHROME_SN_LIST');
const minimalChromeParsed = parseCommaSeparatedList(minimalChromeSnListRaw);
const minimalChromeSnList = minimalChromeParsed.length > 0 ? minimalChromeParsed : ['1'];
const minimalChromeSnSet = new Set(minimalChromeSnList);

/**
 * SN 列表：使用 Segway 品牌图作为全页背景。未配置时默认为 `1`（与历史行为一致）。
 * 例：仅 1 用 Segway：VITE_SEGWAY_BACKDROP_SN_LIST=1
 */
const segwayBackdropSnListRaw = getRuntimeString('VITE_SEGWAY_BACKDROP_SN_LIST');
const segwayBackdropParsed = parseCommaSeparatedList(segwayBackdropSnListRaw);
const segwayBackdropSnList = segwayBackdropParsed.length > 0 ? segwayBackdropParsed : ['1'];
const segwayBackdropSnSet = new Set(segwayBackdropSnList);

/** 是否隐藏顶栏助手图标与标签（简洁模式） */
export function isMinimalChromeSn(sn) {
  if (sn == null || sn === '') return false;
  return minimalChromeSnSet.has(String(sn).trim());
}

/** 是否使用 Segway 静态背景图 */
export function isSegwayBackdropSn(sn) {
  if (sn == null || sn === '') return false;
  return segwayBackdropSnSet.has(String(sn).trim());
}

export const env = {
    // Supabase configuration
    SUPABASE_URL: window.ENV?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: window.ENV?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',

    // Chat API configuration
    CHAT_API_URL: window.ENV?.VITE_CHAT_API_URL || import.meta.env.VITE_CHAT_API_URL || '',
    CHAT_API_TOKEN: window.ENV?.VITE_CHAT_API_TOKEN || import.meta.env.VITE_CHAT_API_TOKEN || '',

    // Related Questions API configuration
    RELATED_QUESTIONS_API_URL: window.ENV?.VITE_RELATED_QUESTIONS_API_URL || import.meta.env.VITE_RELATED_QUESTIONS_API_URL || '',
    RELATED_QUESTIONS_API_TOKEN: window.ENV?.VITE_RELATED_QUESTIONS_API_TOKEN || import.meta.env.VITE_RELATED_QUESTIONS_API_TOKEN || '',

    // Document Summary API configuration
    DOCUMENT_SUMMARY_API_URL: window.ENV?.VITE_DOCUMENT_SUMMARY_API_URL || import.meta.env.VITE_DOCUMENT_SUMMARY_API_URL || '',
    DOCUMENT_SUMMARY_API_TOKEN: window.ENV?.VITE_DOCUMENT_SUMMARY_API_TOKEN || import.meta.env.VITE_DOCUMENT_SUMMARY_API_TOKEN || '',

    // Assistant Prompt API configuration（流式对话等）
    ASSISTANT_PROMPT_API_URL: window.ENV?.VITE_ASSISTANT_PROMPT_API_URL || import.meta.env.VITE_ASSISTANT_PROMPT_API_URL || '',
    ASSISTANT_PROMPT_API_TOKEN: window.ENV?.VITE_ASSISTANT_PROMPT_API_TOKEN || import.meta.env.VITE_ASSISTANT_PROMPT_API_TOKEN || '',
};
