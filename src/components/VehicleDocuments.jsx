import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { del, upload, openFile } from '../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, Input, Modal, useAction, fmtDate } from './ui.jsx';

const STATE = { valid: ['green', 'Valid'], expiring: ['amber', 'Runs out soon'], expired: ['red', 'Expired'], missing: ['', 'Not recorded'] };
const OK_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/** A bus's papers: registration (RC), insurance, pollution (PUC), fitness, route permit, road tax and anything else, each with its number, dates and a copy. */
export default function VehicleDocuments({ base, busId, readOnly, onChange }) {
  const q = useApi(`${base}/buses/${busId}/documents`);
  const [edit, setEdit] = useState(null); // a row (or { type: 'other' } for a new extra document)
  const [run] = useAction();
  const done = () => { setEdit(null); q.reload(); onChange?.(); };
  return (
    <Card title="Vehicle documents" action={!readOnly && <Button size="sm" onClick={() => setEdit({ type: 'other', label: 'Other document', id: null })}>+ Other document</Button>} flush>
      <Async state={q}>{(d) => (
        <DataTable rows={d.documents} rowKey={(r) => r.id || r.type} empty="No documents" columns={[
          { label: 'Document', render: (r) => <b>{r.label}</b> },
          { label: 'Number', render: (r) => r.number || <span className="muted">—</span> },
          { label: 'Valid until', render: (r) => (r.expiresOn ? <>{fmtDate(r.expiresOn, true)}{r.state === 'expiring' && <span className="small muted"> · {r.daysLeft} day{r.daysLeft === 1 ? '' : 's'} left</span>}</> : <span className="muted">{r.state === 'missing' ? '—' : 'No expiry'}</span>) },
          { label: 'Status', render: (r) => { const [tone, text] = STATE[r.state] || STATE.missing; return <Badge tone={tone}>{text}</Badge>; } },
          { label: 'Copy', render: (r) => (r.fileId ? <Button size="sm" onClick={() => run(async () => { await openFile(r.fileId); return true; })} aria-label={`View the copy of ${r.label}`}>View</Button> : <span className="muted">—</span>) },
          ...(readOnly ? [] : [{ label: '', render: (r) => (
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" onClick={() => setEdit(r)}>{r.id ? 'Renew / edit' : 'Add'}</Button>
              {r.id && <ConfirmButton size="sm" variant="danger" message={`Remove ${r.label}? Its copy is deleted too.`} onConfirm={async () => { await run(() => del(`${base}/buses/${busId}/documents/${r.id}`), 'Removed'); done(); }}>Remove</ConfirmButton>}
            </div>) }]),
        ]} />
      )}</Async>
      {edit && <DocumentForm base={base} busId={busId} row={edit} required={q.data?.types?.[edit.type]?.expiry === 'required'} onClose={() => setEdit(null)} onDone={done} />}
    </Card>
  );
}

function DocumentForm({ base, busId, row, required, onClose, onDone }) {
  const isOther = row.type === 'other';
  const [v, setV] = useState({ title: isOther && row.id ? row.label : '', number: row.number || '', issuedOn: row.issuedOn || '', expiresOn: row.expiresOn || '', notes: row.notes || '' });
  const [file, setFile] = useState(null); const [err, setErr] = useState('');
  const [run, busy] = useAction();
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  const submit = async () => {
    setErr('');
    if (file && !OK_TYPES.includes(file.type)) { setErr('Upload a PDF, PNG or JPG.'); return; }
    if (file && file.size > 10 * 1024 * 1024) { setErr('That file is over 10 MB.'); return; }
    if (required && !v.expiresOn) { setErr('Enter the date it is valid until.'); return; }
    if (isOther && !v.title.trim()) { setErr('Give the document a name.'); return; }
    const form = new FormData();
    for (const [k, x] of Object.entries(v)) if (x !== '' && !(k === 'title' && !isOther)) form.append(k, x);
    if (file) form.append('file', file);
    const path = isOther && !row.id ? `${base}/buses/${busId}/documents` : `${base}/buses/${busId}/documents/${isOther ? 'other' : row.type}`;
    const ok = await run(() => upload(path, form, isOther && !row.id ? 'POST' : 'PUT'), 'Saved');
    if (ok) onDone();
  };
  return (
    <Modal title={row.id ? `Update ${row.label}` : `Add ${isOther ? 'a document' : row.label}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Save</Button></>}>
      <div className="stack">
        {isOther && !row.id && <Field label="Name of the document" hint="For example Speed governor certificate"><Input value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={60} /></Field>}
        <Field label="Number"><Input value={v.number} onChange={(e) => set('number', e.target.value)} maxLength={40} placeholder="Policy, certificate or permit number" /></Field>
        <div className="grid g2">
          <Field label="Issued on"><Input type="date" value={v.issuedOn} onChange={(e) => set('issuedOn', e.target.value)} /></Field>
          <Field label={`Valid until${required ? ' (required)' : ' (leave empty if it does not expire)'}`}><Input type="date" value={v.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} /></Field>
        </div>
        <Field label="Notes"><Input value={v.notes} onChange={(e) => set('notes', e.target.value)} maxLength={300} /></Field>
        <Field label={row.fileId ? 'Replace the copy' : 'Copy of the document'} hint="PDF, PNG or JPG, up to 10 MB. A new copy replaces the old one."><Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => { setFile(e.target.files[0] || null); setErr(''); }} /></Field>
        {err && <div className="alert danger" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}
