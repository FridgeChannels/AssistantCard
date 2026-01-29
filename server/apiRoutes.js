import { Readable } from 'node:stream';

const CHAT_API_URL = process.env.CHAT_API_URL || process.env.VITE_CHAT_API_URL;
const CHAT_API_TOKEN = process.env.CHAT_API_TOKEN || process.env.VITE_CHAT_API_TOKEN;
const RELATED_QUESTIONS_API_URL =
  process.env.RELATED_QUESTIONS_API_URL || process.env.VITE_RELATED_QUESTIONS_API_URL;
const RELATED_QUESTIONS_API_TOKEN =
  process.env.RELATED_QUESTIONS_API_TOKEN || process.env.VITE_RELATED_QUESTIONS_API_TOKEN;
const DOCUMENT_SUMMARY_API_URL =
  process.env.DOCUMENT_SUMMARY_API_URL || process.env.VITE_DOCUMENT_SUMMARY_API_URL;
const DOCUMENT_SUMMARY_API_TOKEN =
  process.env.DOCUMENT_SUMMARY_API_TOKEN || process.env.VITE_DOCUMENT_SUMMARY_API_TOKEN;

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0];
  }
  return req.ip || null;
}

async function getOrCreateUser({ supabase, sessionId, deviceInfo, req }) {
  if (!sessionId) return null;

  const now = new Date().toISOString();

  try {
    const { data: existing, error: queryError } = await supabase
      .from('user')
      .select('id, access_count')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (queryError) {
      console.error('Failed to query user:', queryError);
      return null;
    }

    if (existing) {
      const { id, access_count } = existing;

      const { error: updateError } = await supabase
        .from('user')
        .update({
          last_access_at: now,
          access_count: (access_count ?? 0) + 1,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Failed to update user last access:', updateError);
      }

      return id;
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    const { data: newUser, error: insertError } = await supabase
      .from('user')
      .insert({
        session_id: sessionId,
        device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        first_access_at: now,
        last_access_at: now,
        access_count: 1,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create user:', insertError);
      return null;
    }

    return newUser.id;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

export function registerApiRoutes(app, supabase) {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // ---------------- External Chat API proxy ----------------
  // 通过后端安全访问 https://kno.fridgechannels.com/v1/chat-messages
  app.post('/api/chat-messages', async (req, res) => {
    if (!CHAT_API_URL || !CHAT_API_TOKEN) {
      console.error('CHAT_API_URL or CHAT_API_TOKEN is not configured');
      return res.status(500).json({ error: 'Chat API is not configured on server' });
    }

    const payload = req.body || {};

    try {
      const requestStart = Date.now();
      let firstChunkAt = null;
      if (process.env.STREAM_DEBUG === '1') {
        console.log('[chat-stream] request start', new Date(requestStart).toISOString());
      }
      const upstreamResponse = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHAT_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Accept-Encoding': 'identity',
        },
        body: JSON.stringify(payload),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error('Upstream Chat API error:', upstreamResponse.status, errorText);
        return res.status(upstreamResponse.status).send(errorText);
      }

      // 将上游的流式响应原样透传给前端（保持 SSE / streaming 行为）
      const contentType =
        upstreamResponse.headers.get('content-type') || 'text/event-stream; charset=utf-8';
      res.status(upstreamResponse.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      if (!upstreamResponse.body) {
        return res.end();
      }

      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      nodeStream.on('data', (chunk) => {
        if (firstChunkAt === null) {
          firstChunkAt = Date.now();
          if (process.env.STREAM_DEBUG === '1') {
            console.log('[chat-stream] first chunk after', firstChunkAt - requestStart, 'ms');
          }
        }
        res.write(chunk);
        if (process.env.STREAM_DEBUG === '1') {
          console.log('[chat-stream] chunk', chunk.length, 'bytes', new Date().toISOString());
        }
      });
      nodeStream.on('end', () => {
        if (process.env.STREAM_DEBUG === '1') {
          console.log('[chat-stream] stream end after', Date.now() - requestStart, 'ms');
        }
        res.end();
      });
      nodeStream.on('error', (streamError) => {
        console.error('Upstream Chat stream error:', streamError);
        res.end();
      });
    } catch (error) {
      console.error('Proxy Chat API failed:', error);
      return res.status(500).json({ error: 'Failed to call Chat API' });
    }
  });

  // ---------------- Related Questions API proxy ----------------
  app.post('/api/related-questions', async (req, res) => {
    if (!RELATED_QUESTIONS_API_URL || !RELATED_QUESTIONS_API_TOKEN) {
      console.error('RELATED_QUESTIONS_API_URL or RELATED_QUESTIONS_API_TOKEN is not configured');
      return res.status(500).json({ error: 'Related Questions API is not configured on server' });
    }

    const payload = req.body || {};

    try {
      const upstreamResponse = await fetch(RELATED_QUESTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RELATED_QUESTIONS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error('Upstream Related Questions API error:', upstreamResponse.status, errorText);
        return res.status(upstreamResponse.status).send(errorText);
      }

      const contentType = upstreamResponse.headers.get('content-type') || 'text/event-stream';
      res.status(upstreamResponse.status);
      res.setHeader('Content-Type', contentType);

      if (!upstreamResponse.body) {
        return res.end();
      }

      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      nodeStream.pipe(res);
    } catch (error) {
      console.error('Proxy Related Questions API failed:', error);
      return res.status(500).json({ error: 'Failed to call Related Questions API' });
    }
  });

  // ---------------- Document Summary API proxy ----------------
  app.post('/api/document-summary', async (req, res) => {
    if (!DOCUMENT_SUMMARY_API_URL || !DOCUMENT_SUMMARY_API_TOKEN) {
      console.error(
        'DOCUMENT_SUMMARY_API_URL or DOCUMENT_SUMMARY_API_TOKEN is not configured',
      );
      return res.status(500).json({ error: 'Document Summary API is not configured on server' });
    }

    const payload = req.body || {};

    try {
      const upstreamResponse = await fetch(DOCUMENT_SUMMARY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DOCUMENT_SUMMARY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error('Upstream Document Summary API error:', upstreamResponse.status, errorText);
        return res.status(upstreamResponse.status).send(errorText);
      }

      const contentType = upstreamResponse.headers.get('content-type') || 'text/event-stream';
      res.status(upstreamResponse.status);
      res.setHeader('Content-Type', contentType);

      if (!upstreamResponse.body) {
        return res.end();
      }

      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      nodeStream.pipe(res);
    } catch (error) {
      console.error('Proxy Document Summary API failed:', error);
      return res.status(500).json({ error: 'Failed to call Document Summary API' });
    }
  });

  // 根据 SN 获取 magnet.id
  app.get('/api/magnets/by-sn/:sn', async (req, res) => {
    const { sn } = req.params;

    if (!sn) {
      return res.status(400).json({ error: 'sn is required' });
    }

    try {
      const { data, error } = await supabase
        .from('magnet')
        .select('id')
        .eq('sn', sn)
        .maybeSingle();

      if (error) {
        console.error('Error querying magnet by sn:', error);
        return res.status(500).json({ error: 'Failed to query magnet' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Magnet not found' });
      }

      return res.json({ id: data.id });
    } catch (err) {
      console.error('Unexpected error in /api/magnets/by-sn:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 获取 magnet 的 stage 字段
  app.get('/api/magnets/:id/stage', async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    try {
      const { data, error } = await supabase
        .from('magnet')
        .select('stage')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error querying magnet stage:', error);
        return res.status(500).json({ error: 'Failed to query magnet stage' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Magnet not found' });
      }

      return res.json({ stage: data.stage || '' });
    } catch (err) {
      console.error('Unexpected error in /api/magnets/:id/stage:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 获取代理联系信息
  app.get('/api/magnets/:id/agent', async (req, res) => {
    const { id: magnetId } = req.params;

    if (!magnetId) {
      return res.status(400).json({ error: 'magnetId is required' });
    }

    try {
      // 先通过 magnet 表拿到 magnet_config_cta_id
      const { data: magnetData, error: magnetError } = await supabase
        .from('magnet')
        .select('magnet_config_cta_id')
        .eq('id', magnetId)
        .maybeSingle();

      console.log('[CTA] magnet query result:', {
        magnetId,
        magnetData,
        magnetError,
      });

      if (magnetError) {
        console.error('Error querying magnet:', magnetError);
        return res.status(500).json({ error: 'Failed to query magnet' });
      }

      if (!magnetData || !magnetData.magnet_config_cta_id) {
        return res.status(404).json({ error: 'magnet_config_cta_id not found' });
      }

      // 再用 magnet_config_cta_id 去 magnet_config_cta 表按主键 id 查询
      const { data: ctaRows, error: ctaError } = await supabase
        .from('magnet_config_cta')
        .select('id, phone, email, name')
        .eq('id', magnetData.magnet_config_cta_id);

      console.log('[CTA] magnet_config_cta query:', {
        table: 'magnet_config_cta',
        idFilter: magnetData.magnet_config_cta_id,
        rowsCount: Array.isArray(ctaRows) ? ctaRows.length : 0,
        ctaError,
      });

      if (ctaError) {
        console.error('Error querying magnet_config_cta:', ctaError);
        return res.status(500).json({ error: 'Failed to query CTA info' });
      }

      if (!ctaRows || ctaRows.length === 0) {
        return res.status(404).json({ error: 'CTA info not found' });
      }

      // 如果有多条记录，默认取第一条，避免 PGRST116 错误
      const ctaData = ctaRows[0];

      return res.json({
        phone: ctaData.phone || '',
        email: ctaData.email || '',
        name: ctaData.name || 'James',
      });
    } catch (err) {
      console.error('Unexpected error in /api/magnets/:id/agent:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 获取今日播放内容（audio_url 来自 play_news_contents，按 magnet.zip_code 优先）
  app.get('/api/play-contents/today', async (req, res) => {
    const { magnetId } = req.query;

    try {
      let zipCode = null;
      if (magnetId) {
        const { data: magnet, error: magnetErr } = await supabase
          .from('magnet')
          .select('zip_code')
          .eq('id', magnetId)
          .maybeSingle();
        if (!magnetErr && magnet?.zip_code) zipCode = magnet.zip_code;
      }

      const selectCols = 'id, headline, audio_url';
      const orderOpt = { ascending: false };

      if (zipCode) {
        const { data: byZip, error: zipErr } = await supabase
          .from('play_news_contents')
          .select(selectCols)
          .eq('zip_code', zipCode)
          .order('created_at', orderOpt)
          .limit(1);

        if (!zipErr && byZip?.length > 0) {
          return res.json({
            content: { id: byZip[0].id, title: byZip[0].headline, audio_url: byZip[0].audio_url },
            from: 'zip_code',
          });
        }
      }

      const { data: latest, error: latestErr } = await supabase
        .from('play_news_contents')
        .select(selectCols)
        .order('created_at', orderOpt)
        .limit(1);

      if (latestErr) {
        console.error('Error querying play_news_contents:', latestErr);
        return res.status(500).json({ error: 'Failed to query play_news_contents' });
      }

      if (latest?.length > 0) {
        return res.json({
          content: { id: latest[0].id, title: latest[0].headline, audio_url: latest[0].audio_url },
          from: zipCode ? 'latest_fallback' : 'latest',
        });
      }

      return res.json({ content: null, from: 'none' });
    } catch (err) {
      console.error('Unexpected error in /api/play-contents/today:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 用户行为日志
  app.post('/api/log/user-action', async (req, res) => {
    const { cId, actionType, magnetConfigQaId, sessionId, deviceInfo } = req.body || {};

    if (!cId || !actionType || !sessionId) {
      return res.status(400).json({ error: 'cId, actionType and sessionId are required' });
    }

    try {
      const userId = await getOrCreateUser({ supabase, sessionId, deviceInfo, req });

      if (!userId) {
        return res.status(500).json({ error: 'Failed to get or create user' });
      }

      const ipAddress = getClientIp(req);

      const { error } = await supabase.from('user_action_log').insert({
        user_id: userId,
        magnet_id: Number.isNaN(Number(cId)) ? null : Number(cId),
        action_type: actionType,
        magnet_config_qa_id: magnetConfigQaId ?? null,
        device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
        ip_address: ipAddress,
      });

      if (error) {
        console.error('Error inserting user_action_log:', error);
        return res.status(500).json({ error: 'Failed to log user action' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Unexpected error in /api/log/user-action:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 聊天日志
  app.post('/api/log/chat', async (req, res) => {
    const { cId, question, answer, sessionId, deviceInfo } = req.body || {};

    if (!cId || !question || !answer || !sessionId) {
      return res
        .status(400)
        .json({ error: 'cId, question, answer and sessionId are required' });
    }

    try {
      const userId = await getOrCreateUser({ supabase, sessionId, deviceInfo, req });

      if (!userId) {
        return res.status(500).json({ error: 'Failed to get or create user' });
      }

      const { error } = await supabase.from('user_chat_log').insert({
        user_id: userId,
        magnet_id: Number.isNaN(Number(cId)) ? null : Number(cId),
        question,
        answer,
      });

      if (error) {
        console.error('Error inserting user_chat_log:', error);
        return res.status(500).json({ error: 'Failed to log chat message' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Unexpected error in /api/log/chat:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 播放日志：创建
  app.post('/api/play-logs', async (req, res) => {
    const { cId, magnetConfigQaId, play_news_contents_id, sessionId, deviceInfo } = req.body || {};

    if (!cId || !sessionId) {
      return res.status(400).json({ error: 'cId and sessionId are required' });
    }

    try {
      const userId = await getOrCreateUser({ supabase, sessionId, deviceInfo, req });

      if (!userId) {
        return res.status(500).json({ error: 'Failed to get or create user' });
      }

      const startTime = new Date().toISOString();
      // play_news_contents_id 必须为数值（play_news_contents.id），拒绝 UUID 等
      let newsContentId = null;
      if (play_news_contents_id != null) {
        const n = Number(play_news_contents_id);
        const isUuid = typeof play_news_contents_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(play_news_contents_id);
        if (!isUuid && !Number.isNaN(n) && n >= 0) newsContentId = n;
      }

      const { data, error } = await supabase
        .from('play_content_log')
        .insert({
          user_id: userId,
          magnet_id: Number.isNaN(Number(cId)) ? null : Number(cId),
          megnet_config_qa_id: magnetConfigQaId ?? null,
          play_news_contents_id: newsContentId,
          play_time: startTime,
          start_time: startTime,
          duration: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting play_content_log:', error);
        return res.status(500).json({ error: 'Failed to create play content log' });
      }

      return res.json({ id: data?.id ?? null });
    } catch (err) {
      console.error('Unexpected error in /api/play-logs:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 播放日志：更新
  app.patch('/api/play-logs/:id', async (req, res) => {
    const { id } = req.params;
    const { duration } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'log id is required' });
    }

    if (typeof duration !== 'number') {
      return res.status(400).json({ error: 'duration (number) is required' });
    }

    try {
      const endTime = new Date().toISOString();

      const { error } = await supabase
        .from('play_content_log')
        .update({
          end_time: endTime,
          duration,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating play_content_log:', error);
        return res.status(500).json({ error: 'Failed to update play content log' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Unexpected error in PATCH /api/play-logs/:id:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
