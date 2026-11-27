import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Async, Spinner, Button, Card, Empty, PageHeader, Select, Stat, Tabs } from '../../components/ui.jsx';
import ExamAnalysis from '../../components/ExamAnalysis.jsx';
import ClassBorrowers from '../../components/ClassBorrowers.jsx';
import MarksByExam from '../../components/MarksByExam.jsx';
import { Overview, SectionStudents, HomeworkDay } from '../admin/ClassHub.jsx';
import { OfficeProvider, CLASS_OFFICE } from '../../context/ClassOffice.jsx';
import { Attendance } from './Teacher1.jsx';
import { ClassPeriods } from './Teacher3.jsx';
import { ClassAttendanceTabs } from '../../components/ClassPeriodSummary.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Performance } from './Teacher2.jsx';

const T = '/api/teacher';
const EDITABLE = [undefined, 'draft', 'returned', 'not_started'];

/**
 * "My class": the class teacher sees his own class exactly as the school office does (overview, every student with their full file, homework, exam analysis, library),
 * read-only and only for his own sections, plus what he does himself: the daily register, the monitors, the marks of every subject and the class results.
 */
export default function MyClass() {
  const classes = useApi(`${T}/classes`);
  const { user } = useAuth();
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
        {classes.loading && !classes.data ? <Spinner kind="cards" /> : !mine.length ? <Empty title="You are not a class teacher">When the school makes you the class teacher of a section, it appears here with its register, students, results and marks.</Empty> : (
          <>
            <Tabs tabs={TABS} value={tab} onChange={(t) => go(t)} />
            {tab === 'overview' && <OfficeOverview sid={sid} go={go} />}
            {tab === 'students' && <SectionStudents sectionId={sid} />}
            {tab === 'attendance' && (user?.periodWise
              ? <ClassAttendanceTabs sectionId={sid}><ClassPeriods sectionId={sid}>{(date) => <Attendance sectionId={sid} embedded date={date} />}</ClassPeriods></ClassAttendanceTabs>
              : <ClassAttendanceTabs sectionId={sid} periodWise={false}><Attendance sectionId={sid} embedded /></ClassAttendanceTabs>)}
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
          <Button variant="primary" onClick={() => go('attendance')}>{o.periodWise ? "See today's periods" : o.attendanceToday?.status === 'submitted' ? "Open today's register" : 'Take attendance now'}</Button>
          <Button onClick={() => go('students')}>Students and monitors</Button>
          <Button onClick={() => go('marks')}>Enter marks</Button>
          <Button onClick={() => go('report')}>Class results</Button>
        </div>
        <Overview o={o} go={go} />
      </div>
    )}</Async>
  );
}

/**
 * The marks of this class, examination by examination. The class teacher enters marks only for the subjects he teaches himself; for every other subject he
 * can see who teaches it, whether it has been submitted and what was entered, but not change it.
 */
function ClassMarks({ sid }) {
  const list = useApi(`${T}/exams`, { classView: 1 }); // this page alone also lists the other subjects of his class, to follow them
  const nav = useNavigate();
  const [exam, setExam] = useState(''); const [mineOnly, setMineOnly] = useState(false);
  const all = useMemo(() => (list.data || []).filter((r) => r.sectionId === sid), [list.data, sid]);
  const exams = useMemo(() => {
    const by = new Map();
    for (const r of all) { if (!by.has(r.examId)) by.set(r.examId, { id: r.examId, name: r.exam, type: r.type, rows: [] }); by.get(r.examId).rows.push(r); }
    return [...by.values()].map((e) => ({ ...e, rows: e.rows.sort((a, b) => Number(b.canEnter) - Number(a.canEnter) || (a.date || '9999').localeCompare(b.date || '9999') || a.subject.localeCompare(b.subject)), first: e.rows.map((r) => r.date).filter(Boolean).sort()[0] || '9999' }))
      .sort((a, b) => a.first.localeCompare(b.first));
  }, [all]);
  const mine = all.filter((r) => r.canEnter);
  const toEnter = mine.filter((r) => EDITABLE.includes(r.status)).length;
  return (
    <div className="stack">
      <Async skeleton="datatable" state={list} empty={<Empty title="No examinations for this class yet">They appear here once the school schedules one.</Empty>}>{() => (all.length ? (
        <>
          <div className="grid g4">
            <Stat value={toEnter} label="Your sheets to enter" tone={toEnter ? 'amber' : 'green'} sub={mine.length ? `${mine.length - toEnter} of ${mine.length} of yours submitted` : 'You teach no subject in this class'} />
            <Stat value={`${all.filter((r) => !EDITABLE.includes(r.status)).length} of ${all.length}`} label="Sheets submitted, whole class" sub={`${exams.length} ${exams.length === 1 ? 'examination' : 'examinations'}`} />
          </div>
          <div className="row between wrap">
            <span className="muted small" style={{ maxWidth: 640 }}>You enter marks for the subjects you teach. For the other subjects you can see who teaches them and whether their marks are in, but only that subject's teacher can enter or change them.</span>
            <div className="row" style={{ gap: 8 }}>
              <Select aria-label="Examination" value={exam} onChange={(e) => setExam(e.target.value)} placeholder="All examinations" options={exams.map((e) => ({ value: e.id, label: e.name }))} />
              <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> My subjects only</label>
              <Link className="btn sm" to="/teacher/exams">All examinations and marks</Link>
            </div>
          </div>
          {(() => {
            const rows = all.filter((r) => (!exam || r.examId === exam) && (!mineOnly || r.canEnter));
            return rows.length ? <MarksByExam showTeacher rows={rows} actions={(r) => {
              const enter = r.canEnter && EDITABLE.includes(r.status);
              return <Button size="sm" variant={enter ? 'primary' : undefined} onClick={() => nav(`/teacher/exams/${r.examSubjectId}/${r.sectionId}`)}>{enter ? (r.status === 'draft' ? 'Continue' : 'Enter marks') : 'View'}</Button>;
            }} /> : <Card><Empty title="Nothing in this view" /></Card>;
          })()}
        </>) : <Empty title="No examinations for this class yet">They appear here once the school schedules one.</Empty>)}</Async>
    </div>
  );
}
