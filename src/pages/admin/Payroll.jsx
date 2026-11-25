import { createContext, useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { get, post, patch, del, download } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import FilterMenu from '../../components/FilterMenu.jsx';
import FormModal from '../../components/FormModal.jsx';
import PayItems, { cleanItems } from '../../components/PayItems.jsx';

/**
 * Payroll is run by the Finance department (it prepares the month, changes salaries, adds bonuses and deductions, records what is paid).
 * The School Admin sees the same pages without the buttons that change things, and approves each month. The server enforces the same rule.
 */
const PayCtx = createContext({ P: '/api/school/payroll', canEdit: false, canApprove: true });
const usePay = () => useContext(PayCtx);
const tone = (s) => ({ draft: 'amber', approved: 'blue', paid: 'green', pending: 'amber', partial: 'amber' }[s] || '');
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const itemsOf = (l) => (l || []).map((i) => ({ label: i.label, kind: i.kind, value: i.value }));
const summaryText = (l) => (l?.length ? l.map((i) => `${i.label} ${i.kind === 'percent' ? `${i.value}%` : fmtMoney(i.value)}`).join(', ') : '—');

/** School Admin: pay levels, everyone's salary (teachers, non-teaching and transport staff), and the monthly payroll with payslips. Teachers see only their own. */
export default function Payroll({ base = '/api/school/payroll', role = 'admin' }) {
  const ctx = useMemo(() => ({ P: base, canEdit: role === 'finance', canApprove: role !== 'finance' }), [base, role]);
  return <PayCtx.Provider value={ctx}><PayrollPage /></PayCtx.Provider>;
}

function PayrollPage() {
  const { P, canEdit } = usePay();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'runs';
  const sum = useApi(`${P}/summary`);
  return (
    <div className="stack">
      <PageHeader title="Payroll & salaries" subtitle={canEdit ? "Set everyone's pay level and salary, run the month's payroll, add bonuses and deductions, and record the payment. The School Admin approves each month before it is paid. Unpaid leave and days marked absent in the staff attendance registers are deducted automatically." : "Run by the Finance department. You can see every salary, payroll and payslip here, and approve each month's payroll before Finance pays it."} />
      <Async state={sum}>{(s) => (
        <div className="grid g4">
          <Stat value={fmtMoney(s.monthlyNet)} label="Monthly salary bill (net)" sub={`Gross ${fmtMoney(s.monthlyGross)}`} tone="blue" />
          <Stat value={`${s.withSalary} / ${s.people}`} label="People with a salary" sub={`${s.teachers} teachers · ${s.staff} staff${s.withoutSalary ? ` · ${s.withoutSalary} still need one` : ''}`} tone={s.withoutSalary ? 'amber' : 'green'} />
          <Stat value={s.thisMonth ? label(s.thisMonth.status) : 'Not run'} label={`${monthLabel(s.month)} payroll`} sub={s.thisMonth ? `Net ${fmtMoney(s.thisMonth.totals?.net)}` : 'Generate it in Payroll runs'} tone={s.thisMonth?.status === 'paid' ? 'green' : 'amber'} />
          <Stat value={fmtMoney(s.paidThisYear)} label="Salaries paid this academic year" tone="green" />
        </div>
      )}</Async>
      <Tabs tabs={[['runs', 'Payroll runs'], ['salaries', 'Salaries'], ['levels', 'Pay levels']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'runs' && <Runs onChange={sum.reload} />}{tab === 'salaries' && <Salaries onChange={sum.reload} />}{tab === 'levels' && <Levels />}
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
      <Card title="Pay levels" action={canEdit ? <Button variant="primary" size="sm" onClick={() => setEdit({})}>+ New level</Button> : undefined} flush>
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
          <Field label="This level is for" hint={level ? 'A level keeps the group it was created for' : undefined}><Select disabled={!!level} value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value })} options={[{ value: 'teaching', label: 'Teachers' }, { value: 'non_teaching', label: 'Non-teaching & transport staff' }]} /></Field>
          <Field label="Description" full><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Primary Teacher, classes 1-5" /></Field>
        </div>
        <PayItems title="Allowances" basic={f.basic} items={f.allowances} onChange={(allowances) => setF({ ...f, allowances })} />
        <PayItems title="Deductions" basic={f.basic} items={f.deductions} onChange={(deductions) => setF({ ...f, deductions })} />
      </div>
    </Modal>
  );
}

// ───────────── salaries (teachers and staff) ─────────────
function Salaries({ onChange }) {
  const { P, canEdit } = usePay();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [type, setType] = useState('all');
  const list = useApi(`${P}/salaries`, { q: q || undefined, status, type });
  const levels = useApi(`${P}/levels`);
  const [edit, setEdit] = useState(null); const [hist, setHist] = useState(null); const [bulk, setBulk] = useState(null);
  const reload = () => { list.reload(); onChange?.(); };
  const forGroup = (group) => (levels.data || []).filter((l) => l.status === 'active' && (l.appliesTo === 'non_teaching') === (group === 'staff'));
  return (
    <>
      <Card title="Salaries" action={<div className="row wrap"><Input aria-label="Search people" placeholder="Search name or id…" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterMenu count={(type !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0)} onClear={() => { setType('all'); setStatus('all'); }}>
          <Field label="Who"><Select aria-label="Who" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'all', label: 'Everyone' }, { value: 'teachers', label: 'Teachers' }, { value: 'staff', label: 'Non-teaching & transport staff' }]} /></Field>
          <Field label="Salary"><Select aria-label="Filter" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'with', label: 'Salary set' }, { value: 'without', label: 'No salary yet' }]} /></Field>
        </FilterMenu>
        {canEdit && <><Button size="sm" onClick={() => setBulk('teachers')} disabled={!forGroup('teachers').length}>Apply level to teachers…</Button>
        <Button size="sm" onClick={() => setBulk('staff')} disabled={!forGroup('staff').length}>Apply level to staff…</Button></>}</div>} flush>
        <Async state={list}>{(d) => (
          <DataTable rows={d.items} rowKey="personId" empty="Nobody found" columns={[
            { label: 'Name', render: (t) => <><b>{t.name}</b><div className="muted">{t.code}{t.designation ? ` · ${t.designation}` : ''}</div></> },
            { label: 'Group', render: (t) => <Badge tone={t.personType === 'staff' ? 'amber' : 'blue'}>{t.personType === 'staff' ? (t.group === 'transport' ? 'Transport staff' : 'Non-teaching') : 'Teacher'}</Badge> },
            { label: 'Level', render: (t) => (t.revision ? (t.revision.levelName || 'Custom') : <Badge tone="amber">No salary</Badge>) },
            { label: 'Basic', render: (t) => (t.revision ? fmtMoney(t.revision.basic) : '—') }, { label: 'Gross', render: (t) => (t.revision ? fmtMoney(t.revision.gross) : '—') },
            { label: 'Net / month', render: (t) => (t.revision ? <b>{fmtMoney(t.revision.net)}</b> : '—') }, { label: 'Since', render: (t) => (t.revision ? fmtDate(t.revision.effectiveFrom, true) : '—') },
            { label: '', render: (t) => <div className="row">{canEdit && <Button size="sm" onClick={() => setEdit(t)}>{t.revision ? 'Revise' : 'Set salary'}</Button>}{t.revision && <Button size="sm" onClick={() => setHist(t)}>History</Button>}</div> },
          ]} />
        )}</Async>
      </Card>
      {edit && <SalaryModal teacher={edit} levels={forGroup(edit.personType === 'staff' ? 'staff' : 'teachers')} onClose={() => setEdit(null)} onSaved={reload} />}
      {hist && <HistoryModal teacher={hist} onClose={() => setHist(null)} />}
      {bulk && <FormModal title={`Apply a pay level to ${bulk === 'staff' ? 'non-teaching & transport staff' : 'teachers'}`} submitLabel="Apply"
        fields={[{ name: 'levelId', label: 'Pay level', type: 'select', required: true, options: forGroup(bulk).map((l) => ({ value: l._id, label: `${l.name} — net ${fmtMoney(l.net)}` })) },
          { name: 'which', label: 'Who', type: 'select', required: true, default: 'without', options: [{ value: 'without', label: 'Only those without a salary' }, { value: 'all', label: 'Everyone in this group (replaces their current pay)' }] },
          { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true, default: todayStr() }]}
        onClose={() => setBulk(null)} onSubmit={async (v) => {
          const all = await get(`${P}/salaries`, { status: v.which === 'all' ? 'all' : 'without', type: bulk });
          if (!all.items.length) throw new Error('Nobody matches');
          const out = await post(`${P}/salaries/bulk`, { levelId: v.levelId, personIds: all.items.map((t) => t.personId), effectiveFrom: v.effectiveFrom, reason: 'Bulk level assignment' });
          reload();
          if (out.failed.length) throw new Error(`${out.updated} updated, ${out.failed.length} failed: ${out.failed[0].error}`);
          return true;
        }} />}
    </>
  );
}

function SalaryModal({ teacher, levels, onClose, onSaved }) {
  const { P } = usePay();
  const cur = teacher.revision;
  const [f, setF] = useState({ levelId: cur?.levelId || '', basic: cur?.basic ?? '', allowances: itemsOf(cur?.allowances), deductions: itemsOf(cur?.deductions), effectiveFrom: todayStr(), reason: '' });
  const [run, busy] = useAction();
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
      <Card title="Payroll runs" action={canEdit ? <Button variant="primary" size="sm" onClick={() => setGen(true)}>+ Generate payroll</Button> : undefined} flush>
        <Async state={list}>{(rows) => (
          <DataTable rows={rows} empty={canEdit ? 'No payroll yet. Generate the first month.' : 'Finance has not prepared any payroll yet.'} onRowClick={(r) => setOpen(r._id)} columns={[
            { label: 'Month', render: (r) => <b>{monthLabel(r.month)}</b> }, { label: 'Status', render: (r) => <Badge tone={tone(r.status)}>{label(r.status)}</Badge> }, { label: 'Payslips', render: (r) => r.totals?.count },
            { label: 'Gross', render: (r) => fmtMoney(r.totals?.gross) }, { label: 'Deductions', render: (r) => fmtMoney(r.totals?.deductions) }, { label: 'Net payable', render: (r) => <b>{fmtMoney(r.totals?.net)}</b> }, { label: 'Paid', render: (r) => fmtMoney(r.totals?.paid) },
            { label: '', render: (r) => <Button size="sm" onClick={() => setOpen(r._id)}>Open</Button> },
          ]} />
        )}</Async>
      </Card>
      {gen && <FormModal title="Generate payroll" submitLabel="Generate" fields={[{ name: 'month', label: 'Month', type: 'month', required: true, default: todayStr().slice(0, 7), hint: 'Pay is calculated from each teacher\'s salary, school holidays and approved unpaid leave. You can review and adjust before approving.' }]}
        onClose={() => setGen(false)} onSubmit={async (v) => { const r = await post(`${P}/runs`, { month: v.month }); list.reload(); onChange?.(); setOpen(r._id); return true; }} />}
    </>
  );
}

function RunDetail({ id, onBack }) {
  const { P, canEdit, canApprove } = usePay();
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
            <div className="row"><Button onClick={onBack}>← All runs</Button><h2 style={{ margin: 0 }}>{monthLabel(r.month)}</h2><Badge tone={tone(r.status)}>{label(r.status)}</Badge></div>
            <div className="row wrap">
              <Button onClick={() => run(() => download(`${P}/runs/${id}/export.csv`, `payroll-${r.month}.csv`))}>Export CSV</Button>
              <Button onClick={() => setReport('statutory')}>PF / ESI / PT</Button>{r.status !== 'draft' && <Button onClick={() => setReport('bank')}>Bank file</Button>}
              {r.status === 'draft' && <>
                {canEdit && <Button onClick={act(() => post(`${P}/runs/${id}/recalculate`), 'Recalculated')}>Recalculate</Button>}
                {canEdit && <ConfirmButton variant="danger" message="Delete this draft payroll?" onConfirm={async () => { await run(() => del(`${P}/runs/${id}`), 'Draft deleted'); onBack(); }}>Delete draft</ConfirmButton>}
                {canApprove && <ConfirmButton variant="primary" message={`Approve payroll for ${monthLabel(r.month)}? Teachers can then see their payslips, and the figures will be locked.`} onConfirm={act(() => post(`${P}/runs/${id}/approve`), 'Payroll approved')}>Approve</ConfirmButton>}</>}
              {canEdit && r.status !== 'draft' && pending.length > 0 && <Button variant="primary" onClick={() => setPay({ ids: null })}>Mark all paid ({pending.length})</Button>}
            </div>
          </div>
          <div className="grid g4"><Stat value={r.totals.count} label="Payslips" sub={`${r.workingDays} working days`} /><Stat value={fmtMoney(r.totals.gross)} label="Gross" /><Stat value={fmtMoney(r.totals.deductions)} label="Deductions" tone="amber" /><Stat value={fmtMoney(r.totals.net)} label="Net payable" sub={`Paid ${fmtMoney(r.totals.paid)}`} tone="green" /></div>
          {r.status === 'draft' && <div className="alert info">{canApprove ? 'Prepared by Finance. Review it, then approve: the figures are locked and Finance can record the payments.' : 'Waiting for the School Admin to approve this month. Until then you can still adjust payslips and recalculate.'}</div>}
          {r.skipped?.length > 0 && <div className="alert">Not included: {r.skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}. {r.status === 'draft' && 'Set their salary, then Recalculate.'}</div>}
          <Card flush>
            <DataTable rows={payslips} empty="No payslips" columns={[
              { label: 'Name', render: (p) => <><b>{p.personName}</b>{p.personType === 'staff' && <> <Badge>staff</Badge></>}<div className="muted">{p.employeeId}{p.levelName ? ` · ${p.levelName}` : ''}</div></> },
              { label: 'Days', render: (p) => `${p.paidDays} / ${p.workingDays}${p.unpaidDays ? ` (${p.unpaidDays} unpaid)` : ''}` }, { label: 'Gross', render: (p) => fmtMoney(p.gross) },
              { label: 'Loss of pay', render: (p) => (p.lossOfPay ? fmtMoney(p.lossOfPay) : '—') }, { label: 'Deductions', render: (p) => fmtMoney(p.totalDeductions) }, { label: 'Net pay', render: (p) => <b>{fmtMoney(p.net)}</b> },
              { label: 'Status', render: (p) => <><Badge tone={tone(p.status)}>{label(p.status)}</Badge>{p.paidOn && p.status === 'paid' && <div className="muted">{fmtDate(p.paidOn, true)} · {label(p.mode)}</div>}{p.status === 'partial' && <div className="muted">{fmtMoney(p.paidAmount)} paid · {fmtMoney(p.net - p.paidAmount)} left</div>}</> },
              { label: '', render: (p) => <div className="row">
                {canEdit && r.status === 'draft' && <Button size="sm" onClick={() => setAdj(p)}>Adjust{p.adjustments?.length ? ` (${p.adjustments.length})` : ''}</Button>}
                {canEdit && r.status !== 'draft' && ['pending', 'partial'].includes(p.status) && <><Button size="sm" variant="primary" onClick={() => setPay({ ids: [p._id], name: p.personName, net: p.net - (p.paidAmount || 0) })}>{p.status === 'partial' ? 'Pay the rest' : 'Pay'}</Button><Button size="sm" onClick={() => setPart({ slip: p })}>Pay part</Button></>}
                <Button size="sm" onClick={() => run(() => download(`${P}/payslips/${p._id}/pdf`, `payslip-${p.payslipNo}.pdf`))}>PDF</Button></div> },
            ]} />
          </Card>
          {part && <FormModal title={`Pay part of ${part.slip.personName}'s salary`} submitLabel="Record part payment"
            fields={[{ name: 'amount', label: `Amount (₹, up to ${fmtMoney(part.slip.net - (part.slip.paidAmount || 0))})`, type: 'number', min: 1, step: 'any', required: true, default: Math.round(((part.slip.net - (part.slip.paidAmount || 0)) / 2) * 100) / 100 }, { name: 'mode', label: 'Payment mode', type: 'select', required: true, default: 'bank_transfer', options: ['bank_transfer', 'cash', 'cheque', 'upi', 'other'] }, { name: 'paidOn', label: 'Paid on', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) }, { name: 'reference', label: 'Reference' }, { name: 'note', label: 'Note', placeholder: 'e.g. First half of the month' }]}
            onClose={() => setPart(null)} onSubmit={async (v) => { await post(`${P}/payslips/${part.slip._id}/pay`, v); d.reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Pay half a month now and the rest later. The payslip shows each part, and the bank file asks only for what is left.</p></FormModal>}
          {adj && <AdjustModal slip={adj} onClose={() => setAdj(null)} onSaved={d.reload} />}
          {report === 'bank' && <BankFileModal id={id} month={r.month} onClose={() => setReport(null)} />}
          {report === 'statutory' && <StatutoryModal id={id} month={r.month} onClose={() => setReport(null)} />}
          {pay && <FormModal title={pay.ids ? `Pay ${pay.name} — ${fmtMoney(pay.net)}` : `Mark ${pending.length} salaries as paid`} submitLabel="Record payment"
            fields={[{ name: 'mode', label: 'Payment mode', type: 'select', required: true, default: 'bank_transfer', options: ['bank_transfer', 'cash', 'cheque', 'upi', 'other'] }, { name: 'paidOn', label: 'Paid on', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) }, { name: 'reference', label: 'Reference / batch no.', placeholder: 'NEFT or cheque number' }]}
            onClose={() => setPay(null)} onSubmit={async (v) => { await post(`${P}/runs/${id}/pay`, { ...v, payslipIds: pay.ids || undefined }); d.reload(); return true; }} />}
        </div>
      );
    }}</Async>
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
