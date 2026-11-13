import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Bus, GraduationCap, IndianRupee, LayoutDashboard, BookMarked, Presentation, ShieldCheck, UserRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button, Callout, FormField, Input, PasswordInput } from '../design/ui';
import { PublicPage } from './PublicPage';

/** One sign-in page per role. The server also refuses a login that comes through the wrong portal. */
export const PORTALS = {
  student: { title: 'Student', icon: GraduationCap, role: 'student', home: '/student', blurb: 'Timetable, homework, attendance, results and fees', hint: 'Your login id is on the slip from the school office.' },
  teacher: { title: 'Teacher', icon: Presentation, role: 'teacher', home: '/teacher', blurb: 'Classes, attendance, homework, marks and leave', hint: 'Use the login id given by the school administrator.' },
  finance: { title: 'Finance', icon: IndianRupee, role: 'finance', home: '/finance', blurb: 'Fee structures, collections, receipts and dues', hint: 'For accounts staff of the school.' },
  library: { title: 'Library', icon: BookMarked, role: 'library', home: '/library', blurb: 'Catalogue, issue and return, fines', hint: 'For the school librarian.' },
  transport: { title: 'Transport', icon: Bus, role: 'transport', home: '/transport', blurb: 'Buses, drivers, conductors, routes and riders', hint: 'For the school transport officer.' },
  staff: { title: 'Staff', icon: UserRound, role: 'staff', home: '/staff', blurb: 'Your attendance, leave and payslips', hint: 'For drivers, conductors and other school staff.' },
  admin: { title: 'School Admin', icon: LayoutDashboard, role: 'school_admin', home: '/admin', blurb: 'Run the whole school: students, staff, exams, reports', hint: 'For the school administrator.' },
  platform: { title: 'Platform Admin', icon: ShieldCheck, role: 'super_admin', home: '/platform', blurb: 'Manage schools and subscriptions', hint: 'Restricted: for the platform operator only.' },
};
export const homeFor = (role) => Object.values(PORTALS).find((p) => p.role === role)?.home || '/';
export const loginFor = (role) => `${homeFor(role)}/login`;

export function Landing() {
  const { user } = useAuth();
  if (user && !user.mustChangePassword) return <Navigate to={homeFor(user.role)} replace />;
  const cards = ['student', 'teacher', 'finance', 'library', 'transport', 'staff', 'admin'];
  return (
    <PublicPage title="Sign in" index>
      <section className="mx-auto max-w-2xl pb-10 pt-10 text-center sm:pt-16">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">Campusio</h1>
        <p className="mt-4 text-lg text-muted-foreground">Choose how you sign in. Your school creates your account.</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((k) => {
          const P = PORTALS[k]; const Icon = P.icon;
          return (
            <Link key={k} to={`/${k}/login`} data-portal={k} className="group portal-card flex flex-col rounded-xl border border-border/70 bg-card p-6 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid size-11 place-items-center rounded-xl bg-tone-soft text-tone" aria-hidden><Icon className="size-5" strokeWidth={1.75} /></span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">Login as {P.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{P.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">Continue<ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          );
        })}
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">There is no self sign-up. <Link to="/platform/login" className="font-medium text-primary-ink hover:underline">Platform administrator</Link></p>
    </PublicPage>
  );
}

export default function PortalLogin({ portal }) {
  const cfg = PORTALS[portal];
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ loginId: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user && !user.mustChangePassword && user.role === cfg.role) return <Navigate to={cfg.home} replace />;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const u = await login(f.loginId, f.password, portal); nav(u.mustChangePassword ? '/account?force=1' : homeFor(u.role), { replace: true }); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const Icon = cfg.icon;
  return (
    <PublicPage narrow title={`${cfg.title} sign in`}>
      <form onSubmit={submit} aria-label={`${cfg.title} sign in`} data-portal={portal} className="mt-6 flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-7 shadow-sm sm:mt-12 sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-tone-soft text-tone" aria-hidden><Icon className="size-6" strokeWidth={1.75} /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{cfg.title} sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cfg.hint}</p>
        </div>
        <FormField label="Login id"><Input autoFocus autoComplete="username" value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} required className="h-11" /></FormField>
        <FormField label="Password"><PasswordInput autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required className="h-11" /></FormField>
        {err && <Callout tone="danger">{err}</Callout>}
        <Button variant="primary" size="lg" loading={busy} type="submit" className="w-full">Sign in</Button>
        <p className="text-center text-sm"><Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" aria-hidden />All sign-in options</Link></p>
      </form>
    </PublicPage>
  );
}
