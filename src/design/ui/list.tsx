import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Pagination } from './data-table';

/** The frame for a filterable list: one rounded surface holding the filter bar, the table and the footer. */
export const ListCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cn('overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs', className)}>{children}</section>
);

/** Search box on the left, filters (any controls) on the right; wraps on phones. */
export function FilterBar({ search, onSearch, searchLabel, placeholder, children, className }: { search: string; onSearch: (v: string) => void; searchLabel: string; placeholder?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b border-border/70 p-3', className)}>
      <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input value={search} onChange={(e) => onSearch(e.target.value)} aria-label={searchLabel} placeholder={placeholder ?? searchLabel}
          className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm placeholder:text-subtle hover:border-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20" />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:ml-auto [&_select]:w-auto [&_select]:min-w-[9rem]">{children}</div>}
    </div>
  );
}

/** Footer for a server-paged list: "35 students" and previous/next. Hidden when everything fits on one page. */
export function ListFooter({ total, noun, page, pageSize, onPage }: { total: number; noun: string; page: number; pageSize: number; onPage: (p: number) => void }) {
  if (total > pageSize) return <Pagination page={page - 1} pageCount={Math.ceil(total / pageSize)} total={total} pageSize={pageSize} onPage={(p) => onPage(p + 1)} />;
  return <div className="border-t border-border/70 px-4 py-3 text-sm tabular-nums text-muted-foreground">{total} {noun}{total === 1 ? '' : 's'}</div>;
}
