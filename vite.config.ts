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
          // React core MUST be an isolated leaf chunk: it has no outgoing
          // edges to other chunks, so it always initializes first. Adding
          // React-dependent libs (e.g. react-router) here creates circular
          // chunks, which makes React undefined when radix/etc. evaluate
          // (TypeError: Cannot read properties of undefined 'useLayoutEffect').
          if (
            /[\\/]node_modules[\\/]react[\\/]/.test(id) ||
            /[\\/]node_modules[\\/]react-dom[\\/]/.test(id) ||
            /[\\/]node_modules[\\/]scheduler[\\/]/.test(id)
          ) {
            return 'react-vendor'
          }
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (id.includes('@xyflow') || id.includes('dagre')) return 'flow'
          if (id.includes('@dnd-kit')) return 'dnd'
          // Keep Radix together with its runtime helper deps AND its only
          // upstream consumer (@assistant-ui, which is built on Radix) so the
          // radix chunk only depends on react-vendor (one direction) and
          // doesn't form a radix <-> vendor cycle.
          if (
            id.includes('@radix-ui') ||
            id.includes('@assistant-ui') ||
            id.includes('@floating-ui') ||
            id.includes('aria-hidden') ||
            id.includes('react-remove-scroll') ||
            id.includes('react-style-singleton') ||
            id.includes('use-callback-ref') ||
            id.includes('use-sidecar') ||
            id.includes('get-nonce') ||
            id.includes('detect-node-es')
          ) {
            return 'radix'
          }
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('@tanstack')) return 'query'
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router'
          return 'vendor'
        },
      },
    },
  },
})
