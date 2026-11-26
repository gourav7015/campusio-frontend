import { createContext, useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch, del, download } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import { FilterBar, ListCard } from '../../design/ui';
import { saveText, toCsvText } from '../../lib.js';
import FormModal from '../../components/FormModal.jsx';
import PayItems, { cleanItems } from '../../components/PayItems.jsx';

/**
 * Payroll is run by the Finance department. Each month's payroll prepares itself on the school's payroll day; Finance checks every amount, adjusts it
 * (bonus, deduction), approves the amounts and records the payments. The School Admin sees the same pages without any button that changes things.
 * The server enforces the same rule.
 */
const PayCtx = createContext({ P: '/api/school/payroll', canEdit: false, canApprove: false });
const usePay = () => useContext(PayCtx);
const tone = (s) => ({ draft: 'amber', approved: 'blue', paid: 'green', pending: 'amber', partial: 'amber' }[s] || '');
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const itemsOf = (l) => (l || []).map((i) => ({ label: i.label, kind: i.kind, value: i.value }));
const summaryText = (l) => (l?.length ? l.map((i) => `${i.label} ${i.kind === 'percent' ? `${i.value}%` : fmtMoney(i.value)}`).join(', ') : '—');

/** School Admin: pay levels, everyone's salary (teachers, non-teaching and transport staff), and the monthly payroll with payslips. Teachers see only their own. */
export default function Payroll({ base = '/api/school/payroll', role = 'admin' }) {
  const ctx = useMemo(() => ({ P: base, canEdit: role === 'finance', canApprove: role === 'finance' }), [base, role]);
  return <PayCtx.Provider value={ctx}><PayrollPage /></PayCtx.Provider>;
}

function PayrollPage() {
  const { P, canEdit } = usePay();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'month';
  const sum = useApi(`${P}/summary`);
  return (
    <div className="stack">
      <PageHeader title="Payroll and salaries" subtitle={canEdit ? "Each month's payroll prepares itself on the payroll day. Check what each person will get, adjust it, approve the amounts, then record the payments. Unpaid leave and days marked absent in the staff attendance registers are deducted automatically." : "Run by the Finance department. You can see every salary, the month's payroll and what has been paid, but cannot change anything here."} />
      <Async state={sum}>{(s) => (
        <div className="grid g4">
          <Stat value={fmtMoney(s.monthlyNet)} label="Monthly salary bill (net)" sub={`Gross ${fmtMoney(s.monthlyGross)}`} tone="blue" />
          <Stat value={`${s.withSalary} / ${s.people}`} label="People with a salary" sub={`${s.teachers} teachers · ${s.staff} staff${s.withoutSalary ? ` · ${s.withoutSalary} still need one` : ''}`} tone={s.withoutSalary ? 'amber' : 'green'} />
          <Stat value={s.thisMonth ? label(s.thisMonth.status) : 'Not prepared'} label={`${monthLabel(s.month)} payroll`} sub={s.thisMonth ? `Net ${fmtMoney(s.thisMonth.totals?.net)}` : 'It prepares itself on the payroll day'} tone={s.thisMonth?.status === 'paid' ? 'green' : 'amber'} />
          <Stat value={fmtMoney(s.paidThisYear)} label="Salaries paid this academic year" tone="green" />
        </div>
      )}</Async>
      <Tabs tabs={[['month', 'This month'], ['runs', 'Payroll runs'], ['salaries', 'Salaries'], ['levels', 'Pay levels']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'month' && <Async state={sum}>{(s) => <ThisMonth s={s} onChange={sum.reload} />}</Async>}{tab === 'runs' && <Runs onChange={sum.reload} />}{tab === 'salaries' && <Salaries onChange={sum.reload} />}{tab === 'levels' && <Levels />}
    </div>
  );
}

// ───────────── this month: who gets what, and what has been paid ─────────────
function PayDay() {
  const { P, canEdit } = usePay();
  const cfg = useApi(`${P}/settings`);
  const [run] = useAction();
  return (
    <Async state={cfg}>{(c) => (
      <div className="row between wrap" style={{ gap: 12 }}>
        <span className="muted small">{c.generateDay ? `The payroll prepares itself on day ${c.generateDay} of every month, and Finance is told.` : 'Automatic preparation is switched off.'}</span>
        {canEdit && <label className="row" style={{ gap: 8, alignItems: 'center' }}><span className="small">Payroll day</span>
          <Select aria-label="Payroll day" value={String(c.generateDay)} onChange={async (e) => { await run(() => put(`${P}/settings`, { generateDay: Number(e.target.value) }), 'Payroll day saved'); cfg.reload(); }}
            options={[{ value: '0', label: 'Off' }, ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))]} /></label>}
      </div>
    )}</Async>
  );
}

function ThisMonth({ s, onChange }) {
  const { P, canEdit } = usePay();
  const [run, busy] = useAction();
  return (
    <div className="stack">
      <PayDay />
      {s.thisMonth ? <RunDetail id={s.thisMonth._id} embedded onBack={onChange} /> : (
        <Card title={`${monthLabel(s.month)} payroll`}>
          <p style={{ marginTop: 0 }}>It has not been prepared yet.{canEdit ? ' You can prepare it now, or wait for the payroll day.' : ' Finance will check it as soon as it is ready.'}</p>
          {canEdit && <Button variant="primary" loading={busy} onClick={async () => { const r = await run(() => post(`${P}/runs`, { month: s.month }), 'Payroll prepared'); if (r) onChange(); }}>Prepare it now</Button>}
        </Card>
      )}
    </div>
  );
}

// ───────────── pay levels ─────────────
function Levels() {
  const { P, canEdit } = usePay();
  const list = useApi(`${P}/levels`);
  const [edit, setEdit] = useState(null);
  const [run] = useAction();
  return (
    <>
      <Card title="Pay levels" action={canEdit ? <Button variant="primary" size="sm" onClick={() => setEdit({})}>+ Add pay level</Button> : undefined} flush>
        <Async state={list} empty={<div className="empty">No pay levels yet. Add levels like PRT, TGT, PGT or Vice Principal.</div>}>{(rows) => (
          <DataTable rows={rows} empty="No pay levels yet. Add levels like PRT, TGT, PGT or Vice Principal." columns={[
            { label: 'Level', render: (l) => <><b>{l.name}</b>{l.status === 'archived' && <> <Badge>archived</Badge></>}<div className="muted">{l.description}</div></> },
            { label: 'Basic', render: (l) => fmtMoney(l.basic) }, { label: 'Allowances', render: (l) => summaryText(l.allowances) }, { label: 'Deductions', render: (l) => summaryText(l.deductions) },
            { label: 'Gross / month', render: (l) => fmtMoney(l.gross) }, { label: 'Net / month', render: (l) => <b>{fmtMoney(l.net)}</b> }, { label: 'For', render: (l) => <Badge tone={l.appliesTo === 'non_teaching' ? 'amber' : 'blue'}>{l.appliesTo === 'non_teaching' ? 'Non-teaching' : 'Teaching'}</Badge> }, { label: 'People', key: 'teachers' },
            ...(canEdit ? [{ label: '', render: (l) => <div className="row"><Button size="sm" onClick={() => setEdit(l)}>Edit</Button>
              <ConfirmButton size="sm" variant="danger" message={`Delete ${l.name}?`} onConfirm={async () => { await run(() => del(`${P}/levels/${l._id}`), 'Level deleted'); list.reload(); }}>Delete</ConfirmButton></div> }] : []),
          ]} />
        )}</Async>
      </Card>
      <p className="muted">Editing a level does not change anyone's salary. To apply new figures, revise the person's salary (or use “Apply level”) with an effective date.</p>
      {edit && <LevelModal level={edit._id ? edit : null} onClose={() => setEdit(null)} onSaved={list.reload} />}
    </>
  );
}

function LevelModal({ level, onClose, onSaved }) {
  const { P } = usePay();
  const [f, setF] = useState({ name: level?.name || '', appliesTo: level?.appliesTo || 'teaching', description: level?.description || '', basic: level?.basic ?? '', allowances: itemsOf(level?.allowances), deductions: itemsOf(level?.deductions) });
  const [run, busy] = useAction();
  const save = async () => {
    const body = { name: f.name.trim(), ...(level ? {} : { appliesTo: f.appliesTo }), description: f.description || undefined, basic: Number(f.basic), allowances: cleanItems(f.allowances), deductions: cleanItems(f.deductions) };
    const ok = await run(() => (level ? patch(`${P}/levels/${level._id}`, body) : post(`${P}/levels`, body)), 'Pay level saved');
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal wide title={level ? `Edit ${level.name}` : 'New pay level'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.name.trim() || !(Number(f.basic) > 0)} onClick={save}>Save level</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Level name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="PRT, TGT, PGT, Vice Principal…" /></Field>
          <Field label="Basic salary per month (₹)"><Input type="number" min="0" value={f.basic} onChange={(e) => setF({ ...f, basic: e.target.value })} /></Field>
          <Field label="This level is for" hint={level ? 'A level keeps the group it was created for' : undefined}><Select disabled={!!level} value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value })} options={[{ value: 'teaching', label: 'Teachers' }, { value: 'non_teaching', label: 'Non-teaching and transport staff' }]} /></Field>
          <Field label="Description" full><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Primary Teacher, classes 1-5" /></Field>
        </div>
        <PayItems title="Allowances" basic={f.basic} items={f.allowances} onChange={(allowances) => setF({ ...f, allowances })} />
        <PayItems title="Deductions" basic={f.basic} items={f.deductions} onChange={(deductions) => setF({ ...f, deductions })} />
      </div>
    </Modal>
  );
}

// ───────────── salaries (teachers and staff) ─────────────
const groupOf = (t) => (t.personType === 'staff' ? (t.group === 'transport' ? 'transport' : 'non_teaching') : 'teacher');
const GROUP_NAME = { teacher: 'Teacher', non_teaching: 'Non-teaching', transport: 'Transport staff' };
const monthsSince = (d) => { if (!d) return 0; const [y, m] = String(d).slice(0, 7).split('-').map(Number); const n = new Date(); return (n.getFullYear() - y) * 12 + (n.getMonth() + 1 - m); };
const ago = (m) => (m <= 0 ? 'This month' : m === 1 ? '1 month ago' : m < 12 ? `${m} months ago` : `${Math.floor(m / 12)} year${m >= 24 ? 's' : ''}${m % 12 ? ` ${m % 12} mo` : ''} ago`);
const Chip = ({ name, size = 36 }) => <span aria-hidden="true" className="av-chip" style={{ width: size, height: size, fontSize: size > 48 ? 21 : 12.5 }}>{(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>;
const BLANK = { q: '', who: 'all', level: '', role: '', salary: 'all', revised: 'all', min: '', max: '' };

/** The register of everyone's salary: filter it down, tick the people you mean, then change them together. Nothing is saved until it has been previewed. */
function Salaries({ onChange }) {
  const { P, canEdit } = usePay();
  const list = useApi(`${P}/salaries`);
  const levels = useApi(`${P}/levels`);
  const [f, setF] = useState(BLANK);
  const [picked, setPicked] = useState({});
  const [sel, setSel] = useState(null); // the person shown in the side panel
  const [edit, setEdit] = useState(null); const [hist, setHist] = useState(null); const [inc, setInc] = useState(false); const [apply, setApply] = useState(false);
  const reload = () => { list.reload(); onChange?.(); };
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const all = useMemo(() => list.data?.items || [], [list.data]);
  const forGroup = (group) => (levels.data || []).filter((l) => l.status === 'active' && (l.appliesTo === 'non_teaching') === (group === 'staff'));

  const levelOpts = useMemo(() => {
    const m = new Map(); let custom = 0;
    for (const t of all) { const r = t.revision; if (!r) continue; if (r.levelId) m.set(String(r.levelId), { name: r.levelName || 'Level', n: (m.get(String(r.levelId))?.n || 0) + 1 }); else custom += 1; }
    return [...[...m].sort((x, y) => x[1].name.localeCompare(y[1].name)).map(([value, v]) => ({ value, label: `${v.name} (${v.n})` })), ...(custom ? [{ value: '__custom__', label: `Custom pay, no level (${custom})` }] : [])];
  }, [all]);
  const roleOpts = useMemo(() => {
    const m = new Map();
    for (const t of all) if (t.designation && (f.who === 'all' || groupOf(t) === f.who)) m.set(t.designation, (m.get(t.designation) || 0) + 1);
    return [...m].sort((x, y) => x[0].localeCompare(y[0])).map(([d, n]) => ({ value: d, label: `${d} (${n})` }));
  }, [all, f.who]);

  const rows = useMemo(() => {
    const needle = f.q.trim().toLowerCase(); const lo = f.min === '' ? null : Number(f.min); const hi = f.max === '' ? null : Number(f.max);
    return all.filter((t) => {
      const r = t.revision;
      if (needle && !`${t.name} ${t.code || ''} ${t.designation || ''}`.toLowerCase().includes(needle)) return false;
      if (f.who !== 'all' && groupOf(t) !== f.who) return false;
      if (f.role && t.designation !== f.role) return false;
      if (f.level && (f.level === '__custom__' ? !(r && !r.levelId) : String(r?.levelId) !== f.level)) return false;
      if (f.salary === 'with' && !r) return false;
      if (f.salary === 'without' && r) return false;
      if (f.revised !== 'all' && (!r || monthsSince(r.effectiveFrom) < Number(f.revised))) return false;
      if (lo != null && !(r && r.net >= lo)) return false;
      if (hi != null && !(r && r.net <= hi)) return false;
      return true;
    });
  }, [all, f]);

  const filtersOn = JSON.stringify(f) !== JSON.stringify(BLANK);
  // only people the list is showing count as ticked, so a change can never reach someone hidden by a filter
  const ticked = rows.filter((t) => picked[t.personId]);
  const allTicked = rows.length > 0 && ticked.length === rows.length;
  const withPay = rows.filter((t) => t.revision);
  const bill = withPay.reduce((n, t) => n + t.revision.net, 0);
  const cur = rows.find((t) => t.personId === sel) || null;
  const exportCsv = () => {
    const src = ticked.length ? ticked : rows;
    saveText(`salaries-${todayStr()}.csv`, toCsvText(src.map((t) => ({ Name: t.name, 'Employee id': t.code || '', Group: GROUP_NAME[groupOf(t)], Designation: t.designation || '', Level: t.revision ? (t.revision.levelName || 'Custom') : '', Basic: t.revision?.basic ?? '', Gross: t.revision?.gross ?? '', 'Net per month': t.revision?.net ?? '', 'Effective from': t.revision?.effectiveFrom?.slice(0, 10) || '' })),
      ['Name', 'Employee id', 'Group', 'Designation', 'Level', 'Basic', 'Gross', 'Net per month', 'Effective from']));
  };

  return (
    <>
      <Async state={list}>{() => (
        <div className={`stu-split${cur ? ' open' : ''}`}>
          <ListCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div><h2 className="text-base font-semibold tracking-tight">Salaries</h2><p className="text-[13px] text-muted-foreground">Filter the list, tick the people you mean, then change them together.</p></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={exportCsv} disabled={!rows.length}>{ticked.length ? `Export ${ticked.length} to CSV` : 'Export CSV'}</Button>
                {canEdit && <><Button size="sm" onClick={() => setApply(true)} disabled={!rows.length}>Apply pay level…</Button><Button size="sm" variant="primary" onClick={() => setInc(true)} disabled={!withPay.length}>Give an increment…</Button></>}
              </div>
            </div>
            <FilterBar search={f.q} onSearch={(v) => set({ q: v })} searchLabel="Search people" placeholder="Search name, id or designation">
              <Select aria-label="Who" value={f.who} onChange={(e) => set({ who: e.target.value, role: '' })} options={[{ value: 'all', label: 'Everyone' }, { value: 'teacher', label: 'Teachers' }, { value: 'non_teaching', label: 'Non-teaching staff' }, { value: 'transport', label: 'Transport staff' }]} />
              <Select aria-label="Level" value={f.level} onChange={(e) => set({ level: e.target.value })} options={levelOpts} placeholder="All levels" />
              <Select aria-label="Designation" value={f.role} onChange={(e) => set({ role: e.target.value })} options={roleOpts} placeholder="All designations" />
              <Select aria-label="Salary" value={f.salary} onChange={(e) => set({ salary: e.target.value })} options={[{ value: 'all', label: 'Salary: all' }, { value: 'with', label: 'Salary set' }, { value: 'without', label: 'No salary yet' }]} />
              <Select aria-label="Last revised" value={f.revised} onChange={(e) => set({ revised: e.target.value })} options={[{ value: 'all', label: 'Revised: any time' }, { value: '6', label: 'Not for 6+ months' }, { value: '12', label: 'Not for a year+' }]} />
              <Input type="number" min="0" aria-label="Net pay at least" placeholder="Net from ₹" value={f.min} onChange={(e) => set({ min: e.target.value })} style={{ width: 118 }} />
              <Input type="number" min="0" aria-label="Net pay at most" placeholder="Net up to ₹" value={f.max} onChange={(e) => set({ max: e.target.value })} style={{ width: 118 }} />
            </FilterBar>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border/70 px-4 py-2.5 text-[13.5px] text-muted-foreground">
              <span><b className="tabular-nums text-foreground">{rows.length}</b> {rows.length === 1 ? 'person' : 'people'}{filtersOn ? ` of ${all.length}` : ''}</span>
              <span>Monthly net <b className="tabular-nums text-foreground">{fmtMoney(bill)}</b></span>
              {withPay.length > 0 && <span>Average <b className="tabular-nums text-foreground">{fmtMoney(Math.round(bill / withPay.length))}</b></span>}
              {rows.length > withPay.length && <Badge tone="amber">{rows.length - withPay.length} without a salary</Badge>}
              {filtersOn && <button type="button" className="ml-auto rounded-md font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setF(BLANK); }}>Clear filters</button>}
            </div>
            {ticked.length > 0 && (
              <div className="stu-bulk" role="status"><b>{ticked.length} selected</b>
                {canEdit && <><Button size="sm" onClick={() => setInc(true)} disabled={!ticked.some((t) => t.revision)}>Increment for selected…</Button><Button size="sm" onClick={() => setApply(true)}>Apply level to selected…</Button></>}
                <Button size="sm" onClick={() => setPicked({})} style={{ marginLeft: 'auto' }}>Clear</Button></div>
            )}
            <DataTable rows={rows} rowKey="personId" pageSize={25} empty={all.length ? 'Nobody matches these filters' : 'No teachers or staff yet'} onRowClick={(t) => setSel((c) => (c === t.personId ? null : t.personId))} rowClassName={(t) => (t.personId === sel ? 'sel' : '')} columns={[
              { label: <input type="checkbox" className="chk" aria-label={`Select all ${rows.length} people shown`} checked={allTicked} ref={(el) => { if (el) el.indeterminate = ticked.length > 0 && !allTicked; }} onChange={() => setPicked(allTicked ? {} : Object.fromEntries(rows.map((t) => [t.personId, true])))} />,
                render: (t) => <input type="checkbox" className="chk" aria-label={`Select ${t.name}`} checked={!!picked[t.personId]} onChange={(e) => setPicked((p) => ({ ...p, [t.personId]: e.target.checked }))} /> },
              { label: 'Name', sort: (t) => t.name, render: (t) => <div className="flex items-center gap-3"><Chip name={t.name} /><div><b className="whitespace-nowrap">{t.name}</b><div className="small muted whitespace-nowrap">{t.code}{t.designation ? ` · ${t.designation}` : ''}</div></div></div> },
              { label: 'Group', sort: (t) => GROUP_NAME[groupOf(t)], render: (t) => <Badge tone={t.personType === 'staff' ? 'amber' : 'blue'}>{GROUP_NAME[groupOf(t)]}</Badge> },
              { label: 'Level', sort: (t) => t.revision?.levelName || (t.revision ? 'Custom' : null), render: (t) => (t.revision ? (t.revision.levelName || 'Custom') : <Badge tone="amber">No salary</Badge>) },
              { label: 'Basic', right: true, sort: (t) => t.revision?.basic ?? null, render: (t) => (t.revision ? fmtMoney(t.revision.basic) : '—') },
              { label: 'Gross', right: true, sort: (t) => t.revision?.gross ?? null, render: (t) => (t.revision ? fmtMoney(t.revision.gross) : '—') },
              { label: 'Net / month', right: true, sort: (t) => t.revision?.net ?? null, render: (t) => (t.revision ? <b>{fmtMoney(t.revision.net)}</b> : '—') },
              { label: 'Since', sort: (t) => t.revision?.effectiveFrom ?? null, render: (t) => <span className="whitespace-nowrap">{t.revision ? fmtDate(t.revision.effectiveFrom, true) : '—'}</span> },
              { label: '', render: (t) => <div className="row">{canEdit && <Button size="sm" onClick={() => setEdit(t)}>{t.revision ? 'Revise' : 'Set salary'}</Button>}{t.revision && <Button size="sm" onClick={() => setHist(t)}>History</Button>}</div> },
            ]} />
          </ListCard>
          {cur && <SalaryPreview key={cur.personId} t={cur} canEdit={canEdit} onClose={() => setSel(null)} onRevise={() => setEdit(cur)} onHistory={() => setHist(cur)} />}
        </div>
      )}</Async>
      {edit && <SalaryModal teacher={edit} levels={forGroup(edit.personType === 'staff' ? 'staff' : 'teachers')} onClose={() => setEdit(null)} onSaved={reload} />}
      {hist && <HistoryModal teacher={hist} onClose={() => setHist(null)} />}
      {inc && <IncrementModal picked={ticked} shown={rows} onClose={() => setInc(false)} onSaved={reload} />}
      {apply && <ApplyLevelModal picked={ticked} shown={rows} levels={(levels.data || []).filter((l) => l.status === 'active')} onClose={() => setApply(false)} onSaved={reload} />}
    </>
  );
}

/** One person's pay at a glance beside the list, with a way into revising it. */
function SalaryPreview({ t, canEdit, onClose, onRevise, onHistory }) {
  const { P } = usePay();
  const h = useApi(t.revision ? `${P}/salaries/${t.personId}` : null);
  const r = t.revision;
  const recent = (h.data?.history || []).slice(0, 4);
  return (
    <aside className="stu-preview" aria-label={`${t.name}, salary preview`}>
      <div className="row" style={{ justifyContent: 'space-between' }}><Badge tone="blue">Preview</Badge><Button size="sm" onClick={onClose} aria-label="Close preview">Close</Button></div>
      <div className="stu-preview-top"><Chip name={t.name} size={64} /><h3>{t.name}</h3><span className="muted small">{t.code}{t.designation ? ` · ${t.designation}` : ''}</span><Badge tone={t.personType === 'staff' ? 'amber' : 'blue'}>{GROUP_NAME[groupOf(t)]}</Badge></div>
      {r ? (
        <>
          <div className="rounded-xl bg-tone-soft px-4 py-3 text-center"><div className="text-[13px] text-muted-foreground">Take-home per month</div><div className="text-2xl font-semibold tabular-nums">{fmtMoney(r.net)}</div><div className="text-[13px] text-muted-foreground">Gross {fmtMoney(r.gross)}</div></div>
          <dl className="stu-facts">
            <div><dt>Level</dt><dd>{r.levelName || 'Custom'}</dd></div>
            {(r.earnings || []).map((e) => <div key={`e-${e.label}`}><dt>{e.label}</dt><dd className="tabular-nums">{fmtMoney(e.amount)}</dd></div>)}
            {(r.deductions || []).map((d) => <div key={`d-${d.label}`}><dt>{d.label} (deducted)</dt><dd className="tabular-nums">−{fmtMoney(d.amount)}</dd></div>)}
            <div><dt>Pay since</dt><dd>{fmtDate(r.effectiveFrom, true)}</dd></div>
            <div><dt>Last revised</dt><dd>{ago(monthsSince(r.effectiveFrom))}</dd></div>
            {t.joiningDate && <div><dt>Joined</dt><dd>{fmtDate(t.joiningDate, true)}</dd></div>}
          </dl>
          {recent.length > 1 && (
            <div><h4 className="mb-1 text-[13px] font-semibold">Recent changes</h4>
              <ul className="space-y-1.5 text-[13px]">{recent.map((x) => <li key={x._id} className="flex justify-between gap-3"><span className="text-muted-foreground">{fmtDate(x.effectiveFrom, true)}{x.reason ? ` · ${x.reason}` : ''}</span><b className="tabular-nums">{fmtMoney(x.basic)}</b></li>)}</ul></div>
          )}
        </>
      ) : <p className="muted">No salary has been set for {t.name} yet.</p>}
      {canEdit && <Button variant="primary" onClick={onRevise}>{r ? 'Revise salary' : 'Set salary'}</Button>}
      {r && <Button onClick={onHistory}>Full history</Button>}
    </aside>
  );
}

/** Who a bulk change will reach: the people ticked, or everyone the list is showing. */
function WhoField({ f, set, picked, shown }) {
  return (
    <Field label="Who gets it" hint={f.who === 'picked' ? 'The people you ticked in the list.' : 'Everyone the list is showing now. Close this and use the filters above the list to narrow it.'}>
      <Select aria-label="Who gets it" value={f.who} onChange={(e) => set({ who: e.target.value })} options={[...(picked.length ? [{ value: 'picked', label: `The ${picked.length} I ticked` }] : []), { value: 'shown', label: `Everyone shown in the list (${shown.length})` }]} />
    </Field>
  );
}

function Failures({ rows, people }) {
  if (!rows?.length) return null;
  const name = (id) => people.find((t) => t.personId === id)?.name || 'Someone';
  return <Card title={`${rows.length} could not be changed`} flush><DataTable rows={rows.map((x, i) => ({ ...x, key: i }))} rowKey="key" columns={[{ label: 'Person', render: (x) => x.name || name(x.personId) }, { label: 'Why not', key: 'error' }]} /></Card>;
}

/** Raise (or lower) basic pay by a percentage or a fixed amount, from a date, for the people chosen, after seeing what it would cost. */
function IncrementModal({ picked, shown, onClose, onSaved }) {
  const { P } = usePay();
  const [f, setF] = useState({ who: picked.length ? 'picked' : 'shown', mode: 'percent', value: '', roundTo: '1', effectiveFrom: todayStr(), reason: 'Annual increment' });
  const [pre, setPre] = useState(null); const [done, setDone] = useState(null);
  const [run, busy] = useAction();
  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPre(null); };
  const people = f.who === 'picked' ? picked : shown;
  const n = Number(f.value);
  const tooMany = people.length > 1000;
  const valid = f.value !== '' && Number.isFinite(n) && n !== 0 && !!f.effectiveFrom && people.length > 0 && !tooMany;
  const body = (preview) => ({ personIds: people.map((t) => t.personId), mode: f.mode, ...(f.mode === 'percent' ? { percent: n } : { amount: n }), roundTo: Number(f.roundTo), effectiveFrom: f.effectiveFrom, reason: f.reason.trim() || undefined, preview });
  const gap = pre ? pre.newMonthlyNet - pre.oldMonthlyNet : 0;
  return (
    <Modal wide title="Give an increment" onClose={onClose} footer={done ? <Button variant="primary" onClick={onClose}>Close</Button> : <><Button onClick={onClose}>Cancel</Button>
      {!pre ? <Button variant="primary" loading={busy} disabled={!valid} onClick={async () => { const r = await run(() => post(`${P}/salaries/increment`, body(true))); if (r) setPre(r); }}>Preview</Button>
        : <Button variant="primary" loading={busy} disabled={!pre.rows.length} onClick={async () => { const r = await run(() => post(`${P}/salaries/increment`, body(false)), (x) => `New salary saved for ${x.applied} people`); if (r) { setDone(r); onSaved(); } }}>Apply to {pre.rows.length} {pre.rows.length === 1 ? 'person' : 'people'}</Button>}</>}>
      <div className="stack">
        {done ? (<>{done.applied > 0 ? <div className="alert ok">New salary saved for {done.applied} {done.applied === 1 ? 'person' : 'people'}, from {fmtDate(done.effectiveFrom, true)}. The old salary stays in each person's history.</div> : <div className="alert" role="alert">Nothing was changed.</div>}<Failures rows={done.failed} people={people} /></>) : (<>
          <div className="form-grid">
            <WhoField f={f} set={set} picked={picked} shown={shown} />
            <Field label="Increase by"><Select aria-label="Increase by" value={f.mode} onChange={(e) => set({ mode: e.target.value, value: '' })} options={[{ value: 'percent', label: 'A percentage of basic pay' }, { value: 'amount', label: 'A fixed amount (₹ a month)' }]} /></Field>
            <Field label={f.mode === 'percent' ? 'Percentage (%)' : 'Amount (₹ a month)'} hint="Use a minus sign to reduce"><Input type="number" step="any" aria-label={f.mode === 'percent' ? 'Percentage' : 'Amount'} value={f.value} onChange={(e) => set({ value: e.target.value })} placeholder={f.mode === 'percent' ? 'e.g. 5' : 'e.g. 2000'} /></Field>
            <Field label="Round the new basic to" hint="Keeps figures tidy, e.g. ₹46,652 becomes ₹46,700"><Select aria-label="Round to" value={f.roundTo} onChange={(e) => set({ roundTo: e.target.value })} options={[{ value: '1', label: 'The nearest rupee' }, { value: '10', label: 'The nearest ₹10' }, { value: '50', label: 'The nearest ₹50' }, { value: '100', label: 'The nearest ₹100' }]} /></Field>
            <Field label="Effective from" hint="Applies from the month this date falls in"><Input type="date" value={f.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></Field>
            <Field label="Reason"><Input value={f.reason} onChange={(e) => set({ reason: e.target.value })} /></Field>
          </div>
          {tooMany && <div className="alert" role="alert">That is more than 1,000 people. Narrow the list with the filters first.</div>}
          <p className="muted small" style={{ margin: 0 }}>Allowances given as a percentage of basic follow by themselves; fixed allowances and deductions stay as they are. People with no salary yet are left out.</p>
          {pre && <PreviewBox rows={pre.rows.map((r) => ({ ...r, key: r.personId }))} skipped={pre.skipped}
            total={`${pre.rows.length} ${pre.rows.length === 1 ? 'person' : 'people'}. Monthly salary bill (net) from ${fmtMoney(pre.oldMonthlyNet)} to ${fmtMoney(pre.newMonthlyNet)} (${gap >= 0 ? '+' : '−'}${fmtMoney(Math.abs(gap))} a month, about ${fmtMoney(Math.abs(Math.round(gap * 12)))} a year)`}
            head={[{ label: 'Name', render: (r) => <><b>{r.name}</b><div className="muted">{r.code}</div></> }, { label: 'Basic', render: (r) => `${fmtMoney(r.oldBasic)} → ${fmtMoney(r.newBasic)}` }, { label: 'Change', render: (r) => `${r.newBasic >= r.oldBasic ? '+' : '−'}${fmtMoney(Math.abs(r.newBasic - r.oldBasic))}` }, { label: 'Net per month', render: (r) => <b>{fmtMoney(r.newNet)}</b> }]} />}
        </>)}
      </div>
    </Modal>
  );
}

/** Give a pay level to the people chosen (a promotion, or setting up pay for new joiners). Their new pay starts from the date; the old stays in history. */
function ApplyLevelModal({ picked, shown, levels, onClose, onSaved }) {
  const { P } = usePay();
  const [f, setF] = useState({ who: picked.length ? 'picked' : 'shown', levelId: '', effectiveFrom: todayStr(), reason: 'Pay level assigned' });
  const [done, setDone] = useState(null);
  const [run, busy] = useAction();
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const people = f.who === 'picked' ? picked : shown;
  const groups = new Set(people.map((t) => (t.personType === 'staff' ? 'staff' : 'teachers')));
  const fits = levels.filter((l) => groups.size !== 1 || (l.appliesTo === 'non_teaching') === groups.has('staff'));
  const level = levels.find((l) => l._id === f.levelId);
  const replacing = people.filter((t) => t.revision).length;
  const tooMany = people.length > 1000;
  return (
    <Modal wide title="Apply a pay level" onClose={onClose} footer={done ? <Button variant="primary" onClick={onClose}>Close</Button> : <><Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" loading={busy} disabled={!level || !people.length || tooMany || !f.effectiveFrom} onClick={async () => {
        const r = await run(() => post(`${P}/salaries/bulk`, { levelId: f.levelId, personIds: people.map((t) => t.personId), effectiveFrom: f.effectiveFrom, reason: f.reason.trim() || undefined }), (x) => `Pay level applied to ${x.updated} people`);
        if (r) { setDone(r); onSaved(); }
      }}>Apply to {people.length} {people.length === 1 ? 'person' : 'people'}</Button></>}>
      <div className="stack">
        {done ? (<>{done.updated > 0 ? <div className="alert ok">{done.updated} of {people.length} people now have {level?.name}, from {fmtDate(f.effectiveFrom, true)}.</div> : <div className="alert" role="alert">Nothing was changed.</div>}<Failures rows={done.failed} people={people} /></>) : (<>
          <div className="form-grid">
            <WhoField f={f} set={(p) => { set(p); }} picked={picked} shown={shown} />
            <Field label="Pay level" hint={groups.size > 1 ? 'The list has teachers and other staff. A level fits only its own group; the others are reported as not changed.' : undefined}><Select aria-label="Pay level" value={f.levelId} onChange={(e) => set({ levelId: e.target.value })} placeholder="Choose a level" options={fits.map((l) => ({ value: l._id, label: `${l.name}${l.appliesTo === 'non_teaching' ? ' (staff)' : ''} — net ${fmtMoney(l.net)}` }))} /></Field>
            <Field label="Effective from" hint="Applies from the month this date falls in"><Input type="date" value={f.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></Field>
            <Field label="Reason"><Input value={f.reason} onChange={(e) => set({ reason: e.target.value })} /></Field>
          </div>
          {tooMany && <div className="alert" role="alert">That is more than 1,000 people. Narrow the list with the filters first.</div>}
          {level && <div className="alert info">{level.name}: basic {fmtMoney(level.basic)}, gross {fmtMoney(level.gross)}, net {fmtMoney(level.net)} a month. {replacing ? `${replacing} of the ${people.length} already ${replacing === 1 ? 'has' : 'have'} a salary; the new pay replaces it from the date and the old one stays in their history.` : `None of the ${people.length} has a salary yet.`}</div>}
        </>)}
      </div>
    </Modal>
  );
}

function SalaryModal({ teacher, levels, onClose, onSaved }) {
  const { P } = usePay();
  const cur = teacher.revision;
  const [f, setF] = useState({ levelId: cur?.levelId || '', basic: cur?.basic ?? '', allowances: itemsOf(cur?.allowances), deductions: itemsOf(cur?.deductions), effectiveFrom: todayStr(), reason: '' });
  const [run, busy] = useAction();
  const [pct, setPct] = useState('');
  const pick = (levelId) => {
    const l = levels.find((x) => x._id === levelId);
    setF(l ? { ...f, levelId, basic: l.basic, allowances: itemsOf(l.allowances), deductions: itemsOf(l.deductions) } : { ...f, levelId: '' });
  };
  const preview = useMemo(() => {
    const b = Number(f.basic) || 0; const amt = (i) => (i.kind === 'percent' ? (b * (Number(i.value) || 0)) / 100 : Number(i.value) || 0);
    const gross = b + f.allowances.reduce((n, i) => n + amt(i), 0); const ded = f.deductions.reduce((n, i) => n + amt(i), 0);
    return { gross, ded, net: gross - ded };
  }, [f]);
  const save = async () => {
    const body = { levelId: f.levelId || undefined, basic: Number(f.basic), allowances: cleanItems(f.allowances), deductions: cleanItems(f.deductions), effectiveFrom: f.effectiveFrom, reason: f.reason || undefined };
    const ok = await run(() => post(`${P}/salaries/${teacher.personId}`, body), 'Salary saved');
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal wide title={`${cur ? 'Revise' : 'Set'} salary — ${teacher.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!(Number(f.basic) > 0) || !f.effectiveFrom} onClick={save}>Save salary</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Pay level" hint="Choosing a level fills in its figures. You can still adjust them for this person."><Select value={f.levelId} onChange={(e) => pick(e.target.value)} placeholder="Custom (no level)" options={levels.filter((l) => l.status === 'active').map((l) => ({ value: l._id, label: l.name }))} /></Field>
          <Field label="Basic salary per month (₹)"><Input type="number" min="0" value={f.basic} onChange={(e) => setF({ ...f, basic: e.target.value })} /></Field>
          <Field label="Effective from" hint="A new salary applies from the month this date falls in."><Input type="date" value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></Field>
          <Field label="Reason"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Promotion, annual increment…" /></Field>
        </div>
        <div className="row wrap" style={{ gap: 8, alignItems: 'end' }}>
          <Field label="Increase basic by (%)" hint="Fills the basic salary above; save to keep it"><Input type="number" step="any" aria-label="Increase basic by percent" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="e.g. 10" style={{ width: 110 }} /></Field>
          <Button disabled={!(Number(pct) !== 0) || !(Number(f.basic) > 0)} onClick={() => { setF({ ...f, basic: Math.round(Number(f.basic) * (1 + Number(pct) / 100)) }); setPct(''); }}>Apply percentage</Button>
        </div>
        <PayItems title="Allowances" basic={f.basic} items={f.allowances} onChange={(allowances) => setF({ ...f, allowances })} />
        <PayItems title="Deductions" basic={f.basic} items={f.deductions} onChange={(deductions) => setF({ ...f, deductions })} />
        <div className="card-b row between"><span>Gross {fmtMoney(preview.gross)} − deductions {fmtMoney(preview.ded)}</span><b>Net per month {fmtMoney(preview.net)}</b></div>
      </div>
    </Modal>
  );
}

function HistoryModal({ teacher, onClose }) {
  const { P } = usePay();
  const h = useApi(`${P}/salaries/${teacher.personId}`);
  return (
    <Modal wide title={`Salary history — ${teacher.name}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Async state={h}>{(d) => (
        <DataTable rows={d.history} empty="No history" columns={[
          { label: 'From', render: (r) => fmtDate(r.effectiveFrom, true) }, { label: 'Level', render: (r) => r.levelName || 'Custom' }, { label: 'Basic', render: (r) => fmtMoney(r.basic) },
          { label: 'Gross', render: (r) => fmtMoney(r.gross) }, { label: 'Net', render: (r) => <b>{fmtMoney(r.net)}</b> }, { label: 'Reason', key: 'reason' }, { label: 'By', key: 'byName' },
        ]} />
      )}</Async>
    </Modal>
  );
}

// ───────────── payroll runs ─────────────
function Runs({ onChange }) {
  const { P, canEdit } = usePay();
  const list = useApi(`${P}/runs`);
  const [open, setOpen] = useState(null); const [gen, setGen] = useState(false);
  if (open) return <RunDetail id={open} onBack={() => { setOpen(null); list.reload(); onChange?.(); }} />;
  return (
    <>
      <Card title="Payroll runs" action={canEdit ? <Button size="sm" onClick={() => setGen(true)}>+ Prepare a month</Button> : undefined} flush>
        <Async state={list}>{(rows) => (
          <DataTable rows={rows} empty={canEdit ? 'No payroll yet. It prepares itself on the payroll day, or prepare a month by hand.' : 'No payroll has been prepared yet.'} onRowClick={(r) => setOpen(r._id)} columns={[
            { label: 'Month', render: (r) => <b>{monthLabel(r.month)}</b> }, { label: 'Status', render: (r) => <Badge tone={tone(r.status)}>{label(r.status)}</Badge> }, { label: 'Payslips', render: (r) => r.totals?.count },
            { label: 'Gross', render: (r) => fmtMoney(r.totals?.gross) }, { label: 'Deductions', render: (r) => fmtMoney(r.totals?.deductions) }, { label: 'Net payable', render: (r) => <b>{fmtMoney(r.totals?.net)}</b> }, { label: 'Paid', render: (r) => fmtMoney(r.totals?.paid) },
            { label: '', render: (r) => <Button size="sm" onClick={() => setOpen(r._id)}>Open</Button> },
          ]} />
        )}</Async>
      </Card>
      {gen && <FormModal title="Prepare a month's payroll" submitLabel="Prepare" fields={[{ name: 'month', label: 'Month', type: 'month', required: true, default: todayStr().slice(0, 7), hint: 'Pay is calculated from each teacher\'s salary, school holidays and approved unpaid leave. You can review and adjust before approving.' }]}
        onClose={() => setGen(false)} onSubmit={async (v) => { const r = await post(`${P}/runs`, { month: v.month }); list.reload(); onChange?.(); setOpen(r._id); return true; }} />}
    </>
  );
}

function RunDetail({ id, onBack, embedded }) {
  const { P, canEdit, canApprove } = usePay();
  const [q, setQ] = useState(''); const [show, setShow] = useState('all'); const [who, setWho] = useState('all'); const [lvl, setLvl] = useState(''); const [bonus, setBonus] = useState(false);
  const [picked, setPicked] = useState({});
  const d = useApi(`${P}/runs/${id}`);
  const [run] = useAction();
  const [adj, setAdj] = useState(null); const [pay, setPay] = useState(null); const [part, setPart] = useState(null); const [report, setReport] = useState(null);
  const act = (fn, msg) => async () => { await run(fn, msg); d.reload(); };
  return (
    <Async state={d}>{({ run: r, payslips }) => {
      const pending = payslips.filter((p) => ['pending', 'partial'].includes(p.status));
      return (
        <div className="stack">
          <div className="row between wrap">
            <div className="row">{!embedded && <Button onClick={onBack}>← All runs</Button>}<h2 style={{ margin: 0 }}>{embedded ? `This month: ${monthLabel(r.month)}` : monthLabel(r.month)}</h2><Badge tone={tone(r.status)}>{label(r.status)}</Badge></div>
            <div className="row wrap">
              <Button onClick={() => run(() => download(`${P}/runs/${id}/export.csv`, `payroll-${r.month}.csv`))}>Export CSV</Button>
              <Button onClick={() => setReport('statutory')}>PF / ESI / PT</Button>{r.status !== 'draft' && <Button onClick={() => setReport('bank')}>Bank file</Button>}
              {r.status === 'draft' && <>
                {canEdit && <Button onClick={() => setBonus(true)}>Add a bonus…</Button>}
                {canEdit && <Button onClick={act(() => post(`${P}/runs/${id}/recalculate`), 'Recalculated')}>Recalculate</Button>}
                {canEdit && <ConfirmButton variant="danger" message="Delete this draft payroll?" onConfirm={async () => { await run(() => del(`${P}/runs/${id}`), 'Draft deleted'); onBack?.(); }}>Delete draft</ConfirmButton>}
                {canApprove && <ConfirmButton variant="primary" message={`Approve these amounts for ${monthLabel(r.month)}? They are saved in the payroll and locked, teachers can see their payslips, and you can then record the payments.`} onConfirm={act(() => post(`${P}/runs/${id}/approve`), 'Payroll approved')}>Approve amounts</ConfirmButton>}</>}
              {canEdit && r.status !== 'draft' && pending.length > 0 && <Button variant="primary" onClick={() => setPay({ ids: null })}>Mark all paid ({pending.length})</Button>}
            </div>
          </div>
          <div className="grid g4"><Stat value={r.totals.count} label="Payslips" sub={`${r.workingDays} working days`} /><Stat value={fmtMoney(r.totals.gross)} label="Gross" /><Stat value={fmtMoney(r.totals.deductions)} label="Deductions" tone="amber" /><Stat value={fmtMoney(r.totals.net)} label="Net payable" sub={`Paid ${fmtMoney(r.totals.paid)}`} tone="green" /></div>
          {r.status === 'draft' && <div className="alert info">{canApprove ? 'This month\'s payroll was prepared automatically. Check what each person will get, adjust any amount with Adjust or Add a bonus, then approve the amounts. Until then nothing is final.' : 'Finance is still checking this month\'s amounts.'}</div>}
          {canEdit && r.status !== 'draft' && pending.length > 0 && <div className="alert info">AtKaksha records payments but does not send money. Download the Bank file, pay from your bank, then mark the salaries as paid here. A payslip can be printed once its salary is paid.</div>}
          {r.skipped?.length > 0 && <div className="alert">Not included: {r.skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}. {r.status === 'draft' && 'Set their salary, then Recalculate.'}</div>}
          <ListCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div><h2 className="text-base font-semibold tracking-tight">What each person gets</h2><p className="text-[13px] text-muted-foreground">{r.status === 'draft' ? 'Check each amount. Adjust one person, or add a bonus for a group.' : canEdit ? 'Tick people to pay them together, or pay one at a time.' : 'What each person is paid this month.'}</p></div>
            </div>
            <FilterBar search={q} onSearch={setQ} searchLabel="Search people" placeholder="Search name or id…">
              <Select aria-label="Who" value={who} onChange={(e) => setWho(e.target.value)} options={[{ value: 'all', label: 'Everyone' }, { value: 'teacher', label: 'Teachers' }, { value: 'staff', label: 'Non-teaching and transport staff' }]} />
              <Select aria-label="Level" value={lvl} onChange={(e) => setLvl(e.target.value)} placeholder="All levels" options={[...new Set(payslips.map((p) => p.levelName).filter(Boolean))].sort().map((n) => ({ value: n, label: n }))} />
              <Select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)} options={[{ value: 'all', label: 'Everyone' }, { value: 'topay', label: 'Still to pay' }, { value: 'paid', label: 'Paid' }]} />
            </FilterBar>
            {(() => {
              const rows = payslips.filter((p) => (!q || `${p.personName} ${p.employeeId}`.toLowerCase().includes(q.toLowerCase())) && (who === 'all' || p.personType === who) && (!lvl || p.levelName === lvl) && (show === 'all' || (show === 'paid' ? p.status === 'paid' : p.status !== 'paid')));
              const payable = canEdit && r.status !== 'draft';
              const ticked = rows.filter((p) => picked[p._id]);
              const tickedToPay = ticked.filter((p) => ['pending', 'partial'].includes(p.status));
              const allTicked = rows.length > 0 && ticked.length === rows.length;
              const sum = (k) => rows.reduce((n, p) => n + (k(p) || 0), 0);
              const left = sum((p) => (['pending', 'partial'].includes(p.status) ? p.net - (p.paidAmount || 0) : 0));
              return (<>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border/70 px-4 py-2.5 text-[13.5px] text-muted-foreground">
                  <span><b className="tabular-nums text-foreground">{rows.length}</b> {rows.length === 1 ? 'person' : 'people'}{rows.length !== payslips.length ? ` of ${payslips.length}` : ''}</span>
                  <span>Net pay <b className="tabular-nums text-foreground">{fmtMoney(sum((p) => p.net))}</b></span>
                  {r.status !== 'draft' && <span>Still to pay <b className="tabular-nums text-foreground">{fmtMoney(left)}</b></span>}
                  {(q || who !== 'all' || lvl || show !== 'all') && <button type="button" className="ml-auto rounded-md font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setQ(''); setWho('all'); setLvl(''); setShow('all'); }}>Clear filters</button>}
                </div>
                {payable && ticked.length > 0 && (
                  <div className="stu-bulk" role="status"><b>{ticked.length} selected</b>
                    <Button size="sm" variant="primary" disabled={!tickedToPay.length} onClick={() => setPay({ ids: tickedToPay.map((p) => p._id), count: tickedToPay.length, net: tickedToPay.reduce((n, p) => n + p.net - (p.paidAmount || 0), 0), name: tickedToPay[0].personName })}>Mark selected paid ({tickedToPay.length})</Button>
                    <Button size="sm" onClick={() => setPicked({})} style={{ marginLeft: 'auto' }}>Clear</Button></div>
                )}
                <DataTable rows={rows} pageSize={25} empty="Nobody matches" columns={[
                  ...(payable ? [{ label: <input type="checkbox" className="chk" aria-label={`Select all ${rows.length} people shown`} checked={allTicked} ref={(el) => { if (el) el.indeterminate = ticked.length > 0 && !allTicked; }} onChange={() => setPicked(allTicked ? {} : Object.fromEntries(rows.map((p) => [p._id, true])))} />,
                    render: (p) => <input type="checkbox" className="chk" aria-label={`Select ${p.personName}`} checked={!!picked[p._id]} onChange={(e) => setPicked((x) => ({ ...x, [p._id]: e.target.checked }))} /> }] : []),
                  { label: 'Name', sort: (p) => p.personName, render: (p) => <div className="flex items-center gap-3"><Chip name={p.personName} /><div><b className="whitespace-nowrap">{p.personName}</b>{p.personType === 'staff' && <> <Badge>staff</Badge></>}<div className="small muted whitespace-nowrap">{p.employeeId}{p.levelName ? ` · ${p.levelName}` : ''}</div></div></div> },
                  { label: 'Days', render: (p) => `${p.paidDays} / ${p.workingDays}${p.unpaidDays ? ` (${p.unpaidDays} unpaid)` : ''}` }, { label: 'Gross', right: true, sort: (p) => p.gross, render: (p) => fmtMoney(p.gross) },
                  { label: 'Loss of pay', right: true, render: (p) => (p.lossOfPay ? fmtMoney(p.lossOfPay) : '—') }, { label: 'Deductions', right: true, render: (p) => fmtMoney(p.totalDeductions) }, { label: 'Net pay', right: true, sort: (p) => p.net, render: (p) => <b>{fmtMoney(p.net)}</b> },
                  { label: 'Status', render: (p) => <><Badge tone={tone(p.status)}>{label(p.status)}</Badge>{p.paidOn && p.status === 'paid' && <div className="muted">{fmtDate(p.paidOn, true)} · {label(p.mode)}</div>}{p.status === 'partial' && <div className="muted">{fmtMoney(p.paidAmount)} paid · {fmtMoney(p.net - p.paidAmount)} left</div>}</> },
                  { label: '', render: (p) => <div className="row">
                    {canEdit && r.status === 'draft' && <Button size="sm" onClick={() => setAdj(p)}>Adjust{p.adjustments?.length ? ` (${p.adjustments.length})` : ''}</Button>}
                    {canEdit && r.status !== 'draft' && ['pending', 'partial'].includes(p.status) && <><Button size="sm" variant="primary" onClick={() => setPay({ ids: [p._id], count: 1, name: p.personName, net: p.net - (p.paidAmount || 0) })}>{p.status === 'partial' ? 'Pay the rest' : 'Pay'}</Button><Button size="sm" onClick={() => setPart({ slip: p })}>Pay part</Button></>}
                    {['paid', 'partial'].includes(p.status) && <Button size="sm" onClick={() => run(() => download(`${P}/payslips/${p._id}/pdf`, `payslip-${p.payslipNo}.pdf`))}>PDF</Button>}</div> },
                ]} />
              </>);
            })()}
          </ListCard>
          {part && <FormModal title={`Pay part of ${part.slip.personName}'s salary`} submitLabel="Record part payment"
            fields={[{ name: 'amount', label: `Amount (₹, up to ${fmtMoney(part.slip.net - (part.slip.paidAmount || 0))})`, type: 'number', min: 1, step: 'any', required: true, default: Math.round(((part.slip.net - (part.slip.paidAmount || 0)) / 2) * 100) / 100 }, { name: 'mode', label: 'Payment mode', type: 'select', required: true, default: 'bank_transfer', options: ['bank_transfer', 'cash', 'cheque', 'upi', 'other'] }, { name: 'paidOn', label: 'Paid on', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) }, { name: 'reference', label: 'Reference' }, { name: 'note', label: 'Note', placeholder: 'e.g. First half of the month' }]}
            onClose={() => setPart(null)} onSubmit={async (v) => { await post(`${P}/payslips/${part.slip._id}/pay`, v); d.reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Pay half a month now and the rest later. The payslip shows each part, and the bank file asks only for what is left.</p></FormModal>}
          {adj && <AdjustModal slip={adj} onClose={() => setAdj(null)} onSaved={d.reload} />}
          {bonus && <BonusModal id={id} onClose={() => setBonus(false)} onSaved={d.reload} />}
          {report === 'bank' && <BankFileModal id={id} month={r.month} onClose={() => setReport(null)} />}
          {report === 'statutory' && <StatutoryModal id={id} month={r.month} onClose={() => setReport(null)} />}
          {pay && <FormModal title={pay.ids ? (pay.count > 1 ? `Mark ${pay.count} selected salaries as paid — ${fmtMoney(pay.net)}` : `Pay ${pay.name} — ${fmtMoney(pay.net)}`) : `Mark ${pending.length} salaries as paid`} submitLabel="Record payment"
            fields={[{ name: 'mode', label: 'Payment mode', type: 'select', required: true, default: 'bank_transfer', options: ['bank_transfer', 'cash', 'cheque', 'upi', 'other'] }, { name: 'paidOn', label: 'Paid on', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) }, { name: 'reference', label: 'Reference / batch no.', placeholder: 'NEFT or cheque number' }]}
            onClose={() => setPay(null)} onSubmit={async (v) => { await post(`${P}/runs/${id}/pay`, { ...v, payslipIds: pay.ids || undefined }); setPicked({}); d.reload(); return true; }} />}
        </div>
      );
    }}</Async>
  );
}

/** What would happen, before it is saved: every affected person (the list scrolls) and the total. */
function PreviewBox({ rows, head, line, total, skipped }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}><DataTable rows={rows} rowKey="key" empty="Nobody would be affected" columns={head} /></div>
      <p style={{ margin: 0 }}><b>{total}</b></p>
      {skipped?.length > 0 && <p className="muted small" style={{ margin: 0 }}>Left out: {skipped.slice(0, 4).map((x) => `${x.name} (${x.reason})`).join(', ')}{skipped.length > 4 ? ` and ${skipped.length - 4} more` : ''}.</p>}
      {line}
    </div>
  );
}

/** A one-time bonus on this month's payroll for a whole group, by amount or as a percentage of basic. It can still be changed per person. */
function BonusModal({ id, onClose, onSaved }) {
  const { P } = usePay();
  const [f, setF] = useState({ label: '', mode: 'fixed', value: '', scope: 'all', reason: '' });
  const [pre, setPre] = useState(null);
  const [run, busy] = useAction();
  const set = (patch) => { setF({ ...f, ...patch }); setPre(null); };
  const body = (preview) => ({ label: f.label.trim(), mode: f.mode, value: Number(f.value), scope: f.scope, reason: f.reason.trim() || undefined, preview });
  const valid = f.label.trim().length >= 2 && Number(f.value) > 0;
  return (
    <Modal wide title="Add a bonus to this month" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button>
      {!pre ? <Button variant="primary" loading={busy} disabled={!valid} onClick={async () => { const r = await run(() => post(`${P}/runs/${id}/bonus`, body(true))); if (r) setPre(r); }}>Preview</Button>
        : <Button variant="primary" loading={busy} disabled={!pre.rows.length} onClick={async () => { const r = await run(() => post(`${P}/runs/${id}/bonus`, body(false)), (x) => `Bonus added to ${x.applied} payslip(s)`); if (r) { onSaved(); onClose(); } }}>Add the bonus</Button>}</>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Bonus name"><Input value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="Diwali bonus, Exam duty…" /></Field>
          <Field label="Who gets it"><Select aria-label="Who gets it" value={f.scope} onChange={(e) => set({ scope: e.target.value })} options={[{ value: 'all', label: 'Everyone on this payroll' }, { value: 'teachers', label: 'Teachers' }, { value: 'staff', label: 'Non-teaching and transport staff' }]} /></Field>
          <Field label="How much"><Select aria-label="How much" value={f.mode} onChange={(e) => set({ mode: e.target.value })} options={[{ value: 'fixed', label: 'A fixed amount (₹) each' }, { value: 'percent_basic', label: 'A percentage of each person\'s basic' }]} /></Field>
          <Field label={f.mode === 'fixed' ? 'Amount (₹)' : 'Percentage of basic (100 = one month\'s basic)'}><Input type="number" min="0" step="any" value={f.value} onChange={(e) => set({ value: e.target.value })} /></Field>
          <Field label="Reason" full><Input value={f.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Optional, shown on the payslip" /></Field>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Adding a bonus with the same name again replaces it, so it is never paid twice. For one person only, use Adjust on their row.</p>
        {pre && <PreviewBox rows={pre.rows.map((r) => ({ ...r, key: r.payslipId }))} skipped={pre.skipped} total={`${pre.rows.length} people, ${fmtMoney(pre.total)} in all`}
          head={[{ label: 'Name', render: (r) => <><b>{r.name}</b><div className="muted">{r.code}</div></> }, { label: 'Bonus', render: (r) => fmtMoney(r.amount) }, { label: 'New net pay', render: (r) => <b>{fmtMoney(r.newNet)}</b> }]} />}
      </div>
    </Modal>
  );
}

function AdjustModal({ slip, onClose, onSaved }) {
  const { P } = usePay();
  const [rows, setRows] = useState((slip.adjustments || []).map((a) => ({ ...a, reason: a.reason || '' })));
  const [run, busy] = useAction();
  const set = (i, p) => setRows(rows.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const save = async () => {
    const adjustments = rows.filter((r) => r.label.trim() && Number(r.amount) > 0).map((r) => ({ label: r.label.trim(), type: r.type, amount: Number(r.amount), reason: r.reason || undefined }));
    const ok = await run(() => patch(`${P}/payslips/${slip._id}/adjustments`, { adjustments }), 'Payslip updated');
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal wide title={`Adjust payslip — ${slip.personName}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save adjustments</Button></>}>
      <div className="stack">
        <p className="muted">One-off changes for this month only: a bonus, exam duty pay, advance recovery… Salary figures are not changed.</p>
        {rows.map((r, i) => (
          <div className="row" key={i} style={{ gap: 6 }}>
            <Select aria-label={`Type ${i + 1}`} value={r.type} onChange={(e) => set(i, { type: e.target.value })} options={[{ value: 'earning', label: 'Add (bonus)' }, { value: 'deduction', label: 'Deduct' }]} />
            <Input aria-label={`Name ${i + 1}`} placeholder="Name" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
            <Input aria-label={`Amount ${i + 1}`} type="number" min="0" placeholder="₹" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} style={{ maxWidth: 110 }} />
            <Input aria-label={`Reason ${i + 1}`} placeholder="Reason" value={r.reason} onChange={(e) => set(i, { reason: e.target.value })} />
            <Button size="sm" variant="danger" aria-label={`Remove adjustment ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        <div><Button size="sm" onClick={() => setRows([...rows, { label: '', type: 'earning', amount: '', reason: '' }])}>+ Add adjustment</Button></div>
      </div>
    </Modal>
  );
}

// ───────────── bank transfer file ─────────────
function BankFileModal({ id, month, onClose }) {
  const { P } = usePay();
  const f = useApi(`${P}/runs/${id}/bank-file`);
  const [run] = useAction();
  return (
    <Modal wide title={`Bank transfer file — ${monthLabel(month)}`} onClose={onClose} footer={<><Button onClick={onClose}>Close</Button>{f.data && f.data.count > 0 && <Button variant="primary" onClick={() => run(() => download(`${P}/runs/${id}/bank-file.csv`, `salary-bank-file-${month}.csv`))}>Download file ({f.data.count})</Button>}</>}>
      <Async state={f}>{(d) => (
        <div className="stack">
          <div className="grid g4"><Stat value={d.count} label="Ready to pay" tone="green" /><Stat value={fmtMoney(d.total)} label="Total to transfer" /><Stat value={d.missing.length} label="Missing bank details" tone={d.missing.length ? 'amber' : 'green'} /></div>
          <p className="muted small" style={{ margin: 0 }}>Upload this file to your bank's bulk-payment (NEFT) portal. The bank makes the payments — then use <b>Mark all paid</b> here to record it. People already paid are not in the file.</p>
          {d.missing.length > 0 && <Card title="Cannot be paid yet — add their bank details" flush><DataTable rows={d.missing} rowKey="payslipId" columns={[{ label: 'Name', render: (m) => <b>{m.name}</b> }, { label: 'Id', key: 'employeeId' }, { label: 'Net pay', render: (m) => fmtMoney(m.net) }, { label: 'Problem', key: 'reason' }]} /></Card>}
          {d.count > 0 && <Card title="In the file" flush><DataTable rows={d.ready} rowKey="payslipId" columns={[{ label: 'Beneficiary', render: (r) => <b>{r.name}</b> }, { label: 'Account', key: 'accountNo' }, { label: 'IFSC', key: 'ifsc' }, { label: 'Bank', key: 'bankName' }, { label: 'Amount', render: (r) => fmtMoney(r.amount) }]} /></Card>}
        </div>
      )}</Async>
    </Modal>
  );
}

// ───────────── PF / ESI / Professional Tax ─────────────
function StatutoryModal({ id, month, onClose }) {
  const { P } = usePay();
  const q = useApi(`${P}/runs/${id}/statutory`);
  const [run] = useAction();
  return (
    <Modal wide title={`PF, ESI and Professional Tax — ${monthLabel(month)}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Async state={q}>{(d) => {
        const on = d.policy.pf.enabled || d.policy.esi.enabled || d.policy.pt.enabled;
        if (!on) return <div className="alert info">No statutory deductions are switched on for this school. Turn on PF, ESI or Professional Tax in School settings, then recalculate a draft payroll.</div>;
        return (
          <div className="stack">
            <div className="grid g4"><Stat value={fmtMoney(d.totals.pfEmployee)} label="PF — employee" sub={`employer ${fmtMoney(d.totals.pfEmployer)}`} /><Stat value={fmtMoney(d.totals.esiEmployee)} label="ESI — employee" sub={`employer ${fmtMoney(d.totals.esiEmployer)}`} /><Stat value={fmtMoney(d.totals.pt)} label="Professional Tax" /><Stat value={d.missingIds.length} label="Ids missing" tone={d.missingIds.length ? 'amber' : 'green'} sub="UAN / ESI number" /></div>
            {d.missingIds.length > 0 && <div className="alert">Add these on the person's record so they can be included in the filing files: {[...new Set(d.missingIds.map((m) => `${m.name} (${m.what})`))].slice(0, 12).join(', ')}.</div>}
            <div className="row wrap">
              <Button size="sm" disabled={!d.pf.length} onClick={() => run(() => download(`${P}/runs/${id}/statutory/pf-ecr.txt`, `pf-ecr-${month}.txt`))}>PF file (ECR text)</Button>
              <Button size="sm" disabled={!d.esi.length} onClick={() => run(() => download(`${P}/runs/${id}/statutory/esi.csv`, `esi-${month}.csv`))}>ESI file (CSV)</Button>
              <Button size="sm" disabled={!d.pt.length} onClick={() => run(() => download(`${P}/runs/${id}/statutory/pt.csv`, `professional-tax-${month}.csv`))}>Professional Tax (CSV)</Button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>These files follow the standard layouts. Check them with the EPFO / ESIC portal's own validator before filing — this system does not file on your behalf. Income tax (TDS) is not calculated here.</p>
            {d.policy.pf.enabled && <Card title="Provident Fund" flush><DataTable rows={d.pf} rowKey="payslipNo" empty="Nobody has PF this month" columns={[{ label: 'Name', render: (r) => <b>{r.name}</b> }, { label: 'UAN', render: (r) => r.uan || <Badge tone="amber">missing</Badge> }, { label: 'PF wages', render: (r) => fmtMoney(r.wages) }, { label: 'Employee', render: (r) => fmtMoney(r.employee) }, { label: 'Employer', render: (r) => fmtMoney(r.employer) }, { label: 'EPS / EPF', render: (r) => `${fmtMoney(r.eps)} / ${fmtMoney(r.epf)}` }]} /></Card>}
            {d.policy.esi.enabled && <Card title="ESI" flush><DataTable rows={d.esi} rowKey="payslipNo" empty="Nobody is covered by ESI this month" columns={[{ label: 'Name', render: (r) => <b>{r.name}</b> }, { label: 'ESI no.', render: (r) => r.esiNo || <Badge tone="amber">missing</Badge> }, { label: 'Wages', render: (r) => fmtMoney(r.gross) }, { label: 'Employee', render: (r) => fmtMoney(r.employee) }, { label: 'Employer', render: (r) => fmtMoney(r.employer) }]} /></Card>}
            {d.policy.pt.enabled && <Card title="Professional Tax" flush><DataTable rows={d.pt} rowKey="payslipNo" empty="No Professional Tax this month" columns={[{ label: 'Name', render: (r) => <b>{r.name}</b> }, { label: 'Gross', render: (r) => fmtMoney(r.gross) }, { label: 'Tax', render: (r) => fmtMoney(r.amount) }]} /></Card>}
          </div>
        );
      }}</Async>
    </Modal>
  );
}
