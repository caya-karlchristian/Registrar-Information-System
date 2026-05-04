import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },
    // Proxy API and WebSocket traffic to the backend/reverb containers so
    // local dev behaves identically to the nginx-proxied production setup.
    // Without this, every API call hits a CORS preflight failure in dev.
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/app": {
        target: `ws://${process.env.VITE_REVERB_HOST ?? "localhost"}:${process.env.VITE_REVERB_PORT ?? 8080}`,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
