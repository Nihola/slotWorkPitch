import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// In development the API runs separately on :3000 and Vite proxies /api to it, so cookies and CORS behave like production (same origin).
const apiTarget = 'http://localhost:3000'
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': {
  target: apiTarget,
  changeOrigin: true,
  configure: proxy => proxy.on('proxyReq', request => request.setHeader('origin', apiTarget)),
} } } })
