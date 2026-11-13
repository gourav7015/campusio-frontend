import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { Shell } from './components/Layout.jsx';
import { Spinner, ToastProvider } from './components/ui.jsx';
import PortalLogin, { Landing, homeFor } from './pages/Login.jsx';
import Account from './pages/shared/Account.jsx';
import LibraryMine from './pages/shared/LibraryMine.jsx';
import { NotificationsPage, AnnouncementsPage, Communication } from './pages/shared/Shared.jsx';
import { PlatformDashboard, Schools, SchoolDetail, PlatformAudit } from './pages/platform/Platform.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import { Years } from './pages/admin/Academics.jsx';
import { ClassHub, ClassDetail } from './pages/admin/ClassHub.jsx';
import SupportStaff from './pages/admin/SupportStaff.jsx';
import StaffAttendance from './pages/admin/StaffAttendance.jsx';
import StaffLeaveAdmin from './pages/admin/StaffLeave.jsx';
import TransportLeave from './pages/transport/Leave.jsx';
import TransportAttendance from './pages/transport/Attendance.jsx';
import MyAttendance from './pages/teacher/MyAttendance.jsx';
import { StaffDashboard, StaffAttendance as StaffMyAttendance, StaffLeave as StaffMyLeave, StaffPayslips, StaffProfile } from './pages/staff/Staff.jsx';
import TransportDashboard from './pages/transport/Dashboard.jsx';
import Buses from './pages/transport/Buses.jsx';
import TransportStaff from './pages/transport/TransportStaff.jsx';
import { Students, StudentDetail, Teachers, TeacherDetail } from './pages/admin/People.jsx';
import { Timetable, LeaveAdmin } from './pages/admin/Operations.jsx';
import { Exams as AdminExams, ExamDetail } from './pages/admin/Exams.jsx';
import { AnnouncementsAdmin, Events, MessagesAdmin } from './pages/admin/Comms.jsx';
import { Promotion, Import, Reports, Settings, Audit } from './pages/admin/Tools.jsx';
import { AdminFees, AdminLibrary, AdminTransport, Staff } from './pages/admin/Views.jsx';
import Payroll from './pages/admin/Payroll.jsx';
import Salary from './pages/teacher/Salary.jsx';
import { FinanceDashboard, FeeStructures, FeePolicy, StudentsDues, StudentAccount, Payments, FinanceReports } from './pages/finance/Finance.jsx';
import { LibraryDashboard, Desk, Books, BookDetail, Loans, LibrarySettings, ByClass } from './pages/library/Library.jsx';
import * as T1 from './pages/teacher/Teacher1.jsx';
import * as T2 from './pages/teacher/Teacher2.jsx';
import * as S1 from './pages/student/Student1.jsx';
import * as S2 from './pages/student/Student2.jsx';

const AREA = { super_admin: 'platform', school_admin: 'admin', teacher: 'teacher', student: 'student', finance: 'finance', library: 'library', transport: 'transport', staff: 'staff' };

/** Each portal has its own sign-in URL: /student/login, /teacher/login, /finance/login, /library/login, /transport/login, /admin/login, /platform/login. */
function Guard({ roles, area, children }) {
  const { user, loading, acting } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/${roles.length === 2 ? 'admin' : AREA[roles[0]]}/login`} replace state={{ from: loc.pathname }} />;
  if (user.mustChangePassword && loc.pathname !== '/account') return <Navigate to="/account?force=1" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  // Super Admin must pick a school (act-as) before the school admin portal
  if (area === 'admin' && user.role === 'super_admin' && !acting) return <Navigate to="/platform/schools" replace />;
  return children;
}

const AccountShell = () => { const { user } = useAuth(); return <Shell area={AREA[user.role]} />; };

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        {['student', 'teacher', 'finance', 'library', 'transport', 'staff', 'admin', 'platform'].map((p) => <Route key={p} path={`/${p}/login`} element={<PortalLogin portal={p} />} />)}
        <Route element={user ? <AccountShell /> : <Navigate to="/" replace />}><Route path="/account" element={<Account />} /></Route>

        <Route path="/platform" element={<Guard roles={['super_admin']}><Shell area="platform" /></Guard>}>
          <Route index element={<PlatformDashboard />} /><Route path="schools" element={<Schools />} /><Route path="schools/:id" element={<SchoolDetail />} /><Route path="audit" element={<PlatformAudit />} />
        </Route>

        <Route path="/admin" element={<Guard roles={['school_admin', 'super_admin']} area="admin"><Shell area="admin" /></Guard>}>
          <Route index element={<AdminDashboard />} /><Route path="years" element={<Years />} /><Route path="classes" element={<ClassHub />} /><Route path="classes/:sectionId" element={<ClassDetail />} />
          <Route path="students" element={<Students />} /><Route path="students/:id" element={<StudentDetail />} /><Route path="teachers" element={<Teachers />} /><Route path="teachers/:id" element={<TeacherDetail />} /><Route path="assignments" element={<Navigate to="/admin/classes?tab=subjects" replace />} /><Route path="staff" element={<Staff />} />
          <Route path="timetable" element={<Timetable />} /><Route path="attendance" element={<Navigate to="/admin/classes?tab=attendance" replace />} /><Route path="learning" element={<Navigate to="/admin/classes?tab=homework" replace />} /><Route path="exams" element={<AdminExams />} /><Route path="exams/:id" element={<ExamDetail />} /><Route path="leave" element={<LeaveAdmin />} />
          <Route path="fees" element={<AdminFees />} /><Route path="fees/students/:id" element={<StudentAccount readOnly />} /><Route path="library" element={<AdminLibrary />} /><Route path="library/books/:id" element={<BookDetail readOnly />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} /><Route path="events" element={<Events />} /><Route path="messages" element={<MessagesAdmin />} />
          <Route path="payroll" element={<Payroll />} /><Route path="transport" element={<AdminTransport />} /><Route path="support-staff" element={<SupportStaff />} /><Route path="staff-attendance" element={<StaffAttendance />} /><Route path="staff-leave" element={<StaffLeaveAdmin />} /><Route path="promotion" element={<Promotion />} /><Route path="import" element={<Import />} /><Route path="reports" element={<Reports />} /><Route path="settings" element={<Settings />} /><Route path="audit" element={<Audit />} />
          <Route path="notifications" element={<NotificationsPage role="admin" base="/api/school" />} />
        </Route>

        <Route path="/finance" element={<Guard roles={['finance']}><Shell area="finance" /></Guard>}>
          <Route index element={<FinanceDashboard />} /><Route path="structures" element={<FeeStructures />} /><Route path="policy" element={<FeePolicy />} /><Route path="students" element={<StudentsDues />} /><Route path="students/:id" element={<StudentAccount />} /><Route path="payments" element={<Payments />} /><Route path="reports" element={<FinanceReports />} />
        </Route>

        <Route path="/transport" element={<Guard roles={['transport']}><Shell area="transport" /></Guard>}>
          <Route index element={<TransportDashboard base="/api/transport" links={{ buses: '/transport/buses' }} />} /><Route path="buses" element={<Buses base="/api/transport" />} /><Route path="staff" element={<TransportStaff base="/api/transport" />} /><Route path="attendance" element={<TransportAttendance base="/api/transport" />} /><Route path="leave" element={<TransportLeave base="/api/transport" />} />
        </Route>

        <Route path="/staff" element={<Guard roles={['staff']}><Shell area="staff" /></Guard>}>
          <Route index element={<StaffDashboard />} /><Route path="attendance" element={<StaffMyAttendance />} /><Route path="leave" element={<StaffMyLeave />} /><Route path="payslips" element={<StaffPayslips />} /><Route path="profile" element={<StaffProfile />} />
        </Route>

        <Route path="/library" element={<Guard roles={['library']}><Shell area="library" /></Guard>}>
          <Route index element={<LibraryDashboard />} /><Route path="desk" element={<Desk />} /><Route path="books" element={<Books />} /><Route path="books/:id" element={<BookDetail />} /><Route path="loans" element={<Loans />} /><Route path="classes" element={<ByClass />} /><Route path="settings" element={<LibrarySettings />} />
        </Route>

        <Route path="/teacher" element={<Guard roles={['teacher']}><Shell area="teacher" /></Guard>}>
          <Route index element={<T1.TeacherDashboard />} /><Route path="timetable" element={<T1.TeacherTimetable />} /><Route path="classes" element={<T1.Classes />} /><Route path="classes/:sectionId" element={<T1.ClassWorkspace />} /><Route path="students/:id" element={<T1.StudentView />} />
          <Route path="subjects" element={<T1.Subjects />} /><Route path="attendance" element={<T1.Attendance />} /><Route path="homework" element={<T2.Homework />} /><Route path="materials" element={<T2.Materials />} />
          <Route path="exams" element={<T2.Exams />} /><Route path="exams/:examSubjectId/:sectionId" element={<T2.MarksSheet />} /><Route path="marks" element={<Navigate to="/teacher/exams" replace />} /><Route path="performance" element={<T2.Performance />} />
          <Route path="salary" element={<Salary />} /><Route path="my-attendance" element={<MyAttendance />} /><Route path="communication" element={<Communication />} /><Route path="announcements" element={<AnnouncementsPage base="/api/teacher" />} /><Route path="messages" element={<Communication />} /><Route path="library" element={<LibraryMine base="/api/teacher" />} /><Route path="leave" element={<T2.Leave />} /><Route path="profile" element={<T2.Profile />} />
          <Route path="notifications" element={<NotificationsPage role="teacher" base="/api/teacher" />} />
        </Route>

        <Route path="/student" element={<Guard roles={['student']}><Shell area="student" /></Guard>}>
          <Route index element={<S1.StudentDashboard />} /><Route path="profile" element={<S1.StudentProfile />} /><Route path="timetable" element={<S1.StudentTimetable />} /><Route path="attendance" element={<S1.StudentAttendance />} />
          <Route path="homework" element={<S1.StudentHomework />} /><Route path="materials" element={<S1.StudentMaterials />} /><Route path="exams" element={<S2.StudentExams />} /><Route path="results" element={<S2.StudentResults />} /><Route path="results/:examId" element={<S2.ResultDetail />} />
          <Route path="performance" element={<S2.StudentPerformance />} /><Route path="calendar" element={<S2.StudentCalendar />} /><Route path="announcements" element={<AnnouncementsPage base="/api/student" />} /><Route path="fees" element={<S2.StudentFees />} /><Route path="library" element={<LibraryMine base="/api/student" />} /><Route path="documents" element={<S2.StudentDocuments />} /><Route path="settings" element={<S2.StudentSettings />} />
          <Route path="notifications" element={<NotificationsPage role="student" base="/api/student" />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/'} replace />} />
      </Routes>
    </ToastProvider>
  );
}
