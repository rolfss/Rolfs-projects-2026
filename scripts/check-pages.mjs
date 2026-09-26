import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Check the assembled Pages artifact, including Vite's generated asset URLs.
// Use an arbitrary repository prefix so hard-coded deployment paths fail here.
const root = path.resolve(process.argv[2] || '_site');
const base = new URL('https://pages-check.invalid/renamed-repository/');
const failures = [];
let checked = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const relative = path.relative(root, file).split(path.sep).join('/');
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      const target = new URL(match[1].replaceAll('&amp;', '&'), new URL(relative, base));
      if (target.origin !== base.origin) continue;
      checked++;
      if (!target.pathname.startsWith(base.pathname)) {
        failures.push(`${relative}: URL escapes the repository: ${match[1]}`);
        continue;
      }
      const local = path.join(root, decodeURIComponent(target.pathname.slice(base.pathname.length)));
      try {
        const info = await stat(local);
        if (info.isDirectory()) await stat(path.join(local, 'index.html'));
      } catch {
        failures.push(`${relative}: missing local target: ${match[1]}`);
      }
    }
  }
}

await visit(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Pages check passed: ${checked} local page and asset references work under a renamed repository.`);
}
