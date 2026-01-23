import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    cors: true,
    proxy: {},
    allowedHosts: [
      'tap.fridgechannels.com',
      'localhost',
      '.fridgechannels.com', // 允许所有 fridgechannels.com 子域名
    ],
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    allowedHosts: [
      'tap.fridgechannels.com',
      'localhost',
      '.fridgechannels.com',
    ],
  },
})
