import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { get, download } from '../api/client.js';
import { Async, Button, Card, DataTable, Field, Input, Select, Tabs, useAction } from './ui.jsx';

/**
 * The Export centre: pick what to take out (students, their attendance, results or fees; teachers and staff, their attendance or payroll),
 * narrow it with the filters on top (class, section, dates, status ...), tick the columns, look at the first rows, then download the spreadsheet.
 */
const STATUS = [['active', 'Current students'], ['all', 'Everyone, including past students'], ['withdrawn', 'Withdrawn'], ['transferred_out', 'Transferred out'], ['completed', 'Completed']];
const GENDER = [['', 'Any'], ['female', 'Girls'], ['male', 'Boys'], ['other', 'Other']];
const CATEGORY = [['', 'Everyone'], ['teaching', 'Teaching staff'], ['non_teaching', 'Non-teaching staff'], ['office', 'Desk holders'], ['transport', 'Transport crew']];
const EMP_STATUS = [['active', 'Working'], ['inactive', 'Left'], ['all', 'Working and left']];
const FEE_STATE = [['', 'All students'], ['due', 'Owing something'], ['overdue', 'Overdue'], ['clear', 'Fully paid']];
const PAY_STATUS = [['', 'Any'], ['paid', 'Paid'], ['partial', 'Part paid'], ['pending', 'Not paid yet']];
const LAYOUTS = { attendance: [['summary', 'One row per person (totals)'], ['daily', 'Day by day']], marks: [['summary', 'One row per student (totals)'], ['subjects', 'Subject by subject']] };
const toOpts = (pairs) => pairs.map(([value, label]) => ({ value, label }));
const monthLabel = (m) => { const [y, mo] = m.split('-'); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mo) - 1]} ${y}`; };

function Chips({ items, value, onChange, label }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="row wrap" role="group" aria-label={label} style={{ gap: 6 }}>
      {items.map((i) => <Button key={i.id} size="sm" variant={value.includes(i.id) ? 'primary' : undefined} aria-pressed={value.includes(i.id)} onClick={() => toggle(i.id)}>{i.name}</Button>)}
    </div>
  );
}

function Builder({ c }) {
  const [key, setKey] = useState(c.datasets[0].key);
  const [f, setF] = useState({});
  const [picked, setPicked] = useState(null); // null: the dataset's usual columns
  const [run, busy] = useAction();
  const d = c.datasets.find((x) => x.key === key);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const layout = f.layout || 'summary';
  const cols = useMemo(() => d.columns.filter((x) => !x.only || x.only === layout), [d, layout]);
  const chosen = useMemo(() => new Set(picked || d.defaults.concat(layout !== 'summary' ? d.columns.filter((x) => x.only === layout).map((x) => x.key) : [])), [picked, d, layout]);
  const shownChosen = cols.filter((x) => chosen.has(x.key));
  const has = (t) => d.filters.includes(t);
  const layoutKind = d.filters.find((t) => t.startsWith('layout:'))?.slice(7);

  const query = useMemo(() => {
    const q = { dataset: key, columns: shownChosen.map((x) => x.key).join(',') };
    for (const [k, v] of Object.entries(f)) { const s = Array.isArray(v) ? v.join(',') : v; if (s) q[k] = s; }
    return q;
  }, [key, f, shownChosen]);
  const sig = JSON.stringify(query);

  // the preview belongs to the filters it was made for; while the filters have moved on it reads "counting"
  const [got, setGot] = useState({ sig: '' });
  useEffect(() => {
    if (!shownChosen.length) return undefined;
    let live = true;
    const t = setTimeout(() => get('/api/school/export/preview', query).then((r) => live && setGot({ sig, data: r })).catch((e) => live && setGot({ sig, error: e })), 250);
    return () => { live = false; clearTimeout(t); };
  }, [sig]);
  const fresh = got.sig === sig;
  const prev = { data: fresh ? got.data : undefined, error: fresh ? got.error : undefined, loading: !fresh && shownChosen.length > 0, empty: !shownChosen.length };

  const pickDataset = (k) => { setKey(k); setF({}); setPicked(null); };
  const sections = c.options.sections.filter((s) => (f.classIds || []).includes(String(s.classId)));
  const secName = (s) => `${c.options.classes.find((x) => String(x.id) === String(s.classId))?.name?.replace('Class ', '') || ''}-${s.name}`;
  const group = (g) => c.datasets.filter((x) => x.group === g);

  return (
    <Card title="Export centre">
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>Choose what to take out, narrow it with the filters, tick the columns, and download a spreadsheet. Everything is for {c.year ? `the ${c.year} year` : 'the current year'} unless you pick dates.</p>
        {['Students', 'Teachers and staff'].map((g) => group(g).length > 0 && (
          <div key={g}><div className="small muted" style={{ marginBottom: 4 }}>{g}</div><Tabs tabs={group(g).map((x) => [x.key, x.label])} value={key} onChange={pickDataset} /></div>
        ))}
        <p className="small muted" style={{ margin: 0 }}>{d.about}</p>

        <div className="stack-sm">
          {(has('classes') || has('sections')) && (
            <Field label="Classes" hint={f.classIds?.length ? undefined : 'Leave all unticked for every class'}>
              <Chips label="Classes" items={c.options.classes.map((x) => ({ id: String(x.id), name: x.name.replace('Class ', '') }))} value={f.classIds || []} onChange={(v) => set({ classIds: v, sectionIds: (f.sectionIds || []).filter((id) => c.options.sections.some((s) => String(s.id) === id && v.includes(String(s.classId)))) })} />
            </Field>
          )}
          {has('sections') && sections.length > 0 && (
            <Field label="Sections" hint="Optional: only these sections of the classes above">
              <Chips label="Sections" items={sections.map((s) => ({ id: String(s.id), name: secName(s) }))} value={f.sectionIds || []} onChange={(v) => set({ sectionIds: v })} />
            </Field>
          )}
          <div className="form-grid">
            {has('exam') && <Field label="Exam"><Select aria-label="Exam" value={f.examId || ''} onChange={(e) => set({ examId: e.target.value })} placeholder="All published exams" options={c.options.exams.map((x) => ({ value: x.id, label: x.name }))} /></Field>}
            {has('studentStatus') && <Field label="Students"><Select aria-label="Students" value={f.status || 'active'} onChange={(e) => set({ status: e.target.value })} options={toOpts(STATUS)} /></Field>}
            {has('gender') && <Field label="Gender"><Select aria-label="Gender" value={f.gender || ''} onChange={(e) => set({ gender: e.target.value })} options={toOpts(GENDER)} /></Field>}
            {has('feeState') && <Field label="Fees"><Select aria-label="Fees" value={f.feeState || ''} onChange={(e) => set({ feeState: e.target.value })} options={toOpts(FEE_STATE)} /></Field>}
            {has('category') && <Field label="Group"><Select aria-label="Group" value={f.category || ''} onChange={(e) => set({ category: e.target.value })} options={toOpts(CATEGORY)} /></Field>}
            {has('designation') && <Field label="Designation"><Select aria-label="Designation" value={f.designation || ''} onChange={(e) => set({ designation: e.target.value })} placeholder="Any designation" options={c.options.designations.map((x) => ({ value: x, label: x }))} /></Field>}
            {has('employeeStatus') && <Field label="Employees"><Select aria-label="Employees" value={f.employeeStatus || 'active'} onChange={(e) => set({ employeeStatus: e.target.value })} options={toOpts(EMP_STATUS)} /></Field>}
            {has('payStatus') && <Field label="Payment"><Select aria-label="Payment" value={f.payStatus || ''} onChange={(e) => set({ payStatus: e.target.value })} options={toOpts(PAY_STATUS)} /></Field>}
            {has('dates') && <><Field label="From"><Input type="date" aria-label="From date" value={f.from || ''} onChange={(e) => set({ from: e.target.value })} /></Field><Field label="To"><Input type="date" aria-label="To date" value={f.to || ''} onChange={(e) => set({ to: e.target.value })} /></Field></>}
            {has('months') && <><Field label="From month"><Select aria-label="From month" value={f.fromMonth || ''} onChange={(e) => set({ fromMonth: e.target.value })} placeholder="Earliest" options={[...c.options.months].reverse().map((m) => ({ value: m, label: monthLabel(m) }))} /></Field><Field label="To month"><Select aria-label="To month" value={f.toMonth || ''} onChange={(e) => set({ toMonth: e.target.value })} placeholder="Latest" options={c.options.months.map((m) => ({ value: m, label: monthLabel(m) }))} /></Field></>}
            {layoutKind && <Field label="Layout"><Select aria-label="Layout" value={layout} onChange={(e) => { set({ layout: e.target.value }); setPicked(null); }} options={toOpts(LAYOUTS[layoutKind])} /></Field>}
          </div>
        </div>

        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Columns ({shownChosen.length} of {cols.length})</summary>
          <div className="row wrap" style={{ gap: '6px 18px', marginTop: 8 }}>
            {cols.map((x) => (
              <label key={x.key} className="row" style={{ gap: 6 }}>
                <input type="checkbox" checked={chosen.has(x.key)} onChange={() => { const n = new Set(chosen); n.has(x.key) ? n.delete(x.key) : n.add(x.key); setPicked([...n]); }} /> {x.label}
              </label>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <Button size="sm" onClick={() => setPicked(cols.map((x) => x.key))}>Tick all</Button><Button size="sm" onClick={() => setPicked(null)}>Usual columns</Button>
          </div>
        </details>

        <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <b aria-live="polite">{prev.data ? `${prev.data.total} ${prev.data.total === 1 ? 'row' : 'rows'}` : prev.loading ? 'Counting…' : ''}</b>
          <Button variant="primary" loading={busy} disabled={!shownChosen.length || !prev.data || prev.data.total === 0} onClick={() => run(() => download('/api/school/export/download', `${key.replace(/_/g, '-')}.csv`, query))}>Download spreadsheet (CSV)</Button>
        </div>
        {prev.error && <div className="alert" role="alert">{prev.error.message || 'Could not prepare this export'}</div>}
        {prev.empty && <p className="muted">Tick at least one column.</p>}
        {prev.data && (prev.data.total === 0
          ? <p className="muted">Nothing matches these filters.</p>
          : <DataTable searchable={false} pageSize={8} rowKey="i" rows={prev.data.rows.map((v, i) => ({ i, v }))} columns={prev.data.columns.map((label, n) => ({ label, render: (r) => (r.v[n] === '' || r.v[n] == null ? <span className="muted">—</span> : String(r.v[n])) }))} />)}
        {prev.data && prev.data.total > prev.data.rows.length && <p className="small muted">Showing the first {prev.data.rows.length}; the file has all {prev.data.total}.</p>}
      </div>
    </Card>
  );
}

export default function ExportCentre() {
  const cat = useApi('/api/school/export/catalog');
  return <Async state={cat}>{(c) => (c.datasets.length ? <Builder c={c} /> : <Card title="Export centre"><p className="muted">Your account does not include any exports.</p></Card>)}</Async>;
}
