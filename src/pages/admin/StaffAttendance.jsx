import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../../components/ui.jsx';
import StaffRegister from '../../components/StaffRegister.jsx';

/** The tabs of the Staff portal's attendance desk. (The School Admin's own page is Attendance, under Administration.) */
function Registers({ base, transportBase }) {
  const [sp, setSp] = useSearchParams();
  const tabs = [['teachers', 'Teaching staff'], ['general', 'Non-teaching staff'], ['office', 'Officers (finance, library, transport)'], ...(transportBase ? [['transport', 'Transport crew']] : [])];
  const tab = tabs.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : 'teachers';
  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'transport'
        ? <><StaffRegister key="transport" base={transportBase} group="transport" canEdit={false} /><p className="muted small">Drivers, conductors and other transport crew are marked by the Transport officer. You can read their register here.</p></>
        : <StaffRegister key={tab} base={base} group={tab} />}
    </>
  );
}

/** The Staff portal's attendance desk: teaching staff, non-teaching staff and officers. Never the transport crew. */
export function AttendanceDesk() {
  return (
    <div className="stack">
      <PageHeader title="Mark attendance" subtitle="Take the daily register for teachers, non-teaching staff and the school's officers. Everyone starts as present: mark who is absent, late or on a half day, then submit." />
      <Registers base="/api/staff/attendance-desk" />
    </div>
  );
}
