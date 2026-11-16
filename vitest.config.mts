import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    // Node 25+ ships a global localStorage that shadows happy-dom's and throws
    // without --localstorage-file; turn it off in test workers (works on Node 22+).
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['./vitest.setup.mts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
