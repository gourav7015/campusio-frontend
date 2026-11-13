import { cn } from '../design/lib/cn';

/** A cover tile made from the book's own title and category (no cover images are stored). The tone comes from the category, from design tokens. */
const TONES = ['bg-primary-soft text-primary-ink', 'bg-success-soft text-success-ink', 'bg-warning-soft text-warning-ink', 'bg-tone-soft text-tone-ink', 'bg-muted text-muted-foreground'];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function BookCover({ title, category, className }: { title: string; category?: string; className?: string }) {
  const tone = TONES[hash(category || 'general') % TONES.length];
  const initials = title.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (
    <div aria-hidden className={cn('relative grid aspect-[3/4] place-items-center overflow-hidden rounded-md border border-border/60 p-3 text-center', tone, className)}>
      <span className="absolute inset-y-0 left-0 w-2 bg-foreground/10" />
      <span className="text-3xl font-semibold tracking-tight">{initials}</span>
    </div>
  );
}
