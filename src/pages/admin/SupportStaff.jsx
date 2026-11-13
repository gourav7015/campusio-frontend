import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui.jsx';
import StaffManager from '../../components/StaffManager.jsx';

/** School Admin: every non-teaching staff member — drivers, conductors, maintainers, maids, sweepers, gardeners, guards, clerks… */
export default function SupportStaff() {
  return (
    <div className="stack">
      <PageHeader title="Non-teaching staff" subtitle="Everyone who works at the school but does not teach: maids, sweepers, gardeners, guards, clerks and more. Job titles (designations) are your own — add as many as you need." />
      <div className="alert info">Drivers, conductors, maintainers and all other transport staff are added and managed by the <b>Transport officer</b>. You can see them under <Link to="/admin/transport?tab=staff">Transport (view)</Link>.</div>
      <StaffManager staffBase="/api/school/support-staff" designationBase="/api/school/designations" canEdit group="general" noun="staff member" />
    </div>
  );
}
