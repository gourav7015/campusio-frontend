import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ScanLine } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Empty, Field, Input, PageHeader, Select, Tabs, useAction, useDebounced, fmtDate, fmtMoney } from '../../components/ui.jsx';
import { Callout } from '../../design/ui';

/**
 * The circulation desk: issue a book to someone, or take one back.
 * Built from the same pieces as the Finance counter: a numbered section, a bordered pick list, a summary of what was chosen and a Callout for the outcome.
 */
export function Desk() {
  const [sp] = useSearchParams(); // the dashboard's book search opens the desk on the right tab
  const [mode, setMode] = useState(sp.get('mode') === 'return' ? 'return' : 'issue');
  return (
    <div className="stack">
      <PageHeader title="Issue and return" subtitle="Scan or type the accession number printed on the book" />
      <Tabs tabs={[['issue', 'Issue a book'], ['return', 'Return a book']]} value={mode} onChange={setMode} />
      {mode === 'issue' ? <IssueDesk /> : <ReturnDesk />}
    </div>
  );
}

const Section = ({ n, id, title, hint, children }) => (
  <section aria-labelledby={id} className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
    <div className="flex items-center gap-3">
      {n && <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-tone-soft text-[13px] font-semibold text-tone-ink">{n}</span>}
      <div className="min-w-0"><h2 id={id} className="text-[15px] font-semibold leading-6 tracking-tight">{title}</h2>{hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}</div>
    </div>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

const Note = ({ children, ...p }) => <p className="text-[13px] leading-5 text-muted-foreground" {...p}>{children}</p>;
const Filters = ({ children, first }) => <div className={first ? 'grid gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]' : 'grid gap-2 sm:grid-cols-2 [&>button]:justify-self-start sm:[&>button]:col-span-2'}>{children}</div>;
const PickList = ({ label, listbox, children }) => <ul aria-label={label} role={listbox ? 'listbox' : undefined} className="overflow-hidden rounded-2xl border border-border">{children}</ul>;
const PickRow = ({ onClick, disabled, children, ...p }) => (
  <li role="presentation" className="border-t border-border first:border-t-0">
    <button type="button" disabled={disabled} onClick={onClick} {...p}
      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-tone-soft focus-visible:bg-tone-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">{children}</button>
  </li>
);
/** What has been chosen, with a way to change it. */
const Chosen = ({ children, onChange }) => (
  <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-tone-soft px-3.5 py-3 text-sm">
    <div className="min-w-0"><span className="mb-0.5 flex items-center gap-1.5 text-[12px] font-medium text-tone-ink"><Check className="size-3.5" aria-hidden />Chosen</span>{children}</div>
    <Button size="sm" onClick={onChange}>Change</Button>
  </div>
);

/** A list of copies that match what has been typed (accession number, title or author). Picking one fills the number in. */
function CopySuggestions({ text, mode, onPick, filters = {} }) {
  const dq = useDebounced(text.trim());
  const active = Object.values(filters).some((v) => v && v !== 'all');
  const browse = !dq && (active || mode === 'return'); // nothing typed: list what the filters match (on the return desk, everything that is out)
  const sug = useApi(dq || browse ? '/api/library/copies/suggest' : null, { q: dq || undefined, mode, limit: browse ? 12 : 8, ...filters });
  if (!browse && (!dq || dq !== text.trim())) return null; // wait for the typing to settle, so a stale list can't be clicked
  const rows = sug.data || [];
  if (!rows.length) return sug.loading ? null : <Note role="status">{mode === 'return' ? 'No book on loan matches that.' : 'No book matches that. Check the number, try the title, or clear the filters.'}</Note>;
  return (
    <PickList label="Matching books" listbox>
      {rows.map((c) => {
        const free = c.status === 'available' && !c.referenceOnly;
        const usable = mode === 'return' ? c.status === 'issued' : free;
        return (
          <PickRow key={c._id || c.copyId} role="option" aria-selected="false" disabled={!usable} onClick={() => onPick(c)}>
            <span className="min-w-0 flex-1"><b className="font-medium">{c.accessionNo}</b> · {c.title}<span className="block truncate text-[13px] text-muted-foreground">{[c.author, c.shelf && `Shelf ${c.shelf}`].filter(Boolean).join(' · ')}</span></span>
            {c.status === 'issued'
              ? <span className="flex flex-none items-center gap-2 text-[13px] text-muted-foreground">{c.loan?.borrower ? `${c.loan.borrower} · due ${fmtDate(c.loan.dueDate)}` : 'On loan'} {c.loan?.overdue && <Badge tone="red">overdue</Badge>}</span>
              : <Badge tone={free ? 'green' : 'amber'}>{c.referenceOnly ? 'Library use only' : free ? 'Available' : c.status}</Badge>}
          </PickRow>
        );
      })}
    </PickList>
  );
}

const SHOW = [{ value: 'canBorrow', label: 'Can borrow now' }, { value: 'hasBooks', label: 'Holding books' }, { value: 'overdue', label: 'Has an overdue book' }, { value: 'fine', label: 'Owes a library fine' }];
const NO_BOOK_FILTER = { category: '', shelf: '', language: '', show: 'all' };

function IssueDesk() {
  const [sp] = useSearchParams(); // the home page's scan box brings the accession number along
  const [type, setType] = useState('student'); const [q, setQ] = useState(''); const [picked, setPicked] = useState(null); const [acc, setAcc] = useState(sp.get('acc') || ''); const [out, setOut] = useState(null);
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState(''); const [show, setShow] = useState('');
  const [copy, setCopy] = useState(null);
  const [bf, setBf] = useState(NO_BOOK_FILTER);
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
  const bookFiltered = !!(bf.category || bf.shelf || bf.language || bf.show !== 'all');
  const setBook = (patch) => { setBf({ ...bf, ...patch }); setCopy(null); };
  const shelves = cat.data?.shelves || []; const languages = cat.data?.languages || [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section n="1" id="issue-who" title="Who is borrowing?" hint="Find a student or a teacher.">
        <Filters first>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPicked(null); clearFilters(); }} options={[{ value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }]} aria-label="Borrower type" />
          <div><Input autoFocus placeholder={type === 'student' ? 'Name or admission number' : 'Name or employee id'} value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} aria-label="Find borrower" /></div>
        </Filters>
        <Filters>
          {type === 'student' && <>
            <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPicked(null); }} placeholder="Any class" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />
            <Select aria-label="Section" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPicked(null); }} placeholder="Any section" disabled={!classId} options={sections.map((x) => ({ value: x._id, label: x.name }))} />
          </>}
          <Select aria-label="Show" value={show} onChange={(e) => { setShow(e.target.value); setPicked(null); }} placeholder="Everyone" options={SHOW} />
          {filtered && !picked && <Button size="sm" onClick={clearFilters}>Clear filters</Button>}
        </Filters>
        {!picked && !searching && <Note>Type a name, or choose a class, to see students.</Note>}
        {!picked && searching && <Async state={people}>{(rows) => rows.length ? (
          <PickList label="Borrowers">{rows.map((p) => (
            <PickRow key={p.id} onClick={() => { setPicked(p); setOut(null); }}>
              <span className="min-w-0 flex-1"><b className="font-medium">{p.name}</b><span className="block truncate text-[13px] text-muted-foreground">{p.code} · {p.detail}</span></span>
              <span className="flex flex-none flex-wrap items-center justify-end gap-2 text-[13px] text-muted-foreground"><span>{p.openLoans}/{p.limit} books</span>{p.overdue > 0 && <Badge tone="red">{p.overdue} overdue</Badge>}{p.unpaidFine > 0 && <Badge tone="amber">Fine {fmtMoney(p.unpaidFine)}</Badge>}</span>
            </PickRow>))}
          </PickList>) : <Empty title="No match" />}</Async>}
        {picked && <Chosen onChange={() => setPicked(null)}><b>{picked.name}</b> <span className="text-muted-foreground">({picked.code})</span><span className="block text-[13px] text-muted-foreground">{picked.openLoans}/{picked.limit} books out{picked.overdue > 0 && ' · has an overdue book'}{picked.unpaidFine > 0 && ` · unpaid fine ${fmtMoney(picked.unpaidFine)}`}</span></Chosen>}
      </Section>

      <Section n="2" id="issue-which" title="Which book?" hint="Scan the number, or search by title or author.">
        <Field label="Accession number, title or author"><Input placeholder="e.g. LB00012, or start typing the title" value={acc} onChange={(e) => { setAcc(e.target.value); setCopy(null); }} onKeyDown={(e) => e.key === 'Enter' && picked && acc && submit()} /></Field>
        <Filters>
          <Select aria-label="Book category" value={bf.category} onChange={(e) => setBook({ category: e.target.value })} placeholder="Any category" options={(cat.data?.categories || []).map((c) => ({ value: c, label: c }))} />
          {shelves.length > 1 && <Select aria-label="Book shelf" value={bf.shelf} onChange={(e) => setBook({ shelf: e.target.value })} placeholder="Any shelf" options={shelves.map((c) => ({ value: c, label: `Shelf ${c}` }))} />}
          {languages.length > 1 && <Select aria-label="Book language" value={bf.language} onChange={(e) => setBook({ language: e.target.value })} placeholder="Any language" options={languages.map((c) => ({ value: c, label: c }))} />}
          <Select aria-label="Book availability" value={bf.show} onChange={(e) => setBook({ show: e.target.value })} options={[{ value: 'all', label: 'All copies' }, { value: 'available', label: 'Available to borrow' }]} />
          {bookFiltered && <Button size="sm" onClick={() => setBook(NO_BOOK_FILTER)}>Clear filters</Button>}
        </Filters>
        {!copy && !acc.trim() && !bookFiltered && <Note>Type a number, title or author, or use the filters to browse the shelves.</Note>}
        {!copy && <CopySuggestions text={acc} mode="issue" filters={bf} onPick={(c) => { setCopy(c); setAcc(c.accessionNo); setOut(null); }} />}
        {copy && <Chosen onChange={() => { setCopy(null); setAcc(''); }}><b>{copy.title}</b>{copy.author ? ` — ${copy.author}` : ''} · {copy.accessionNo}{copy.shelf ? ` · Shelf ${copy.shelf}` : ''}</Chosen>}
        <Button variant="primary" loading={busy} disabled={!picked || !acc.trim()} onClick={submit} className="w-full">Issue book</Button>
        {!picked && acc.trim() && <Note>Now choose who is borrowing, on the left, to issue it.</Note>}
        {out && <Callout tone="success">Issued <b>{out.book.title}</b> to {out.borrower.name}. Due back <b>{fmtDate(out.issue.dueDate, true)}</b>.</Callout>}
      </Section>
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Section n="1" id="return-which" title="Which book is coming back?" hint="Scan the number, or pick from the books that are out.">
        <Field label="Accession number, title or borrower's book"><Input autoFocus placeholder="e.g. LB00012, or start typing the title" value={acc} onChange={(e) => { setAcc(e.target.value); setOut(null); }} /></Field>
        <Filters>
          <Select aria-label="Book category" value={rf.category} onChange={(e) => setRf({ ...rf, category: e.target.value })} placeholder="Any category" options={(cat.data?.categories || []).map((c) => ({ value: c, label: c }))} />
          <Select aria-label="Which loans" value={rf.show} onChange={(e) => setRf({ ...rf, show: e.target.value })} options={[{ value: 'all', label: 'All books on loan' }, { value: 'overdue', label: 'Overdue only' }]} />
          {(rf.category || rf.show !== 'all') && <Button size="sm" onClick={() => setRf({ category: '', show: 'all' })}>Clear filters</Button>}
        </Filters>
        {!current && <CopySuggestions text={acc} mode="return" filters={rf} onPick={(c) => { setAcc(c.accessionNo); setOut(null); }} />}
        {current && <Callout tone="info"><b>{current.book}</b> — {current.borrower}<br />Due {fmtDate(current.dueDate, true)}{current.overdue ? ` · ${current.daysLate} day(s) late, fine so far ${fmtMoney(current.fineSoFar)}` : ' · on time'}</Callout>}
        <Field label="Condition"><Select value={cond} onChange={(e) => setCond(e.target.value)} options={[{ value: 'good', label: 'Good' }, { value: 'damaged', label: 'Damaged' }, { value: 'lost', label: 'Lost (charged at the book price)' }]} /></Field>
        {cond === 'damaged' && <Field label="Damage fine (₹)"><Input type="number" min="0" value={damage} onChange={(e) => setDamage(e.target.value)} /></Field>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={waive} onChange={(e) => setWaive(e.target.checked)} /> Waive any fine</label>
        {waive && <Field label="Reason (required)"><Input value={why} onChange={(e) => setWhy(e.target.value)} /></Field>}
        <Button variant="primary" loading={busy} disabled={!acc.trim() || (waive && why.trim().length < 3)} onClick={submit} className="w-full">Return book</Button>
      </Section>

      <Section n="2" id="return-result" title="Result">
        {out ? (
          <div className="space-y-3">
            <Callout tone="success"><b>{out.book?.title}</b> returned{out.issue.status === 'lost' ? ' as LOST' : ''}.</Callout>
            {out.fine.amount > 0
              ? <Callout tone={out.fine.waived ? 'info' : 'warning'}>Fine {fmtMoney(out.fine.amount)}{out.fine.lateDays ? ` · ${out.fine.lateDays} day(s) late = ${fmtMoney(out.fine.lateFine)}` : ''}{out.fine.damage ? ` · damage ${fmtMoney(out.fine.damage)}` : ''}{out.fine.lost ? ` · lost ${fmtMoney(out.fine.lost)}` : ''}
                <br />{out.fine.waived ? 'Waived.' : out.fine.charged ? <><b>{out.borrower?.name || 'The student'}</b>: this fine is now in the student's fee account. It shows in the Finance portal, where it is collected, and the student cannot borrow again until it is paid.</> : 'Recorded (teachers have no fee account).'}</Callout>
              : <Callout tone="success">No fine.</Callout>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"><ScanLine className="size-8" strokeWidth={1.5} aria-hidden /><p className="text-sm font-medium text-foreground">Scan a returned book</p><p className="max-w-xs text-[13px]">What happens to the loan and any fine appears here.</p></div>
        )}
      </Section>
    </div>
  );
}
