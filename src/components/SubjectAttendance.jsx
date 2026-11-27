import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Empty, Modal, Stat, dayName, fmtDate, fmtPct, label, statusTone } from './ui.jsx';
import { BarsChart, TrendChart } from './Charts.jsx';

/**
 * Attendance when the school takes it period by period. Every subject has its own number of lessons, so the page counts lessons subject by
 * subject (not days): one card per subject with what was attended, how it is going, and what to do next. Used by the student's own page and by
 * the School Admin's and the class teacher's view of a student (same words, `who` changes "you" to "they").
 */
const n1 = (x) => (Number.isInteger(x) ? x : x.toFixed(1));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const STATE = { good: { tone: 'green', text: 'On track' }, watch: { tone: 'amber', text: 'Keep an eye' }, low: { tone: 'red', text: 'Below target' }, none: { tone: '', text: '' } };

/** What to do next in one subject, in a sentence. */
function nextStep(s, target, who) {
  const you = who === 'you';
  if (s.state === 'low') return `${you ? 'Attend' : 'Needs'} the next ${plural(s.needed, 'period')} in a row to reach ${target}%.`;
  if (s.state === 'none') return '';
  if (s.canMiss > 0) return `${you ? 'You' : 'They'} can miss ${plural(s.canMiss, 'more period')} and stay above ${target}%.`;
  return `Every period counts: one more miss ${you ? 'takes you' : 'takes them'} below ${target}%.`;
}

function Ring({ pct, state }) {
  const color = state === 'low' ? 'danger' : state === 'watch' ? 'warning' : 'success';
  return <span className="sa-ring" style={{ '--p': pct ?? 0, '--c': `rgb(var(--c-${color}))` }} role="img" aria-label={pct == null ? 'No percentage yet' : `${pct}%`}><b>{pct == null ? '—' : `${Math.round(pct)}%`}</b></span>;
}

/** Every period of one subject, newest first. */
function SubjectSheet({ url, name, onClose }) {
  const q = useApi(url);
  return (
    <Modal wide title={`${name}, period by period`} onClose={onClose}>
      <Async skeleton="datatable" state={q} empty={<Empty title="Nothing marked yet" />}>{(d) => (d.rows.length ? <DataTable rows={d.rows} rowKey={(r) => `${r.date}-${r.period}`} columns={[
        { label: 'Date', render: (r) => <>{fmtDate(r.date, true)} <span className="muted small">{dayName(r.day)}</span></> }, { label: 'Period', render: (r) => r.period }, { label: 'Time', render: (r) => r.time },
        { label: 'Attendance', render: (r) => (r.status ? <Badge tone={statusTone(r.status)}>{r.status === 'half_day' ? 'Half day' : label(r.status)}</Badge> : <span className="muted small">Not marked</span>) }]} /> : <Empty title="Nothing marked yet" />)}</Async>
    </Modal>
  );
}

export function SubjectAttendance({ data, detailUrl, who = 'you' }) {
  const [open, setOpen] = useState(null);
  if (!data?.subjects?.length) return <Empty title="No periods marked yet">Attendance subject by subject appears here once teachers mark their periods.</Empty>;
  const t = data.totals; const target = data.target;
  const low = data.subjects.filter((s) => s.state === 'low');
  const tone = t.percentage == null ? '' : t.percentage >= target ? 'green' : t.percentage >= target - 15 ? 'amber' : 'red';
  return (
    <div className="stack">
      <div className="grid g4">
        <Stat value={fmtPct(t.percentage)} label="Attendance in periods" sub={`${n1(t.attended)} of ${t.periods} periods`} tone={tone} />
        <Stat value={t.absent} label="Periods missed" tone={t.absent ? 'red' : ''} sub={t.late ? `${plural(t.late, 'late arrival')}` : undefined} />
        <Stat value={data.subjects.length} label="Subjects" sub={data.since ? `Since ${fmtDate(data.since, true)}` : undefined} />
        <Stat value={low.length} label={`Below ${target}%`} tone={low.length ? 'red' : 'green'} sub={low.length ? low.map((s) => s.subject).join(', ') : 'Every subject is on track'} />
      </div>
      {low.length > 0 && <div className="alert" role="note"><b>{low.map((s) => s.subject).join(', ')}</b> {low.length === 1 ? 'is' : 'are'} below {target}%. Open {low.length === 1 ? 'it' : 'one'} to see every period and what to do next.</div>}
      <h3 style={{ margin: '4px 0 0' }}>Attendance by subject</h3>
      <div className="sa-grid" role="list" aria-label="Attendance by subject">
        {data.subjects.map((s) => (
          <button type="button" role="listitem" key={s.subjectId} className={`sa-card ${s.state}`} onClick={() => setOpen(s)} aria-label={`${s.subject}: ${s.percentage ?? 'no'} percent. Show every period`}>
            <span className="row" style={{ gap: 12, alignItems: 'center' }}>
              <Ring pct={s.percentage} state={s.state} />
              <span className="grow" style={{ minWidth: 0 }}>
                <b className="sa-name">{s.subject}</b>
                <span className="small muted" style={{ display: 'block' }}>{n1(s.attended)} of {s.periods} {s.periods === 1 ? 'period' : 'periods'}</span>
                {STATE[s.state].text && <Badge tone={STATE[s.state].tone}>{STATE[s.state].text}</Badge>}
              </span>
            </span>
            <span className="sa-dots" aria-label="Latest periods, oldest first">{s.recent.map((st, i) => <i key={i} className={`sa-dot ${st}`} title={st === 'half_day' ? 'Half day' : label(st)} />)}</span>
            <span className="small">{nextStep(s, target, who)}</span>
            <span className="small muted">{s.absent ? `${plural(s.absent, 'period')} missed${s.lastAbsent ? `, last on ${fmtDate(s.lastAbsent, true)}` : ''}` : 'No period missed'}{s.late ? ` · ${plural(s.late, 'late arrival')}` : ''}{s.leave ? ` · ${s.leave} on leave` : ''}</span>
          </button>))}
      </div>
      {data.weekly.length > 1 && <Card title="Week by week"><TrendChart data={data.weekly.map((w) => ({ week: fmtDate(w.week), percentage: w.percentage }))} x="week" lines={[{ key: 'percentage', name: 'Attendance %' }]} /></Card>}
      <p className="muted small" style={{ margin: 0 }}>Counted period by period in each subject. Leave and excused periods are left out; {data.lateCountsAsPresent ? 'a late arrival counts as present' : 'a late arrival is not counted as present'}; a half day counts half. The target is {target}%.</p>
      {open && <SubjectSheet url={detailUrl(open.subjectId)} name={open.subject} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** The days before the school moved to period by period, when one register was taken for the whole day. Shown on their own, never mixed with the subjects. */
export function EarlierDays({ s, byMonth, until }) {
  if (!s?.workingDays) return null;
  return (
    <Card title="Earlier days, when one register was taken for the whole day" action={until && <span className="muted small">Up to {fmtDate(until, true)}</span>}>
      <div className="stack">
        <div className="grid g4"><Stat value={fmtPct(s.percentage)} label="Attendance" tone="green" /><Stat value={s.workingDays} label="Days" /><Stat value={s.present} label="Present" tone="green" /><Stat value={s.absent} label="Absent" tone={s.absent ? 'red' : ''} sub={s.late ? `${s.late} late` : undefined} /></div>
        {byMonth?.length > 0 && <BarsChart data={byMonth.map((m) => ({ month: m.month, 'Attendance %': m.percentage }))} x="month" bars={[{ key: 'Attendance %' }]} domain={[0, 100]} unit="%" height={200} />}
      </div>
    </Card>
  );
}
