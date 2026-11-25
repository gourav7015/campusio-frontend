import FeeSchedule from '../../components/FeeSchedule.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { get, post, put, del, download } from '../../api/client.js';
import {
  Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, useDebounced, fmtDate, fmtMoney, label, } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { FilterBar, ListCard, ListFooter } from '../../design/ui';
import { BarsChart } from '../../components/Charts.jsx';

const MODES = [['cash', 'Cash'], ['upi', 'UPI'], ['cheque', 'Cheque'], ['bank_transfer', 'Bank transfer'], ['card', 'Card'], ['other', 'Other']].map(([value, l]) => ({ value, label: l }));
const today = () => new Date().toLocaleDateString('en-CA');
/** Finance screens are shared with the School Admin's view-only window (readOnly hides every action). */
const ctxOf = (readOnly) => ({ base: readOnly ? '/api/school/finance' : '/api/finance', path: readOnly ? '/admin/fees' : '/finance' });

export { default as FinanceDashboard } from './FinanceDashboard';

// ───────────── fee structures ─────────────
function StructureModal({ lookups, onClose, onDone, base }) {
  const policy = useApi(`${base}/policy`);
  const [f, setF] = useState({ name: '', classId: '', admissionFee: '', monthlyFee: '', dueDay: '', autoAssign: true });
  const [extras, setExtras] = useState([]);
  const [run, busy] = useAction();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setX = (i, k, v) => setExtras(extras.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const monthly = Number(f.monthlyFee) || 0; const admission = Number(f.admissionFee) || 0;
  const extrasYear = extras.reduce((n, e) => n + (Number(e.amount) || 0) * (e.frequency === 'monthly' ? 12 : 1), 0);
  const ok = f.name.trim().length >= 3 && monthly > 0 && extras.every((e) => e.head.trim().length >= 2 && Number(e.amount) > 0);
  const save = async () => {
    const body = { name: f.name.trim(), classId: f.classId || null, autoAssign: f.autoAssign, admissionFee: admission, monthlyFee: monthly, ...(f.dueDay ? { dueDay: Number(f.dueDay) } : {}), extras: extras.map((e) => ({ head: e.head.trim(), amount: Number(e.amount), frequency: e.frequency })) };
    const r = await run(() => post(`${base}/structures`, body), 'Fee structure created');
    if (r) onDone();
  };
  return (
    <Modal wide title="New fee structure" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!ok} onClick={save}>Create structure</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Class 8 Fee" /></Field>
          <Field label="Applies to"><Select value={f.classId} onChange={(e) => set('classId', e.target.value)} options={lookups.classes.map((c) => ({ value: c._id, label: c.name }))} placeholder="All classes" /></Field>
          <Field label="Admission fee (₹, once)" hint="Charged once, in the month the student joins. Leave 0 if there is none."><Input type="number" min="0" value={f.admissionFee} onChange={(e) => set('admissionFee', e.target.value)} /></Field>
          <Field label="Tuition fee per month (₹)" hint="Billed every month of the academic year"><Input type="number" min="1" value={f.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} /></Field>
          <Field label="Due on day of the month" hint={`Leave empty to use the school's policy (${policy.data?.dueDay ?? 10}th)`}><Input type="number" min="1" max="28" value={f.dueDay} onChange={(e) => set('dueDay', e.target.value)} /></Field>
        </div>
        <label className="row"><input type="checkbox" checked={f.autoAssign} onChange={(e) => set('autoAssign', e.target.checked)} /> Bill new admissions to this class automatically</label>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row between"><div className="bold">Other fees <span className="muted">(optional — e.g. exam fee, computer lab)</span></div><Button size="sm" type="button" onClick={() => setExtras([...extras, { head: '', amount: '', frequency: 'once' }])}>+ Add fee</Button></div>
          {extras.map((e, i) => (
            <div className="row" key={i} style={{ gap: 6 }}>
              <Input aria-label={`Fee name ${i + 1}`} placeholder="Name" value={e.head} onChange={(ev) => setX(i, 'head', ev.target.value)} />
              <Input aria-label={`Fee amount ${i + 1}`} type="number" min="1" placeholder="₹" value={e.amount} onChange={(ev) => setX(i, 'amount', ev.target.value)} style={{ maxWidth: 120 }} />
              <Select aria-label={`Fee frequency ${i + 1}`} value={e.frequency} onChange={(ev) => setX(i, 'frequency', ev.target.value)} options={[{ value: 'once', label: 'Once' }, { value: 'monthly', label: 'Every month' }, { value: 'yearly', label: 'Once a year' }]} />
              <Button size="sm" type="button" variant="danger" aria-label={`Remove fee ${i + 1}`} onClick={() => setExtras(extras.filter((_, j) => j !== i))}>Remove</Button>
            </div>))}
        </div>
        <div className="card-b row between"><span>Admission {fmtMoney(admission)} + tuition {fmtMoney(monthly)} × 12{extrasYear ? ` + other fees ${fmtMoney(extrasYear)}` : ''}</span><b>Per student, per year: {fmtMoney(admission + monthly * 12 + extrasYear)}</b></div>
        <p className="muted small" style={{ margin: 0 }}>Transport is billed separately, every month, to students who ride a school bus (the fare is set by the Transport officer).</p>
      </div>
    </Modal>
  );
}

export function FeeStructures({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const list = useApi(`${base}/structures`);
  const lookups = useApi(`${base}/lookups`);
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const L = lookups.data || { classes: [], sections: [] };
  return (
    <div className="stack">
      <PageHeader title="Fee structures" subtitle="An admission fee once, then tuition every month. Define what a class pays, then bill students — or let new admissions be billed automatically." actions={!readOnly && <Button variant="primary" onClick={() => setModal({ t: 'new' })}>+ New fee structure</Button>} />
      <Card flush><Async state={list} empty={<Empty title="No fee structures yet" />}>{(rows) => <DataTable rows={rows} columns={[
        { label: 'Structure', render: (s) => <><b>{s.name}</b><div className="small muted">{s.monthlyFee ? `${s.admissionFee ? `Admission ${fmtMoney(s.admissionFee)} · ` : ''}Tuition ${fmtMoney(s.monthlyFee)} / month${(s.extras || []).map((e) => ` · ${e.head} ${fmtMoney(e.amount)}${e.frequency === 'monthly' ? ' / month' : ''}`).join('')}` : (s.items || []).map((i) => `${i.head} ${fmtMoney(i.amount)}`).join(' · ')}</div></> },
        { label: 'Class', key: 'className' }, { label: 'Per student, per year', render: (s) => fmtMoney(s.total) }, { label: 'Due', render: (s) => (s.monthlyFee ? `${s.dueDay || 'policy'}${s.dueDay ? 'th' : ''} of each month` : (s.installments || []).map((i) => `${i.label} ${i.percent}%`).join(', ')) },
        { label: 'Billed', render: (s) => `${s.students} student(s) · ${fmtMoney(s.billed)}` }, { label: 'Collected', render: (s) => fmtMoney(s.collected) },
        { label: 'Auto', render: (s) => <Badge tone={s.autoAssign ? 'green' : ''}>{s.autoAssign ? 'On admission' : 'Manual'}</Badge> },
        ...(readOnly ? [] : [{ label: '', render: (s) => <div className="row"><Button size="sm" variant="primary" onClick={() => setModal({ t: 'assign', s })}>Bill students</Button>
          {s.students === 0 && <ConfirmButton size="sm" variant="danger" message="Delete this structure?" onConfirm={async () => { await run(() => del(`${base}/structures/${s._id}`), 'Deleted'); list.reload(); }}>Delete</ConfirmButton>}</div> }])]} />}</Async></Card>
      {modal?.t === 'new' && <StructureModal base={base} lookups={L} onClose={() => setModal(null)} onDone={() => { setModal(null); list.reload(); }} />}
      {modal?.t === 'assign' && <AssignModal base={base} s={modal.s} L={L} onClose={() => setModal(null)} onDone={() => { setModal(null); list.reload(); }} />}
    </div>
  );
}

function AssignModal({ base, s, L, onClose, onDone }) {
  const [sectionId, setSectionId] = useState(''); const [conc, setConc] = useState({ type: 'percent', value: '', reason: '' });
  const [run, busy] = useAction();
  const secs = L.sections.filter((x) => !s.classId || x.classId === s.classId);
  const label2 = (x) => `${L.classes.find((c) => c._id === x.classId)?.name || ''} ${x.name}`;
  return (
    <Modal title={`Bill students · ${s.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => {
      const body = { structureId: s._id, ...(sectionId ? { sectionId } : { all: true }), ...(conc.value ? { concession: { type: conc.type, value: Number(conc.value), reason: conc.reason } } : {}) };
      const r = await run(() => post(`${base}/assign`, body), (x) => `${x.assigned} student(s) billed${x.skipped ? `, ${x.skipped} already billed` : ''}`); if (r) onDone(); }} disabled={!!conc.value && conc.reason.length < 3}>Bill now</Button></>}>
      <div className="stack">
        <Field label="Bill"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Every enrolled student this structure applies to" options={secs.map((x) => ({ value: x._id, label: label2(x) }))} /></Field>
        <div className="small muted">Students already billed with this structure are skipped, so nobody is charged twice.</div>
        <div className="bold">Concession (optional, for everyone being billed)</div>
        <div className="row"><Select value={conc.type} onChange={(e) => setConc({ ...conc, type: e.target.value })} options={[{ value: 'percent', label: '%' }, { value: 'amount', label: '₹' }]} aria-label="Concession type" /><Input type="number" min="0" placeholder="Value" value={conc.value} onChange={(e) => setConc({ ...conc, value: e.target.value })} aria-label="Concession value" /></div>
        {conc.value && <Field label="Reason (required)"><Input value={conc.reason} onChange={(e) => setConc({ ...conc, reason: e.target.value })} placeholder="e.g. Scholarship" /></Field>}
      </div>
    </Modal>
  );
}

// ───────────── students & dues ─────────────
/** An extra charge (a special teacher, a trip, an activity) for every student of a section or a class. Previewed first; anyone who already has it is left out. */
function ExtraChargeModal({ base, L, section, onClose, onDone }) {
  const [f, setF] = useState({ target: 'section', sectionId: section || '', classId: '', label: '', amount: '', dueDate: '' });
  const [pre, setPre] = useState(null); const [done, setDone] = useState(null);
  const [run, busy] = useAction();
  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPre(null); };
  const secName = (x) => `${L.classes.find((c) => c._id === x.classId)?.name} ${x.name}`;
  const who = f.target === 'section' ? f.sectionId : f.classId;
  const valid = !!who && f.label.trim().length >= 3 && Number(f.amount) > 0;
  const body = (preview) => ({ [f.target === 'section' ? 'sectionId' : 'classId']: who, label: f.label.trim(), amount: Number(f.amount), ...(f.dueDate ? { dueDate: f.dueDate } : {}), preview });
  return (
    <Modal wide title="Add a charge for a section or class" onClose={onClose} footer={done ? <Button variant="primary" onClick={onClose}>Close</Button> : <><Button onClick={onClose}>Cancel</Button>
      {!pre ? <Button variant="primary" loading={busy} disabled={!valid} onClick={async () => { const r = await run(() => post(`${base}/charges/bulk`, body(true))); if (r) setPre(r); }}>Preview</Button>
        : <Button variant="primary" loading={busy} disabled={!pre.count} onClick={async () => { const r = await run(() => post(`${base}/charges/bulk`, body(false)), (x) => `Charge added for ${x.applied} students`); if (r) { setDone(r); onDone(); } }}>Add to {pre.count} {pre.count === 1 ? 'student' : 'students'}</Button>}</>}>
      <div className="stack">
        {done ? <div className="alert ok">“{done.label}” of {fmtMoney(done.amount)} was added for {done.applied} {done.applied === 1 ? 'student' : 'students'} ({fmtMoney(done.total)} in all). It shows on each student's account and fee page{done.skipped.length ? `; ${done.skipped.length} already had it and were left out` : ''}.</div> : (<>
          <div className="form-grid">
            <Field label="Add it for"><Select aria-label="Add it for" value={f.target} onChange={(e) => set({ target: e.target.value })} options={[{ value: 'section', label: 'One section' }, { value: 'class', label: 'A whole class (all its sections)' }]} /></Field>
            {f.target === 'section'
              ? <Field label="Section"><Select aria-label="Section" value={f.sectionId} onChange={(e) => set({ sectionId: e.target.value })} placeholder="Choose a section" options={L.sections.map((x) => ({ value: x._id, label: secName(x) }))} /></Field>
              : <Field label="Class"><Select aria-label="Class" value={f.classId} onChange={(e) => set({ classId: e.target.value })} placeholder="Choose a class" options={L.classes.map((c) => ({ value: c._id, label: c.name }))} /></Field>}
            <Field label="Charge name" hint="Shown to the student and on the receipt"><Input aria-label="Charge name" value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Special coaching, Science trip" /></Field>
            <Field label="Amount per student (₹)"><Input type="number" min="1" aria-label="Amount per student" value={f.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
            <Field label="Due date" hint="Optional"><Input type="date" aria-label="Due date" value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
          </div>
          <p className="muted small" style={{ margin: 0 }}>Every active student there gets the charge. Anyone who already has a charge with the same name is left out, so nobody is billed twice. Each student is told.</p>
          {pre && <div className="stack" style={{ gap: 8 }}>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}><DataTable rows={pre.rows} rowKey="studentId" empty="Nobody would get this charge" columns={[{ label: 'Student', render: (r) => <><b>{r.name}</b><div className="muted small">{r.admissionNo}</div></> }, { label: 'Class', render: (r) => `${r.className || ''} ${r.section || ''}` }, { label: 'Charge', render: () => fmtMoney(pre.amount) }]} /></div>
            <p style={{ margin: 0 }}><b>{pre.count} {pre.count === 1 ? 'student' : 'students'}, {fmtMoney(pre.total)} in all.</b></p>
            {pre.skipped.length > 0 && <p className="muted small" style={{ margin: 0 }}>Left out, already charged: {pre.skipped.slice(0, 4).map((x) => x.name).join(', ')}{pre.skipped.length > 4 ? ` and ${pre.skipped.length - 4} more` : ''}.</p>}
          </div>}
        </>)}
      </div>
    </Modal>
  );
}

/** "Collect payment" from a list row: fetches the student's account and opens the usual form over the list. */
function useCollect(base, onDone) {
  const [pay, setPay] = useState(null); const [opening, setOpening] = useState(''); const [run] = useAction();
  const collect = async (s) => { setOpening(s.studentId); const x = await run(() => get(`${base}/students/${s.studentId}/account`)); setOpening(''); if (x) setPay(x); };
  const modal = pay ? <PayModal x={pay} base={base} onClose={() => setPay(null)} onDone={() => { setPay(null); onDone?.(); }} /> : null;
  return { collect, opening, modal };
}

export function StudentsDues({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', sectionId: '', status: 'all', page: 1 });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/students`, { ...f, q: dq, limit: 25 });
  const lookups = useApi(`${base}/lookups`);
  const L = lookups.data || { classes: [], sections: [] };
  // "Collect payment" on a row opens the same form as the student's account, without leaving the list
  const { collect, opening, modal: payModal } = useCollect(base, () => list.reload());
  const [extra, setExtra] = useState(false);
  return (
    <div className="stack">
      <PageHeader title="Students & dues" subtitle="Open a student to collect a payment, add a charge or give a concession" actions={readOnly ? undefined : <Button onClick={() => setExtra(true)} disabled={!L.sections.length}>+ Charge a section or class</Button>} />
      <ListCard>
        <FilterBar search={f.q} onSearch={(v) => setF({ ...f, q: v, page: 1 })} searchLabel="Search students" placeholder="Search name, admission no, guardian">
          <Select value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value, page: 1 })} placeholder="All sections" options={L.sections.map((s) => ({ value: s._id, label: `${L.classes.find((c) => c._id === s.classId)?.name} ${s.name}` }))} aria-label="Section" />
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['all', 'All'], ['overdue', 'Overdue'], ['pending', 'Pending'], ['clear', 'Fully paid']].map(([value, l]) => ({ value, label: l }))} aria-label="Status" /></FilterBar>
        <Async state={list}>{(d) => (<>
          <DataTable rows={d.items} rowKey="studentId" empty="No students match" onRowClick={(s) => nav(`${path}/students/${s.studentId}`)} columns={[
            { label: 'Adm. no', key: 'admissionNo' }, { label: 'Student', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => `${s.className || ''} ${s.section || ''}` }, { label: 'Guardian', render: (s) => <>{s.guardian}<div className="small muted">{s.guardianPhone}</div></> },
            { label: 'Billed', render: (s) => (s.billed ? fmtMoney(s.assigned) : <Badge>Not billed</Badge>) }, { label: 'Paid', render: (s) => fmtMoney(s.paid) }, { label: 'Pending', render: (s) => <b>{fmtMoney(s.pending)}</b> }, { label: 'Overdue', render: (s) => (s.overdue > 0 ? <Badge tone="red">{fmtMoney(s.overdue)}</Badge> : '—') }, { label: 'Next due', render: (s) => fmtDate(s.nextDue) },
            ...(readOnly ? [] : [{ label: '', render: (s) => (s.pending > 0 ? <Button size="sm" variant="primary" loading={opening === s.studentId} aria-label={`Collect payment from ${s.name}`} onClick={() => collect(s)}>Collect payment</Button> : null) }])]} />
          <div className="card-b row between"><span className="muted small">{d.total} student(s) · pending {fmtMoney(d.totals.pending)} · overdue {fmtMoney(d.totals.overdue)}</span>
            <div className="row"><Button size="sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>Previous</Button><span className="small">Page {f.page}</span><Button size="sm" disabled={f.page * 25 >= d.total} onClick={() => setF({ ...f, page: f.page + 1 })}>Next</Button></div></div></>)}</Async>
      </ListCard>
      {payModal}
      {extra && <ExtraChargeModal base={base} L={L} section={f.sectionId} onClose={() => setExtra(false)} onDone={() => list.reload()} />}
    </div>
  );
}

/** A discount that stays with the student: every tuition month from now on, and every open month already billed. */
function PersonalDiscount({ x, base, readOnly, onChanged }) {
  const pd = x.personalDiscount; const [modal, setModal] = useState(false); const [run] = useAction();
  if (!pd && readOnly) return null;
  return (
    <Card title="Personal discount on tuition" action={!readOnly && <div className="row"><Button size="sm" onClick={() => setModal(true)}>{pd ? 'Change' : 'Set a discount'}</Button>{pd && <ConfirmButton size="sm" variant="danger" message="Remove the personal discount? Open months go back to the full fee. Months with a payment are not changed." onConfirm={async () => { await run(() => del(`${base}/students/${x.student.id}/personal-discount`), 'Discount removed'); onChanged(); }}>Remove</ConfirmButton>}</div>}>
      {pd ? <p style={{ margin: 0 }}><b>{pd.type === 'percent' ? `${pd.value}% off` : `${fmtMoney(pd.value)} off`}</b> every month's tuition — {pd.reason}{pd.setByName ? <span className="muted small"> (set by {pd.setByName})</span> : null}. It continues each month and into new fees billed later.</p> : <p className="muted" style={{ margin: 0 }}>No personal discount. Use one for a sibling, a staff child or a scholarship: it then applies every month.</p>}
      {modal && <FormModal title="Personal discount on tuition" initial={pd || { type: 'percent' }} fields={[{ name: 'type', label: 'Kind', type: 'select', required: true, options: [{ value: 'percent', label: 'Percent of each month\'s tuition' }, { value: 'per_month', label: 'Fixed rupees off each month' }] }, { name: 'value', label: 'Value', type: 'number', min: 0.01, step: 'any', required: true }, { name: 'reason', label: 'Reason (required)', required: true, full: true }]} onClose={() => setModal(false)} onSubmit={async (v) => { await put(`${base}/students/${x.student.id}/personal-discount`, v); onChanged(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Applies to every tuition month that has no payment yet, and to every month billed from now on. Months already paid are never changed.</p></FormModal>}
    </Card>
  );
}

export function StudentAccount({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const { id } = useParams();
  const a = useApi(`${base}/students/${id}/account`);
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const reload = () => a.reload();
  return (
    <Async state={a}>{(x) => (
      <div className="stack">
        <PageHeader title={x.student.name} subtitle={`${x.student.className || ''} ${x.student.section || ''} · Admission ${x.student.admissionNo} · Guardian ${x.student.guardian || '—'} ${x.student.guardianPhone || ''}${x.student.status !== 'active' ? ` · ${label(x.student.status)}` : ''}`} actions={<><Link className="btn" to={readOnly ? '/admin/fees?tab=students' : '/finance/students'}>← Back</Link>
          {!readOnly && <><Button onClick={() => setModal({ t: 'charge' })}>+ Add charge</Button><Button onClick={() => setModal({ t: 'advance' })} disabled={x.totals.pending <= 0}>Pay full year</Button><Button variant="primary" disabled={x.totals.pending <= 0} onClick={() => setModal({ t: 'pay' })}>Collect payment</Button></>}</>} />
        <div className="grid g4"><Stat value={fmtMoney(x.totals.assigned)} label="Total billed" /><Stat value={fmtMoney(x.totals.paid)} label="Paid" tone="green" /><Stat value={fmtMoney(x.totals.pending)} label="Pending" tone="amber" sub={x.totals.nextDue ? `Next due ${fmtDate(x.totals.nextDue, true)}` : undefined} /><Stat value={fmtMoney(x.totals.overdue)} label="Overdue" tone={x.totals.overdue ? 'red' : undefined} sub={x.totals.concession ? `Concessions ${fmtMoney(x.totals.concession)}` : undefined} /></div>
        <PersonalDiscount x={x} base={base} readOnly={readOnly} onChanged={reload} />
        <FeeSchedule installments={x.installments} charges={x.charges.map((c) => ({ id: c._id, label: c.label, kind: c.kind, dueDate: c.dueDate, period: c.period, amount: c.amount, concession: c.concession, paid: c.paidAmount, outstanding: c.outstanding, status: c.status, overdue: c.overdue, notes: c.concessions?.map((k) => `Concession ${fmtMoney(k.amount)} — ${k.reason}`), raw: c }))}
          payments={x.payments.map((p) => ({ id: p._id, receiptNo: p.receiptNo, kind: p.kind, status: p.status, paidOn: p.paidOn, chargeIds: p.allocations.map((al) => String(al.chargeId)) }))}
          onReceipt={(p) => run(() => download(`${base}/payments/${p.id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`))}
          action={readOnly ? undefined : (c) => c.status === 'open' && <Button size="sm" onClick={() => setModal({ t: 'conc', c: c.raw })}>Concession</Button>} />
        <Card title="Payments & receipts" flush><DataTable rows={x.payments} empty="No payments yet" columns={[
          { label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) }, { label: 'Type', render: (p) => (p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : p.status === 'reversed' ? <Badge tone="red">Reversed</Badge> : <Badge tone="green">Payment</Badge>) },
          { label: 'Amount', render: (p) => fmtMoney(p.amount) }, { label: 'Mode', render: (p) => <>{label(p.mode)}{p.reference && <div className="small muted">{p.reference}</div>}</> }, { label: 'Allocated to', render: (p) => p.allocations.map((al) => al.label).join(', ') }, { label: 'By', key: 'receivedByName' },
          { label: '', render: (p) => <div className="row"><Button size="sm" onClick={() => run(() => download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`))}>Receipt</Button>
            {!readOnly && p.kind === 'payment' && <Button size="sm" onClick={() => run(() => post(`${base}/payments/${p._id}/email`, {}), (r) => `Receipt emailed to ${r.sent.join(', ')}`)}>Email receipt</Button>}
            {!readOnly && p.kind === 'payment' && p.status === 'completed' && <Button size="sm" variant="danger" onClick={() => setModal({ t: 'rev', p })}>Reverse</Button>}</div> }]} /></Card>
        {modal?.t === 'advance' && <AdvanceModal x={x} base={base} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
        {modal?.t === 'pay' && <PayModal x={x} base={base} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
        {modal?.t === 'charge' && <FormModal title="Add a charge" fields={[{ name: 'label', label: 'Description', required: true, placeholder: 'e.g. Lost ID card' }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 1, required: true }, { name: 'dueDate', label: 'Due date', type: 'date' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/charges`, { ...v, studentId: id }); reload(); return true; }} />}
        {modal?.t === 'conc' && <FormModal title={`Concession · ${modal.c.label}`} fields={[{ name: 'amount', label: `Amount (max ${fmtMoney(modal.c.outstanding)})`, type: 'number', min: 1, required: true }, { name: 'reason', label: 'Reason', required: true, placeholder: 'e.g. Sibling discount, scholarship' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/charges/${modal.c._id}/concession`, v); reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>The concession, your name and the reason are kept on the charge.</p></FormModal>}
        {modal?.t === 'rev' && <FormModal title={`Reverse receipt ${modal.p.receiptNo}`} submitLabel="Reverse payment" fields={[{ name: 'reason', label: 'Reason (required)', type: 'textarea', required: true, placeholder: 'e.g. Cheque bounced' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/payments/${modal.p._id}/reverse`, v); reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Receipts are never edited or deleted. A reversal entry is added, the original is flagged, and the dues come back.</p></FormModal>}
      </div>)}</Async>
  );
}

export function PayModal({ x, base, onClose, onDone }) {
  const open = x.charges.filter((c) => c.status === 'open');
  const [v, setV] = useState({ amount: '', mode: 'cash', reference: '', paidOn: today(), note: '' });
  const [amountEdited, setAmountEdited] = useState(false);
  const [disc, setDisc] = useState({ on: false, type: 'amount', value: '', reason: '' });
  // every due starts ticked, so what is shown (the ticks and the amount) always agree; "Select none" takes the amount to 0
  const [picked, setPicked] = useState(() => open.map((c) => c._id));
  const [run, busy] = useAction();
  const everything = picked.length === open.length;
  const due = Math.round(open.filter((c) => picked.includes(c._id)).reduce((n, c) => n + c.outstanding, 0) * 100) / 100;
  // a discount is taken off the dues this receipt pays; what is left is what the person pays
  const num = Number(disc.value) || 0;
  const off = disc.on ? Math.round((disc.type === 'percent' ? (due * num) / 100 : num) * 100) / 100 : 0;
  const discountOk = !disc.on || (off > 0 && off <= due + 0.001 && disc.reason.trim().length >= 3 && (disc.type !== 'percent' || num <= 100));
  const net = Math.max(0, Math.round((due - off) * 100) / 100);
  const amount = amountEdited ? Number(v.amount) : net; // by default the whole of what is left; the person may pay part of it
  const clears = disc.on && off > 0 && net === 0;
  const valid = discountOk && (clears || (amount > 0 && amount <= net + 0.001));
  const submit = async () => {
    const body = { studentId: x.student.id, ...(clears ? {} : { amount }), mode: v.mode, paidOn: v.paidOn, ...(v.reference ? { reference: v.reference } : {}), ...(v.note ? { note: v.note } : {}), ...(!everything && picked.length ? { chargeIds: picked } : {}), // all ticked = the oldest dues first, as before
      ...(disc.on ? { discount: { type: disc.type, value: num, reason: disc.reason.trim() } } : {}) };
    const p = await run(() => post(`${base}/payments`, body), (r) => (r.receiptNo ? `Receipt ${r.receiptNo} issued` : 'Discount applied. Nothing is left to pay for those dues.'));
    if (!p) return;
    if (p.receiptNo) { try { await download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`); } catch { /* receipt can be reprinted */ } }
    onDone();
  };
  return (
    <Modal wide title="Collect payment" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={submit}>{clears ? 'Apply discount' : `Collect ${fmtMoney(amount || 0)}`}</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label={`Amount (₹) — up to ${fmtMoney(net)}`}><Input type="number" min="1" disabled={clears || !picked.length} value={clears || !picked.length ? 0 : amountEdited ? v.amount : String(net)} onChange={(e) => { setAmountEdited(true); setV({ ...v, amount: e.target.value }); }} /></Field>
          <Field label="Mode"><Select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })} options={MODES} /></Field>
          <Field label="Reference (UPI id / cheque no)"><Input value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /></Field><Field label="Date received"><Input type="date" max={today()} value={v.paidOn} onChange={(e) => setV({ ...v, paidOn: e.target.value })} /></Field>
        </div>
        <div><div className="row between wrap" style={{ marginBottom: 4, gap: 8 }}>
          <div className="bold small">Pay towards <span className="muted" style={{ fontWeight: 400 }}>· {picked.length} of {open.length} ticked, {fmtMoney(due)}</span></div>
          <div className="row" style={{ gap: 6 }}>
            <Button size="sm" disabled={everything} onClick={() => { setPicked(open.map((c) => c._id)); setAmountEdited(false); }}>Select all</Button>
            <Button size="sm" disabled={!picked.length} onClick={() => { setPicked([]); setAmountEdited(false); }}>Select none</Button>
          </div></div>
          {!picked.length && <p className="small muted" style={{ margin: '0 0 6px' }}>Nothing is ticked, so there is nothing to collect. Tick the dues this payment is for, or choose Select all.</p>}
          {open.map((c) => <label key={c._id} className="row small"><input type="checkbox" checked={picked.includes(c._id)} onChange={(e) => { setPicked(e.target.checked ? [...picked, c._id] : picked.filter((i) => i !== c._id)); setAmountEdited(false); }} /> {c.label} — {fmtMoney(c.outstanding)} {c.overdue && <Badge tone="red">overdue</Badge>}</label>)}</div>
        <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <label className="row bold"><input type="checkbox" checked={disc.on} onChange={(e) => { setDisc({ ...disc, on: e.target.checked }); setAmountEdited(false); }} /> Give a discount or concession on {everything ? 'these dues' : 'the ticked dues'}</label>
          {disc.on && <>
            <div className="form-grid">
              <Field label="Discount type"><Select aria-label="Discount type" value={disc.type} onChange={(e) => { setDisc({ ...disc, type: e.target.value }); setAmountEdited(false); }} options={[{ value: 'amount', label: 'Rupees (₹)' }, { value: 'percent', label: 'Percent (%) of what is due' }]} /></Field>
              <Field label={disc.type === 'percent' ? 'Percent off' : 'Rupees off'}><Input aria-label="Discount value" type="number" min="1" value={disc.value} onChange={(e) => { setDisc({ ...disc, value: e.target.value }); setAmountEdited(false); }} /></Field>
              <Field label="Reason (kept on the dues)" full><Input aria-label="Discount reason" value={disc.reason} onChange={(e) => setDisc({ ...disc, reason: e.target.value })} placeholder="e.g. Sibling discount, scholarship, staff child" /></Field>
            </div>
            <p className="small" role="status">{off > 0 ? <>Due {fmtMoney(due)} − discount <b>{fmtMoney(off)}</b> = <b>{fmtMoney(net)}</b> to pay{clears ? ' (nothing left, so no receipt is made)' : ''}.</> : 'Enter the discount to see what is left to pay.'}</p>
            {disc.on && num > 0 && !discountOk && <div className="alert">{off > due + 0.001 ? `The discount cannot be more than what is due (${fmtMoney(due)}).` : disc.type === 'percent' && num > 100 ? 'A percentage must be between 0 and 100.' : 'Give a reason for the discount.'}</div>}
          </>}
        </div>
        {!clears && amount > net + 0.001 && <div className="alert">The amount is more than what is owed. Advance payments are not supported.</div>}
      </div>
    </Modal>
  );
}

// ───────────── payments ledger ─────────────
export function Payments({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ q: '', mode: '', sectionId: '', from: '', to: '' });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/payments`, { ...f, q: dq });
  const lookups = useApi(`${base}/lookups`);
  const L = lookups.data || { classes: [], sections: [] };
  const [run] = useAction();
  const [rev, setRev] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="Payments & receipts" subtitle="Every receipt ever issued. Receipts are never edited or deleted — mistakes are reversed." actions={<Button onClick={() => run(() => download(`${base}/export/payments.csv`, 'payments.csv', { ...f }))}>Export CSV</Button>} />
      <ListCard>
        <FilterBar search={f.q} onSearch={(v) => setF({ ...f, q: v })} searchLabel="Search payments" placeholder="Search receipt, reference, student">
          <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={[...MODES, { value: 'online', label: 'Online' }]} placeholder="All modes" aria-label="Mode" /><Select value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })} placeholder="All classes" options={L.sections.map((x) => ({ value: x._id, label: `${L.classes.find((c) => c._id === x.classId)?.name} ${x.name}` }))} aria-label="Class" /><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="From" style={{ width: 150 }} /><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="To" /></FilterBar>
        <Async state={list} empty={<Empty title="No payments match" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) }, { label: 'Student', render: (p) => <>{p.student} <span className="muted small">{p.admissionNo}</span></> },
          { label: 'Amount', render: (p) => <b style={{ color: p.kind === 'reversal' ? 'var(--red)' : undefined }}>{p.kind === 'reversal' ? '−' : ''}{fmtMoney(p.amount)}</b> }, { label: 'Mode', render: (p) => label(p.mode) }, { label: 'Reference', key: 'reference' }, { label: 'By', key: 'receivedByName' },
          { label: 'Status', render: (p) => (p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : p.status === 'reversed' ? <Badge tone="red" >Reversed</Badge> : <Badge tone="green">Completed</Badge>) },
          { label: '', render: (p) => <div className="row"><Button size="sm" onClick={() => run(() => download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`))}>Receipt</Button>{!readOnly && p.kind === 'payment' && p.status === 'completed' && <Button size="sm" variant="danger" onClick={() => setRev(p)}>Reverse</Button>}</div> }]} />}</Async>
      </ListCard>
      {rev && <FormModal title={`Reverse receipt ${rev.receiptNo}`} submitLabel="Reverse payment" fields={[{ name: 'reason', label: 'Reason (required)', type: 'textarea', required: true }]} onClose={() => setRev(null)} onSubmit={async (v) => { await post(`${base}/payments/${rev._id}/reverse`, v); list.reload(); return true; }} />}
    </div>
  );
}

// ───────────── online payments ─────────────
const ORDER_TONE = { paid: 'green', created: 'blue', processing: 'blue', failed: 'red', expired: '', needs_review: 'amber' };
const ORDER_TEXT = { created: 'Waiting for payment', processing: 'Settling', paid: 'Paid', failed: 'Failed', expired: 'Not paid (timed out)', needs_review: 'Needs your attention' };
export function OnlinePayments({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [status, setStatus] = useState('');
  const list = useApi(`${base}/online-payments`, { status });
  return (
    <div className="stack">
      <PageHeader title="Online payments" subtitle="Fees paid by students and parents from the portal. Each paid one already has a normal receipt in Payments & receipts." />
      {list.data?.counts?.needs_review > 0 && <div className="alert">{list.data.counts.needs_review} payment(s) need your attention: the money was received online but could not be matched to the dues (for example, the dues were also paid at the desk). Check the receipts, then refund the extra amount from the payment gateway or adjust the account.</div>}
      <Card><div className="row"><Field label="Show"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={Object.entries(ORDER_TEXT).map(([value, l]) => ({ value, label: l }))} placeholder="All" aria-label="Status" /></Field></div></Card>
      <ListCard>
        <Async state={list} empty={<Empty title="No online payments yet" />}>{(d) => d.orders.length ? <DataTable rows={d.orders} columns={[
          { label: 'Started', render: (o) => fmtDate(o.createdAt, true) }, { label: 'Student', render: (o) => (o.student ? <>{o.student.name} <span className="muted small">{o.student.admissionNo}</span></> : '—') },
          { label: 'Amount', render: (o) => <b>{fmtMoney(o.amount)}</b> }, { label: 'Status', render: (o) => <Badge tone={ORDER_TONE[o.status]}>{ORDER_TEXT[o.status] || o.status}</Badge> },
          { label: 'Receipt', render: (o) => o.receiptNo || '—' }, { label: 'Gateway reference', render: (o) => <span className="small muted">{o.providerPaymentId || '—'}{o.provider === 'mock' ? ' (test)' : ''}</span> },
          { label: 'Note', render: (o) => <span className="small">{o.note || o.failureReason || ''}</span> }]} /> : <Empty title="No online payments yet" />}</Async>
      </ListCard>
    </div>
  );
}

// ───────────── reports & defaulters ─────────────
export function FinanceReports({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [tab, setTab] = useState('collection');
  const [range, setRange] = useState({ from: '', to: '' });
  const col = useApi(tab === 'collection' ? `${base}/reports/collection` : null, range);
  const classes = useApi(tab === 'classes' ? `${base}/reports/classes` : null);
  return (
    <div className="stack">
      <PageHeader title="Reports" subtitle="What was collected, and what is still outstanding by class. Students who are overdue are under Defaulters." />
      <Tabs tabs={[['collection', 'Collection'], ['classes', 'Outstanding by class']]} value={tab} onChange={setTab} />
      {tab === 'collection' && <Async state={col}>{(c) => (<>
        <div className="row wrap"><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From" /><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To" /><Badge tone="green">Net collected {fmtMoney(c.total)}</Badge><span className="muted small">{fmtDate(c.from, true)} – {fmtDate(c.to, true)}</span></div>
        <div className="grid g-main"><Card title="By day"><BarsChart data={c.byDay} x="date" bars={[{ key: 'amount', name: 'Collected', color: 'rgb(var(--c-success))' }]} /></Card><Card title="By payment mode" flush><DataTable rows={c.byMode} rowKey="mode" columns={[{ label: 'Mode', render: (m) => label(m.mode) }, { label: 'Receipts', key: 'count' }, { label: 'Amount', render: (m) => fmtMoney(m.amount) }]} /></Card></div></>)}</Async>}
      {tab === 'classes' && <Card flush><Async state={classes} empty={<Empty title="Nothing billed yet" />}>{(rows) => <DataTable rows={rows} rowKey="className" columns={[{ label: 'Class', render: (r) => <b>{r.className}</b> }, { label: 'Students', key: 'students' }, { label: 'Billed', render: (r) => fmtMoney(r.billed) }, { label: 'Collected', render: (r) => fmtMoney(r.collected) }, { label: 'Pending', render: (r) => fmtMoney(r.pending) }, { label: 'Overdue', render: (r) => (r.overdue ? <Badge tone="red">{fmtMoney(r.overdue)}</Badge> : '—') }]} />}</Async></Card>}
    </div>
  );
}

const DEF_PAGE = 50;
const defCols = (path) => [
  { label: 'Student', render: (s) => <Link to={`${path}/students/${s.studentId}`} onClick={(e) => e.stopPropagation()}><b>{s.name}</b></Link> }, { label: 'Class', render: (s) => `${s.className} ${s.section}` },
  { label: 'Guardian', render: (s) => <>{s.guardian}<div className="small muted">{s.guardianPhone}</div></> }, { label: 'Overdue', render: (s) => <Badge tone="red">{fmtMoney(s.overdue)}</Badge> },
  { label: 'Days overdue', render: (s) => (s.daysOverdue ? `${s.daysOverdue}d` : '—') }, { label: 'Pending', render: (s) => fmtMoney(s.pending) },
];

/** Defaulters as a page of its own (a main tab of the fees area): students who are overdue. */
export function FinanceDefaulters({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  return (
    <div className="stack">
      <PageHeader title="Defaulters" subtitle="Students with overdue fees, in one list or class by class. Filter by class, then send reminders or export." />
      <Defaulters base={base} path={path} readOnly={readOnly} />
    </div>
  );
}

/** Students with overdue fees: one list (any class), or class by class. The School Admin sees both, read-only. */
function Defaulters({ base, path, readOnly }) {
  const nav = useNavigate();
  const [view, setView] = useState('list');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // the class whose students are shown in the side panel
  const [openPage, setOpenPage] = useState(1);
  const [sec, setSec] = useState(''); // a section of that class
  const [run, busy] = useAction();
  const lookups = useApi(`${base}/lookups`);
  const list = useApi(view === 'list' ? `${base}/students` : null, { status: 'overdue', limit: DEF_PAGE, page, ...(classId ? { classId } : {}) });
  const byClass = useApi(view === 'class' ? `${base}/reports/defaulters-by-class` : null);
  const inClass = useApi(view === 'class' && open ? `${base}/students` : null, { status: 'overdue', limit: DEF_PAGE, page: openPage, classId: open || undefined, sectionId: sec || undefined });
  const { collect, opening, modal: payModal } = useCollect(base, () => { inClass.reload(); byClass.reload(); list.reload(); });
  const pick = (v) => { setView(v); setOpen(null); setSec(''); };
  // on a narrow screen the panel sits under the table: bring it into view
  useEffect(() => { if (open && typeof window !== 'undefined' && window.innerWidth <= 1100) document.getElementById('defaulters-panel')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, [open]);
  const cls = byClass.data?.items.find((c) => c.classId === open);
  return (<>
    <div className="row wrap">
      <Tabs tabs={[['list', 'All defaulters'], ['class', 'Group by class']]} value={view} onChange={pick} />
      {view === 'list' && <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} placeholder="All classes" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />}
      {!readOnly && <ConfirmButton variant="primary" message="Send a fee reminder notification to every student with overdue fees? (Once per day per student.)" onConfirm={async () => { await run(() => post(`${base}/reminders`, {}), (r) => `${r.sent} reminder(s) sent (${r.matched} overdue)`); }}>Send reminders to all</ConfirmButton>}
      <Button loading={busy} onClick={() => run(() => (view === 'list' ? download(`${base}/export/dues.csv`, 'defaulters.csv', { status: 'overdue', ...(classId ? { classId } : {}) }) : download(`${base}/export/defaulters-by-class.csv`, 'defaulters-by-class.csv')))}>{view === 'list' ? 'Export CSV' : 'Export by class'}</Button>
    </div>
    {view === 'list' && <ListCard><Async state={list} empty={<Empty title="No overdue fees" />}>{(d) => (<>
      <DataTable rows={d.items} rowKey="studentId" onRowClick={(s) => nav(`${path}/students/${s.studentId}`)} columns={[...defCols(path), { label: 'Next due', render: (s) => fmtDate(s.nextDue) }]} />
      <ListFooter total={d.total} noun="defaulter" page={page} pageSize={DEF_PAGE} onPage={setPage} /></>)}</Async></ListCard>}
    {view === 'class' && (
      <div className={`stu-split${open ? ' open' : ''}`}>
        <Card flush><Async state={byClass} empty={<Empty title="Nothing billed yet" />}>{(d) => (<>
          <DataTable rows={d.items} rowKey="classId" rowClassName={(c) => (c.classId === open ? 'sel' : '')} onRowClick={(c) => { setOpen(open === c.classId ? null : c.classId); setOpenPage(1); setSec(''); }} columns={[
            { label: 'Class', render: (c) => <><b>{c.className}</b> <span className="muted small">{open === c.classId ? '▾' : '▸'}</span></> }, { label: 'Billed students', key: 'studentsBilled' },
            { label: 'Defaulters', render: (c) => (c.defaulters ? <Badge tone="red">{c.defaulters}</Badge> : 0) }, { label: '% defaulting', render: (c) => `${c.percentDefaulting}%` }, { label: 'Overdue', render: (c) => (c.overdueAmount ? fmtMoney(c.overdueAmount) : '—') },
            { label: 'Sections', render: (c) => c.sections.filter((x) => x.defaulters).map((x) => `${x.name}: ${x.defaulters}`).join(' · ') || '—' }]} />
          <div className="card-b muted small">{d.totals.defaulters} defaulter(s) of {d.totals.studentsBilled} billed students · {fmtMoney(d.totals.overdueAmount)} overdue. Click a class to see its students beside the list.</div></>)}</Async></Card>
        {open && (
          <aside id="defaulters-panel" className="stu-preview" aria-label={`Defaulters in ${cls?.className || 'this class'}`}>
            <div className="row" style={{ justifyContent: 'space-between' }}><Badge tone="red">Defaulters</Badge><Button size="sm" onClick={() => setOpen(null)} aria-label="Close class">Close</Button></div>
            <div><h3 style={{ margin: 0, fontSize: 18, letterSpacing: '-.02em' }}>{cls?.className || 'This class'}</h3><span className="muted small">{cls ? `${cls.defaulters} defaulter${cls.defaulters === 1 ? '' : 's'} · ${fmtMoney(cls.overdueAmount)} overdue` : ''}</span></div>
            {cls && cls.sections.filter((x) => x.defaulters).length > 1 && <Select aria-label="Section" value={sec} onChange={(e) => { setSec(e.target.value); setOpenPage(1); }} placeholder="All sections" options={cls.sections.filter((x) => x.defaulters).map((x) => ({ value: x.sectionId, label: `${cls.className} ${x.name} (${x.defaulters})` }))} />}
            <Async state={inClass} empty={<Empty title="No defaulters here" />}>{(d) => (<>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 'calc(100dvh - 400px)', minHeight: 160, overflowY: 'auto' }}>
                {d.items.map((s) => (
                  <li key={s.studentId} className="flex items-center gap-2 border-t border-border py-2.5 first:border-t-0">
                    <button type="button" onClick={() => nav(`${path}/students/${s.studentId}`)} className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><b className="block truncate">{s.name}</b><span className="block truncate text-[13px] text-muted-foreground">{s.className} {s.section} · {s.admissionNo}</span></button>
                    <Badge tone="red">{fmtMoney(s.overdue)}</Badge>
                    {!readOnly && <Button size="sm" variant="primary" loading={opening === s.studentId} aria-label={`Collect payment from ${s.name}`} onClick={() => collect(s)}>Collect</Button>}
                  </li>
                ))}
              </ul>
              <ListFooter total={d.total} noun="defaulter" page={openPage} pageSize={DEF_PAGE} onPage={setOpenPage} /></>)}</Async>
          </aside>
        )}
      </div>
    )}
    {payModal}
  </>);
}

// ───────────── the school's fee policy ─────────────
export function FeePolicy({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const q = useApi(`${base}/policy`);
  return (
    <div className="stack">
      <PageHeader title="Fee policy" subtitle="Every school decides these for itself. They apply to students billed from now on." />
      <Async state={q}>{(p) => <PolicyForm key={JSON.stringify(p)} base={base} policy={p} readOnly={readOnly} onSaved={q.reload} />}</Async>
    </div>
  );
}

function PolicyForm({ base, policy, readOnly, onSaved }) {
  const [v, setV] = useState({ dueDay: policy.dueDay, ...policy.advanceDiscount });
  const [run, busy] = useAction();
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const sentence = !v.enabled ? 'No discount for paying in advance.' : `A student who pays all ${v.minMonths} month${Number(v.minMonths) === 1 ? '' : 's'} of tuition at once gets ${v.type === 'months' ? `${v.value} month${Number(v.value) === 1 ? '' : 's'} of tuition free` : `${v.value}% off tuition`}.`;
  const save = () => run(() => put(`${base}/policy`, { dueDay: Number(v.dueDay), advanceDiscount: { enabled: !!v.enabled, minMonths: Number(v.minMonths), type: v.type, value: Number(v.value) } }), 'Fee policy saved').then((r) => r && onSaved());
  return (
    <div className="grid g2">
      <Card title="Monthly fees"><div className="stack">
        <Field label="Fees are due on day … of every month" hint="Applies to tuition and transport. A structure can override it."><Input type="number" min="1" max="28" disabled={readOnly} value={v.dueDay} onChange={(e) => set('dueDay', e.target.value)} /></Field>
        <p className="muted small" style={{ margin: 0 }}>The admission fee is charged once, when the student joins. Tuition is billed for every month of the academic year, starting from the month the student joined.</p>
      </div></Card>
      <Card title="Paying the whole year in advance"><div className="stack">
        <label className="row"><input type="checkbox" disabled={readOnly} checked={!!v.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Give a discount to families who pay everything at once</label>
        <div className="form-grid">
          <Field label="Months to be paid at once" hint="12 = the whole year"><Input type="number" min="1" max="12" disabled={readOnly || !v.enabled} value={v.minMonths} onChange={(e) => set('minMonths', e.target.value)} /></Field>
          <Field label="The discount is"><Select disabled={readOnly || !v.enabled} value={v.type} onChange={(e) => set('type', e.target.value)} options={[{ value: 'months', label: 'Free months of tuition' }, { value: 'percent', label: 'A percentage of tuition' }]} /></Field>
          <Field label={v.type === 'months' ? 'Number of free months' : 'Percentage off'}><Input type="number" min="1" disabled={readOnly || !v.enabled} value={v.value} onChange={(e) => set('value', e.target.value)} /></Field>
        </div>
        <div className="alert info" style={{ margin: 0 }}>{sentence}</div>
        {!readOnly && <div><Button variant="primary" loading={busy} onClick={save}>Save policy</Button></div>}
      </div></Card>
    </div>
  );
}

function AdvanceModal({ x, base, onClose, onDone }) {
  const plan = useApi(`${base}/students/${x.student.id}/advance-plan`);
  const [v, setV] = useState({ mode: 'cash', reference: '', paidOn: today() });
  const [run, busy] = useAction();
  return (
    <Modal title="Pay the whole year" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!plan.data?.eligible} onClick={async () => {
      const p = await run(() => post(`${base}/students/${x.student.id}/advance-payment`, { mode: v.mode, paidOn: v.paidOn, ...(v.reference ? { reference: v.reference } : {}) }), (r) => `Receipt ${r.receiptNo} issued`);
      if (p) { try { await download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`); } catch { /* receipt can be reprinted */ } onDone(); } }}>Collect {plan.data ? fmtMoney(plan.data.payable) : ''}</Button></>}>
      <Async state={plan}>{(p) => (
        <div className="stack">
          {!p.eligible && <div className="alert">{p.reason}</div>}
          <dl className="kv"><dt>Tuition months still open</dt><dd>{p.months} ({fmtMoney(p.tuition)})</dd>{p.other > 0 && <><dt>Transport and other monthly fees</dt><dd>{fmtMoney(p.other)}</dd></>}
            <dt>School's offer</dt><dd>{p.policy.enabled ? p.offer : 'none'}</dd><dt>Discount</dt><dd><b style={{ color: 'var(--green)' }}>− {fmtMoney(p.discount)}</b></dd><dt>To pay now</dt><dd><b>{fmtMoney(p.payable)}</b></dd></dl>
          {p.eligible && <>{p.waived.length > 0 && <p className="muted small" style={{ margin: 0 }}>Waived: {p.waived.map((w) => `${w.label} (${fmtMoney(w.amount)})`).slice(0, 3).join(', ')}{p.waived.length > 3 ? ` and ${p.waived.length - 3} more` : ''}.</p>}
            <div className="form-grid">
              <Field label="Mode"><Select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })} options={MODES} /></Field>
              <Field label="Reference"><Input value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} placeholder="UPI id / cheque no" /></Field>
              <Field label="Date received"><Input type="date" max={today()} value={v.paidOn} onChange={(e) => setV({ ...v, paidOn: e.target.value })} /></Field>
            </div></>}
        </div>
      )}</Async>
    </Modal>
  );
}
