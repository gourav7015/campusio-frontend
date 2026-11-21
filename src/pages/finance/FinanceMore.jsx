import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch, del, upload, openFile, download } from '../../api/client.js';
import { parseCsv, toCsvText, saveText } from '../../lib.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { ListCard, ListFooter } from '../../design/ui';

const ctxOf = (readOnly) => ({ base: readOnly ? '/api/school/finance' : '/api/finance' });
const today = () => new Date().toLocaleDateString('en-CA');
const tone = { pending: 'amber', approved: 'green', rejected: 'red' };

// ───────────── expenditure: bills attached, approval first, then payment ─────────────
const NATURE = [{ value: 'revenue', label: 'Revenue (running cost)' }, { value: 'capital', label: 'Capital (asset bought)' }];
const natureName = { revenue: 'Revenue', capital: 'Capital' };
const PAY_MODES = ['cash', 'upi', 'cheque', 'bank_transfer', 'card', 'other'].map((m) => ({ value: m, label: label(m) }));
const MAX_FILE = 10 * 1024 * 1024;
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`);
const payBadge = (e) => (e.status !== 'approved' ? <span className="muted">—</span> : e.paymentStatus === 'paid' ? <><Badge tone="green">Paid</Badge><div className="small muted">{fmtDate(e.paidOn, true)} · {label(e.paymentMode)}</div></> : <Badge tone="amber">To pay</Badge>);

export function Expenses({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ status: 'all', department: '', nature: '', page: 1 });
  const q = useApi(`${base}/expenses`, { status: f.status === 'topay' ? 'all' : f.status, payment: f.status === 'topay' ? 'unpaid' : undefined, department: f.department || undefined, nature: f.nature || undefined, page: f.page, limit: 25 });
  const vend = useApi(`${base}/vendors/approved`);
  const [modal, setModal] = useState(null); const [open, setOpen] = useState(null); const [run] = useAction();
  const fields = () => [{ name: 'date', label: 'Date', type: 'date', required: true, default: today() }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 1, step: 'any', required: true },
    { name: 'nature', label: 'Type of spending', type: 'select', options: NATURE, required: true, default: 'revenue', hint: 'Revenue: salaries, supplies, repairs. Capital: buildings, labs, vehicles and other assets.' },
    { name: 'department', label: 'Department', required: true, list: 'expense-departments', hint: 'e.g. Science, Sports, Maintenance, Office' }, { name: 'work', label: 'Work or item', hint: 'Matches a budget line if you have one' },
    { name: 'title', label: 'What was it for?', required: true, full: true },
    { name: 'vendorId', label: 'Paid to (approved vendor)', type: 'select', options: (vend.data || []).map((v) => ({ value: v._id, label: `${v.name} (${v.code})` })), keepEmpty: true, hint: 'Only vendors the School Admin has approved are listed. Add new ones on the Vendors page.' },
    { name: 'billNo', label: 'Bill or voucher no.' }, { name: 'notes', label: 'Notes', type: 'textarea', full: true }];
  return (
    <div className="stack">
      <PageHeader title="Expenditure" subtitle={readOnly ? 'What the school has spent. Finance records it with the bills attached and you approve it from Approvals. Money is paid only after your approval.' : 'Record what the school spends and attach the bills. Each expense goes to the School Admin for approval; once approved, record the payment here. Approved spending counts against the budget.'} actions={!readOnly && <Button variant="primary" onClick={() => setModal({})}>+ Add expense</Button>} />
      <Async state={q}>{(d) => (<>
        <div className="grid g4"><Stat value={fmtMoney(d.totals.approved.amount)} label="Approved" sub={`${d.totals.approved.count} expense(s)`} tone="green" /><Stat value={fmtMoney(d.totals.pending.amount)} label="Waiting for approval" sub={`${d.totals.pending.count} expense(s)`} tone="amber" /><Stat value={fmtMoney(d.totals.toPay.amount)} label="Approved, to be paid" sub={`${d.totals.toPay.count} expense(s)`} tone="blue" /><Stat value={fmtMoney(d.totals.rejected.amount)} label="Rejected" sub={`${d.totals.rejected.count} expense(s)`} tone="red" /></div>
        <ListCard>
          <div className="row wrap" style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <Select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['all', 'All'], ['pending', 'Waiting for approval'], ['approved', 'Approved'], ['topay', 'Approved, to be paid'], ['rejected', 'Rejected']].map(([value, l]) => ({ value, label: l }))} />
            <Select aria-label="Department" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value, page: 1 })} placeholder="All departments" options={d.departments} />
            <Select aria-label="Type of spending" value={f.nature} onChange={(e) => setF({ ...f, nature: e.target.value, page: 1 })} placeholder="Revenue and capital" options={NATURE.map((n) => ({ value: n.value, label: natureName[n.value] }))} />
          </div>
          <DataTable rows={d.items} empty="No expenses recorded yet" onRowClick={(e) => setOpen(e)} columns={[
            { label: 'Date', render: (e) => fmtDate(e.date) }, { label: 'Expense', render: (e) => <><b>{e.title}</b> <Badge tone={e.nature === 'capital' ? 'blue' : ''}>{natureName[e.nature || 'revenue']}</Badge><div className="small muted">{e.department}{e.work ? ` · ${e.work}` : ''}{e.vendor ? ` · ${e.vendor}` : ''}{e.billNo ? ` · bill ${e.billNo}` : ''}{e.attachments?.length ? ` · ${e.attachments.length} file${e.attachments.length > 1 ? 's' : ''}` : ''}</div></> },
            { label: 'Amount', render: (e) => <b>{fmtMoney(e.amount)}</b> },
            { label: 'Approval', render: (e) => <><Badge tone={tone[e.status]}>{e.status === 'pending' ? 'Waiting' : label(e.status)}</Badge>{e.decidedByName && <div className="small muted">{e.decidedByName}{e.decisionNote ? `: ${e.decisionNote}` : ''}</div>}</> },
            { label: 'Payment', render: payBadge },
            { label: '', render: (e) => <div className="row"><Button size="sm" onClick={(ev) => { ev.stopPropagation(); setOpen(e); }}>{!readOnly && e.status === 'approved' && e.paymentStatus !== 'paid' ? 'Pay' : 'Open'}</Button>
              {!readOnly && e.status !== 'approved' && <><Button size="sm" onClick={(ev) => { ev.stopPropagation(); setModal(e); }}>{e.status === 'rejected' ? 'Correct' : 'Edit'}</Button><span onClick={(ev) => ev.stopPropagation()}><ConfirmButton size="sm" variant="danger" message="Delete this expense and its files?" onConfirm={async () => { await run(() => del(`${base}/expenses/${e._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton></span></>}</div> },
          ]} />
          <ListFooter total={d.total} noun="expense" page={f.page} pageSize={25} onPage={(p) => setF({ ...f, page: p })} />
        </ListCard>
        <datalist id="expense-departments">{d.departments.map((x) => <option key={x} value={x} />)}</datalist>
        {modal && <FormModal wide title={modal._id ? 'Edit expense' : 'Add an expense'} fields={fields()} initial={modal} submitLabel={modal._id ? 'Save and send for approval' : 'Save and add bills'} onClose={() => setModal(null)}
          onSubmit={async (v) => { const body = { ...v, vendorId: v.vendorId || null }; const saved = modal._id ? await patch(`${base}/expenses/${modal._id}`, body) : await post(`${base}/expenses`, body); q.reload(); if (!modal._id) setOpen(saved); return saved; }} />}
        {open && <ExpenseDetail key={open._id} base={base} readOnly={readOnly} expense={open} onClose={() => { setOpen(null); q.reload(); }} onChanged={(e) => { setOpen(e); q.reload(); }} />}
      </>)}</Async>
    </div>
  );
}

/** One expense: its details, the bills attached to it (these go to the approver), the approval, and the payment once approved. */
function ExpenseDetail({ base, readOnly, expense: e, onClose, onChanged }) {
  const [run, busy] = useAction();
  const [pay, setPay] = useState({ mode: 'bank_transfer', reference: '', paidOn: today(), note: '' });
  const add = async (file) => {
    if (!file) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return run(async () => { throw new Error('Upload a PDF, PNG or JPG'); });
    if (file.size > MAX_FILE) return run(async () => { throw new Error('The file is larger than 10 MB'); });
    const form = new FormData(); form.append('file', file);
    const r = await run(() => upload(`${base}/expenses/${e._id}/attachments`, form, 'POST'), 'File attached');
    if (r) onChanged(r);
  };
  const facts = [['Date', fmtDate(e.date)], ['Amount', fmtMoney(e.amount)], ['Type', natureName[e.nature || 'revenue']], ['Department', e.department], ['Work or item', e.work], ['Vendor', e.vendor], ['Bill or voucher no.', e.billNo], ['Recorded by', e.submittedByName]].filter(([, v]) => v);
  const canEditFiles = !readOnly && e.status !== 'approved';
  return (
    <Modal wide title={e.title} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <div className="stack">
        <dl className="kv">{facts.map(([k, v]) => <><dt key={`k${k}`}>{k}</dt><dd key={`v${k}`}>{v}</dd></>)}</dl>
        {e.notes && <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.notes}</p>}
        <div className="row wrap"><span className="bold small">Approval</span><Badge tone={tone[e.status]}>{e.status === 'pending' ? 'Waiting for the School Admin' : label(e.status)}</Badge>{e.decidedByName && <span className="small muted">{e.decidedByName}{e.decisionNote ? `: ${e.decisionNote}` : ''}</span>}</div>
        <div>
          <div className="bold small" style={{ marginBottom: 6 }}>Bills and attachments {e.status === 'pending' && <span className="muted">(the School Admin sees these when deciding)</span>}</div>
          {e.attachments?.length ? <ul className="timeline">{e.attachments.map((a) => <li key={a.fileId}><span className="dotc" /><div className="grow">{a.name}<div className="small muted">{kb(a.size)}</div></div>
            <div className="row"><Button size="sm" onClick={() => run(async () => { await openFile(a.fileId); return true; })} aria-label={`View ${a.name}`}>View</Button>
              {canEditFiles && <ConfirmButton size="sm" variant="danger" message="Remove this file?" onConfirm={async () => { const r = await run(() => del(`${base}/expenses/${e._id}/attachments/${a.fileId}`), 'Removed'); if (r) onChanged(r); }}>Remove</ConfirmButton>}</div></li>)}</ul>
            : <p className="small muted" style={{ margin: 0 }}>No bill attached yet.{!readOnly && ' Attach the bill, quote or approval letter so the School Admin can see what is being paid for.'}</p>}
          {!readOnly && e.attachments?.length < 8 && <label className="btn" style={{ marginTop: 8, display: 'inline-block', cursor: 'pointer' }}>+ Attach a file (PDF, PNG or JPG, up to 10 MB)
            <input type="file" accept="application/pdf,image/png,image/jpeg" hidden aria-label="Attach a file" onChange={(ev) => { add(ev.target.files?.[0]); ev.target.value = ''; }} /></label>}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div className="bold small" style={{ marginBottom: 6 }}>Payment</div>
          {e.status === 'pending' && <p className="small muted" style={{ margin: 0 }}>Money can be paid only after the School Admin approves this expense.</p>}
          {e.status === 'rejected' && <p className="small muted" style={{ margin: 0 }}>This expense was rejected, so it cannot be paid. Correct it and send it again.</p>}
          {e.status === 'approved' && e.paymentStatus === 'paid' && <p style={{ margin: 0 }}><Badge tone="green">Paid</Badge> on {fmtDate(e.paidOn, true)} by {label(e.paymentMode)}{e.paymentRef ? ` · ref ${e.paymentRef}` : ''} · recorded by {e.paidByName}{e.paymentNote ? ` · ${e.paymentNote}` : ''}</p>}
          {e.status === 'approved' && e.paymentStatus !== 'paid' && (readOnly ? <p className="small muted" style={{ margin: 0 }}>Approved. Finance will record the payment.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              <div className="form-grid">
                <Field label="Paid by"><Select aria-label="Payment mode" value={pay.mode} onChange={(ev) => setPay({ ...pay, mode: ev.target.value })} options={PAY_MODES} /></Field>
                <Field label="Reference (UTR / cheque no.)"><Input value={pay.reference} onChange={(ev) => setPay({ ...pay, reference: ev.target.value })} /></Field>
                <Field label="Date paid"><Input type="date" max={today()} value={pay.paidOn} onChange={(ev) => setPay({ ...pay, paidOn: ev.target.value })} /></Field>
              </div>
              <div><Button variant="primary" loading={busy} disabled={!pay.paidOn} onClick={async () => { const r = await run(() => post(`${base}/expenses/${e._id}/pay`, { mode: pay.mode, paidOn: pay.paidOn, ...(pay.reference ? { reference: pay.reference } : {}) }), 'Payment recorded'); if (r) onChanged(r); }}>Record payment of {fmtMoney(e.amount)}</Button></div>
            </div>))}
        </div>
      </div>
    </Modal>
  );
}

// ───────────── vendors: Finance keeps the list, the School Admin approves ─────────────
const VTONE = { pending: 'amber', approved: 'green', rejected: 'red', inactive: '' };
const HEAD = { 'vendor name': 'name', name: 'name', category: 'category', 'contact person': 'contactPerson', contactperson: 'contactPerson', phone: 'phone', mobile: 'phone', email: 'email', address: 'address', city: 'city', state: 'state', pincode: 'pincode', pin: 'pincode', gstin: 'gstin', gst: 'gstin', pan: 'pan', bank: 'bankName', 'bank name': 'bankName', bankname: 'bankName', 'account name': 'accountName', accountname: 'accountName', 'account number': 'accountNo', 'account no': 'accountNo', accountno: 'accountNo', ifsc: 'ifsc', upi: 'upi', 'payment terms': 'paymentTerms', paymentterms: 'paymentTerms', notes: 'notes' };

export function Vendors({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ status: 'all', q: '', page: 1 });
  const q = useApi(`${base}/vendors`, { status: f.status, q: f.q || undefined, page: f.page, limit: 25 });
  const [modal, setModal] = useState(null); const [bulk, setBulk] = useState(false); const [run] = useAction();
  const fields = (edit) => [
    { name: 'name', label: 'Vendor name', required: true, full: true }, { name: 'category', label: 'Category', list: 'vendor-categories', hint: 'e.g. Stationery, Furniture, Transport, Printing' }, { name: 'contactPerson', label: 'Contact person' },
    { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'address', label: 'Address', full: true }, { name: 'city', label: 'City' }, { name: 'state', label: 'State' }, { name: 'pincode', label: 'Pincode' },
    { name: 'gstin', label: 'GSTIN', hint: 'Checked for the right format' }, { name: 'pan', label: 'PAN' }, { name: 'bankName', label: 'Bank' }, { name: 'accountName', label: 'Account name' }, { name: 'accountNo', label: 'Account number' }, { name: 'ifsc', label: 'IFSC' }, { name: 'upi', label: 'UPI id' },
    { name: 'paymentTerms', label: 'Payment terms', hint: 'e.g. 30 days from the bill' }, { name: 'notes', label: 'Notes', type: 'textarea', full: true },
  ].map((x) => ({ ...x, keepEmpty: edit && !x.required }));
  return (
    <div className="stack">
      <PageHeader title="Vendors" subtitle={readOnly ? 'The people and firms the school pays. Finance keeps this list and you approve each vendor from Approvals; an expense can only name an approved vendor.' : 'The people and firms the school pays. Each new vendor goes to the School Admin for approval, and only approved vendors can be chosen on an expense. Changing a vendor\'s name, tax number or bank account sends it for approval again.'}
        actions={<div className="row"><Button onClick={() => run(() => download(`${base}/vendors/export.csv`, 'vendors.csv'))}>Download list</Button>{!readOnly && <><Button onClick={() => setBulk(true)}>Import from spreadsheet</Button><Button variant="primary" onClick={() => setModal({})}>+ Add vendor</Button></>}</div>} />
      <Async state={q}>{(d) => (<>
        <div className="grid g4"><Stat value={d.counts.all} label="Vendors" /><Stat value={d.counts.approved} label="Approved" tone="green" /><Stat value={d.counts.pending} label="Waiting for approval" tone="amber" /><Stat value={d.counts.inactive + d.counts.rejected} label="Switched off or rejected" /></div>
        <ListCard>
          <div className="row wrap" style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <Input aria-label="Search vendors" placeholder="Search by name, code, GSTIN, PAN or phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} style={{ minWidth: 260 }} />
            <Select aria-label="Approval status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['all', 'All vendors'], ['pending', 'Waiting for approval'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['inactive', 'Switched off']].map(([value, l]) => ({ value, label: l }))} />
          </div>
          <DataTable rows={d.items} empty="No vendors yet" columns={[
            { label: 'Code', render: (v) => <b>{v.code}</b> },
            { label: 'Vendor', render: (v) => <><b>{v.name}</b><div className="small muted">{v.category || 'No category'}{v.city ? ` · ${v.city}` : ''}</div></> },
            { label: 'Contact', render: (v) => <>{v.contactPerson || '—'}<div className="small muted">{[v.phone, v.email].filter(Boolean).join(' · ')}</div></> },
            { label: 'GSTIN / PAN', render: (v) => <><span className="small">{v.gstin || '—'}</span><div className="small muted">{v.pan || ''}</div></> },
            { label: 'Bank', render: (v) => (v.bankName || v.accountNo ? <>{v.bankName}<div className="small muted">{v.accountNo ? `••••${String(v.accountNo).slice(-4)}` : ''}{v.ifsc ? ` · ${v.ifsc}` : ''}</div></> : <span className="muted">—</span>) },
            { label: 'Paid so far', render: (v) => (v.expenses ? <>{fmtMoney(v.spent)}<div className="small muted">{v.expenses} expense(s)</div></> : <span className="muted">—</span>) },
            { label: 'Approval', render: (v) => <><Badge tone={VTONE[v.status]}>{v.status === 'pending' ? 'Waiting' : v.status === 'inactive' ? 'Switched off' : label(v.status)}</Badge>{v.decidedByName && <div className="small muted">{v.decidedByName}{v.decisionNote ? `: ${v.decisionNote}` : ''}</div>}</> },
            ...(readOnly ? [] : [{ label: '', render: (v) => <div className="row"><Button size="sm" onClick={() => setModal(v)}>{v.status === 'rejected' ? 'Correct' : 'Edit'}</Button>
              {v.status === 'approved' && <Button size="sm" onClick={async () => { await run(() => post(`${base}/vendors/${v._id}/active`, { active: false }), 'Switched off'); q.reload(); }}>Switch off</Button>}
              {v.status === 'inactive' && <Button size="sm" onClick={async () => { await run(() => post(`${base}/vendors/${v._id}/active`, { active: true }), 'Switched on'); q.reload(); }}>Switch on</Button>}
              {!v.expenses && <ConfirmButton size="sm" variant="danger" message="Delete this vendor?" onConfirm={async () => { await run(() => del(`${base}/vendors/${v._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton>}</div> }]),
          ]} />
          <ListFooter total={d.total} noun="vendor" page={f.page} pageSize={25} onPage={(p) => setF({ ...f, page: p })} />
        </ListCard>
        <datalist id="vendor-categories">{d.categories.map((x) => <option key={x} value={x} />)}</datalist>
        {modal && <FormModal wide title={modal._id ? `Edit ${modal.name}` : 'Add a vendor'} fields={fields(!!modal._id)} initial={modal} submitLabel={modal._id && modal.status === 'approved' ? 'Save' : 'Save and send for approval'} onClose={() => setModal(null)}
          onSubmit={async (v) => { const r = modal._id ? await patch(`${base}/vendors/${modal._id}`, v) : await post(`${base}/vendors`, v); q.reload(); return r; }} />}
        {bulk && <VendorImport base={base} onClose={() => setBulk(false)} onDone={() => q.reload()} />}
      </>)}</Async>
    </div>
  );
}

/** Many vendors from one spreadsheet (saved as CSV): good rows are added for approval, bad rows are listed with the reason. */
function VendorImport({ base, onClose, onDone }) {
  const [rows, setRows] = useState(null); const [name, setName] = useState(''); const [out, setOut] = useState(null); const [run, busy] = useAction();
  const read = async (file) => {
    if (!file) return;
    const parsed = parseCsv(await file.text()).map((r) => { const o = {}; for (const [h, v] of Object.entries(r)) { const k = HEAD[h.toLowerCase().trim()]; if (k && v !== '') o[k] = v; } return o; }).filter((r) => Object.keys(r).length);
    setName(file.name); setRows(parsed); setOut(null);
  };
  const submit = async () => { const r = await run(() => post(`${base}/vendors/import`, { rows }), (x) => `${x.created} vendor(s) added`); if (r) { setOut(r); onDone(); } };
  return (
    <Modal wide title="Import vendors from a spreadsheet" onClose={onClose} footer={<><Button onClick={onClose}>{out ? 'Close' : 'Cancel'}</Button>{!out && <Button variant="primary" loading={busy} disabled={!rows?.length} onClick={submit}>Add {rows?.length || 0} vendor(s)</Button>}</>}>
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>Save your spreadsheet as <b>CSV</b>. The first row holds the column names: <b>name</b> (required), category, contact person, phone, email, address, city, state, pincode, gstin, pan, bank name, account name, account number, ifsc, upi, payment terms, notes. Up to 2,000 vendors at a time. All of them go to the School Admin for approval.</p>
        <div className="row"><Button size="sm" onClick={() => saveText('vendors-template.csv', toCsvText([{ name: 'Example Stationers', category: 'Stationery', 'contact person': 'Ravi Shah', phone: '9876543210' }], ['name', 'category', 'contact person', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'gstin', 'pan', 'bank name', 'account name', 'account number', 'ifsc', 'upi', 'payment terms', 'notes']))}>Download a blank template</Button></div>
        <input type="file" accept=".csv,text/csv" aria-label="Choose the CSV file" onChange={(e) => read(e.target.files?.[0])} />
        {rows && !out && <p className="small" style={{ margin: 0 }}>{name}: {rows.length} row(s) found.{!rows.length && ' No rows with a vendor name were found. Check the column names in the first row.'}</p>}
        {out && <div className="stack" style={{ gap: 8 }}><div className="alert ok">{out.created} vendor(s) added and waiting for approval{out.skipped ? `, ${out.skipped} skipped` : ''}.</div>
          {out.errors.length > 0 && <DataTable rows={out.errors} rowKey="row" columns={[{ label: 'Row', key: 'row' }, { label: 'Vendor', key: 'name' }, { label: 'Problem', key: 'error' }]} />}</div>}
      </div>
    </Modal>
  );
}

// ───────────── budgets: revenue and capital, allocated, used, remaining ─────────────
export function Budgets({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const q = useApi(`${base}/budgets`); const [modal, setModal] = useState(null); const [kind, setKind] = useState('all'); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Budgets" subtitle="Money set aside for each department and piece of work this year: a revenue budget for running costs and a capital budget for assets. Shows what has been used (approved expenses only) and what is left." actions={!readOnly && <Button variant="primary" onClick={() => setModal({ kind: kind === 'capital' ? 'capital' : 'revenue' })}>+ Set a budget</Button>} />
      <Async state={q}>{(d) => {
        const t = kind === 'all' ? d.totals : d.byKind[kind]; const items = d.items.filter((b) => kind === 'all' || b.kind === kind);
        return (<>
          <Tabs tabs={[['all', 'All'], ['revenue', 'Revenue budget'], ['capital', 'Capital budget']]} value={kind} onChange={setKind} />
          <div className="grid g4"><Stat value={fmtMoney(t.allocated)} label="Allocated" /><Stat value={fmtMoney(t.used)} label="Used" tone="blue" /><Stat value={fmtMoney(t.pending)} label="Waiting for approval" tone="amber" /><Stat value={fmtMoney(t.remaining)} label="Remaining" tone={t.remaining < 0 ? 'red' : 'green'} /></div>
          <Card flush><DataTable rows={items} empty="No budgets set yet" columns={[
            { label: 'Type', render: (b) => <Badge tone={b.kind === 'capital' ? 'blue' : ''}>{natureName[b.kind]}</Badge> },
            { label: 'Department', render: (b) => <b>{b.department}</b> }, { label: 'Work', render: (b) => b.work || <span className="muted">Whole department</span> }, { label: 'Allocated', render: (b) => fmtMoney(b.allocated) },
            { label: 'Used', render: (b) => <>{fmtMoney(b.used)}{b.pending > 0 && <div className="small muted">+ {fmtMoney(b.pending)} waiting</div>}</> },
            { label: 'Remaining', render: (b) => <Badge tone={b.over ? 'red' : b.percentUsed > 85 ? 'amber' : 'green'}>{fmtMoney(b.remaining)}</Badge> },
            { label: 'Used %', render: (b) => <div style={{ minWidth: 110 }}><div className="progress"><i style={{ width: `${Math.min(100, b.percentUsed || 0)}%`, background: b.over ? 'rgb(var(--c-danger))' : undefined }} /></div><span className="small muted">{b.percentUsed ?? 0}%</span></div> },
            ...(readOnly ? [] : [{ label: '', render: (b) => <div className="row"><Button size="sm" onClick={() => setModal(b)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Delete this budget line? Expenses stay." onConfirm={async () => { await run(() => del(`${base}/budgets/${b._id}`), 'Deleted'); q.reload(); }}>Delete</ConfirmButton></div> }]),
          ]} /></Card>
          {d.unbudgeted.filter((b) => kind === 'all' || b.kind === kind).length > 0 && <Card title="Spending with no budget" flush><DataTable rows={d.unbudgeted.filter((b) => kind === 'all' || b.kind === kind)} rowKey="department" columns={[{ label: 'Type', render: (b) => natureName[b.kind] }, { label: 'Department', render: (b) => <b>{b.department}</b> }, { label: 'Used', render: (b) => fmtMoney(b.used) }, { label: 'Waiting', render: (b) => fmtMoney(b.pending) }]} /></Card>}
          {modal && <FormModal title={modal._id ? 'Edit budget' : 'Set a budget'} initial={modal} fields={[{ name: 'kind', label: 'Budget type', type: 'select', required: true, default: 'revenue', options: NATURE, hint: 'Revenue: running costs. Capital: assets such as buildings, labs and vehicles.' }, { name: 'department', label: 'Department', required: true }, { name: 'work', label: 'Work (optional)', hint: 'Leave empty for the whole department' }, { name: 'allocated', label: 'Allocated (₹)', type: 'number', min: 0, step: 'any', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', full: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { const r = await put(`${base}/budgets`, v); q.reload(); return r; }} />}
        </>);
      }}</Async>
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
