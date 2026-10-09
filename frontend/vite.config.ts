/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'] } },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
