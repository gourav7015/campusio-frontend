import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Button, Card, DataTable, Empty, PageHeader, Select, Tabs, fmtDate, label, statusTone } from '../../components/ui.jsx';

/**
 * History, kept apart from the live school. The rest of the portal always shows the current session; old sessions are read here and only here.
 * Every request names the year it wants, so nothing on this page can change what the dashboard or any other page shows.
 */
export default function PastSessions() {
  const years = useApi('/api/school/years');
  const [params, setParams] = useSearchParams();
  const past = useMemo(() => (years.data || []).filter((y) => !y.isCurrent), [years.data]);
  const yearId = params.get('year') || past[0]?._id || '';
  const year = past.find((y) => y._id === yearId);
  const [tab, setTab] = useState('classes');
  useEffect(() => { if (!params.get('year') && past[0]) setParams({ year: past[0]._id }, { replace: true }); }, [past, params, setParams]);

  return (
    <div className="stack">
      <PageHeader title="Past sessions" subtitle="Look back at an earlier academic year. This is a read-only record: the dashboard and every other page always show the current session."
        actions={past.length > 0 && <Select value={yearId} onChange={(e) => setParams({ year: e.target.value })} aria-label="Past session" options={past.map((y) => ({ value: y._id, label: `${y.name}${y.status === 'closed' ? ' (closed)' : ''}` }))} />} />
      <Async state={years} empty={null}>{() => !past.length ? (
        <Card><Empty title="No past sessions yet">When a year ends and the next one begins, the earlier year is kept here for reference.</Empty></Card>
      ) : year && (
        <>
          <div className="alert" role="note">You are looking at <b>{year.name}</b> ({fmtDate(year.startDate, true)} to {fmtDate(year.endDate, true)}). Nothing here can be changed.</div>
          <Tabs tabs={[['classes', 'Classes and students'], ['exams', 'Exams and results']]} value={tab} onChange={setTab} />
          {tab === 'classes' ? <ClassesTab key={year._id} year={year} /> : <ExamsTab key={year._id} year={year} />}
        </>
      )}</Async>
    </div>
  );
}

function ClassesTab({ year }) {
  const sections = useApi('/api/school/sections', { yearId: year._id });
  const classes = useApi('/api/school/classes');
  const [open, setOpen] = useState(null);
  const name = (id) => (classes.data || []).find((c) => c._id === id)?.name || '';
  const rows = (sections.data || []).map((s) => ({ ...s, className: name(s.classId) }));
  const total = rows.reduce((n, s) => n + (s.studentCount || 0), 0);
  return (
    <div className="grid g-side">
      <Card title={`Sections in ${year.name}`} flush>
        <Async state={sections} empty={<Empty title="No sections were recorded in this session" />}>{() => rows.length ? (
          <>
            <p className="small muted" style={{ padding: '10px 18px 0' }}>{rows.length} sections · {total.toLocaleString('en-IN')} students. Choose a section to see its students.</p>
            <DataTable rows={rows} onRowClick={setOpen} columns={[
              { label: 'Class and section', render: (s) => <b>{s.className} {s.name}</b> }, { label: 'Room', key: 'room' },
              { label: 'Students', render: (s) => (s.studentCount || 0).toLocaleString('en-IN') }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{label(s.status)}</Badge> },
            ]} />
          </>
        ) : <Empty title="No sections were recorded in this session" />}</Async>
      </Card>
      <Card title={open ? `${open.className} ${open.name}: students` : 'Students'} flush>
        {open ? <Roster key={open._id} section={open} year={year} /> : <Empty title="Choose a section">Its students, attendance and latest score in {year.name} appear here.</Empty>}
      </Card>
    </div>
  );
}

function Roster({ section, year }) {
  const q = useApi(`/api/school/sections/${section._id}/students`, { yearId: year._id });
  return (
    <Async state={q} empty={<Empty title="No students were recorded in this section" />}>{(d) => (d.length ? (
      <DataTable rows={d} columns={[
        { label: 'Roll', render: (s) => s.rollNo ?? '—' }, { label: 'Student', render: (s) => <b>{s.name}</b> }, { label: 'Admission no.', key: 'admissionNo' },
        { label: 'Attendance', render: (s) => (s.attendance == null ? '—' : `${s.attendance}%`) }, { label: 'Latest score', render: (s) => (s.latestScore == null ? '—' : `${s.latestScore}%`) },
      ]} />
    ) : <Empty title="No students were recorded in this section" />)}</Async>
  );
}

function ExamsTab({ year }) {
  const exams = useApi('/api/school/exams', { yearId: year._id });
  const [open, setOpen] = useState(null);
  return (
    <div className="stack">
      <Card title={`Exams in ${year.name}`} flush>
        <Async state={exams} empty={<Empty title="No exams were recorded in this session" />}>{(d) => (d.length ? (
          <DataTable rows={d} onRowClick={setOpen} columns={[
            { label: 'Exam', render: (e) => <b>{e.name}</b> }, { label: 'Type', render: (e) => label(e.type) },
            { label: 'Dates', render: (e) => `${fmtDate(e.startDate, true)} to ${fmtDate(e.endDate, true)}` }, { label: 'Classes', render: (e) => `${e.classNames?.length || 0}` },
            { label: 'Status', render: (e) => <Badge tone={statusTone(e.status)}>{label(e.status)}</Badge> },
          ]} />
        ) : <Empty title="No exams were recorded in this session" />)}</Async>
      </Card>
      {open && <Results exam={open} year={year} onClose={() => setOpen(null)} />}
    </div>
  );
}

const SHOWN = 300;
function Results({ exam, year, onClose }) {
  const q = useApi(`/api/school/exams/${exam._id}/results`, { yearId: year._id });
  return (
    <Card title={`${exam.name}: results`} action={<Button size="sm" onClick={onClose}>Close</Button>} flush>
      <Async state={q} empty={<Empty title="No results were published for this exam" />}>{(d) => (d.length ? (
        <>
          {d.length > SHOWN && <p className="small muted" style={{ padding: '10px 18px 0' }}>Showing the first {SHOWN} of {d.length.toLocaleString('en-IN')} results.</p>}
          <DataTable rows={d.slice(0, SHOWN)} columns={[
            { label: 'Student', render: (r) => <b>{r.student}</b> }, { label: 'Admission no.', key: 'admissionNo' },
            { label: 'Percentage', render: (r) => (r.percentage == null ? '—' : `${r.percentage}%`) }, { label: 'Grade', key: 'grade' }, { label: 'Result', render: (r) => label(r.resultStatus || '') },
          ]} />
        </>
      ) : <Empty title="No results were published for this exam" />)}</Async>
    </Card>
  );
}
