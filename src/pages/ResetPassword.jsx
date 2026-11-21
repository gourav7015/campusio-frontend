import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { usePageTitle } from '../design/lib/page';
import { Button, Callout, Input, PasswordInput } from '../design/ui';

/** The page a "reset your password" email opens. Works once, for 30 minutes. */
export default function ResetPassword() {
  usePageTitle('Choose a new password');
  const [sp] = useSearchParams();
  const token = sp.get('token') || '';
  const [f, setF] = useState({ pw: '', confirm: '', code: '' });
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const mismatch = f.confirm && f.pw !== f.confirm;
  const submit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    setState({ busy: true, error: '', done: false });
    try { await api('/api/auth/reset', { method: 'POST', body: { token, newPassword: f.pw, ...(f.code.trim() ? { code: f.code.trim() } : {}) } }); setState({ busy: false, error: '', done: true }); }
    catch (ex) { setState({ busy: false, error: ex.message, done: false }); }
  };
  const label = 'mb-2 block text-[14px] font-medium text-foreground';
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mb-6 inline-block text-[15px] font-semibold">Campusio</Link>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Choose a new password</h1>
        {!token ? <div className="mt-5"><Callout tone="danger">This page needs the link from your email. Ask for a new link on the sign-in page.</Callout></div> : state.done ? (
          <div className="mt-5 space-y-4">
            <Callout tone="success">Your password was changed and every device was signed out.</Callout>
            <Link to="/" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground">Go to sign-in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5">
            <label htmlFor="rp-new" className={label}>New password</label>
            <PasswordInput id="rp-new" name="new-password" autoComplete="new-password" required value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} className="h-11" />
            <p className="mt-1.5 text-[13px] text-muted-foreground">At least 10 characters with a letter and a number; not a common password.</p>
            <label htmlFor="rp-confirm" className={`${label} mt-5`}>Confirm new password</label>
            <PasswordInput id="rp-confirm" name="confirm-password" autoComplete="new-password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} className="h-11" />
            {mismatch && <p className="mt-1.5 text-[13px] text-danger-ink" role="alert">Passwords do not match</p>}
            <label htmlFor="rp-code" className={`${label} mt-5`}>Authenticator code <span className="font-normal text-muted-foreground">(only if you use one)</span></label>
            <Input id="rp-code" name="one-time-code" inputMode="numeric" autoComplete="one-time-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="h-11" />
            {state.error && <div className="mt-4"><Callout tone="danger">{state.error}</Callout></div>}
            <Button variant="primary" size="lg" type="submit" loading={state.busy} className="mt-6 h-11 w-full">Change password</Button>
          </form>
        )}
      </div>
    </main>
  );
}
