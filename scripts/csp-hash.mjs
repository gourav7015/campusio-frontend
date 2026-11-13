// Prints the CSP hash of the inline theme script in dist/index.html (run after `npm run build`).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
for (const s of inline) console.log(`'sha256-${createHash('sha256').update(s).digest('base64')}'`);
if (!inline.length) console.log('no inline script found');
