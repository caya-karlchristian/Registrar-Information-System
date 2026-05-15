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
          target: `ws://${env.VITE_REVERB_HOST ?? "localhost"}:${env.VITE_REVERB_PORT ?? 8080}`,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
