import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Bus, GraduationCap, IndianRupee, LayoutDashboard, BookMarked, Presentation, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import { usePageTitle } from '../design/lib/page';
import LoginForm from './login/LoginForm.jsx';
import { LandingScreen, PortalScreen } from './login/LoginScreens.jsx';
import { THEMES } from './login/themes.js';
import { ErrorScreen, isConnectionProblem } from '../design/ErrorScreen';

/** One sign-in page per role. The server also refuses a login that comes through the wrong portal. */
export const PORTALS = {
  student: { title: 'Student & Parent', icon: GraduationCap, role: 'student', home: '/student', blurb: 'One login for the student and the family: timetable, homework, attendance, results, fees and messages to teachers', hint: 'Parents sign in with the student\'s login id. It is on the slip from the school office.' },
  teacher: { title: 'Teacher', icon: Presentation, role: 'teacher', home: '/teacher', blurb: 'Classes, attendance, homework, marks and leave', hint: 'Use the login id given by the school administrator.' },
  finance: { title: 'Finance', icon: IndianRupee, role: 'finance', home: '/finance', blurb: 'Fee structures, collections, receipts and dues', hint: 'For accounts staff of the school.' },
  library: { title: 'Library', icon: BookMarked, role: 'library', home: '/library', blurb: 'Catalogue, issue and return, fines', hint: 'For the school librarian.' },
  transport: { title: 'Transport', icon: Bus, role: 'transport', home: '/transport', blurb: 'Buses, drivers, conductors, routes and riders', hint: 'For the school transport officer.' },
  staff: { title: 'Staff', icon: UserRound, role: 'staff', home: '/staff', blurb: 'Your attendance, leave and payslips; staff given the attendance desk also mark attendance', hint: 'For the school\'s non-teaching staff. Drivers and conductors are looked after by the Transport officer and have no sign-in.' },
  admin: { title: 'School Admin', icon: LayoutDashboard, role: 'school_admin', home: '/admin', blurb: 'Run the whole school: students, staff, exams, reports', hint: 'For the school administrator.' },
  platform: { title: 'Platform Admin', icon: ShieldCheck, role: 'super_admin', home: '/platform', blurb: 'Manage schools and subscriptions', hint: 'Restricted: for the platform operator only.' },
};
export const homeFor = (role) => Object.values(PORTALS).find((p) => p.role === role)?.home || '/';
export const loginFor = (role) => `${homeFor(role)}/login`;

export function Landing() {
  const { user } = useAuth();
  if (user && !user.mustChangePassword) return <Navigate to={homeFor(user.role)} replace />;
  return <LandingScreen />;
}

export default function PortalLogin({ portal }) {
  const cfg = PORTALS[portal];
  const { user, login, loginWithCode } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [down, setDown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState(null); // set after the password was right and a code emailed to the person is needed
  const [sentTo, setSentTo] = useState(''); // the hidden address the code went to
  const [options, setOptions] = useState({ emailCodes: false });
  useEffect(() => { api('/api/auth/options').then(setOptions).catch(() => {}); }, []);
  usePageTitle(`${cfg.title} sign in`);
  if (user && !user.mustChangePassword && user.role === cfg.role) return <Navigate to={cfg.home} replace />;
  const submit = async ({ loginId, password, keep, code }) => {
    setBusy(true); setErr(''); setDown(null);
    try {
      const u = challenge ? await loginWithCode(challenge, code, keep) : await login(loginId, password, portal, keep);
      if (u.twoFactor) { setChallenge(u.twoFactor); setSentTo(u.sentTo); return; }
      nav(u.mustChangePassword ? '/account?force=1' : homeFor(u.role), { replace: true });
    }
    catch (ex) { if (isConnectionProblem(ex)) setDown(ex); else setErr(ex.message); } finally { setBusy(false); }
  };
  if (down) return <ErrorScreen error={down} onRetry={() => setDown(null)} homeHref="/" homeLabel="All sign-in options" />;
  const forgot = portal === 'platform' ? 'Platform administrators are reset by another platform administrator.'
    : portal === 'admin' ? 'Your password is reset by the AtKaksha platform team. Ask them to reset it for you.'
    : ['finance', 'library', 'transport'].includes(portal) ? 'Ask your School Admin to reset it for you.'
    : 'Ask the school office to reset it. They will set it back to your starting password (the first four letters of your name in capitals, then your date of birth, if your school uses that), or give you a new one.';
  return <PortalScreen portal={portal} form={<LoginForm portal={portal} title={cfg.title} theme={THEMES[portal]} busy={busy} error={err} onSubmit={submit} forgot={forgot} challenge={challenge} sentTo={sentTo} onBack={() => { setChallenge(null); setSentTo(''); setErr(''); }} emailReset={options.emailCodes} />} />;
}
