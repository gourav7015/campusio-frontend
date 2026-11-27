import { ClipboardCheck } from 'lucide-react';
import { useGet } from '../../api/query';
import { Badge, Button, Card, CardHeader, CardTitle } from '../../design/ui';
import StaffRegister from '../../components/StaffRegister.jsx';

interface Reg { date: string; blocked?: string | null; session: { status: string } | null; totals: { people: number; present: number; late: number; halfDay: number; absent: number; leave: number } }

/**
 * The Transport officer's crew register for today, on the home page like the teacher's "Today's register": how it stands, and a button that opens the
 * register right here to mark, review and submit (drivers, conductors and the rest of the transport crew).
 */
export function TodayCrewRegister({ base, open, onToggle }: { base: string; open: boolean; onToggle: () => void }) {
  const today = new Date().toLocaleDateString('en-CA');
  const { data } = useGet<Reg>(`${base}/attendance/register?group=transport&date=${today}`);
  const t = data?.totals; const status = data?.session?.status;
  const state = data?.blocked ? { tone: 'neutral' as const, text: 'Not a working day' } : status === 'submitted' ? { tone: 'success' as const, text: 'Submitted' } : status ? { tone: 'warning' as const, text: 'Started, not submitted' } : { tone: 'warning' as const, text: 'Not taken yet' };
  return (
    <Card id="crew-register">
      <CardHeader>
        <CardTitle>Today’s crew register{t ? ` · ${t.people} crew` : ''}</CardTitle>
        <div className="flex items-center gap-3">
          {data && <Badge tone={state.tone} dot>{state.text}</Badge>}
          {status === 'submitted' && t && <span className="hidden text-sm text-muted-foreground sm:inline">{t.present + t.late} here · {t.absent} absent{t.halfDay ? ` · ${t.halfDay} half day` : ''}{t.leave ? ` · ${t.leave} on leave` : ''}</span>}
          <Button size="sm" variant={open ? undefined : 'primary'} onClick={onToggle} aria-expanded={open}><ClipboardCheck aria-hidden />{open ? 'Close' : status === 'submitted' ? 'Open register' : 'Take attendance'}</Button>
        </div>
      </CardHeader>
      {open && <div className="p-5"><StaffRegister base={`${base}/attendance`} group="transport" canEdit /></div>}
    </Card>
  );
}
