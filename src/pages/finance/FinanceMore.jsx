import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, Input, PageHeader, Select, Stat, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { ListCard, ListFooter } from '../../design/ui';

const ctxOf = (readOnly) => ({ base: readOnly ? '/api/school/finance' : '/api/finance' });
const today = () => new Date().toLocaleDateString('en-CA');
const tone = { pending: 'amber', approved: 'green', rejected: 'red' };

// ───────────── expenditure, with the approval column ─────────────
export function Expenses({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ status: 'all', department: '', page: 1 });
  const q = useApi(`${base}/expenses`, { status: f.status, department: f.department || undefined, page: f.page, limit: 25 });
  const [modal, setModal] = useState(null); const [run] = useAction();
  const fields = () => [{ name: 'date', label: 'Date', type: 'date', required: true, default: today() }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 1, step: 'any', required: true },
    { name: 'department', label: 'Department', required: true, list: 'expense-departments', hint: 'e.g. Science, Sports, Maintenance, Office' }, { name: 'work', label: 'Work or item', hint: 'Matches a budget line if you have one' },
    { name: 'title', label: 'What was it for?', required: true, full: true }, { name: 'vendor', label: 'Paid to (vendor)' }, { name: 'billNo', label: 'Bill or voucher no.' }, { name: 'notes', label: 'Notes', type: 'textarea', full: true }];
  return (
    <div className="stack">
      <PageHeader title="Expenditure" subtitle={readOnly ? 'What the school has spent. Finance records it and you approve it from Approvals.' : 'Record what the school spends. Each expense goes to the School Admin for approval, and counts against the budget once approved.'} actions={!readOnly && <Button variant="primary" onClick={() => setModal({})}>+ Add an expense</Button>} />
      <Async state={q}>{(d) => (<>
        <div className="grid g3"><Stat value={fmtMoney(d.totals.approved.amount)} label="Approved" sub={`${d.totals.approved.count} expense(s)`} tone="green" /><Stat value={fmtMoney(d.totals.pending.amount)} label="Waiting for approval" sub={`${d.totals.pending.count} expense(s)`} tone="amber" /><Stat value={fmtMoney(d.totals.rejected.amount)} label="Rejected" sub={`${d.totals.rejected.count} expense(s)`} /></div>
        <ListCard>
          <div className="row wrap" style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <Select aria-label="Approval status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['all', 'All'], ['pending', 'Waiting for approval'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([value, l]) => ({ value, label: l }))} />
            <Select aria-label="Department" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value, page: 1 })} placeholder="All departments" options={d.departments} />
          </div>
          <DataTable rows={d.items} empty="No expenses recorded yet" columns={[
            { label: 'Date', render: (e) => fmtDate(e.date) }, { label: 'Expense', render: (e) => <><b>{e.title}</b><div className="small muted">{e.department}{e.work ? ` · ${e.work}` : ''}{e.vendor ? ` · ${e.vendor}` : ''}{e.billNo ? ` · bill ${e.billNo}` : ''}</div></> },
            { label: 'Amount', render: (e) => <b>{fmtMoney(e.amount)}</b> },
            { label: 'Approval', render: (e) => <><Badge tone={tone[e.status]}>{e.status === 'pending' ? 'Waiting' : label(e.status)}</Badge>{e.decidedByName && <div className="small muted">{e.decidedByName}{e.decisionNote ? `: ${e.decisionNote}` : ''}</div>}</> },
            ...(readOnly ? [] : [{ label: '', render: (e) => e.status !== 'approved' && <div className="row"><Button size="sm" onClick={() => setModal(e)}>{e.status === 'rejected' ? 'Correct' : 'Edit'}</Button><ConfirmButton size="sm" variant="danger" message="Delete this expense?" onConfirm={async () => { await run(() => del(`${base}/expenses/${e._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton></div> }])]} />
          <ListFooter total={d.total} noun="expense" page={f.page} pageSize={25} onPage={(p) => setF({ ...f, page: p })} />
        </ListCard>
        <datalist id="expense-departments">{d.departments.map((x) => <option key={x} value={x} />)}</datalist>
        {modal && <FormModal wide title={modal._id ? 'Edit expense' : 'Add an expense'} fields={fields()} initial={modal} submitLabel={modal._id ? 'Save and send for approval' : 'Send for approval'} onClose={() => setModal(null)} onSubmit={async (v) => { if (modal._id) await patch(`${base}/expenses/${modal._id}`, v); else await post(`${base}/expenses`, v); q.reload(); return true; }} />}
      </>)}</Async>
    </div>
  );
}

// ───────────── budgets: allocated, used, remaining ─────────────
export function Budgets({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const q = useApi(`${base}/budgets`); const [modal, setModal] = useState(null); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Budgets" subtitle="Money set aside for each department and piece of work this year, what has been used (approved expenses only) and what is left" actions={!readOnly && <Button variant="primary" onClick={() => setModal({})}>+ Set a budget</Button>} />
      <Async state={q}>{(d) => (<>
        <div className="grid g4"><Stat value={fmtMoney(d.totals.allocated)} label="Allocated" /><Stat value={fmtMoney(d.totals.used)} label="Used" tone="blue" /><Stat value={fmtMoney(d.totals.pending)} label="Waiting for approval" tone="amber" /><Stat value={fmtMoney(d.totals.remaining)} label="Remaining" tone={d.totals.remaining < 0 ? 'red' : 'green'} /></div>
        <Card flush><DataTable rows={d.items} empty="No budgets set yet" columns={[
          { label: 'Department', render: (b) => <b>{b.department}</b> }, { label: 'Work', render: (b) => b.work || <span className="muted">Whole department</span> }, { label: 'Allocated', render: (b) => fmtMoney(b.allocated) },
          { label: 'Used', render: (b) => <>{fmtMoney(b.used)}{b.pending > 0 && <div className="small muted">+ {fmtMoney(b.pending)} waiting</div>}</> },
          { label: 'Remaining', render: (b) => <Badge tone={b.over ? 'red' : b.percentUsed > 85 ? 'amber' : 'green'}>{fmtMoney(b.remaining)}</Badge> },
          { label: 'Used %', render: (b) => <div style={{ minWidth: 110 }}><div className="progress"><i style={{ width: `${Math.min(100, b.percentUsed || 0)}%`, background: b.over ? 'rgb(var(--c-danger))' : undefined }} /></div><span className="small muted">{b.percentUsed ?? 0}%</span></div> },
          ...(readOnly ? [] : [{ label: '', render: (b) => <div className="row"><Button size="sm" onClick={() => setModal(b)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Delete this budget line? Expenses stay." onConfirm={async () => { await run(() => del(`${base}/budgets/${b._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton></div> }])]} /></Card>
        {d.unbudgeted.length > 0 && <Card title="Spending with no budget" flush><DataTable rows={d.unbudgeted} rowKey="department" columns={[{ label: 'Department', render: (b) => <b>{b.department}</b> }, { label: 'Used', render: (b) => fmtMoney(b.used) }, { label: 'Waiting', render: (b) => fmtMoney(b.pending) }]} /></Card>}
        {modal && <FormModal title={modal._id ? 'Edit budget' : 'Set a budget'} initial={modal} fields={[{ name: 'department', label: 'Department', required: true }, { name: 'work', label: 'Work (optional)', hint: 'Leave empty for the whole department' }, { name: 'allocated', label: 'Allocated (₹)', type: 'number', min: 0, step: 'any', required: true }, { name: 'notes', label: 'Notes', full: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { await put(`${base}/budgets`, v); q.reload(); return true; }} />}
      </>)}</Async>
    </div>
  );
}

// ───────────── GSTIN, PAN and bank details: Finance only ─────────────
const KEYS = [['gstin', 'GSTIN'], ['pan', 'PAN'], ['tan', 'TAN'], ['bankName', 'Bank'], ['accountName', 'Account name'], ['accountNo', 'Account number'], ['ifsc', 'IFSC'], ['branch', 'Branch'], ['upi', 'UPI id']];
export function TaxBankProfile() {
  const q = useApi('/api/finance/school-finance-profile'); const [run, busy] = useAction(); const [v, setV] = useState(null);
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <PageHeader title="Tax and bank details" subtitle="Only the Finance team can see and change these. Use them on invoices, receipts and PDFs." />
      <Async state={q}>{(d) => {
        const cur = v || Object.fromEntries(KEYS.map(([k]) => [k, d[k] || '']));
        return <Card action={<Button variant="primary" loading={busy} onClick={async () => { const r = await run(() => put('/api/finance/school-finance-profile', cur), 'Saved'); if (r) { setV(null); q.reload(); } }}>Save</Button>}>
          <div className="form-grid">{KEYS.map(([k, l]) => <Field key={k} label={l}><Input value={cur[k]} onChange={(e) => setV({ ...cur, [k]: e.target.value })} autoComplete="off" /></Field>)}</div>
          <p className="small muted" style={{ marginTop: 10 }}>GSTIN, PAN and IFSC are checked for the right format. Capital letters are applied for you.</p></Card>;
      }}</Async>
    </div>
  );
}
