import { useMemo, useState, type ReactNode } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { EmptyState, ErrorState, Skeleton } from './feedback';

/** Column `meta`: `align: 'right'` for numbers, `hideBelow` to drop a column on small screens, `className` for the cell. */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> { align?: 'left' | 'right'; hideBelow?: 'sm' | 'md' | 'lg'; className?: string }
}

const hide = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden' } as const;

export function Pagination({ page, pageCount, total, pageSize, onPage }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const from = total === 0 ? 0 : page * pageSize + 1; const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums" aria-live="polite">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="icon-sm" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)}><ChevronLeft /></Button>
        <span className="min-w-16 text-center tabular-nums">Page {page + 1} of {Math.max(1, pageCount)}</span>
        <Button variant="secondary" size="icon-sm" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}><ChevronRight /></Button>
      </div>
    </div>
  );
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  data: T[] | undefined;
  loading?: boolean; error?: unknown; onRetry?: () => void;
  searchPlaceholder?: string; searchable?: boolean;
  toolbar?: ReactNode;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T, index: number) => string;
  emptyTitle?: string; emptyDescription?: ReactNode; emptyAction?: ReactNode;
  initialSort?: SortingState;
  caption?: string;
  className?: string;
}

/** Sortable, searchable, paginated table. Click a header to sort; the search box filters every visible column. */
export function DataTable<T>({ columns, data, loading, error, onRetry, searchPlaceholder = 'Search', searchable = true, toolbar, pageSize = 15, onRowClick, getRowId, emptyTitle = 'Nothing here yet', emptyDescription, emptyAction, initialSort = [], caption, className }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [filter, setFilter] = useState('');
  const rows = useMemo(() => data ?? [], [data]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows, columns, getRowId, state: { sorting, globalFilter: filter }, onSortingChange: setSorting, onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: (row, _id, value) => row.getAllCells().some((c) => { const v = c.getValue(); return v != null && typeof v !== 'object' && String(v).toLowerCase().includes(String(value).toLowerCase()); }),
  });
  const { pageIndex } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const filtered = filter && total === 0;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-xs', className)}>
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input value={filter} onChange={(e) => { setFilter(e.target.value); table.setPageIndex(0); }} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm placeholder:text-subtle hover:border-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20" />
            </div>
          )}
          {toolbar && <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{toolbar}</div>}
        </div>
      )}
      {error ? <ErrorState error={error} onRetry={onRetry} /> : loading ? (
        <div className="space-y-px p-3" role="status" aria-label="Loading">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 rounded" />)}</div>
      ) : rows.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        : filtered ? <EmptyState icon={SearchX} title="No matches" description={`Nothing matches “${filter}”.`} action={<Button size="sm" onClick={() => setFilter('')}>Clear search</Button>} />
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm tabular-nums">
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => {
                        const m = h.column.columnDef.meta; const sortable = h.column.getCanSort(); const dir = h.column.getIsSorted();
                        return (
                          <th key={h.id} scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                            className={cn('h-10 whitespace-nowrap border-b border-border bg-muted/60 px-4 text-left text-xs font-medium text-muted-foreground', m?.align === 'right' && 'text-right', m?.hideBelow && hide[m.hideBelow])}>
                            {h.isPlaceholder ? null : sortable ? (
                              <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', m?.align === 'right' && 'flex-row-reverse')}>
                                {flexRender(h.column.columnDef.header, h.getContext())}
                                {dir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : dir === 'desc' ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}
                              </button>
                            ) : flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((r) => (
                    <tr key={r.id} onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                      onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r.original); } : undefined} tabIndex={onRowClick ? 0 : undefined}
                      className={cn('border-b border-border last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none')}>
                      {r.getVisibleCells().map((c) => {
                        const m = c.column.columnDef.meta;
                        return <td key={c.id} className={cn('px-4 py-3 align-middle', m?.align === 'right' && 'text-right', m?.hideBelow && hide[m.hideBelow], m?.className)}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > pageSize && <Pagination page={pageIndex} pageCount={table.getPageCount()} total={total} pageSize={pageSize} onPage={(p) => table.setPageIndex(p)} />}
          </>
        )}
    </div>
  );
}
