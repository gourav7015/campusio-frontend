import { PageHeader } from '../../components/ui.jsx';
import StaffLeaveDesk from '../../components/StaffLeaveDesk.jsx';

/** School Admin: leave of non-teaching staff. Transport staff leave is decided by the Transport officer. */
export default function StaffLeaveAdmin() {
  return (
    <div className="stack">
      <PageHeader title="Staff leave" subtitle="Applications from non-teaching staff (maids, sweepers, gardeners, guards, clerks…). Teachers' leave is under Teacher leave." />
      <StaffLeaveDesk base="/api/school/staff-leave" staffBase="/api/school/support-staff" />
    </div>
  );
}
