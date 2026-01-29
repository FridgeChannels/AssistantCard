import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import TpPage from './pages/TpPage.jsx'
import { getMagnetIdBySn } from './lib/magnetIdService.js'
import { apiGetContentPlayById } from './api/backendClient.js'
import { MobileContainer } from './components/layout/MobileContainer.jsx'

// 包装组件：从路由中读取 sn，通过接口换取 magnet_id 并在全局缓存
function AppWithRouter() {
  const { sn } = useParams()
  const [magnetId, setMagnetId] = useState('')

  useEffect(() => {
    let cancelled = false

    async function resolveMagnetId() {
      if (!sn) {
        setMagnetId('')
        return
      }

      try {
        const id = await getMagnetIdBySn(sn)
        if (!cancelled) {
          setMagnetId(id || '')
        }
      } catch (e) {
        console.error('根据 SN 获取 magnet_id 失败:', e)
        if (!cancelled) {
          setMagnetId('')
        }
      }
    }

    resolveMagnetId()

    return () => {
      cancelled = true
    }
  }, [sn])

  // 这里向下传递的 cId 已经是 magnet 表中的 id（magnet_id）
  return <App cId={magnetId || ''} />
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
    let cancelled = false
    setStatus('loading')
    apiGetContentPlayById(id)
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
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setCId('')
          setContentPlay(null)
        }
      })
    return () => { cancelled = true }
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
          <p className="text-sm">未找到该内容或链接已失效</p>
        </div>
      </MobileContainer>
    )
  }

  return <TpPage cId={cId} contentPlay={contentPlay} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* URL 使用 SN 编号，例如 /p/87483M0P20 */}
        <Route path="/p/:sn?" element={<AppWithRouter />} />
        {/* URL 使用 content_play 表主键 id，例如 /tp/123 */}
        <Route path="/tp/:id" element={<TpPageWithRouter />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
