import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Live blood center tracking is served by the Java service.
      '/api/blood-centers': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      '/api/blood-inventory': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      // Authentication and surveys stay on the existing Node API.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
