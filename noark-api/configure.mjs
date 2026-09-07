import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { backendOrigin } from '../noark-assistent/luna-client.mjs';

// This accepts a PUBLIC Worker origin only. No secrets are read or written.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const origin = backendOrigin(process.argv[2] ?? '');
  if (!origin || !/^[a-zA-Z0-9.:/-]+$/.test(origin)) throw new Error('Oppgi en HTTPS-origin uten sti eller nøkkel.');
  const htmlPath = resolve(root, 'noark-assistent/index.html');
  const html = await readFile(htmlPath, 'utf8');
  const csp = `connect-src 'self' https://challenges.cloudflare.com ${origin};`;
  if (!html.includes('connect-src ')) throw new Error('Fant ikke CSP-regelen.');
  await writeFile(htmlPath, html.replace(/connect-src [^;]+;/, csp));
  await writeFile(resolve(root, 'noark-assistent/api-config.mjs'),
    `// Public backend origin. Never put an API key here.\nexport const API_CONFIG = Object.freeze({ origin: ${JSON.stringify(origin)} });\n`);
  console.log('Offentlig backendadresse og nøyaktig CSP-origin oppdatert. Commit bare index.html og api-config.mjs.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
