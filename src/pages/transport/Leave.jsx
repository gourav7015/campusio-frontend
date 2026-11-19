import { PageHeader } from '../../components/ui.jsx';
import StaffLeaveDesk from '../../components/StaffLeaveDesk.jsx';

/** Leave of drivers, conductors and other transport staff. Read-only for the School Admin. */
export default function TransportLeave({ base, readOnly = false }) {
  return (
    <div className="stack">
      <PageHeader title="Transport staff leave" subtitle={readOnly ? 'Decided by the Transport officer, or by the School Admin when it is passed on.' : 'Approve leave for your drivers, conductors and other transport staff, or send it to the school admin to decide. The admin is told about every leave you record.'} />
      <StaffLeaveDesk base={`${base}/leave`} staffBase={`${base}/staff`} canEdit={!readOnly} transport />
    </div>
  );
}
