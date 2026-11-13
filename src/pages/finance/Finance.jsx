import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, put, del, download } from '../../api/client.js';
import {
  Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, useDebounced, fmtDate, fmtMoney, label, } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { BarsChart, DonutChart } from '../../components/Charts.jsx';

const MODES = [['cash', 'Cash'], ['upi', 'UPI'], ['cheque', 'Cheque'], ['bank_transfer', 'Bank transfer'], ['card', 'Card'], ['other', 'Other']].map(([value, l]) => ({ value, label: l }));
const today = () => new Date().toLocaleDateString('en-CA');
/** Finance screens are shared with the School Admin's view-only window (readOnly hides every action). */
const ctxOf = (readOnly) => ({ base: readOnly ? '/api/school/finance' : '/api/finance', path: readOnly ? '/admin/fees' : '/finance' });

export function FinanceDashboard({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const d = useApi(`${base}/dashboard`);
  return (
    <Async state={d}>{(x) => (
      <div className="stack">
        <PageHeader title="Fees overview" subtitle={readOnly ? 'View-only for the School Admin. Collections are handled by the Finance desk.' : `Collections and dues · ${fmtDate(x.today, true)}`} actions={!readOnly && <Link className="btn primary" to="/finance/students">Collect a payment</Link>} />
        <div className="grid g4"><Stat value={fmtMoney(x.collectedToday)} label="Collected today" sub={`${x.receiptsToday} receipt(s)`} tone="green" /><Stat value={fmtMoney(x.collectedMonth)} label="Collected this month" tone="blue" /><Stat value={fmtMoney(x.pending)} label="Total pending" tone="amber" /><Stat value={fmtMoney(x.overdue)} label="Overdue" sub={`${x.defaulters} student(s)`} tone={x.overdue ? 'red' : undefined} /></div>
        <div className="grid g-main">
          <Card title="Collection, last 14 days"><BarsChart data={x.trend} x="date" bars={[{ key: 'amount', name: 'Collected', color: '#16a34a' }]} unit="" /></Card>
          <Card title="This month by mode">{x.modes.length ? <DonutChart data={x.modes.map((m) => ({ name: label(m.mode), value: m.amount }))} /> : <Empty icon="💳" title="No collections this month" />}</Card>
        </div>
        {x.studentsUnbilled > 0 && <div className="alert info">{x.studentsUnbilled} enrolled student(s) have no fees assigned yet. {!readOnly && <Link to="/finance/structures">Assign a fee structure</Link>}</div>}
        <Card title="Recent payments" action={<Link to={`${path}/${readOnly ? '' : 'payments'}`}>{readOnly ? '' : 'All payments'}</Link>} flush>
          <DataTable rows={x.recent} empty="No payments yet" columns={[{ label: 'Receipt', key: 'receiptNo' }, { label: 'Date', render: (p) => fmtDate(p.paidOn) }, { label: 'Student', key: 'student' }, { label: 'Amount', render: (p) => <b style={{ color: p.kind === 'reversal' ? 'var(--red)' : undefined }}>{p.kind === 'reversal' ? '−' : ''}{fmtMoney(p.amount)}</b> }, { label: 'Mode', render: (p) => label(p.mode) }, { label: '', render: (p) => p.status === 'reversed' && <Badge tone="red">Reversed</Badge> }]} />
        </Card>
      </div>)}</Async>
  );
}

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
              <Button size="sm" type="button" variant="danger" aria-label={`Remove fee ${i + 1}`} onClick={() => setExtras(extras.filter((_, j) => j !== i))}>✕</Button>
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
      <Card flush><Async state={list} empty={<Empty icon="🧾" title="No fee structures yet" />}>{(rows) => <DataTable rows={rows} columns={[
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
export function StudentsDues({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', sectionId: '', status: 'all', page: 1 });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/students`, { ...f, q: dq, limit: 25 });
  const lookups = useApi(`${base}/lookups`);
  const L = lookups.data || { classes: [], sections: [] };
  return (
    <div className="stack">
      <PageHeader title="Students & dues" subtitle="Open a student to collect a payment, add a charge or give a concession" />
      <Card flush>
        <div className="card-b row wrap"><div className="grow"><Input placeholder="Search name, admission no, guardian" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} aria-label="Search students" /></div>
          <Select value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value, page: 1 })} placeholder="All sections" options={L.sections.map((s) => ({ value: s._id, label: `${L.classes.find((c) => c._id === s.classId)?.name} ${s.name}` }))} aria-label="Section" />
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['all', 'All'], ['overdue', 'Overdue'], ['pending', 'Pending'], ['clear', 'Fully paid']].map(([value, l]) => ({ value, label: l }))} aria-label="Status" /></div>
        <Async state={list}>{(d) => (<>
          <DataTable rows={d.items} rowKey="studentId" empty="No students match" onRowClick={(s) => nav(`${path}/students/${s.studentId}`)} columns={[
            { label: 'Adm. no', key: 'admissionNo' }, { label: 'Student', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => `${s.className || ''} ${s.section || ''}` }, { label: 'Guardian', render: (s) => <>{s.guardian}<div className="small muted">{s.guardianPhone}</div></> },
            { label: 'Billed', render: (s) => (s.billed ? fmtMoney(s.assigned) : <Badge>Not billed</Badge>) }, { label: 'Paid', render: (s) => fmtMoney(s.paid) }, { label: 'Pending', render: (s) => <b>{fmtMoney(s.pending)}</b> }, { label: 'Overdue', render: (s) => (s.overdue > 0 ? <Badge tone="red">{fmtMoney(s.overdue)}</Badge> : '—') }, { label: 'Next due', render: (s) => fmtDate(s.nextDue) }]} />
          <div className="card-b row between"><span className="muted small">{d.total} student(s) · pending {fmtMoney(d.totals.pending)} · overdue {fmtMoney(d.totals.overdue)}</span>
            <div className="row"><Button size="sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>Previous</Button><span className="small">Page {f.page}</span><Button size="sm" disabled={f.page * 25 >= d.total} onClick={() => setF({ ...f, page: f.page + 1 })}>Next</Button></div></div></>)}</Async>
      </Card>
    </div>
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
        <Card title="Charges" flush><DataTable rows={x.charges} empty="Nothing has been billed to this student yet" columns={[
          { label: 'Charge', render: (c) => <><b>{c.label}</b> {c.kind === 'library_fine' && <Badge tone="amber">Library</Badge>}{c.concessions?.map((k, i) => <div key={i} className="small muted">Concession {fmtMoney(k.amount)} — {k.reason}</div>)}</> }, { label: 'Due', render: (c) => fmtDate(c.dueDate, true) }, { label: 'Amount', render: (c) => fmtMoney(c.amount) }, { label: 'Concession', render: (c) => (c.concession ? fmtMoney(c.concession) : '—') }, { label: 'Paid', render: (c) => fmtMoney(c.paidAmount) },
          { label: 'Outstanding', render: (c) => <b>{fmtMoney(c.outstanding)}</b> }, { label: 'Status', render: (c) => (c.status === 'paid' ? <Badge tone="green">Paid</Badge> : c.overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="amber">Open</Badge>) },
          ...(readOnly ? [] : [{ label: '', render: (c) => c.status === 'open' && <Button size="sm" onClick={() => setModal({ t: 'conc', c })}>Concession</Button> }])]} /></Card>
        <Card title="Payments & receipts" flush><DataTable rows={x.payments} empty="No payments yet" columns={[
          { label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) }, { label: 'Type', render: (p) => (p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : p.status === 'reversed' ? <Badge tone="red">Reversed</Badge> : <Badge tone="green">Payment</Badge>) },
          { label: 'Amount', render: (p) => fmtMoney(p.amount) }, { label: 'Mode', render: (p) => <>{label(p.mode)}{p.reference && <div className="small muted">{p.reference}</div>}</> }, { label: 'Allocated to', render: (p) => p.allocations.map((al) => al.label).join(', ') }, { label: 'By', key: 'receivedByName' },
          ...(readOnly ? [] : [{ label: '', render: (p) => <div className="row"><Button size="sm" onClick={() => run(() => download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`))}>Receipt</Button>
            {p.kind === 'payment' && p.status === 'completed' && <Button size="sm" variant="danger" onClick={() => setModal({ t: 'rev', p })}>Reverse</Button>}</div> }])]} /></Card>
        {modal?.t === 'advance' && <AdvanceModal x={x} base={base} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
        {modal?.t === 'pay' && <PayModal x={x} base={base} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
        {modal?.t === 'charge' && <FormModal title="Add a charge" fields={[{ name: 'label', label: 'Description', required: true, placeholder: 'e.g. Lost ID card' }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 1, required: true }, { name: 'dueDate', label: 'Due date', type: 'date' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/charges`, { ...v, studentId: id }); reload(); return true; }} />}
        {modal?.t === 'conc' && <FormModal title={`Concession · ${modal.c.label}`} fields={[{ name: 'amount', label: `Amount (max ${fmtMoney(modal.c.outstanding)})`, type: 'number', min: 1, required: true }, { name: 'reason', label: 'Reason', required: true, placeholder: 'e.g. Sibling discount, scholarship' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/charges/${modal.c._id}/concession`, v); reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>The concession, your name and the reason are kept on the charge.</p></FormModal>}
        {modal?.t === 'rev' && <FormModal title={`Reverse receipt ${modal.p.receiptNo}`} submitLabel="Reverse payment" fields={[{ name: 'reason', label: 'Reason (required)', type: 'textarea', required: true, placeholder: 'e.g. Cheque bounced' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await post(`${base}/payments/${modal.p._id}/reverse`, v); reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Receipts are never edited or deleted. A reversal entry is added, the original is flagged, and the dues come back.</p></FormModal>}
      </div>)}</Async>
  );
}

function PayModal({ x, base, onClose, onDone }) {
  const open = x.charges.filter((c) => c.status === 'open');
  const [v, setV] = useState({ amount: x.totals.pending, mode: 'cash', reference: '', paidOn: today(), note: '' });
  const [picked, setPicked] = useState([]);
  const [run, busy] = useAction();
  const due = picked.length ? open.filter((c) => picked.includes(c._id)).reduce((n, c) => n + c.outstanding, 0) : x.totals.pending;
  return (
    <Modal wide title="Collect payment" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!(v.amount > 0) || v.amount > due + 0.001} onClick={async () => {
      const body = { studentId: x.student.id, amount: Number(v.amount), mode: v.mode, paidOn: v.paidOn, ...(v.reference ? { reference: v.reference } : {}), ...(v.note ? { note: v.note } : {}), ...(picked.length ? { chargeIds: picked } : {}) };
      const p = await run(() => post(`${base}/payments`, body), (r) => `Receipt ${r.receiptNo} issued`); if (p) { try { await download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`); } catch { /* receipt can be reprinted */ } onDone(); } }}>Collect {fmtMoney(v.amount || 0)}</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label={`Amount (₹) — up to ${fmtMoney(due)}`}><Input type="number" min="1" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
          <Field label="Mode"><Select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })} options={MODES} /></Field>
          <Field label="Reference (UPI id / cheque no)"><Input value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /></Field><Field label="Date received"><Input type="date" max={today()} value={v.paidOn} onChange={(e) => setV({ ...v, paidOn: e.target.value })} /></Field>
        </div>
        <div><div className="bold small" style={{ marginBottom: 4 }}>Pay towards (leave unticked to clear the oldest dues first)</div>
          {open.map((c) => <label key={c._id} className="row small"><input type="checkbox" checked={picked.includes(c._id)} onChange={(e) => setPicked(e.target.checked ? [...picked, c._id] : picked.filter((i) => i !== c._id))} /> {c.label} — {fmtMoney(c.outstanding)} {c.overdue && <Badge tone="red">overdue</Badge>}</label>)}</div>
        {v.amount > due + 0.001 && <div className="alert">The amount is more than what is owed. Advance payments are not supported.</div>}
      </div>
    </Modal>
  );
}

// ───────────── payments ledger ─────────────
export function Payments({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ q: '', mode: '', from: '', to: '' });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/payments`, { ...f, q: dq });
  const [run] = useAction();
  const [rev, setRev] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="Payments & receipts" subtitle="Every receipt ever issued. Receipts are never edited or deleted — mistakes are reversed." actions={<Button onClick={() => run(() => download(`${base}/export/payments.csv`, 'payments.csv', { ...f }))}>Export CSV</Button>} />
      <Card flush>
        <div className="card-b row wrap"><div className="grow"><Input placeholder="Search receipt, reference, student" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search payments" /></div>
          <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={MODES} placeholder="All modes" aria-label="Mode" /><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="From" /><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="To" /></div>
        <Async state={list} empty={<Empty icon="💳" title="No payments match" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) }, { label: 'Student', render: (p) => <>{p.student} <span className="muted small">{p.admissionNo}</span></> },
          { label: 'Amount', render: (p) => <b style={{ color: p.kind === 'reversal' ? 'var(--red)' : undefined }}>{p.kind === 'reversal' ? '−' : ''}{fmtMoney(p.amount)}</b> }, { label: 'Mode', render: (p) => label(p.mode) }, { label: 'Reference', key: 'reference' }, { label: 'By', key: 'receivedByName' },
          { label: 'Status', render: (p) => (p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : p.status === 'reversed' ? <Badge tone="red" >Reversed</Badge> : <Badge tone="green">Completed</Badge>) },
          ...(readOnly ? [] : [{ label: '', render: (p) => <div className="row"><Button size="sm" onClick={() => run(() => download(`${base}/payments/${p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`))}>Receipt</Button>{p.kind === 'payment' && p.status === 'completed' && <Button size="sm" variant="danger" onClick={() => setRev(p)}>Reverse</Button>}</div> }])]} />}</Async>
      </Card>
      {rev && <FormModal title={`Reverse receipt ${rev.receiptNo}`} submitLabel="Reverse payment" fields={[{ name: 'reason', label: 'Reason (required)', type: 'textarea', required: true }]} onClose={() => setRev(null)} onSubmit={async (v) => { await post(`${base}/payments/${rev._id}/reverse`, v); list.reload(); return true; }} />}
    </div>
  );
}

// ───────────── reports & defaulters ─────────────
export function FinanceReports({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const [tab, setTab] = useState('collection');
  const [range, setRange] = useState({ from: '', to: '' });
  const col = useApi(tab === 'collection' ? `${base}/reports/collection` : null, range);
  const classes = useApi(tab === 'classes' ? `${base}/reports/classes` : null);
  const defaulters = useApi(tab === 'defaulters' ? `${base}/students` : null, { status: 'overdue', limit: 200 });
  const [run, busy] = useAction();
  const nav = useNavigate();
  return (
    <div className="stack">
      <PageHeader title="Reports & defaulters" subtitle="Collection, outstanding fees by class, and students who are overdue" />
      <Tabs tabs={[['collection', 'Collection'], ['classes', 'Outstanding by class'], ['defaulters', 'Defaulters']]} value={tab} onChange={setTab} />
      {tab === 'collection' && <Async state={col}>{(c) => (<>
        <div className="row wrap"><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From" /><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To" /><Badge tone="green">Net collected {fmtMoney(c.total)}</Badge><span className="muted small">{fmtDate(c.from, true)} – {fmtDate(c.to, true)}</span></div>
        <div className="grid g-main"><Card title="By day"><BarsChart data={c.byDay} x="date" bars={[{ key: 'amount', name: 'Collected', color: '#16a34a' }]} /></Card><Card title="By payment mode" flush><DataTable rows={c.byMode} rowKey="mode" columns={[{ label: 'Mode', render: (m) => label(m.mode) }, { label: 'Receipts', key: 'count' }, { label: 'Amount', render: (m) => fmtMoney(m.amount) }]} /></Card></div></>)}</Async>}
      {tab === 'classes' && <Card flush><Async state={classes} empty={<Empty title="Nothing billed yet" />}>{(rows) => <DataTable rows={rows} rowKey="className" columns={[{ label: 'Class', render: (r) => <b>{r.className}</b> }, { label: 'Students', key: 'students' }, { label: 'Billed', render: (r) => fmtMoney(r.billed) }, { label: 'Collected', render: (r) => fmtMoney(r.collected) }, { label: 'Pending', render: (r) => fmtMoney(r.pending) }, { label: 'Overdue', render: (r) => (r.overdue ? <Badge tone="red">{fmtMoney(r.overdue)}</Badge> : '—') }]} />}</Async></Card>}
      {tab === 'defaulters' && (<>
        <div className="row wrap">{!readOnly && <ConfirmButton variant="primary" message="Send a fee reminder notification to every student with overdue fees? (Once per day per student.)" onConfirm={async () => { await run(() => post(`${base}/reminders`, {}), (r) => `${r.sent} reminder(s) sent (${r.matched} overdue)`); }}>Send reminders to all</ConfirmButton>}
          <Button loading={busy} onClick={() => run(() => download(`${base}/export/dues.csv`, 'dues.csv', { status: 'overdue' }))}>Export CSV</Button></div>
        <Card flush><Async state={defaulters} empty={<Empty icon="🎉" title="No overdue fees" />}>{(d) => <DataTable rows={d.items} rowKey="studentId" onRowClick={(s) => nav(`${path}/students/${s.studentId}`)} columns={[{ label: 'Student', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => `${s.className} ${s.section}` }, { label: 'Guardian', render: (s) => <>{s.guardian}<div className="small muted">{s.guardianPhone}</div></> }, { label: 'Overdue', render: (s) => <Badge tone="red">{fmtMoney(s.overdue)}</Badge> }, { label: 'Pending', render: (s) => fmtMoney(s.pending) }, { label: 'Next due', render: (s) => fmtDate(s.nextDue) }]} />}</Async></Card></>)}
    </div>
  );
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
