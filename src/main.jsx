import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { getMagnetIdBySn } from './lib/magnetIdService.js'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* URL 使用 SN 编号，例如 /p/87483M0P20 */}
        <Route path="/p/:sn?" element={<AppWithRouter />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
