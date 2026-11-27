import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Async, Badge, Button, Card, DataTable, Empty, Input, Select } from './ui.jsx';

const AREAS = {
  auth: 'Sign-ins and passwords', attendance: 'Attendance', marks: 'Marks', exam: 'Examinations', fees: 'Fees and payments', payment: 'Fees and payments', finance: 'Finance', expense: 'Expenses', vendor: 'Vendors',
  student: 'Students', teacher: 'Teachers', class: 'Classes', section: 'Sections', leave: 'Leave', payroll: 'Payroll', transport: 'Transport', library: 'Library', announcement: 'Announcements', import: 'Imports',
  export: 'Exports', promotion: 'Year-end promotion', staff: 'Staff and desk logins', subadmin: 'Sub-admins', school: 'School', platform: 'Platform', homework: 'Homework', timetable: 'Timetable', event: 'Calendar',
  house: 'Houses', remark: 'Remarks', swap: 'Period swaps', ticket: 'Help desk', document: 'Documents', settings: 'Settings', class_life: 'Class life',
};
const ROLES = { school_admin: 'School Admin', super_admin: 'Platform admin', teacher: 'Teacher', student: 'Student', finance: 'Finance', library: 'Library', transport: 'Transport officer', staff: 'Staff' };
export const areaLabel = (a) => AREAS[a] || (a ? a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, ' ') : '');
const iso = (d, tz) => d.toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined);
const shift = (days, tz) => iso(new Date(Date.now() - days * 864e5), tz);
const niceDay = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const when = (s) => { const d = new Date(s); return <>{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}<div className="small muted">{d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div></>; };

/**
 * The audit log: who did what, and when. It opens on today only; the dates, the person, their role, the kind of action and any words narrow it,
 * and the choices offered are only the ones that happened in the chosen days.
 */
export default function AuditLog({ base }) {
  const { school } = useAuth();
  const tz = school?.timezone;
  const today = iso(new Date(), tz);
  const [range, setRange] = useState({ preset: 'today', from: today, to: today });
  const [who, setWho] = useState(''); const [role, setRole] = useState(''); const [area, setArea] = useState(''); const [q, setQ] = useState('');
  const presets = useMemo(() => [['today', 'Today', today, today], ['yesterday', 'Yesterday', shift(1, tz), shift(1, tz)], ['week', 'Last 7 days', shift(6, tz), today], ['month', 'Last 30 days', shift(29, tz), today], ['all', 'All time', '', '']], [today, tz]);
  const facets = useApi(`${base}/audit/facets`, { from: range.from, to: range.to });
  const rows = useApi(`${base}/audit`, { from: range.from, to: range.to, actorId: who, role, area, q: q.trim().length >= 2 ? q.trim() : '', limit: 500 });
  const f = facets.data;
  const people = (f?.people || []).filter((p) => !role || p.role === role);
  const roles = [...new Set((f?.people || []).map((p) => p.role))];
  const dirty = who || role || area || q || range.preset !== 'today';
  const clear = () => { setRange({ preset: 'today', from: today, to: today }); setWho(''); setRole(''); setArea(''); setQ(''); };
  const period = range.preset === 'all' ? 'all time' : range.from === range.to ? (range.from === today ? `today (${niceDay(today)})` : niceDay(range.from)) : `${niceDay(range.from)} to ${niceDay(range.to)}`;
  return (
    <Card flush>
      <div className="card-b stack">
        <div className="row wrap" style={{ gap: 6 }} role="group" aria-label="Period">
          {presets.map(([key, text, from, to]) => <Button key={key} size="sm" variant={range.preset === key ? 'primary' : undefined} aria-pressed={range.preset === key} onClick={() => { setRange({ preset: key, from, to }); setWho(''); setArea(''); }}>{text}</Button>)}
          <span className="muted small" style={{ marginLeft: 8 }}>or pick the days</span>
          <Input type="date" aria-label="From date" value={range.from} max={range.to || today} onChange={(e) => setRange({ preset: 'custom', from: e.target.value, to: range.to && range.to >= e.target.value ? range.to : e.target.value })} style={{ width: 150 }} />
          <Input type="date" aria-label="To date" value={range.to} min={range.from} max={today} onChange={(e) => setRange({ preset: 'custom', from: range.from && range.from <= e.target.value ? range.from : e.target.value, to: e.target.value })} style={{ width: 150 }} />
        </div>
        <div className="grid g4">
          <Select aria-label="Who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Everyone" options={people.map((p) => ({ value: p.id, label: `${p.name} (${ROLES[p.role] || p.role}) · ${p.count}` }))} />
          <Select aria-label="Role" value={role} onChange={(e) => { setRole(e.target.value); setWho(''); }} placeholder="All roles" options={roles.map((r) => ({ value: r, label: ROLES[r] || r }))} />
          <Select aria-label="What" value={area} onChange={(e) => setArea(e.target.value)} placeholder="All kinds of action" options={(f?.areas || []).map((a) => ({ value: a.area, label: `${areaLabel(a.area)} · ${a.count}` }))} />
          <Input placeholder="Search the details or a name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the log" />
        </div>
        <div className="row between wrap small muted" style={{ gap: 8 }}>
          <span aria-live="polite">{rows.loading ? 'Getting the entries' : `${rows.data?.length ?? 0} entr${rows.data?.length === 1 ? 'y' : 'ies'} for ${period}${rows.data?.length >= 500 ? ' (the latest 500: narrow the days, the person or the kind of action)' : ''}`}</span>
          {dirty && <Button size="sm" onClick={clear}>Back to today</Button>}
        </div>
      </div>
      <Async skeleton="datatable" state={rows} empty={<Empty title={`Nothing was recorded for ${period}`} />}>{(r) => (r.length ? (
        <DataTable rows={r} columns={[
          { label: 'When', render: (x) => when(x.createdAt) },
          { label: 'Who', render: (x) => <>{x.actorName} <span className="muted small">({ROLES[x.actorRole] || x.actorRole})</span> {x.actingAsSuperAdmin && <Badge tone="amber">platform</Badge>}</> },
          { label: 'What', render: (x) => <>{areaLabel(String(x.action).split('.')[0])}<div className="small muted">{x.action}</div></> },
          { label: 'Details', key: 'summary' },
        ]} />) : <Empty title={`Nothing was recorded for ${period}`}>Try another day, or clear the filters.</Empty>)}</Async>
    </Card>
  );
}
