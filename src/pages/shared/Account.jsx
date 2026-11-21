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
    const ok = await run(() => post('/api/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword }), 'Password changed');
    if (ok) { markPasswordChanged(); setF({ currentPassword: '', newPassword: '', confirm: '' }); sessions.reload(); if (sp.get('force')) nav(homeFor(user.role), { replace: true }); }
  };
  return (
    <div className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Password & sessions" subtitle={forced ? 'You must set a new password before continuing.' : 'Keep your account secure'} />
      <Card title="Change password">
        <form className="stack" method="post" onSubmit={save}>
          {/* tells the browser which account this password belongs to, so it can offer to update the saved one */}
          <input type="text" name="username" autoComplete="username" value={user.loginId || ''} readOnly tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
          <Field label="Current password"><PasswordInput name="current-password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></Field>
          <Field label="New password" hint="At least 10 characters with a letter and a number; not a common password"><PasswordInput name="new-password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={8} /></Field>
          <Field label="Confirm new password"><PasswordInput name="confirm-password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
          {mismatch && <div className="alert">Passwords do not match</div>}
          <div><Button variant="primary" type="submit" loading={busy}>Update password</Button></div>
        </form>
      </Card>
      {!forced && <TwoFactor user={user} onChange={refresh} />}
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

/** Two-factor sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…). */
function TwoFactor({ user, onChange }) {
  const [run, busy] = useAction();
  const [step, setStep] = useState('idle'); // idle → password → scan → codes ; or off / newcodes
  const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null); const [codes, setCodes] = useState(null);
  const reset = () => { setStep('idle'); setPw(''); setCode(''); setSetup(null); };
  const privileged = user.role === 'school_admin' || user.role === 'super_admin';
  const showCodes = (c) => { setCodes(c); setStep('codes'); };
  return (
    <Card title="Two-factor sign-in" action={user.twoFactor ? <Badge tone="green">On</Badge> : <Badge tone={privileged ? 'amber' : 'grey'}>Off</Badge>}>
      {step === 'codes' && codes && (
        <div className="stack">
          <div className="alert info" role="status">Keep these recovery codes somewhere safe, away from your phone. Each works once if you lose the phone. They are shown only now.</div>
          <ul style={{ columns: 2, listStyle: 'none', padding: 0, margin: 0, fontFamily: 'ui-monospace, monospace' }}>{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="row" style={{ gap: 8 }}>
            <Button size="sm" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>Copy</Button>
            <Button size="sm" variant="primary" onClick={() => { setCodes(null); reset(); onChange(); }}>I have saved them</Button>
          </div>
        </div>
      )}
      {step !== 'codes' && !user.twoFactor && (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{privileged ? 'Recommended for administrators: ' : ''}after your password, sign-in also asks for a 6-digit code from an app on your phone, so a stolen password alone is not enough.</p>
          {step === 'idle' && <div><Button variant="primary" onClick={() => setStep('password')}>Turn on</Button></div>}
          {step === 'password' && (
            <form className="stack" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => post('/api/auth/2fa/setup', { password: pw })); if (r) { setSetup(r); setStep('scan'); } }}>
              <Field label="Your password" hint="We ask again before changing how you sign in"><PasswordInput autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
              <div className="row" style={{ gap: 8 }}><Button variant="primary" type="submit" loading={busy}>Continue</Button><Button type="button" onClick={reset}>Cancel</Button></div>
            </form>
          )}
          {step === 'scan' && setup && (
            <form className="stack" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => post('/api/auth/2fa/enable', { code }), 'Two-factor sign-in is on'); if (r) showCodes(r.recoveryCodes); }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li>
                <li>Scan this picture with it, or type the key by hand.</li>
                <li>Type the 6-digit code the app shows.</li>
              </ol>
              <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <img alt="QR code to scan with your authenticator app" width={180} height={180} src={`data:image/svg+xml;base64,${btoa(setup.qrSvg)}`} style={{ background: '#fff', borderRadius: 8 }} />
                <div><div className="small muted">Key for typing by hand</div><code style={{ fontSize: 15, wordBreak: 'break-all' }}>{setup.secret.match(/.{1,4}/g).join(' ')}</code></div>
              </div>
              <Field label="6-digit code"><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
              <div className="row" style={{ gap: 8 }}><Button variant="primary" type="submit" loading={busy}>Turn on</Button><Button type="button" onClick={reset}>Cancel</Button></div>
            </form>
          )}
        </div>
      )}
      {step !== 'codes' && user.twoFactor && (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>Sign-in asks for a code from your authenticator app. If you lose your phone, use a recovery code, or ask your School Admin (or AtKaksha) to reset it.</p>
          {(step === 'idle') && <div className="row" style={{ gap: 8 }}><Button onClick={() => setStep('newcodes')}>New recovery codes</Button><Button variant="danger" onClick={() => setStep('off')}>Turn off</Button></div>}
          {(step === 'off' || step === 'newcodes') && (
            <form className="stack" onSubmit={async (e) => {
              e.preventDefault();
              if (step === 'off') { const r = await run(() => post('/api/auth/2fa/disable', { password: pw, code }), 'Two-factor sign-in is off'); if (r) { reset(); onChange(); } } else { const r = await run(() => post('/api/auth/2fa/recovery-codes', { password: pw, code })); if (r) showCodes(r.recoveryCodes); }
            }}>
              <Field label="Your password"><PasswordInput autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
              <Field label="Code from your app (or a recovery code)"><Input autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
              <div className="row" style={{ gap: 8 }}><Button variant={step === 'off' ? 'danger' : 'primary'} type="submit" loading={busy}>{step === 'off' ? 'Turn off' : 'Make new codes'}</Button><Button type="button" onClick={reset}>Cancel</Button></div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
