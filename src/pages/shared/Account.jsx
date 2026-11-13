import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { post, del } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { Button, Card, Field, Input, PageHeader, useAction, Async, fmtDateTime, Badge } from '../../components/ui.jsx';
import { homeFor } from '../Login.jsx';

export default function Account() {
  const { user, markPasswordChanged } = useAuth();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [run, busy] = useAction();
  const sessions = useApi('/api/auth/sessions');
  const forced = user.mustChangePassword;
  const mismatch = f.confirm && f.newPassword !== f.confirm;
  const save = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    const ok = await run(() => post('/api/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword }), 'Password changed');
    if (ok) { markPasswordChanged(); setF({ currentPassword: '', newPassword: '', confirm: '' }); sessions.reload(); if (sp.get('force')) nav(homeFor(user.role), { replace: true }); }
  };
  return (
    <div className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Password & sessions" subtitle={forced ? 'You must set a new password before continuing.' : 'Keep your account secure'} />
      <Card title="Change password">
        <form className="stack" onSubmit={save}>
          <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></Field>
          <Field label="New password" hint="At least 8 characters with a letter and a number"><Input type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={8} /></Field>
          <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
          {mismatch && <div className="alert">Passwords do not match</div>}
          <div><Button variant="primary" type="submit" loading={busy}>Update password</Button></div>
        </form>
      </Card>
      {!forced && (
        <Card title="Signed-in devices" action={<Button size="sm" onClick={async () => { await run(() => post('/api/auth/sessions/revoke-others'), (r) => `${r.revoked} other session(s) signed out`); sessions.reload(); }}>Sign out other devices</Button>}>
          <Async state={sessions}>{(rows) => (
            <ul className="timeline">{rows.map((s) => (
              <li key={s.id}><div className="grow"><div className="bold">{(s.userAgent || 'Unknown device').slice(0, 70)} {s.current && <Badge tone="green">This device</Badge>}</div><div className="small muted">Last active {fmtDateTime(s.lastSeenAt)} · {s.ip}</div></div>
                {!s.current && <Button size="sm" onClick={async () => { await run(() => del(`/api/auth/sessions/${s.id}`), 'Signed out'); sessions.reload(); }}>Sign out</Button>}</li>))}</ul>
          )}</Async>
        </Card>
      )}
    </div>
  );
}
