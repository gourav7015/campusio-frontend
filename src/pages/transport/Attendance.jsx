import { PageHeader } from '../../components/ui.jsx';
import StaffRegister from '../../components/StaffRegister.jsx';

/** The daily register of drivers, conductors and other transport staff. Read-only for the School Admin. */
export default function TransportAttendance({ base, readOnly = false }) {
  return (
    <div className="stack">
      <PageHeader title="Transport staff attendance" subtitle={readOnly ? 'Marked by the Transport officer.' : 'Mark who is absent, late or on a half day among your drivers, conductors and other transport staff, then submit. Pay is reduced automatically for absences.'} />
      <StaffRegister base={`${base}/attendance`} group="transport" canEdit={!readOnly} />
    </div>
  );
}
