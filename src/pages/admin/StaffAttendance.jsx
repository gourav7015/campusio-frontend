import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../../components/ui.jsx';
import StaffRegister from '../../components/StaffRegister.jsx';

/** School Admin: the daily register of teachers and of non-teaching staff. Transport staff are marked by the Transport officer. */
export default function StaffAttendance() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'teachers';
  return (
    <div className="stack">
      <PageHeader title="Staff attendance" subtitle="A register for every working day. Everyone starts as present — mark who is absent, late or on a half day, then submit. Pay is reduced automatically for absences." />
      <Tabs tabs={[['teachers', 'Teachers'], ['general', 'Non-teaching staff']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      <StaffRegister key={tab} base="/api/school/staff-attendance" group={tab} />
      <p className="muted small">Drivers, conductors and other transport staff are marked by the Transport officer — see Transport (view).</p>
    </div>
  );
}
