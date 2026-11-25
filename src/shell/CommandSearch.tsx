import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import * as D from '@radix-ui/react-dialog';
import { useGet } from '../api/query';
import { useDebounced } from '../components/ui.jsx';
import { Button, Kbd, Skeleton } from '../design/ui';
import { cn } from '../design/lib/cn';

type Hit = { _id?: string; id?: string; sectionId?: string; name?: string; title?: string; label?: string; code?: string; admissionNo?: string };
type Results = Record<string, Hit[]>;

const adminHref = (g: string, x: Hit) => ({
  students: `/admin/students/${x._id}`, teachers: `/admin/teachers/${x._id}`, exams: `/admin/exams/${x._id}`, homework: '/admin/classes?tab=homework',
  announcements: '/admin/announcements', classes: '/admin/classes', subjects: '/admin/assignments',
} as Record<string, string>)[g];
const hrefFor = (role: string, g: string, x: Hit) => role === 'teacher' ? (g === 'students' ? `/teacher/students/${x.id}` : `/teacher/classes/${x.sectionId}`) : adminHref(g, x);

/** Command-style quick search, opened from the header or with Cmd/Ctrl+K. */
export function CommandSearch({ base, role, pages }: { base: string; role: 'admin' | 'teacher'; pages?: { label: string; to: string; area: string }[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const term = useDebounced(q.trim());
  const { data, isFetching } = useGet<Results>(term.length >= 2 ? `${base}/search` : null, { q: term });
  const lower = term.toLowerCase();
  const pageHits = (pages ?? []).filter((p) => !lower || `${p.label} ${p.area}`.toLowerCase().includes(lower)).slice(0, lower ? 6 : 8).map((p) => ({ g: 'pages', x: { name: p.label } as Hit, to: p.to as string | undefined, sub: p.area }));
  const flat = [...pageHits, ...Object.entries(term.length >= 2 ? data ?? {} : {}).flatMap(([g, items]) => (items ?? []).map((x) => ({ g, x, to: hrefFor(role, g, x), sub: undefined as string | undefined })))];
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { listRef.current?.querySelector('[data-active=true]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const go = (to?: string) => { if (!to) return; setOpen(false); setQ(''); nav(to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[active]?.to); }
  };
  let last = ''; let idx = -1;
  return (
    <D.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <D.Trigger asChild>
        <Button variant="secondary" className="hidden h-9 w-64 justify-start gap-2 font-normal text-muted-foreground md:inline-flex xl:w-80" aria-label="Search">
          <Search aria-hidden /><span className="flex-1 text-left">{pages ? 'Search pages, students, staff' : 'Search'}</span><Kbd>⌘K</Kbd>
        </Button>
      </D.Trigger>
      <D.Trigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Search"><Search /></Button></D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-navy/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[min(92vw,36rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-lg focus-visible:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95" aria-describedby={undefined}>
          <D.Title className="sr-only">Search</D.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-subtle" aria-hidden />
            <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder={pages ? 'Search pages, students, teachers, classes' : 'Search students, teachers, classes'} aria-label="Search"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-subtle" role="combobox" aria-expanded aria-controls="search-results" aria-activedescendant={flat[active] ? `hit-${active}` : undefined} />
            <Kbd>Esc</Kbd>
          </div>
          <div ref={listRef} id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {term.length < 2 && !flat.length ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">Type at least two letters</p>
              : isFetching && !flat.length ? <div className="space-y-2 p-2"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
              : !flat.length ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches for “{term}”</p>
              : flat.map(({ g, x, to }) => {
                idx += 1; const i = idx; const showHead = g !== last; last = g;
                return (
                  <div key={`${g}-${x._id ?? x.id ?? x.sectionId ?? i}`}>
                    {showHead && <p className="px-3 pb-1 pt-3 text-xs font-medium capitalize text-muted-foreground">{g}</p>}
                    <button id={`hit-${i}`} role="option" aria-selected={i === active} data-active={i === active} type="button" onMouseMove={() => setActive(i)} onClick={() => go(to)}
                      className={cn('flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm', i === active ? 'bg-muted' : '')}>
                      <span className="truncate">{x.name || x.title || x.label || x.code}</span>
                      {x.admissionNo && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{x.admissionNo}</span>}
                      {g === 'pages' && <span className="shrink-0 text-xs text-muted-foreground">{(flat[i] as { sub?: string }).sub}</span>}
                      {i === active && <CornerDownLeft className="ml-auto size-3.5 text-subtle" aria-hidden />}
                    </button>
                  </div>
                );
              })}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
