import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/missoes-da-loja/',
  server: { port: 3000, open: true },
  build: {
    outDir: 'dist',
    target: ['es2015', 'safari12'],
    cssTarget: 'safari12',
    sourcemap: false
  }
})
