import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useGet } from '../../api/query';
import { LinkCard } from '../../design/patterns';
import { Badge, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../design/ui';
import PunchCard from '../../components/PunchCard.jsx';
import { fmtDate, fmtMoney, label } from '../../components/ui.jsx';

interface Dash {
  name: string; designation?: string; today: string;
  attendance: { percentage: number | null; absent: number; half_day: number };
  balances: { casual: { remaining: number; allowance: number }; sick: { remaining: number; allowance: number } };
  pendingLeave: number; lastPayslip?: { month: string; net: number; status: string };
  salaryRevision?: { effectiveFrom: string; appliesFromMonth: string } | null;
}
const S = '/api/staff';

export default function StaffDashboard() {
  const { data: x, error, refetch } = useGet<Dash>(`${S}/dashboard`);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  const a = x.attendance;
  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${x.name}`} description={`${x.designation || 'Staff'} · ${fmtDate(x.today, true)}`} />
      <PunchCard base={S} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Attendance this year" value={a.percentage != null ? `${a.percentage}%` : '—'} hint={`${a.absent} absent · ${a.half_day} half day`} to="/staff/attendance" />
        <StatCard label="Casual leave left" value={x.balances.casual.remaining} hint={`of ${x.balances.casual.allowance}`} to="/staff/leave" />
        <StatCard label="Sick leave left" value={x.balances.sick.remaining} hint={`of ${x.balances.sick.allowance}`} to="/staff/leave" />
        <StatCard label="Leave waiting for approval" value={x.pendingLeave} to="/staff/leave" />
      </div>
      {x.lastPayslip && (
        <LinkCard title="Latest payslip" to="/staff/payslips" linkLabel="All payslips">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden><Wallet className="size-5" strokeWidth={1.75} /></span>
              <div><p className="text-sm text-muted-foreground">{new Date(`${x.lastPayslip.month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p><p className="text-2xl font-semibold tabular-nums tracking-tight">{fmtMoney(x.lastPayslip.net)}</p></div></div>
            <Badge tone={x.lastPayslip.status === 'paid' ? 'success' : 'warning'} dot>{label(x.lastPayslip.status)}</Badge>
          </div>
          {x.salaryRevision && <p className="mt-3 text-sm text-muted-foreground">Your salary was revised from {fmtDate(x.salaryRevision.effectiveFrom, true)}. It applies from the {new Date(`${x.salaryRevision.appliesFromMonth}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })} payroll, so this payslip does not change.</p>}
        </LinkCard>
      )}
      <p className="text-sm text-muted-foreground">Need to change your details? <Link to="/staff/profile" className="font-medium text-primary-ink hover:underline">Open your profile</Link></p>
    </div>
  );
}
