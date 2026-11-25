import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CircleArrowUp, Lock } from 'lucide-react';
import { Button, Callout, Input, PasswordInput } from '../../design/ui';
import { api } from '../../api/client.js';

/**
 * The sign-in form every portal shares, built from the same components as the rest of the app.
 * It is a real form with named, autocomplete-tagged inputs, so a browser can offer to remember the login.
 */
const label = 'mb-1.5 block text-[13.5px] font-medium text-foreground';
const field = 'h-[54px] rounded-xl border-tone/25 bg-card/70 px-3.5 text-base focus-visible:border-tone focus-visible:bg-card focus-visible:ring-tone/25';
const link = 'rounded-sm font-medium text-tone-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function LoginForm({ portal, title, theme, busy, error, onSubmit, forgot, challenge, sentTo, onBack, emailReset }) {
  const id = useId();
  const [f, setF] = useState({ loginId: '', password: '' });
  const [keep, setKeep] = useState(false);
  const [help, setHelp] = useState(false);
  const [code, setCode] = useState('');
  const [caps, setCaps] = useState(false);
  const [again, setAgain] = useState({ state: 'idle', msg: '' });
  const alertRef = useRef(null);
  const platform = portal === 'platform';
  // a wrong password gives the message a small shake, once, so it is noticed
  useEffect(() => {
    const el = alertRef.current;
    if (!error || !el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }, [error]);
  const watchCaps = (e) => { if (e.getModifierState) setCaps(e.getModifierState('CapsLock')); };
  return (
    <form method="post" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, keep, code }); }} aria-label={`${title} sign in`} data-portal={portal} className="w-full text-foreground">
      <Link to="/" className="-ml-1 mb-8 inline-flex items-center gap-1 rounded-lg py-1 pl-1 pr-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft className="size-[18px]" aria-hidden />All sign-in options</Link>
      <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.035em]">{challenge ? 'Check your email' : platform ? 'Platform sign in' : 'Welcome back'}</h2>
      <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{challenge ? `We emailed a 6-digit code to ${sentTo || 'your registered email'}. It works for 5 minutes.` : theme.sub}</p>
      {challenge ? (
        <div className="mt-7">
          <label htmlFor={`${id}-code`} className={label}>Sign-in code</label>
          <Input id={`${id}-code`} name="one-time-code" type="text" inputMode="numeric" autoFocus autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} required value={code} onChange={(e) => setCode(e.target.value)} className={`${field} h-[58px] text-center text-2xl font-semibold tracking-[0.3em]`} />
          <p className="mt-2 text-[13.5px] leading-6">
            <button type="button" disabled={again.state === 'sending'} onClick={async () => { setAgain({ state: 'sending', msg: '' }); try { await api('/api/auth/login/2fa/resend', { method: 'POST', body: { challenge } }); setAgain({ state: 'sent', msg: 'A new code is on its way.' }); } catch (ex) { setAgain({ state: 'error', msg: ex.message }); } }} className={`${link} disabled:opacity-60`}>Send the code again</button>
            {again.msg && <span role="status" className={`ml-2 ${again.state === 'error' ? 'text-danger-ink' : 'text-muted-foreground'}`}>{again.msg}</span>}
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-[18px]">
          <div>
            <label htmlFor={`${id}-id`} className={label}>Login ID</label>
            <Input id={`${id}-id`} name="username" type="text" autoFocus autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} className={field} />
            {!platform && <p className="mt-1.5 text-[13px] text-muted-foreground">The login id comes from {theme.who}.</p>}
          </div>
          <div>
            <label htmlFor={`${id}-pw`} className={label}>Password</label>
            <PasswordInput id={`${id}-pw`} name="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} onKeyDown={watchCaps} onKeyUp={watchCaps} onBlur={() => setCaps(false)} className={`${field} pr-12`} />
            {caps && <p role="status" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-warning-ink"><CircleArrowUp className="size-[15px]" aria-hidden />Caps Lock is on</p>}
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14px]">
        <label htmlFor={`${id}-keep`} className="inline-flex cursor-pointer items-center gap-2.5 py-1 text-foreground">
          <input id={`${id}-keep`} type="checkbox" role="switch" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="peer sr-only" />
          <span aria-hidden="true" className="relative h-6 w-10 rounded-full bg-border-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[rgb(var(--c-btn))] peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
          Keep me signed in
        </label>
        {!platform && <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className={`${link} px-0.5 py-1`}>Forgot password?</button>}
      </div>
      {help && !platform && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 px-3.5 py-3 text-[13.5px] leading-6 text-muted-foreground">
          {emailReset && <p className="mb-3"><Link to="/forgot-password" className="font-medium text-tone-ink hover:underline">Reset it with your date of birth and a code sent to your email</Link></p>}
          <p className="m-0">{forgot}{!emailReset && ' You will be asked to choose a new password the next time you sign in.'}</p>
        </div>
      )}
      {error && <div ref={alertRef} className="mt-4"><Callout tone="danger">{error}{/^Invalid login id or password/.test(error) && <span className="mt-1 block text-[13px] opacity-90">Check that you are on the sign-in page for your role. Students and parents, teachers, finance, library, transport, staff and school admins each have their own: see “All sign-in options” above.</span>}</Callout></div>}
      <Button variant="primary" size="lg" loading={busy} type="submit" className="mt-6 h-[54px] w-full rounded-[14px] bg-[rgb(var(--c-btn))] text-base text-tone-foreground hover:bg-[rgb(var(--c-btn))] hover:brightness-110">{challenge ? 'Verify and sign in' : 'Sign in'}</Button>
      {challenge && <button type="button" onClick={() => { setCode(''); onBack(); }} className={`${link} mt-3 w-full text-center text-[14px]`}>Use a different account</button>}
      {theme.note && <p className="mt-4 text-[13.5px] leading-6 text-muted-foreground">{theme.note}</p>}
      <p className="mt-7 flex gap-2.5 text-[13.5px] leading-6 text-muted-foreground"><Lock className="mt-1 size-4 flex-none" aria-hidden />{platform ? `A platform administrator’s password is reset by ${theme.who}.` : `Locked out? Use “Forgot password”, or ask ${theme.who} to reset it.`}</p>
    </form>
  );
}
