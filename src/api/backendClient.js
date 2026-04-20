/**
 * Backend API client
 * 所有前端到后端（/api/*）的数据请求集中在这里
 */

const API_BASE = '';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
    ...(options.signal != null && { signal: options.signal }),
  };

  const res = await fetch(url, fetchOptions);
  const contentType = res.headers.get('content-type') || '';

  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message = data?.error || res.statusText || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --------- Magnet & Agent ---------

/**
 * 根据 sn 获取完整 magnet 信息（id、solution、cta）
 * @param {string} sn
 * @param {{ signal?: AbortSignal }} [opts] - 可选 signal，用于取消请求（如 effect cleanup）
 * @returns {Promise<{ id, solution?, cta? }|null>}
 */
export async function apiGetMagnetBySn(sn, opts = {}) {
  if (!sn) return null;

  try {
    const data = await request(`/api/magnets/by-sn/${encodeURIComponent(sn)}`, {
      method: 'GET',
      ...(opts.signal != null && { signal: opts.signal }),
    });
    // Now returns { id, formatted, zipCode }
    return data ?? null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    console.error('apiGetMagnetBySn failed:', error);
    throw error;
  }
}

export async function apiGetMagnetIdBySn(sn) {
  const data = await apiGetMagnetBySn(sn);
  return data?.id ?? null;
}

export async function apiGetMagnetStage(magnetId) {
  if (!magnetId) return '';

  try {
    const data = await request(`/api/magnets/${encodeURIComponent(magnetId)}/stage`, {
      method: 'GET',
    });
    return data?.stage || '';
  } catch (error) {
    if (error.status === 404) {
      return '';
    }
    console.error('apiGetMagnetStage failed:', error);
    throw error;
  }
}

export async function apiGetAgentInfo(magnetId) {
  if (!magnetId) return null;

  try {
    const data = await request(`/api/magnets/${encodeURIComponent(magnetId)}/agent`, {
      method: 'GET',
    });
    return data;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    console.error('apiGetAgentInfo failed:', error);
    throw error;
  }
}

// --------- Content play (tp/:id) ---------

/**
 * 根据 content_play 表主键 id 获取记录及解析出的 magnetId
 * @param {string|number} id - content_play.id
 * @param {{ signal?: AbortSignal }} [opts] - 可选 signal，用于取消请求
 * @returns {Promise<{ id, customer_id, magnetId, ... }|null>}
 */
export async function apiGetContentPlayById(id, opts = {}) {
  if (id == null || id === '') return null;

  try {
    const data = await request(`/api/content-play/${encodeURIComponent(id)}`, {
      method: 'GET',
      ...(opts.signal != null && { signal: opts.signal }),
    });
    return data ?? null;
  } catch (error) {
    if (error.status === 404) return null;
    console.error('apiGetContentPlayById failed:', error);
    throw error;
  }
}

// --------- Play contents ---------

/**
 * 获取今日播放内容。优先用 URL 中的 sn（/p/:sn）定位 magnet，无 sn 时可用 magnetId（如 /tp/:id 场景）。
 * @param {{ sn?: string | null, magnetId?: string | null }} opts - sn 来自路由 /p/:sn，magnetId 为 magnet 表 id
 */
export async function apiGetTodayPlayContent(opts = {}) {
  const { sn = null, magnetId = null } = typeof opts === 'object' && opts !== null ? opts : { magnetId: opts };
  const params = new URLSearchParams();
  if (sn) params.set('sn', sn);
  else if (magnetId) params.set('magnetId', String(magnetId));
  const query = params.toString() ? `?${params.toString()}` : '';

  try {
    const data = await request(`/api/play-contents/today${query}`, {
      method: 'GET',
    });
    return data ?? null;
  } catch (error) {
    console.error('apiGetTodayPlayContent failed:', error);
    return null;
  }
}

/**
 * 获取播放内容列表（三种规则：long_text_sequential / rss / latest）
 * @param {{ sn?: string | null, magnetId?: string | null }} opts
 * @returns {Promise<{ playback_rule: string, items: Array<{ id, title, audio_url, order_index?: number }>, config_id?: number, hasZipCode?: boolean, locationFormatted?: string | null } | null>}
 */
export async function apiGetPlayContentList(opts = {}) {
  const { sn = null, magnetId = null } = typeof opts === 'object' && opts !== null ? opts : { magnetId: opts };
  const params = new URLSearchParams();
  if (sn) params.set('sn', sn);
  else if (magnetId) params.set('magnetId', String(magnetId));
  const query = params.toString() ? `?${params.toString()}` : '';

  try {
    const data = await request(`/api/play-content/list${query}`, {
      method: 'GET',
    });
    return data ?? null;
  } catch (error) {
    console.error('apiGetPlayContentList failed:', error);
    return null;
  }
}

// --------- Logging ---------

export async function apiLogUserAction(payload) {
  try {
    await request('/api/log/user-action', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('apiLogUserAction failed:', error);
  }
}

export async function apiLogChatMessage(payload) {
  try {
    await request('/api/log/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('apiLogChatMessage failed:', error);
  }
}

export async function apiCreatePlayLog(payload) {
  try {
    const data = await request('/api/play-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data?.id ?? null;
  } catch (error) {
    console.error('apiCreatePlayLog failed:', error);
    return null;
  }
}

export async function apiUpdatePlayLog(id, payload) {
  if (!id) return false;

  try {
    await request(`/api/play-logs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error('apiUpdatePlayLog failed:', error);
    return false;
  }
}

