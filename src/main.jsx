import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import TpPage from './pages/TpPage.jsx'
import { getMagnetBySn } from './lib/magnetIdService.js'
import { apiGetContentPlayById } from './api/backendClient.js'
import { MobileContainer } from './components/layout/MobileContainer.jsx'

// 包装组件：从路由中读取 sn，通过接口换取 magnet 信息（id、solution、cta）并在全局缓存
function AppWithRouter() {
  const { sn } = useParams()
  const [magnetId, setMagnetId] = useState('')
  const [magnetContext, setMagnetContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [magnetInfo, setMagnetInfo] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    setLoading(true)

    async function resolveMagnet() {
      if (!sn) {
        setMagnetId('')
        setMagnetContext(null)
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const data = await getMagnetBySn(sn, { signal: controller.signal })
        if (!cancelled) {
          setMagnetId(data?.id ?? '')
          setMagnetContext(data ? { solution: data.solution, cta: data.cta, industry_id: data.industry_id, assistant_config: data.assistant_config ?? null, assistant_prompt_label: data.assistant_prompt_label ?? null, background_image_url: data.background_image_url ?? null } : null)
          setMagnetInfo(data)
        }
      } catch (e) {
        if (e?.name === 'AbortError') return
        console.error('根据 SN 获取 magnet 信息失败:', e)
        if (!cancelled) {
          setMagnetId('')
          setMagnetContext(null)
          setMagnetInfo(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolveMagnet()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [sn])

  if (loading) {
    return (
      <MobileContainer backdropImage="/bg2.png">
        <div className="flex-1 flex flex-col items-center justify-center text-sothebys-navy/80">
          <div className="w-8 h-8 border-2 border-sothebys-navy/30 border-t-sothebys-navy rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  // cId 为 magnet 表 id；sn 为 URL 路径值；magnetContext 含 solution、cta；initialLocation 兼容引导页
  return (
    <App
      cId={magnetId || ''}
      sn={sn || ''}
      magnetContext={magnetContext}
      initialLocation={magnetInfo ? { formatted: magnetInfo.formatted, zipCode: magnetInfo.zipCode } : null}
    />
  )
}

// /tp/:id 路由：id 为 content_play 表主键，解析出 magnetId 后渲染独立页面
function TpPageWithRouter() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [cId, setCId] = useState('')
  const [contentPlay, setContentPlay] = useState(null)

  useEffect(() => {
    if (!id) {
      setStatus('error')
      setCId('')
      return
    }
    const controller = new AbortController()
    let cancelled = false
    setStatus('loading')
    apiGetContentPlayById(id, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return
        const magnetId = data?.magnetId != null ? String(data.magnetId) : ''
        if (magnetId) {
          setCId(magnetId)
          setContentPlay(data || null)
          setStatus('ready')
        } else {
          setStatus('error')
          setCId('')
          setContentPlay(null)
        }
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return
        if (!cancelled) {
          setStatus('error')
          setCId('')
          setContentPlay(null)
        }
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id])

  if (status === 'loading') {
    return (
      <MobileContainer backdropImage="/bg2.png">
        <div className="flex-1 flex flex-col items-center justify-center text-sothebys-navy/80">
          <div className="w-8 h-8 border-2 border-sothebys-navy/30 border-t-sothebys-navy rounded-full animate-spin" />
          <p className="mt-4 text-sm">Loading...</p>
        </div>
      </MobileContainer>
    )
  }

  if (status === 'error') {
    return (
      <MobileContainer backdropImage="/bg2.png">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-sothebys-navy/80">
          <p className="text-sm">Content not found or link has expired.</p>
        </div>
      </MobileContainer>
    )
  }

  return <TpPage cId={cId} contentPlay={contentPlay} />
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      {/* URL 使用 SN 编号，例如 /p/87483M0P20 */}
      <Route path="/p/:sn?" element={<AppWithRouter />} />
      {/* URL 使用 content_play 表主键 id，例如 /tp/123 */}
      <Route path="/tp/:id" element={<TpPageWithRouter />} />
    </Routes>
  </BrowserRouter>,
)
