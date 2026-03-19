import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',    // expose outside container
    port: 5173,
    watch: {
      usePolling: true  // required for Windows hot reload
    }
  }
})