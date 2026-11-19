import { Navigate, useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../../components/ui.jsx';
import StaffLeaveDesk from '../../components/StaffLeaveDesk.jsx';
import LeaveBalances from '../../components/LeaveBalances.jsx';
import { LeaveAdmin } from './Operations.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

/** Leave of everyone who works at the school, in one place: teaching staff, non-teaching staff and transport crew. */
export default function LeaveHub() {
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const sub = user?.adminLevel === 'sub'; const may = (k) => !sub || (user.permissions || []).includes(k);
  const people = [...(may('teachers') ? [['teachers', 'Teaching staff']] : []), ...(may('staff_attendance') ? [['general', 'Non-teaching staff'], ['transport', 'Transport crew']] : [])];
  const tabs = people.length ? [...people, ['balances', 'Leave balances']] : [];
  if (!tabs.length) return <Navigate to="/admin" replace />;
  const tab = tabs.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : tabs[0][0];
  return (
    <div className="stack">
      <PageHeader title="Leave" subtitle="Leave applications of teachers, non-teaching staff and the transport crew. Transport leave appears here when the Transport officer passes it on, or when the school keeps that decision for you." />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'balances' && <LeaveBalances may={may} isOwner={!sub} />}
      {tab === 'teachers' && <LeaveAdmin embedded />}
      {tab === 'general' && <StaffLeaveDesk key="general" base="/api/school/staff-leave" staffBase="/api/school/support-staff" />}
      {tab === 'transport' && <StaffLeaveDesk key="transport" base="/api/school/transport-leave" staffBase="/api/school/transport/staff" canRecord={false} />}
    </div>
  );
}
