import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Card, DataTable, PageHeader, Stat, fmtDate } from '../../components/ui.jsx';
import Heatmap from '../../components/Heatmap.jsx';
import PunchCard from '../../components/PunchCard.jsx';

/** A teacher's own attendance for the year, from the daily staff register. Read-only. */
export default function MyAttendance() {
  const q = useApi('/api/teacher/my-attendance');
  return (
    <div className="stack">
      <PageHeader title="My attendance" subtitle="Marked by the school office. If something looks wrong, tell the administrator." />
      <PunchCard base="/api/teacher" />
      <Async state={q}>{(d) => {
        const s = d.summary;
        const marked = d.days.filter((x) => x.working && x.rawStatus && !['present'].includes(x.rawStatus));
        return (
          <>
            <div className="grid g4"><Stat value={s.percentage != null ? `${s.percentage}%` : '—'} label="Attendance this year" tone="green" /><Stat value={s.present + s.late} label="Days present" sub={s.late ? `${s.late} late` : undefined} /><Stat value={s.absent} label="Days absent" tone={s.absent ? 'red' : 'green'} sub="deducted from salary" /><Stat value={s.half_day + s.leave} label="Half days / leave" sub={`${s.half_day} half day · ${s.leave} leave`} /></div>
            <Card title="Attendance heat map — this academic year"><Heatmap days={d.days} /></Card>
            {d.source !== 'registers' && <div className="alert info">The school office has not started the daily staff register yet, so this shows only what your approved leave implies.</div>}
            <Card title="Days that were not a normal present day" flush><DataTable rows={marked} rowKey="date" empty="Nothing to show — present every day that has been marked" columns={[{ label: 'Date', render: (x) => fmtDate(x.date, true) }, { label: 'Status', render: (x) => <Badge tone={x.rawStatus === 'absent' ? 'red' : x.rawStatus === 'leave' ? 'blue' : 'amber'}>{x.rawStatus === 'half_day' ? 'Half day' : x.rawStatus[0].toUpperCase() + x.rawStatus.slice(1)}</Badge> }, { label: 'Remark', key: 'remark' }]} /></Card>
          </>
        );
      }}</Async>
    </div>
  );
}
