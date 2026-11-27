import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { api, post, put } from '../api/client.js';
import { Async, Spinner, Badge, Button, Card, Input, Select, useAction } from './ui.jsx';
import { gradeRank } from '../utils/grades.js';
import { useDialogs } from '../design/ui';

const weekday = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' }) : '');

/** The date sheet of an examination, one class at a time: the class's subjects with a date, a time and a room for each, saved together. */
export default function DateSheet({ examId, exam, onChanged }) {
  const classes = useApi('/api/school/classes');
  const options = useMemo(() => (classes.data || []).filter((c) => c.status === 'active').sort((a, b) => gradeRank(a.name) - gradeRank(b.name) || a.name.localeCompare(b.name)), [classes.data]);
  const [chosen, setClassId] = useState('');
  const classId = chosen || options[0]?._id || '';
  const sheet = useApi(classId ? `/api/school/exams/${examId}/datesheet` : null, { classId });
  const [rows, setRows] = useState(null);
  const [run, busy] = useAction();
  const dlg = useDialogs();
  const [copyFrom, setCopyFrom] = useState('');
  const [seen, setSeen] = useState(sheet.data);
  if (seen !== sheet.data) { setSeen(sheet.data); setRows(null); } // a fresh sheet from the server replaces what was being typed
  const ready = !!sheet.data && String(sheet.data.class?.id) === String(classId); // the sheet on screen is the chosen class's, not the one just left
  const list = ready ? (rows || sheet.data.subjects) : [];
  const set = (subjectId, patch) => setRows(list.map((r) => (r.subjectId === subjectId ? { ...r, ...patch } : r)));
  const dirty = !!rows;
  const dated = list.filter((r) => r.date).length;

  const save = async () => {
    const out = await run(() => put(`/api/school/exams/${examId}/datesheet`, { classId, rows: list.map((r) => ({ subjectId: r.subjectId, date: r.date || '', startTime: r.startTime || '', endTime: r.endTime || '', room: r.room || '' })) }), (x) => `Date sheet saved (${x.saved} paper${x.saved === 1 ? '' : 's'})`);
    if (out) { setRows(null); sheet.reload(); onChanged?.(); }
  };
  const standard = async () => { await run(() => post(`/api/school/exams/${examId}/datesheet/standard-subjects`, { classId }), (x) => `${x.created} subject(s) added`); sheet.reload(); };
  const addSubject = async () => {
    const name = await dlg.prompt('Name of the subject', { title: 'Add a subject to this class', required: true, placeholder: 'e.g. Informatics Practices' });
    if (!name) return;
    await run(() => post(`/api/school/exams/${examId}/datesheet/subjects`, { classId, name }), 'Subject added'); sheet.reload();
  };
  const copy = async () => {
    if (!copyFrom) return;
    const src = await api(`/api/school/exams/${examId}/datesheet?classId=${copyFrom}`);
    const byName = new Map(src.subjects.map((s) => [s.subject.toLowerCase(), s]));
    let n = 0;
    setRows(list.map((r) => { const s = byName.get(r.subject.toLowerCase()); if (!s || !s.date) return r; n += 1; return { ...r, date: s.date, startTime: s.startTime, endTime: s.endTime }; }));
    setCopyFrom('');
    if (!n) window.alert('That class has no dates for the same subjects yet.');
  };
  const current = options.find((c) => c._id === classId);

  return (
    <div className="stack">
      <Card>
        <div className="row between wrap" style={{ alignItems: 'end', gap: 14 }}>
          <div className="row wrap" style={{ alignItems: 'end', gap: 14 }}>
            <label className="field" style={{ minWidth: 260 }}><span className="label">Class</span>
              <Select aria-label="Class" value={classId} onChange={async (e) => { const next = e.target.value; if (dirty && !(await dlg.confirm('Leave this class without saving its dates?', { title: 'Unsaved dates', confirmLabel: 'Leave without saving' }))) return; setClassId(next); }} options={options.map((c) => ({ value: c._id, label: c.name }))} /></label>
            {options.length > 1 && <label className="field" style={{ minWidth: 220 }}><span className="label">Copy dates from</span>
              <Select aria-label="Copy dates from" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} placeholder="Another class…" options={options.filter((c) => c._id !== classId).map((c) => ({ value: c._id, label: c.name }))} /></label>}
            {copyFrom && <Button onClick={copy}>Copy the dates</Button>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button onClick={addSubject} disabled={!classId}>+ Add a subject</Button>
            <Button variant="primary" loading={busy} disabled={!dirty || !ready} onClick={save}>Save date sheet</Button>
          </div>
        </div>
        {exam.schedulePublished && <p className="small muted" style={{ margin: '10px 0 0' }}>This date sheet is published. Saving a change does not tell the students again; use “Re-notify schedule” at the top.</p>}
      </Card>
      <Card flush title={current ? `${exam.name} · ${current.name}` : 'Date sheet'} action={<Badge tone={list.length && dated === list.length ? 'green' : 'amber'}>{dated} of {list.length} dated</Badge>}>
        {!ready ? <Spinner kind="table" /> : <Async skeleton="datatable" keep state={sheet} empty={null}>{() => (list.length ? (
          <div className="table-wrap"><table><thead><tr><th>Subject</th><th>Date</th><th>Day</th><th>Starts</th><th>Ends</th><th>Room</th></tr></thead><tbody>
            {list.map((r) => (
              <tr key={r.subjectId}>
                <td><b>{r.subject}</b>{r.marksStarted && <div className="small muted">marks entry started</div>}</td>
                <td><Input type="date" aria-label={`${r.subject} date`} value={r.date || ''} onChange={(e) => set(r.subjectId, { date: e.target.value })} /></td>
                <td className="muted">{weekday(r.date)}</td>
                <td><Input type="time" aria-label={`${r.subject} starts`} value={r.startTime || ''} onChange={(e) => set(r.subjectId, { startTime: e.target.value })} /></td>
                <td><Input type="time" aria-label={`${r.subject} ends`} value={r.endTime || ''} onChange={(e) => set(r.subjectId, { endTime: e.target.value })} /></td>
                <td><Input aria-label={`${r.subject} room`} value={r.room || ''} style={{ width: 90 }} onChange={(e) => set(r.subjectId, { room: e.target.value })} /></td>
              </tr>))}
          </tbody></table></div>
        ) : (
          <div className="empty">
            <p style={{ margin: '0 0 10px' }}>{current?.name} has no subjects for this year yet.</p>
            <Button variant="primary" onClick={standard}>Set up subjects for {current?.name}</Button>
            <p className="small muted" style={{ margin: '10px 0 0' }}>Adds the usual subjects for this class{current?.stream ? ' and stream' : ''} to the school's subject list for this year. You can add more with “+ Add a subject”.</p>
          </div>))}</Async>}
        {list.length > 0 && !sheet.loading && <div className="card-b row between wrap"><span className="small muted">Leave a date empty for a paper that is not held. Every subject you give a date becomes a paper of this exam.</span></div>}
      </Card>
    </div>
  );
}
