import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      watch: { usePolling: true },
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL ?? "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/broadcasting": {
          target: env.VITE_BACKEND_URL ?? "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/app": {
          target: `ws://${env.REVERB_INTERNAL_HOST ?? "reverb"}:${env.REVERB_INTERNAL_PORT ?? 8080}`,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-data': ['@tanstack/react-query', 'axios'],
            'vendor-charts': ['recharts'],
            'vendor-export': ['docx', 'exceljs', 'file-saver'],
            'vendor-scanner-qr': ['jsqr', 'qrcode.react', 'html-to-image'],
            'vendor-realtime': ['laravel-echo', 'pusher-js'],
          },
        },
      },
    },
  }
})