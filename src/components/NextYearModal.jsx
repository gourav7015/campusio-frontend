import { useState } from 'react';
import { post } from '../api/client.js';
import { Button, Field, Input, Modal, useAction } from './ui.jsx';

const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const addYear = (iso) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 1); return d.toISOString().slice(0, 10); };
/** "2026-2027" -> "2027-2028" */
const nextName = (name) => { const m = /(\d{4})(\D+)(\d{4})/.exec(name || ''); return m ? `${Number(m[1]) + 1}${m[2]}${Number(m[3]) + 1}` : ''; };

const Check = ({ checked, onChange, disabled, children }) => <label className="row" style={{ alignItems: 'flex-start', opacity: disabled ? 0.5 : 1 }}><input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 4 }} /><span>{children}</span></label>;

/**
 * Create the next academic year from the one that is ending, and carry over its set-up so the year-end promotion has somewhere to put students:
 * sections, subjects with their periods, and the same teachers. Nothing about students changes here.
 */
export default function NextYearModal({ from, onClose, onCreated }) {
  const start = from ? addDays(from.endDate, 1) : '';
  const [f, setF] = useState({ name: nextName(from?.name), startDate: start, endDate: start ? addDays(addYear(start), -1) : '', copySections: true, copyOfferings: true, copyTeachers: true });
  const [run, busy] = useAction();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    const out = await run(() => post('/api/school/years/rollover', { fromYearId: from._id, ...f }),
      (r) => `${r.year.name} created: ${r.sections} sections, ${r.offerings} subjects, ${r.subjectTeachers} subject teachers, ${r.classTeachers} class teachers carried over`);
    if (out) { onCreated(out.year); onClose(); }
  };
  return (
    <Modal title={`Create the year after ${from?.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.name.trim() || !f.startDate || !f.endDate} onClick={save}>Create year</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="2027-2028" /></Field>
          <Field label="Starts"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
          <Field label="Ends"><Input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="bold">Carry over from {from?.name}</div>
          <Check checked={f.copySections} onChange={(v) => set('copySections', v)}><b>Sections</b> — same classes, section names, capacity and rooms</Check>
          <Check checked={f.copyOfferings} onChange={(v) => set('copyOfferings', v)}><b>Subjects</b> — each class's subjects with periods per week and mark fields</Check>
          <Check checked={f.copyTeachers} onChange={(v) => set('copyTeachers', v)} disabled={!f.copySections || !f.copyOfferings}><b>Teachers</b> — the same subject teachers and class teachers (active teachers only)</Check>
        </div>
        <p className="muted small" style={{ margin: 0 }}>The new year starts as <b>upcoming</b>; your current year stays current until you promote the students. Students are not moved here — that is the next step, Year-end promotion. Timetables are not copied.</p>
      </div>
    </Modal>
  );
}
