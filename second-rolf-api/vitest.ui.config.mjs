import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'happy-dom', environmentOptions: { happyDOM: { url: 'https://rolfss.github.io/Rolfs-projects-2026/second-rolf/' } }, include: ['tests/ui/*.test.mjs'] } });
