import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://accounts.google.com https://api.mapbox.com; frame-src 'self' https://accounts.google.com; worker-src 'self' blob:; child-src 'self' blob:; style-src 'self' 'unsafe-inline' https://accounts.google.com https://api.mapbox.com; img-src 'self' data: blob: https://res.cloudinary.com https://ui-avatars.com https://*.googleusercontent.com https://api.mapbox.com https://*.mapbox.com https://images.unsplash.com https://img.vietqr.io https://unpkg.com https://cdn-icons-png.flaticon.com https://*.openstreetmap.org https://*.tile.openstreetmap.org; connect-src 'self' https://accounts.google.com ws://localhost:5173 ws://localhost:8080 http://localhost:8080 https://laundry-hub-api.onrender.com wss://laundry-hub-api.onrender.com https://api.mapbox.com https://events.mapbox.com https://api.cloudinary.com https://res.cloudinary.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
