import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { ClassPanel } from './ClassPanels.jsx';

/**
 * The school class by class for one academic year: each class's subjects (add or remove them, set the periods per week), who teaches each
 * subject in each section, and the class teacher of each section. Moving to a new year brings the sections and subjects over, but teachers are
 * assigned here by hand, and anything with nobody assigned is marked.
 */
function GiveToClasses({ subject, year, classes, onClose, onDone }) {
  const [picked, setPicked] = useState([]); const [periods, setPeriods] = useState(5); const [run, busy] = useAction();
  const have = new Set(subject.classes.map((c) => String(c.classId)));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const free = classes.filter((c) => !have.has(String(c._id)));
  return (
    <Modal title={`Give ${subject.name} to classes`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!picked.length} onClick={async () => { if (await run(() => post('/api/school/offerings/bulk', { yearId: year.id, subjectId: subject.id, classIds: picked, weeklyPeriods: Number(periods) || 5 }), `${subject.name} added to ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}`)) { onDone(); onClose(); } }}>Add to {picked.length || ''} {picked.length === 1 ? 'class' : 'classes'}</Button></>}>
      <div className="stack">
        {free.length
          ? <>
            <div className="row wrap" role="group" aria-label="Classes" style={{ gap: 6 }}>
              {free.map((c) => <Button key={c._id} size="sm" variant={picked.includes(c._id) ? 'primary' : undefined} aria-pressed={picked.includes(c._id)} onClick={() => toggle(c._id)}>{c.name}</Button>)}
            </div>
            <div className="row"><Button size="sm" onClick={() => setPicked(free.map((c) => c._id))}>All classes</Button><Button size="sm" onClick={() => setPicked([])}>None</Button></div>
            <Field label="Periods per week"><Input type="number" min={1} value={periods} onChange={(e) => setPeriods(e.target.value)} /></Field>
          </>
          : <p style={{ margin: 0 }}>Every class already has {subject.name} in {year.name}.</p>}
        {have.size > 0 && <p className="small muted" style={{ margin: 0 }}>Already in: {subject.classes.map((c) => c.className).join(', ')}. Teachers are assigned afterwards, on the By class tab.</p>}
      </div>
    </Modal>
  );
}

function SubjectsTab({ year, L, onChanged }) {
  const q = useApi('/api/school/subjects/usage', { yearId: year.id });
  const [name, setName] = useState(''); const [run, busy] = useAction();
  const [give, setGive] = useState(null); const [rename, setRename] = useState(null);
  const changed = () => { q.reload(); L.reload(); onChanged(); }; // the By class tab shows what changed here
  const classes = (L.classes || []).filter((c) => c.status === 'active').sort((a, b) => a.level - b.level);
  return (
    <div className="stack">
      <Card title="Add a subject"><form className="row wrap" style={{ alignItems: 'end' }} onSubmit={async (e) => { e.preventDefault(); if (await run(() => post('/api/school/subjects', { name }), 'Subject added')) { setName(''); changed(); } }}>
        <Field label="Subject name" hint="e.g. Mathematics, Computer Science, Art"><Input aria-label="New subject name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <Button type="submit" variant="primary" loading={busy} disabled={name.trim().length < 2}>Add subject</Button>
      </form></Card>
      <Card title={`The school's subjects${q.data ? ` (${q.data.filter((s) => s.status === 'active').length})` : ''}`} flush>
        <Async skeleton="datatable" state={q}>{(rows) => (rows.length
          ? <DataTable searchable={false} pageSize={50} rowKey="id" rows={rows.filter((s) => s.status === 'active')} columns={[
            { label: 'Subject', sort: (s) => s.name, render: (s) => <><b>{s.name}</b> <span className="small muted">{s.code}</span></> },
            { label: `Studied in (${year.name})`, render: (s) => (s.classes.length ? <span>{s.classes.map((c) => c.className).join(', ')}</span> : <span className="muted">No class yet</span>) },
            { label: '', render: (s) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="primary" onClick={() => setGive(s)}>Add to classes</Button>
                <Button size="sm" onClick={() => setRename(s)}>Rename</Button>
                <ConfirmButton size="sm" message={`Delete ${s.name}? Only a subject no class, teacher or exam has used can be deleted.`} onConfirm={async () => { await run(() => del(`/api/school/subjects/${s.id}`), 'Subject deleted'); changed(); }}>Delete</ConfirmButton>
              </div>) },
          ]} />
          : <Empty title="No subjects yet">Add the first subject above, then give it to the classes that study it.</Empty>)}</Async>
      </Card>
      {give && <GiveToClasses subject={give} year={year} classes={classes} onClose={() => setGive(null)} onDone={changed} />}
      {rename && <FormModal title={`Rename ${rename.name}`} initial={{ name: rename.name }} fields={[{ name: 'name', label: 'Subject name', required: true }]} onClose={() => setRename(null)} onSubmit={async (v) => { await patch(`/api/school/subjects/${rename.id}`, { name: v.name }); changed(); return true; }} />}
    </div>
  );
}

export default function ClassStructure() {
  const L = useLookups();
  const [sp] = useSearchParams();
  const [picked, setPicked] = useState(sp.get('year') || ''); // the promotion pages link here with the year to set up
  const yid = picked || L.currentYear?._id;
  const q = useApi(yid ? '/api/school/offerings/structure' : null, { yearId: yid });
  const [tab, setTab] = useState('classes');
  const [fl, setFl] = useState({ classId: '', show: '', q: '' }); // the choices shown on the By class tab
  const setF = (patch) => setFl((x) => ({ ...x, ...patch }));
  const [toggled, setToggled] = useState({}); // class id -> opened or closed by hand; otherwise a class opens by itself while filters narrow the list
  const yearObj = L.years.find((y) => y._id === yid);
  return (
    <div className="stack">
      <PageHeader title="Subjects and teachers by class" subtitle="Each class's subjects, and who teaches each one in each section. A new year brings over the sections and subjects; you assign the teachers here. Anything with nobody assigned is marked." />
      <Card><div className="row wrap" style={{ alignItems: 'end' }}>
        <Field label="Academic year"><Select aria-label="Academic year" value={yid || ''} onChange={(e) => setPicked(e.target.value)} options={L.yearOptions} /></Field>
        {q.data && (q.data.summary.sectionsWithoutClassTeacher + q.data.summary.subjectsWithoutTeacher + q.data.summary.classesWithoutSubjects > 0
          ? <div className="row wrap" style={{ gap: 8 }}>
            {q.data.summary.sectionsWithoutClassTeacher > 0 && <Badge tone="red">{q.data.summary.sectionsWithoutClassTeacher} sections have no class teacher</Badge>}
            {q.data.summary.subjectsWithoutTeacher > 0 && <Badge tone="red">{q.data.summary.subjectsWithoutTeacher} subjects have no teacher</Badge>}
            {(q.data.summary.teachersInChargeOfTwo || []).map((t) => <Badge key={t.teacher} tone="red">{t.teacher} is in charge of {t.sections.join(' and ')}</Badge>)}
            {q.data.summary.classesWithoutSubjects > 0 && <Badge tone="amber">{q.data.summary.classesWithoutSubjects} classes have no subjects</Badge>}
          </div>
          : <Badge tone="green">Every class has its teachers and subjects</Badge>)}
      </div></Card>
      <Tabs tabs={[['classes', 'By class'], ['subjects', 'Subjects']]} value={tab} onChange={setTab} />
      {tab === 'subjects' && yearObj && <SubjectsTab year={{ id: yearObj._id, name: yearObj.name, status: yearObj.status }} L={L} onChanged={q.reload} />}
      {tab === 'classes' && <Async skeleton="form" keep state={q}>{(d) => {
        if (!d.classes.length) return <Card><p className="muted" style={{ margin: 0 }}>This year has no classes with sections yet. Create the sections first (Classes and sections), or create the year from the previous one.</p></Card>;
        // what each class shows under the filters: the class itself, and which of its subject rows
        const nq = fl.q.trim().toLowerCase();
        const shown = d.classes.map((c) => {
          if (fl.classId && String(c.classId) !== fl.classId) return null;
          const gap = { any: c.gaps.noClassTeacher.length || c.gaps.noTeacher.length || c.gaps.noSubjects, classTeacher: c.gaps.noClassTeacher.length, subjectTeacher: c.gaps.noTeacher.length, noSubjects: c.gaps.noSubjects };
          if (fl.show && !gap[fl.show]) return null;
          let rows = c.subjects;
          if (fl.show === 'subjectTeacher') rows = rows.filter((sub) => sub.teachers.some((t) => !t.teacher));
          if (nq) {
            const wholeClass = c.className.toLowerCase().includes(nq) || c.sections.some((x) => x.classTeacher?.name.toLowerCase().includes(nq));
            if (!wholeClass) { rows = rows.filter((sub) => sub.subject.toLowerCase().includes(nq) || sub.teachers.some((t) => t.teacher?.toLowerCase().includes(nq))); if (!rows.length) return null; }
          }
          return { c, visible: new Set(rows.map((r) => r.offeringId)) };
        }).filter(Boolean);
        const inCharge = new Map(d.classes.flatMap((cl) => cl.sections.filter((x) => x.classTeacher).map((x) => [String(x.classTeacher.id), x.id]))); // teacher -> the section they are in charge of
        const active = Object.values(fl).some(Boolean);
        const loads = new Map(); // teacher -> periods a week taught across the school's classes
        d.classes.forEach((cl) => cl.subjects.forEach((sub) => sub.teachers.forEach((t) => { if (t.teacherId) loads.set(String(t.teacherId), (loads.get(String(t.teacherId)) || 0) + sub.weeklyPeriods); })));
        const isOpen = (id) => toggled[id] ?? (active || shown.length === 1);
        const allOpen = shown.length > 0 && shown.every(({ c }) => isOpen(c.classId));
        return (<>
          <Card><div className="row wrap" style={{ alignItems: 'end' }}>
            <Field label="Class"><Select aria-label="Class" value={fl.classId} onChange={(e) => setF({ classId: e.target.value })} placeholder="All classes" options={d.classes.map((c) => ({ value: String(c.classId), label: c.className }))} /></Field>
            <Field label="Show"><Select aria-label="Show" value={fl.show} onChange={(e) => setF({ show: e.target.value })} placeholder="Everything" options={[{ value: 'any', label: 'Anything missing' }, { value: 'classTeacher', label: 'No class teacher' }, { value: 'subjectTeacher', label: 'Subject with no teacher' }, { value: 'noSubjects', label: 'Class with no subjects' }]} /></Field>
            <Field label="Search"><Input aria-label="Search subjects and teachers" placeholder="Subject or teacher" value={fl.q} onChange={(e) => setF({ q: e.target.value })} /></Field>
            {active && <Button onClick={() => setFl({ classId: '', show: '', q: '' })}>Clear</Button>}
            <span className="muted small" role="status" style={{ alignSelf: 'center' }}>{shown.length} of {d.classes.length} classes</span>
            {shown.length > 1 && <Button className="ml-auto" onClick={() => setToggled(Object.fromEntries(shown.map(({ c }) => [c.classId, !allOpen])))}>{allOpen ? 'Collapse all' : 'Expand all'}</Button>}
          </div></Card>
          {shown.length
            ? <div className="stack" style={{ gap: 12 }}>{shown.map(({ c, visible }) => <ClassPanel key={c.classId} c={c} year={d.year} open={isOpen(c.classId)} onToggle={() => setToggled((x) => ({ ...x, [c.classId]: !isOpen(c.classId) }))} onChange={q.reload} teachers={L.teachers} loads={loads} subjects={L.subjects} goSubjects={() => setTab('subjects')} visible={visible} inCharge={inCharge} />)}</div>
            : <Card><Empty title="Nothing matches">Try a different class or clear the filters.</Empty></Card>}
        </>);
      }}</Async>}
    </div>
  );
}
