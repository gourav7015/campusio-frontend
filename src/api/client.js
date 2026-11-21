const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'erp.token';
const ACTING_KEY = 'erp.acting';

const safe = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
// "Keep me signed in": the sign-in token then lives in localStorage (it survives closing the browser; the server still ends the session after its own time).
// Without it the token stays in sessionStorage and goes when the tab is closed, as before.
const kept = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
let keepSignedIn = false;

export const session = {
  get token() { return safe.get(TOKEN_KEY) ?? kept.get(TOKEN_KEY); },
  set token(v) { safe.set(TOKEN_KEY, null); kept.set(TOKEN_KEY, null); if (v != null) (keepSignedIn ? kept : safe).set(TOKEN_KEY, v); },
  /** Set before storing a new token: true keeps it after the browser is closed. */
  set keep(v) { keepSignedIn = !!v; },
  get acting() { try { return JSON.parse(safe.get(ACTING_KEY) || 'null'); } catch { return null; } },
  set acting(v) { safe.set(ACTING_KEY, v ? JSON.stringify(v) : null); },
  /** Swap the token for a renewed one in the same place it was kept (browser session or "keep me signed in"). */
  replaceToken(v) { if (kept.get(TOKEN_KEY) != null) kept.set(TOKEN_KEY, v); else safe.set(TOKEN_KEY, v); },
  onUnauthorized: () => {},
};

export class ApiError extends Error {
  constructor(message, status, code, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

function qs(query) {
  if (!query) return '';
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

function headers(extra = {}) {
  const h = { ...extra };
  if (session.token) h.Authorization = `Bearer ${session.token}`;
  if (session.acting?.id) h['X-Acting-School'] = session.acting.id;
  return h;
}

async function parseError(res) {
  let body = {};
  let json = true;
  try { body = await res.json(); } catch { json = false; }
  // A gateway/proxy error with no JSON body means the API process itself is unreachable.
  if (!json && [500, 502, 503, 504].includes(res.status)) {
    return new ApiError('Cannot reach the server. Please check that the API is running and try again.', res.status, 'UNREACHABLE');
  }
  if (res.status === 401 && session.token) session.onUnauthorized();
  const detail = Array.isArray(body.details) && body.details[0]?.message ? ` (${body.details.map((d) => (d.path ? `${d.path}: ` : '') + d.message).join('; ')})` : '';
  return new ApiError((body.error || `Request failed (${res.status})`) + (body.code === 'VALIDATION' ? detail : ''), res.status, body.code, body.details);
}

const UNREACHABLE = 'Cannot reach the server. Check your internet connection and try again.';
/** fetch, but a dropped connection becomes the same friendly error as a dead gateway, so every screen can show one error page for it. */
async function send(url, init) {
  try { return await fetch(url, init); } catch { throw new ApiError(UNREACHABLE, 0, 'UNREACHABLE'); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newKey = () => (globalThis.crypto?.randomUUID?.() || `k${Date.now()}${Math.random().toString(36).slice(2)}`);

/** Seconds left on the sign-in token, or null when it cannot be read. */
function secondsLeft(token) {
  try { const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp - Date.now() / 1000; } catch { return null; }
}
let renewing = null; let lastRenew = 0;
/** While someone is working, a token with under three hours left is swapped for a fresh one (the server caps how long a session can last in total). */
async function renewIfNeeded(path) {
  const t = session.token;
  if (!t || path.startsWith('/api/auth/') || renewing || Date.now() - lastRenew < 10 * 60 * 1000) return;
  const left = secondsLeft(t);
  if (left == null || left > 3 * 3600 || left <= 0) return;
  lastRenew = Date.now();
  renewing = send(`${BASE}/api/auth/refresh`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: '{}' })
    .then(async (r) => { if (r.ok) { const j = await r.json(); if (j.token && session.token === t) session.replaceToken(j.token); } })
    .catch(() => {}).finally(() => { renewing = null; });
  await renewing;
}

/**
 * Every call is retried twice on a dropped connection (not on a server answer). A POST carries an Idempotency-Key that stays the same across
 * those tries, so a request that did reach the server the first time is never done twice.
 */
export async function api(path, { method = 'GET', body, query, form } = {}) {
  const isForm = form instanceof FormData;
  await renewIfNeeded(path);
  const extra = isForm || body === undefined ? {} : { 'Content-Type': 'application/json' };
  if (method === 'POST' && !isForm) extra['Idempotency-Key'] = newKey();
  const init = { method, headers: headers(extra), body: isForm ? form : body === undefined ? undefined : JSON.stringify(body) };
  const retryable = !isForm; // a file upload cannot be replayed safely
  let res;
  for (let attempt = 0; ; attempt++) {
    try { res = await send(`${BASE}${path}${qs(query)}`, init); break; } catch (e) {
      if (!retryable || attempt >= 2) throw e;
      await sleep(attempt === 0 ? 400 : 1200);
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return null;
  return res.json();
}
export const get = (p, query) => api(p, { query });
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} });
export const put = (p, body) => api(p, { method: 'PUT', body });
export const patch = (p, body) => api(p, { method: 'PATCH', body });
export const del = (p) => api(p, { method: 'DELETE' });
export const upload = (p, form, method = 'POST') => api(p, { method, form });

/** Authenticated download (CSV / PDF): fetch as a blob, then save. */
export async function download(path, filename, query) {
  const res = await send(`${BASE}${path}${qs(query)}`, { headers: headers() });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Open an authenticated PDF in a new tab (a preview), or save it when the browser blocks the new tab. */
export async function openPdf(path, filename = 'document.pdf') {
  const tab = window.open('', '_blank');
  try {
    const res = await send(`${BASE}${path}`, { headers: headers() });
    if (!res.ok) throw await parseError(res);
    const url = URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url; else { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { tab?.close(); throw e; }
}

/** Files are never public: ask for a short-lived signed link, then open it. */
export async function openFile(fileId, linkPath) {
  const { url } = await post(linkPath || `/api/shared/files/${fileId}/link`); // linkPath: a page that checks access its own way (a help desk ticket)
  window.open(`${BASE}${url}`, '_blank', 'noopener');
}
