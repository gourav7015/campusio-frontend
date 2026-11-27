import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useDialogs } from '../../design/ui';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate } from '../../components/ui.jsx';
import { DayGrid } from '../../components/PeriodAttendance.jsx';
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
  const shown = rows.filter((r) => (!f.classId || r.className === f.classId) && (!f.section || r.section === f.section) && (!f.status || (f.status === 'none' ? !r.status || r.status === 'not_marked' : f.status === 'draft' ? ['draft', 'in_progress'].includes(r.status) : r.status === f.status))
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
            <Field label="Register"><Select aria-label="Register status" value={f.status} onChange={(e) => set({ status: e.target.value })} placeholder="Any" options={[{ value: 'submitted', label: 'Submitted' }, { value: 'draft', label: 'In progress (not complete)' }, { value: 'none', label: 'Not started' }]} /></Field>
            <Field label="Absentees"><Select aria-label="Absentees" value={f.absent} onChange={(e) => set({ absent: e.target.value })} placeholder="Any" options={[{ value: 'any', label: 'At least one absent' }, { value: '3', label: '3 or more absent' }, { value: '5', label: '5 or more absent' }]} /></Field>
          </FilterMenu>
        </div>
      </Card>
      <Async skeleton="stats" state={ov}>{(d) => (<>
        {!d.working && <div className="alert info">This is not a working day for the school.</div>}
        {d.periodWise && <div className="alert info">This school takes attendance period by period. A class is complete when every one of its periods is submitted; the day is then worked out from them.</div>}
        <div className="grid g4">
          <Stat value={`${d.totals.submitted}/${d.totals.sections}`} label={d.periodWise ? 'Classes complete' : 'Registers submitted'} tone={d.totals.pending ? 'amber' : 'green'} />
          <Stat value={(d.totals.present + d.totals.late + (d.totals.half_day || 0)).toLocaleString('en-IN')} label="Present" tone="green" sub={`${d.totals.late} late${d.totals.half_day ? `, ${d.totals.half_day} half day` : ''}`} />
          <Stat value={d.totals.absent.toLocaleString('en-IN')} label="Absent" tone={d.totals.absent ? 'red' : 'green'} />
          <Stat value={(d.totals.leave + d.totals.excused).toLocaleString('en-IN')} label="On leave" />
        </div>
        <section aria-label="Sections" className="stack-sm">
          <div className="row" style={{ justifyContent: 'space-between' }}><b>Sections ({shown.length}{shown.length !== rows.length ? ` of ${rows.length}` : ''})</b><span className="muted small">Waiting registers come first. Open one to read it or correct it.</span></div>
          {shown.length === 0 ? <Card><Empty title="No section matches these filters" /></Card> : (
            <div className="sec-board">
              {[...shown].sort((x, y) => (y.status === 'submitted' ? 0 : 1) - (x.status === 'submitted' ? 0 : 1)).map((r) => {
                const done = r.status === 'submitted'; const here = r.totals ? r.totals.present + r.totals.late : 0; const all = r.totals ? here + r.totals.absent + r.totals.leave + r.totals.excused + (r.totals.half_day || 0) : 0;
                const pw = d.periodWise && r.periods; const first = pw && r.periods.missing[0];
                return (
                  <div key={r.sectionId} role="group" aria-label={`${r.className} ${r.section}`} className={`sec-card${done ? '' : ' wait'}`} onClick={(e) => { if (!e.target.closest('button, a')) setOpen(r); }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}><b className="sec-name">{r.className} {r.section}</b><Badge tone={done ? 'green' : r.status === 'draft' || r.status === 'in_progress' ? 'amber' : ''}>{done ? (pw ? 'Complete' : 'Submitted') : r.status === 'draft' ? 'Draft' : r.status === 'in_progress' ? 'In progress' : 'Not started'}</Badge></div>
                    {pw && <>
                      <div className="pg-prog" role="img" aria-label={`${r.periods.submitted} of ${r.periods.expected} periods submitted`}>{Array.from({ length: r.periods.expected }, (_, i) => <i key={i} className={i < r.periods.submitted ? '' : 'e'} />)}</div>
                      <div className="small muted">{r.periods.expected ? `${r.periods.submitted} of ${r.periods.expected} periods marked` : 'No lessons on the timetable this day'}</div>
                      {first && <div className="small muted">Waiting: {first.period}{first.subject ? ` ${first.subject}` : ''}{first.teacher ? `, ${first.teacher}` : ''}{r.periods.missing.length > 1 ? ` and ${r.periods.missing.length - 1} more` : ''}</div>}
                    </>}
                    {!pw && (r.totals ? (<>
                      <div className="sec-bar" role="img" aria-label={`${here} of ${all} present`}><i style={{ width: `${all ? (here / all) * 100 : 0}%` }} /></div>
                      <div className="small muted">{here} present{r.totals.absent ? <> · <b style={{ color: 'rgb(var(--c-danger-ink))' }}>{r.totals.absent} absent</b></> : ' · none absent'}{r.totals.leave + r.totals.excused ? ` · ${r.totals.leave + r.totals.excused} on leave` : ''}</div>
                    </>) : <div className="small muted">No register yet today</div>)}
                    {pw && r.totals && <div className="small muted">{here} present{r.totals.absent ? <> · <b style={{ color: 'rgb(var(--c-danger-ink))' }}>{r.totals.absent} absent</b></> : ' · none absent'}</div>}
                    <Button size="sm" onClick={() => setOpen(r)}>{pw ? 'Open day' : 'Open register'}</Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>)}</Async>
      <Card title="Open attendance queries from students" flush>
        <Async skeleton="datatable" state={queries} empty={<div className="empty">No open queries</div>}>{(qs) => (qs.length ? <DataTable rows={qs} columns={[
          { label: 'Student', render: (q) => <b>{q.studentId?.name}</b> }, { label: 'Date', render: (q) => fmtDate(q.date, true) }, { label: 'Message', key: 'message' },
          { label: '', render: (q) => <Button size="sm" onClick={async () => { const response = await dlg.prompt('Reply to the student', { title: 'Answer the query', required: true }); if (!response) return; await run(() => post(`/api/school/attendance/queries/${q._id}/resolve`, { status: 'resolved', response }), 'Answered'); queries.reload(); }}>Answer</Button> },
        ]} /> : <Empty title="No open queries" />)}</Async>
      </Card>
      {open && (ov.data?.periodWise
        ? <Modal wide title={`${open.className} ${open.section} · ${fmtDate(date, true)}`} onClose={() => { setOpen(null); ov.reload(); }}><DayGrid role="admin" sectionId={open.sectionId} date={date} /></Modal>
        : <RegisterModal sectionId={open.sectionId} title={`${open.className} ${open.section}`} date={date} onClose={() => { setOpen(null); ov.reload(); }} />)}
    </div>
  );
}
