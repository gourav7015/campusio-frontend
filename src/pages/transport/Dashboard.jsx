import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Card, DataTable, PageHeader, Stat, fmtDate } from '../../components/ui.jsx';
import { BarsChart } from '../../components/Charts.jsx';

/** Transport desk dashboard: fleet, crew, seats, and everything that needs attention. Read-only for the School Admin. */
export default function TransportDashboard({ base, links = {} }) {
  const d = useApi(`${base}/dashboard`);
  return (
    <div className="stack">
      <PageHeader title="Transport" subtitle="Your fleet, crew and riders at a glance." />
      <Async state={d}>{(x) => (<>
        <div className="grid g4">
          <Stat value={x.buses.running} label="Buses running" sub={`${x.buses.total} in total${x.buses.maintenance ? ` · ${x.buses.maintenance} in maintenance` : ''}`} tone="blue" />
          <Stat value={x.riders} label="Students ride" sub={x.occupancy != null ? `${x.occupancy}% of seats taken · ${x.seatsFree} free` : undefined} tone="green" />
          <Stat value={x.staff.total} label="Transport staff" sub={x.staff.byDesignation.filter((s) => s.count).map((s) => `${s.count} ${s.name}`).join(' · ') || 'None added yet'} />
          <Stat value={x.needsCrew.length + x.alerts.length} label="Need attention" sub={`${x.needsCrew.length} bus(es) short of crew · ${x.alerts.length} certificate(s)`} tone={x.needsCrew.length + x.alerts.length ? 'red' : 'green'} />
        </div>
        <div className="grid g2">
          <Card title="Buses short of a driver or conductor" flush><DataTable rows={x.needsCrew} empty="Every running bus has a driver and a conductor" columns={[
            { label: 'Bus', render: (b) => (links.buses ? <Link to={links.buses}><b>{b.busNo}</b></Link> : <b>{b.busNo}</b>) }, { label: 'Missing', render: (b) => b.missing.map((m) => <Badge key={m} tone="amber">{m}</Badge>) }]} /></Card>
          <Card title="Drivers and conductors not on a bus" flush><DataTable rows={x.idleCrew} empty="Everyone is on a bus" columns={[{ label: 'Name', render: (s) => <b>{s.name}</b> }, { label: 'ID', key: 'staffId' }, { label: 'Role', key: 'designation' }]} /></Card>
        </div>
        <Card title="Certificates and licences to renew (expired or within 30 days)" flush><DataTable rows={x.alerts} rowKey="date" empty="Nothing is due" columns={[{ label: 'Bus', render: (a) => <b>{a.bus}</b> }, { label: 'What', render: (a) => a.field }, { label: 'Date', render: (a) => fmtDate(a.date, true) }, { label: '', render: (a) => <Badge tone={a.expired ? 'red' : 'amber'}>{a.expired ? 'Expired' : 'Expiring soon'}</Badge> }]} /></Card>
        {x.fullBuses.length > 0 && <Card title="Busiest buses (riders)"><BarsChart data={x.fullBuses.map((b) => ({ bus: b.busNo, Riders: b.riders, Seats: b.capacity }))} x="bus" bars={[{ key: 'Riders' }, { key: 'Seats' }]} /></Card>}
      </>)}</Async>
    </div>
  );
}
