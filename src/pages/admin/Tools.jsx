import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtDateTime, label, Spinner } from '../../components/ui.jsx';
import { BarsChart } from '../../components/Charts.jsx';
import NextYearModal from '../../components/NextYearModal.jsx';
import AuditLog from '../../components/AuditLog.jsx';
import ExportCentre from '../../components/ExportCentre.jsx';
import { parseCsv, toCsvText, saveText } from '../../lib.js';

// ───────────── Year-end promotion ─────────────
/**
 * Classes finish their academic year on their own dates, so the office promotes class by class: choose the classes, review their students, confirm.
 * A class already moved (by its class teacher or earlier) is left alone, and the old year stays open until every class has left it.
 */
const STATUS_TONE = { upcoming: '', active: 'green', promotion_in_progress: 'amber', completed: 'blue', archived: '' };
export function Promotion() {
  const L = useLookups();
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const progress = useApi(from ? '/api/school/promotions/progress' : null, { yearId: from });
  const setup = useApi(from && to ? '/api/school/offerings/structure' : null, { yearId: to }); // is the next year set up: sections, subjects, class teachers, subject teachers
  const [anyway, setAnyway] = useState(false);
  const [picked, setPicked] = useState([]);
  const [plan, setPlan] = useState(null); const [items, setItems] = useState([]);
  const [opts, setOpts] = useState({ closeFromYear: false, makeCurrent: false });
  const [run, busy] = useAction();
  const [done, setDone] = useState(null);
  const [next, setNext] = useState(false);
  // students can only move forward: the target must be a later year that is not closed
  const fromYear = L.years.find((y) => y._id === from);
  const toOptions = fromYear ? L.years.filter((y) => y.startDate > fromYear.startDate && y.status !== 'closed').map((y) => ({ value: y._id, label: y.name })) : [];
  const classes = progress.data?.classes || [];
  const totalWaiting = classes.reduce((a, c) => a + c.waiting, 0);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const preview = async () => { const r = await run(() => post('/api/school/promotions/preview', { fromYearId: from, toYearId: to, classIds: picked })); if (r) { setPlan(r); setItems(r.items); setDone(null); setAnyway(false); setOpts((o) => ({ ...o, closeFromYear: false })); } };
  const upd = (id, patch) => setItems((xs) => xs.map((i) => (i.enrolmentId === id ? { ...i, ...patch } : i)));
  const problems = items.filter((i) => (i.action === 'promote' || i.action === 'retain') && !i.toSectionId).length;
  const remaining = totalWaiting - items.length; // students left in the old year after this promotion
  // the classes students are going into (moving up, or repeating) and what the next year still lacks for them
  const goingTo = new Set(items.flatMap((i) => (i.action === 'promote' ? [String(i.toClassId)] : i.action === 'retain' ? [String(i.classId)] : [])));
  const lacking = (plan?.readiness || []).filter((r) => goingTo.has(String(r.classId)) && !r.ready);
  const commit = async () => {
    const r = await run(() => post('/api/school/promotions/commit', { fromYearId: from, toYearId: to, classIds: picked, confirm: true, ...opts, acknowledgeGaps: anyway, items: items.map((i) => ({ enrolmentId: i.enrolmentId, action: i.action, toSectionId: ['promote', 'retain'].includes(i.action) ? i.toSectionId : undefined })) }));
    if (r) { setDone(r); setPlan(null); setPicked([]); setAnyway(false); L.reload(); progress.reload(); setup.reload(); }
  };
  const sectionsFor = (i) => plan.availableSections.filter((s) => (i.action === 'retain' ? s.className === i.fromClass : i.action === 'promote' ? s.className === i.toClass || !i.toClass : false));
  return (
    <div className="stack">
      <PageHeader title="Year-end promotion" subtitle="A class moves to the next year as a whole, all its sections together, on its own dates. Choose the classes, review each student, then confirm. Classes you leave out, and classes already moved, are not touched." />
      {next && fromYear && <NextYearModal from={fromYear} onClose={() => setNext(false)} onCreated={(y) => { L.reload(); setTo(y._id); }} />}
      <Card title="1. Which years">
        <div className="row wrap">
          <Field label="From academic year"><Select value={from} onChange={(e) => { setFrom(e.target.value); setTo(''); setPicked([]); setPlan(null); }} options={L.yearOptions} placeholder="Select" /></Field>
          <div style={{ alignSelf: 'end' }}><Button onClick={() => setNext(true)} disabled={!fromYear}>+ Create next year</Button></div>
          <Field label="To academic year" hint={from && !toOptions.length ? 'No later year exists yet. Create the next academic year first.' : undefined}><Select value={to} onChange={(e) => { setTo(e.target.value); setPlan(null); }} options={toOptions} placeholder="Select" /></Field>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Don't have the next year yet? <b>Create next year</b> makes it and carries over the sections, subjects and teachers.</p>
      </Card>
      {from && to && (
        <Card title={`Is ${L.years.find((y) => y._id === to)?.name || 'the next year'} set up for the classes?`} action={<Link className="btn sm" to={`/admin/class-structure?year=${to}`}>Subjects and teachers</Link>}>
          <Async state={setup}>{(d) => (
            <div className="stack-sm">
              <p className="muted" style={{ margin: 0 }}>Students move into sections that have their class teacher and each subject's teacher. The next year brings over the sections and subjects; teachers are assigned by hand.</p>
              {d.classes.length === 0 ? <div className="alert">The next year has no sections yet. Create it from the previous year, or add its sections first.</div> : (
                <div className="row wrap" style={{ gap: 8 }}>
                  {d.classes.map((c) => {
                    const gaps = c.gaps.noClassTeacher.length + c.gaps.noTeacher.reduce((a, x) => a + x.sections.length, 0) + (c.gaps.noSubjects ? 1 : 0);
                    return <Badge key={c.classId} tone={gaps ? 'red' : 'green'} title={gaps ? [c.gaps.noClassTeacher.length && `no class teacher: ${c.gaps.noClassTeacher.join(', ')}`, ...c.gaps.noTeacher.map((x) => `${x.subject}: no teacher in ${x.sections.join(', ')}`), c.gaps.noSubjects && 'no subjects'].filter(Boolean).join(' · ') : 'Ready'}>{c.className}: {gaps ? `${gaps} to assign` : 'ready'}</Badge>;
                  })}
                </div>
              )}
              {d.summary.sectionsWithoutClassTeacher + d.summary.subjectsWithoutTeacher + d.summary.classesWithoutSubjects > 0 && <p className="small muted" style={{ margin: 0 }}>You can still promote now; you will be asked to confirm that the missing teachers will be assigned afterwards.</p>}
            </div>
          )}</Async>
        </Card>
      )}
      {done && <div className="alert ok">Promotion {done.fromYear} → {done.toYear} complete: {done.promoted} promoted, {done.retained} repeating, {done.completed} finished school, {done.withdrawn + done.transferredOut} left.</div>}
      {from && (
        <Card title="2. Which classes" flush action={<div className="row"><Button size="sm" onClick={() => setPicked(classes.filter((c) => c.waiting > 0 && c.sessionEnded).map((c) => c.classId))}>Classes whose session has ended</Button><Button size="sm" onClick={() => setPicked(classes.filter((c) => c.waiting > 0).map((c) => c.classId))}>All with students waiting</Button><Button size="sm" onClick={() => setPicked([])}>None</Button></div>}>
          <Async skeleton="datatable" keep state={progress}>{() => (
            <DataTable searchable={false} pageSize={50} rowKey="classId" rows={classes} empty="This year has no classes with sections yet" columns={[
              { label: '', render: (c) => <input type="checkbox" aria-label={`Choose ${c.className}`} disabled={!c.waiting} checked={picked.includes(c.classId)} onChange={() => toggle(c.classId)} /> },
              { label: 'Class', render: (c) => <b>{c.className}</b> },
              { label: 'Status', render: (c) => <><Badge tone={STATUS_TONE[c.status]}>{c.statusLabel}</Badge>{c.sessionEnded && c.waiting > 0 && <div className="small muted">session ended</div>}</> },
              { label: 'Session', render: (c) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.startDate, true)} – {fmtDate(c.endDate, true)}{c.ownDates && <div className="small muted">its own dates</div>}</span> },
              { label: 'Waiting', render: (c) => c.waiting }, { label: 'Moved', render: (c) => c.moved },
            ]} />
          )}</Async>
        </Card>
      )}
      {from && to && (
        <div className="row"><Button variant="primary" loading={busy} disabled={!picked.length} onClick={preview}>{picked.length ? `3. Preview ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}` : '3. Preview (choose classes first)'}</Button></div>
      )}
      {plan && (<>
        <div className="grid g4"><Stat value={plan.summary.total} label="Students" /><Stat value={items.filter((i) => i.action === 'promote').length} label="To promote" tone="green" /><Stat value={items.filter((i) => i.action === 'retain').length} label="To repeat" /><Stat value={items.filter((i) => i.action === 'complete').length} label="Finishing school" /></div>
        <Card flush><DataTable rows={items} rowKey="enrolmentId" columns={[{ label: 'Student', render: (i) => <><b>{i.name}</b><div className="small muted">{i.admissionNo}</div></> }, { label: 'From', render: (i) => `${i.fromClass} ${i.fromSection}` },
          { label: 'What happens', render: (i) => <Select aria-label={`What happens to ${i.name}`} value={i.action} onChange={(e) => { const action = e.target.value; const match = plan.items.find((p) => p.enrolmentId === i.enrolmentId); upd(i.enrolmentId, { action, toSectionId: action === 'promote' ? match?.toSectionId : undefined }); }} options={plan.actions.map((a) => ({ value: a, label: label(a) }))} /> },
          { label: 'Goes to', render: (i) => (['promote', 'retain'].includes(i.action) ? <Select aria-label={`Section for ${i.name}`} value={i.toSectionId || ''} onChange={(e) => upd(i.enrolmentId, { toSectionId: e.target.value })} placeholder="Choose section" options={sectionsFor(i).map((x) => ({ value: x.id, label: `${x.className} ${x.name} (${x.yearName}) · ${x.planned}/${x.capacity} · ${x.classTeacher ? `class teacher ${x.classTeacher}` : 'no class teacher yet'}` }))} /> : <span className="muted">—</span>) },
          { label: '', render: (i) => <>{i.warnings?.map((w) => <Badge key={w} tone="red">{w}</Badge>)}{i.notices?.map((w) => <Badge key={w} tone="amber">{w}</Badge>)}</> }]} /></Card>
        <Card title="Left as they are">
          <p className="small muted" style={{ margin: 0 }}>{plan.classes.filter((c) => !c.inScope).length ? plan.classes.filter((c) => !c.inScope).map((c) => `${c.className}: ${c.waiting ? `${c.waiting} students stay in ${plan.fromYear.name}` : c.moved ? 'already moved on' : 'nobody to move'}`).join(' · ') : 'Every class with students waiting is in this promotion.'}</p>
        </Card>
        {lacking.length > 0 && (
          <Card title="The next year is not fully set up for these classes">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {lacking.map((r) => <li key={r.classId}><b>{r.className}</b>: {[r.noSubjects && 'no subjects yet', r.noClassTeacher.length > 0 && `no class teacher in ${r.noClassTeacher.join(', ')}`, ...r.noTeacher.map((x) => `no ${x.subject} teacher in ${x.sections.join(', ')}`)].filter(Boolean).join('; ')}</li>)}
            </ul>
            <label className="row" style={{ marginTop: 10 }}><input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} /> Promote anyway: I will assign these teachers on <Link to={`/admin/class-structure?year=${to}`}>Subjects and teachers</Link></label>
          </Card>
        )}
        <Card><div className="stack-sm">
          <label className="row"><input type="checkbox" checked={opts.makeCurrent} onChange={(e) => setOpts({ ...opts, makeCurrent: e.target.checked })} /> Show {plan.toYear.name} as the school's current year (what new admissions and the dashboard start on)</label>
          <label className="row"><input type="checkbox" checked={opts.closeFromYear} disabled={remaining > 0} onChange={(e) => setOpts({ ...opts, closeFromYear: e.target.checked })} /> Close {plan.fromYear.name} (read-only history){remaining > 0 && <span className="small muted">&nbsp;· {remaining} students are still in classes that have not moved on</span>}</label>
          <div className="row"><div className="grow" /><ConfirmButton variant="primary" disabled={problems > 0 || busy || (lacking.length > 0 && !anyway)} message={`Promote ${items.length} students of ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}? Other classes are not touched.`} onConfirm={commit}>Promote {items.length} students</ConfirmButton></div>
        </div></Card></>)}
    </div>
  );
}

// ───────────── Bulk import (data dumping) ─────────────
const TEMPLATES = {
  students: { cols: ['name', 'dob', 'gender', 'className', 'section', 'admissionNo', 'rollNo', 'admissionDate', 'phone', 'address', 'house', 'guardianName', 'guardianRelationship', 'guardianPhone', 'guardianEmail'], sample: { name: 'Asha Verma', dob: '2013-04-21', gender: 'female', className: 'Class 8', section: 'A', admissionNo: 'A1001', guardianName: 'Ravi Verma', guardianRelationship: 'Father', guardianPhone: '9876543210', guardianEmail: 'ravi.verma@example.com' } },
  teachers: { cols: ['name', 'employeeId', 'email', 'phone', 'dob', 'designation', 'qualification', 'joiningDate', 'subjects'], sample: { name: 'Neha Iyer', employeeId: 'T100', email: 'neha@school.org', phone: '9876543210', dob: '1988-06-15', subjects: 'Mathematics;Science' } },
};

export function Import() {
  const [entity, setEntity] = useState('students');
  const [rows, setRows] = useState(null); const [report, setReport] = useState(null); const [result, setResult] = useState(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [run, busy] = useAction();
  const file = useRef();
  const batches = useApi('/api/school/imports');
  const T = TEMPLATES[entity];
  const reset = () => { setRows(null); setReport(null); setResult(null); if (file.current) file.current.value = ''; };
  const onFile = async (e) => { const f = e.target.files[0]; if (!f) return; const parsed = parseCsv(await f.text()); setRows(parsed); setReport(null); setResult(null); await check(parsed); };
  const check = async (data) => { const r = await run(() => post(`/api/school/imports/${entity}`, { rows: data, dryRun: true })); if (r) setReport(r); };
  const commit = async () => {
    const r = await run(() => post(`/api/school/imports/${entity}`, { rows, dryRun: false, skipInvalid }), (x) => (x.committed ? `${x.created} record(s) imported` : 'Nothing imported — fix the rows first'));
    if (r?.committed) { setResult(r); batches.reload(); }
  };
  return (
    <div className="stack">
      <PageHeader title="Data import" subtitle="Load existing school data from a CSV file. Always checked first; nothing is saved until you confirm." />
      <Tabs tabs={[['students', 'Students'], ['teachers', 'Teachers']]} value={entity} onChange={(e) => { setEntity(e); reset(); }} />
      <Card title="1. Get the template, fill it, upload it" action={<Button size="sm" onClick={() => saveText(`${entity}-template.csv`, toCsvText([T.sample], T.cols))}>Download CSV template</Button>}>
        <p className="small muted">{entity === 'students' ? 'Class and section names must match the current academic year exactly (e.g. "Class 8" and "A"). Dates are YYYY-MM-DD. Admission numbers are generated if blank.' : 'Subjects: names separated by ; (e.g. Mathematics;English) — new subjects are created automatically. If an email is given it becomes the login id.'}</p>
        <input ref={file} type="file" accept=".csv,text/csv" onChange={onFile} aria-label="CSV file" />
      </Card>
      {busy && !report && <Spinner kind="datatable" />}
      {report && !result && (<Card title="2. Check results">
        <div className="row wrap"><Badge tone="green">{report.valid} valid</Badge><Badge tone={report.invalid ? 'red' : ''}>{report.invalid} with problems</Badge><span className="muted small">of {report.total} rows</span></div>
        {report.report.filter((r) => !r.ok).length > 0 && <div className="scroll-y" style={{ marginTop: 12 }}><DataTable rows={report.report.filter((r) => !r.ok)} rowKey="row" columns={[{ label: 'Row', key: 'row' }, { label: 'Name', key: 'name' }, { label: 'Problems', render: (r) => r.errors.join(' · ') }]} /></div>}
        <div className="row" style={{ marginTop: 14 }}><label className="row"><input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} /> Import the valid rows and skip the rest</label><div className="grow" />
          <Button onClick={reset}>Cancel</Button><Button variant="primary" loading={busy} disabled={!report.valid || (report.invalid > 0 && !skipInvalid)} onClick={commit}>Import {report.valid} record(s)</Button></div></Card>)}
      {result && (<Card title="Import complete">
        <div className="alert ok">{result.created} created · {result.skipped} skipped. Download the temporary logins now — they are not shown again.</div>
        <div className="row" style={{ marginTop: 12 }}><Button variant="primary" onClick={() => saveText(`${entity}-logins.csv`, toCsvText(result.credentials, Object.keys(result.credentials[0] || {})))} disabled={!result.credentials.length}>Download logins (CSV)</Button><Button onClick={reset}>Import another file</Button></div></Card>)}
      <Card title="Previous imports" flush><Async skeleton="datatable" state={batches} empty={<div className="empty">No imports yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'When', render: (b) => fmtDateTime(b.createdAt) }, { label: 'Type', render: (b) => label(b.entity) }, { label: 'Created', key: 'created' }, { label: 'Skipped', key: 'skipped' }, { label: 'By', render: (b) => (b.actingAsSuperAdmin ? <Badge tone="amber">Super Admin</Badge> : 'School admin') }, { label: 'Status', render: (b) => <Badge tone={b.status === 'committed' ? 'green' : ''}>{label(b.status)}</Badge> },
        { label: '', render: (b) => b.status === 'committed' && <ConfirmButton size="sm" variant="danger" message="Roll back this import? Records that already have attendance or marks are kept." onConfirm={async () => { const r = await run(() => post(`/api/school/imports/${b._id}/rollback`), (x) => `${x.removed} removed${x.kept.length ? `, ${x.kept.length} kept (have records)` : ''}`); if (r) batches.reload(); }}>Roll back</ConfirmButton> }]} />}</Async></Card>
    </div>
  );
}

// ───────────── Reports ─────────────
export function Reports() {
  const rep = useApi('/api/school/reports/summary');
  const merged = useMemo(() => (rep.data ? rep.data.strength.map((s, i) => ({ name: `${s.className?.replace('Class ', '')}-${s.section}`, students: s.students, attendance: rep.data.attendance[i]?.percentage })) : []), [rep.data]);
  return (
    <div className="stack">
      <PageHeader title="Reports and exports" subtitle="Take any list out of the school as a spreadsheet, narrowed to the class, people and dates you need. Exports contain exactly what you are allowed to see on screen." />
      <ExportCentre />
      <Async skeleton="datatable" state={rep}>{(r) => (<>
        <div className="grid g2">
          <Card title="Class strength"><BarsChart data={merged} x="name" bars={[{ key: 'students', name: 'Students' }]} /></Card>
          <Card title="Attendance by section (year to date)"><BarsChart data={merged.filter((m) => m.attendance != null)} x="name" bars={[{ key: 'attendance', name: 'Attendance %', color: 'rgb(var(--c-success))' }]} domain={[0, 100]} unit="%" /></Card>
        </div>
        <Card title="Result averages" flush><DataTable rows={r.results} rowKey="exam" empty="No published results yet" columns={[{ label: 'Class', key: 'className' }, { label: 'Exam', key: 'exam' }, { label: 'Students', key: 'students' }, { label: 'Average %', key: 'average' }]} /></Card></>)}</Async>
    </div>
  );
}

// ───────────── Audit ─────────────
export function Audit() {
  return (
    <div className="stack">
      <PageHeader title="Audit log" subtitle="Who did what, and when. Includes actions taken by the platform administrator on your behalf. It opens on today: change the days, or narrow it by person, role, kind of action or words." />
      <AuditLog base="/api/school" />
    </div>
  );
}
