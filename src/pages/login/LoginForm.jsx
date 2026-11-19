import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Callout, Input, PasswordInput } from '../../design/ui';

/**
 * The sign-in form every portal shares, built from the same components as the rest of the app.
 * It is a real form with named, autocomplete-tagged inputs, so a browser can offer to remember the login.
 */
export default function LoginForm({ portal, title, theme, busy, error, onSubmit, forgot }) {
  const id = useId();
  const [f, setF] = useState({ loginId: '', password: '' });
  const [keep, setKeep] = useState(false);
  const [help, setHelp] = useState(false);
  const Icon = theme.icon;
  const label = 'mb-2 block text-[14px] font-medium text-foreground';
  return (
    <form method="post" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, keep }); }} aria-label={`${title} sign in`} data-portal={portal} className="w-full max-w-[400px] text-foreground">
      <div className="flex items-center gap-2.5 text-tone-ink"><Icon className="size-5" strokeWidth={1.8} aria-hidden /><span className="text-xs font-semibold uppercase tracking-[0.08em]">{theme.eyebrow}</span></div>
      <h2 className="mt-3.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">{theme.heading}</h2>
      <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{theme.hint}</p>
      <label htmlFor={`${id}-id`} className={`${label} mt-8`}>Login ID</label>
      <Input id={`${id}-id`} name="username" type="text" autoFocus autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} className="h-11" />
      <label htmlFor={`${id}-pw`} className={`${label} mt-5`}>Password</label>
      <PasswordInput id={`${id}-pw`} name="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="h-11" />
      <div className="mt-4 flex items-center justify-between text-[14px]">
        <span className="flex items-center gap-2">
          <input id={`${id}-keep`} type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 rounded accent-[rgb(var(--c-primary))]" />
          <label htmlFor={`${id}-keep`} className="text-foreground">Keep me signed in</label>
        </span>
        <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="rounded-sm font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Forgot password?</button>
      </div>
      {help && <p className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[13.5px] leading-6 text-muted-foreground">{forgot} You will be asked to choose a new password the next time you sign in.</p>}
      {error && <div className="mt-4"><Callout tone="danger">{error}{/^Invalid login id or password/.test(error) && <span className="mt-1 block text-[13px] opacity-90">Check that you are on the sign-in page for your role. Students and parents, teachers, finance, library, transport, staff and school admins each have their own: see “All sign-in options” below.</span>}</Callout></div>}
      <Button variant="primary" size="lg" loading={busy} type="submit" className="mt-6 h-11 w-full">Sign in</Button>
      {theme.note && <p className="mt-4 text-[13.5px] leading-6 text-muted-foreground">{theme.note}</p>}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5 text-[14px] text-muted-foreground">
        <Link to="/" className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-foreground hover:underline"><ArrowLeft className="size-3.5" aria-hidden />All sign-in options</Link>
        <span className="text-right">Need help? Contact your school.</span>
      </div>
    </form>
  );
}
