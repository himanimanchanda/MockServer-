import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Proxy API requests to the Spring Boot backend during local dev
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/routes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/logs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/migrate': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/audit-logs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Catch-all for mock endpoint testing (any path not matching above)
      '/demo': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
