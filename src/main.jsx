import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// 包装组件以获取路由参数
function AppWithRouter() {
  const { cId } = useParams();
  return <App cId={cId || ''} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/p/:cId?" element={<AppWithRouter />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
