import { Badge, Empty, cls, dayName, fmtDate } from './ui.jsx';

/** One day's periods as cards: current / next / completed, free periods and breaks included. */
export function DayList({ rows, showTeacher, showSection, empty = 'No scheduled classes', actions }) {
  const lessons = (rows || []);
  if (!lessons.some((r) => !r.isBreak && !r.free)) return <Empty icon="🗓" title={empty} />;
  return (
    <div className="stack-sm">{lessons.map((r, i) => (
      <div key={i} className={cls('period', r.isBreak ? 'break' : r.free ? 'free' : r.status)}>
        <div className="time">{r.startTime}–{r.endTime}</div>
        {r.isBreak ? <div className="grow">☕ {r.period}</div> : r.free ? <div className="grow">Free period · {r.period}</div> : (
          <div className="grow">
            <div className="bold">{r.subject || 'Teacher to be assigned'} {showSection && r.sectionLabel && <span className="muted">· {r.sectionLabel}</span>}</div>
            <div className="small muted">{[r.period, showTeacher && r.teacher, r.room && `Room ${r.room}`, r.studentCount != null && `${r.studentCount} students`].filter(Boolean).join(' · ')}
              {r.substitute && <> <Badge tone="amber">{showTeacher ? `Substitute · was ${r.originalTeacher}` : 'Covering'}</Badge></>}
              {r.unresolved && <> <Badge tone="red">Unresolved</Badge></>}</div>
          </div>)}
        {!r.isBreak && !r.free && <div className="row">{r.attendance && <Badge tone={r.attendance === 'submitted' ? 'green' : r.attendance === 'draft' ? 'amber' : ''}>{r.attendance === 'not_marked' ? 'Register pending' : `Register ${r.attendance}`}</Badge>}
          {['current', 'next'].includes(r.status) && <Badge tone={r.status === 'current' ? 'primary' : 'amber'}>{r.status === 'current' ? 'Now' : 'Next'}</Badge>}{actions?.(r)}</div>}
      </div>))}</div>
  );
}

/** Week grid: periods down, weekdays across. */
export function WeekGrid({ week, showTeacher }) {
  if (!week?.length) return <Empty title="No timetable yet" />;
  const periods = [...new Map(week.flatMap((d) => d.rows).map((r) => [r.periodOrder, r])).values()].sort((a, b) => a.periodOrder - b.periodOrder);
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Period</th>{week.map((d) => <th key={d.day}>{dayName(d.day).slice(0, 3)} <span className="muted">{fmtDate(d.date)}</span></th>)}</tr></thead>
      <tbody>{periods.map((p) => p.isBreak ? <tr key={p.periodOrder}><td colSpan={week.length + 1} className="center muted small">{p.period} · {p.startTime}–{p.endTime}</td></tr> : (
        <tr key={p.periodOrder}><td><b>{p.period}</b><div className="small muted">{p.startTime}–{p.endTime}</div></td>{week.map((d) => {
          const r = d.rows.find((x) => x.periodOrder === p.periodOrder && !x.free && !x.isBreak);
          return <td key={d.day}>{r ? <div><b>{r.subject || '—'}</b>{r.sectionLabel && <span className="muted"> {r.sectionLabel}</span>}<div className="small muted">{[showTeacher && r.teacher, r.room].filter(Boolean).join(' · ')}</div>{r.substitute && <Badge tone="amber">Sub</Badge>}</div> : <span className="muted">—</span>}</td>;
        })}</tr>))}</tbody></table></div>
  );
}
