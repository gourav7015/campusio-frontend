import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, X } from 'lucide-react';
import { useGet } from '../../api/query';
import { Badge, Button, Input, type BadgeTone } from '../../design/ui';
import { fmtDate, fmtMoney, label, useDebounced } from '../../components/ui.jsx';

interface Suggestion { copyId: string; bookId: string; accessionNo: string; status: string; title: string; author?: string; shelf?: string; category?: string; referenceOnly: boolean; loan?: { borrower: string; dueDate: string; overdue: boolean } }
interface Copy { _id: string; accessionNo: string; status: string; notes?: string; loan?: { borrower: string; dueDate: string } }
interface BookInfo { _id: string; title: string; author?: string; category?: string; isbn?: string; shelf?: string; language?: string; publisher?: string; price?: number; referenceOnly?: boolean; copies: Copy[] }

const statusTone = (s: string): BadgeTone => (s === 'available' ? 'success' : s === 'issued' ? 'primary' : 'warning');

/**
 * The librarian's first move: type or scan a book's number, title or author. Matching copies appear as suggestions;
 * picking one shows the book, its copies and who holds them, with the next step (issue or return) right below.
 */
export function ScanBox() {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [copyId, setCopyId] = useState('');
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const dq = useDebounced(text.trim()) as string;
  const settled = dq === text.trim();
  const { data: rows = [], isFetching } = useGet<Suggestion[]>(dq && !picked ? '/api/library/copies/suggest' : null, { q: dq, limit: 8 });
  const { data: book } = useGet<BookInfo>(picked ? `/api/library/books/${picked.bookId}` : null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (s: Suggestion) => { setPicked(s); setCopyId(s.copyId); setText(`${s.accessionNo} · ${s.title}`); };
  const clear = () => { setPicked(null); setCopyId(''); setText(''); };
  const shown = settled && !picked ? rows : [];

  // the copy being looked at: the one picked, or, when that one is out, a copy that can be lent
  const copies = book?.copies ?? [];
  const lendable = (c: Copy) => c.status === 'available' && !book?.referenceOnly;
  const copy = copies.find((c) => c._id === copyId) ?? copies.find(lendable) ?? copies[0];
  const available = copies.filter((c) => c.status === 'available').length;
  const total = copies.filter((c) => c.status !== 'withdrawn').length;

  return (
    <div className="rounded-[20px] border-[1.5px] border-dashed border-tone bg-tone-soft p-[18px]" aria-label="Find a book">
      <form onSubmit={(e) => { e.preventDefault(); if (!picked && shown[active]) pick(shown[active]); }} className="flex items-center gap-3">
        <ScanLine className="hidden size-8 flex-none text-tone-ink sm:block" strokeWidth={1.6} aria-hidden />
        <div className="relative flex-1">
          <Input
            aria-label="Search a book by accession number, title or author" placeholder="Scan or type the accession number, title or author" value={text} autoComplete="off"
            role="combobox" aria-expanded={shown.length > 0} aria-controls="book-suggestions"
            onChange={(e) => { setText(e.target.value); setPicked(null); setCopyId(''); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && shown.length) { e.preventDefault(); setActive((a) => (a + 1) % shown.length); }
              else if (e.key === 'ArrowUp' && shown.length) { e.preventDefault(); setActive((a) => (a - 1 + shown.length) % shown.length); }
              else if (e.key === 'Escape') clear();
            }}
            className="h-12 rounded-xl bg-card pr-10 text-base" />
          {text && <button type="button" onClick={clear} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-4" aria-hidden /></button>}
        </div>
      </form>

      {!picked && dq && settled && !isFetching && rows.length === 0 && <p role="status" className="mt-3 text-sm text-muted-foreground">No book matches that. Check the number, or try part of the title or author.</p>}
      {shown.length > 0 && (
        <div id="book-suggestions" ref={listRef} role="listbox" aria-label="Matching books" className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {shown.map((s, i) => (
            <button key={s.copyId} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => pick(s)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm focus-visible:outline-none ${i === active ? 'bg-muted' : ''}`}>
              <span className="min-w-0 flex-1"><b>{s.accessionNo}</b> · {s.title}<span className="block truncate text-xs text-muted-foreground">{[s.author, s.category, s.shelf && `Shelf ${s.shelf}`].filter(Boolean).join(' · ')}</span></span>
              {s.referenceOnly ? <Badge tone="warning">Library use only</Badge> : s.status === 'issued' ? <span className="text-xs text-muted-foreground">{s.loan?.borrower ? `With ${s.loan.borrower}` : 'On loan'}</span> : <Badge tone={statusTone(s.status)}>{label(s.status)}</Badge>}
            </button>
          ))}
        </div>
      )}

      {picked && (
        <section aria-label={`About ${picked.title}`} className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-snug">{book?.title ?? picked.title}</h3>
              <p className="text-sm text-muted-foreground">{book?.author || picked.author || 'Unknown author'}</p>
            </div>
            {book && <Badge tone={book.referenceOnly ? 'warning' : available ? 'success' : 'danger'} dot>{book.referenceOnly ? 'Library use only' : available ? `${available} of ${total} copies available` : 'All copies on loan'}</Badge>}
          </div>
          {book && (
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {([['Category', book.category], ['Shelf', book.shelf], ['ISBN', book.isbn], ['Language', book.language], ['Publisher', book.publisher], ['Price', book.price ? fmtMoney(book.price) : '']] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          )}
          {copies.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Copies, pick the one in your hand</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Copies">
                {copies.filter((c) => c.status !== 'withdrawn').slice(0, 12).map((c) => (
                  <button key={c._id} type="button" role="radio" aria-checked={copy?._id === c._id} onClick={() => setCopyId(c._id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs ${copy?._id === c._id ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:bg-muted'}`}>
                    <b>{c.accessionNo}</b> <span className="text-muted-foreground">{c.status === 'issued' && c.loan ? `· ${c.loan.borrower.replace(/\s*\(.*$/, '')} · due ${fmtDate(c.loan.dueDate)}` : `· ${label(c.status)}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {copy && lendable(copy) && <Button variant="primary" onClick={() => nav(`/library/desk?acc=${encodeURIComponent(copy.accessionNo)}`)}>Issue this book</Button>}
            {copy?.status === 'issued' && <Button variant="primary" onClick={() => nav(`/library/desk?mode=return&acc=${encodeURIComponent(copy.accessionNo)}`)}>Return this book</Button>}
            {copy && copy.status === 'issued' && copy.loan && <span className="text-sm text-muted-foreground">{copy.accessionNo} is with {copy.loan.borrower}, due {fmtDate(copy.loan.dueDate)}.</span>}
            {copy && !lendable(copy) && copy.status !== 'issued' && <span className="text-sm text-muted-foreground">{book?.referenceOnly ? 'This book is for use in the library only and can\'t be borrowed.' : `${copy.accessionNo} is ${label(copy.status).toLowerCase()} and can't be lent.`}</span>}
            <Link to={`/library/books/${picked.bookId}`} className="ml-auto text-sm font-medium text-tone-ink hover:underline">Open the book's page</Link>
          </div>
        </section>
      )}
    </div>
  );
}
