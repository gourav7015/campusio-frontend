import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { post, patch, put, del } from '../../api/client.js';
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
  const [sp] = useSearchParams(); // the dashboard's book search opens the desk on the right tab
  const [mode, setMode] = useState(sp.get('mode') === 'return' ? 'return' : 'issue');
  return (
    <div className="stack">
      <PageHeader title="Issue and Return" subtitle="Scan or type the accession number printed on the book" />
      <Tabs tabs={[['issue', 'Issue a book'], ['return', 'Return a book']]} value={mode} onChange={setMode} />
      {mode === 'issue' ? <IssueDesk /> : <ReturnDesk />}
    </div>
  );
}

/** A list of copies that match what has been typed (accession number, title or author). Picking one fills the number in. */
function CopySuggestions({ text, mode, onPick, filters = {} }) {
  const dq = useDebounced(text.trim());
  const active = Object.values(filters).some((v) => v && v !== 'all');
  const browse = !dq && (active || mode === 'return'); // nothing typed: list what the filters match (on the return desk, everything that is out)
  const sug = useApi(dq || browse ? '/api/library/copies/suggest' : null, { q: dq || undefined, mode, limit: browse ? 12 : 8, ...filters });
  if (!browse && (!dq || dq !== text.trim())) return null; // wait for the typing to settle, so a stale list can't be clicked
  const rows = sug.data || [];
  if (!rows.length) return sug.loading ? null : <div className="small muted" role="status">{mode === 'return' ? 'No book on loan matches that.' : 'No book matches that. Check the number, try the title, or clear the filters.'}</div>;
  return (
    <div className="stack-sm" role="listbox" aria-label="Matching books">
      {rows.map((c) => {
        const free = c.status === 'available' && !c.referenceOnly; const usable = mode === 'return' ? c.status === 'issued' : free;
        return (
          <button key={c._id || c.copyId} type="button" role="option" aria-selected="false" disabled={!usable} className="period" style={{ textAlign: 'left', cursor: usable ? 'pointer' : 'not-allowed', opacity: usable ? 1 : 0.6 }} onClick={() => onPick(c)}>
            <div className="grow"><b>{c.accessionNo}</b> · {c.title}<div className="small muted">{[c.author, c.shelf && `Shelf ${c.shelf}`].filter(Boolean).join(' · ')}</div></div>
            {c.status === 'issued' ? <span className="small">{c.loan?.borrower ? `${c.loan.borrower} · due ${fmtDate(c.loan.dueDate)}` : 'On loan'} {c.loan?.overdue && <Badge tone="red">overdue</Badge>}</span> : <Badge tone={free ? 'green' : 'amber'}>{c.referenceOnly ? 'Library use only' : free ? 'Available' : label(c.status)}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

const SHOW = [{ value: 'canBorrow', label: 'Can borrow now' }, { value: 'hasBooks', label: 'Holding books' }, { value: 'overdue', label: 'Has an overdue book' }, { value: 'fine', label: 'Owes a library fine' }];

function IssueDesk() {
  const [sp] = useSearchParams(); // the home page's scan box brings the accession number along
  const [type, setType] = useState('student'); const [q, setQ] = useState(''); const [picked, setPicked] = useState(null); const [acc, setAcc] = useState(sp.get('acc') || ''); const [out, setOut] = useState(null);
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState(''); const [show, setShow] = useState('');
  const [copy, setCopy] = useState(null);
  const [bf, setBf] = useState({ category: '', shelf: '', language: '', show: 'all' });
  const cat = useApi('/api/library/books', { limit: 1 });
  const lookups = useApi('/api/library/lookups');
  const sections = (lookups.data?.sections || []).filter((x) => x.classId === classId);
  const dq = useDebounced(q);
  const searching = !picked && (dq.length >= 1 || classId || sectionId || show);
  const people = useApi(searching ? '/api/library/borrowers' : null, { type, q: dq, classId: sectionId ? undefined : classId, sectionId, show: show || undefined });
  const [run, busy] = useAction();
  const clearFilters = () => { setQ(''); setClassId(''); setSectionId(''); setShow(''); };
  const submit = async () => {
    const r = await run(() => post('/api/library/issue', { accessionNo: acc.trim(), borrowerType: picked.type, borrowerId: picked.id }), (x) => `Issued "${x.book.title}" to ${x.borrower.name}`);
    if (r) { setOut(r); setAcc(''); setCopy(null); people.reload(); setPicked({ ...picked, openLoans: picked.openLoans + 1 }); }
  };
  const filtered = !!(q || classId || sectionId || show);
  return (
    <div className="grid g2">
      <Card title="1. Who is borrowing?">
        <div className="stack">
          <div className="row"><Select value={type} onChange={(e) => { setType(e.target.value); setPicked(null); clearFilters(); }} options={[{ value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }]} aria-label="Borrower type" />
            <div className="grow"><Input autoFocus placeholder={type === 'student' ? 'Name or admission number' : 'Name or employee id'} value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} aria-label="Find borrower" /></div></div>
          <div className="row wrap">
            {type === 'student' && <>
              <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPicked(null); }} placeholder="Any class" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />
              <Select aria-label="Section" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPicked(null); }} placeholder="Any section" disabled={!classId} options={sections.map((x) => ({ value: x._id, label: x.name }))} />
            </>}
            <Select aria-label="Show" value={show} onChange={(e) => { setShow(e.target.value); setPicked(null); }} placeholder="Everyone" options={SHOW} />
            {filtered && !picked && <Button size="sm" onClick={clearFilters}>Clear filters</Button>}
          </div>
          {!picked && !searching && <div className="small muted">Type a name, or choose a class, to see students.</div>}
          {!picked && searching && <Async state={people}>{(rows) => rows.length ? <div className="stack-sm">{rows.map((p) => (
            <button key={p.id} className="period" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => { setPicked(p); setOut(null); }}><div className="grow"><b>{p.name}</b> <span className="muted">{p.code} · {p.detail}</span></div>
              <span>{p.openLoans}/{p.limit} books</span>{p.overdue > 0 && <Badge tone="red">{p.overdue} overdue</Badge>}{p.unpaidFine > 0 && <Badge tone="amber">Fine ₹{p.unpaidFine}</Badge>}</button>))}</div> : <Empty title="No match" />}</Async>}
          {picked && <div className="alert ok"><b>{picked.name}</b> ({picked.code}) · {picked.openLoans}/{picked.limit} books out {picked.overdue > 0 && '· has an overdue book'} {picked.unpaidFine > 0 && `· unpaid fine ₹${picked.unpaidFine}`} <Button size="sm" onClick={() => setPicked(null)}>Change</Button></div>}
        </div>
      </Card>
      <Card title="2. Which book?">
        <div className="stack">
          <Field label="Accession number, title or author"><Input placeholder="e.g. LB00012, or start typing the title" value={acc} onChange={(e) => { setAcc(e.target.value); setCopy(null); }} onKeyDown={(e) => e.key === 'Enter' && picked && acc && submit()} /></Field>
          <div className="row wrap">
            <Select aria-label="Book category" value={bf.category} onChange={(e) => { setBf({ ...bf, category: e.target.value }); setCopy(null); }} placeholder="Any category" options={(cat.data?.categories || []).map((c) => ({ value: c, label: c }))} />
            {(cat.data?.shelves || []).length > 1 && <Select aria-label="Book shelf" value={bf.shelf} onChange={(e) => { setBf({ ...bf, shelf: e.target.value }); setCopy(null); }} placeholder="Any shelf" options={(cat.data?.shelves || []).map((c) => ({ value: c, label: `Shelf ${c}` }))} />}
            {(cat.data?.languages || []).length > 1 && <Select aria-label="Book language" value={bf.language} onChange={(e) => { setBf({ ...bf, language: e.target.value }); setCopy(null); }} placeholder="Any language" options={(cat.data?.languages || []).map((c) => ({ value: c, label: c }))} />}
            <Select aria-label="Book availability" value={bf.show} onChange={(e) => { setBf({ ...bf, show: e.target.value }); setCopy(null); }} options={[{ value: 'all', label: 'All copies' }, { value: 'available', label: 'Available to borrow' }]} />
            {(bf.category || bf.shelf || bf.language || bf.show !== 'all') && <Button size="sm" onClick={() => setBf({ category: '', shelf: '', language: '', show: 'all' })}>Clear filters</Button>}
          </div>
          {!copy && !acc.trim() && !(bf.category || bf.shelf || bf.language || bf.show !== 'all') && <div className="small muted">Type a number, title or author, or use the filters to browse the shelves.</div>}
          {!copy && <CopySuggestions text={acc} mode="issue" filters={bf} onPick={(c) => { setCopy(c); setAcc(c.accessionNo); setOut(null); }} />}
          {copy && <div className="alert ok"><b>{copy.title}</b>{copy.author ? ` — ${copy.author}` : ''} · {copy.accessionNo}{copy.shelf ? ` · Shelf ${copy.shelf}` : ''} <Button size="sm" onClick={() => { setCopy(null); setAcc(''); }}>Change</Button></div>}
          <Button variant="primary" loading={busy} disabled={!picked || !acc.trim()} onClick={submit}>Issue book</Button>
          {!picked && acc.trim() && <div className="small muted">Now choose who is borrowing, on the left, to issue it.</div>}
          {out && <div className="alert ok">Issued <b>{out.book.title}</b> to {out.borrower.name}. Due back <b>{fmtDate(out.issue.dueDate, true)}</b>.</div>}
        </div>
      </Card>
    </div>
  );
}

function ReturnDesk() {
  const [sp] = useSearchParams();
  const [acc, setAcc] = useState(sp.get('acc') || ''); const [rf, setRf] = useState({ category: '', show: 'all' }); const [cond, setCond] = useState('good');
  const cat = useApi('/api/library/books', { limit: 1 }); const [damage, setDamage] = useState(''); const [waive, setWaive] = useState(false); const [why, setWhy] = useState(''); const [out, setOut] = useState(null);
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
          <Field label="Accession number, title or borrower's book"><Input autoFocus placeholder="e.g. LB00012, or start typing the title" value={acc} onChange={(e) => { setAcc(e.target.value); setOut(null); }} /></Field>
          <div className="row wrap">
            <Select aria-label="Book category" value={rf.category} onChange={(e) => setRf({ ...rf, category: e.target.value })} placeholder="Any category" options={(cat.data?.categories || []).map((c) => ({ value: c, label: c }))} />
            <Select aria-label="Which loans" value={rf.show} onChange={(e) => setRf({ ...rf, show: e.target.value })} options={[{ value: 'all', label: 'All books on loan' }, { value: 'overdue', label: 'Overdue only' }]} />
            {(rf.category || rf.show !== 'all') && <Button size="sm" onClick={() => setRf({ category: '', show: 'all' })}>Clear filters</Button>}
          </div>
          {!current && <CopySuggestions text={acc} mode="return" filters={rf} onPick={(c) => { setAcc(c.accessionNo); setOut(null); }} />}
          {current && <div className="alert info"><b>{current.book}</b> — {current.borrower}<br />Due {fmtDate(current.dueDate, true)}{current.overdue ? ` · ${current.daysLate} day(s) late, fine so far ${fmtMoney(current.fineSoFar)}` : ' · on time'}</div>}
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
            <br />{out.fine.waived ? 'Waived.' : out.fine.charged ? <><b>{out.borrower?.name || 'The student'}</b>: this fine is now in the student's fee account. It shows in the Finance portal, where it is collected, and the student cannot borrow again until it is paid.</> : 'Recorded (teachers have no fee account).'}</div> : <div className="alert ok">No fine.</div>}</div>
          : <Empty title="Scan a returned book" />}
      </Card>
    </div>
  );
}

// ───────────── catalogue ─────────────
export function Books({ readOnly }) {
  const { base, path } = ctxOf(readOnly);
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', category: '', shelf: '', language: '', author: '', availability: 'all', sort: 'title', page: 1 });
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
          {(list.data?.authors || []).length > 1 && <Select value={f.author} onChange={(e) => setF({ ...f, author: e.target.value, page: 1 })} options={(list.data?.authors || []).map((c) => ({ value: c, label: c }))} placeholder="Any author" aria-label="Author" />}
          {(list.data?.shelves || []).length > 1 && <Select value={f.shelf} onChange={(e) => setF({ ...f, shelf: e.target.value, page: 1 })} options={(list.data?.shelves || []).map((c) => ({ value: c, label: `Shelf ${c}` }))} placeholder="Any shelf" aria-label="Shelf" />}
          {(list.data?.languages || []).length > 1 && <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value, page: 1 })} options={(list.data?.languages || []).map((c) => ({ value: c, label: c }))} placeholder="Any language" aria-label="Language" />}
          <Select value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value, page: 1 })} options={[{ value: 'all', label: 'All books' }, { value: 'available', label: 'Available to borrow' }, { value: 'out', label: 'All copies out' }, { value: 'reference', label: 'Library use only' }]} aria-label="Availability" />
          <Select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value, page: 1 })} options={[{ value: 'title', label: 'Sort: title' }, { value: 'newest', label: 'Sort: newest added' }, { value: 'popular', label: 'Sort: most borrowed' }]} aria-label="Sort" />
          <Segmented label="View" value={view} onChange={setView} options={[{ value: 'grid', label: 'Covers' }, { value: 'table', label: 'Table' }]} /></FilterBar>
        <Async state={list}>{(d) => (<>{view === 'grid' ? <BookGrid items={d.items} onOpen={(b) => nav(`${path}/books/${b._id}`)} /> : <DataTable rows={d.items} empty="No books yet" onRowClick={(b) => nav(`${path}/books/${b._id}`)} columns={[{ label: 'Title', render: (b) => <><b>{b.title}</b><div className="small muted">{b.author}</div></> }, { label: 'Category', key: 'category' }, { label: 'ISBN', key: 'isbn' }, { label: 'Shelf', key: 'shelf' }, { label: 'Copies', render: (b) => (b.referenceOnly ? <Badge tone="amber">Library use only · {b.total} cop{b.total === 1 ? 'y' : 'ies'}</Badge> : `${b.available} available / ${b.total}`) }, { label: 'On loan', key: 'issued' }, { label: 'Price', render: (b) => fmtMoney(b.price) }]} />}
          <ListFooter total={d.total} noun="title" page={f.page} pageSize={d.limit || 25} onPage={(p) => setF({ ...f, page: p })} /></>)}</Async>
      </ListCard>
      {modal && <FormModal wide title="Add a book" fields={[{ name: 'title', label: 'Title', required: true, full: true }, { name: 'author', label: 'Author' }, { name: 'isbn', label: 'ISBN' }, { name: 'category', label: 'Category', placeholder: 'Fiction, Science, Reference…' }, { name: 'publisher', label: 'Publisher' }, { name: 'edition', label: 'Edition' }, { name: 'language', label: 'Language' }, { name: 'shelf', label: 'Shelf / location' }, { name: 'price', label: 'Price (₹) — charged if lost', type: 'number', min: 0, default: 0, keepEmpty: true }, { name: 'copies', label: 'Number of copies', type: 'number', min: 1, default: 1, required: true }, { name: 'referenceOnly', label: 'Library use only', type: 'checkbox', hint: 'Read in the library, never lent out (dictionaries, atlases, reference sets).', full: true }]}
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
  const nav = useNavigate();
  return (
    <Async state={b}>{(x) => (
      <div className="stack">
        <PageHeader title={x.title} subtitle={[x.author, x.category, x.isbn && `ISBN ${x.isbn}`, x.shelf && `Shelf ${x.shelf}`].filter(Boolean).join(' · ')} actions={<><Link className="btn" to={readOnly ? '/admin/library?tab=books' : '/library/books'}>← Catalogue</Link>{!readOnly && <><Button onClick={() => setModal('edit')}>Edit</Button><Button variant="primary" onClick={() => setModal('copies')}>+ Add copies</Button><Button variant="danger" onClick={async () => {
          const used = x.history.length > 0; const n = x.copies.filter((c) => c.status !== 'withdrawn').length;
          if (!(await dlg.confirm(used ? `Delete "${x.title}" and its ${n} cop${n === 1 ? 'y' : 'ies'}? It disappears from the catalogue and the Issue desk. Its past loans and any fines stay in the students' and school's records, because those are accounts and can't be erased.` : `Delete "${x.title}" and its ${n} cop${n === 1 ? 'y' : 'ies'}? It has never been lent, so it is removed completely.`, { danger: true, confirmLabel: 'Delete book', title: 'Delete book' }))) return;
          const ok = await run(() => del(`${base}/books/${id}`), 'Book deleted');
          if (ok) nav('/library/books');
        }}>Delete book</Button></>}</>} />
        {x.referenceOnly && <div className="alert info"><b>Library use only.</b> This book is read in the library and can't be borrowed, so it never appears as available to issue.</div>}
        <Card title={`Copies (${x.copies.length})`} flush><DataTable rows={x.copies} empty="No copies" columns={[{ label: 'Accession no', render: (c) => <b>{c.accessionNo}</b> }, { label: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{label(c.status)}</Badge> }, { label: 'Borrowed by', render: (c) => (c.loan ? `${c.loan.borrower} · due ${fmtDate(c.loan.dueDate)}` : '—') }, { label: 'Notes', key: 'notes' },
          ...(readOnly ? [] : [{ label: '', render: (c) => c.status !== 'issued' && <select aria-label={`Status of ${c.accessionNo}`} value={c.status} style={{ width: 130 }} onChange={async (e) => { const status = e.target.value; const notes = status === 'available' ? undefined : await dlg.prompt('Note (optional)', { required: true }) || undefined; await run(() => patch(`${base}/copies/${c._id}`, { status, notes }), 'Updated'); b.reload(); }}>{['available', 'damaged', 'lost', 'withdrawn'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select> },
            { label: '', render: (c) => c.status !== 'issued' && <Button size="sm" variant="danger" aria-label={`Delete copy ${c.accessionNo}`} onClick={async () => {
              if (!(await dlg.confirm(`Delete copy ${c.accessionNo}? If it was lent before, its history must stay, so it will be marked Withdrawn instead.`, { danger: true, confirmLabel: 'Delete copy', title: 'Delete copy' }))) return;
              await run(() => del(`${base}/copies/${c._id}`), (r) => (r.mode === 'deleted' ? `Copy ${r.accessionNo} deleted` : `Copy ${r.accessionNo} withdrawn (lending history kept)`)); b.reload();
            }}>Delete</Button> }])]} /></Card>
        <Card title="Borrowing history" flush><DataTable rows={x.history} rowKey="_id" empty="Never borrowed" columns={[{ label: 'Borrower', key: 'borrower' }, { label: 'Issued', render: (h) => fmtDate(h.issuedOn, true) }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }, { label: 'Returned', render: (h) => fmtDate(h.returnedOn) }, { label: 'Status', render: (h) => <Badge tone={loanTone(h.status)}>{label(h.status)}</Badge> }, { label: 'Fine', render: (h) => (h.fineAmount ? `${fmtMoney(h.fineAmount)}${h.fineWaived ? ' (waived)' : ''}` : '—') }]} /></Card>
        {modal === 'copies' && <FormModal title="Add copies" fields={[{ name: 'count', label: 'How many copies?', type: 'number', min: 1, default: 1, required: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { const r = await post(`${base}/books/${id}/copies`, v); alert(`New accession numbers: ${r.accessionNos.join(', ')}`); b.reload(); return true; }} />}
        {modal === 'edit' && <FormModal wide title="Edit book" initial={x} fields={[{ name: 'title', label: 'Title', required: true, full: true }, { name: 'author', label: 'Author' }, { name: 'isbn', label: 'ISBN' }, { name: 'category', label: 'Category' }, { name: 'publisher', label: 'Publisher' }, { name: 'shelf', label: 'Shelf' }, { name: 'price', label: 'Price (₹)', type: 'number', min: 0, keepEmpty: true }, { name: 'referenceOnly', label: 'Library use only', type: 'checkbox', hint: 'Read in the library, never lent out. Copies already on loan can still be returned.', full: true }]} onClose={() => setModal(null)} onSubmit={async (v) => { await patch(`${base}/books/${id}`, v); b.reload(); return true; }} />}
      </div>)}</Async>
  );
}

// ───────────── loans ─────────────
export function Loans({ readOnly }) {
  const { base } = ctxOf(readOnly);
  const [f, setF] = useState({ status: 'issued', q: '', borrowerType: '', classId: '', category: '', dueFrom: '', dueTo: '', page: 1 });
  const dq = useDebounced(f.q);
  const list = useApi(`${base}/loans`, { ...f, q: dq });
  const lookups = useApi(`${base}/lookups`);
  const cats = useApi(`${base}/books`, { limit: 1 });
  const [run] = useAction();
  const open = f.status === 'issued' || f.status === 'overdue'; // nothing has been returned yet, so no "Returned" column
  return (
    <div className="stack">
      <PageHeader title="Loans and Overdue" subtitle="Who has which book, and who is late" actions={!readOnly && <ConfirmButton variant="primary" message="Send an overdue reminder to every borrower with a late book? (Once a day each.)" onConfirm={async () => { await run(() => post(`${base}/reminders`, {}), (r) => `${r.sent} reminder(s) sent`); }}>Remind all overdue</ConfirmButton>} />
      <ListCard>
        <FilterBar search={f.q} onSearch={(v) => setF({ ...f, q: v, page: 1 })} searchLabel="Search loans" placeholder="Search book, borrower, class, accession no">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[['issued', 'On loan'], ['overdue', 'Overdue'], ['returned', 'Returned'], ['lost', 'Lost'], ['all', 'All']].map(([value, l]) => ({ value, label: l }))} aria-label="Status" />
          <Select value={f.borrowerType} onChange={(e) => setF({ ...f, borrowerType: e.target.value, classId: e.target.value === 'teacher' ? '' : f.classId, page: 1 })} options={[{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers' }]} placeholder="Students and teachers" aria-label="Borrower type" />
          {f.borrowerType !== 'teacher' && <Select value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value, page: 1 })} options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} placeholder="Any class" aria-label="Class" />}
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })} options={(cats.data?.categories || []).map((c) => ({ value: c, label: c }))} placeholder="Any category" aria-label="Category" />
          <label className="row small">Due from <Input type="date" value={f.dueFrom} onChange={(e) => setF({ ...f, dueFrom: e.target.value, page: 1 })} aria-label="Due from" /></label>
          <label className="row small">to <Input type="date" value={f.dueTo} onChange={(e) => setF({ ...f, dueTo: e.target.value, page: 1 })} aria-label="Due to" /></label>
          {(f.borrowerType || f.classId || f.category || f.dueFrom || f.dueTo) && <Button size="sm" onClick={() => setF({ ...f, borrowerType: '', classId: '', category: '', dueFrom: '', dueTo: '', page: 1 })}>Clear filters</Button>}</FilterBar>
        <Async state={list} empty={<Empty title="No loans match" />}>{(d) => <DataTable rows={d.items} empty="No loans match these filters" columns={[{ label: 'Accession', key: 'accessionNo' }, { label: 'Book', render: (l) => <b>{l.book}</b> }, { label: 'Borrower', render: (l) => <>{l.borrower} <Badge>{l.borrowerType}</Badge></> }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn) }, { label: 'Due', render: (l) => <>{fmtDate(l.dueDate)} {l.overdue && <Badge tone="red">{l.daysLate}d late</Badge>}</> }, { label: 'Class', render: (l) => (l.borrowerType === 'teacher' ? 'Teacher' : l.classLabel || '—') },
          ...(open ? [] : [{ label: 'Returned', render: (l) => fmtDate(l.returnedOn) }]),
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
