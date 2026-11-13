import { PageHeader } from '../../components/ui.jsx';
import StaffManager from '../../components/StaffManager.jsx';

/** Drivers, conductors, maintainers and any other transport title the school adds. Read-only for the School Admin. */
export default function TransportStaff({ base, readOnly = false }) {
  return (
    <div className="stack">
      <PageHeader title="Transport staff" subtitle={readOnly ? 'Managed by the Transport officer.' : 'Add drivers, conductors, maintainers and other transport staff, then put them on buses. Job titles are your own — add as many as you need.'} />
      <StaffManager staffBase={`${base}/staff`} designationBase={`${base}/designations`} canEdit={!readOnly} group="transport" noun="transport staff member" />
    </div>
  );
}
