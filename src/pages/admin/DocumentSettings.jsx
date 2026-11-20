import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { put, upload, del, openPdf } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, Field, Input, Modal, PageHeader, Select, useAction } from '../../components/ui.jsx';
import FileImage from '../../components/FileImage.jsx';

const BASE = '/api/school/document-settings';
const COLOUR_NAME = { '#1e3a8a': 'Navy', '#0f766e': 'Teal', '#9f1239': 'Maroon', '#7c2d12': 'Brown' };
const CHECKER = { background: '#f8fafc', backgroundImage: 'repeating-conic-gradient(#eef2f7 0% 25%, #f8fafc 0% 50%)', backgroundSize: '16px 16px' };
const none = (v) => v || '';

/** The school's printed documents: letterhead, and which uploaded stamp and signature goes on the fee receipt and the payslip. */
export default function DocumentSettings() {
  const q = useApi(BASE);
  const [edit, setEdit] = useState(null); // unsaved changes over the saved settings
  const [adding, setAdding] = useState(false);
  const [run, busy] = useAction();
  return (
    <Async state={q}>{(d) => {
      const s = edit || d.settings;
      const set = (patch) => setEdit({ ...s, ...patch });
      const setIn = (group, patch) => setEdit({ ...s, [group]: { ...s[group], ...patch } });
      const sigs = d.assets.filter((a) => a.kind === 'signature'); const stamps = d.assets.filter((a) => a.kind === 'stamp');
      const sigOptions = [{ value: '', label: 'No signature' }, ...sigs.map((a) => ({ value: a.id, label: a.name }))];
      const stampOptions = [{ value: '', label: 'No stamp' }, ...stamps.map((a) => ({ value: a.id, label: a.name }))];
      const save = async () => {
        const body = { schoolName: s.schoolName, addressLine: s.addressLine, affiliationNo: s.affiliationNo, contactLine: s.contactLine, color: s.color,
          receipt: { signatureId: none(s.receipt.signatureId), stampId: none(s.receipt.stampId), caption: s.receipt.caption, note: s.receipt.note },
          payslip: { leftSignatureId: none(s.payslip.leftSignatureId), rightSignatureId: none(s.payslip.rightSignatureId), stampId: none(s.payslip.stampId), leftCaption: s.payslip.leftCaption, rightCaption: s.payslip.rightCaption, note: s.payslip.note } };
        const r = await run(() => put(BASE, body), 'Saved');
        if (r) { setEdit(null); q.reload(); }
        return !!r;
      };
      const preview = async (which) => { if (edit && !(await save())) return; await run(() => openPdf(`${BASE}/sample/${which}`, `sample-${which}.pdf`)); };
      const after = () => q.reload();
      return (
        <div className="stack">
          <PageHeader title="Documents and signatures" subtitle="Set up your school once. Every fee receipt and payslip uses your logo, address, stamp and signature automatically."
            actions={<Button variant="primary" loading={busy} disabled={!edit} onClick={save}>Save changes</Button>} />

          <Card title="School letterhead" action={<span className="muted small">Printed at the top of every document</span>}>
            <div className="row" style={{ gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 200, display: 'grid', gap: 10 }}>
                <b className="small">School logo</b>
                <div style={{ ...CHECKER, height: 140, borderRadius: 12, border: '1px solid rgb(var(--c-border))', display: 'grid', placeItems: 'center' }}>
                  <FileImage fileId={d.settings.logoFileId} alt="School logo" style={{ maxWidth: 120, maxHeight: 110, objectFit: 'contain' }} fallback={<span className="muted small" style={{ textAlign: 'center', padding: 8 }}>No logo yet. Documents show the first letter of your school's name.</span>} />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <PickFile label={d.settings.logoFileId ? 'Replace' : 'Upload logo'} onFile={async (f) => { const form = new FormData(); form.append('file', f); await run(() => upload(`${BASE}/logo`, form), 'Logo saved'); after(); }} />
                  {d.settings.logoFileId && <ConfirmButton size="sm" variant="danger" message="Remove the logo from receipts and payslips?" onConfirm={async () => { await run(() => del(`${BASE}/logo`), 'Logo removed'); after(); }}>Remove</ConfirmButton>}
                </div>
                <span className="muted small">PNG or JPG, square, at least 300 px, up to 1 MB.</span>
              </div>
              <div className="grid g2" style={{ flex: 1, minWidth: 300 }}>
                <Field label="School name" full><Input value={s.schoolName} placeholder={d.fallback.schoolName} onChange={(e) => set({ schoolName: e.target.value })} /></Field>
                <Field label="Address line" full><Input value={s.addressLine} placeholder={d.fallback.addressLine} onChange={(e) => set({ addressLine: e.target.value })} /></Field>
                <Field label="Affiliation or registration no."><Input value={s.affiliationNo} placeholder={d.fallback.affiliationNo} onChange={(e) => set({ affiliationNo: e.target.value })} /></Field>
                <Field label="Phone and email on documents"><Input value={s.contactLine} placeholder={d.fallback.contactLine} onChange={(e) => set({ contactLine: e.target.value })} /></Field>
                <div className="full" style={{ gridColumn: '1 / -1' }}>
                  <b className="small">Document colour</b>
                  <div className="row" role="radiogroup" aria-label="Document colour" style={{ gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {d.colors.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={s.color === c} aria-label={COLOUR_NAME[c] || c} title={COLOUR_NAME[c] || c} onClick={() => set({ color: c })}
                        style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: '3px solid #fff', cursor: 'pointer', boxShadow: s.color === c ? '0 0 0 2px #0f172a' : '0 0 0 1px #cbd5e1' }} />
                    ))}
                    <span className="muted small">Used for the school name, rules and totals. Dark colours print best.</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="muted small" style={{ marginBottom: 0 }}>Leave a field empty to use what is on the School information page.</p>
          </Card>

          <Card title="Stamps and signatures" action={<Button variant="primary" onClick={() => setAdding(true)}>Upload stamp or signature</Button>}>
            {!d.assets.length ? <p className="muted" style={{ margin: 0 }}>Nothing uploaded yet. Upload your school seal and the signatures of the principal and accounts officer, then choose below which one goes on which document. Until then documents print without them.</p> : (
              <div className="grid g3">
                {d.assets.map((a) => (
                  <div key={a.id} style={{ border: '1px solid rgb(var(--c-border))', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ ...CHECKER, height: 120, display: 'grid', placeItems: 'center' }}><FileImage fileId={a.fileId} alt={a.name} style={{ maxWidth: '80%', maxHeight: 100, objectFit: 'contain' }} /></div>
                    <div style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}><b>{a.name}</b><Badge tone={a.kind === 'stamp' ? 'blue' : 'amber'}>{a.kind === 'stamp' ? 'Stamp' : 'Signature'}</Badge></div>
                      <span className="muted small">{a.usedOn.length ? `Used on: ${a.usedOn.join(', ')}` : 'Not used on any document yet'}</span>
                      <div className="row" style={{ gap: 8 }}>
                        <PickFile label="Replace" onFile={async (f) => { const form = new FormData(); form.append('file', f); await run(() => upload(`${BASE}/assets/${a.id}`, form, 'PUT'), 'Image replaced'); after(); }} />
                        <ConfirmButton size="sm" variant="danger" message={`Remove "${a.name}"?${a.usedOn.length ? ` It will come off ${a.usedOn.join(' and ')}.` : ''}`} onConfirm={async () => { await run(() => del(`${BASE}/assets/${a.id}`), 'Removed'); setEdit(null); after(); }}>Remove</ConfirmButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="muted small" style={{ marginBottom: 0 }}>PNG or JPG, up to 1 MB. A PNG with a transparent background looks best. Sign on white paper and take a clear photo if you have no scanner. You can keep up to 12.</p>
          </Card>

          <div className="grid g2" style={{ alignItems: 'start' }}>
            <Card title="Fee receipt" action={<Button size="sm" onClick={() => preview('receipt')}>Preview sample</Button>}>
              <div className="stack">
                <Field label="Signature"><Select value={none(s.receipt.signatureId)} options={sigOptions} onChange={(e) => setIn('receipt', { signatureId: e.target.value })} /></Field>
                <Field label="Title printed under the signature" hint="Write it as role · title, for example Received by · Accounts Officer"><Input value={s.receipt.caption} onChange={(e) => setIn('receipt', { caption: e.target.value })} /></Field>
                <Field label="Stamp"><Select value={none(s.receipt.stampId)} options={stampOptions} onChange={(e) => setIn('receipt', { stampId: e.target.value })} /></Field>
                <label className="row" style={{ gap: 8, alignItems: 'center' }}><input type="checkbox" checked={s.receipt.note} onChange={(e) => setIn('receipt', { note: e.target.checked })} /> Show the "computer-generated" note at the bottom</label>
              </div>
            </Card>
            <Card title="Payslip" action={<Button size="sm" onClick={() => preview('payslip')}>Preview sample</Button>}>
              <div className="stack">
                <div className="grid g2">
                  <Field label="Prepared by (left)"><Select value={none(s.payslip.leftSignatureId)} options={sigOptions} onChange={(e) => setIn('payslip', { leftSignatureId: e.target.value })} /></Field>
                  <Field label="Authorised signatory (right)"><Select value={none(s.payslip.rightSignatureId)} options={sigOptions} onChange={(e) => setIn('payslip', { rightSignatureId: e.target.value })} /></Field>
                  <Field label="Title under the left signature"><Input value={s.payslip.leftCaption} onChange={(e) => setIn('payslip', { leftCaption: e.target.value })} /></Field>
                  <Field label="Title under the right signature"><Input value={s.payslip.rightCaption} onChange={(e) => setIn('payslip', { rightCaption: e.target.value })} /></Field>
                </div>
                <Field label="Stamp"><Select value={none(s.payslip.stampId)} options={stampOptions} onChange={(e) => setIn('payslip', { stampId: e.target.value })} /></Field>
                <label className="row" style={{ gap: 8, alignItems: 'center' }}><input type="checkbox" checked={s.payslip.note} onChange={(e) => setIn('payslip', { note: e.target.checked })} /> Show the "computer-generated" note at the bottom</label>
              </div>
            </Card>
          </div>
          <p className="muted small">Changes apply to every receipt and payslip you print or download from now on, including ones made earlier, because each is drawn fresh when it is opened. Every change is recorded in the audit log.</p>
          {adding && <AddImage onClose={() => setAdding(false)} onDone={() => { setAdding(false); after(); }} />}
        </div>
      );
    }}</Async>
  );
}

/** A button that opens the file picker and hands the chosen PNG or JPG back, checking its type and size first. */
function PickFile({ label, onFile }) {
  const [err, setErr] = useState('');
  return (
    <>
      <label className="btn sm" style={{ cursor: 'pointer' }}>{label}
        <input type="file" accept="image/png,image/jpeg" hidden onChange={async (e) => {
          const f = e.target.files[0]; e.target.value = ''; if (!f) return;
          if (!['image/png', 'image/jpeg'].includes(f.type)) { setErr('Use a PNG or JPG image.'); return; }
          if (f.size > 1024 * 1024) { setErr('That image is over 1 MB.'); return; }
          setErr(''); await onFile(f);
        }} />
      </label>
      {err && <span className="small" style={{ color: 'rgb(var(--c-danger, 185 28 28))' }} role="alert">{err}</span>}
    </>
  );
}

function AddImage({ onClose, onDone }) {
  const [kind, setKind] = useState('signature'); const [name, setName] = useState(''); const [file, setFile] = useState(null); const [err, setErr] = useState('');
  const [run, busy] = useAction();
  const submit = async () => {
    if (!file) { setErr('Choose an image'); return; }
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setErr('Use a PNG or JPG image.'); return; }
    if (file.size > 1024 * 1024) { setErr('That image is over 1 MB.'); return; }
    const form = new FormData(); form.append('kind', kind); form.append('name', name.trim()); form.append('file', file);
    const r = await run(() => upload(`${BASE}/assets`, form), 'Uploaded');
    if (r) onDone();
  };
  return (
    <Modal title="Upload stamp or signature" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={name.trim().length < 2 || !file} onClick={submit}>Upload</Button></>}>
      <div className="stack">
        <Field label="What is it?"><Select value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: 'signature', label: 'A signature' }, { value: 'stamp', label: 'A stamp or seal' }]} /></Field>
        <Field label="Name" hint="Shown in the lists below, for example Principal signature or School seal"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
        <Field label="Image" hint="PNG or JPG, up to 1 MB"><Input type="file" accept="image/png,image/jpeg" onChange={(e) => { setFile(e.target.files[0] || null); setErr(''); }} /></Field>
        {err && <div className="alert danger" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}
