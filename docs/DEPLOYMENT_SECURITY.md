# Deploying the frontend safely

The frontend is a static site (`npm run build` → `dist/`). The browser-side protections below are **response headers sent by whatever serves it** (nginx, Netlify, Cloudflare, S3+CloudFront). They are not applied by `npm run dev`, and **they have not been tested against a real deployment yet**: the values below were checked only against the built `index.html` (hash) and the code.

## Automatic on Cloudflare (since 1.0.0)

`npm run build` now writes `dist/_headers` (see `scripts/make-headers.mjs`). Cloudflare's static-asset hosting sends those headers for every page, so the site gets its Content-Security-Policy, frame protection (`X-Frame-Options: DENY` and `frame-ancestors 'none'`), HSTS, `nosniff`, a referrer policy and a permissions policy without any dashboard setting. The policy allows the site itself, the inline theme script (by hash, recomputed on every build), the API address (taken from `VITE_API_URL` at build time; if it is empty the API is assumed to be on the same address), and Razorpay's checkout for online payments.

**Check it before and after a deploy:** `npm run build`, then `PORT=5190 API_PROXY=http://localhost:4010 npm run serve:dist` serves the built site with those headers (and forwards `/api` to a demo API), and the browser tests run against it. After a deploy, open the site in a browser with the console open: a blocked resource appears as "Refused to ..." there. Make sure the build on Cloudflare has `VITE_API_URL` set to the real API address, otherwise the browser will refuse to talk to it.

## Required headers (for any other host)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-HHtuq5rGa7/HOoxq/bxvLW3D2tqc0vLdoxZZZHM4sFo='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' <API_ORIGIN>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Cross-Origin-Opener-Policy: same-origin
```

* `<API_ORIGIN>` is the real address of the API (for example `https://api.yourdomain.example`): **fill it in**; it is deliberately not guessed.
* The `sha256-…` value is the hash of the small inline script in `index.html` that applies the saved light/dark theme before first paint. **Recompute it after any change to that script**: `node scripts/csp-hash.mjs` (run after `npm run build`).
* `style-src 'unsafe-inline'` is needed because React components and Recharts set inline `style` attributes. It does not allow inline scripts.
* `geolocation=(self)` is for the staff check-in location fence. Remove it if the school does not use that feature.

## Other settings

* Serve everything over HTTPS only; redirect HTTP to HTTPS.
* Single-page-app fallback: unknown paths return `index.html` with status 200 (the app shows its own 404 page).
* Cache `assets/*` for a long time (file names are content-hashed); never cache `index.html` for long.
* Enable gzip or brotli.
* `public/robots.txt` allows only `/`, `/privacy`, `/terms`, `/cookies`, `/refunds`. Signed-in pages also send `<meta name="robots" content="noindex, nofollow">`. For belt and braces, send `X-Robots-Tag: noindex` for every path except those five.
* No source maps are built (checked: `dist/` contains none). Keep it that way.
* The API must list this site's exact address in `CORS_ORIGIN` (the server refuses to start in production with localhost or `*`).

## nginx example

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-HHtuq5rGa7/HOoxq/bxvLW3D2tqc0vLdoxZZZHM4sFo='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://API_ORIGIN_HERE; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=()" always;
location / { try_files $uri /index.html; }
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

## Business details

Copy `.env.example` to `.env.local` and fill in the company name, address, support email and phone, and grievance officer. Until then the policy pages and footer show highlighted placeholders instead of invented details. These values are public (they end up in the bundle): never put a secret in a `VITE_` variable.
