import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post, put } from '../api/client.js';
import { Async, Badge, Button, Card, Empty, Field, Input, Modal, Select, useAction } from './ui.jsx';
import AttendanceRoster, { ReviewSubmit } from './AttendanceRoster.jsx';
import { STATUS_NAME } from './attendanceUi.jsx';

/**
 * Attendance period by period (the school's way of taking it when it is not "once a day").
 * Everything here appears only in a school that takes it that way:
 *   PeriodRegisterModal  one lesson's register (the same roster as the daily register), saved as a draft or submitted
 *   YourPeriods          a teacher's lessons for a day, each with Mark or Review
 *   DayGrid              one class, one day: students against periods and the day that was worked out (class teacher, School Admin)
 */
const T = '/api/teacher';
const SHORT = { present: 'P', absent: 'A', late: 'L', half_day: 'H', leave: 'V', excused: 'V' };
const MARKABLE = ['present', 'absent', 'late', 'leave'];
const todayStr = () => new Date().toLocaleDateString('en-CA');
const nowHHMM = () => new Date().toTimeString().slice(0, 5);
const word = (s) => STATUS_NAME[s] || s;

/** A period's status as a short letter in a coloured box, never colour alone (the word is in the label). */
export function Cell({ status, onClick, label }) {
  const s = status || 'none';
  const text = status ? SHORT[status] : '–';
  const name = `${label ? `${label}: ` : ''}${status ? word(status) : 'not marked yet'}`;
  return onClick
    ? <button type="button" className={`pg-cell ${s}`} aria-label={name} title={name} onClick={onClick}>{text}</button>
    : <span className={`pg-cell ${s}`} role="img" aria-label={name} title={name}>{text}</span>;
}

export function Legend() {
  return <div className="pg-legend"><span><b>P</b> present</span><span><b>A</b> absent</span><span><b>L</b> late</span><span><b>V</b> leave</span><span><b>–</b> not marked yet</span></div>;
}

export function PeriodRegisterModal({ entry, date, onClose, onSaved }) {
  const q = useApi(`${T}/period-attendance/register`, { entryId: entry.entryId, date });
  const [edits, setEdits] = useState({});
  const [review, setReview] = useState(false);
  const [run, busy] = useAction();
  const d = q.data;
  const people = (d?.students || []).map((s) => ({
    id: s.studentId, roll: s.rollNo, name: s.name, status: edits[s.studentId] ?? s.status ?? '',
    sub: s.earlier?.length ? s.earlier.map((e) => `${word(e.status)} in ${e.period}`).join(', ') : undefined,
  }));
  const entries = () => people.filter((p) => p.status).map((p) => ({ studentId: p.id, status: p.status }));
  const apply = (changes) => setEdits((e) => { const n = { ...e }; for (const c of changes) n[c.id] = c.status; return n; });
  const base = { entryId: entry.entryId, date };
  const title = d ? `${d.section.className} ${d.section.name} · ${d.period}${d.subject ? ` · ${d.subject}` : ''}` : `${entry.period || 'Period'}`;
  const done = () => { setReview(false); onSaved?.(); onClose(); };
  const submitted = d?.submitted;
  return (
    <Modal wide title={title} onClose={onClose}>
      <Async skeleton="roster" state={q}>{() => (
        <div className="stack">
          {d.blocked && <div className="alert info">Attendance can't be taken for this day: {d.blocked === 'future' ? 'it has not happened yet' : d.blocked}.</div>}
          {d.covering && <div className="alert info">You are covering this period.</div>}
          {submitted && !d.blocked && <div className="alert ok">This period is submitted. You can still change it: each change is kept in its history and the student's family is told.</div>}
          <AttendanceRoster people={people} editable={d.canEdit} requireAll statuses={MARKABLE} noun="student" onSet={apply}
            footer={d.canEdit && (submitted
              ? <Button variant="primary" loading={busy} disabled={!Object.keys(edits).length} onClick={async () => { const r = await run(() => post(`${T}/period-attendance/register/submit`, { ...base, entries: entries() }), (x) => (x.changed ? `Saved: ${x.changed} change(s)` : 'Nothing was changed')); if (r) done(); }}>Save changes</Button>
              : <>
                {Object.keys(edits).length > 0 && <span className="muted small">Unsaved changes</span>}
                <Button loading={busy} onClick={async () => { const r = await run(() => put(`${T}/period-attendance/register`, { ...base, entries: entries() }), 'Draft saved'); if (r) { q.reload(); onSaved?.(); } }}>Save draft</Button>
                <Button variant="primary" disabled={!people.length} onClick={() => setReview(true)}>Submit this period</Button></>)} />
          {review && <ReviewSubmit people={people} requireAll busy={busy} submitLabel="Submit this period" onClose={() => setReview(false)}
            onMarkRest={() => apply(people.filter((p) => !p.status).map((p) => ({ id: p.id, status: 'present' })))}
            note="Submitting locks this period. After that, a change is kept in its history and the family is told. The day is worked out from all the periods."
            onSubmit={async () => { const r = await run(() => post(`${T}/period-attendance/register/submit`, { ...base, entries: entries() }), (x) => `Submitted: ${x.absent} absent of ${x.total}`); if (r) done(); }} />}
        </div>
      )}</Async>
    </Modal>
  );
}

/** A teacher's own lessons for one day: what is marked, what is waiting, and a button to mark or review each. */
export function YourPeriods({ date, onChanged = undefined, empty = 'You have no periods on this day' }) {
  const q = useApi(`${T}/period-attendance`, { date });
  const [open, setOpen] = useState(null);
  const now = nowHHMM(); const isToday = date === todayStr();
  return (
    <>
      <Async skeleton="datatable" state={q}>{(d) => (!d.enabled
        ? <Empty title="Your school takes attendance once a day on this date">The class teacher takes one register for the whole day, so there is nothing for you to mark period by period.</Empty>
        : !d.periods.length ? <Empty title={empty} /> : (
          <div role="list" aria-label="Your periods">
            {d.periods.map((p) => (
              <div key={p.entryId} role="listitem" className="pg-row">
                <span className="pg-n" aria-hidden>{String(p.period).replace(/^Period\s*/i, 'P')}</span>
                <div className="pg-main"><b>{p.className} {p.section}{p.subject ? ` · ${p.subject}` : ''}</b>{p.covering && <> <Badge tone="blue">Covering</Badge></>}
                  <div className="small muted">{p.period} · {p.startTime}–{p.endTime}{isToday && !p.marked && p.startTime > now ? ` · starts at ${p.startTime}` : ''}</div></div>
                {p.submitted ? <Badge tone="green">Submitted{p.absent ? ` · ${p.absent} not here` : ''}</Badge> : p.status === 'draft' ? <Badge tone="amber">Draft</Badge> : <Badge>Not marked</Badge>}
                <Button size="sm" variant={p.submitted ? undefined : 'primary'} onClick={() => setOpen(p)}>{p.submitted ? 'Review' : 'Mark'}</Button>
              </div>
            ))}
          </div>))}</Async>
      {open && <PeriodRegisterModal entry={open} date={date} onClose={() => setOpen(null)} onSaved={() => { q.reload(); onChanged?.(); }} />}
    </>
  );
}

/** The School Admin changes one student's mark in one submitted period, with a reason. */
function CorrectModal({ target, onClose, onSave, busy }) {
  const [status, setStatus] = useState(''); const [reason, setReason] = useState('');
  return (
    <Modal title={`Correct ${target.student.name} · ${target.period.period}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!status || reason.trim().length < 3} onClick={() => onSave(status, reason)}>Save correction</Button></>}>
      <div className="stack">
        <div>{target.period.subject || 'Period'} on this day is marked <b>{word(target.status)}</b>.</div>
        <Field label="New status"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Select" options={['present', 'absent', 'late', 'leave'].filter((s) => s !== target.status).map((s) => ({ value: s, label: word(s) }))} /></Field>
        <Field label="Reason (required)" hint="The old and new marks, your name and this reason are kept in the period's history. The family is told."><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const dayText = (d) => (d ? (d.status === 'half_day' ? 'Half day' : word(d.status)) : null);

/**
 * One class on one day, period by period: each lesson (teacher, covering, submitted or waiting), every student's mark in each, and the day
 * that was worked out. `role`: 'teacher' = the class teacher (can mark their own periods), 'admin' = the School Admin (can correct and ask).
 * `fallback` is shown for a date on which the school took attendance once a day.
 */
export function DayGrid({ role, sectionId, date, fallback }) {
  const admin = role === 'admin';
  const q = useApi(sectionId ? (admin ? '/api/school/period-attendance' : `${T}/class-periods`) : null, { sectionId, date });
  const [open, setOpen] = useState(null); const [fix, setFix] = useState(null);
  const [run, busy] = useAction();
  return (
    <Async skeleton="datatable" state={q}>{(d) => {
      if (!d.enabled) return fallback || <Card><Empty title="Taken once a day on this date">The school took attendance with one register for the whole day then. Pick a later date to see it period by period.</Empty></Card>;
      if (!d.periods.length) return <Card><Empty title="No lessons this day">This class has nothing on its timetable for this weekday.</Empty></Card>;
      const waiting = d.periods.filter((p) => p.state !== 'submitted');
      return (
        <div className="stack">
          <Card>
            <div className="stack" style={{ gap: 10 }}>
              <div className="row between wrap"><b>{d.submitted} of {d.expected} periods submitted</b>
                <span className="muted small">{d.complete ? 'The day is worked out from all of them.' : waiting.length ? `Waiting: ${waiting.map((p) => `${p.period}${p.teacher ? ` (${p.teacher})` : ''}`).join(', ')}` : ''}</span></div>
              <div className="pg-prog" role="img" aria-label={`${d.submitted} of ${d.expected} periods submitted`}>{d.periods.map((p) => <i key={p.periodId} className={p.state === 'submitted' ? '' : p.state === 'draft' ? 'd' : 'e'} />)}</div>
              <div className="muted small">A day is <b>Present</b> with at least {d.rule.presentPct}% of the periods taken, <b>Half day</b> with at least {d.rule.halfPct}%, otherwise <b>Absent</b>. A day shows only once at least half of its periods are submitted.</div>
            </div>
          </Card>
          <Card flush>
            <div className="pg-scroll">
              <table className="pg-grid">
                <thead><tr><th scope="col">Student</th>
                  {d.periods.map((p) => (
                    <th scope="col" key={p.periodId}>
                      {p.period}<small>{p.subject}</small><small>{p.teacher}{p.covering ? ' (covering)' : ''}</small>
                      {!admin && p.mine && <Button size="sm" variant={p.state === 'submitted' ? undefined : 'primary'} onClick={() => setOpen(p)}>{p.state === 'submitted' ? 'Review' : 'Mark'}</Button>}
                      {admin && p.state !== 'submitted' && date === d.date && <Button size="sm" loading={busy} aria-label={`Ask ${p.teacher || 'the teacher'} to mark ${p.period}`} onClick={() => run(() => post('/api/school/period-attendance/remind', { sectionId, date, periodId: p.periodId }), (x) => (x.sent ? `Asked ${x.asked} to mark it` : `${x.asked} was already asked a moment ago`))}>Ask</Button>}
                    </th>))}
                  <th scope="col">Day</th></tr></thead>
                <tbody>
                  {d.students.map((s) => (
                    <tr key={s.studentId}>
                      <td><b>{s.name}</b>{s.rollNo != null && <span className="muted small"> · {s.rollNo}</span>}</td>
                      {d.periods.map((p) => <td key={p.periodId}><Cell status={s.cells[p.periodId]} label={`${s.name}, ${p.period}`}
                        onClick={admin && p.state === 'submitted' && s.cells[p.periodId] ? () => setFix({ student: s, period: p, status: s.cells[p.periodId] }) : undefined} /></td>)}
                      <td>{s.day ? <Badge tone={s.day.status === 'absent' ? 'red' : s.day.status === 'present' ? 'green' : 'amber'}>{dayText(s.day)}{s.day.status === 'half_day' && s.day.halfSession ? ` · ${s.day.halfSession === 'first' ? '1st' : '2nd'} half` : ''}</Badge> : <span className="muted small">Not complete yet</span>}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </Card>
          <Legend />
          {admin && <p className="muted small">Select a mark to correct it. The change is kept with your reason, the family is told, and the day is worked out again.</p>}
          {!admin && <p className="muted small">You mark only your own periods. Everything else is read-only here; ask the office if a mark is wrong.</p>}
          {open && <PeriodRegisterModal entry={open} date={date} onClose={() => setOpen(null)} onSaved={q.reload} />}
          {fix && <CorrectModal target={fix} busy={busy} onClose={() => setFix(null)}
            onSave={async (status, reason) => { const r = await run(() => put('/api/school/period-attendance/correct', { sectionId, date, periodId: fix.period.periodId, studentId: fix.student.studentId, status, reason }), 'Correction recorded'); if (r) { setFix(null); q.reload(); } }} />}
        </div>
      );
    }}</Async>
  );
}

/** The short notice a teacher or student sees when a change of way is booked: "From Fri 27 Nov, attendance is taken period by period." */
export function ModeNotice({ change, audience = 'teacher' }) {
  if (!change) return null;
  const from = new Date(`${change.from}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div className="alert info" role="status">
      From {from}, attendance is taken {change.periodWise
        ? (audience === 'teacher' ? 'period by period: you will mark each of your own periods, and the class teacher no longer takes a daily register.' : 'period by period. You will see each period, and the day is worked out from them.')
        : (audience === 'teacher' ? 'once a day by the class teacher, so there is no period marking.' : 'once a day, by the class teacher.')}
    </div>
  );
}
