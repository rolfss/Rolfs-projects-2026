import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'happy-dom', environmentOptions: { happyDOM: { url: 'https://rolfss.github.io/Click-here-for-newest-projects/second-rolf/' } }, include: ['tests/ui/*.test.mjs'] } });
