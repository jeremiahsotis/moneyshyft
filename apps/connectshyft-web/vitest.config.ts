import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shyft/contracts': fileURLToPath(new URL('../../libs/contracts/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
