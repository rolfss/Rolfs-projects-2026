import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' }, miniflare: {
    bindings: { LOCAL_CONNECTOR_KEY: 'test-connector-secret-that-is-long-enough-123456', TURNSTILE_SITE_KEY: 'test-site', TURNSTILE_SECRET_KEY: 'test-secret' }
  } })],
  test: { include: ['tests/*.test.mjs'], testTimeout: 15000 }
});
