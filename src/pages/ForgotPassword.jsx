import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { usePageTitle } from '../design/lib/page';
import { Button, Callout, Input, PasswordInput } from '../design/ui';

/**
 * A forgotten password, in three steps: login id and date of birth; the 6-digit code emailed to the registered address; a new password.
 * The first step always answers the same, so it cannot be used to find out who has an account or when someone was born.
 */
export default function ForgotPassword() {
  usePageTitle('Reset your password');
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ loginId: '', dob: '', code: '', pw: '', confirm: '' });
  const [token, setToken] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  const set = (k) => (e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v })); };
  const mismatch = f.confirm && f.pw !== f.confirm;
  const label = 'mb-2 block text-[14px] font-medium text-foreground';
  const go = async (fn) => { setState({ busy: true, error: '' }); try { await fn(); setState({ busy: false, error: '' }); } catch (ex) { setState({ busy: false, error: ex.message }); } };
  const ask = (e) => { e.preventDefault(); go(async () => { await api('/api/auth/forgot', { method: 'POST', body: { loginId: f.loginId.trim(), dob: f.dob } }); setStep(2); }); };
  const verify = (e) => { e.preventDefault(); go(async () => { const r = await api('/api/auth/forgot/verify', { method: 'POST', body: { loginId: f.loginId.trim(), code: f.code.trim() } }); setToken(r.resetToken); setStep(3); }); };
  const save = (e) => { e.preventDefault(); if (mismatch) return; go(async () => { await api('/api/auth/reset', { method: 'POST', body: { resetToken: token, newPassword: f.pw } }); setStep(4); }); };
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mb-6 inline-block text-[15px] font-semibold">AtKaksha</Link>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Reset your password</h1>
        {step === 1 && (
          <form onSubmit={ask} className="mt-5">
            <p className="mb-5 text-[15px] leading-6 text-muted-foreground">Enter your login ID and your date of birth. If they match what the school has on file, we email a 6-digit code to your registered email address.</p>
            <label htmlFor="fp-id" className={label}>Login ID</label>
            <Input id="fp-id" name="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={f.loginId} onChange={set('loginId')} className="h-11" />
            <label htmlFor="fp-dob" className={`${label} mt-5`}>Date of birth</label>
            <Input id="fp-dob" type="date" required value={f.dob} onChange={set('dob')} className="h-11" />
            {state.error && <div className="mt-4"><Callout tone="danger">{state.error}</Callout></div>}
            <Button variant="primary" size="lg" type="submit" loading={state.busy} className="mt-6 h-11 w-full">Send me a code</Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={verify} className="mt-5">
            <Callout tone="success">If those details match, a code is on its way to your registered email. It works for 10 minutes.</Callout>
            <label htmlFor="fp-code" className={`${label} mt-5`}>6-digit code</label>
            <Input id="fp-code" name="one-time-code" inputMode="numeric" autoComplete="one-time-code" required value={f.code} onChange={set('code')} className="h-11 tracking-[0.2em]" />
            {state.error && <div className="mt-4"><Callout tone="danger">{state.error}</Callout></div>}
            <Button variant="primary" size="lg" type="submit" loading={state.busy} className="mt-6 h-11 w-full">Continue</Button>
            <button type="button" onClick={() => { setStep(1); setF((x) => ({ ...x, code: '' })); setState({ busy: false, error: '' }); }} className="mt-3 w-full rounded-sm text-center text-[14px] font-medium text-primary-ink hover:underline">Start again</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={save} className="mt-5">
            <label htmlFor="fp-new" className={label}>New password</label>
            <PasswordInput id="fp-new" name="new-password" autoComplete="new-password" required value={f.pw} onChange={set('pw')} className="h-11" />
            <p className="mt-1.5 text-[13px] text-muted-foreground">At least 10 characters with a letter and a number; not a common password.</p>
            <label htmlFor="fp-confirm" className={`${label} mt-5`}>Confirm new password</label>
            <PasswordInput id="fp-confirm" name="confirm-password" autoComplete="new-password" required value={f.confirm} onChange={set('confirm')} className="h-11" />
            {mismatch && <p className="mt-1.5 text-[13px] text-danger-ink" role="alert">Passwords do not match</p>}
            {state.error && <div className="mt-4"><Callout tone="danger">{state.error}</Callout></div>}
            <Button variant="primary" size="lg" type="submit" loading={state.busy} className="mt-6 h-11 w-full">Change password</Button>
          </form>
        )}
        {step === 4 && (
          <div className="mt-5 space-y-4">
            <Callout tone="success">Your password was changed and every device was signed out.</Callout>
            <Link to="/" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground">Go to sign-in</Link>
          </div>
        )}
      </div>
    </main>
  );
}
