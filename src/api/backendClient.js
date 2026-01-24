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

export async function apiGetMagnetIdBySn(sn) {
  if (!sn) return null;

  try {
    const data = await request(`/api/magnets/by-sn/${encodeURIComponent(sn)}`, {
      method: 'GET',
    });
    return data?.id ?? null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    console.error('apiGetMagnetIdBySn failed:', error);
    throw error;
  }
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

// --------- Play contents ---------

export async function apiGetTodayPlayContent(customerId = null) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';

  try {
    const data = await request(`/api/play-contents/today${query}`, {
      method: 'GET',
    });
    return data?.content ?? null;
  } catch (error) {
    console.error('apiGetTodayPlayContent failed:', error);
    return null;
  }
}

export async function apiMarkPlayContentAsPlayed(contentId) {
  if (!contentId) return false;

  try {
    await request(`/api/play-contents/${encodeURIComponent(contentId)}/played`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('apiMarkPlayContentAsPlayed failed:', error);
    return false;
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

