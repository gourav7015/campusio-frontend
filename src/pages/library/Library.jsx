import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { post, patch, put } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, PageHeader, Select, Tabs, useAction, useDebounced, fmtDate, fmtMoney, label, statusTone } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import BookGrid from '../../components/BookGrid';
import { FilterBar, ListCard, ListFooter, Segmented } from '../../design/ui';
import ClassBorrowers from '../../components/ClassBorrowers.jsx';
import { useDialogs } from '../../design/ui';

const loanTone = (s) => ({ issued: 'blue', returned: 'green', lost: 'red' }[s] || '');
const ctxOf = (readOnly) => ({ base: readOnly ? '/api/school/library' : '/api/library', path: readOnly ? '/admin/library' : '/library' });

export { default as LibraryDashboard } from './LibraryDashboard';

// ───────────── circulation desk ─────────────
export function Desk() {
  const [mode, setMode] = useState('issue');
  return (
    <div className="stack">
      <PageHeader title="Issue & return desk" subtitle="Scan or type the accession number printed on the book" />
      <Tabs tabs={[['issue', 'Issue a book'], ['return', 'Return a book']]} value={mode} onChange={setMode} />
      {mode === 'issue' ? <IssueDesk /> : <ReturnDesk />}
    </div>
  );
}

function IssueDesk() {
  const [type, setType] = useState('student'); const [q, setQ] = useState(''); const [picked, setPicked] = useState(null); const [acc, setAcc] = useState(''); const [out, setOut] = useState(null);
  const dq = useDebounced(q);
  const people = useApi(dq.length >= 1 && !picked ? '/api/library/borrowers' : null, { type, q: dq });
  const [run, busy] = useAction();
  const submit = async () => {
    const r = await run(() => post('/api/library/issue', { accessionNo: acc.trim(), borrowerType: picked.type, borrowerId: picked.id }), (x) => `Issued "${x.book.title}" to ${x.borrower.name}`);
    if (r) { setOut(r); setAcc(''); people.reload(); setPicked({ ...picked, openLoans: picked.openLoans + 1 }); }
  };
  return (
    <div className="grid g2">
      <Card title="1. Who is borrowing?">
        <div className="stack">
          <div className="row"><Select value={type} onChange={(e) => { setType(e.target.value); setPicked(null); setQ(''); }} options={[{ value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }]} aria-label="Borrower type" />
            <div className="grow"><Input autoFocus placeholder={type === 'student' ? 'Name or admission number' : 'Name or employee id'} value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} aria-label="Find borrower" /></div></div>
          {!picked && <Async state={people}>{(rows) => rows.length ? <div className="stack-sm">{rows.map((p) => (
            <button key={p.id} className="period" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => { setPicked(p); setOut(null); }}><div className="grow"><b>{p.name}</b> <span className="muted">{p.code} · {p.detail}</span></div>
              <span>{p.openLoans}/{p.limit} books</span>{p.overdue > 0 && <Badge tone="red">{p.overdue} overdue</Badge>}{p.unpaidFine > 0 && <Badge tone="amber">Fine ₹{p.unpaidFine}</Badge>}</button>))}</div> : <Empty title="No match" />}</Async>}
          {picked && <div className="alert ok"><b>{picked.name}</b> ({picked.code}) · {picked.openLoans}/{picked.limit} books out {picked.overdue > 0 && '· has an overdue book'} {picked.unpaidFine > 0 && `· unpaid fine ₹${picked.unpaidFine}`} <Button size="sm" onClick={() => setPicked(null)}>Change</Button></div>}
        </div>
      </Card>
      <Card title="2. Which book?">
        <div className="stack">
          <Field label="Accession number"><Input placeholder="e.g. LB00012" value={acc} disabled={!picked} onChange={(e) => setAcc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && picked && acc && submit()} /></Field>
          <Button variant="primary" loading={busy} disabled={!picked || !acc.trim()} onClick={submit}>Issue book</Button>
          {out && <div className="alert ok">Issued <b>{out.book.title}</b> to {out.borrower.name}. Due back <b>{fmtDate(out.issue.dueDate, true)}</b>.</div>}
        </div>
      </Card>
    </div>
  );
}

function ReturnDesk() {
  const [acc, setAcc] = useState(''); const [cond, setCond] = useState('good'); const [damage, setDamage] = useState(''); const [waive, setWaive] = useState(false); const [why, setWhy] = useState(''); const [out, setOut] = useState(null);
  const loan = useApi(acc.trim().length >= 3 ? '/api/library/loans' : null, { q: acc.trim(), status: 'issued' });
  const current = (loan.data?.items || []).find((l) => l.accessionNo?.toLowerCase() === acc.trim().toLowerCase());
  const [run, busy] = useAction();
  const submit = async () => {
    const body = { accessionNo: acc.trim(), condition: cond, ...(cond === 'damaged' && damage ? { damageFine: Number(damage) } : {}), ...(waive ? { waiveFine: true, waiveReason: why } : {}) };
    const r = await run(() => post('/api/library/return', body)); if (r) { setOut(r); setAcc(''); setCond('good'); setDamage(''); setWaive(false); setWhy(''); }
  };
  return (
    <div className="grid g2">
      <Card title="Return">
        <div className="stack">
          <Field label="Accession number"><Input autoFocus placeholder="e.g. LB00012" value={acc} onChange={(e) => { setAcc(e.target.value); setOut(null); }} /></Field>
          {current && <div className="alert info"><b>{current.book}</b> — {current.borrower}<br />Due {fmtDate(current.dueDate, true)}{current.overdue ? ` · ${current.daysLate} day(s) late, fine so far ${fmtMoney(current.fineSoFar)}` : ' · on time'}</div>}
          {!current && acc.trim().length >= 3 && !loan.loading && <div className="small muted">That copy is not currently on loan.</div>}
          <Field label="Condition"><Select value={cond} onChange={(e) => setCond(e.target.value)} options={[{ value: 'good', label: 'Good' }, { value: 'damaged', label: 'Damaged' }, { value: 'lost', label: 'Lost (charged at the book price)' }]} /></Field>
          {cond === 'damaged' && <Field label="Damage fine (₹)"><Input type="number" min="0" value={damage} onChange={(e) => setDamage(e.target.value)} /></Field>}
          <label className="row"><input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} /> Waive any fine</label>
          {waive && <Field label="Reason (required)"><Input value={why} onChange={(e) => setWhy(e.target.value)} /></Field>}
          <Button variant="primary" loading={busy} disabled={!acc.trim() || (waive && why.trim().length < 3)} onClick={submit}>Return book</Button>
        </div>
      </Card>
      <Card title="Result">
        {out ? <div className="stack-sm"><div className="alert ok"><b>{out.book?.title}</b> returned{out.issue.status === 'lost' ? ' as LOST' : ''}.</div>
          {out.fine.amount > 0 ? <div className={out.fine.waived ? 'alert info' : 'alert'}>Fine {fmtMoney(out.fine.amount)}{out.fine.lateDays ? ` · ${out.fine.lateDays} day(s) late = ${fmtMoney(out.fine.lateFine)}` : ''}{out.fine.damage ? ` · damage ${fmtMoney(out.fine.damage)}` : ''}{out.fine.lost ? ` · lost ${fmtMoney(out.fine.lost)}` : ''}
            <br />{out.fine.waived ? 'Waived.' : out.fine.charged ? 'Added to the student\'s fees — payable at the Finance desk.' : 'Recorded (teachers have no fee account).'}</div> : <div className="alert ok">No fine.</div>}</div>
          : <Empty title="Scan a returned book" />}
      </Card>
    </div>
  );
}

// ───────────── catalogue ─────────────
export function Books({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', category: '', availability: 'all', page: 1 });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/books`, { ...f, q: dq });
  const [modal, setModal] = useState(false);
  const [created, setCreated] = useState(null);
  const [view, setView] = useState('grid');
  return (
    <div className="stack">
      <PageHeader title="Catalogue" subtitle="Every title with its numbered copies" actions={!readOnly && <Button variant="primary" onClick={() => setModal(true)}>+ Add book</Button>} />
      {created && <div className="alert ok">Added. Accession numbers: <b>{created.join(', ')}</b> — write these on the copies. <Button size="sm" onClick={() => setCreated(null)}>Dismiss</Button></div>}
      <ListCard>
        <FilterBar search={f.q} onSearch={(v) => setF({ ...f, q: v, page: 1 })} searchLabel="Search books" placeholder="Search title, author, ISBN">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })} options={(list.data?.categories || []).map((c) => ({ value: c, label: c }))} placeholder="All categories" aria-label="Category" />
          <Select value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value, page: 1 })} options={[{ value: 'all', label: 'All' }, { value: 'available', label: 'Available now' }]} aria-label="Availability" />
          <Segmented label="View" value={view} onChange={setView} options={[{ value: 'grid', label: 'Covers' }, { value: 'table', label: 'Table' }]} /></FilterBar>
        <Async state={list}>{(d) => (<>{view === 'grid' ? <BookGrid items={d.items} onOpen={(b) => nav(`${path}/books/${b._id}`)} /> : <DataTable rows={d.items} empty="No books yet" onRowClick={(b) => nav(`${path}/books/${b._id}`)} columns={[{ label: 'Title', render: (b) => <><b>{b.title}</b><div className="small muted">{b.author}</div></> }, { label: 'Category', key: 'category' }, { label: 'ISBN', key: 'isbn' }, { label: 'Shelf', key: 'shelf' }, { label: 'Copies', render: (b) => `${b.available} available / ${b.total}` }, { label: 'On loan', key: 'issued' }, { label: 'Price', render: (b) => fmtMoney(b.price) }]} />}
          <ListFooter total={d.total} noun="title" page={f.page} pageSize={d.limit || 25} onPage={(p) => setF({ ...f, page: p })} /></>)}</Async>
      </ListCard>
      {modal && <FormModal wide title="Add a book" fields={[{ name: 'title', label: 'Title', required: true, full: true }, { name: 'author', label: 'Author' }, { name: 'isbn', label: 'ISBN' }, { name: 'category', label: 'Category', placeholder: 'Fiction, Science, Reference…' }, { name: 'publisher', label: 'Publisher' }, { name: 'edition', label: 'Edition' }, { name: 'language', label: 'Language' }, { name: 'shelf', label: 'Shelf / location' }, { name: 'price', label: 'Price (₹) — charged if lost', type: 'number', min: 0, default: 0, keepEmpty: true }, { name: 'copies', label: 'Number of copies', type: 'number', min: 1, default: 1, required: true }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { const r = await post(`${base}/books`, v); setCreated(r.accessionNos); list.reload(); return true; }} />}
    </div>
  );
}

export function BookDetail({ readOnly }) {
  const dlg = useDialogs();
  const { base } = ctxOf(readOnly);
  const { id } = useParams();
  const b = useApi(`${base}/books/${id}`);
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  return (
    <Async state={b}>{(x) => (
      <div className="stack">
        <PageHeader title={x.title} subtitle={[x.author, x.category, x.isbn && `ISBN ${x.isbn}`, x.shelf && `Shelf ${x.shelf}`].filter(Boolean).join(' · ')} actions={<><Link className="btn" to={readOnly ? '/admin/library?tab=books' : '/library/books'}>← Catalogue</Link>{!readOnly && <><Button onClick={() => setModal('edit')}>Edit</Button><Button variant="primary" onClick={() => setModal('copies')}>+ Add copies</Button></>}</>} />
        <Card title={`Copies (${x.copies.length})`} flush><DataTable rows={x.copies} empty="No copies" columns={[{ label: 'Accession no', render: (c) => <b>{c.accessionNo}</b> }, { label: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{label(c.status)}</Badge> }, { label: 'Borrowed by', render: (c) => (c.loan ? `${c.loan.borrower} · due ${fmtDate(c.loan.dueDate)}` : '—') }, { label: 'Notes', key: 'notes' },
          ...(readOnly ? [] : [{ label: '', render: (c) => c.status !== 'issued' && <select aria-label={`Status of ${c.accessionNo}`} value={c.status} style={{ width: 130 }} onChange={async (e) => { const status = e.target.value; const notes = status === 'available' ? undefined : await dlg.prompt('Note (optional)', { required: true }) || undefined; await run(() => patch(`${base}/copies/${c._id}`, { status, notes }), 'Updated'); b.reload(); }}>{['available', 'damaged', 'lost', 'withdrawn'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select> }])]} /></Card>
        <Card title="Borrowing history" flush><DataTable rows={x.history} rowKey="_id" empty="Never borrowed" columns={[{ label: 'Borrower', key: 'borrower' }, { label: 'Issued', render: (h) => fmtDate(h.issuedOn, true) }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }, { label: 'Returned', render: (h) => fmtDate(h.returnedOn) }, { label: 'Status', render: (h) => <Badge tone={loanTone(h.status)}>{label(h.status)}</Badge> }, { label: 'Fine', render: (h) => (h.fineAmount ? `${fmtMoney(h.fineAmount)}${h.fineWaived ? ' (waived)' : ''}` : '—') }]} /></Card>
        {modal === 'copies' && <FormModal title="Add copies" fields={[{ name: 'count', label: 'How many copies?', type: 'number', min: 1, default: 1, required: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { const r = await post(`${base}/books/${id}/copies`, v); alert(`New accession numbers: ${r.accessionNos.join(', ')}`); b.reload(); return true; }} />}
        {modal === 'edit' && <FormModal wide title="Edit book" initial={x} fields={[{ name: 'title', label: 'Title', required: true, full: true }, { name: 'author', label: 'Author' }, { name: 'isbn', label: 'ISBN' }, { name: 'category', label: 'Category' }, { name: 'publisher', label: 'Publisher' }, { name: 'shelf', label: 'Shelf' }, { name: 'price', label: 'Price (₹)', type: 'number', min: 0, keepEmpty: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { await patch(`${base}/books/${id}`, v); b.reload(); return true; }} />}
      </div>)}</Async>
  );
}

// ───────────── loans ─────────────
export function Loans({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ status: 'issued', q: '', page: 1 });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/loans`, { ...f, q: dq });
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Loans & overdue" subtitle="Who has which book, and who is late" actions={!readOnly && <ConfirmButton variant="primary" message="Send an overdue reminder to every borrower with a late book? (Once a day each.)" onConfirm={async () => { await run(() => post(`${base}/reminders`, {}), (r) => `${r.sent} reminder(s) sent`); }}>Remind all overdue</ConfirmButton>} />
      <ListCard>
        <FilterBar search={f.q} onSearch={(v) => setF({ ...f, q: v, page: 1 })} searchLabel="Search loans" placeholder="Search book, borrower, accession no">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['issued', 'On loan'], ['overdue', 'Overdue'], ['returned', 'Returned'], ['lost', 'Lost'], ['all', 'All']].map(([value, l]) => ({ value, label: l }))} aria-label="Status" /></FilterBar>
        <Async state={list} empty={<Empty title="No loans match" />}>{(d) => <DataTable rows={d.items} columns={[{ label: 'Accession', key: 'accessionNo' }, { label: 'Book', render: (l) => <b>{l.book}</b> }, { label: 'Borrower', render: (l) => <>{l.borrower} <Badge>{l.borrowerType}</Badge></> }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn) }, { label: 'Due', render: (l) => <>{fmtDate(l.dueDate)} {l.overdue && <Badge tone="red">{l.daysLate}d late</Badge>}</> }, { label: 'Returned', render: (l) => fmtDate(l.returnedOn) },
          { label: 'Fine', render: (l) => (l.fineSoFar ? <>{fmtMoney(l.fineSoFar)}{l.fineWaived && <Badge>waived</Badge>}</> : '—') }, { label: 'Status', render: (l) => <Badge tone={loanTone(l.status)}>{label(l.status)}</Badge> },
          ...(readOnly ? [] : [{ label: '', render: (l) => l.status === 'issued' && !l.overdue && <Button size="sm" onClick={async () => { await run(() => post(`${base}/loans/${l._id}/renew`), 'Renewed'); list.reload(); }}>Renew{l.renewals ? ` (${l.renewals})` : ''}</Button> }])]} />}</Async>
      </ListCard>
    </div>
  );
}

export function LibrarySettings() {
  const s = useApi('/api/library/settings');
  const f = useForm({});
  const [run, busy] = useAction();
  return (
    <Async state={s}>{(d) => {
      const v = { loanStudent: f.values.loanStudent ?? d.loanDays.student, loanTeacher: f.values.loanTeacher ?? d.loanDays.teacher, maxStudent: f.values.maxStudent ?? d.maxBooks.student, maxTeacher: f.values.maxTeacher ?? d.maxBooks.teacher, fine: f.values.fine ?? d.finePerDay, renewals: f.values.renewals ?? d.maxRenewals, block: f.values.block ?? d.blockIfOverdue };
      return (
        <div className="stack" style={{ maxWidth: 720 }}>
          <PageHeader title="Library rules" subtitle="Applied to every new loan" actions={<Button variant="primary" loading={busy} onClick={async () => { await run(() => put('/api/library/settings', { loanDays: { student: Number(v.loanStudent), teacher: Number(v.loanTeacher) }, maxBooks: { student: Number(v.maxStudent), teacher: Number(v.maxTeacher) }, finePerDay: Number(v.fine), maxRenewals: Number(v.renewals), blockIfOverdue: !!v.block }), 'Rules saved'); f.reset(); s.reload(); }}>Save rules</Button>} />
          <Card><div className="form-grid">
            <Field label="Loan period — students (days)"><Input type="number" min="1" value={v.loanStudent} onChange={(e) => f.set('loanStudent', e.target.value)} /></Field><Field label="Loan period — teachers (days)"><Input type="number" min="1" value={v.loanTeacher} onChange={(e) => f.set('loanTeacher', e.target.value)} /></Field>
            <Field label="Books at a time — students"><Input type="number" min="1" value={v.maxStudent} onChange={(e) => f.set('maxStudent', e.target.value)} /></Field><Field label="Books at a time — teachers"><Input type="number" min="1" value={v.maxTeacher} onChange={(e) => f.set('maxTeacher', e.target.value)} /></Field>
            <Field label="Late fine per day (₹)"><Input type="number" min="0" value={v.fine} onChange={(e) => f.set('fine', e.target.value)} /></Field><Field label="Renewals allowed"><Input type="number" min="0" value={v.renewals} onChange={(e) => f.set('renewals', e.target.value)} /></Field>
            <label className="row full"><input type="checkbox" checked={!!v.block} onChange={(e) => f.set('block', e.target.checked)} /> Don't lend to someone who has an overdue book</label></div>
            <p className="small muted" style={{ marginTop: 10 }}>Late fines for students are added to their fees and must be paid at the Finance desk before they can borrow again.</p></Card>
        </div>);
    }}</Async>
  );
}

/** Library desk: pick a class, see who has borrowed books and who has not. */
export function ByClass() {
  return (
    <div className="stack">
      <PageHeader title="Borrowers by class" subtitle="Choose a class to see who has borrowed a book this year, who is holding one now, and who never has." />
      <ClassBorrowers base="/api/library" />
    </div>
  );
}
