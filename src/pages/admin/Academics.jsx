import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Input, Modal, PageHeader, useAction, statusTone, fmtDate } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { sectionKey } from '../../utils/grades.js';
import NextYearModal from '../../components/NextYearModal.jsx';

/**
 * Some classes do not follow the school's April-to-March year: 9 and 11 often start in January or February, and 10 and 12 follow the board's date sheet.
 * A class with its own dates here uses them for fees, attendance and exam dates; a class left blank follows the school year.
 */
function ClassDatesModal({ year, onClose, onSaved }) {
  const classes = useApi('/api/school/classes');
  const [run, busy] = useAction();
  const [rows, setRows] = useState(() => Object.fromEntries((year.classWindows || []).map((w) => [w.classId, { startDate: w.startDate, endDate: w.endDate }])));
  const set = (id, k, v) => setRows((r) => ({ ...r, [id]: { startDate: '', endDate: '', ...(r[id] || {}), [k]: v } }));
  const list = (classes.data || []).filter((c) => c.status === 'active');
  const half = (r) => !!r && (!!r.startDate !== !!r.endDate);
  const wrong = (r) => !!r?.startDate && !!r?.endDate && r.endDate <= r.startDate;
  const invalid = Object.values(rows).some((r) => half(r) || wrong(r));
  const save = () => run(async () => {
    const classWindows = Object.entries(rows).filter(([, r]) => r.startDate && r.endDate).map(([classId, r]) => ({ classId, ...r }));
    await patch(`/api/school/years/${year._id}`, { classWindows });
    onSaved(); return true;
  }, 'Class dates saved').then((ok) => { if (ok) onClose(); });
  return (
    <Modal title={`Class dates · ${year.name}`} wide onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={invalid} onClick={save}>Save</Button></>}>
      <p className="muted">The school year runs {fmtDate(year.startDate, true)} to {fmtDate(year.endDate, true)}. A class left blank follows it. Give a class its own start and end when it runs on a different calendar, for example classes 9 and 11 starting in February, or classes 10 and 12 ending with the board exams.</p>
      <Async state={classes}>{() => (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Class</th><th>Starts</th><th>Ends</th><th /></tr></thead>
          <tbody>{list.map((c) => { const r = rows[c._id]; return (
            <tr key={c._id}>
              <td><b>{c.name}</b>{!r?.startDate && !r?.endDate && <span className="muted"> follows the school year</span>}</td>
              <td><Input type="date" aria-label={`${c.name} starts`} value={r?.startDate || ''} onChange={(e) => set(c._id, 'startDate', e.target.value)} /></td>
              <td><Input type="date" aria-label={`${c.name} ends`} value={r?.endDate || ''} onChange={(e) => set(c._id, 'endDate', e.target.value)} /></td>
              <td>{(half(r) && <span className="muted">Fill both dates</span>) || (wrong(r) && <span className="muted">Must end after it starts</span>) || (r && (r.startDate || r.endDate) && <Button size="sm" onClick={() => setRows((x) => { const n = { ...x }; delete n[c._id]; return n; })}>Use school year</Button>)}</td>
            </tr>); })}</tbody>
        </table></div>)}</Async>
    </Modal>
  );
}

export function Years() {
  const years = useApi('/api/school/years');
  const [run] = useAction();
  const [edit, setEdit] = useState(null);
  const [next, setNext] = useState(false);
  const [dates, setDates] = useState(null);
  const latest = (years.data || []).filter((y) => y.status !== 'closed').sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || (years.data || [])[0];
  const fields = [{ name: 'name', label: 'Name', required: true, placeholder: '2026-2027' }, { name: 'startDate', label: 'Starts', type: 'date', required: true }, { name: 'endDate', label: 'Ends', type: 'date', required: true }];
  return (
    <div className="stack">
      <PageHeader title="Academic years" subtitle="Classes, sections, timetables, enrolments and exams all belong to an academic year" actions={<><Button onClick={() => setNext(true)} disabled={!latest}>+ Create next year</Button><Button variant="primary" onClick={() => setEdit({})}>+ New academic year</Button></>} />
      <Card flush><Async state={years} empty={<div className="empty">Create the first academic year to begin setting up the school.</div>}>{(rows) => (
        <DataTable rows={rows} columns={[
          { label: 'Year', render: (y) => <b>{y.name}</b> }, { label: 'Starts', render: (y) => fmtDate(y.startDate, true) }, { label: 'Ends', render: (y) => fmtDate(y.endDate, true) },
          { label: 'Status', render: (y) => <>{y.isCurrent && <Badge tone="green">Current</Badge>} <Badge tone={statusTone(y.status)}>{y.status}</Badge></> },
          { label: '', render: (y) => <div className="row">
            {!y.isCurrent && <Link className="btn sm primary" to={`/admin/past-sessions?year=${y._id}`} aria-label={`View ${y.name} data`}>View data</Link>}
            <Button size="sm" onClick={() => setEdit(y)}>Edit</Button>
            <Button size="sm" onClick={() => setDates(y)}>Class dates{y.classWindows?.length ? ` (${y.classWindows.length})` : ''}</Button>
            {!y.isCurrent && y.status !== 'closed' && <Button size="sm" onClick={async () => { await run(() => post(`/api/school/years/${y._id}/set-current`), 'Current year changed'); years.reload(); }}>Make current</Button>}
            {y.status !== 'closed' && <ConfirmButton size="sm" message={`Close ${y.name}? It becomes read-only history.`} onConfirm={async () => { await run(() => post(`/api/school/years/${y._id}/close`), 'Year closed'); years.reload(); }}>Close</ConfirmButton>}</div> },
        ]} />)}</Async></Card>
      {dates && <ClassDatesModal year={dates} onClose={() => setDates(null)} onSaved={() => years.reload()} />}
      {next && latest && <NextYearModal from={latest} onClose={() => setNext(false)} onCreated={() => years.reload()} />}
      {edit && <FormModal title={edit._id ? 'Edit academic year' : 'New academic year'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { await (edit._id ? patch(`/api/school/years/${edit._id}`, v) : post('/api/school/years', v)); years.reload(); return true; }} />}
    </div>
  );
}

/** The only classes a school can have, in promotion order. The server enforces the same list. */
const GRADE_NAMES = ['LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`), ...[11, 12].flatMap((n) => ['Medical', 'Non-Medical', 'Commerce', 'Arts'].map((st) => `Class ${n} ${st}`))]; // Classes 11 and 12 also come by stream

export function Classes() {
  const nav = useNavigate();
  const L = useLookups();
  const [run] = useAction();
  const [modal, setModal] = useState(null);
  const yid = L.currentYear?._id; // always the current session; earlier sessions are read under "Past sessions"
  const className = (id) => L.classes.find((c) => c._id === id)?.name;
  const sections = L.sections.filter((s) => !yid || s.yearId === yid).sort((a, b) => sectionKey(className(a.classId), a.name).localeCompare(sectionKey(className(b.classId), b.name)));
  const availableGrades = GRADE_NAMES.filter((n) => !L.classes.some((c) => c.name === n));
  return (
    <div className="stack">
      <PageHeader title="Classes & sections" subtitle="A class is the grade (Class 8). A section is a group within it (A, B, C) for one academic year. Open a section for its students, attendance, homework, subject teachers, exam analysis and library." actions={<>
        <Button onClick={() => setModal({ t: 'class' })} disabled={!availableGrades.length}>+ Class</Button><Button variant="primary" onClick={() => setModal({ t: 'section' })} disabled={!L.classes.length || !yid}>+ Section</Button></>} />
      <div className="grid g-side">
        <Card title="Classes" flush><DataTable rows={L.classes} empty="No classes yet" columns={[
          { label: 'Class', render: (c) => <b>{c.name}</b> }, { label: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge> },
          { label: '', render: (c) => <div className="row"><Button size="sm" onClick={async () => { await run(() => patch(`/api/school/classes/${c._id}`, { status: c.status === 'active' ? 'archived' : 'active' }), c.status === 'active' ? 'Class archived' : 'Class restored'); L.reload(); }}>{c.status === 'active' ? 'Archive' : 'Restore'}</Button>
            <ConfirmButton size="sm" variant="danger" message={`Delete ${c.name}?`} onConfirm={async () => { await run(() => del(`/api/school/classes/${c._id}`), 'Class deleted'); L.reload(); }}>Delete</ConfirmButton></div> },
        ]} /></Card>
        <Card title="Sections" flush><DataTable rows={sections} onRowClick={(s) => nav(`/admin/classes/${s._id}`)} empty={yid ? 'No sections for this year' : 'Create an academic year first'} columns={[
          { label: 'Section', render: (s) => <Link to={`/admin/classes/${s._id}`}><b>{L.classes.find((c) => c._id === s.classId)?.name} {s.name}</b></Link> }, { label: 'Room', key: 'room' },
          { label: 'Students', render: (s) => `${s.studentCount} / ${s.capacity}` }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge> },
          { label: '', render: (s) => <div className="row"><Link className="btn sm" to={`/admin/classes/${s._id}`}>Open</Link><Button size="sm" onClick={() => setModal({ t: 'section', row: s })}>Edit</Button>
            <ConfirmButton size="sm" variant="danger" message="Delete this section?" onConfirm={async () => { await run(() => del(`/api/school/sections/${s._id}`), 'Section deleted'); L.reload(); }}>Delete</ConfirmButton></div> },
        ]} /></Card>
      </div>
      {modal?.t === 'class' && <FormModal title="Add class" submitLabel="Add class" fields={[{ name: 'name', label: 'Class', type: 'select', options: availableGrades, required: true, hint: 'LKG, UKG and Class 1 to 12 can be added. For Class 11 and 12 you can add the streams: Medical, Non-Medical, Commerce and Arts, each with its own subjects and date sheet. Promotion follows this order.' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await post('/api/school/classes', { name: v.name }); L.reload(); return true; }} />}
      {modal?.t === 'section' && <FormModal title={modal.row ? 'Edit section' : 'New section'} initial={modal.row}
        fields={[...(modal.row ? [] : [{ name: 'classId', label: 'Class', type: 'select', options: L.classOptions, required: true }]), { name: 'name', label: 'Section name', required: true, placeholder: 'A' }, { name: 'capacity', label: 'Capacity', type: 'number', min: 1, default: 40, required: true }, { name: 'room', label: 'Default room' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await (modal.row ? patch(`/api/school/sections/${modal.row._id}`, v) : post('/api/school/sections', { ...v, yearId: yid })); L.reload(); return true; }} />}
    </div>
  );
}
