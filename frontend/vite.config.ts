import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // expone en 0.0.0.0 para poder entrar desde fuera del contenedor
    port: 5173,
    watch: {
      // necesario para que el hot-reload (HMR) detecte cambios montados por Docker
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
})
