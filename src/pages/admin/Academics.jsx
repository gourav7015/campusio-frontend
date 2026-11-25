import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Input, Modal, PageHeader, useAction, statusTone, fmtDate } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import NextYearModal from '../../components/NextYearModal.jsx';

const PROGRESS_TONE = { upcoming: '', active: 'green', promotion_in_progress: 'amber', completed: 'blue', archived: '' };
/** Where every class stands in one year: running, being moved on, finished. Each class on its own dates; one class's status never depends on another's. */
function ClassProgressModal({ year, onClose }) {
  const q = useApi('/api/school/promotions/progress', { yearId: year._id });
  return (
    <Modal wide title={`Classes in ${year.name}`} onClose={onClose} footer={<><Link className="btn" to="/admin/promotion" onClick={onClose}>Year-end promotion</Link><Button onClick={onClose}>Close</Button></>}>
      <Async state={q}>{(d) => (
        <DataTable searchable={false} pageSize={50} rowKey="classId" rows={d.classes} empty="No classes with sections in this year" columns={[
          { label: 'Class', render: (c) => <b>{c.className}</b> }, { label: 'Status', render: (c) => <Badge tone={PROGRESS_TONE[c.status]}>{c.statusLabel}</Badge> },
          { label: 'Session', render: (c) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.startDate, true)} – {fmtDate(c.endDate, true)}{c.ownDates && <div className="small muted">its own dates</div>}</span> },
          { label: 'Waiting', render: (c) => c.waiting }, { label: 'Moved on', render: (c) => c.moved },
        ]} />
      )}</Async>
    </Modal>
  );
}

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
  const [dates, setDates] = useState(null); const [progress, setProgress] = useState(null);
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
            <Button size="sm" onClick={() => setProgress(y)}>Class progress</Button>
            <Button size="sm" onClick={() => setDates(y)}>Class dates{y.classWindows?.length ? ` (${y.classWindows.length})` : ''}</Button>
            {!y.isCurrent && y.status !== 'closed' && <Button size="sm" onClick={async () => { await run(() => post(`/api/school/years/${y._id}/set-current`), 'Current year changed'); years.reload(); }}>Make current</Button>}
            {y.status !== 'closed' && <ConfirmButton size="sm" message={`Close ${y.name}? It becomes read-only history.`} onConfirm={async () => { await run(() => post(`/api/school/years/${y._id}/close`), 'Year closed'); years.reload(); }}>Close</ConfirmButton>}</div> },
        ]} />)}</Async></Card>
      {progress && <ClassProgressModal year={progress} onClose={() => setProgress(null)} />}
      {dates && <ClassDatesModal year={dates} onClose={() => setDates(null)} onSaved={() => years.reload()} />}
      {next && latest && <NextYearModal from={latest} onClose={() => setNext(false)} onCreated={() => years.reload()} />}
      {edit && <FormModal title={edit._id ? 'Edit academic year' : 'New academic year'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { await (edit._id ? patch(`/api/school/years/${edit._id}`, v) : post('/api/school/years', v)); years.reload(); return true; }} />}
    </div>
  );
}
