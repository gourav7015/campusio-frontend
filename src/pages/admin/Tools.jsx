import { useMemo, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, put, download } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, PageHeader, Select, Stat, Tabs, useAction, fmtDateTime, label, Spinner } from '../../components/ui.jsx';
import { BarsChart } from '../../components/Charts.jsx';
import NextYearModal from '../../components/NextYearModal.jsx';
import { parseCsv, toCsvText, saveText } from '../../lib.js';

// ───────────── Year-end promotion ─────────────
export function Promotion() {
  const L = useLookups();
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [plan, setPlan] = useState(null); const [items, setItems] = useState([]);
  const [opts, setOpts] = useState({ closeFromYear: true, makeCurrent: true });
  const [run, busy] = useAction();
  const [done, setDone] = useState(null);
  const [next, setNext] = useState(false);
  // students can only move forward: the target must be a later year that is not closed
  const fromYear = L.years.find((y) => y._id === from);
  const toOptions = fromYear ? L.years.filter((y) => y.startDate > fromYear.startDate && y.status !== 'closed').map((y) => ({ value: y._id, label: y.name })) : [];
  const preview = async () => { const r = await run(() => post('/api/school/promotions/preview', { fromYearId: from, toYearId: to })); if (r) { setPlan(r); setItems(r.items); setDone(null); } };
  const upd = (id, patch) => setItems((xs) => xs.map((i) => (i.enrolmentId === id ? { ...i, ...patch } : i)));
  const problems = items.filter((i) => (i.action === 'promote' || i.action === 'retain') && !i.toSectionId).length;
  const commit = async () => {
    const r = await run(() => post('/api/school/promotions/commit', { fromYearId: from, toYearId: to, confirm: true, ...opts, items: items.map((i) => ({ enrolmentId: i.enrolmentId, action: i.action, toSectionId: ['promote', 'retain'].includes(i.action) ? i.toSectionId : undefined })) }), 'Promotion completed');
    if (r) { setDone(r); setPlan(null); L.reload(); }
  };
  const sectionsFor = (i) => plan.availableSections.filter((s) => (i.action === 'retain' ? s.className === i.fromClass : i.action === 'promote' ? s.className === i.toClass || !i.toClass : false));
  return (
    <div className="stack">
      <PageHeader title="Year-end promotion" subtitle="Preview every student's outcome, adjust individually, then commit. Nothing changes until you confirm." />
      {next && fromYear && <NextYearModal from={fromYear} onClose={() => setNext(false)} onCreated={(y) => { L.reload(); setTo(y._id); }} />}
      <Card><div className="row wrap">
        <Field label="From academic year"><Select value={from} onChange={(e) => { setFrom(e.target.value); setTo(''); }} options={L.yearOptions} placeholder="Select" /></Field>
        <div style={{ alignSelf: 'end' }}><Button onClick={() => setNext(true)} disabled={!fromYear}>+ Create next year</Button></div>
        <Field label="To academic year" hint={from && !toOptions.length ? 'No later year exists yet. Create the next academic year first (Academic years).' : undefined}><Select value={to} onChange={(e) => setTo(e.target.value)} options={toOptions} placeholder="Select" disabled={!from} /></Field>
        <div style={{ alignSelf: 'end' }}><Button variant="primary" loading={busy} disabled={!from || !to || from === to} onClick={preview}>Preview promotion</Button></div></div>
        <p className="small muted" style={{ marginTop: 10 }}>Don't have the next year yet? Use <b>Create next year</b>: it makes the year and carries over the sections, subjects and teachers. Students are placed into next-level classes in sections with free capacity; roll numbers are regenerated alphabetically.</p></Card>
      {done && <div className="alert ok">Promotion {done.fromYear} → {done.toYear} complete: {done.promoted} promoted, {done.retained} retained, {done.completed} completed school, {done.withdrawn + done.transferredOut} left.</div>}
      {plan && (<>
        <div className="grid g4"><Stat value={plan.summary.total} label="Students" /><Stat value={items.filter((i) => i.action === 'promote').length} label="To promote" tone="green" /><Stat value={items.filter((i) => i.action === 'retain').length} label="To retain" tone="amber" /><Stat value={problems} label="Need a section" tone={problems ? 'red' : undefined} /></div>
        <Card flush><DataTable rows={items} rowKey="enrolmentId" columns={[{ label: 'Student', render: (i) => <b>{i.name}</b> }, { label: 'Adm. no', key: 'admissionNo' }, { label: 'From', render: (i) => `${i.fromClass} ${i.fromSection}` },
          { label: 'Action', render: (i) => <Select value={i.action} onChange={(e) => { const action = e.target.value; const match = plan.items.find((p) => p.enrolmentId === i.enrolmentId); upd(i.enrolmentId, { action, toSectionId: action === 'promote' ? match.toSectionId : action === 'retain' ? undefined : undefined }); }} options={plan.actions.map((a) => ({ value: a, label: label(a) }))} aria-label={`Action for ${i.name}`} /> },
          { label: 'Destination', render: (i) => ['promote', 'retain'].includes(i.action) ? <Select value={i.toSectionId || ''} onChange={(e) => upd(i.enrolmentId, { toSectionId: e.target.value })} placeholder="Choose section" options={sectionsFor(i).map((s) => ({ value: s.id, label: `${s.className} ${s.name} (${s.planned}/${s.capacity})` }))} aria-label={`Destination for ${i.name}`} /> : <span className="muted">{i.action === 'complete' ? 'Completed school' : 'Leaves school'}</span> },
          { label: '', render: (i) => i.warnings?.map((w) => <Badge key={w} tone="red">{w}</Badge>) }]} /></Card>
        <Card><div className="row wrap"><label className="row"><input type="checkbox" checked={opts.makeCurrent} onChange={(e) => setOpts({ ...opts, makeCurrent: e.target.checked })} /> Make {plan.toYear.name} the current year</label>
          <label className="row"><input type="checkbox" checked={opts.closeFromYear} onChange={(e) => setOpts({ ...opts, closeFromYear: e.target.checked })} /> Close {plan.fromYear.name} (read-only history)</label><div className="grow" />
          <ConfirmButton variant="primary" disabled={problems > 0 || busy} message={`Commit promotion for ${items.length} students? This cannot be undone.`} onConfirm={commit}>Commit promotion</ConfirmButton></div></Card></>)}
    </div>
  );
}

// ───────────── Bulk import (data dumping) ─────────────
const TEMPLATES = {
  students: { cols: ['name', 'dob', 'gender', 'className', 'section', 'admissionNo', 'rollNo', 'admissionDate', 'phone', 'address', 'house', 'guardianName', 'guardianRelationship', 'guardianPhone'], sample: { name: 'Asha Verma', dob: '2013-04-21', gender: 'female', className: 'Class 8', section: 'A', admissionNo: 'A1001', guardianName: 'Ravi Verma', guardianRelationship: 'Father', guardianPhone: '9876543210' } },
  teachers: { cols: ['name', 'employeeId', 'email', 'phone', 'designation', 'qualification', 'joiningDate', 'subjects'], sample: { name: 'Neha Iyer', employeeId: 'T100', email: 'neha@school.org', subjects: 'Mathematics;Science' } },
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
      {busy && !report && <Spinner />}
      {report && !result && (<Card title="2. Check results">
        <div className="row wrap"><Badge tone="green">{report.valid} valid</Badge><Badge tone={report.invalid ? 'red' : ''}>{report.invalid} with problems</Badge><span className="muted small">of {report.total} rows</span></div>
        {report.report.filter((r) => !r.ok).length > 0 && <div className="scroll-y" style={{ marginTop: 12 }}><DataTable rows={report.report.filter((r) => !r.ok)} rowKey="row" columns={[{ label: 'Row', key: 'row' }, { label: 'Name', key: 'name' }, { label: 'Problems', render: (r) => r.errors.join(' · ') }]} /></div>}
        <div className="row" style={{ marginTop: 14 }}><label className="row"><input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} /> Import the valid rows and skip the rest</label><div className="grow" />
          <Button onClick={reset}>Cancel</Button><Button variant="primary" loading={busy} disabled={!report.valid || (report.invalid > 0 && !skipInvalid)} onClick={commit}>Import {report.valid} record(s)</Button></div></Card>)}
      {result && (<Card title="Import complete">
        <div className="alert ok">{result.created} created · {result.skipped} skipped. Download the temporary logins now — they are not shown again.</div>
        <div className="row" style={{ marginTop: 12 }}><Button variant="primary" onClick={() => saveText(`${entity}-logins.csv`, toCsvText(result.credentials, Object.keys(result.credentials[0] || {})))} disabled={!result.credentials.length}>Download logins (CSV)</Button><Button onClick={reset}>Import another file</Button></div></Card>)}
      <Card title="Previous imports" flush><Async state={batches} empty={<div className="empty">No imports yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'When', render: (b) => fmtDateTime(b.createdAt) }, { label: 'Type', render: (b) => label(b.entity) }, { label: 'Created', key: 'created' }, { label: 'Skipped', key: 'skipped' }, { label: 'By', render: (b) => (b.actingAsSuperAdmin ? <Badge tone="amber">Super Admin</Badge> : 'School admin') }, { label: 'Status', render: (b) => <Badge tone={b.status === 'committed' ? 'green' : ''}>{label(b.status)}</Badge> },
        { label: '', render: (b) => b.status === 'committed' && <ConfirmButton size="sm" variant="danger" message="Roll back this import? Records that already have attendance or marks are kept." onConfirm={async () => { const r = await run(() => post(`/api/school/imports/${b._id}/rollback`), (x) => `${x.removed} removed${x.kept.length ? `, ${x.kept.length} kept (have records)` : ''}`); if (r) batches.reload(); }}>Roll back</ConfirmButton> }]} />}</Async></Card>
    </div>
  );
}

// ───────────── Reports ─────────────
export function Reports() {
  const rep = useApi('/api/school/reports/summary');
  const L = useLookups();
  const [sectionId, setSectionId] = useState('');
  const [run] = useAction();
  const merged = useMemo(() => (rep.data ? rep.data.strength.map((s, i) => ({ name: `${s.className?.replace('Class ', '')}-${s.section}`, students: s.students, attendance: rep.data.attendance[i]?.percentage })) : []), [rep.data]);
  return (
    <div className="stack">
      <PageHeader title="Reports & exports" subtitle="Exports contain exactly what you are allowed to see on screen" actions={<>
        <Button onClick={() => run(() => download('/api/school/export/students.csv', 'students.csv'))}>Export students</Button><Button onClick={() => run(() => download('/api/school/export/teachers.csv', 'teachers.csv'))}>Export teachers</Button></>} />
      <Async state={rep}>{(r) => (<>
        <div className="grid g2">
          <Card title="Class strength"><BarsChart data={merged} x="name" bars={[{ key: 'students', name: 'Students' }]} /></Card>
          <Card title="Attendance by section (year to date)"><BarsChart data={merged.filter((m) => m.attendance != null)} x="name" bars={[{ key: 'attendance', name: 'Attendance %', color: 'rgb(var(--c-success))' }]} domain={[0, 100]} unit="%" /></Card>
        </div>
        <Card title="Result averages" flush><DataTable rows={r.results} rowKey="exam" empty="No published results yet" columns={[{ label: 'Class', key: 'className' }, { label: 'Exam', key: 'exam' }, { label: 'Students', key: 'students' }, { label: 'Average %', key: 'average' }]} /></Card></>)}</Async>
      <Card title="Attendance export"><div className="row wrap"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={L.sectionOptions} placeholder="Choose section" aria-label="Section" /><Button disabled={!sectionId} onClick={() => run(() => download('/api/school/export/attendance.csv', 'attendance.csv', { sectionId }))}>Download CSV</Button></div></Card>
    </div>
  );
}

// ───────────── Settings ─────────────
export function Settings() {
  const s = useApi('/api/school/settings');
  const [v, setV] = useState(null);
  const [run, busy] = useAction();
  const data = v || s.data;
  const set = (patch) => setV({ ...data, ...patch });
  const save = async () => {
    const body = { schoolName: data.schoolName, timezone: data.timezone, workingDays: data.workingDays, admissionFormat: data.admissionFormat, attendance: data.attendance, leaveBalances: data.leaveBalances, staffLeaveBalances: data.staffLeaveBalances, staffAttendance: data.staffAttendance, statutory: data.statutory, showAttendanceVsPerformance: data.showAttendanceVsPerformance, studentCanEditProfile: data.studentCanEditProfile, grading: data.grading };
    const r = await run(() => put('/api/school/settings', body), 'Settings saved'); if (r) { setV(null); s.reload(); }
  };
  if (!data) return <Async state={s}>{() => null}</Async>;
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="stack">
      <PageHeader title="School settings" subtitle="Changes apply going forward. Published report cards keep the grading they were published with." actions={<Button variant="primary" loading={busy} onClick={save}>Save settings</Button>} />
      <div className="grid g2">
        <Card title="General"><div className="stack">
          <Field label="School name"><Input value={data.schoolName} onChange={(e) => set({ schoolName: e.target.value })} /></Field>
          <Field label="Time zone" hint="Used for 'today', countdowns and scheduling"><Input value={data.timezone} onChange={(e) => set({ timezone: e.target.value })} /></Field>
          <Field label="Admission number format" hint="{YYYY} year, {SEQ:4} zero-padded counter"><Input value={data.admissionFormat} onChange={(e) => set({ admissionFormat: e.target.value })} /></Field>
          <div><div className="bold" style={{ marginBottom: 6 }}>Working days</div><div className="row wrap">{[1, 2, 3, 4, 5, 6, 7].map((d) => <label key={d} className="chip"><input type="checkbox" checked={data.workingDays.includes(d)} onChange={(e) => set({ workingDays: e.target.checked ? [...data.workingDays, d].sort() : data.workingDays.filter((x) => x !== d) })} /> {days[d]}</label>)}</div></div>
        </div></Card>
        <Card title="Attendance rules"><div className="stack">
          <label className="row"><input type="checkbox" checked={data.attendance.lateCountsAsPresent} onChange={(e) => set({ attendance: { ...data.attendance, lateCountsAsPresent: e.target.checked } })} /> Late counts as present in the percentage</label>
          <div className="alert info small">Only a section's class teacher can take its attendance. Once submitted it is locked for teachers; the school admin corrects it with a reason.</div>
          <label className="row"><input type="checkbox" checked={data.showAttendanceVsPerformance} onChange={(e) => set({ showAttendanceVsPerformance: e.target.checked })} /> Show attendance-vs-performance analysis to teachers</label>
        </div></Card>
        <Card title="Grading"><div className="stack">
          <Field label="Pass percentage"><Input type="number" min="0" max="100" value={data.grading.passPercentage} onChange={(e) => set({ grading: { ...data.grading, passPercentage: Number(e.target.value) } })} /></Field>
          <table><thead><tr><th>Minimum %</th><th>Grade</th><th /></tr></thead><tbody>{data.grading.scale.map((b, i) => <tr key={i}>
            <td><Input type="number" value={b.min} onChange={(e) => set({ grading: { ...data.grading, scale: data.grading.scale.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)) } })} /></td>
            <td><Input value={b.grade} onChange={(e) => set({ grading: { ...data.grading, scale: data.grading.scale.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)) } })} /></td>
            <td><Button size="sm" onClick={() => set({ grading: { ...data.grading, scale: data.grading.scale.filter((_, j) => j !== i) } })} disabled={data.grading.scale.length <= 2}>Remove</Button></td></tr>)}</tbody></table>
          <div><Button size="sm" onClick={() => set({ grading: { ...data.grading, scale: [...data.grading.scale, { min: 0, grade: '' }] } })}>+ Add band</Button></div>
        </div></Card>
        <Card title="Teacher leave allowance (days per year)"><div className="form-grid">{['casual', 'sick', 'earned', 'other'].map((k) => <Field key={k} label={label(k)}><Input type="number" min="0" value={data.leaveBalances[k]} onChange={(e) => set({ leaveBalances: { ...data.leaveBalances, [k]: Number(e.target.value) } })} /></Field>)}</div>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <div className="bold" style={{ marginBottom: 6 }}>Students may edit their own</div><div className="row wrap">{['phone', 'address', 'email'].map((f) => <label key={f} className="chip"><input type="checkbox" checked={data.studentCanEditProfile.includes(f)} onChange={(e) => set({ studentCanEditProfile: e.target.checked ? [...data.studentCanEditProfile, f] : data.studentCanEditProfile.filter((x) => x !== f) })} /> {label(f)}</label>)}</div>
        </Card>
      </div>
      <StaffPolicies data={data} set={set} />
    </div>
  );
}

// ───────────── Audit ─────────────
export function Audit() {
  const [action, setAction] = useState('');
  const rows = useApi('/api/school/audit', { action, limit: 200 });
  return (
    <div className="stack">
      <PageHeader title="Audit log" subtitle="Who did what, and when. Includes actions taken by the platform administrator on your behalf." />
      <Card flush><div className="card-b"><Input placeholder="Filter by action, e.g. attendance. or marks." value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter" /></div>
        <Async state={rows} empty={<Empty title="No entries" />}>{(r) => <DataTable rows={r} columns={[{ label: 'When', render: (x) => fmtDateTime(x.createdAt) }, { label: 'Who', render: (x) => <>{x.actorName} <span className="muted small">({x.actorRole})</span> {x.actingAsSuperAdmin && <Badge tone="amber">platform</Badge>}</> }, { label: 'Action', key: 'action' }, { label: 'Details', key: 'summary' }]} />}</Async></Card>
    </div>
  );
}

/** Staff working hours, the school's location for check-in, staff leave allowances, and statutory deductions. */
function StaffPolicies({ data, set }) {
  const sa = data.staffAttendance; const st = data.statutory;
  const [locating, setLocating] = useState(false);
  const setSa = (patch) => set({ staffAttendance: { ...sa, ...patch } });
  const setSt = (k, patch) => set({ statutory: { ...st, [k]: { ...st[k], ...patch } } });
  const useHere = () => { setLocating(true); navigator.geolocation.getCurrentPosition((p) => { setSa({ location: { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), radiusMeters: sa.location?.radiusMeters || 200 } }); setLocating(false); }, () => { setLocating(false); window.alert('Could not get your location. Allow location access, or type the coordinates.'); }); };
  const num = (v) => (v === '' ? '' : Number(v));
  return (
    <div className="grid g2">
      <Card title="Staff working hours & check-in"><div className="stack">
        <div className="form-grid">
          <Field label="Shift starts"><Input type="time" value={sa.shiftStart} onChange={(e) => setSa({ shiftStart: e.target.value })} /></Field>
          <Field label="Shift ends"><Input type="time" value={sa.shiftEnd} onChange={(e) => setSa({ shiftEnd: e.target.value })} /></Field>
          <Field label="Grace period (minutes)" hint="Arriving within this is on time"><Input type="number" min="0" value={sa.graceMinutes} onChange={(e) => setSa({ graceMinutes: num(e.target.value) })} /></Field>
          <Field label="Full day (hours)"><Input type="number" min="1" step="0.5" value={sa.fullDayHours} onChange={(e) => setSa({ fullDayHours: num(e.target.value) })} /></Field>
          <Field label="Half day below (hours)"><Input type="number" min="0.5" step="0.5" value={sa.halfDayHours} onChange={(e) => setSa({ halfDayHours: num(e.target.value) })} /></Field>
        </div>
        <div className="bold">Check in only from the school <span className="muted">(optional)</span></div>
        <label className="row"><input type="checkbox" checked={!!sa.location} onChange={(e) => setSa({ location: e.target.checked ? { lat: 0, lng: 0, radiusMeters: 200 } : null })} /> Staff may check in only within a distance of the school</label>
        {sa.location && <div className="form-grid">
          <Field label="Latitude"><Input type="number" step="any" value={sa.location.lat} onChange={(e) => setSa({ location: { ...sa.location, lat: num(e.target.value) } })} /></Field>
          <Field label="Longitude"><Input type="number" step="any" value={sa.location.lng} onChange={(e) => setSa({ location: { ...sa.location, lng: num(e.target.value) } })} /></Field>
          <Field label="Allowed distance (metres)"><Input type="number" min="20" value={sa.location.radiusMeters} onChange={(e) => setSa({ location: { ...sa.location, radiusMeters: num(e.target.value) } })} /></Field>
          <div style={{ alignSelf: 'end' }}><Button size="sm" loading={locating} onClick={useHere}>Use my current location</Button></div>
        </div>}
        <p className="muted small" style={{ margin: 0 }}>Stand at the school and press “Use my current location”. A check-in from outside the distance is refused. Staff without a login, and machine imports, are not affected.</p>
      </div></Card>
      <Card title="Staff leave allowance (days per year)"><div className="form-grid">{['casual', 'sick', 'earned', 'other'].map((k) => <Field key={k} label={label(k)}><Input type="number" min="0" value={data.staffLeaveBalances[k]} onChange={(e) => set({ staffLeaveBalances: { ...data.staffLeaveBalances, [k]: Number(e.target.value) } })} /></Field>)}</div><p className="muted small">For non-teaching and transport staff. Unpaid leave has no limit.</p></Card>
      <Card title="Statutory deductions (India)"><div className="stack">
        <p className="muted small" style={{ margin: 0 }}>Switch on what applies to your school. These are deducted on every payslip, unless a pay level already has its own line for that deduction (it is then used, never added twice). Employer shares are shown in the monthly statutory report.</p>
        <label className="row"><input type="checkbox" checked={st.pf.enabled} onChange={(e) => setSt('pf', { enabled: e.target.checked })} /> <b>Provident Fund (PF)</b></label>
        {st.pf.enabled && <div className="form-grid"><Field label="Employee %"><Input type="number" step="0.01" value={st.pf.employeeRate} onChange={(e) => setSt('pf', { employeeRate: num(e.target.value) })} /></Field><Field label="Employer %"><Input type="number" step="0.01" value={st.pf.employerRate} onChange={(e) => setSt('pf', { employerRate: num(e.target.value) })} /></Field><Field label="Wage ceiling (₹/month)"><Input type="number" value={st.pf.wageCeiling} onChange={(e) => setSt('pf', { wageCeiling: num(e.target.value) })} /></Field></div>}
        <label className="row"><input type="checkbox" checked={st.esi.enabled} onChange={(e) => setSt('esi', { enabled: e.target.checked })} /> <b>ESI</b></label>
        {st.esi.enabled && <div className="form-grid"><Field label="Employee %"><Input type="number" step="0.01" value={st.esi.employeeRate} onChange={(e) => setSt('esi', { employeeRate: num(e.target.value) })} /></Field><Field label="Employer %"><Input type="number" step="0.01" value={st.esi.employerRate} onChange={(e) => setSt('esi', { employerRate: num(e.target.value) })} /></Field><Field label="Applies up to gross (₹/month)"><Input type="number" value={st.esi.grossCeiling} onChange={(e) => setSt('esi', { grossCeiling: num(e.target.value) })} /></Field></div>}
        <label className="row"><input type="checkbox" checked={st.pt.enabled} onChange={(e) => setSt('pt', { enabled: e.target.checked })} /> <b>Professional Tax</b></label>
        {st.pt.enabled && <div className="stack-sm">{st.pt.slabs.map((sl, i) => (
          <div className="row" key={i}><span className="muted">Gross up to ₹</span><Input aria-label={`Slab ${i + 1} up to`} type="number" value={sl.upTo >= 1e9 ? '' : sl.upTo} placeholder="no limit" onChange={(e) => setSt('pt', { slabs: st.pt.slabs.map((x, j) => (j === i ? { ...x, upTo: e.target.value === '' ? 1000000000 : num(e.target.value) } : x)) })} style={{ maxWidth: 140 }} /><span className="muted">tax ₹</span><Input aria-label={`Slab ${i + 1} amount`} type="number" value={sl.amount} onChange={(e) => setSt('pt', { slabs: st.pt.slabs.map((x, j) => (j === i ? { ...x, amount: num(e.target.value) } : x)) })} style={{ maxWidth: 110 }} /></div>))}</div>}
      </div></Card>
    </div>
  );
}
