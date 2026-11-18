import { useEffect, useState } from 'react';
import { post } from '../api/client.js';

const BASE = import.meta.env.VITE_API_URL || '';
const cache = new Map(); // short-lived signed links, so a picture is not re-requested on every render

/** A picture stored as a private file: asks for a signed link, then shows it. Falls back to `fallback` (initials, an icon) while loading or when there is none. */
export default function FileImage({ fileId, alt, className, style, fallback = null }) {
  const [got, setGot] = useState({ id: null, url: null });
  useEffect(() => {
    if (!fileId) return undefined;
    let live = true;
    const hit = cache.get(fileId);
    const link = hit && hit.exp > Date.now() ? Promise.resolve(hit.url)
      : post(`/api/shared/files/${fileId}/link`).then(({ url }) => { const full = `${BASE}${url}`; cache.set(fileId, { url: full, exp: Date.now() + 4 * 60 * 1000 }); return full; });
    link.then((url) => { if (live) setGot({ id: fileId, url }); }).catch(() => {});
    return () => { live = false; };
  }, [fileId]);
  const src = got.id === fileId ? got.url : null;
  if (!fileId || !src) return fallback;
  return <img src={src} alt={alt || ''} className={className} style={style} />;
}

/** A round photo with initials when there is no picture yet. */
export function Avatar({ fileId, name, size = 64 }) {
  const initials = String(name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const box = { width: size, height: size, borderRadius: '50%', flex: 'none' };
  return <FileImage fileId={fileId} alt={name && size > 56 ? `Photo of ${name}` : ''} style={{ ...box, objectFit: 'cover' }} fallback={<span aria-hidden style={{ ...box, display: 'grid', placeItems: 'center', background: 'rgb(var(--c-primary-soft))', color: 'rgb(var(--c-primary-ink))', fontWeight: 600, fontSize: size / 3 }}>{initials}</span>} />;
}

/** A button that uploads a picture to `path` (multipart field "file") and calls onDone. */
export function PhotoUpload({ path, onDone, label = 'Change photo', upload }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setErr('Choose a picture (JPG, PNG or WebP).'); return; }
    if (f.size > 5 * 1024 * 1024) { setErr('That picture is over 5 MB. Choose a smaller one.'); return; }
    setBusy(true); setErr('');
    try { const form = new FormData(); form.append('file', f); await upload(path, form); onDone?.(); } catch (x) { setErr(x.message || 'Could not upload'); } finally { setBusy(false); }
  };
  return <span><label className="btn sm" style={{ cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Uploading…' : label}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} disabled={busy} /></label>{err && <span className="small" role="alert" style={{ color: 'var(--danger-ink, #b3261e)', marginLeft: 8 }}>{err}</span>}</span>;
}
