import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client.js';
import { useGet } from '../api/query';
import { Button, Popover, PopoverContent, PopoverTrigger, EmptyState, Skeleton } from '../design/ui';
import { fmtDateTime } from '../components/ui.jsx';

interface Notice { _id: string; title: string; body?: string; createdAt: string; readAt?: string; link?: { type?: string } }
interface NoticeList { unread: number; items: Notice[] }

/** Which page explains a notification, inside the viewer's own portal. */
const PAGE_FOR: Record<string, string> = {
  homework: 'homework', attendance: 'attendance', material: 'materials', announcement: 'announcements', result: 'results', exam: 'exams',
  timetable: 'timetable', leave: 'leave', marks: 'exams', message: 'messages', fees: 'fees', library: 'library',
};
const targetFor = (role: string, type?: string) => `/${role}/${PAGE_FOR[type ?? ''] ?? 'notifications'}`;

export function Notifications({ base, role }: { base: string; role: string }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useGet<NoticeList>(`${base}/notifications`, { limit: 8 }, { refetchInterval: 60_000, staleTime: 10_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: [`${base}/notifications`] });
  const open1 = async (n: Notice) => {
    if (!n.readAt) await post(`${base}/notifications/${n._id}/read`).catch(() => undefined);
    setOpen(false); refresh(); nav(targetFor(role, n.link?.type));
  };
  const unread = data?.unread ?? 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-on-accent tabular-nums">{unread > 99 ? '99+' : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="link" size="sm" disabled={!unread} onClick={async () => { await post(`${base}/notifications/read-all`); refresh(); }}>Mark all read</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? <div className="space-y-2 p-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            : data?.items?.length ? data.items.map((n) => (
              <button key={n._id} type="button" onClick={() => open1(n)} className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} aria-hidden />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{n.title}</span>{n.body && <span className="line-clamp-2 text-[13px] text-muted-foreground">{n.body}</span>}<span className="mt-0.5 block text-xs text-subtle">{fmtDateTime(n.createdAt)}</span></span>
              </button>
            )) : <EmptyState icon={Bell} title="You are all caught up" className="py-8" />}
        </div>
        <Link to={`/${role}/notifications`} onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-[13px] font-medium text-primary-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">View all</Link>
      </PopoverContent>
    </Popover>
  );
}
