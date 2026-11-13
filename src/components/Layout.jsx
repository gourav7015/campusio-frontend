import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi, } from '../hooks/useApi.js';
import { useDebounced, fmtDateTime, cls } from './ui.jsx';
import { post } from '../api/client.js';
import { loginFor } from '../pages/Login.jsx';

const I = (c) => <span className="ico" aria-hidden>{c}</span>;
export const NAV = {
  platform: [
    ['/platform', 'Dashboard', '▦'], ['/platform/schools', 'Schools', '🏫'], ['/platform/audit', 'Audit log', '🧾'],
  ],
  admin: [
    ['/admin', 'Dashboard', '▦', 'end'],
    ['#', 'Academics'], ['/admin/years', 'Academic years', '📅'], ['/admin/classes', 'Classes & sections', '🏷'],
    ['#', 'People'], ['/admin/students', 'Students', '🎓'], ['/admin/teachers', 'Teachers', '👩‍🏫'], ['/admin/support-staff', 'Non-teaching staff', '🧹'], ['/admin/staff', 'Desk logins', '🧑‍💼'], ['/admin/payroll', 'Payroll & salaries', '💸'], 
    ['#', 'Daily operations'], ['/admin/timetable', 'Timetable', '🗓'], ['/admin/staff-attendance', 'Staff attendance', '🕘'], ['/admin/staff-leave', 'Staff leave', '🌴'],
    ['/admin/exams', 'Examinations', '🧪'], ['/admin/leave', 'Teacher leave', '🌴'], ['/admin/fees', 'Fees (view)', '💰'], ['/admin/library', 'Library (view)', '📚'], ['/admin/transport', 'Transport (view)', '🚌'],
    ['#', 'Communication'], ['/admin/announcements', 'Announcements', '📣'], ['/admin/events', 'Calendar & events', '🎉'], ['/admin/messages', 'Messages', '✉'],
    ['#', 'Administration'], ['/admin/promotion', 'Year-end promotion', '⬆'], ['/admin/import', 'Data import', '⇪'], ['/admin/reports', 'Reports & exports', '📊'], ['/admin/settings', 'School settings', '⚙'], ['/admin/audit', 'Audit log', '🧾'],
  ],
  finance: [
    ['/finance', 'Dashboard', '▦', 'end'], ['/finance/structures', 'Fee structures', '🧾'], ['/finance/policy', 'Fee policy', '⚖'], ['/finance/students', 'Students & dues', '🎓'], ['/finance/payments', 'Payments & receipts', '💳'], ['/finance/reports', 'Reports & defaulters', '📊'],
  ],
  library: [
    ['/library', 'Dashboard', '▦', 'end'], ['/library/desk', 'Issue & return', '🔁'], ['/library/books', 'Catalogue', '📚'], ['/library/loans', 'Loans & overdue', '⏰'], ['/library/classes', 'By class', '🏫'], ['/library/settings', 'Library rules', '⚙'],
  ],
  transport: [
    ['/transport', 'Dashboard', '▦', 'end'], ['/transport/buses', 'Buses & riders', '🚌'], ['/transport/staff', 'Drivers & staff', '🧑‍✈️'], ['/transport/attendance', 'Staff attendance', '🕘'], ['/transport/leave', 'Staff leave', '🌴'],
  ],
  staff: [
    ['/staff', 'Dashboard', '▦', 'end'], ['/staff/attendance', 'My Attendance', '🕘'], ['/staff/leave', 'Leave', '🌴'], ['/staff/payslips', 'Salary & Payslips', '💸'], ['/staff/profile', 'My Profile', '👤'],
  ],
  teacher: [
    ['/teacher', 'Dashboard', '▦', 'end'], ['/teacher/timetable', 'My Timetable', '🗓'], ['/teacher/classes', 'My Classes', '🏫'], ['/teacher/subjects', 'My Subjects', '📚'],
    ['/teacher/attendance', 'Attendance', '✅'], ['/teacher/homework', 'Homework & Assignments', '📝'], ['/teacher/materials', 'Study Materials', '📎'],
    ['/teacher/exams', 'Examinations & Marks', '🧪'], ['/teacher/performance', 'Student Performance', '📈'], ['/teacher/library', 'Library', '📚'],
    ['/teacher/communication', 'Communication', '💬'], ['/teacher/leave', 'Leave Management', '🌴'], ['/teacher/my-attendance', 'My Attendance', '🕘'], ['/teacher/salary', 'Salary & Payslips', '💸'], ['/teacher/profile', 'My Profile', '👤'],
  ],
  student: [
    ['/student', 'Dashboard', '▦', 'end'], ['/student/profile', 'My Profile', '👤'], ['/student/timetable', 'My Timetable', '🗓'], ['/student/attendance', 'My Attendance', '✅'],
    ['/student/homework', 'Homework & Assignments', '📝'], ['/student/materials', 'Study Materials', '📎'], ['/student/exams', 'Examinations', '🧪'],
    ['/student/results', 'Results & Class Ranks', '🏅'], ['/student/performance', 'My Performance', '📈'], ['/student/calendar', 'School Calendar', '📅'],
    ['/student/announcements', 'Announcements', '📣'], ['/student/fees', 'Fee Information', '💰'], ['/student/library', 'Library', '📚'], ['/student/documents', 'My Documents', '📁'], ['/student/settings', 'Settings', '⚙'],
  ],
};

const roleOf = (base) => (base.endsWith('school') ? 'admin' : base.split('/')[2]);
const NO_BELL = new Set(['platform', 'finance', 'library', 'transport', 'staff']);

function Notifications({ base }) {
  const [open, setOpen] = useState(false);
  const { data, reload } = useApi(`${base}/notifications`, { limit: 8 });
  const nav = useNavigate();
  const ref = useRef();
  useEffect(() => { const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { const t = setInterval(reload, 60000); return () => clearInterval(t); }, [reload]);
  const go = async (n) => {
    if (!n.readAt) await post(`${base}/notifications/${n._id}/read`).catch(() => {});
    setOpen(false); reload();
    const role = roleOf(base);
    const map = { homework: `/${role}/homework`, attendance: `/${role}/attendance`, material: `/${role}/materials`, announcement: `/${role}/announcements`, result: `/${role}/results`, exam: `/${role}/exams`, timetable: `/${role}/timetable`, leave: `/${role}/leave`, marks: `/${role}/exams`, message: `/${role}/messages`, fees: `/${role}/fees`, library: `/${role}/library` };
    nav(map[n.link?.type] || `/${role}/notifications`);
  };
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" aria-label="Notifications" onClick={() => setOpen(!open)}>🔔{data?.unread > 0 && <span className="dot">{data.unread > 99 ? '99+' : data.unread}</span>}</button>
      {open && (
        <div className="pop">
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <b>Notifications</b>
            <button className="btn sm ghost" onClick={async () => { await post(`${base}/notifications/read-all`); reload(); }}>Mark all read</button>
          </div>
          {data?.items?.length ? data.items.map((n) => (
            <a key={n._id} className={cls('item', !n.readAt && 'unread')} href="#!" onClick={(e) => { e.preventDefault(); go(n); }}>
              <div className="bold">{n.title}</div><div className="small muted">{n.body}</div><div className="small muted">{fmtDateTime(n.createdAt)}</div>
            </a>
          )) : <div className="empty small">You're all caught up</div>}
          <Link className="item center" to={`/${roleOf(base)}/notifications`} onClick={() => setOpen(false)}>View all</Link>
        </div>
      )}
    </div>
  );
}

function QuickSearch({ base, role }) {
  const [q, setQ] = useState('');
  const d = useDebounced(q);
  const { data } = useApi(d.length >= 2 ? `${base}/search` : null, { q: d });
  const nav = useNavigate();
  const groups = data ? Object.entries(data).filter(([, v]) => v?.length) : [];
  const href = (g, x) => {
    if (role === 'teacher') return g === 'students' ? `/teacher/students/${x.id}` : `/teacher/classes/${x.sectionId}`;
    return { students: `/admin/students/${x._id}`, teachers: `/admin/teachers/${x._id}`, exams: `/admin/exams/${x._id}`, homework: '/admin/classes?tab=homework', announcements: '/admin/announcements', classes: '/admin/classes', subjects: '/admin/assignments' }[g];
  };
  return (
    <div className="search hide-sm">
      <input placeholder="Quick search…" aria-label="Quick search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
      {d.length >= 2 && q && (
        <div className="search-results">
          {groups.length ? groups.map(([g, items]) => (
            <div key={g}><div className="grp">{g}</div>{items.map((x) => <a key={x._id || x.id || x.sectionId} href="#!" onClick={(e) => { e.preventDefault(); setQ(''); nav(href(g, x)); }}>{x.name || x.title || x.label || x.code}{x.admissionNo ? ` · ${x.admissionNo}` : ''}</a>)}</div>
          )) : <div className="empty small">No matches</div>}
        </div>
      )}
    </div>
  );
}

export function Shell({ area }) {
  const { user, school, acting, setActing, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const items = NAV[area];
  const base = NO_BELL.has(area) ? null : `/api/${area === 'admin' ? 'school' : area}`;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const title = { platform: 'Platform Admin', admin: 'School Admin', teacher: 'Teacher Portal', student: 'Student Portal', finance: 'Finance Desk', library: 'Library Desk', transport: 'Transport Desk', staff: 'Staff Portal' }[area];
  return (
    <div className="shell">
      <aside className={cls('sidebar', open && 'open')} onClick={() => setOpen(false)}>
        <div className="brand"><div className="brand-logo">{(school?.name || 'E')[0]}</div><div><b>{title}</b><small>{area === 'platform' ? 'School ERP' : school?.name}</small></div></div>
        <nav className="nav" aria-label="Main">
          {items.map((it, i) => it[0] === '#' ? <div key={i} className="nav-section">{it[1]}</div> : <NavLink key={it[0]} to={it[0]} end={!!it[3] || it[0] === '/platform'}>{I(it[2])}{it[1]}</NavLink>)}
        </nav>
      </aside>
      <div className="main">
        <header className="header">
          <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen(true)}>☰</button>
          {base && area !== 'student' && <QuickSearch base={base} role={area} />}
          <div className="grow" />
          {school?.academicYear && <span className="chip hide-sm" title="Current academic year">📅 {school.academicYear}</span>}
          <span className="muted hide-sm">{today}</span>
          {base && <Notifications base={base} />}
          <div style={{ position: 'relative' }}>
            <button className="row btn ghost" onClick={() => setMenu(!menu)} aria-label="Profile menu"><span className="avatar">{user.name[0]}</span><span className="hide-sm"><b>{user.name}</b></span></button>
            {menu && (
              <div className="pop" style={{ width: 220 }}>
                {(area === 'teacher' || area === 'student') && <Link className="item" to={`/${area}/profile`} onClick={() => setMenu(false)}>My profile</Link>}
                <Link className="item" to="/account" onClick={() => setMenu(false)}>Password & sessions</Link>
                <a className="item" href="#!" onClick={async (e) => { e.preventDefault(); const role = user.role; await logout(); nav(loginFor(role)); }}>Sign out</a>
              </div>
            )}
          </div>
        </header>
        <main className="content">
          {acting && area === 'admin' && user.role === 'super_admin' && (
            <div className="banner">🛠 You are acting on <b>{acting.name}</b> as Super Admin. Every change is audited.
              <button className="btn sm" onClick={() => { setActing(null); nav('/platform/schools'); }}>Exit school</button></div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
