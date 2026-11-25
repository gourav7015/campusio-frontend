import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Button, Card, DataTable, Empty, PageHeader, Select, Tabs, fmtDate, label, statusTone } from '../../components/ui.jsx';
import ExamAnalysis from '../../components/ExamAnalysis.jsx';
import ClassBorrowers from '../../components/ClassBorrowers.jsx';
import { Overview, SectionStudents, HomeworkDay } from '../admin/ClassHub.jsx';
import { OfficeProvider, CLASS_OFFICE } from '../../context/ClassOffice.jsx';
import { Attendance } from './Teacher1.jsx';
import { Performance } from './Teacher2.jsx';

const T = '/api/teacher';
const EDITABLE = [undefined, 'draft', 'returned', 'not_started'];

/**
 * "My class": the class teacher sees his own class exactly as the school office does (overview, every student with their full file, homework, exam analysis, library),
 * read-only and only for his own sections, plus what he does himself: the daily register, the monitors, the marks of every subject and the class results.
 */
export default function MyClass() {
  const classes = useApi(`${T}/classes`);
  const mine = (classes.data || []).filter((c) => c.isClassTeacher);
  const [sp, setSp] = useSearchParams();
  const sid = mine.find((c) => c.sectionId === sp.get('section'))?.sectionId || mine[0]?.sectionId || '';
  const tab = sp.get('tab') || 'overview';
  const cur = mine.find((c) => c.sectionId === sid);
  const go = (t, section = sid) => setSp({ ...(section ? { section } : {}), tab: t });
  const TABS = [['overview', 'Overview'], ['students', 'Students'], ['attendance', 'Attendance'], ['homework', 'Homework'], ['exams', 'Exam analysis'], ['marks', 'Enter marks'], ['report', 'Class results'], ['library', 'Library']];
  return (
    <OfficeProvider value={CLASS_OFFICE}>
      <div className="stack">
        <PageHeader title="My class" subtitle={cur ? `${cur.className} ${cur.section} · ${cur.students} students · you are the class teacher, so you see this class as the school office does and can open any student's full file` : 'The class you are the class teacher of'}
          actions={mine.length > 1 && <Select aria-label="Class and section" value={sid} onChange={(e) => go(tab, e.target.value)} options={mine.map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))} />} />
        {classes.loading ? null : !mine.length ? <Empty title="You are not a class teacher">When the school makes you the class teacher of a section, it appears here with its register, students, results and marks.</Empty> : (
          <>
            <Tabs tabs={TABS} value={tab} onChange={(t) => go(t)} />
            {tab === 'overview' && <OfficeOverview sid={sid} go={go} />}
            {tab === 'students' && <SectionStudents sectionId={sid} />}
            {tab === 'attendance' && <Attendance sectionId={sid} embedded />}
            {tab === 'homework' && <HomeworkDay sectionId={sid} />}
            {tab === 'exams' && <ExamAnalysis sectionId={sid} />}
            {tab === 'marks' && <ClassMarks sid={sid} />}
            {tab === 'report' && <Performance sectionId={sid} embedded />}
            {tab === 'library' && <ClassBorrowers base={CLASS_OFFICE.library} sectionId={sid} />}
          </>
        )}
      </div>
    </OfficeProvider>
  );
}

function OfficeOverview({ sid, go }) {
  const ov = useApi(`${CLASS_OFFICE.api}/sections/${sid}/insight`);
  return (
    <Async state={ov}>{(o) => (
      <div className="stack">
        <div className="row wrap" style={{ gap: 8 }}>
          <Button variant="primary" onClick={() => go('attendance')}>{o.attendanceToday?.status === 'submitted' ? "Open today's register" : 'Take attendance now'}</Button>
          <Button onClick={() => go('students')}>Students and monitors</Button>
          <Button onClick={() => go('marks')}>Enter marks</Button>
          <Button onClick={() => go('report')}>Class results</Button>
        </div>
        <Overview o={o} go={go} />
      </div>
    )}</Async>
  );
}

/** Every subject's marks sheet for this class, not just the ones the class teacher teaches. */
function ClassMarks({ sid }) {
  const list = useApi(`${T}/exams`);
  const nav = useNavigate();
  const rows = useMemo(() => (list.data || []).filter((r) => r.sectionId === sid), [list.data, sid]);
  const done = rows.filter((r) => !EDITABLE.includes(r.status)).length;
  return (
    <Card flush title="Marks of every subject in this class" action={<Link className="btn sm" to="/teacher/exams">All examinations and marks</Link>}>
      <div className="card-b small muted">{rows.length ? `${done} of ${rows.length} subject sheets are submitted. As the class teacher you can enter or correct the marks of any subject here, including subjects another teacher teaches.` : ''}</div>
      <Async state={list} empty={<Empty title="No examinations for this class yet">They appear here once the school schedules one.</Empty>}>{() => (
        <DataTable rows={rows} rowKey={(r) => `${r.examSubjectId}-${r.sectionId}`} empty="No examinations for this class yet" columns={[
          { label: 'Examination', render: (r) => <><b>{r.exam}</b> <Badge>{label(r.type)}</Badge></> },
          { label: 'Subject', render: (r) => <>{r.subject} {r.viaClassTeacher && <Badge>Other teacher's subject</Badge>}</> },
          { label: 'Date', render: (r) => (r.date ? fmtDate(r.date, true) : '—') },
          { label: 'Deadline', render: (r) => <>{r.deadline ? fmtDate(r.deadline) : '—'} {r.overdue && <Badge tone="red">Overdue</Badge>}</> },
          { label: 'Marks', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status || 'not_started')}</Badge> },
          { label: '', render: (r) => <Button size="sm" variant={EDITABLE.includes(r.status) ? 'primary' : undefined} onClick={() => nav(`/teacher/exams/${r.examSubjectId}/${r.sectionId}`)}>{EDITABLE.includes(r.status) ? 'Enter marks' : 'View'}</Button> },
        ]} />
      )}</Async>
    </Card>
  );
}
