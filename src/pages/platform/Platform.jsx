import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { post, put, patch } from '../../api/client.js';
import { FilterBar, ListCard } from '../../design/ui';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  Async, Badge, Button, Card, CredentialsModal, DataTable, Field, Input, Modal, PageHeader, Select, Stat, useAction, fmtDateTime, statusTone, label, ConfirmButton,
} from '../../components/ui.jsx';

export { default as PlatformDashboard } from './PlatformDashboard';

function NewSchool({ onClose, onDone }) {
  const f = useForm({ name: '', code: '', board: '', address: '', phone: '', plan: 'starter', status: 'trial', expiresOn: '', adminName: '', adminEmail: '' });
  const [run, busy] = useAction();
  const v = f.values;
  const submit = async () => {
    const out = await run(() => post('/api/platform/schools', {
      name: v.name, code: v.code, board: v.board || undefined, address: v.address || undefined, phone: v.phone || undefined,
      subscription: { plan: v.plan, status: v.status, expiresOn: v.expiresOn || undefined },
      admin: { name: v.adminName, email: v.adminEmail },
    }), 'School created');
    if (out) onDone(out);
  };
  return (
    <Modal title="Register a new school" onClose={onClose} wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} disabled={!v.name || !v.code || !v.adminName || !v.adminEmail}>Create school</Button></>}>
      <div className="form-grid">
        <Field label="School name"><Input {...f.bind('name')} /></Field><Field label="School code" hint="Short unique code, e.g. dps"><Input {...f.bind('code')} /></Field>
        <Field label="Board"><Input {...f.bind('board')} placeholder="CBSE / State" /></Field><Field label="Phone"><Input {...f.bind('phone')} /></Field>
        <Field label="Address" full><Input {...f.bind('address')} /></Field>
        <Field label="Plan"><Input {...f.bind('plan')} /></Field><Field label="Subscription status"><Select {...f.bind('status')} options={['trial', 'active']} /></Field>
        
        <Field label="Subscription ends on" hint="Leave blank for no end date"><Input type="date" {...f.bind('expiresOn')} /></Field><div />
        <div className="full"><h3>School administrator</h3><p className="muted small">The school admin signs in with this email and creates all other users for the school.</p></div>
        <Field label="Admin name"><Input {...f.bind('adminName')} /></Field><Field label="Admin email (login id)"><Input type="email" {...f.bind('adminEmail')} /></Field>
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
      <PageHeader title="Schools" subtitle="Create schools, their administrators and subscriptions" actions={<Button variant="primary" onClick={() => setShow(true)}>+ New school</Button>} />
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
    <Async state={s}>{(school) => (
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
                <Button size="sm" onClick={async () => { const r = await run(() => post(`/api/platform/users/${a._id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button>
                <Button size="sm" onClick={async () => { await run(() => patch(`/api/platform/users/${a._id}`, { status: a.status === 'active' ? 'disabled' : 'active' }), 'Updated'); s.reload(); }}>{a.status === 'active' ? 'Disable' : 'Enable'}</Button></div> },
            ]} />
          </Card>
        </div>
        {addAdmin && <Modal title="Add school administrator" onClose={() => setAddAdmin(false)} footer={<><Button onClick={() => setAddAdmin(false)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!adm.values.name || !adm.values.email} onClick={async () => {
          const r = await run(() => post(`/api/platform/schools/${id}/admins`, adm.values), 'Admin created'); if (r) { setAddAdmin(false); adm.reset(); s.reload(); setCreds(r); } }}>Create</Button></>}>
          <div className="stack"><Field label="Name"><Input {...adm.bind('name')} /></Field><Field label="Email (login id)"><Input type="email" {...adm.bind('email')} /></Field></div></Modal>}
        <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
      </div>)}</Async>
  );
}

export function PlatformAudit() {
  const [action, setAction] = useState('');
  const rows = useApi('/api/platform/audit', { action, limit: 200 });
  return (
    <div className="stack">
      <PageHeader title="Platform audit log" subtitle="Sensitive actions across all schools, including Super Admin actions inside schools" />
      <Card flush>
        <div className="card-b"><Input placeholder="Filter by action prefix, e.g. school. or student." value={action} onChange={(e) => setAction(e.target.value)} /></div>
        <Async state={rows} empty={<div className="empty">No entries</div>}>{(r) => <DataTable rows={r} columns={[
          { label: 'When', render: (x) => fmtDateTime(x.createdAt) }, { label: 'Actor', render: (x) => <>{x.actorName} <span className="muted small">({x.actorRole})</span> {x.actingAsSuperAdmin && <Badge tone="amber">acting</Badge>}</> },
          { label: 'Action', key: 'action' }, { label: 'Summary', key: 'summary' },
        ]} />}</Async>
      </Card>
    </div>
  );
}
