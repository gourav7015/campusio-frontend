import { EmptyState, Badge } from '../design/ui';
import { BookCover } from './BookCover';

interface Book { _id: string; title: string; author?: string; category?: string; available: number; total: number }

/** Catalogue view: cover tiles with availability. The table view stays for inventory work. */
export default function BookGrid({ items, onOpen }: { items: Book[]; onOpen: (b: Book) => void }) {
  if (!items?.length) return <EmptyState title="No books yet" description="Add a title and its copies to start the catalogue." />;
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {items.map((b) => (
        <li key={b._id}>
          <button type="button" onClick={() => onOpen(b)} className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="transition-transform duration-150 group-hover:-translate-y-0.5"><BookCover title={b.title} category={b.category} /></div>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
            <p className="truncate text-xs text-muted-foreground">{b.author || 'Unknown author'}</p>
            <div className="mt-1.5"><Badge tone={b.available > 0 ? 'success' : 'danger'} dot>{b.available > 0 ? `${b.available} of ${b.total} available` : 'All on loan'}</Badge></div>
          </button>
        </li>
      ))}
    </ul>
  );
}
