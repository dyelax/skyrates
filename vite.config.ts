import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: { input: ['index.html', 'study.html', 'battle-test.html'], output: { manualChunks: { phaser: ['phaser'] } } },
    chunkSizeWarningLimit: 1700,
  },
})
