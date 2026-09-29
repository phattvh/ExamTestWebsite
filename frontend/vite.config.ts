/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Speed: esbuild minify (default) + higher chunk warning for MUI vendor size
    chunkSizeWarningLimit: 900,
    reportCompressedSize: false,
  },
})
