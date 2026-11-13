import { PageHeader } from '../../components/ui.jsx';
import StaffLeaveDesk from '../../components/StaffLeaveDesk.jsx';

/** Leave of drivers, conductors and other transport staff. Read-only for the School Admin. */
export default function TransportLeave({ base, readOnly = false }) {
  return (
    <div className="stack">
      <PageHeader title="Transport staff leave" subtitle={readOnly ? 'Decided by the Transport officer.' : 'Applications from your drivers, conductors and other transport staff. Approve them, or record a leave you were told about.'} />
      <StaffLeaveDesk base={`${base}/leave`} staffBase={`${base}/staff`} canEdit={!readOnly} />
    </div>
  );
}
