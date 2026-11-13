import { Link } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { Badge, EmptyState } from '../design/ui';
import { cn } from '../design/lib/cn';

export interface Period {
  startTime: string; endTime: string; period: string; isBreak?: boolean; free?: boolean; status?: 'current' | 'next' | 'completed' | 'upcoming';
  subject?: string; sectionLabel?: string; sectionId?: string; teacher?: string; room?: string; studentCount?: number;
  substitute?: boolean; originalTeacher?: string; unresolved?: boolean; attendance?: string;
}

/** One day as a timeline: time on the left, lesson on the right. The current period carries the tone; breaks are quiet dividers. */
export function DaySchedule({ rows, showSection, showTeacher, empty = 'No scheduled classes', openClass }: { rows?: Period[]; showSection?: boolean; showTeacher?: boolean; empty?: string; openClass?: boolean }) {
  const list = rows ?? [];
  if (!list.some((r) => !r.isBreak && !r.free)) return <EmptyState title={empty} className="py-8" />;
  return (
    <ol className="space-y-1.5">
      {list.map((r, i) => {
        if (r.isBreak) return <li key={i} className="flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground"><span className="w-[5.5rem] tabular-nums">{r.startTime}</span><Coffee className="size-3.5" aria-hidden /><span>{r.period}</span></li>;
        if (r.free) return <li key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"><span className="w-[5.5rem] tabular-nums">{r.startTime}–{r.endTime}</span><span>Free · {r.period}</span></li>;
        const now = r.status === 'current'; const done = r.status === 'completed';
        return (
          <li key={i} aria-current={now ? 'time' : undefined} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', now ? 'border-primary/30 bg-primary-soft' : 'border-transparent hover:bg-muted', done && 'text-muted-foreground')}>
            <span className={cn('w-[5.5rem] shrink-0 text-sm tabular-nums', now ? 'font-medium text-primary-ink' : 'text-muted-foreground')}>{r.startTime}–{r.endTime}</span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-medium', done ? 'text-muted-foreground' : 'text-foreground')}>{r.subject || 'Teacher to be assigned'}{showSection && r.sectionLabel && <span className="font-normal text-muted-foreground"> · {r.sectionLabel}</span>}</span>
              <span className="block truncate text-xs text-muted-foreground">{[r.period, showTeacher && r.teacher, r.room && `Room ${r.room}`, r.studentCount != null && `${r.studentCount} students`].filter(Boolean).join(' · ')}</span>
            </span>
            {r.substitute && <Badge tone="warning">{showTeacher ? `Substitute for ${r.originalTeacher}` : 'Covering'}</Badge>}
            {r.unresolved && <Badge tone="danger">No teacher</Badge>}
            {now && <Badge tone="primary" dot>Now</Badge>}{r.status === 'next' && <Badge tone="warning">Next</Badge>}
            {openClass && r.sectionId && <Link to={`/teacher/classes/${r.sectionId}`} className="shrink-0 text-[13px] font-medium text-primary-ink hover:underline">Open class</Link>}
          </li>
        );
      })}
    </ol>
  );
}
