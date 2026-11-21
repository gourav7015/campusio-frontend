// After `vite build`: writes dist/_headers, which Cloudflare (Workers assets / Pages) serves as response headers for every page.
// The Content-Security-Policy allows exactly what the app loads: its own files, the inline theme script (by hash), the API origin, and Razorpay's checkout.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);

// The API address is fixed at build time (VITE_API_URL). If it is not set the API is on the same origin, so 'self' is enough.
let api = '';
try { if (process.env.VITE_API_URL) api = new URL(process.env.VITE_API_URL).origin; } catch { console.warn('VITE_API_URL is not a valid address; the policy will only allow the site itself'); }

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')} https://checkout.razorpay.com`.replace(/\s+/g, ' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${api} https://api.razorpay.com https://lumberjack.razorpay.com`.replace(/\s+/g, ' '),
  'frame-src https://api.razorpay.com https://checkout.razorpay.com',
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

const security = [
  `Content-Security-Policy: ${csp}`,
  'X-Frame-Options: DENY',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
  'Strict-Transport-Security: max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy: same-origin-allow-popups', // the payment window and PDF previews open in other tabs
];
const out = `/*\n${security.map((l) => `  ${l}`).join('\n')}\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/index.html\n  Cache-Control: no-cache\n`;
writeFileSync(new URL('_headers', dist), out);
console.log(`dist/_headers written (${hashes.length} inline script hash${hashes.length === 1 ? '' : 'es'}, API ${api || 'same origin'})`);
