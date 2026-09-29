/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor-mui';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@mediapipe') || id.includes('onnxruntime')) {
              return 'vendor-ai';
            }
          }
        }
      }
    }
  },
  server: {
    host: true,
    watch: {
      ignored: ['**/dist-client/**', '**/dist-electron/**', '**/release/**', '**/*.rar', '**/*.zip', '**/*.7z', '**/*.tar.gz', '**/*.tmp'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost',
        ws: true,
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
