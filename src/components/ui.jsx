import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

export const cls = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant, size, className, loading, children, ...p }) {
  return <button className={cls('btn', variant, size, className)} disabled={p.disabled || loading} {...p}>{loading ? '…' : children}</button>;
}
export const Card = ({ title, action, children, className, flush }) => (
  <section className={cls('card', className)}>
    {(title || action) && <div className="card-h"><h3>{title}</h3>{action}</div>}
    <div className={flush ? '' : 'card-b'}>{children}</div>
  </section>
);
export const Stat = ({ value, label, sub, tone }) => (
  <div className={cls('card stat', tone && `tone-${tone}`)}><div className="v">{value ?? '—'}</div><div className="l">{label}</div>{sub && <div className="s">{sub}</div>}</div>
);
export const Badge = ({ tone, children }) => <span className={cls('badge', tone)}>{children}</span>;
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-h"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="row wrap">{actions}</div>}</div>
);
export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;
export const Empty = ({ icon = '📭', title, children }) => <div className="empty"><div className="big">{icon}</div><div className="bold">{title}</div>{children && <div className="small">{children}</div>}</div>;
export const ErrorBox = ({ error, retry }) => error ? <div className="alert" role="alert">{error.message || String(error)} {retry && <button className="btn sm" onClick={retry}>Retry</button>}</div> : null;

/** Render loading / error / content for a useApi result. */
export function Async({ state, children, empty }) {
  if (state.loading && !state.data) return <Spinner />;
  if (state.error) return <ErrorBox error={state.error} retry={state.reload} />;
  if (state.data == null) return null;
  if (empty && Array.isArray(state.data) && !state.data.length) return empty;
  return children(state.data);
}

/** Label + control. The label is tied to the control with htmlFor, so its accessible name is just the label text. */
export function Field({ label, hint, children, full }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children, { id: children.props.id || id, ...(hint ? { 'aria-describedby': `${id}-hint` } : {}) }) : children;
  return (
    <div className={cls('fw', full && 'full')}>
      <label className="f" htmlFor={isValidElement(children) ? children.props.id || id : undefined}>{label}</label>
      {control}
      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  );
}
export const Input = (p) => <input {...p} />;
export const Select = ({ options = [], placeholder, ...p }) => (
  <select {...p}>{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
);

export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs" role="tablist">{tabs.map((t) => { const [id, label] = Array.isArray(t) ? t : [t.id, t.label]; return <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>; })}</div>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cls('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3><button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);
  return <ToastCtx.Provider value={push}>{children}<div className="toasts" aria-live="polite">{items.map((t) => <div key={t.id} className={cls('toast', t.type === 'error' && 'error')}>{t.message}</div>)}</div></ToastCtx.Provider>;
}

/** Run an async action with toast feedback and a busy flag. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn, success) => {
    setBusy(true);
    try { const r = await fn(); if (success) toast(typeof success === 'function' ? success(r) : success); return r; }
    catch (e) { toast(e.message || 'Something went wrong', 'error'); return undefined; }
    finally { setBusy(false); }
  }, [toast]);
  return [run, busy];
}

export function ConfirmButton({ children, message, onConfirm, ...p }) {
  return <Button {...p} onClick={() => { if (window.confirm(message)) onConfirm(); }}>{children}</Button>;
}

export function DataTable({ columns, rows, onRowClick, empty = 'Nothing to show yet', rowKey = '_id' }) {
  if (!rows?.length) return <Empty title={empty} />;
  return (
    <div className="table-wrap"><table>
      <thead><tr>{columns.map((c, ci) => <th key={`${ci}-${c.label}`} className={c.right ? 'right' : ''}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={`${(typeof rowKey === 'function' ? rowKey(r) : r[rowKey]) ?? ''}:${i}`} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
          {columns.map((c, ci) => <td key={`${ci}-${c.label}`} className={c.right ? 'right' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
        </tr>))}</tbody>
    </table></div>
  );
}

/** Shows a one-time credential (temporary password) after creating/resetting an account. */
export function CredentialsModal({ creds, onClose, title = 'Account created' }) {
  if (!creds) return null;
  const text = `Login id: ${creds.loginId}\nTemporary password: ${creds.temporaryPassword}`;
  return (
    <Modal title={title} onClose={onClose} footer={<><Button onClick={() => navigator.clipboard?.writeText(text)}>Copy</Button><Button variant="primary" onClick={onClose}>Done</Button></>}>
      <div className="alert info">Share these details securely. The password is shown only once and must be changed at first sign-in.</div>
      <dl className="kv" style={{ marginTop: 14 }}><dt>Login id</dt><dd><b>{creds.loginId}</b></dd><dt>Temporary password</dt><dd><b>{creds.temporaryPassword}</b></dd></dl>
    </Modal>
  );
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  const t = useRef();
  useEffect(() => { clearTimeout(t.current); t.current = setTimeout(() => setV(value), ms); return () => clearTimeout(t.current); }, [value, ms]);
  return v;
}

// ── formatting ──
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const fmtDate = (s, withYear) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]}${withYear ? ` ${y}` : ''}`; };
export const fmtDateTime = (s) => (s ? new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const dayName = (n) => DAYS[n] || '';
export const fmtMoney = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
export const fmtPct = (v) => (v == null ? '—' : `${v}%`);
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const statusTone = (s) => ({ reversed: 'red', lost: 'red', damaged: 'amber', issued: 'blue', available: 'green', paid: 'green', open: 'amber',  present: 'green', approved: 'green', published: 'green', active: 'green', submitted: 'blue', under_review: 'blue', draft: 'amber', returned: 'red', absent: 'red', rejected: 'red', overdue: 'red', late: 'amber', pending: 'amber', leave: 'blue', due_soon: 'amber', scheduled: 'blue' }[s] || '');
export const label = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
