import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useDialogs } from '../../design/ui';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, Empty, Field, Input, PageHeader, Select, Stat, Tabs, useAction, fmtDate } from '../../components/ui.jsx';
import FilterMenu from '../../components/FilterMenu.jsx';
import StaffRegister from '../../components/StaffRegister.jsx';
import { RegisterModal } from './Operations.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { sectionKey } from '../../utils/grades.js';

const today = () => new Date().toLocaleDateString('en-CA');
const STAFF_TABS = [['teachers', 'Teaching staff'], ['general', 'Non-teaching staff'], ['office', 'Officers (finance, library, transport)'], ['transport', 'Transport crew']];

/**
 * Attendance of everyone, in one place: the students' daily registers (every class and section) and the staff registers (teaching, non-teaching,
 * officers, transport crew). Most schools take attendance from the class teachers' and the Staff portal's desks, so this lives under Administration:
 * the School Admin and sub-admins look here to see, filter and correct.
 */
export default function AttendanceHub() {
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const sub = user?.adminLevel === 'sub'; const may = (k) => !sub || (user.permissions || []).includes(k);
  const tabs = [...(may('attendance') ? [['students', 'Students']] : []), ...(may('staff_attendance') ? STAFF_TABS : [])];
  if (!tabs.length) return <Navigate to="/admin" replace />;
  const tab = tabs.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : tabs[0][0];
  return (
    <div className="stack">
      <PageHeader title="Attendance" subtitle="Students and staff in one place. Filter by date, class, section or group; open a register to read it, or to correct it with a recorded reason." />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'students' && <StudentAttendance />}
      {tab === 'transport'
        ? <><StaffRegister key="transport" base="/api/school/transport/attendance" group="transport" canEdit={false} /><p className="muted small">Drivers, conductors and other transport crew are marked by the Transport officer. You can read their register here.</p></>
        : STAFF_TABS.some(([k]) => k === tab) && <StaffRegister key={tab} base="/api/school/staff-attendance" group={tab} />}
    </div>
  );
}

/** Every section's register for a day, with filters. */
function StudentAttendance() {
  const dlg = useDialogs();
  const [date, setDate] = useState(today());
  const ov = useApi('/api/school/attendance/overview', { date });
  const queries = useApi('/api/school/attendance/queries', { status: 'open' });
  const [open, setOpen] = useState(null);
  const [run] = useAction();
  const [f, setF] = useState({ classId: '', section: '', status: '', absent: '', q: '' });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const rows = useMemo(() => [...(ov.data?.rows || [])].sort((a, b) => sectionKey(a.className, a.section).localeCompare(sectionKey(b.className, b.section))), [ov.data]);
  const classes = useMemo(() => [...new Map(rows.map((r) => [r.className, r.className])).values()], [rows]);
  const sections = useMemo(() => [...new Set(rows.filter((r) => !f.classId || r.className === f.classId).map((r) => r.section))].sort(), [rows, f.classId]);
  const shown = rows.filter((r) => (!f.classId || r.className === f.classId) && (!f.section || r.section === f.section) && (!f.status || (f.status === 'none' ? !r.status || r.status === 'not_marked' : r.status === f.status))
    && (!f.absent || (f.absent === 'any' ? (r.totals?.absent || 0) > 0 : (r.totals?.absent || 0) >= Number(f.absent))) && (!f.q.trim() || `${r.className} ${r.section}`.toLowerCase().includes(f.q.trim().toLowerCase())));
  return (
    <div className="stack">
      <Card>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <Field label="Date"><Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-label="Date" /></Field>
          <Field label="Search"><Input aria-label="Search class or section" placeholder="e.g. Class 8 or A" value={f.q} onChange={(e) => set({ q: e.target.value })} /></Field>
          <FilterMenu count={[f.classId, f.section, f.status, f.absent].filter(Boolean).length} onClear={() => setF({ classId: '', section: '', status: '', absent: '', q: f.q })}>
            <Field label="Class"><Select aria-label="Class" value={f.classId} onChange={(e) => set({ classId: e.target.value, section: '' })} placeholder="All classes" options={classes.map((c) => ({ value: c, label: c }))} /></Field>
            <Field label="Section"><Select aria-label="Section" value={f.section} onChange={(e) => set({ section: e.target.value })} placeholder="All sections" options={sections.map((x) => ({ value: x, label: x }))} /></Field>
            <Field label="Register"><Select aria-label="Register status" value={f.status} onChange={(e) => set({ status: e.target.value })} placeholder="Any" options={[{ value: 'submitted', label: 'Submitted' }, { value: 'draft', label: 'Draft (not submitted)' }, { value: 'none', label: 'Not started' }]} /></Field>
            <Field label="Absentees"><Select aria-label="Absentees" value={f.absent} onChange={(e) => set({ absent: e.target.value })} placeholder="Any" options={[{ value: 'any', label: 'At least one absent' }, { value: '3', label: '3 or more absent' }, { value: '5', label: '5 or more absent' }]} /></Field>
          </FilterMenu>
        </div>
      </Card>
      <Async state={ov}>{(d) => (<>
        {!d.working && <div className="alert info">This is not a working day for the school.</div>}
        <div className="grid g4">
          <Stat value={`${d.totals.submitted}/${d.totals.sections}`} label="Registers submitted" tone={d.totals.pending ? 'amber' : 'green'} />
          <Stat value={(d.totals.present + d.totals.late + (d.totals.half_day || 0)).toLocaleString('en-IN')} label="Present" tone="green" sub={`${d.totals.late} late${d.totals.half_day ? `, ${d.totals.half_day} half day` : ''}`} />
          <Stat value={d.totals.absent.toLocaleString('en-IN')} label="Absent" tone={d.totals.absent ? 'red' : 'green'} />
          <Stat value={(d.totals.leave + d.totals.excused).toLocaleString('en-IN')} label="On leave" />
        </div>
        <Card title={`Sections (${shown.length}${shown.length !== rows.length ? ` of ${rows.length}` : ''}) — click a section to open its register`} flush>
          <DataTable rows={shown} rowKey="sectionId" empty="No section matches these filters" onRowClick={setOpen} columns={[
            { label: 'Section', sort: (r) => sectionKey(r.className, r.section), render: (r) => <b>{r.className} {r.section}</b> },
            { label: 'Register', sort: (r) => r.status || '', render: (r) => <Badge tone={r.status === 'submitted' ? 'green' : r.status === 'draft' ? 'amber' : ''}>{r.status === 'submitted' ? 'Submitted' : r.status === 'draft' ? 'Draft' : 'Not started'}</Badge> },
            { label: 'Present', sort: (r) => (r.totals ? r.totals.present + r.totals.late : -1), render: (r) => (r.totals ? r.totals.present + r.totals.late : '—') },
            { label: 'Absent', sort: (r) => r.totals?.absent ?? -1, render: (r) => (r.totals?.absent ? <Badge tone="red">{r.totals.absent}</Badge> : r.totals ? 0 : '—') },
            { label: 'Leave', sort: (r) => (r.totals ? r.totals.leave + r.totals.excused : -1), render: (r) => (r.totals ? r.totals.leave + r.totals.excused : '—') },
            { label: '', render: (r) => <Button size="sm" onClick={() => setOpen(r)}>Open register</Button> },
          ]} />
        </Card>
      </>)}</Async>
      <Card title="Open attendance queries from students" flush>
        <Async state={queries} empty={<div className="empty">No open queries</div>}>{(qs) => (qs.length ? <DataTable rows={qs} columns={[
          { label: 'Student', render: (q) => <b>{q.studentId?.name}</b> }, { label: 'Date', render: (q) => fmtDate(q.date, true) }, { label: 'Message', key: 'message' },
          { label: '', render: (q) => <Button size="sm" onClick={async () => { const response = await dlg.prompt('Reply to the student', { title: 'Answer the query', required: true }); if (!response) return; await run(() => post(`/api/school/attendance/queries/${q._id}/resolve`, { status: 'resolved', response }), 'Answered'); queries.reload(); }}>Answer</Button> },
        ]} /> : <Empty title="No open queries" />)}</Async>
      </Card>
      {open && <RegisterModal sectionId={open.sectionId} title={`${open.className} ${open.section}`} date={date} onClose={() => { setOpen(null); ov.reload(); }} />}
    </div>
  );
}
