import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post, put } from '../api/client.js';
import { Async, Badge, Button, Card, DataTable, Input, Modal, Select, Stat, Tabs, useAction } from './ui.jsx';
import { parseCsv } from '../lib.js';

const today = () => new Date().toLocaleDateString('en-CA');
const STATUSES = ['present', 'late', 'half_day', 'absent', 'leave'];
const NAME = { present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent', leave: 'Leave' };
const monthOf = (d) => d.slice(0, 7);

/**
 * The daily register for a group of staff (teachers, general staff, or transport staff).
 * Everyone starts as present; mark the exceptions and submit. A submitted register is locked: changing it needs a reason.
 */
export default function StaffRegister({ base, group, canEdit = true }) {
  const [tab, setTab] = useState('register');
  return (
    <div className="stack">
      <Tabs tabs={[['register', 'Daily register'], ['month', 'This month']]} value={tab} onChange={setTab} />
      {tab === 'register' ? <Register base={base} group={group} canEdit={canEdit} /> : <Month base={base} group={group} />}
    </div>
  );
}

function Register({ base, group, canEdit }) {
  const [date, setDate] = useState(today());
  const reg = useApi(`${base}/register`, { group, date });
  return (
    <Async state={reg}>{(d) => <RegisterBody key={`${date}|${group}|${d.session?.status || 'none'}`} base={base} group={group} canEdit={canEdit} date={date} setDate={setDate} d={d} reload={reg.reload} />}</Async>
  );
}

// remounted whenever the date, group or submitted state changes, so unsaved edits never leak between days
function RegisterBody({ base, group, canEdit, date, setDate, d, reload }) {
  const [edits, setEdits] = useState({});
  const [importing, setImporting] = useState(false);
  const [run, busy] = useAction();
  const set = (id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const rows = d.rows.map((r) => ({ ...r, ...(edits[r.personId] || {}) }));
  const entries = rows.filter((r) => edits[r.personId]).map((r) => ({ personId: r.personId, status: r.status, ...(r.remark ? { remark: r.remark } : {}), ...(edits[r.personId].checkIn !== undefined || edits[r.personId].checkOut !== undefined ? { checkIn: r.checkIn || null, checkOut: r.checkOut || null } : {}) }));
  const t = (s) => rows.filter((r) => r.status === s).length;
  const save = (submit) => run(() => put(`${base}/register`, { group, date, submit, entries }), submit ? 'Register submitted' : 'Draft saved').then((x) => x && reload());
  const correct = async (r, status) => {
    const reason = window.prompt(`Why is ${r.name} being changed to ${NAME[status]}? (recorded)`);
    if (!reason) return;
    await run(() => post(`${base}/correct`, { group, date, personId: r.personId, status, reason }), 'Correction recorded'); reload();
  };
  const editable = canEdit && d.canEdit && !d.blocked;
  return (
    <div className="stack">
      <div className="row between wrap">
        <div className="row"><Input type="date" aria-label="Date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />{d.session && <Badge tone={d.session.status === 'submitted' ? 'green' : 'amber'}>{d.session.status === 'submitted' ? 'Submitted' : 'Draft'}</Badge>}{canEdit && <Button size="sm" onClick={() => setImporting(true)}>Import from attendance machine</Button>}</div>
        {editable && <div className="row"><Button onClick={() => save(false)} loading={busy} disabled={!entries.length}>Save draft</Button><Button variant="primary" loading={busy} onClick={() => window.confirm('Submit this register? It will be locked, and everyone not marked is recorded as present.') && save(true)}>Submit register</Button></div>}
      </div>
      {d.blocked && <div className="alert info">{d.blocked === 'future' ? 'Attendance cannot be taken for a future date.' : d.blocked === 'not_working_day' ? 'This is not a working day for the school.' : `This date is a holiday (${d.blocked.split(':')[1]}).`}</div>}
      <div className="grid g4"><Stat value={rows.length} label="People" /><Stat value={t('present') + t('late')} label="Present" sub={t('late') ? `${t('late')} late` : undefined} tone="green" /><Stat value={t('absent') + t('half_day')} label="Absent / half day" sub={`${t('absent')} absent · ${t('half_day')} half day`} tone={t('absent') ? 'red' : t('half_day') ? 'amber' : 'green'} /><Stat value={t('leave')} label="On leave" tone="blue" /></div>
      <Card flush><DataTable rows={rows} rowKey="personId" empty="Nobody in this group yet" columns={[
        { label: 'Name', render: (r) => <><b>{r.name}</b> {r.corrected && <Badge tone="amber">corrected</Badge>}<div className="small muted">{r.code} · {r.designation}</div></> },
        { label: 'Status', render: (r) => (editable
          ? <div className="status-seg" role="group" aria-label={`Status of ${r.name}`}>{STATUSES.map((s) => <button key={s} type="button" className={`${r.status === s ? 'on' : ''} ${s}`} onClick={() => set(r.personId, { status: s })}>{NAME[s]}</button>)}</div>
          : <div className="row"><Badge tone={{ present: 'green', late: 'amber', half_day: 'amber', absent: 'red', leave: 'blue' }[r.status]}>{NAME[r.status]}</Badge>
            {canEdit && d.canCorrect && <select aria-label={`Correct ${r.name}`} value="" onChange={(e) => e.target.value && correct(r, e.target.value)}><option value="">Correct…</option>{STATUSES.filter((s) => s !== r.status).map((s) => <option key={s} value={s}>{NAME[s]}</option>)}</select>}</div>) },
        { label: 'In', render: (r) => (editable ? <Input aria-label={`Check-in of ${r.name}`} type="time" value={r.checkIn || ''} onChange={(e) => set(r.personId, { checkIn: e.target.value, checkOut: r.checkOut || '', status: r.status })} style={{ width: 110 }} /> : (r.checkIn || '—')) },
        { label: 'Out', render: (r) => (editable ? <Input aria-label={`Check-out of ${r.name}`} type="time" value={r.checkOut || ''} onChange={(e) => set(r.personId, { checkOut: e.target.value, checkIn: r.checkIn || '', status: r.status })} style={{ width: 110 }} /> : (r.checkOut || '—')) },
        { label: 'Hours', render: (r) => (r.hours != null ? r.hours : '—') },
        { label: 'Remark', render: (r) => (editable ? <Input aria-label={`Remark for ${r.name}`} value={r.remark || ''} onChange={(e) => set(r.personId, { remark: e.target.value, status: r.status })} placeholder="Optional" /> : (r.remark || '—')) },
      ]} /></Card>
      {importing && <ImportModal base={base} group={group} onClose={() => setImporting(false)} onDone={reload} />}
      <p className="muted small">Check-in and check-out times come from the person's own check-in, from you typing them, or from the attendance machine's file. A late or short day is suggested from the school's working hours — you decide the status.</p>
      <p className="muted small">Teachers on an approved leave are filled in as “Leave” automatically. Days marked absent, or half day, reduce that person's pay in payroll; days that were never submitted cost nothing.</p>
    </div>
  );
}

function Month({ base, group }) {
  const [month, setMonth] = useState(monthOf(today()));
  const q = useApi(`${base}/month`, { group, month });
  return (
    <Card title="This month, from submitted registers" action={<Input type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} />} flush>
      <Async state={q}>{(d) => (
        <>
          <div className="card-b muted small">{d.registers} register(s) submitted this month.</div>
          <DataTable rows={d.people} rowKey="personId" empty="Nobody in this group yet" columns={[
            { label: 'Name', render: (p) => <><b>{p.name}</b><div className="small muted">{p.code} · {p.designation}</div></> }, { label: 'Present', key: 'present' }, { label: 'Late', key: 'late' }, { label: 'Half day', key: 'half_day' },
            { label: 'Absent', render: (p) => (p.absent ? <Badge tone="red">{p.absent}</Badge> : 0) }, { label: 'Leave', key: 'leave' }, { label: 'Attendance', render: (p) => (p.percentage != null ? <Badge tone={p.percentage < 75 ? 'red' : p.percentage < 90 ? 'amber' : 'green'}>{p.percentage}%</Badge> : '—') },
          ]} />
        </>
      )}</Async>
    </Card>
  );
}

const GUESS = { code: /code|emp|staff|\bid\b|badge|user/i, date: /date|day/i, time: /time|punch|in\/out|clock/i };

/** The export of a biometric or attendance machine: pick which column is the person's code, the date and the time. */
function ImportModal({ base, group, onClose, onDone }) {
  const [rows, setRows] = useState(null); const [cols, setCols] = useState({ code: '', date: '', time: '' }); const [result, setResult] = useState(null);
  const [run, busy] = useAction();
  const headers = rows?.[0] ? Object.keys(rows[0]) : [];
  const onFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const parsed = parseCsv(await f.text()); setRows(parsed); setResult(null);
    const h = parsed[0] ? Object.keys(parsed[0]) : [];
    setCols({ code: h.find((x) => GUESS.code.test(x)) || '', date: h.find((x) => GUESS.date.test(x)) || '', time: h.find((x) => GUESS.time.test(x) && !GUESS.date.test(x)) || '' });
  };
  const toRows = () => rows.map((r) => ({ code: r[cols.code], date: String(r[cols.date] || '').slice(0, 10), time: String(r[cols.time] || '').slice(0, 5) })).filter((r) => r.code && r.date && r.time);
  const send = async () => { const r = await run(() => post(`${base}/punches/import`, { group, rows: toRows() }), (x) => `${x.imported} day(s) imported for ${x.people} people`); if (r) { setResult(r); onDone(); } };
  return (
    <Modal wide title="Import from the attendance machine" onClose={onClose} footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" loading={busy} disabled={!rows || !cols.code || !cols.date || !cols.time} onClick={send}>Import {rows ? `${toRows().length} punches` : ''}</Button></>}>
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>Upload the CSV your machine exports: one row per punch, with the person's code (their employee or staff id), the date (YYYY-MM-DD) and the time (HH:MM). The earliest time of the day becomes the check-in and the latest becomes the check-out.</p>
        <input type="file" accept=".csv,text/csv" aria-label="Machine export file" onChange={onFile} />
        {rows && <div className="form-grid">{['code', 'date', 'time'].map((k) => (
          <label key={k} className="field"><span>{{ code: 'Person code column', date: 'Date column', time: 'Time column' }[k]}</span>
            <Select aria-label={`${k} column`} value={cols[k]} onChange={(e) => setCols({ ...cols, [k]: e.target.value })} options={headers} placeholder="Choose" /></label>))}</div>}
        {rows && <div className="muted small">{rows.length} row(s) in the file. First row: {headers.map((h) => `${h}=${rows[0][h]}`).join(' · ')}</div>}
        {result && <div className="alert ok">{result.imported} day(s) imported for {result.people} people.{result.unknownCodes.length > 0 && ` Not recognised: ${result.unknownCodes.slice(0, 8).join(', ')}.`}{result.badRows > 0 && ` ${result.badRows} row(s) skipped.`}</div>}
      </div>
    </Modal>
  );
}
