import { Readable } from 'node:stream';
import { performance } from 'node:perf_hooks';

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
const WORKFLOW_RUN_URL =
  process.env.WORKFLOW_RUN_URL || process.env.VITE_WORKFLOW_RUN_URL;
const WORKFLOW_RUN_TOKEN =
  process.env.WORKFLOW_RUN_TOKEN || process.env.VITE_WORKFLOW_RUN_TOKEN;

function setCacheSeconds(res, seconds, staleWhileRevalidateSeconds = 0) {
  const parts = [`public`, `max-age=${Math.max(0, seconds | 0)}`];
  if (staleWhileRevalidateSeconds > 0) {
    parts.push(`stale-while-revalidate=${Math.max(0, staleWhileRevalidateSeconds | 0)}`);
  }
  res.setHeader('Cache-Control', parts.join(', '));
}

function createServerTiming() {
  const start = performance.now();
  const metrics = [];
  return {
    async time(name, fn) {
      const t0 = performance.now();
      const result = await fn();
      metrics.push([name, performance.now() - t0]);
      return result;
    },
    setHeader(res) {
      const total = performance.now() - start;
      metrics.push(['total', total]);
      res.setHeader(
        'Server-Timing',
        metrics.map(([name, dur]) => `${name};dur=${dur.toFixed(1)}`).join(', '),
      );
    },
  };
}

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

  // ---------------- Workflow Run API proxy (starter questions: blocking) ----------------
  app.post('/api/workflows/run', async (req, res) => {
    if (!WORKFLOW_RUN_URL || !WORKFLOW_RUN_TOKEN) {
      console.error('WORKFLOW_RUN_URL or WORKFLOW_RUN_TOKEN is not configured');
      return res.status(500).json({ error: 'Workflow Run API is not configured on server' });
    }

    const payload = req.body || {};

    try {
      const upstreamResponse = await fetch(WORKFLOW_RUN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WORKFLOW_RUN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error('Upstream Workflow Run API error:', upstreamResponse.status, errorText);
        return res.status(upstreamResponse.status).send(errorText);
      }

      const json = await upstreamResponse.json();
      res.status(upstreamResponse.status).json(json);
    } catch (error) {
      console.error('Proxy Workflow Run API failed:', error);
      return res.status(500).json({ error: 'Failed to call Workflow Run API' });
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

  // 根据 SN 获取 magnet.id 及 solution 信息（route、id、permissions）
  app.get('/api/magnets/by-sn/:sn', async (req, res) => {
    const { sn } = req.params;

    if (!sn) {
      return res.status(400).json({ error: 'sn is required' });
    }

    try {
      const timing = createServerTiming();
      const { data: magnetRow, error } = await timing.time('sb_magnet_by_sn', () =>
        supabase
          .from('magnet')
          .select('id, stage, magnet_config_id, magnet_config_cta_id, formatted, zip_code')
          .eq('sn', sn)
          .maybeSingle(),
      );

      if (error) {
        console.error('Error querying magnet by sn:', error);
        return res.status(500).json({ error: 'Failed to query magnet' });
      }

      if (!magnetRow) {
        return res.status(404).json({ error: 'Magnet not found' });
      }

      const payload = { id: magnetRow.id, stage: magnetRow.stage || '', formatted: magnetRow.formatted || '', zipCode: magnetRow.zip_code || '' };

      const ctaPromise = magnetRow.magnet_config_cta_id
        ? timing.time('sb_cta', () =>
            supabase
              .from('magnet_config_cta')
              .select('id, phone, email, name, skip_url, chat_url')
              .eq('id', magnetRow.magnet_config_cta_id),
          )
        : Promise.resolve({ data: null, error: null });

      const configPromise = magnetRow.magnet_config_id
        ? timing.time('sb_magnet_config', () =>
            supabase
              .from('magnet_config')
              .select('industry_solution_id, assistant_config, assistant_function_code')
              .eq('id', magnetRow.magnet_config_id)
              .maybeSingle(),
          )
        : Promise.resolve({ data: null, error: null });

      const [
        { data: ctaRows, error: ctaError },
        { data: configRow, error: configError },
      ] = await Promise.all([ctaPromise, configPromise]);

      if (ctaError) {
        console.error('Error querying magnet_config_cta:', ctaError);
      }
      if (Array.isArray(ctaRows) && ctaRows.length > 0) {
        const cta = ctaRows[0];
        const chatUrl = cta.chat_url ?? cta.chatUrl ?? cta['chat-url'] ?? null;
        payload.cta = {
          phone: cta.phone ?? '',
          email: cta.email ?? '',
          name: cta.name ?? 'James',
          skip_url: cta.skip_url ?? null,
          chat_url: chatUrl,
        };
      }

      // 通过 magnet_config 获取 industry_solution，再组装 solution
      if (configError) {
        console.error('Error querying magnet_config:', configError);
      }

      // 添加 assistant_config 和 assistant_function_code 到响应中 (即使为空也要返回)
      if (configRow) {
        payload.assistant_config = configRow.assistant_config || null;
        payload.assistant_function_code = configRow.assistant_function_code || null;
      }

      const industrySolutionId = configRow?.industry_solution_id ?? null;
      if (industrySolutionId) {
        const [{ data: solutionRow }, { data: configList, error: configListError }] = await Promise.all([
          timing.time('sb_industry_solution', () =>
            supabase
              .from('industry_solution')
              .select('id, studio_entry_route, industry_id')
              .eq('id', industrySolutionId)
              .maybeSingle(),
          ),
          timing.time('sb_solution_config', () =>
            supabase
              .from('industry_solution_config')
              .select(`
                module_id,
                function_id,
                method_id,
                solution_module:module_id(code),
                solution_function:function_id(code),
                solution_method:method_id(code)
              `)
              .eq('industry_solution_id', industrySolutionId)
              .order('sort_order'),
          ),
        ]);

        if (configListError) {
          console.error('Error querying industry_solution_config:', configListError);
        }

        if (solutionRow) {
          const route = (solutionRow.studio_entry_route || '')
            .replace(/^\/studio\/?/, '')
            .replace(/\/$/, '') || null;

          const permSet = new Set();
          (configList || []).forEach((row) => {
            const mod = row.solution_module?.code;
            const fn = row.solution_function?.code;
            const method = row.solution_method?.code;
            const toKey = (s) => (s || '').toUpperCase().replace(/-/g, '_');
            if (mod) permSet.add('MOD_' + toKey(mod));
            if (fn) permSet.add('FUNC_' + toKey(fn));
            if (method) permSet.add('METHOD_' + toKey(method));
          });

          const permissions = [...permSet].sort();
          console.log(`[by-sn] SN=${sn}, industry_solution_id=${industrySolutionId}, permissions count=${permissions.length}, permissions=`, permissions);

          payload.industry_id = solutionRow.industry_id ?? null;
          payload.solution = {
            route: route ?? 'real-estate',
            id: String(solutionRow.id),
            permissions: permissions,
          };
        }
      }

      if (payload.industry_id === undefined) {
        payload.industry_id = null;
      }

      if (!payload.solution) {
        payload.solution = {
          route: 'real-estate',
          id: '1',
          permissions: [
            'MOD_GLANCE_DESIGN',
            'FUNC_GLANCE_DESIGN',
            'METHOD_GLANCE_DESIGN',
            'MOD_ASSISTANT',
            'FUNC_ASSISTANT_FC_CUSTOM_MADE',
            'METHOD_ASSISTANT_FC_CUSTOM_MADE',
            'MOD_CTA',
            'FUNC_CTA_ROUTE',
            'METHOD_CTA_CONTACT',
            'MOD_PLAY_CONTENT',
            'FUNC_PLAY_CONTENT_FC',
            'METHOD_PLAY_CONTENT_FC',
            'METHOD_CTA_SKIP',
            'FUNC_PLAY_CONTENT_CUSTOM',
            'METHOD_PLAY_CONTENT_CUSTOM_TEXT',
            'METHOD_PLAY_CONTENT_CUSTOM_RSS',
            'FUNC_ASSISTANT_CHAT_URL',
            'METHOD_ASSISTANT_CHAT_URL',
            'FUNC_ASSISTANT_CUSTOM_PROMT',
            'METHOD_ASSISTANT_CUSTOM_PROMT',
          ],
        };
      }

      // 开发环境禁用缓存，确保权限变更能立即生效
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        setCacheSeconds(res, 1, 60);
      }
      timing.setHeader(res);
      return res.json(payload);
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
      const timing = createServerTiming();
      const { data, error } = await timing.time('sb_magnet_stage', () =>
        supabase.from('magnet').select('stage').eq('id', id).maybeSingle(),
      );

      if (error) {
        console.error('Error querying magnet stage:', error);
        return res.status(500).json({ error: 'Failed to query magnet stage' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Magnet not found' });
      }

      setCacheSeconds(res, 60, 300);
      timing.setHeader(res);
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
      const timing = createServerTiming();
      // 先通过 magnet 表拿到 magnet_config_cta_id
      const { data: magnetData, error: magnetError } = await timing.time('sb_magnet_agent_id', () =>
        supabase.from('magnet').select('magnet_config_cta_id').eq('id', magnetId).maybeSingle(),
      );

      if (magnetError) {
        console.error('Error querying magnet:', magnetError);
        return res.status(500).json({ error: 'Failed to query magnet' });
      }

      if (!magnetData || !magnetData.magnet_config_cta_id) {
        return res.status(404).json({ error: 'magnet_config_cta_id not found' });
      }

      // 再用 magnet_config_cta_id 去 magnet_config_cta 表按主键 id 查询
      const { data: ctaRows, error: ctaError } = await timing.time('sb_cta_agent', () =>
        supabase
          .from('magnet_config_cta')
          .select('id, phone, email, name')
          .eq('id', magnetData.magnet_config_cta_id),
      );

      if (ctaError) {
        console.error('Error querying magnet_config_cta:', ctaError);
        return res.status(500).json({ error: 'Failed to query CTA info' });
      }

      if (!ctaRows || ctaRows.length === 0) {
        return res.status(404).json({ error: 'CTA info not found' });
      }

      // 如果有多条记录，默认取第一条，避免 PGRST116 错误
      const ctaData = ctaRows[0];

      setCacheSeconds(res, 60, 300);
      timing.setHeader(res);
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

  // 获取今日播放内容（audio_url 来自 play_news_contents，按 magnet.zip_code 优先；按 magnet→magnet_config.industry_solution_id 限定行业）
  // 通过 URL 中的 sn（如 /p/N819HqJYQ123）定位 magnet：请求使用 ?sn=xxx，后端用 sn 查 magnet 得到 zip_code、industry_solution_id
  app.get('/api/play-contents/today', async (req, res) => {
    const { sn, magnetId: magnetIdQuery } = req.query;

    try {
      const timing = createServerTiming();
      const debug = process.env.PLAY_CONTENT_DEBUG === '1';
      let resolvedMagnetId = null;
      let zipCode = null;
      let industrySolutionId = null;
      let industryId = null;
      let locationFormatted = null;

      if (sn) {
        const { data: magnet, error: magnetErr } = await timing.time('sb_magnet_by_sn', () =>
          supabase
            .from('magnet')
            .select('id, zip_code, formatted, magnet_config_id')
            .eq('sn', sn)
            .maybeSingle(),
        );
        if (!magnetErr && magnet) {
          resolvedMagnetId = magnet.id;
          if (magnet.zip_code) zipCode = magnet.zip_code;
          if (magnet.formatted) locationFormatted = magnet.formatted;
          if (magnet.magnet_config_id) {
            const { data: config, error: configErr } = await timing.time('sb_magnet_config', () =>
              supabase
                .from('magnet_config')
                .select('industry_solution_id')
                .eq('id', magnet.magnet_config_id)
                .maybeSingle(),
            );
            if (!configErr && config?.industry_solution_id != null) {
              industrySolutionId = config.industry_solution_id;
            }
          }
        }
      } else if (magnetIdQuery) {
        resolvedMagnetId = magnetIdQuery;
        const { data: magnet, error: magnetErr } = await timing.time('sb_magnet_by_id', () =>
          supabase
            .from('magnet')
            .select('zip_code, formatted, magnet_config_id')
            .eq('id', magnetIdQuery)
            .maybeSingle(),
        );
        if (!magnetErr && magnet) {
          if (magnet.zip_code) zipCode = magnet.zip_code;
          if (magnet.formatted) locationFormatted = magnet.formatted;
          if (magnet.magnet_config_id) {
            const { data: config, error: configErr } = await timing.time('sb_magnet_config', () =>
              supabase
                .from('magnet_config')
                .select('industry_solution_id')
                .eq('id', magnet.magnet_config_id)
                .maybeSingle(),
            );
            if (!configErr && config?.industry_solution_id != null) {
              industrySolutionId = config.industry_solution_id;
            }
          }
        }
      }

      if (industrySolutionId != null) {
        const { data: isRow } = await timing.time('sb_industry_solution_for_industry_id', () =>
          supabase.from('industry_solution').select('industry_id').eq('id', industrySolutionId).maybeSingle(),
        );
        if (isRow?.industry_id != null) industryId = isRow.industry_id;
      }

      const selectCols = 'id, headline, audio_url';
      const orderOpt = { ascending: false };

      const hasZipCode = !!zipCode;
      if (debug) {
        console.log('[play-contents] 请求参数:', {
          sn: sn ?? null,
          resolvedMagnetId,
          zipCode,
          industrySolutionId,
          industryId,
          hasZipCode,
        });
      }

      if (zipCode) {
        let byZipQuery = supabase.from('play_news_contents').select(selectCols).eq('zip_code', zipCode);
        if (industryId != null) {
          byZipQuery = byZipQuery.eq('industry_id', industryId);
        }
        if (debug) {
          console.log(
            '[play-contents] 查询1 条件: zip_code=%s, industry_id=%s',
            zipCode,
            industryId ?? '(未设置)',
          );
        }
        const { data: byZip, error: zipErr } = await timing.time('sb_play_by_zip', () =>
          byZipQuery.order('created_at', orderOpt).limit(1),
        );
        if (debug) {
          console.log(
            '[play-contents] 查询1 结果: 条数=%s, error=%s',
            byZip?.length ?? 0,
            zipErr ? JSON.stringify(zipErr) : null,
          );
        }

        if (!zipErr && byZip?.length > 0) {
          setCacheSeconds(res, 300, 600);
          timing.setHeader(res);
          return res.json({
            content: { id: byZip[0].id, title: byZip[0].headline, audio_url: byZip[0].audio_url },
            from: 'zip_code',
            hasZipCode,
            locationFormatted,
          });
        }
      }

      let latestQuery = supabase.from('play_news_contents').select(selectCols);
      if (industryId != null) {
        latestQuery = latestQuery.eq('industry_id', industryId);
      }
      if (debug) {
        console.log('[play-contents] 查询2 条件: industry_id=%s', industryId ?? '(未设置)');
      }
      const { data: latest, error: latestErr } = await timing.time('sb_play_latest', () =>
        latestQuery.order('created_at', orderOpt).limit(1),
      );
      if (debug) {
        console.log(
          '[play-contents] 查询2 结果: 条数=%s, error=%s, 首条=%s',
          latest?.length ?? 0,
          latestErr ? JSON.stringify(latestErr) : null,
          latest?.[0] ?? null,
        );
      }
      if (latestErr) {
        console.error('Error querying play_news_contents:', latestErr);
        return res.status(500).json({ error: 'Failed to query play_news_contents' });
      }

      if (latest?.length > 0) {
        setCacheSeconds(res, 300, 600);
        timing.setHeader(res);
        return res.json({
          content: { id: latest[0].id, title: latest[0].headline, audio_url: latest[0].audio_url },
          from: zipCode ? 'latest_fallback' : 'latest',
          hasZipCode,
          locationFormatted,
        });
      }

      setCacheSeconds(res, 60, 300);
      timing.setHeader(res);
      return res.json({ content: null, from: 'none', hasZipCode, locationFormatted });
    } catch (err) {
      console.error('Unexpected error in /api/play-contents/today:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 播放内容列表（三种规则：long_text_sequential / rss / latest），zip_code 不参与取数
  app.get('/api/play-content/list', async (req, res) => {
    const { sn, magnetId: magnetIdQuery, debug: debugQuery } = req.query;
    const includeDebug = debugQuery === '1' || debugQuery === 'true';

    const toItem = (row) => ({
      id: row.id,
      title: row.headline,
      audio_url: row.audio_url,
    });

    try {
      const timing = createServerTiming();
      let magnet = null;
      let industrySolutionId = null;
      let industryId = null;

      if (sn) {
        const { data: m, error: magnetErr } = await timing.time('sb_magnet_by_sn', () =>
          supabase
            .from('magnet')
            .select('id, magnet_config_id, zip_code, formatted')
            .eq('sn', sn)
            .maybeSingle(),
        );
        if (!magnetErr) magnet = m;
      } else if (magnetIdQuery) {
        const { data: m, error: magnetErr } = await timing.time('sb_magnet_by_id', () =>
          supabase
            .from('magnet')
            .select('id, magnet_config_id, zip_code, formatted')
            .eq('id', magnetIdQuery)
            .maybeSingle(),
        );
        if (!magnetErr) magnet = m;
      }

      const hasZipCode = !!(magnet?.zip_code);
      const locationFormatted = magnet?.formatted ?? null;

      if (!magnet) {
        setCacheSeconds(res, 60, 300);
        timing.setHeader(res);
        const payload = {
          playback_rule: 'latest',
          items: [],
          hasZipCode: false,
          locationFormatted: null,
        };
        if (includeDebug) payload._debug = { reason: 'no_magnet' };
        return res.json(payload);
      }

      if (magnet.magnet_config_id) {
        const { data: mc, error: mcErr } = await timing.time('sb_magnet_config', () =>
          supabase
            .from('magnet_config')
            .select('industry_solution_id')
            .eq('id', magnet.magnet_config_id)
            .maybeSingle(),
        );
        if (!mcErr && mc?.industry_solution_id != null) industrySolutionId = mc.industry_solution_id;
      }

      if (industrySolutionId != null) {
        const { data: isRow } = await timing.time('sb_industry_solution_for_industry_id', () =>
          supabase.from('industry_solution').select('industry_id').eq('id', industrySolutionId).maybeSingle(),
        );
        if (isRow?.industry_id != null) industryId = isRow.industry_id;
      }

      const { data: playConfig, error: configErr } = await timing.time('sb_play_content_config', () =>
        supabase
          .from('magnet_play_content_configs')
          .select('id, source_type, processing_type')
          .eq('magnet_config_id', magnet.magnet_config_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      );

      if (configErr || !playConfig) {
        const selectCols = 'id, headline, audio_url';
        let latestQuery = supabase.from('play_news_contents').select(selectCols);
        if (industryId != null) {
          latestQuery = latestQuery.eq('industry_id', industryId);
        }
        const { data: latest, error: latestErr } = await timing.time('sb_play_latest', () =>
          latestQuery.order('created_at', { ascending: false }).limit(1),
        );
        if (latestErr) {
          console.error('Error querying play_news_contents (latest):', latestErr);
          return res.status(500).json({ error: 'Failed to query play_news_contents' });
        }
        const items = (latest?.length > 0) ? [toItem(latest[0])] : [];
        setCacheSeconds(res, items.length ? 300 : 60, items.length ? 600 : 300);
        timing.setHeader(res);
        const payloadLatest = {
          playback_rule: 'latest',
          items,
          hasZipCode,
          locationFormatted,
        };
        if (includeDebug) payloadLatest._debug = { reason: 'no_config_or_error', magnet_config_id: magnet.magnet_config_id };
        return res.json(payloadLatest);
      }

      const configId = playConfig.id;
      const isRss =
        String(playConfig.source_type).toLowerCase() === 'rss' &&
        String(playConfig.processing_type).toLowerCase() === 'periodic';
      const isLongText =
        String(playConfig.source_type).toLowerCase() === 'file' &&
        String(playConfig.processing_type).toLowerCase() === 'once';

      const selectCols = 'id, headline, audio_url';

      if (isRss) {
        const { data: rows, error: rssErr } = await timing.time('sb_play_rss', () =>
          supabase
            .from('play_news_contents')
            .select(selectCols)
            .eq('config_id', configId)
            .order('order_index', { ascending: false })
            .limit(1),
        );
        if (rssErr) {
          console.error('Error querying play_news_contents (rss):', rssErr);
          return res.status(500).json({ error: 'Failed to query play_news_contents' });
        }
        const items = (rows?.length > 0) ? [toItem(rows[0])] : [];
        setCacheSeconds(res, items.length ? 300 : 60, items.length ? 600 : 300);
        timing.setHeader(res);
        const payloadRss = {
          playback_rule: 'rss',
          items,
          hasZipCode,
          locationFormatted,
        };
        if (includeDebug) payloadRss._debug = { magnet_config_id: magnet.magnet_config_id, config_id: configId, source_type: playConfig.source_type, processing_type: playConfig.processing_type };
        return res.json(payloadRss);
      }

      if (isLongText) {
        const { data: rows, error: ltErr } = await timing.time('sb_play_longtext', () =>
          supabase
            .from('play_news_contents')
            .select(selectCols)
            .eq('config_id', configId)
            .order('order_index', { ascending: true }),
        );
        if (ltErr) {
          console.error('Error querying play_news_contents (long text):', ltErr);
          return res.status(500).json({ error: 'Failed to query play_news_contents' });
        }
        const items = (rows ?? []).map(toItem);
        setCacheSeconds(res, items.length ? 300 : 60, items.length ? 600 : 300);
        timing.setHeader(res);
        const payloadLt = {
          playback_rule: 'long_text_sequential',
          items,
          config_id: configId,
          hasZipCode,
          locationFormatted,
        };
        if (includeDebug) payloadLt._debug = { magnet_config_id: magnet.magnet_config_id, config_id: configId, source_type: playConfig.source_type, processing_type: playConfig.processing_type };
        return res.json(payloadLt);
      }

      const selectColsFallback = 'id, headline, audio_url';
      let fallbackQuery = supabase.from('play_news_contents').select(selectColsFallback);
      if (industryId != null) {
        fallbackQuery = fallbackQuery.eq('industry_id', industryId);
      }
      const { data: fallback, error: fallbackErr } = await timing.time('sb_play_fallback', () =>
        fallbackQuery.order('created_at', { ascending: false }).limit(1),
      );
      if (fallbackErr) {
        console.error('Error querying play_news_contents (fallback):', fallbackErr);
        return res.status(500).json({ error: 'Failed to query play_news_contents' });
      }
      const items = (fallback?.length > 0) ? [toItem(fallback[0])] : [];
      setCacheSeconds(res, items.length ? 300 : 60, items.length ? 600 : 300);
      timing.setHeader(res);
      const payloadFallback = {
        playback_rule: 'latest',
        items,
        hasZipCode,
        locationFormatted,
      };
      if (includeDebug) payloadFallback._debug = { reason: 'config_not_rss_or_longtext', magnet_config_id: magnet.magnet_config_id, config_id: configId, source_type: playConfig.source_type, processing_type: playConfig.processing_type };
      return res.json(payloadFallback);
    } catch (err) {
      console.error('Unexpected error in /api/play-content/list', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 根据 content_play.id 获取记录并解析出 magnetId（供 /tp/:id 页面使用）
  app.get('/api/content-play/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    try {
      const { data: row, error } = await supabase
        .from('content_play')
        .select('id, customer_id, original_content, rss_url, generated_play_text, audio_url, cta_text, cta_link, created_at, updated_at, original_title, display_title, team_name, front_image_url, logo_url, back_image_url, team_image_url')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error querying content_play:', error);
        return res.status(500).json({ error: 'Failed to query content_play' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Content play not found' });
      }

      let magnetId = null;
      if (row.customer_id) {
        const { data: magnets, error: magnetErr } = await supabase
          .from('magnet')
          .select('id')
          .eq('customer_id', row.customer_id)
          .limit(1);
        const magnet = Array.isArray(magnets) ? magnets[0] : magnets;
        if (!magnetErr && magnet?.id != null) {
          magnetId = String(magnet.id);
        }
      }

      return res.json({
        ...row,
        magnetId,
      });
    } catch (err) {
      console.error('Unexpected error in /api/content-play/:id', err);
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

  // ---------------- Location Search Proxy ----------------
  app.get('/api/location/search', async (req, res) => {
    const { text } = req.query;
    const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Search text is required' });
    }

    if (!GEOAPIFY_API_KEY) {
      console.error('GEOAPIFY_API_KEY is not configured');
      return res.status(500).json({ error: 'Location service is not configured on server' });
    }

    try {
      const params = new URLSearchParams({
        text: text,
        format: 'json',
        lang: 'en',
        country: 'United States of America',
        apiKey: GEOAPIFY_API_KEY
      });

      const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Geoapify API error:', response.status, errorText);
        return res.status(response.status).send(errorText);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('Proxy Location Search API failed:', error);
      return res.status(500).json({ error: 'Failed to search locations' });
    }
  });

  // 更新 magnet 的 zip_code
  app.patch('/api/magnets/:id/zip-code', async (req, res) => {
    const { id } = req.params;
    const { zipCode, city, state, country, formatted } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    if (!zipCode) {
      return res.status(400).json({ error: 'zipCode is required' });
    }

    try {
      // -----------------------------------------------------------
      // [REMOVED] play_zip_code table has been deleted.
      // Previously handled upsert to play_zip_code here.
      // -----------------------------------------------------------

      const updatePayload = { zip_code: zipCode };
      if (formatted !== undefined) {
        updatePayload.formatted = formatted;
      }

      const { error } = await supabase
        .from('magnet')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        console.error('Error updating magnet zip_code:', error);
        return res.status(500).json({ error: 'Failed to update zip code' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Unexpected error in PATCH /api/magnets/:id/zip-code:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
