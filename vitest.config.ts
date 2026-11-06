import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// In development the API runs separately on :3000 and Vite proxies /api to it.
// changeOrigin must be false: the server compares the browser's Origin with the Host header, so Host must stay localhost:5173.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } } },
})