import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { post, del } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { Button, Card, Field, Input, PageHeader, useAction, Async, fmtDateTime, Badge } from '../../components/ui.jsx';
import { homeFor } from '../Login.jsx';
import { PasswordInput } from '../../design/ui';

export default function Account() {
  const { user, markPasswordChanged, refresh } = useAuth();
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
    const ok = await run(() => post('/api/auth/change-password', { ...(forced ? {} : { currentPassword: f.currentPassword }), newPassword: f.newPassword }), 'Password changed');
    if (ok) { markPasswordChanged(); setF({ currentPassword: '', newPassword: '', confirm: '' }); sessions.reload(); if (sp.get('force')) nav(homeFor(user.role), { replace: true }); }
  };
  return (
    <div className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Password and sessions" subtitle={forced ? 'You signed in with a temporary password. Choose your own to continue.' : 'Keep your account secure'} />
      <Card title="Change password">
        <form className="stack" method="post" onSubmit={save}>
          {/* tells the browser which account this password belongs to, so it can offer to update the saved one */}
          <input type="text" name="username" autoComplete="username" value={user.loginId || ''} readOnly tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
          {!forced && <Field label="Current password"><PasswordInput name="current-password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></Field>}
          <Field label="New password" hint="At least 10 characters with a letter and a number; not a common password"><PasswordInput name="new-password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={8} /></Field>
          <Field label="Confirm new password"><PasswordInput name="confirm-password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
          {mismatch && <div className="alert">Passwords do not match</div>}
          <div><Button variant="primary" type="submit" loading={busy}>Update password</Button></div>
        </form>
      </Card>
      {!forced && <SignInCodes user={user} onChange={refresh} />}
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

/** Two-factor sign-in: after the password, a 6-digit code is emailed to the registered address. Switched on or off with the password and a code. */
function SignInCodes({ user, onChange }) {
  const opts = useApi('/api/auth/options');
  const [run, busy] = useAction();
  const [flow, setFlow] = useState(null); // { purpose: 'enable' | 'disable', step: 'password' | 'code', sentTo }
  const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const on = !!user.twoFactor;
  const available = !!opts.data?.emailCodes;
  const close = () => { setFlow(null); setPw(''); setCode(''); };
  const send = async (e) => {
    e.preventDefault();
    const r = await run(() => post(flow.purpose === 'enable' ? '/api/auth/2fa/start' : '/api/auth/2fa/disable-start', { password: pw }));
    if (r) setFlow({ ...flow, step: 'code', sentTo: r.sentTo });
  };
  const confirm = async (e) => {
    e.preventDefault();
    const r = await run(() => post('/api/auth/2fa/confirm', { code }), flow.purpose === 'enable' ? 'Sign-in codes are on' : 'Sign-in codes are off');
    if (r) { close(); onChange(); }
  };
  return (
    <Card title="Sign-in code by email" action={on ? <Badge tone="green">On</Badge> : <Badge tone="grey">Off</Badge>}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>After your password, we email a 6-digit code to your registered email address{user.registeredEmail ? ` (${user.registeredEmail})` : ''}. Type it to finish signing in, so a stolen password alone is not enough.</p>
        {!flow && (on
          ? <div><Button onClick={() => setFlow({ purpose: 'disable', step: 'password' })}>Turn off</Button></div>
          : <div><Button variant="primary" disabled={!available || !user.registeredEmail} onClick={() => setFlow({ purpose: 'enable', step: 'password' })}>Turn on</Button></div>)}
        {!flow && !on && !user.registeredEmail && <p className="small muted" style={{ margin: 0 }}>There is no email address on file for this account. Ask your school office to add one.</p>}
        {!flow && !on && user.registeredEmail && !available && !opts.loading && <p className="small muted" style={{ margin: 0 }}>Sign-in codes are not switched on for this site yet.</p>}
        {flow?.step === 'password' && (
          <form className="stack" onSubmit={send}>
            <Field label="Your password" hint="We ask again before changing how you sign in"><PasswordInput autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
            <div className="row" style={{ gap: 8 }}><Button variant="primary" type="submit" loading={busy}>Send code</Button><Button type="button" onClick={close}>Cancel</Button></div>
          </form>
        )}
        {flow?.step === 'code' && (
          <form className="stack" onSubmit={confirm}>
            <div className="alert info" role="status">We emailed a 6-digit code to {flow.sentTo}. It works for 5 minutes.</div>
            <Field label="6-digit code"><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
            <div className="row" style={{ gap: 8 }}><Button variant="primary" type="submit" loading={busy}>{flow.purpose === 'enable' ? 'Turn on' : 'Turn off'}</Button><Button type="button" onClick={close}>Cancel</Button></div>
          </form>
        )}
      </div>
    </Card>
  );
}
