import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { AppShell } from './shell/AppShell';

// Development-only reference for the design system (not built into production).
const Gallery = import.meta.env.DEV ? lazy(() => import('./design/Gallery')) : null;
import { Spinner, ToastProvider } from './components/ui.jsx';
import { DialogsProvider, OfflineBanner } from './design/ui';
import NotFound from './pages/NotFound';
const Privacy = lazy(() => import('./pages/legal/Legal').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/legal/Legal').then((m) => ({ default: m.Terms })));
const Cookies = lazy(() => import('./pages/legal/Legal').then((m) => ({ default: m.Cookies })));
const Refunds = lazy(() => import('./pages/legal/Legal').then((m) => ({ default: m.Refunds })));
import PortalLogin, { Landing, homeFor } from './pages/Login.jsx';
const Approvals = lazy(() => import('./pages/admin/Admin2.jsx').then((m) => ({ default: m.Approvals })));
const SubAdmins = lazy(() => import('./pages/admin/Admin2.jsx').then((m) => ({ default: m.SubAdmins })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const DocumentSettings = lazy(() => import('./pages/admin/DocumentSettings.jsx'));
const SchoolInfoAdmin = lazy(() => import('./pages/admin/Admin2.jsx').then((m) => ({ default: m.SchoolInfoAdmin })));
const Guide = lazy(() => import('./pages/shared/Guide.jsx'));
const SchoolInfoPage = lazy(() => import('./pages/shared/SchoolInfo.jsx').then((m) => ({ default: m.SchoolInfoPage })));
const Expenses = lazy(() => import('./pages/finance/FinanceMore.jsx').then((m) => ({ default: m.Expenses })));
const Budgets = lazy(() => import('./pages/finance/FinanceMore.jsx').then((m) => ({ default: m.Budgets })));
const SpendingReceipts = lazy(() => import('./pages/finance/FinanceMore.jsx').then((m) => ({ default: m.SpendingReceipts })));
const Vendors = lazy(() => import('./pages/finance/FinanceMore.jsx').then((m) => ({ default: m.VendorsHub })));
const TaxBankProfile = lazy(() => import('./pages/finance/FinanceMore.jsx').then((m) => ({ default: m.TaxBankProfile })));
const TeacherChats = lazy(() => import('./pages/teacher/Teacher3.jsx').then((m) => ({ default: m.TeacherChats })));
const TeacherRemarks = lazy(() => import('./pages/teacher/Teacher3.jsx').then((m) => ({ default: m.TeacherRemarks })));
const Swaps = lazy(() => import('./pages/teacher/Teacher3.jsx').then((m) => ({ default: m.Swaps })));
const PeriodAttendance = lazy(() => import('./pages/teacher/Teacher3.jsx').then((m) => ({ default: m.PeriodAttendance })));
const StudentChats = lazy(() => import('./pages/student/Student3.jsx').then((m) => ({ default: m.StudentChats })));
const StudentRemarks = lazy(() => import('./pages/student/Student3.jsx').then((m) => ({ default: m.StudentRemarks })));
const Account = lazy(() => import('./pages/shared/Account.jsx'));
const SchoolCalendar = lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentCalendar })));
const deskCalendar = (base) => <SchoolCalendar base={base} subtitle="Holidays and events set by the school office" />;
const AttendanceDesk = lazy(() => import('./pages/admin/StaffAttendance.jsx').then((m) => ({ default: m.AttendanceDesk })));
const AttendanceHub = lazy(() => import('./pages/admin/AttendanceHub.jsx'));
const StudentMarks = lazy(() => import('./pages/admin/StudentMarks.jsx'));
const Employees = lazy(() => import('./pages/admin/Employees.jsx'));
const PastSessions = lazy(() => import('./pages/admin/PastSessions.jsx'));
const HelpDesk = lazy(() => import('./pages/shared/HelpDesk.jsx'));
const TeacherHouse = lazy(() => import('./pages/teacher/TeacherHouse.jsx'));
/** The old Staff attendance address now opens the Attendance page on the same group. */
function StaffAttendanceRedirect() { const [sp] = useSearchParams(); return <Navigate to={`/admin/attendance?tab=${sp.get('tab') || 'teachers'}`} replace />; }
const askAtKaksha = (base) => <HelpDesk base={base} title="Help desk" subtitle="Write to the AtKaksha support team. You get the reply here and by email." />;
const LibraryMine = lazy(() => import('./pages/shared/LibraryMine.jsx'));
const NotificationsPage = lazy(() => import('./pages/shared/Shared.jsx').then((m) => ({ default: m.NotificationsPage })));
const AnnouncementsPage = lazy(() => import('./pages/shared/Shared.jsx').then((m) => ({ default: m.AnnouncementsPage })));
const Communication = lazy(() => import('./pages/shared/Shared.jsx').then((m) => ({ default: m.Communication })));
const PlatformDashboard = lazy(() => import('./pages/platform/Platform.jsx').then((m) => ({ default: m.PlatformDashboard })));
const Schools = lazy(() => import('./pages/platform/Platform.jsx').then((m) => ({ default: m.Schools })));
const SchoolDetail = lazy(() => import('./pages/platform/Platform.jsx').then((m) => ({ default: m.SchoolDetail })));
const PlatformErrors = lazy(() => import('./pages/platform/Platform.jsx').then((m) => ({ default: m.PlatformErrors })));
const PlatformAudit = lazy(() => import('./pages/platform/Platform.jsx').then((m) => ({ default: m.PlatformAudit })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const Years = lazy(() => import('./pages/admin/Academics.jsx').then((m) => ({ default: m.Years })));
const ClassHub = lazy(() => import('./pages/admin/ClassHub.jsx').then((m) => ({ default: m.ClassHub })));
const Assignments = lazy(() => import('./pages/admin/People.jsx').then((m) => ({ default: m.Assignments })));
const ClassDetail = lazy(() => import('./pages/admin/ClassHub.jsx').then((m) => ({ default: m.ClassDetail })));
const SupportStaff = lazy(() => import('./pages/admin/SupportStaff.jsx'));
const Houses = lazy(() => import('./pages/admin/Houses.jsx'));
const Designations = lazy(() => import('./pages/admin/Designations.jsx'));
const LeaveHub = lazy(() => import('./pages/admin/LeaveHub.jsx'));
const TransportLeave = lazy(() => import('./pages/transport/Leave.jsx'));
const TransportAttendance = lazy(() => import('./pages/transport/Attendance.jsx'));
const MyAttendance = lazy(() => import('./pages/teacher/MyAttendance.jsx'));
const StaffDashboard = lazy(() => import('./pages/staff/Staff.jsx').then((m) => ({ default: m.StaffDashboard })));
const StaffLeaveDeskPage = lazy(() => import('./pages/staff/Staff.jsx').then((m) => ({ default: m.StaffLeaveDeskPage })));
const StaffEmployees = lazy(() => import('./pages/staff/Staff.jsx').then((m) => ({ default: m.StaffEmployees })));
const StaffQueries = lazy(() => import('./pages/staff/Staff.jsx').then((m) => ({ default: m.StaffQueries })));
const StaffProfile = lazy(() => import('./pages/staff/Staff.jsx').then((m) => ({ default: m.StaffProfile })));
const TransportDashboard = lazy(() => import('./pages/transport/TransportDashboard'));
const Buses = lazy(() => import('./pages/transport/Buses.jsx'));
const TransportStaff = lazy(() => import('./pages/transport/TransportStaff.jsx'));
const Students = lazy(() => import('./pages/admin/People.jsx').then((m) => ({ default: m.Students })));
const StudentDetail = lazy(() => import('./pages/admin/People.jsx').then((m) => ({ default: m.StudentDetail })));
const Teachers = lazy(() => import('./pages/admin/People.jsx').then((m) => ({ default: m.Teachers })));
const TeacherDetail = lazy(() => import('./pages/admin/People.jsx').then((m) => ({ default: m.TeacherDetail })));
const Timetable = lazy(() => import('./pages/admin/Operations.jsx').then((m) => ({ default: m.Timetable })));
const AdminExams = lazy(() => import('./pages/admin/Exams.jsx').then((m) => ({ default: m.Exams })));
const ExamDetail = lazy(() => import('./pages/admin/Exams.jsx').then((m) => ({ default: m.ExamDetail })));
const AnnouncementsAdmin = lazy(() => import('./pages/admin/Comms.jsx').then((m) => ({ default: m.AnnouncementsAdmin })));
const Events = lazy(() => import('./pages/admin/Comms.jsx').then((m) => ({ default: m.Events })));
const MessagesAdmin = lazy(() => import('./pages/admin/Comms.jsx').then((m) => ({ default: m.MessagesAdmin })));
const ConnectPage = lazy(() => import('./pages/Connect'));
const ConnectAdmin = lazy(() => import('./pages/platform/ConnectAdmin.jsx'));
const ClassStructure = lazy(() => import('./pages/admin/ClassStructure.jsx'));
const Promotion = lazy(() => import('./pages/admin/Tools.jsx').then((m) => ({ default: m.Promotion })));
const Import = lazy(() => import('./pages/admin/Tools.jsx').then((m) => ({ default: m.Import })));
const Reports = lazy(() => import('./pages/admin/Tools.jsx').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/admin/Tools.jsx').then((m) => ({ default: m.Settings })));
const Audit = lazy(() => import('./pages/admin/Tools.jsx').then((m) => ({ default: m.Audit })));
const AdminFees = lazy(() => import('./pages/admin/Views.jsx').then((m) => ({ default: m.AdminFees })));
const AdminLibrary = lazy(() => import('./pages/admin/Views.jsx').then((m) => ({ default: m.AdminLibrary })));
const AdminTransport = lazy(() => import('./pages/admin/Views.jsx').then((m) => ({ default: m.AdminTransport })));
const Staff = lazy(() => import('./pages/admin/Views.jsx').then((m) => ({ default: m.Staff })));
const Payroll = lazy(() => import('./pages/admin/Payroll.jsx'));
const MyClass = lazy(() => import('./pages/teacher/MyClass.jsx'));
const ClassStudent = lazy(() => import('./pages/teacher/ClassStudent.jsx'));
const Salary = lazy(() => import('./pages/teacher/Salary.jsx'));
const FinanceDashboard = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.FinanceDashboard })));
const FeeStructures = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.FeeStructures })));
const FeePolicy = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.FeePolicy })));
const StudentsDues = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.StudentsDues })));
const StudentAccount = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.StudentAccount })));
const Payments = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.Payments })));
const OnlinePayments = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.OnlinePayments })));
const FinanceDefaulters = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.FinanceDefaulters })));
const FinanceReports = lazy(() => import('./pages/finance/Finance.jsx').then((m) => ({ default: m.FinanceReports })));
const LibraryDashboard = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.LibraryDashboard })));
const Desk = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.Desk })));
const Books = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.Books })));
const BookDetail = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.BookDetail })));
const Loans = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.Loans })));
const LibrarySettings = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.LibrarySettings })));
const ByClass = lazy(() => import('./pages/library/Library.jsx').then((m) => ({ default: m.ByClass })));
const T1 = { Attendance: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.Attendance }))), ClassWorkspace: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.ClassWorkspace }))), Classes: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.Classes }))), StudentView: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.StudentView }))), Subjects: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.Subjects }))), TeacherTimetable: lazy(() => import('./pages/teacher/Teacher1.jsx').then((m) => ({ default: m.TeacherTimetable }))) };
const T2 = { Exams: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Exams }))), Homework: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Homework }))), Leave: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Leave }))), MarksSheet: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.MarksSheet }))), Materials: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Materials }))), Performance: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Performance }))), Profile: lazy(() => import('./pages/teacher/Teacher2.jsx').then((m) => ({ default: m.Profile }))) };
const S1 = { StudentAttendance: lazy(() => import('./pages/student/Student1.jsx').then((m) => ({ default: m.StudentAttendance }))), StudentHomework: lazy(() => import('./pages/student/Student1.jsx').then((m) => ({ default: m.StudentHomework }))), StudentMaterials: lazy(() => import('./pages/student/Student1.jsx').then((m) => ({ default: m.StudentMaterials }))), StudentProfile: lazy(() => import('./pages/student/Student1.jsx').then((m) => ({ default: m.StudentProfile }))), StudentTimetable: lazy(() => import('./pages/student/Student1.jsx').then((m) => ({ default: m.StudentTimetable }))) };
const S2 = { ResultDetail: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.ResultDetail }))), StudentCalendar: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentCalendar }))), StudentDocuments: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentDocuments }))), StudentExams: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentExams }))), StudentFees: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentFees }))), StudentClassAnalysis: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentClassAnalysis }))), StudentPerformance: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentPerformance }))), StudentResults: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentResults }))), StudentSettings: lazy(() => import('./pages/student/Student2.jsx').then((m) => ({ default: m.StudentSettings }))) };

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

const AccountShell = () => { const { user } = useAuth(); return <AppShell area={AREA[user.role]} />; };

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return (
    <ToastProvider><DialogsProvider>
      <OfflineBanner />
      <Suspense fallback={<Spinner />}><Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/connect" element={<ConnectPage />} /><Route path="/privacy" element={<Privacy />} /><Route path="/terms" element={<Terms />} /><Route path="/cookies" element={<Cookies />} /><Route path="/refunds" element={<Refunds />} />
        {Gallery && <Route path="/design" element={<Suspense fallback={null}><Gallery /></Suspense>} />}
        <Route path="/login" element={<Navigate to="/" replace />} /><Route path="/forgot-password" element={<ForgotPassword />} />
        {['student', 'teacher', 'finance', 'library', 'transport', 'staff', 'admin', 'platform'].map((p) => <Route key={p} path={`/${p}/login`} element={<PortalLogin portal={p} />} />)}
        <Route element={user ? <AccountShell /> : <Navigate to="/" replace />}><Route path="/account" element={<Account />} /></Route>

        <Route path="/platform" element={<Guard roles={['super_admin']}><AppShell area="platform" /></Guard>}>
          <Route index element={<PlatformDashboard />} /><Route path="connect" element={<ConnectAdmin />} /><Route path="helpdesk" element={<HelpDesk handler platform base="/api/platform/helpdesk" title="Help desk" subtitle="Tickets from schools. Replies reach the school admin by email and in their portal." />} /><Route path="schools" element={<Schools />} /><Route path="schools/:id" element={<SchoolDetail />} /><Route path="audit" element={<PlatformAudit />} /><Route path="errors" element={<PlatformErrors />} />
        </Route>

        <Route path="/admin" element={<Guard roles={['school_admin', 'super_admin']} area="admin"><AppShell area="admin" /></Guard>}>
          <Route index element={<AdminDashboard />} /><Route path="years" element={<Years />} /><Route path="classes" element={<ClassHub />} /><Route path="classes/:sectionId" element={<ClassDetail />} />
          <Route path="students" element={<Students />} /><Route path="students/:id" element={<StudentDetail />} /><Route path="teachers" element={<Teachers />} /><Route path="teachers/:id" element={<TeacherDetail />} /><Route path="assignments" element={<Assignments />} /><Route path="staff" element={<Staff />} />
          <Route path="timetable" element={<Timetable />} /><Route path="attendance" element={<AttendanceHub />} /><Route path="learning" element={<Navigate to="/admin/classes?tab=homework" replace />} /><Route path="exams" element={<AdminExams />} /><Route path="exams/:id" element={<ExamDetail />} /><Route path="leave" element={<LeaveHub />} /><Route path="teacher-leave" element={<Navigate to="/admin/leave?tab=teachers" replace />} />
          <Route path="fees" element={<AdminFees />} /><Route path="fees/students/:id" element={<StudentAccount readOnly />} /><Route path="library" element={<AdminLibrary />} /><Route path="library/books/:id" element={<BookDetail readOnly />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} /><Route path="events" element={<Events />} /><Route path="messages" element={<MessagesAdmin />} />
          <Route path="payroll" element={<Payroll />} /><Route path="transport" element={<AdminTransport />} /><Route path="support-staff" element={<SupportStaff />} /><Route path="staff-attendance" element={<StaffAttendanceRedirect />} /><Route path="staff-leave" element={<Navigate to="/admin/leave?tab=general" replace />} /><Route path="promotion" element={<Promotion />} /><Route path="class-structure" element={<ClassStructure />} /><Route path="import" element={<Import />} /><Route path="reports" element={<Reports />} /><Route path="settings" element={<Settings />} /><Route path="audit" element={<Audit />} />
          <Route path="guide" element={<Guide role="admin" />} /><Route path="approvals" element={<Approvals />} /><Route path="sub-admins" element={<SubAdmins />} /><Route path="school-info" element={<SchoolInfoAdmin />} /><Route path="documents" element={<DocumentSettings />} />
          <Route path="notifications" element={<NotificationsPage role="admin" base="/api/school" />} />
          <Route path="helpdesk" element={askAtKaksha('/api/school/helpdesk')} /><Route path="past-sessions" element={<PastSessions />} /><Route path="employees" element={<Employees />} /><Route path="houses" element={<Houses />} /><Route path="designations" element={<Designations />} /><Route path="queries" element={<HelpDesk noun="query" handler base="/api/school/queries" title="Teachers' queries" subtitle="Questions teachers have sent to the office. The office desk and you can answer; the teacher reads the reply in their portal." />} /><Route path="exams/student/:id" element={<StudentMarks />} />
        </Route>

        <Route path="/finance" element={<Guard roles={['finance']}><AppShell area="finance" /></Guard>}>
          <Route index element={<FinanceDashboard />} /><Route path="structures" element={<FeeStructures />} /><Route path="policy" element={<FeePolicy />} /><Route path="students" element={<StudentsDues />} /><Route path="students/:id" element={<StudentAccount />} /><Route path="payments" element={<Payments />} /><Route path="reports" element={<FinanceReports />} /><Route path="defaulters" element={<FinanceDefaulters />} />
          <Route path="online" element={<OnlinePayments />} /><Route path="payroll" element={<Payroll base="/api/finance/payroll" role="finance" />} /><Route path="expenses" element={<Expenses />} /><Route path="budgets" element={<Budgets />} /><Route path="vendors" element={<Vendors />} /><Route path="vendor-payments" element={<Navigate to="/finance/vendors?sub=payments" replace />} /><Route path="spending-receipts" element={<SpendingReceipts />} /><Route path="profile" element={<TaxBankProfile />} /><Route path="school-info" element={<SchoolInfoPage base="/api/finance" />} /><Route path="helpdesk" element={askAtKaksha('/api/finance/tickets')} /><Route path="calendar" element={deskCalendar('/api/finance')} />
        </Route>

        <Route path="/transport" element={<Guard roles={['transport']}><AppShell area="transport" /></Guard>}>
          <Route index element={<TransportDashboard base="/api/transport" links={{ buses: '/transport/buses' }} />} /><Route path="buses" element={<Buses base="/api/transport" />} /><Route path="staff" element={<TransportStaff base="/api/transport" />} /><Route path="attendance" element={<TransportAttendance base="/api/transport" />} /><Route path="leave" element={<TransportLeave base="/api/transport" />} />
          <Route path="school-info" element={<SchoolInfoPage base="/api/transport" />} /><Route path="helpdesk" element={askAtKaksha('/api/transport/tickets')} /><Route path="calendar" element={deskCalendar('/api/transport')} />
        </Route>

        <Route path="/staff" element={<Guard roles={['staff']}><AppShell area="staff" /></Guard>}>
          <Route index element={<StaffDashboard />} /><Route path="leave" element={<StaffLeaveDeskPage />} /><Route path="employees" element={<StaffEmployees />} /><Route path="queries" element={<StaffQueries />} /><Route path="profile" element={<StaffProfile />} />
          <Route path="school-info" element={<SchoolInfoPage base="/api/staff" />} /><Route path="helpdesk" element={askAtKaksha('/api/staff/tickets')} /><Route path="calendar" element={deskCalendar('/api/staff')} /><Route path="attendance-desk" element={<AttendanceDesk />} />
        </Route>

        <Route path="/library" element={<Guard roles={['library']}><AppShell area="library" /></Guard>}>
          <Route index element={<LibraryDashboard />} /><Route path="desk" element={<Desk />} /><Route path="books" element={<Books />} /><Route path="books/:id" element={<BookDetail />} /><Route path="loans" element={<Loans />} /><Route path="classes" element={<ByClass />} /><Route path="settings" element={<LibrarySettings />} />
          <Route path="school-info" element={<SchoolInfoPage base="/api/library" />} /><Route path="helpdesk" element={askAtKaksha('/api/library/tickets')} /><Route path="calendar" element={deskCalendar('/api/library')} />
        </Route>

        <Route path="/teacher" element={<Guard roles={['teacher']}><AppShell area="teacher" /></Guard>}>
          <Route index element={<TeacherDashboard />} /><Route path="timetable" element={<T1.TeacherTimetable />} /><Route path="my-class" element={<MyClass />} /><Route path="my-class/students/:id" element={<ClassStudent />} /><Route path="classes" element={<T1.Classes />} /><Route path="classes/:sectionId" element={<T1.ClassWorkspace />} /><Route path="students/:id" element={<T1.StudentView />} />
          <Route path="subjects" element={<T1.Subjects />} /><Route path="attendance" element={<T1.Attendance />} /><Route path="homework" element={<T2.Homework />} /><Route path="materials" element={<Navigate to="/teacher" replace />} />
          <Route path="exams" element={<T2.Exams />} /><Route path="exams/:examSubjectId/:sectionId" element={<T2.MarksSheet />} /><Route path="marks" element={<Navigate to="/teacher/exams" replace />} /><Route path="performance" element={<T2.Performance />} /><Route path="house" element={<TeacherHouse />} /><Route path="queries" element={<HelpDesk noun="query" base="/api/teacher/queries" title="Queries to the office" subtitle="Ask the school office about your attendance, your leave or anything else. The office desk and the School Admin answer here." />} />
          <Route path="salary" element={<Salary />} /><Route path="my-attendance" element={<MyAttendance />} /><Route path="communication" element={<Communication />} /><Route path="announcements" element={<AnnouncementsPage base="/api/teacher" />} /><Route path="messages" element={<Communication />} /><Route path="library" element={<LibraryMine base="/api/teacher" />} /><Route path="leave" element={<T2.Leave />} /><Route path="profile" element={<T2.Profile />} />
          <Route path="notifications" element={<NotificationsPage role="teacher" base="/api/teacher" />} />
          <Route path="guide" element={<Guide role="teacher" />} /><Route path="chats" element={<TeacherChats />} /><Route path="remarks" element={<TeacherRemarks />} /><Route path="swaps" element={<Swaps />} /><Route path="period-attendance" element={<PeriodAttendance />} /><Route path="school-info" element={<SchoolInfoPage base="/api/teacher" />} /><Route path="helpdesk" element={askAtKaksha('/api/teacher/tickets')} /><Route path="calendar" element={<SchoolCalendar base="/api/teacher" subtitle="Exams, holidays, events and homework deadlines for your classes" />} />
        </Route>

        <Route path="/student" element={<Guard roles={['student']}><AppShell area="student" /></Guard>}>
          <Route index element={<StudentDashboard />} /><Route path="profile" element={<S1.StudentProfile />} /><Route path="timetable" element={<S1.StudentTimetable />} /><Route path="attendance" element={<S1.StudentAttendance />} />
          <Route path="homework" element={<Navigate to="/student" replace />} /><Route path="materials" element={<Navigate to="/student" replace />} /><Route path="exams" element={<S2.StudentExams />} /><Route path="results" element={<S2.StudentResults />} /><Route path="results/:examId" element={<S2.ResultDetail />} />
          <Route path="performance" element={<S2.StudentPerformance />} /><Route path="class" element={<S2.StudentClassAnalysis />} /><Route path="calendar" element={<S2.StudentCalendar />} /><Route path="announcements" element={<AnnouncementsPage base="/api/student" />} /><Route path="fees" element={<S2.StudentFees />} /><Route path="library" element={<LibraryMine base="/api/student" />} /><Route path="documents" element={<S2.StudentDocuments />} /><Route path="settings" element={<S2.StudentSettings />} />
          <Route path="notifications" element={<NotificationsPage role="student" base="/api/student" />} />
          <Route path="guide" element={<Guide role="student" />} /><Route path="chats" element={<StudentChats />} /><Route path="remarks" element={<StudentRemarks />} /><Route path="school-info" element={<SchoolInfoPage base="/api/student" />} /><Route path="helpdesk" element={askAtKaksha('/api/student/tickets')} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes></Suspense>
    </DialogsProvider></ToastProvider>
  );
}
