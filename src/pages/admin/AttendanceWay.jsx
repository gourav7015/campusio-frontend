import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { put } from '../../api/client.js';
import { Async, Badge, Button, Field, Input, Modal, useAction, fmtDate } from '../../components/ui.jsx';

const WAYS = [
  { value: false, name: 'Once a day', text: 'The class teacher takes one register for the whole day.' },
  { value: true, name: 'Period by period', text: 'Each teacher marks their own period, and whoever covers a period marks it. The day is worked out from the periods.' },
];

const plus = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };

/**
 * How this school takes student attendance, in School settings. Two choices, never both. Changing it asks for a date and shows what will happen:
 * it never changes in the middle of a day and nothing already recorded is touched. The rule for working a day out from its periods sits here too.
 * `rule` / `onRule` are the day rule held by the settings page (saved with its Save button); the way itself is saved by the dialog.
 */
export default function AttendanceWay({ rule, onRule }) {
  const q = useApi('/api/school/attendance-mode');
  const [choice, setChoice] = useState(null);
  const [ask, setAsk] = useState(false);
  const [run, busy] = useAction();
  return (
    <Async skeleton="form" state={q}>{(info) => {
      const picked = choice ?? info.pending?.periodWise ?? info.periodWise;
      const period = picked === true;
      const changed = !info.pending && picked !== info.periodWise; // a booked change is withdrawn first, then a new one is made
      const r = rule || info.dayRule;
      const ex = 6; const fullAt = Math.ceil((ex * r.presentPct) / 100); const halfAt = Math.ceil((ex * r.halfPct) / 100);
      const bad = r.halfPct >= r.presentPct;
      return (
        <div className="stack">
          <div><b>How does this school take student attendance?</b><div className="small muted">Applies to every class. Staff attendance is not affected.</div></div>
          <div className="pg-ways" role="radiogroup" aria-label="How student attendance is taken">
            {WAYS.map((w) => (
              <button key={String(w.value)} type="button" role="radio" aria-checked={picked === w.value} className="pg-way" onClick={() => setChoice(w.value)}>
                <span className="pg-dot" aria-hidden />
                <span><b>{w.name}</b>{info.periodWise === w.value && <> <Badge tone="blue">In use now</Badge></>}{info.pending?.periodWise === w.value && <> <Badge tone="amber">From {fmtDate(info.pending.from, true)}</Badge></>}<div className="small muted" style={{ marginTop: 2 }}>{w.text}</div></span>
              </button>
            ))}
          </div>
          {info.pending && <div className="alert info row between wrap"><span>A change is booked: {info.pending.periodWise ? 'period by period' : 'once a day'} from <b>{fmtDate(info.pending.from, true)}</b>. Until then the school keeps the way it has now.</span>
            <Button size="sm" loading={busy} onClick={async () => { const x = await run(() => put('/api/school/attendance-mode', { periodWise: info.periodWise, from: info.pending.from }), 'The change was withdrawn'); if (x) { setChoice(null); q.reload(); } }}>Withdraw it</Button></div>}
          {changed && <div className="row wrap" style={{ gap: 10 }}><span className="muted small">You have not changed anything yet.</span><Button variant="primary" onClick={() => setAsk(true)}>{`Review and switch to ${period ? 'period by period' : 'once a day'}`}</Button></div>}

          {period && (
            <div className="stack" style={{ borderTop: '1px solid rgb(var(--c-border))', paddingTop: 14 }}>
              <div><b>How a day is worked out</b><div className="small muted">A late mark counts as present when the rule above says so. Saved with the Save button at the top.</div></div>
              <div className="grid g2">
                <Field label="Present for the day when present in at least (% of periods)"><Input type="number" min="1" max="100" value={r.presentPct} onChange={(e) => onRule({ ...r, presentPct: Number(e.target.value) })} /></Field>
                <Field label="Half day when present in at least (% of periods)"><Input type="number" min="1" max="99" value={r.halfPct} onChange={(e) => onRule({ ...r, halfPct: Number(e.target.value) })} /></Field>
              </div>
              {bad ? <div className="alert danger" role="alert">A half day must need fewer periods than a full day.</div> : (
                <div className="muted small" style={{ background: 'rgb(var(--c-muted))', borderRadius: 10, padding: '12px 14px', lineHeight: 1.6 }}>
                  <b>Example, a day with {ex} periods:</b> {fullAt} to {ex} present is <b>Present</b>, {halfAt} to {fullAt - 1} is <b>Half day</b>, fewer is <b>Absent</b>.<br />
                  Breaks are not counted. Approved leave counts as excused. A period nobody has submitted is left out, and a day with fewer than half its periods submitted shows as not complete, never absent.
                </div>)}
            </div>)}

          {ask && <SwitchDialog info={info} periodWise={picked} onClose={() => setAsk(false)} onDone={() => { setAsk(false); setChoice(null); q.reload(); }} />}
        </div>
      );
    }}</Async>
  );
}

function SwitchDialog({ info, periodWise, onClose, onDone }) {
  const tomorrow = plus(info.today, 1);
  const [when, setWhen] = useState('tomorrow');
  const [later, setLater] = useState(plus(info.today, 7));
  const [run, busy] = useAction();
  const from = when === 'today' ? info.today : when === 'tomorrow' ? tomorrow : later;
  const badDate = !from || from < info.earliest || from < info.today;
  const to = periodWise ? 'period by period' : 'once a day';
  return (
    <Modal wide title={`Switch to ${to}?`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={badDate} onClick={async () => { const x = await run(() => put('/api/school/attendance-mode', { periodWise, from }), from === info.today ? `Attendance is now taken ${to}` : `Booked: ${to} from ${fmtDate(from, true)}`); if (x) onDone(); }}>{from === info.today ? 'Switch from today' : `Switch from ${fmtDate(from, true)}`}</Button></>}>
      <div className="stack">
        <div className="stack" role="radiogroup" aria-label="When it starts" style={{ gap: 8 }}>
          {info.earliest === info.today && <label className="row"><input type="radio" name="when" checked={when === 'today'} onChange={() => setWhen('today')} /> From today <span className="muted small">(no register has been started today)</span></label>}
          <label className="row"><input type="radio" name="when" checked={when === 'tomorrow'} onChange={() => setWhen('tomorrow')} /> From tomorrow, {fmtDate(tomorrow, true)} <Badge tone="blue">Recommended</Badge></label>
          <label className="row wrap"><input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /> From a later date <Input type="date" aria-label="Start date" value={later} min={tomorrow} onChange={(e) => { setLater(e.target.value); setWhen('later'); }} style={{ width: 170 }} /></label>
        </div>
        <div className="small muted" style={{ marginTop: -4 }}>It never changes in the middle of a day.</div>
        <div className="stack" style={{ gap: 6 }}>
          <b>What happens</b>
          <ul className="small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>Records before that date stay exactly as they are. Nothing is converted.</li>
            {periodWise
              ? <><li>Registers still open today finish as daily registers.</li><li>Every teacher gets <b>Attendance</b> with their own periods to mark. Class teachers stop taking a daily register and see the day as a grid of periods.</li><li>Students and parents see period chips, attendance by subject, and a message when a lesson is missed.</li><li>The day is worked out from the periods by the rule on this page ({info.dayRule.presentPct}% for a full day, {info.dayRule.halfPct}% for a half day).</li></>
              : <><li>Period registers started today are kept as history.</li><li>Class teachers take one daily register again; subject teachers no longer mark periods.</li><li>Students and parents see one mark for the day again.</li></>}
            <li>Each student keeps one attendance percentage, counted by day across both ways.</li>
            <li>Teachers, students and parents are told today. You can change it back the same way. The change is written to the audit log.</li>
          </ul>
        </div>
        {info.openCount > 0 && <div className="alert info"><b>Still open today:</b> {info.openToday.map((o) => o.name).join(', ')}{info.openCount > info.openToday.length ? ` and ${info.openCount - info.openToday.length} more` : ''}. {periodWise ? 'They can still be submitted as daily registers until the switch date.' : 'Their period registers are kept.'}</div>}
        {badDate && <div className="alert danger" role="alert">Choose {info.earliest === info.today ? 'today' : 'tomorrow'} or a later date.</div>}
      </div>
    </Modal>
  );
}
