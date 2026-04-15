import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Forward the Vite dev server's `/ws` path to the local y-websocket server.
    proxy: {
      '/ws': {
        target: 'ws://localhost:1234',
        ws: true,
        rewrite: (p) => p.replace(/^\/ws/, ''),
      },
    },
  },
})
