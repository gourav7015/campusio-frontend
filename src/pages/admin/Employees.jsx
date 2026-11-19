import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import FilterMenu from '../../components/FilterMenu.jsx';
import { Async, Badge, Card, DataTable, Empty, Field, Input, PageHeader, Select, Tabs, useDebounced, fmtDate } from '../../components/ui.jsx';

const TABS = [
  ['all', 'Everyone'], ['teaching', 'Teaching staff'], ['non_teaching', 'Non-teaching staff'], ['office', 'Officers and desks'], ['transport', 'Transport crew'],
];
/** Where each kind of employee is managed (added, edited, given a login). */
const MANAGE = {
  teaching: { to: '/admin/teachers', label: 'Manage teachers' }, non_teaching: { to: '/admin/support-staff', label: 'Manage non-teaching staff' },
  office: { to: '/admin/staff', label: 'Manage desk logins' }, transport: { to: '/admin/transport', label: 'Open Transport (view)' },
};
const KIND_LABEL = { teaching: 'Teaching', non_teaching: 'Non-teaching', office: 'Officer', transport: 'Transport crew' };
const KIND_TONE = { teaching: 'blue', non_teaching: '', office: 'amber', transport: 'green' };

/** Every employee of the school in one place. Read-only: each kind is managed on its own page (linked from the tab). */
const EMPTY = { q: '', designation: '', login: '', subjectId: '', classId: '', classTeacher: '', desk: '', attendanceDesk: '', bus: '', licence: '', status: 'active' };

/** Every employee of the school in one place. Read-only: each kind is managed on its own page (linked from the tab). */
export default function Employees() {
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : 'all';
  const [f, setF] = useState(EMPTY);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const dq = useDebounced(f.q);
  const nav = useNavigate();
  const list = useApi('/api/school/employees', {
    category: tab === 'all' ? undefined : tab, q: dq || undefined, designation: f.designation || undefined, login: f.login || undefined, subjectId: f.subjectId || undefined, classId: f.classId || undefined,
    classTeacher: f.classTeacher || undefined, desk: f.desk || undefined, attendanceDesk: f.attendanceDesk || undefined, bus: f.bus || undefined, licence: f.licence || undefined, status: f.status,
  });
  const d = list.data;
  const counts = d?.counts;
  const open = (e) => { if (e.kind === 'teacher') nav(`/admin/teachers/${e.id}`); else nav(MANAGE[e.category].to); };
  return (
    <div className="stack">
      <PageHeader title="Employees" subtitle="Everyone who works at the school: teachers, non-teaching staff, the finance officer, librarian and transport officer, and the drivers and conductors." />
      <Tabs tabs={TABS.map(([k, l]) => [k, counts ? `${l} (${counts[k === 'all' ? 'all' : k]})` : l])} value={tab} onChange={(t) => { setSp({ tab: t }); setF({ ...EMPTY, status: f.status }); }} />
      <Card>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <Field label="Search"><Input aria-label="Search employees" placeholder="Name, id, phone or designation" value={f.q} onChange={(e) => set({ q: e.target.value })} /></Field>
          <FilterMenu count={Object.entries(f).filter(([k, v]) => k !== 'q' && v && !(k === 'status' && v === 'active')).length} onClear={() => setF({ ...EMPTY, q: f.q })}>
            <Field label="Designation"><Select aria-label="Designation" value={f.designation} onChange={(e) => set({ designation: e.target.value })} placeholder="All designations" options={(d?.designations || []).map((x) => ({ value: x.name, label: `${x.name} (${x.n})` }))} /></Field>
            {tab === 'teaching' && <>
              <Field label="Subject"><Select aria-label="Subject" value={f.subjectId} onChange={(e) => set({ subjectId: e.target.value })} placeholder="All subjects" options={(d?.options.subjects || []).map((x) => ({ value: x.id, label: x.name }))} /></Field>
              <Field label="Class"><Select aria-label="Class" value={f.classId} onChange={(e) => set({ classId: e.target.value })} placeholder="All classes" options={(d?.options.classes || []).map((x) => ({ value: x.id, label: x.name }))} /></Field>
              <Field label="Class teachers"><Select aria-label="Class teachers" value={f.classTeacher} onChange={(e) => set({ classTeacher: e.target.value })} placeholder="Everyone" options={[{ value: 'yes', label: 'Only class teachers' }]} /></Field>
            </>}
            {tab === 'office' && <Field label="Desk"><Select aria-label="Desk" value={f.desk} onChange={(e) => set({ desk: e.target.value })} placeholder="All desks" options={(d?.options.desks || []).map((x) => ({ value: x, label: x }))} /></Field>}
            {tab === 'non_teaching' && <Field label="Attendance desk"><Select aria-label="Attendance desk" value={f.attendanceDesk} onChange={(e) => set({ attendanceDesk: e.target.value })} placeholder="Everyone" options={[{ value: 'yes', label: 'Can mark attendance' }]} /></Field>}
            {tab === 'transport' && <>
              <Field label="Bus"><Select aria-label="Bus" value={f.bus} onChange={(e) => set({ bus: e.target.value })} placeholder="All" options={[{ value: 'on', label: 'On a bus' }, { value: 'off', label: 'Not on a bus' }]} /></Field>
              <Field label="Licence"><Select aria-label="Licence" value={f.licence} onChange={(e) => set({ licence: e.target.value })} placeholder="All" options={[{ value: 'expired', label: 'Expired' }, { value: 'expiring', label: 'Expires in 30 days' }, { value: 'missing', label: 'Driver without a date' }]} /></Field>
            </>}
            {tab !== 'transport' && <Field label="Sign-in"><Select aria-label="Sign-in" value={f.login} onChange={(e) => set({ login: e.target.value })} placeholder="All" options={[{ value: 'has', label: 'Has a login' }, { value: 'none', label: 'No login' }]} /></Field>}
            <Field label="Show"><Select aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })} options={[{ value: 'active', label: 'Working now' }, { value: 'inactive', label: 'No longer working' }, { value: 'all', label: 'Everyone' }]} /></Field>
          </FilterMenu>
          {tab !== 'all' && <div style={{ marginLeft: 'auto' }}><Link className="btn" to={MANAGE[tab].to}>{MANAGE[tab].label} →</Link></div>}
        </div>
      </Card>
      <Card flush>
        <Async state={list} empty={<Empty title="No employees match" />}>{(x) => (x.items.length ? (
          <>
            <p className="small muted" style={{ padding: '10px 18px 0' }}>{x.total.toLocaleString('en-IN')} {x.total === 1 ? 'person' : 'people'}{x.total > x.items.length ? `, showing the first ${x.items.length}` : ''}.</p>
            <DataTable rows={x.items} rowKey="id" onRowClick={open} columns={[
              { label: 'Name', sort: (e) => e.name, render: (e) => <><b>{e.name}</b><div className="small muted">{e.code}</div></> },
              { label: 'Designation', sort: (e) => e.designation, render: (e) => <>{e.designation}{e.desk && <div className="small muted">{e.desk} desk</div>}</> },
              { label: 'Group', sort: (e) => e.category, render: (e) => <Badge tone={KIND_TONE[e.category]}>{KIND_LABEL[e.category]}</Badge> },
              ...(tab === 'teaching' ? [{ label: 'Teaches', sort: (e) => (e.subjects || []).join(), render: (e) => (e.subjects?.length ? <>{e.subjects.join(', ')}<div className="small muted">{e.classes.join(', ')}{e.classTeacherOf ? ` · class teacher of ${e.classTeacherOf}` : ''}</div></> : <span className="muted">—</span>) }] : []),
              { label: 'Phone', sort: (e) => e.phone || '', render: (e) => e.phone || '—' },
              ...(tab === 'transport' || tab === 'all' ? [{ label: 'On bus', sort: (e) => e.bus || '', render: (e) => e.bus || <span className="muted">—</span> }] : []),
              ...(tab === 'transport' ? [{ label: 'Licence', sort: (e) => e.licenseExpiry || '', render: (e) => (e.licenseExpiry ? fmtDate(e.licenseExpiry, true) : <span className="muted">—</span>) }] : [{ label: 'Sign-in', render: (e) => (e.hasLogin ? <><Badge tone="green">Has login</Badge>{e.canMarkAttendance && <div><Badge tone="blue">Attendance desk</Badge></div>}</> : <span className="muted">None</span>) }]),
              { label: 'Joined', sort: (e) => e.joiningDate || '', render: (e) => fmtDate(e.joiningDate, true) },
              { label: 'Status', sort: (e) => e.status, render: (e) => <Badge tone={e.status === 'active' ? 'green' : ''}>{e.status === 'active' ? 'Working' : 'Left'}</Badge> },
            ]} />
          </>
        ) : <Empty title="No employees match">Try clearing a filter.</Empty>)}</Async>
      </Card>
      <p className="muted small">Click a person to open the page where they are managed. Teachers have their own detail page; the other kinds are managed from the list linked above the table.</p>
    </div>
  );
}
