import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy local hacia la API pública de MEXC (evita bloqueos CORS en el navegador).
      // Solo endpoints públicos de mercado: NO se envía ninguna API Key.
      '/mexc-api': {
        target: 'https://api.mexc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mexc-api/, '')
      }
    }
  }
})
