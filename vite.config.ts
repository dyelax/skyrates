import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: { input: ['index.html', 'study.html'], output: { manualChunks: { phaser: ['phaser'] } } },
    chunkSizeWarningLimit: 1700,
  },
})
