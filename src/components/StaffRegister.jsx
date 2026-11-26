import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post, put } from '../api/client.js';
import { Async, Badge, Button, Card, DataTable, Field, Input, Modal, Select, Tabs, useAction } from './ui.jsx';
import AttendanceRoster, { ReviewSubmit } from './AttendanceRoster.jsx';
import { parseCsv } from '../lib.js';
import FilterMenu from './FilterMenu.jsx';
import { useDialogs } from '../design/ui';

const today = () => new Date().toLocaleDateString('en-CA');
import { STATUSES, STATUS_NAME as NAME, statusText, SESSION_SHORT } from './attendanceUi.jsx';
const monthOf = (d) => d.slice(0, 7);
/** Name or staff/employee code, any part of it, ignoring case and surrounding spaces. */
export const matchesPerson = (p, q) => { const t = (q || '').trim().toLowerCase(); return !t || (p.name || '').toLowerCase().includes(t) || (p.code || '').toLowerCase().includes(t); };
/** Minutes after the shift start (plus grace) that someone checked in, or 0. Shown in red so late arrivals stand out. */
const minutesLate = (checkIn, policy) => { if (!checkIn || !policy?.shiftStart) return 0; const m = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); return Math.max(0, m(checkIn) - (m(policy.shiftStart) + (policy.graceMinutes ?? 0))); };
const onApprovedLeave = (r) => r.source === 'leave' || /^Approved .* leave$/.test(r.remark || '');
const timeOk = (a, b) => !a || !b || b >= a;

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
  const [desig, setDesig] = useState(''); const [review, setReview] = useState(false);
  const [note, setNote] = useState('');
  const [bulk, setBulk] = useState({ checkIn: d.policy?.shiftStart || '', checkOut: d.policy?.shiftEnd || '', keep: true });
  const [run, busy] = useAction();
  const set = (id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const rows = d.rows.map((r) => ({ ...r, ...(edits[r.personId] || {}) }));
  const entries = rows.filter((r) => edits[r.personId]).map((r) => ({ personId: r.personId, status: r.status, ...(r.status === 'half_day' ? { halfSession: r.halfSession || 'first' } : {}), ...(r.remark ? { remark: r.remark } : {}), ...(edits[r.personId].checkIn !== undefined || edits[r.personId].checkOut !== undefined ? { checkIn: r.checkIn || null, checkOut: r.checkOut || null } : {}) }));
  const designations = [...new Set(rows.map((r) => r.designation).filter(Boolean))].sort();
  const people = rows.filter((r) => !desig || r.designation === desig).map((r) => ({ id: r.personId, name: r.name, code: r.code, sub: `${r.code} · ${r.designation}`, status: r.status, halfSession: r.halfSession, remark: r.remark || '', badges: r.corrected ? <Badge tone="amber">corrected</Badge> : null }));
  const apply = (changes) => setEdits((e) => { const n = { ...e }; for (const c of changes) n[c.id] = { ...n[c.id], status: c.status, halfSession: c.halfSession }; return n; });
  // bulk actions only change what is on screen: they reach the server with Save draft or Submit. They always act on the WHOLE register, not just the rows the search is showing.
  const markAll = (status, view) => {
    let marked = 0; let onLeave = 0; const next = {};
    for (const r of rows) {
      if (onApprovedLeave(r)) { onLeave += 1; continue; }
      next[r.personId] = { ...edits[r.personId], status, halfSession: null }; marked += 1;
    }
    setEdits((e) => ({ ...e, ...next }));
    setNote(`Marked ${marked} ${NAME[status].toLowerCase()}${onLeave ? `, ${onLeave} on approved leave left as is` : ''}${view?.filtered || desig ? ` (everyone in the register, not only the ${desig ? people.length : view.shown} shown)` : ''}. Save or submit to keep it.`);
  };
  const applyTimes = () => {
    let changed = 0; const next = {};
    for (const r of rows) {
      if (onApprovedLeave(r) || r.status === 'absent' || r.status === 'leave') continue;
      const checkIn = bulk.keep && r.checkIn ? r.checkIn : (bulk.checkIn || r.checkIn || '');
      const checkOut = bulk.keep && r.checkOut ? r.checkOut : (bulk.checkOut || r.checkOut || '');
      if (checkIn === (r.checkIn || '') && checkOut === (r.checkOut || '')) continue;
      next[r.personId] = { ...edits[r.personId], checkIn, checkOut, status: r.status }; changed += 1;
    }
    setEdits((e) => ({ ...e, ...next }));
    setNote(changed ? `Set the time for ${changed} ${changed === 1 ? 'person' : 'people'}${bulk.keep ? ' (times already filled in were kept)' : ''}. Save or submit to keep it.` : 'Nothing to change: everyone already has these times, or is absent or on leave.');
  };
  const save = (submit) => run(() => put(`${base}/register`, { group, date, submit, entries }), submit ? 'Register submitted' : 'Draft saved').then((x) => x && reload());
  const dlg = useDialogs();
  const correct = async (r, value) => {
    const [status, halfSession] = value.split(':');
    const reason = await dlg.prompt(`Why is ${r.name} being changed to ${statusText(status, halfSession)}? (recorded)`, { title: 'Reason for the change', required: true });
    if (!reason) return;
    await run(() => post(`${base}/correct`, { group, date, personId: r.personId, status, ...(status === 'half_day' ? { halfSession } : {}), reason }), 'Correction recorded'); reload();
  };
  const editable = canEdit && d.canEdit && !d.blocked;
  return (
    <div className="stack">
      <div className="row between wrap">
        <div className="row"><Input type="date" aria-label="Date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />{d.session && <Badge tone={d.session.status === 'submitted' ? 'green' : 'amber'}>{d.session.status === 'submitted' ? 'Submitted' : 'Draft'}</Badge>}{canEdit && <Button size="sm" onClick={() => setImporting(true)}>Import from attendance machine</Button>}</div>
      </div>
      {editable && (
        <Card title="Set the time for everyone"><div className="stack">
          <div className="row wrap" style={{ alignItems: 'end', gap: 12 }}>
            <label className="field"><span>In</span><Input type="time" aria-label="Time in for everyone" value={bulk.checkIn} onChange={(e) => setBulk({ ...bulk, checkIn: e.target.value })} style={{ width: 120 }} /></label>
            <label className="field"><span>Out</span><Input type="time" aria-label="Time out for everyone" value={bulk.checkOut} min={bulk.checkIn || undefined} onChange={(e) => setBulk({ ...bulk, checkOut: e.target.value })} style={{ width: 120 }} /></label>
            <Button onClick={applyTimes} disabled={(!bulk.checkIn && !bulk.checkOut) || !timeOk(bulk.checkIn, bulk.checkOut)}>Apply to all</Button>
          </div>
          <label className="row"><input type="checkbox" checked={bulk.keep} onChange={(e) => setBulk({ ...bulk, keep: e.target.checked })} /> Keep times that are already filled in (from the attendance machine or the person's own check-in)</label>
          {!timeOk(bulk.checkIn, bulk.checkOut) && <div className="small" role="alert" style={{ color: 'var(--danger-ink, #b3261e)' }}>Out cannot be earlier than In.</div>}
          {note && <div className="small" role="status">{note}</div>}
        </div></Card>
      )}
      {d.blocked && <div className="alert info">{d.blocked === 'future' ? 'Attendance cannot be taken for a future date.' : d.blocked === 'not_working_day' ? 'This is not a working day for the school.' : `This date is a holiday (${d.blocked.split(':')[1]}).`}</div>}
      <AttendanceRoster people={people} editable={editable} noun="person" nounPlural="people" nameHead="Name" hideRoll searchLabel="Search staff by name or ID" searchPlaceholder="Search by name or ID" match={(p, t) => matchesPerson(p, t)}
        emptyText={desig ? 'No one matches' : undefined} onSet={apply} onMarkAll={markAll} onRemark={(id, text) => set(id, { remark: text, status: rows.find((r) => r.personId === id).status })}
        extraHead="In · Out"
        toolbar={designations.length > 1 && <Select aria-label="Designation" value={desig} onChange={(e) => setDesig(e.target.value)} placeholder="All designations" options={designations.map((x) => ({ value: x, label: `${x} (${rows.filter((r) => r.designation === x).length})` }))} />}
        renderExtra={(p) => { const r = rows.find((x) => x.personId === p.id); const late = minutesLate(r.checkIn, d.policy); return editable
          ? <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}><span><Input aria-label={`Check-in of ${r.name}`} type="time" value={r.checkIn || ''} onChange={(e) => set(r.personId, { checkIn: e.target.value, checkOut: r.checkOut || '', status: r.status })} style={{ width: 110, ...(late ? { borderColor: 'rgb(var(--c-danger))', color: 'rgb(var(--c-danger-ink))', fontWeight: 600 } : {}) }} />{late > 0 && <div className="small" style={{ color: 'rgb(var(--c-danger-ink))' }}>{late} min late</div>}</span><Input aria-label={`Check-out of ${r.name}`} type="time" value={r.checkOut || ''} onChange={(e) => set(r.personId, { checkOut: e.target.value, checkIn: r.checkIn || '', status: r.status })} style={{ width: 110 }} /></span>
          : <span className="small">{late ? <b style={{ color: 'rgb(var(--c-danger-ink))' }}>{r.checkIn} ({late} min late)</b> : (r.checkIn || '—')} – {r.checkOut || '—'}{r.hours != null && <span className="muted"> · {r.hours} h</span>}</span>; }}
        rowAction={(p) => { const r = rows.find((x) => x.personId === p.id); return canEdit && d.canCorrect ? <select aria-label={`Correct ${r.name}`} value="" onChange={(e) => e.target.value && correct(r, e.target.value)}><option value="">Correct…</option>{STATUSES.flatMap((s) => (s === 'half_day' ? ['first', 'second'].map((x) => ({ v: `half_day:${x}`, l: `Half day · ${SESSION_SHORT[x]}`, same: r.status === 'half_day' && (r.halfSession || 'first') === x })) : [{ v: s, l: NAME[s], same: r.status === s }])).filter((o) => !o.same).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select> : null; }}
        footer={editable && <><Button onClick={() => save(false)} loading={busy} disabled={!entries.length}>Save draft</Button><Button variant="primary" onClick={() => setReview(true)}>Submit register</Button></>} />
      {review && <ReviewSubmit people={people} busy={busy} submitLabel="Submit register" onClose={() => setReview(false)} title="Review before submitting"
        note="Submitting locks the register. Anyone you have not changed is recorded as present. A later change needs a reason and is kept in the history."
        onSubmit={async () => { await save(true); setReview(false); }} />}
      {importing && <ImportModal base={base} group={group} onClose={() => setImporting(false)} onDone={reload} />}
      <p className="muted small">Check-in and check-out times come from the person's own check-in, from you typing them, or from the attendance machine's file. A late or short day is suggested from the school's working hours — you decide the status.</p>
      <p className="muted small">Teachers on an approved leave are filled in as “Leave” automatically. Days marked absent, or half day, reduce that person's pay in payroll; days that were never submitted cost nothing.</p>
    </div>
  );
}

function Month({ base, group }) {
  const [month, setMonth] = useState(monthOf(today()));
  const q = useApi(`${base}/month`, { group, month });
  const [find, setFind] = useState(''); const [desig, setDesig] = useState(''); const [band, setBand] = useState('');
  const pass = (p) => matchesPerson(p, find) && (!desig || p.designation === desig) && (!band || (band === 'low' ? p.percentage != null && p.percentage < 75 : band === 'mid' ? p.percentage != null && p.percentage >= 75 && p.percentage < 90 : band === 'high' ? p.percentage != null && p.percentage >= 90 : p.absent > 0));
  const designations = [...new Set((q.data?.people || []).map((p) => p.designation).filter(Boolean))].sort();
  return (
    <Card title="This month, from submitted registers" action={<div className="row"><Input type="search" aria-label="Search staff by name or ID" placeholder="Search by name or ID" value={find} onChange={(e) => setFind(e.target.value)} /><FilterMenu count={[desig, band].filter(Boolean).length} onClear={() => { setDesig(''); setBand(''); }}>
          {designations.length > 1 && <Field label="Designation"><Select aria-label="Designation" value={desig} onChange={(e) => setDesig(e.target.value)} placeholder="All designations" options={designations.map((x) => ({ value: x, label: x }))} /></Field>}
          <Field label="Attendance"><Select aria-label="Attendance band" value={band} onChange={(e) => setBand(e.target.value)} placeholder="Any attendance" options={[{ value: 'low', label: 'Below 75%' }, { value: 'mid', label: '75% to 90%' }, { value: 'high', label: '90% and above' }, { value: 'absent', label: 'Has absences' }]} /></Field>
        </FilterMenu><Input type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>} flush>
      <Async state={q}>{(d) => (
        <>
          <div className="card-b muted small">{d.registers} register(s) submitted this month. Showing {d.people.filter(pass).length} of {d.people.length}.</div>
          <DataTable rows={d.people.filter(pass)} rowKey="personId" empty={find.trim() || desig || band ? 'No one matches these filters' : 'Nobody in this group yet'} columns={[
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
