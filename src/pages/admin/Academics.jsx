import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, PageHeader, Select, useAction, statusTone, fmtDate } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import NextYearModal from '../../components/NextYearModal.jsx';

export function Years() {
  const years = useApi('/api/school/years');
  const [run] = useAction();
  const [edit, setEdit] = useState(null);
  const [next, setNext] = useState(false);
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
            <Button size="sm" onClick={() => setEdit(y)}>Edit</Button>
            {!y.isCurrent && y.status !== 'closed' && <Button size="sm" onClick={async () => { await run(() => post(`/api/school/years/${y._id}/set-current`), 'Current year changed'); years.reload(); }}>Make current</Button>}
            {y.status !== 'closed' && <ConfirmButton size="sm" message={`Close ${y.name}? It becomes read-only history.`} onConfirm={async () => { await run(() => post(`/api/school/years/${y._id}/close`), 'Year closed'); years.reload(); }}>Close</ConfirmButton>}</div> },
        ]} />)}</Async></Card>
      {next && latest && <NextYearModal from={latest} onClose={() => setNext(false)} onCreated={() => years.reload()} />}
      {edit && <FormModal title={edit._id ? 'Edit academic year' : 'New academic year'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { await (edit._id ? patch(`/api/school/years/${edit._id}`, v) : post('/api/school/years', v)); years.reload(); return true; }} />}
    </div>
  );
}

/** The only classes a school can have, in promotion order. The server enforces the same list. */
const GRADE_NAMES = ['LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];

export function Classes() {
  const [yearId, setYearId] = useState('');
  const L = useLookups(yearId || undefined);
  const [run] = useAction();
  const [modal, setModal] = useState(null);
  const yid = yearId || L.currentYear?._id;
  const sections = L.sections.filter((s) => !yid || s.yearId === yid);
  const availableGrades = GRADE_NAMES.filter((n) => !L.classes.some((c) => c.name === n));
  return (
    <div className="stack">
      <PageHeader title="Classes & sections" subtitle="A class is the grade (Class 8). A section is a group within it (A, B, C) for one academic year. Open a section for its students, attendance, homework, subject teachers, exam analysis and library." actions={<>
        <Select value={yid || ''} onChange={(e) => setYearId(e.target.value)} options={L.yearOptions} aria-label="Academic year" />
        <Button onClick={() => setModal({ t: 'class' })} disabled={!availableGrades.length}>+ Class</Button><Button variant="primary" onClick={() => setModal({ t: 'section' })} disabled={!L.classes.length || !yid}>+ Section</Button></>} />
      <div className="grid g2">
        <Card title="Classes" flush><DataTable rows={L.classes} empty="No classes yet" columns={[
          { label: 'Class', render: (c) => <b>{c.name}</b> }, { label: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge> },
          { label: '', render: (c) => <div className="row"><Button size="sm" onClick={async () => { await run(() => patch(`/api/school/classes/${c._id}`, { status: c.status === 'active' ? 'archived' : 'active' }), c.status === 'active' ? 'Class archived' : 'Class restored'); L.reload(); }}>{c.status === 'active' ? 'Archive' : 'Restore'}</Button>
            <ConfirmButton size="sm" variant="danger" message={`Delete ${c.name}?`} onConfirm={async () => { await run(() => del(`/api/school/classes/${c._id}`), 'Class deleted'); L.reload(); }}>Delete</ConfirmButton></div> },
        ]} /></Card>
        <Card title="Sections" flush><DataTable rows={sections} empty={yid ? 'No sections for this year' : 'Create an academic year first'} columns={[
          { label: 'Section', render: (s) => <Link to={`/admin/classes/${s._id}`}><b>{L.classes.find((c) => c._id === s.classId)?.name} {s.name}</b></Link> }, { label: 'Room', key: 'room' },
          { label: 'Students', render: (s) => `${s.studentCount} / ${s.capacity}` }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge> },
          { label: '', render: (s) => <div className="row"><Link className="btn sm" to={`/admin/classes/${s._id}`}>Open</Link><Button size="sm" onClick={() => setModal({ t: 'section', row: s })}>Edit</Button>
            <ConfirmButton size="sm" variant="danger" message="Delete this section?" onConfirm={async () => { await run(() => del(`/api/school/sections/${s._id}`), 'Section deleted'); L.reload(); }}>Delete</ConfirmButton></div> },
        ]} /></Card>
      </div>
      {modal?.t === 'class' && <FormModal title="Add class" submitLabel="Add class" fields={[{ name: 'name', label: 'Class', type: 'select', options: availableGrades, required: true, hint: 'Only LKG, UKG and Class 1 to 12 can be added. Promotion follows this order.' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await post('/api/school/classes', { name: v.name }); L.reload(); return true; }} />}
      {modal?.t === 'section' && <FormModal title={modal.row ? 'Edit section' : 'New section'} initial={modal.row}
        fields={[...(modal.row ? [] : [{ name: 'classId', label: 'Class', type: 'select', options: L.classOptions, required: true }]), { name: 'name', label: 'Section name', required: true, placeholder: 'A' }, { name: 'capacity', label: 'Capacity', type: 'number', min: 1, default: 40, required: true }, { name: 'room', label: 'Default room' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await (modal.row ? patch(`/api/school/sections/${modal.row._id}`, v) : post('/api/school/sections', { ...v, yearId: yid })); L.reload(); return true; }} />}
    </div>
  );
}
