const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'erp.token';
const ACTING_KEY = 'erp.acting';

const safe = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

export const session = {
  get token() { return safe.get(TOKEN_KEY); },
  set token(v) { safe.set(TOKEN_KEY, v); },
  get acting() { try { return JSON.parse(safe.get(ACTING_KEY) || 'null'); } catch { return null; } },
  set acting(v) { safe.set(ACTING_KEY, v ? JSON.stringify(v) : null); },
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

export async function api(path, { method = 'GET', body, query, form } = {}) {
  const isForm = form instanceof FormData;
  const res = await fetch(`${BASE}${path}${qs(query)}`, {
    method,
    headers: headers(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
    body: isForm ? form : body === undefined ? undefined : JSON.stringify(body),
  });
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
  const res = await fetch(`${BASE}${path}${qs(query)}`, { headers: headers() });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Files are never public: ask for a short-lived signed link, then open it. */
export async function openFile(fileId) {
  const { url } = await post(`/api/shared/files/${fileId}/link`);
  window.open(`${BASE}${url}`, '_blank', 'noopener');
}
