import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button, Field, Input } from '../components/ui.jsx';

/** One sign-in page per role. The server also refuses a login that comes through the wrong portal. */
export const PORTALS = {
  student: { title: 'Student', icon: '🎓', role: 'student', home: '/student', blurb: 'Timetable, homework, attendance, results and fees', hint: 'Your login id is on the slip from the school office.' },
  teacher: { title: 'Teacher', icon: '👩‍🏫', role: 'teacher', home: '/teacher', blurb: 'Classes, attendance, homework, marks and leave', hint: 'Use the login id given by the school administrator.' },
  finance: { title: 'Finance', icon: '💰', role: 'finance', home: '/finance', blurb: 'Fee structures, collections, receipts and dues', hint: 'For accounts staff of the school.' },
  library: { title: 'Library', icon: '📚', role: 'library', home: '/library', blurb: 'Catalogue, issue and return, fines', hint: 'For the school librarian.' },
  transport: { title: 'Transport', icon: '🚌', role: 'transport', home: '/transport', blurb: 'Buses, drivers, conductors, routes and riders', hint: 'For the school transport officer.' },
  staff: { title: 'Staff', icon: '🧹', role: 'staff', home: '/staff', blurb: 'Your attendance, leave and payslips', hint: 'For drivers, conductors and other school staff.' },
  admin: { title: 'School Admin', icon: '🏫', role: 'school_admin', home: '/admin', blurb: 'Run the whole school: students, staff, exams, reports', hint: 'For the school administrator.' },
  platform: { title: 'Platform Admin', icon: '🛠', role: 'super_admin', home: '/platform', blurb: 'Manage schools and subscriptions', hint: 'Restricted: for the platform operator only.' },
};
export const homeFor = (role) => Object.values(PORTALS).find((p) => p.role === role)?.home || '/';
export const loginFor = (role) => `${homeFor(role)}/login`;

export function Landing() {
  const { user } = useAuth();
  if (user && !user.mustChangePassword) return <Navigate to={homeFor(user.role)} replace />;
  const cards = ['student', 'teacher', 'finance', 'library', 'transport', 'staff', 'admin'];
  return (
    <div className="login-wrap" style={{ alignItems: 'start', paddingTop: 56 }}>
      <div style={{ width: '100%', maxWidth: 980 }} className="stack">
        <div className="center"><div className="brand-logo" style={{ margin: '0 auto 12px', width: 56, height: 56, fontSize: 28 }}>🎓</div><h1 style={{ fontSize: 30 }}>School ERP</h1><p className="muted">Choose how you want to sign in</p></div>
        <div className="grid g3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {cards.map((k) => (
            <Link key={k} to={`/${k}/login`} className="card portal-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-b stack-sm"><div style={{ fontSize: 34 }}>{PORTALS[k].icon}</div><h2>Login as {PORTALS[k].title.replace('School ', 'School ')}</h2><div className="muted">{PORTALS[k].blurb}</div><div className="bold" style={{ color: 'var(--primary)' }}>Continue →</div></div>
            </Link>))}
        </div>
        <p className="small muted center">Accounts are created by your school. There is no self sign-up. <Link to="/platform/login">Platform administrator</Link></p>
      </div>
    </div>
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
  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={submit} aria-label={`${cfg.title} sign in`}>
        <div className="center"><div className="brand-logo" style={{ margin: '0 auto 10px', width: 52, height: 52, fontSize: 26 }}>{cfg.icon}</div><h1>{cfg.title} sign in</h1><p className="muted">{cfg.hint}</p></div>
        <Field label="Login id"><Input autoFocus autoComplete="username" value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} required /></Field>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
        {err && <div className="alert" role="alert">{err}</div>}
        <Button variant="primary" loading={busy} type="submit">Sign in</Button>
        <p className="small muted center"><Link to="/">← All sign-in options</Link></p>
      </form>
    </div>
  );
}
