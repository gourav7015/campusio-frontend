import { cloneElement, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Loader2 } from 'lucide-react';
import { ErrorScreen, isConnectionProblem } from '../design/ErrorScreen';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, EmptyState, Skeleton, ToastProvider, useToast, useDialogs } from '../design/ui';

// Toasts, dialogs and empty states now come from the design system; the screens built earlier keep their imports.
export { ToastProvider, useToast };

export const cls = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant, size, className, loading, children, ...p }) {
  return <button className={cls('btn', variant, size, className)} disabled={p.disabled || loading} {...p}>{loading && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}</button>;
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
export const Spinner = () => <div className="space-y-3 p-5" role="status" aria-label="Loading"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>;
export const Empty = ({ title, children }) => <EmptyState icon={Inbox} title={title} description={children} />;
export const ErrorBox = ({ error, retry }) => error ? (isConnectionProblem(error) ? <ErrorScreen inline error={error} onRetry={retry} /> : <div className="alert" role="alert">{error.message || String(error)} {retry && <button className="btn sm" onClick={retry}>Retry</button>}</div>) : null;

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
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide={wide} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
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

export function ConfirmButton({ children, message, onConfirm, confirmLabel, ...p }) {
  const { confirm } = useDialogs();
  return <Button {...p} onClick={async () => { if (await confirm(message, { danger: p.variant === 'danger', confirmLabel, title: typeof children === 'string' ? children : undefined })) onConfirm(); }}>{children}</Button>;
}

/** Columns with a `key` (or a `sort` function) sort when their header is clicked. */
export function DataTable({ columns, rows, onRowClick, empty = 'Nothing to show yet', rowKey = '_id' }) {
  const [sort, setSort] = useState(null);
  const sorted = useMemo(() => {
    if (!sort || !rows) return rows;
    const col = columns[sort.ci];
    const val = (r) => (col.sort ? col.sort(r) : r[col.key]);
    const out = [...rows].sort((x, y) => {
      const a = val(x); const b = val(y);
      if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;
      return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, columns]);
  if (!rows?.length) return <Empty title={empty} />;
  const toggle = (ci) => setSort((s) => (s?.ci === ci ? (s.dir === 'asc' ? { ci, dir: 'desc' } : null) : { ci, dir: 'asc' }));
  return (
    <div className="table-wrap"><table>
      <thead><tr>{columns.map((c, ci) => {
        const sortable = !!(c.key || c.sort); const on = sort?.ci === ci;
        return (
          <th key={`${ci}-${c.label}`} className={c.right ? 'right' : ''} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {sortable ? (
              <button type="button" onClick={() => toggle(ci)} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Sort">
                {c.label}{on ? (sort.dir === 'asc' ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />) : <ArrowUpDown size={13} style={{ opacity: .35 }} aria-hidden />}
              </button>
            ) : c.label}
          </th>
        );
      })}</tr></thead>
      <tbody>{sorted.map((r, i) => (
        <tr key={`${(typeof rowKey === 'function' ? rowKey(r) : r[rowKey]) ?? ''}:${i}`} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
          {columns.map((c, ci) => <td key={`${ci}-${c.label}`} className={c.right ? 'right' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
        </tr>))}</tbody>
    </table></div>
  );
}

/** Shows a one-time credential (temporary password) after creating/resetting an account. */
export function CredentialsModal({ creds, onClose, title = 'Account created' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!creds) return null;
  const text = `Login id: ${creds.loginId}\nTemporary password: ${creds.temporaryPassword}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); toast('Copied to the clipboard'); setTimeout(() => setCopied(false), 2000); }
    catch { toast('Could not copy. Select the text and copy it by hand.', 'error'); }
  };
  return (
    <Modal title={title} onClose={onClose} footer={<><Button onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy'}</Button><Button variant="primary" onClick={onClose}>Done</Button></>}>
      <div className="alert info">Share these details securely. The password is shown only once. It is a starting password: the person chooses their own at first sign-in.</div>
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
