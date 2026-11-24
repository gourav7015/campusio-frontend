import ResetPasswordButton from '../../components/ResetPassword.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { get, post, put, patch, del, upload, openFile } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, PageHeader, Tabs, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import CredentialsCard from '../../components/CredentialsCard.jsx';
import FileImage from '../../components/FileImage.jsx';
import { SchoolInfoView } from '../shared/SchoolInfo.jsx';
import { useDialogs } from '../../design/ui';

const A = '/api/school';

// ───────────── approvals inbox ─────────────
export function Approvals() {
  const q = useApi(`${A}/approvals`);
  const dlg = useDialogs();
  const [run] = useAction();
  const decide = async (path, approve, what) => {
    let note;
    if (!approve) { note = await dlg.prompt(`Why is this ${what} being rejected? (the person is told)`, { title: 'Reason', required: true }); if (!note) return; }
    await run(() => post(path, { approve, note }), approve ? 'Approved' : 'Rejected'); q.reload();
  };
  const buttons = (path, what) => <div className="row"><Button size="sm" variant="primary" onClick={() => decide(path, true, what)}>Approve</Button><Button size="sm" variant="danger" onClick={() => decide(path, false, what)}>Reject</Button></div>;
  return (
    <div className="stack">
      <PageHeader title="Approvals" subtitle="Things waiting for your decision: expenses and vendors from Finance, period swaps and attendance on days the school is closed" />
      <Async state={q}>{(d) => (<>
        {!d.counts.expenses && !d.counts.vendors && !d.counts.swaps && !d.counts.exceptions && <Card><Empty title="Nothing is waiting for you">New requests appear here and in your notifications.</Empty></Card>}
        {d.counts.expenses > 0 && <Card title={`Expenses (${d.counts.expenses})`} flush><DataTable rows={d.expenses} columns={[
          { label: 'Date', render: (e) => fmtDate(e.date) }, { label: 'Expense', render: (e) => <><b>{e.title}</b> {e.nature === 'capital' && <Badge tone="blue">Capital</Badge>}<div className="small muted">{e.department}{e.work ? ` · ${e.work}` : ''}{e.vendor ? ` · ${e.vendor}` : ''}{e.billNo ? ` · bill ${e.billNo}` : ''}</div></> },
          { label: 'Bills', render: (e) => (e.attachments?.length ? <div className="stack" style={{ gap: 2 }}>{e.attachments.map((a) => <Button key={a.fileId} size="sm" onClick={() => run(async () => { await openFile(a.fileId); return true; })} aria-label={`View ${a.name}`}>{a.name.length > 22 ? `${a.name.slice(0, 20)}…` : a.name}</Button>)}</div> : <Badge tone="amber">No bill attached</Badge>) },
          { label: 'Amount', render: (e) => <b>{fmtMoney(e.amount)}</b> }, { label: 'Submitted by', key: 'submittedByName' }, { label: '', render: (e) => buttons(`${A}/approvals/expenses/${e._id}`, 'expense') }]} /></Card>}
        {d.counts.vendors > 0 && <Card title={`Vendors (${d.counts.vendors})`} action={<Button size="sm" variant="primary" onClick={async () => { if (await dlg.confirm(`Approve all ${d.counts.vendors} vendors waiting? They can then be chosen on expenses.`, { title: 'Approve all vendors' })) { await run(() => post(`${A}/approvals/vendors/decide`, { approve: true }), 'All approved'); q.reload(); } }}>Approve all</Button>} flush><DataTable rows={d.vendors} columns={[
          { label: 'Vendor', render: (v) => <><b>{v.name}</b> <span className="small muted">{v.code}</span><div className="small muted">{v.category || 'No category'}{v.contactPerson ? ` · ${v.contactPerson}` : ''}{v.phone ? ` · ${v.phone}` : ''}</div></> },
          { label: 'GSTIN / PAN', render: (v) => <><span className="small">{v.gstin || '—'}</span><div className="small muted">{v.pan || ''}</div></> },
          { label: 'Bank', render: (v) => (v.bankName || v.accountNo ? <>{v.bankName}<div className="small muted">{v.accountName ? `${v.accountName} · ` : ''}{v.accountNo || ''}{v.ifsc ? ` · ${v.ifsc}` : ''}</div></> : <span className="muted">—</span>) },
          { label: 'Submitted by', key: 'submittedByName' }, { label: '', render: (v) => buttons(`${A}/approvals/vendors/${v._id}`, 'vendor') }]} /></Card>}
        {d.counts.swaps > 0 && <Card title={`Period swaps agreed by both teachers (${d.counts.swaps})`} flush><DataTable rows={d.swaps} columns={[
          { label: 'Date', render: (s) => fmtDate(s.date, true) }, { label: 'Teachers', render: (s) => `${s.fromTeacher} → ${s.toTeacher}` },
          { label: 'Period', render: (s) => <>{s.fromPeriod?.period} · {s.fromPeriod?.section} · {s.fromPeriod?.subject}{s.toPeriod && <div className="small muted">in return: {s.toPeriod.period} · {s.toPeriod.section} · {s.toPeriod.subject}</div>}</> },
          { label: 'Reason', key: 'reason' }, { label: '', render: (s) => buttons(`${A}/approvals/swaps/${s._id}`, 'swap') }]} /></Card>}
        {d.counts.exceptions > 0 && <Card title={`Attendance on a closed day (${d.counts.exceptions})`} flush><DataTable rows={d.exceptions} columns={[
          { label: 'Date', render: (e) => fmtDate(e.date, true) }, { label: 'Class', key: 'section' }, { label: 'Asked by', key: 'requestedByName' }, { label: 'Reason', key: 'reason' }, { label: '', render: (e) => buttons(`${A}/approvals/attendance-exceptions/${e._id}`, 'request') }]} /></Card>}
      </>)}</Async>
      <p className="small muted">You can also allow attendance on a closed day yourself from <Link to="/admin/classes">Classes and sections</Link>, or add school days on <Link to="/admin/events">Calendar and events</Link>.</p>
    </div>
  );
}

// ───────────── sub-admins ─────────────
export function SubAdmins() {
  const list = useApi(`${A}/sub-admins`); const opts = useApi(`${A}/sub-admins/options`);
  const [modal, setModal] = useState(null); const [creds, setCreds] = useState(null); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Sub-admins" subtitle="Give someone a limited admin login: for example only teacher and staff attendance. You choose exactly what each one can open. Their login is created here, by you." actions={<Button variant="primary" onClick={() => setModal({})}>+ Add a sub-admin</Button>} />
      <Card flush><Async state={list} empty={<Empty title="No sub-admins yet">Add one to share the daily work without sharing everything.</Empty>}>{(rows) => <DataTable rows={rows} rowKey="id" columns={[
        { label: 'Name', render: (u) => <><b>{u.name}</b><div className="small muted">{u.loginId}{u.email && u.email !== u.loginId ? ` · ${u.email}` : ''}</div></> },
        { label: 'Can open', render: (u) => <div className="row wrap" style={{ gap: 4 }}>{u.permissions.map((p) => <Badge key={p}>{opts.data?.permissions.find((x) => x.key === p)?.label.split(',')[0] || p}</Badge>)}</div> },
        { label: 'Status', render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'}>{label(u.status)}</Badge> }, { label: 'Last sign-in', render: (u) => (u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : 'Never') },
        { label: '', render: (u) => <div className="row"><Button size="sm" onClick={() => setModal(u)}>Edit</Button>
          <ResetPasswordButton url={`${A}/sub-admins/${u.id}/reset-password`} name={u.name} onDone={setCreds} />
          <Button size="sm" onClick={async () => { await run(() => patch(`${A}/sub-admins/${u.id}`, { status: u.status === 'active' ? 'disabled' : 'active' }), 'Updated'); list.reload(); }}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button></div> }]} />}</Async></Card>
      {modal && opts.data && <SubAdminForm opts={opts.data} user={modal.id ? modal : null} onClose={() => setModal(null)} onDone={(c) => { list.reload(); if (c) setCreds(c); }} />}
      {creds && <CredentialsCard creds={creds} title={`Login for ${creds.name}`} onClose={() => setCreds(null)} />}
    </div>
  );
}

function SubAdminForm({ opts, user, onClose, onDone }) {
  const [name, setName] = useState(user?.name || ''); const [loginId, setLoginId] = useState(''); const [suggested, setSuggested] = useState(''); const [perms, setPerms] = useState(new Set(user?.permissions || []));
  const [run, busy] = useAction();
  useEffect(() => { if (!user) get(`${A}/sub-admins/login-preview`).then((r) => setSuggested(r.loginId)).catch(() => {}); }, [user]); // the login id the system would give, shown before anything is saved
  const toggle = (k) => setPerms((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const save = async () => {
    const body = { name, permissions: [...perms] };
    const r = await run(() => (user ? patch(`${A}/sub-admins/${user.id}`, body) : post(`${A}/sub-admins`, { ...body, loginId: loginId.trim() || undefined })), user ? 'Saved' : 'Sub-admin created');
    if (r) { onDone(user ? null : { ...r, name }); onClose(); }
  };
  return (
    <FormShell title={user ? `Edit ${user.name}` : 'Add a sub-admin'} onClose={onClose} onSave={save} busy={busy} disabled={!name.trim() || !perms.size}>
      <div className="form-grid"><Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>{!user && <Field label="Login ID" hint="Made for you; type your own if you prefer. It is what they sign in with, with the password shown after saving."><Input value={loginId} placeholder={suggested} autoComplete="off" onChange={(e) => setLoginId(e.target.value)} /></Field>}</div>
      <div className="stack-sm" style={{ marginTop: 12 }}>
        <b>Quick sets</b>
        <div className="row wrap">{Object.entries(opts.presets).map(([k, p]) => <Button key={k} size="sm" onClick={() => setPerms(new Set(p.permissions))}>{p.label}</Button>)}</div>
        <b style={{ marginTop: 8 }}>What this sub-admin may open</b>
        {opts.permissions.map((p) => <label key={p.key} className="row"><input type="checkbox" checked={perms.has(p.key)} onChange={() => toggle(p.key)} /> {p.label}</label>)}
        <p className="small muted">School settings, desk logins, the audit log and other sub-admins always stay with you. A change of permissions signs the sub-admin out so it takes effect at once.</p>
      </div>
    </FormShell>
  );
}

import { Modal } from '../../components/ui.jsx';
function FormShell({ title, onClose, onSave, busy, disabled, children }) {
  return <Modal wide title={title} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={disabled} onClick={onSave}>Save</Button></>}>{children}</Modal>;
}

// ───────────── the school's own page: text, gallery, licences ─────────────
export function SchoolInfoAdmin() {
  const [tab, setTab] = useState('view');
  return (
    <div className="stack">
      <PageHeader title="School information" subtitle="What students, parents and staff see about the school: its story, pictures, and the licences and approvals it holds" />
      <Tabs tabs={[['view', 'How it looks'], ['edit', 'Edit the page'], ['gallery', 'Gallery'], ['licenses', 'Licences and approvals']]} value={tab} onChange={setTab} />
      {tab === 'view' && <SchoolInfoView base={A} bare />}
      {tab === 'edit' && <EditProfile />}
      {tab === 'gallery' && <Gallery />}
      {tab === 'licenses' && <Licenses />}
    </div>
  );
}

const PROFILE_FIELDS = [['tagline', 'Tagline'], ['board', 'Board (CBSE, ICSE, State…)'], ['affiliationNo', 'Affiliation number'], ['established', 'Established (year)'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'], ['principalName', 'Principal']];
function EditProfile() {
  const q = useApi(`${A}/school-info`); const [run, busy] = useAction();
  const [v, setV] = useState(null);
  const d = q.data;
  const cur = v || (d && { ...Object.fromEntries([...PROFILE_FIELDS.map(([k]) => k), 'about', 'principalMessage'].map((k) => [k, d.profile[k] || ''])), sections: d.profile.sections.map((s) => ({ title: s.title, body: s.body || '' })) });
  const set = (k, val) => setV({ ...cur, [k]: val });
  if (!cur) return <Async state={q}>{() => null}</Async>;
  const sections = cur.sections;
  const setSec = (i, k, val) => set('sections', sections.map((s, j) => (j === i ? { ...s, [k]: val } : s)));
  return (
    <Card title="The page" action={<Button variant="primary" loading={busy} onClick={async () => { await run(() => put(`${A}/school-info`, { ...cur, sections: cur.sections.filter((s) => s.title.trim()) }), 'Saved'); setV(null); q.reload(); }}>Save</Button>}>
      <div className="form-grid">{PROFILE_FIELDS.map(([k, l]) => <Field key={k} label={l}><Input value={cur[k]} onChange={(e) => set(k, e.target.value)} /></Field>)}
        <Field label="About the school" full><textarea rows={4} value={cur.about} onChange={(e) => set('about', e.target.value)} /></Field>
        <Field label="Message from the principal" full><textarea rows={3} value={cur.principalMessage} onChange={(e) => set('principalMessage', e.target.value)} /></Field></div>
      <div className="stack-sm" style={{ marginTop: 14 }}><b>Extra sections</b><span className="small muted">Facilities, transport routes, rules, achievements: anything families should know.</span>
        {sections.map((s, i) => <div key={i} className="form-grid"><Field label="Title"><Input value={s.title} onChange={(e) => setSec(i, 'title', e.target.value)} /></Field><Field label="Text" full><textarea rows={2} value={s.body} onChange={(e) => setSec(i, 'body', e.target.value)} /></Field><Button size="sm" onClick={() => set('sections', sections.filter((_, j) => j !== i))}>Remove this section</Button></div>)}
        <div><Button size="sm" onClick={() => set('sections', [...sections, { title: '', body: '' }])}>+ Add a section</Button></div></div>
    </Card>
  );
}

function Gallery() {
  const q = useApi(`${A}/school-info`); const [run] = useAction(); const [caption, setCaption] = useState(''); const [busy, setBusy] = useState(false);
  const add = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true);
    try { const form = new FormData(); form.append('file', f); if (caption) form.append('caption', caption); await upload(`${A}/school-info/gallery`, form); setCaption(''); q.reload(); } catch (x) { window.alert(x.message); } finally { setBusy(false); }
  };
  return (
    <Card title="Gallery" action={<div className="row"><Input aria-label="Caption for the next picture" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} /><label className="btn primary" style={{ cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Uploading…' : '+ Add a picture'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={add} disabled={busy} /></label></div>}>
      <Async state={q}>{(d) => (d.profile.gallery.length ? <div className="grid g3">{d.profile.gallery.map((g) => (
        <figure key={g._id} style={{ margin: 0 }}><FileImage fileId={g.fileId} alt={g.caption || 'School picture'} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10 }} />
          <figcaption className="row between small" style={{ marginTop: 6 }}><span>{g.caption}</span><ConfirmButton size="sm" variant="danger" message="Remove this picture?" onConfirm={async () => { await run(() => del(`${A}/school-info/gallery/${g._id}`), 'Removed'); q.reload(); }}>Remove</ConfirmButton></figcaption></figure>))}</div> : <Empty title="No pictures yet">Pictures of the building, events and facilities show on the school page.</Empty>)}</Async>
    </Card>
  );
}

const AUTH = { state: 'State government', central: 'Central government', local: 'Local body', other: 'Other' };
function Licenses() {
  const q = useApi(`${A}/licenses`); const [modal, setModal] = useState(null); const [run] = useAction();
  const fields = [{ name: 'name', label: 'Licence or approval', required: true, full: true, placeholder: 'e.g. State recognition, CBSE affiliation, Fire safety NOC' }, { name: 'authority', label: 'Issued by (level)', type: 'select', options: Object.entries(AUTH).map(([value, l]) => ({ value, label: l })), default: 'state', required: true },
    { name: 'issuedBy', label: 'Issuing office' }, { name: 'number', label: 'Number' }, { name: 'issuedOn', label: 'Issued on', type: 'date' }, { name: 'validUntil', label: 'Valid until', type: 'date', hint: 'Leave empty if it does not expire' }, { name: 'notes', label: 'Notes', full: true }];
  const uploadFile = async (l, e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const form = new FormData(); form.append('file', f); await run(() => upload(`${A}/licenses/${l._id}/file`, form), 'Copy attached'); q.reload(); };
  return (
    <Card title="Licences and approvals" action={<Button variant="primary" onClick={() => setModal({})}>+ Add</Button>} flush>
      <Async state={q} empty={<Empty title="No licences added">Add the mandatory licences and approvals from the state and central government.</Empty>}>{(rows) => <DataTable rows={rows} columns={[
        { label: 'Licence', render: (l) => <><b>{l.name}</b><div className="small muted">{AUTH[l.authority]}{l.issuedBy ? ` · ${l.issuedBy}` : ''}{l.number ? ` · No. ${l.number}` : ''}</div></> },
        { label: 'Valid until', render: (l) => (l.validUntil ? fmtDate(l.validUntil, true) : 'No expiry') },
        { label: 'Copy', render: (l) => (l.fileId ? <Badge tone="green">attached</Badge> : <label className="btn sm" style={{ cursor: 'pointer' }}>Attach<input type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={(e) => uploadFile(l, e)} /></label>) },
        { label: '', render: (l) => <div className="row"><Button size="sm" onClick={() => setModal(l)}>Edit</Button><ConfirmButton size="sm" variant="danger" message={`Delete ${l.name}?`} onConfirm={async () => { await run(() => del(`${A}/licenses/${l._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async>
      {modal && <FormModal wide title={modal._id ? 'Edit licence' : 'Add a licence'} fields={fields} initial={modal} onClose={() => setModal(null)} onSubmit={async (v) => { if (modal._id) await patch(`${A}/licenses/${modal._id}`, v); else await post(`${A}/licenses`, v); q.reload(); return true; }} />}
    </Card>
  );
}
