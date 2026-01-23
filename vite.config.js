import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    allowedHosts: 'all', // 禁用 Host 头验证，允许所有域名访问
  },
})
