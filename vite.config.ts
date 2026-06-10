import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
  preview: {
    port: 5177,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (id.includes('@xyflow') || id.includes('dagre')) return 'flow'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('@tanstack')) return 'query'
          if (
            id.includes('react-router') ||
            /[\\/]react(-dom)?[\\/]/.test(id) ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
})
