import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: { '@': path.resolve(__dirname, './src') },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/types/**', 'src/app/layout.tsx'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
          alias: { '@': path.resolve(__dirname, './src') },
        },
      },
      {
        test: {
          name: 'rules',
          globals: true,
          environment: 'node',
          include: ['tests/rules/**/*.test.ts'],
          alias: { '@': path.resolve(__dirname, './src') },
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          alias: { '@': path.resolve(__dirname, './src') },
        },
      },
    ],
  },
});
