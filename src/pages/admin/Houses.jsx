import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { post, patch, put, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Modal, PageHeader, Select, useAction } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { useLookups } from '../../hooks/useLookups.js';

const HOUSE_COLOURS = [{ value: '#dc2626', label: 'Red' }, { value: '#16a34a', label: 'Green' }, { value: '#2563eb', label: 'Blue' }, { value: '#eab308', label: 'Yellow' }];

/** The school's own houses. Students and teachers each belong to one; a teacher in a house mentors its students. There are no houses until the school makes them. */
export default function Houses() {
  const list = useApi('/api/school/houses');
  const [edit, setEdit] = useState(null); const [roster, setRoster] = useState(null); const [run, busy] = useAction();
  const fieldsFor = (d) => [{ name: 'name', label: 'House name', required: true, placeholder: 'e.g. Aravali' }, { name: 'color', label: 'Colour (optional)', type: 'swatches', choices: HOUSE_COLOURS.map((c) => ({ ...c, takenBy: d.houses.find((h) => h._id !== edit?._id && (h.color || '').toLowerCase() === c.value)?.name })), hint: 'Shown on its card. Each house has its own colour; tap again to clear.' }, { name: 'motto', label: 'Motto (optional)', full: true }];
  return (
    <Async state={list}>{(d) => (
      <div className="stack">
        <PageHeader title="Houses" subtitle="The school's own houses. Every student belongs to one, and every teacher mentors one. A student or teacher can be put only in a house listed here."
          actions={<>{(d.unplaced.students > 0 || d.unplaced.teachers > 0) && d.houses.length > 0 && <Button loading={busy} onClick={async () => { const r = await run(() => post('/api/school/houses/distribute'), (x) => `Placed ${x.students} student(s) and ${x.teachers} teacher(s)`); if (r) list.reload(); }}>Place everyone without a house</Button>}
            <Button variant="primary" onClick={() => setEdit({})}>+ Add house</Button></>} />
        {d.houses.length > 0 && (d.unplaced.students > 0 || d.unplaced.teachers > 0) && <div className="alert info">{d.unplaced.students} student(s) and {d.unplaced.teachers} teacher(s) are not in a house yet. “Place everyone without a house” shares them out evenly, class by class. You can also set a student's house from the Students page, one by one or for a whole filtered list.</div>}
        {!d.houses.length ? <Empty title="No houses yet">Add the houses of your school (for example the names your school uses for sports and events). There are no built-in houses.</Empty> : (
          <div className="grid g3">{d.houses.map((h) => (
            <Card key={h._id} title={<span className="row" style={{ gap: 8, alignItems: 'center' }}><span aria-hidden style={{ width: 14, height: 14, borderRadius: 7, background: h.color || 'var(--grey-300, #9ca3af)', display: 'inline-block' }} />{h.name}</span>} action={h.status === 'archived' ? <Badge tone="amber">Archived</Badge> : null}>
              {h.motto && <p className="muted small" style={{ marginTop: 0 }}>“{h.motto}”</p>}
              <div className="row" style={{ gap: 24 }}><div><div className="muted small">Students</div><b style={{ fontSize: 22 }}>{h.students}</b></div><div><div className="muted small">Mentors</div><b style={{ fontSize: 22 }}>{h.teachers}</b></div></div>
              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                <Button size="sm" onClick={() => setRoster(h)}>Members</Button><Button size="sm" onClick={() => setEdit(h)}>Edit</Button>
                <ConfirmButton size="sm" variant="danger" message={`Delete the house ${h.name}? Only possible when no one is in it.`} onConfirm={async () => { const r = await run(() => del(`/api/school/houses/${h._id}`), 'Deleted'); if (r) list.reload(); }}>Delete</ConfirmButton>
              </div>
            </Card>))}</div>)}
        {edit && <FormModal title={edit._id ? `Edit ${edit.name}` : 'Add a house'} initial={edit} fields={fieldsFor(d)} onClose={() => setEdit(null)}
          onSubmit={async (v) => { const body = { ...v, color: v.color || '' }; if (edit._id) await patch(`/api/school/houses/${edit._id}`, body); else await post('/api/school/houses', body); list.reload(); return true; }} />}
        {roster && <Roster house={roster} onClose={() => { setRoster(null); list.reload(); }} />}
      </div>)}</Async>
  );
}

function Roster({ house, onClose }) {
  const q = useApi(`/api/school/houses/${house._id}`);
  const L = useLookups();
  const [teacher, setTeacher] = useState(''); const [run] = useAction();
  const place = async (id, name) => { await run(() => put(`/api/school/houses/teachers/${id}`, { house: name }), name ? 'Added to the house' : 'Removed from the house'); q.reload(); setTeacher(''); };
  return (
    <Modal wide title={`${house.name} · members`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Async state={q}>{(d) => (
        <div className="stack">
          <Card title="Mentors (teachers)" flush action={<div className="row" style={{ gap: 8 }}>
            <Select aria-label="Add a teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Add a teacher…" options={L.teachers.filter((t) => t.house !== house.name).map((t) => ({ value: t._id, label: `${t.name}${t.house ? ` (now in ${t.house})` : ''}` }))} />
            <Button size="sm" variant="primary" disabled={!teacher} onClick={() => place(teacher, house.name)}>Add</Button></div>}>
            <DataTable rows={d.teachers} rowKey="_id" empty="No teacher mentors this house yet" columns={[{ label: 'Name', render: (t) => <b>{t.name}</b> }, { label: 'Designation', render: (t) => t.designation || '—' }, { label: 'Phone', render: (t) => t.phone || '—' }, { label: '', render: (t) => <Button size="sm" onClick={() => place(t._id, '')}>Remove</Button> }]} />
          </Card>
          <Card title={`Students (${d.students.length})`} flush><DataTable rows={d.students} rowKey="_id" empty="No students yet. Set a student's house on the Students page, or use “Place everyone without a house”." columns={[{ label: 'Name', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => (s.className ? `${s.className} ${s.section}` : '—') }, { label: 'Adm. no', key: 'admissionNo' }]} /></Card>
        </div>)}</Async>
    </Modal>
  );
}
