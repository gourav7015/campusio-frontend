import ResetPasswordButton from '../../components/ResetPassword.jsx';
import AuditLog from '../../components/AuditLog.jsx';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { post, put, patch, del } from '../../api/client.js';
import { FilterBar, ListCard } from '../../design/ui';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  Async, Badge, Button, Card, CredentialsModal, DataTable, Field, Input, Modal, PageHeader, Select, Stat, useAction, fmtDateTime, statusTone, label, ConfirmButton,
} from '../../components/ui.jsx';

export { default as PlatformDashboard } from './PlatformDashboard';

function NewSchool({ onClose, onDone }) {
  const f = useForm({ name: '', code: '', board: '', address: '', phone: '', plan: 'starter', status: 'trial', expiresOn: '', adminName: '', adminEmail: '', adminPhone: '', adminDob: '' });
  const [run, busy] = useAction();
  const v = f.values;
  const submit = async () => {
    const out = await run(() => post('/api/platform/schools', {
      name: v.name, code: v.code, board: v.board || undefined, address: v.address || undefined, phone: v.phone || undefined,
      subscription: { plan: v.plan, status: v.status, expiresOn: v.expiresOn || undefined },
      admin: { name: v.adminName, email: v.adminEmail, phone: v.adminPhone, dob: v.adminDob },
    }), 'School created');
    if (out) onDone(out);
  };
  return (
    <Modal title="Register a new school" onClose={onClose} wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} disabled={!v.name || !v.code || !v.adminName || !v.adminEmail || v.adminPhone.replace(/\D/g, '').length < 10 || !v.adminDob}>Create school</Button></>}>
      <div className="form-grid">
        <Field label="School name"><Input {...f.bind('name')} /></Field><Field label="School code" hint="Short unique code, e.g. dps"><Input {...f.bind('code')} /></Field>
        <Field label="Board"><Input {...f.bind('board')} placeholder="CBSE / State" /></Field><Field label="Phone"><Input {...f.bind('phone')} /></Field>
        <Field label="Address" full><Input {...f.bind('address')} /></Field>
        <Field label="Plan"><Input {...f.bind('plan')} /></Field><Field label="Subscription status"><Select {...f.bind('status')} options={['trial', 'active']} /></Field>
        
        <Field label="Subscription ends on" hint="Leave blank for no end date"><Input type="date" {...f.bind('expiresOn')} /></Field><div />
        <div className="full"><h3>School administrator</h3><p className="muted small">The school admin signs in with this email and creates all other users for the school.</p></div>
        <Field label="Admin name"><Input {...f.bind('adminName')} /></Field><Field label="Admin email" hint="Sign-in codes and password resets go here"><Input type="email" {...f.bind('adminEmail')} /></Field><Field label="Admin mobile number"><Input type="tel" {...f.bind('adminPhone')} /></Field><Field label="Admin date of birth" hint="Asked when a forgotten password is reset"><Input type="date" {...f.bind('adminDob')} /></Field>
      </div>
    </Modal>
  );
}

export function Schools() {
  const [q, setQ] = useState('');
  const schools = useApi('/api/platform/schools', { q });
  const [show, setShow] = useState(false);
  const [creds, setCreds] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="Schools" subtitle="Create schools, their administrators and subscriptions" actions={<Button variant="primary" onClick={() => setShow(true)}>+ Add school</Button>} />
      <ListCard>
        <FilterBar search={q} onSearch={setQ} searchLabel="Search schools" placeholder="Search by name or code" />
        <Async state={schools} empty={<div className="empty">No schools found</div>}>{(rows) => (
          <DataTable rows={rows} columns={[
            { label: 'School', render: (s) => <Link to={`/platform/schools/${s._id}`}><b>{s.name}</b></Link> }, { label: 'Code', key: 'code' },
            { label: 'Admin', render: (s) => s.admins.map((a) => a.loginId).join(', ') || '—' },
            { label: 'Students', render: (s) => s.studentCount.toLocaleString('en-IN') }, { label: 'Teachers', render: (s) => s.teacherCount.toLocaleString('en-IN') },
            { label: 'Subscription', render: (s) => <Badge tone={statusTone(s.subscription?.status)}>{s.subscription?.status}</Badge> }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge> },
          ]} />)}</Async>
      </ListCard>
      {show && <NewSchool onClose={() => setShow(false)} onDone={(o) => { setShow(false); schools.reload(); if (o.admin) setCreds({ loginId: o.admin.loginId, temporaryPassword: o.admin.temporaryPassword }); }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="School administrator created" />
    </div>
  );
}

export function SchoolDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { setActing } = useAuth();
  const s = useApi(`/api/platform/schools/${id}`);
  const [run, busy] = useAction();
  const [creds, setCreds] = useState(null);
  const [addAdmin, setAddAdmin] = useState(false);
  const sub = useForm({});
  const adm = useForm({ name: '', email: '' });

  const enter = (school) => { setActing({ id: school._id, name: school.name }); nav('/admin'); };
  return (
    <Async skeleton="profile" state={s}>{(school) => (
      <div className="stack">
        <PageHeader title={school.name} subtitle={`Code: ${school.code} · ${school.board || 'Board not set'}`} actions={<>
          <Button variant="primary" onClick={() => enter(school)}>Open school (act as admin)</Button>
          {school.status === 'active'
            ? <ConfirmButton variant="danger" message="Suspend this school? All its users are signed out." onConfirm={async () => { await run(() => patch(`/api/platform/schools/${id}`, { status: 'suspended' }), 'School suspended'); s.reload(); }}>Suspend</ConfirmButton>
            : <Button onClick={async () => { await run(() => patch(`/api/platform/schools/${id}`, { status: 'active' }), 'School reactivated'); s.reload(); }}>Reactivate</Button>}</>} />
        <div className="grid g4"><Stat value={school.studentCount} label="Active students" /><Stat value={school.teacherCount} label="Active teachers" /><Stat value={school.admins.length} label="School admins" /><Stat value={label(school.status)} label="School status" tone={school.status === 'active' ? 'green' : 'red'} /></div>
        <div className="grid g2">
          <Card title="Subscription">
            <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); const v = sub.values; await run(() => put(`/api/platform/schools/${id}/subscription`, {
              plan: v.plan ?? school.subscription?.plan, status: v.status ?? school.subscription?.status, expiresOn: (v.expiresOn ?? school.subscription?.expiresOn) || undefined,
            }), 'Subscription updated'); s.reload(); }}>
              <Field label="Plan"><Input value={sub.values.plan ?? school.subscription?.plan ?? ''} onChange={(e) => sub.set('plan', e.target.value)} /></Field>
              <Field label="Status"><Select value={sub.values.status ?? school.subscription?.status ?? 'trial'} onChange={(e) => sub.set('status', e.target.value)} options={['trial', 'active', 'expired', 'cancelled']} /></Field>
              <Field label="Ends on"><Input type="date" value={sub.values.expiresOn ?? school.subscription?.expiresOn ?? ''} onChange={(e) => sub.set('expiresOn', e.target.value)} /></Field>
              <div style={{ alignSelf: 'end' }}><Button variant="primary" type="submit" loading={busy}>Save subscription</Button></div>
            </form>
          </Card>
          <Card title="School administrators" action={<Button size="sm" onClick={() => setAddAdmin(true)}>+ Add admin</Button>} flush>
            <DataTable rows={school.admins} columns={[
              { label: 'Name', key: 'name' }, { label: 'Login id', key: 'loginId' }, { label: 'Last sign-in', render: (a) => fmtDateTime(a.lastLoginAt) },
              { label: 'Status', render: (a) => <Badge tone={statusTone(a.status)}>{a.status}</Badge> },
              { label: '', render: (a) => <div className="row">
                <ResetPasswordButton url={`/api/platform/users/${a._id}/reset-password`} name={a.name} onDone={setCreds} />
                {a.twoFactor && <ConfirmButton size="sm" message={`Switch off sign-in codes for ${a.name}? Use this when they can no longer receive them. They are signed out everywhere.`} onConfirm={async () => { await run(() => post(`/api/platform/users/${a._id}/reset-2fa`), 'Two-factor sign-in reset'); s.reload(); }}>Reset two-factor</ConfirmButton>}
                <Button size="sm" onClick={async () => { await run(() => patch(`/api/platform/users/${a._id}`, { status: a.status === 'active' ? 'disabled' : 'active' }), 'Updated'); s.reload(); }}>{a.status === 'active' ? 'Disable' : 'Enable'}</Button></div> },
            ]} />
          </Card>
        </div>
        <FeatureSwitches schoolId={id} />
        {addAdmin && <Modal title="Add school administrator" onClose={() => setAddAdmin(false)} footer={<><Button onClick={() => setAddAdmin(false)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!adm.values.name || !adm.values.email || String(adm.values.phone || '').replace(/\D/g, '').length < 10 || !adm.values.dob} onClick={async () => {
          const r = await run(() => post(`/api/platform/schools/${id}/admins`, adm.values), 'Admin created'); if (r) { setAddAdmin(false); adm.reset(); s.reload(); setCreds(r); } }}>Create</Button></>}>
          <div className="stack"><Field label="Name"><Input {...adm.bind('name')} /></Field><Field label="Email" hint="Sign-in codes and password resets go here"><Input type="email" {...adm.bind('email')} /></Field><Field label="Mobile number"><Input type="tel" {...adm.bind('phone')} /></Field><Field label="Date of birth" hint="Asked when a forgotten password is reset"><Input type="date" {...adm.bind('dob')} /></Field></div></Modal>}
        <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
      </div>)}</Async>
  );
}

export function PlatformAudit() {
  return (
    <div className="stack">
      <PageHeader title="Platform audit log" subtitle="Sensitive actions across all schools, including Super Admin actions inside schools. It opens on today." />
      <AuditLog base="/api/platform" />
    </div>
  );
}

/** Features the Platform Admin can turn on or off for one school without a new release. "Default" follows what everyone gets. */
function FeatureSwitches({ schoolId }) {
  const q = useApi(`/api/platform/schools/${schoolId}/flags`);
  const [run] = useAction();
  return (
    <Card title="Feature switches" action={<span className="muted small">For this school only</span>}>
      <Async state={q}>{(rows) => (
        <div className="stack">
          {rows.map((f) => (
            <div key={f.name} className="row" style={{ justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div><b>{f.label}</b> {f.overridden && <Badge tone="amber">Changed</Badge>}<div className="small muted">{f.description}. Everyone else: {f.default ? 'on' : 'off'}.</div></div>
              <div className="row" style={{ gap: 8 }}>
                <Select aria-label={f.label} value={f.overridden ? String(f.value) : 'default'} onChange={async (e) => { const v = e.target.value; await run(() => put(`/api/platform/schools/${schoolId}/flags`, { [f.name]: v === 'default' ? null : v === 'true' }), 'Saved'); q.reload(); }}
                  options={[{ value: 'default', label: `Default (${f.default ? 'on' : 'off'})` }, { value: 'true', label: 'On' }, { value: 'false', label: 'Off' }]} />
              </div>
            </div>))}
        </div>)}</Async>
    </Card>
  );
}

/** Crashes and server errors of the last 30 days, so a problem is seen before a school phones about it. */
export function PlatformErrors() {
  const [source, setSource] = useState('');
  const q = useApi('/api/platform/errors', { source: source || undefined, limit: 100 });
  const [run, busy] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Errors" subtitle="Server errors and screens that crashed in someone's browser. Kept for 30 days."
        actions={<><Select aria-label="Where" value={source} onChange={(e) => setSource(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'server', label: 'Server' }, { value: 'client', label: 'Browser' }]} />
          <ConfirmButton variant="danger" loading={busy} message="Clear the whole error list?" onConfirm={async () => { await run(() => del('/api/platform/errors'), 'Cleared'); q.reload(); }}>Clear all</ConfirmButton></>} />
      <Async state={q}>{(d) => (
        <>
          <div className="grid g2"><Stat value={d.last24h.server} label="Server errors, last 24 hours" tone={d.last24h.server ? 'red' : 'green'} /><Stat value={d.last24h.client} label="Browser crashes, last 24 hours" tone={d.last24h.client ? 'amber' : 'green'} /></div>
          <Card title="Latest" flush><DataTable rows={d.rows} rowKey="_id" empty="No errors recorded" columns={[
            { label: 'When', render: (e) => fmtDateTime(e.at) }, { label: 'Where', render: (e) => <Badge tone={e.source === 'server' ? 'red' : 'amber'}>{e.source === 'server' ? 'Server' : 'Browser'}</Badge> },
            { label: 'What', render: (e) => <><b>{e.message}</b><div className="small muted">{[e.method, e.path].filter(Boolean).join(' ')}{e.requestId ? ` · request ${e.requestId}` : ''}</div></> },
          ]} /></Card>
        </>)}</Async>
    </div>
  );
}
