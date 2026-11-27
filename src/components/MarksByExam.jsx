import { Badge, Card, DataTable, fmtDate, label, statusTone } from './ui.jsx';
import { componentsText } from './Marks.jsx';

/** A marks sheet that can still be entered or changed by its teacher. */
export const EDITABLE_SHEET = ['not_started', 'draft', 'returned', undefined];

/**
 * Marks, examination by examination: one card per exam, with its subjects (and classes) as rows. Exams that still have something for this teacher to
 * enter come first, then the newest. One layout for the teacher's Marks page and for the class teacher's My class → Enter marks.
 * `rows` are the teacher's exam rows; `actions(row)` draws the buttons of a row; `showClass` adds the class column.
 */
export function groupByExam(rows) {
  const by = new Map();
  for (const r of rows) { if (!by.has(r.examId)) by.set(r.examId, { id: r.examId, name: r.exam, type: r.type, createdByMe: r.createdByMe, rows: [] }); by.get(r.examId).rows.push(r); }
  return [...by.values()].map((e) => {
    const rowsSorted = [...e.rows].sort((a, b) => Number(b.canEnter ?? true) - Number(a.canEnter ?? true) || `${a.className} ${a.section}`.localeCompare(`${b.className} ${b.section}`, undefined, { numeric: true }) || a.subject.localeCompare(b.subject));
    const last = e.rows.map((r) => r.date).filter(Boolean).sort().at(-1) || '';
    return { ...e, rows: rowsSorted, todo: e.rows.filter((r) => (r.canEnter ?? true) && EDITABLE_SHEET.includes(r.status)).length, last };
  }).sort((a, b) => Number(b.todo > 0) - Number(a.todo > 0) || b.last.localeCompare(a.last));
}

export default function MarksByExam({ rows, actions, showClass = false, showTeacher = false }) {
  return groupByExam(rows).map((e) => {
    const done = e.rows.filter((r) => !EDITABLE_SHEET.includes(r.status)).length;
    return (
      <Card key={e.id} flush title={<span>{e.name} <Badge tone={e.type === 'surprise_test' ? 'amber' : e.createdByMe ? 'blue' : ''}>{label(e.type)}</Badge></span>}
        action={<span className="muted small">{e.todo > 0 && <Badge tone="amber">{e.todo} to enter</Badge>} {done} of {e.rows.length} submitted</span>}>
        <DataTable rows={e.rows} rowKey={(r) => `${r.examSubjectId}-${r.sectionId}`} columns={[
          ...(showClass ? [{ label: 'Class', render: (r) => `${r.className} ${r.section}` }] : []),
          { label: 'Subject', render: (r) => <b>{r.subject}</b> },
          ...(showTeacher ? [{ label: 'Taught by', render: (r) => (r.canEnter ? <Badge tone="blue">You</Badge> : <span className="muted">{r.teacher || 'No teacher assigned'}</span>) }] : []),
          { label: 'Date', render: (r) => (r.date ? fmtDate(r.date, true) : '—') },
          { label: 'Marks', render: (r) => <>{componentsText(r.components)} <span className="muted small">· out of {r.max}</span></> },
          { label: 'Deadline', render: (r) => <>{r.deadline ? fmtDate(r.deadline) : '—'} {r.overdue && <Badge tone="red">Overdue</Badge>}</> },
          { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status || 'not_started')}</Badge> },
          { label: '', render: (r) => <div className="row">{actions(r)}</div> }]} />
      </Card>);
  });
}
