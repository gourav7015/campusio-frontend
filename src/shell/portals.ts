import {
  Award, BarChart3, Building2, Bus, CalendarDays, CalendarRange, ClipboardList, Clock, CreditCard, FileSpreadsheet, FileText, FolderOpen, GraduationCap,
  IndianRupee, KeyRound, Layers, LayoutDashboard, Mail, Megaphone, MessagesSquare, NotebookPen, PlaneTakeoff, Scale, School, ScrollText, Settings, SlidersHorizontal, TrendingUp,
  Upload, UserCheck, UserCog, UserRound, Users, Wallet, BookMarked, BookOpen, ArrowLeftRight, type LucideIcon,
} from 'lucide-react';

export type PortalKey = 'platform' | 'admin' | 'teacher' | 'student' | 'finance' | 'library' | 'transport' | 'staff';
export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
export interface NavGroup { label?: string; items: NavItem[] }
/** control: dark operator console. workspace: dense light sidebar. teaching: compact, task-first. personal: floating, friendly. */
export type ShellVariant = 'control' | 'workspace' | 'teaching' | 'personal';
export interface Portal {
  key: PortalKey; title: string; home: string; variant: ShellVariant; groups: NavGroup[];
  /** paths shown in the phone tab bar (the rest sit behind "More") */
  tabs?: string[];
  /** API base for notifications and quick search; null when the portal has neither */
  api: string | null; search: boolean;
}

const dash = (home: string): NavItem => ({ to: home, label: 'Dashboard', icon: LayoutDashboard, end: true });

export const PORTALS: Record<PortalKey, Portal> = {
  platform: {
    key: 'platform', title: 'Platform', home: '/platform', variant: 'control', api: null, search: false,
    groups: [{ items: [{ ...dash('/platform'), label: 'Overview' }, { to: '/platform/schools', label: 'Schools', icon: Building2 }, { to: '/platform/audit', label: 'Audit log', icon: ScrollText }] }],
  },
  admin: {
    key: 'admin', title: 'School admin', home: '/admin', variant: 'workspace', api: '/api/school', search: true,
    groups: [
      { items: [dash('/admin')] },
      { label: 'Academics', items: [{ to: '/admin/years', label: 'Academic years', icon: CalendarRange }, { to: '/admin/classes', label: 'Classes and sections', icon: Layers }] },
      { label: 'People', items: [
        { to: '/admin/students', label: 'Students', icon: GraduationCap }, { to: '/admin/teachers', label: 'Teachers', icon: Users }, { to: '/admin/support-staff', label: 'Non-teaching staff', icon: UserCog },
        { to: '/admin/staff', label: 'Desk logins', icon: KeyRound }, { to: '/admin/payroll', label: 'Payroll and salaries', icon: Wallet },
      ] },
      { label: 'Daily operations', items: [
        { to: '/admin/timetable', label: 'Timetable', icon: CalendarDays }, { to: '/admin/staff-attendance', label: 'Staff attendance', icon: Clock }, { to: '/admin/staff-leave', label: 'Staff leave', icon: PlaneTakeoff },
        { to: '/admin/exams', label: 'Examinations', icon: ClipboardList }, { to: '/admin/leave', label: 'Teacher leave', icon: PlaneTakeoff },
        { to: '/admin/fees', label: 'Fees (view)', icon: IndianRupee }, { to: '/admin/library', label: 'Library (view)', icon: BookMarked }, { to: '/admin/transport', label: 'Transport (view)', icon: Bus },
      ] },
      { label: 'Communication', items: [{ to: '/admin/announcements', label: 'Announcements', icon: Megaphone }, { to: '/admin/events', label: 'Calendar and events', icon: CalendarDays }, { to: '/admin/messages', label: 'Messages', icon: Mail }] },
      { label: 'Administration', items: [
        { to: '/admin/promotion', label: 'Year-end promotion', icon: TrendingUp }, { to: '/admin/import', label: 'Data import', icon: Upload }, { to: '/admin/reports', label: 'Reports and exports', icon: BarChart3 },
        { to: '/admin/settings', label: 'School settings', icon: Settings }, { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
      ] },
    ],
  },
  teacher: {
    key: 'teacher', title: 'Teacher', home: '/teacher', variant: 'teaching', api: '/api/teacher', search: true,
    tabs: ['/teacher', '/teacher/timetable', '/teacher/attendance', '/teacher/classes'],
    groups: [
      { items: [dash('/teacher')] },
      { label: 'Teaching', items: [
        { to: '/teacher/timetable', label: 'My timetable', icon: CalendarDays }, { to: '/teacher/classes', label: 'My classes', icon: School }, { to: '/teacher/subjects', label: 'My subjects', icon: BookOpen },
        { to: '/teacher/attendance', label: 'Attendance', icon: UserCheck }, { to: '/teacher/homework', label: 'Homework and assignments', icon: NotebookPen }, { to: '/teacher/materials', label: 'Study materials', icon: FolderOpen },
        { to: '/teacher/exams', label: 'Examinations and marks', icon: ClipboardList }, { to: '/teacher/performance', label: 'Student performance', icon: TrendingUp },
      ] },
      { label: 'School', items: [{ to: '/teacher/library', label: 'Library', icon: BookMarked }, { to: '/teacher/communication', label: 'Communication', icon: MessagesSquare }] },
      { label: 'Me', items: [
        { to: '/teacher/leave', label: 'Leave', icon: PlaneTakeoff }, { to: '/teacher/my-attendance', label: 'My attendance', icon: Clock },
        { to: '/teacher/salary', label: 'Salary and payslips', icon: Wallet }, { to: '/teacher/profile', label: 'My profile', icon: UserRound },
      ] },
    ],
  },
  student: {
    key: 'student', title: 'Student', home: '/student', variant: 'personal', api: '/api/student', search: false,
    tabs: ['/student', '/student/timetable', '/student/homework', '/student/results'],
    groups: [
      { items: [{ ...dash('/student'), label: 'Home' }] },
      { label: 'Learning', items: [
        { to: '/student/timetable', label: 'My timetable', icon: CalendarDays }, { to: '/student/homework', label: 'Homework and assignments', icon: NotebookPen }, { to: '/student/materials', label: 'Study materials', icon: FolderOpen },
        { to: '/student/exams', label: 'Examinations', icon: ClipboardList }, { to: '/student/results', label: 'Results and class ranks', icon: Award }, { to: '/student/performance', label: 'My performance', icon: TrendingUp },
      ] },
      { label: 'School', items: [
        { to: '/student/attendance', label: 'My attendance', icon: UserCheck }, { to: '/student/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/student/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/student/fees', label: 'Fee information', icon: IndianRupee }, { to: '/student/library', label: 'Library', icon: BookMarked },
      ] },
      { label: 'Me', items: [{ to: '/student/profile', label: 'My profile', icon: UserRound }, { to: '/student/documents', label: 'My documents', icon: FileText }, { to: '/student/settings', label: 'Settings', icon: SlidersHorizontal }] },
    ],
  },
  finance: {
    key: 'finance', title: 'Finance', home: '/finance', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/finance'), { to: '/finance/structures', label: 'Fee structures', icon: FileSpreadsheet }, { to: '/finance/policy', label: 'Fee policy', icon: Scale },
      { to: '/finance/students', label: 'Students and dues', icon: Users }, { to: '/finance/payments', label: 'Payments and receipts', icon: CreditCard }, { to: '/finance/reports', label: 'Reports and defaulters', icon: BarChart3 },
    ] }],
  },
  library: {
    key: 'library', title: 'Library', home: '/library', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/library'), { to: '/library/desk', label: 'Issue and return', icon: ArrowLeftRight }, { to: '/library/books', label: 'Catalogue', icon: BookMarked },
      { to: '/library/loans', label: 'Loans and overdue', icon: Clock }, { to: '/library/classes', label: 'By class', icon: School }, { to: '/library/settings', label: 'Library rules', icon: SlidersHorizontal },
    ] }],
  },
  transport: {
    key: 'transport', title: 'Transport', home: '/transport', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/transport'), { to: '/transport/buses', label: 'Buses and riders', icon: Bus }, { to: '/transport/staff', label: 'Drivers and staff', icon: Users },
      { to: '/transport/attendance', label: 'Staff attendance', icon: Clock }, { to: '/transport/leave', label: 'Staff leave', icon: PlaneTakeoff },
    ] }],
  },
  staff: {
    key: 'staff', title: 'Staff', home: '/staff', variant: 'personal', api: null, search: false,
    tabs: ['/staff', '/staff/attendance', '/staff/leave', '/staff/payslips'],
    groups: [{ items: [
      dash('/staff'), { to: '/staff/attendance', label: 'My attendance', icon: Clock }, { to: '/staff/leave', label: 'Leave', icon: PlaneTakeoff },
      { to: '/staff/payslips', label: 'Salary and payslips', icon: Wallet }, { to: '/staff/profile', label: 'My profile', icon: UserRound },
    ] }],
  },
};

export const flatNav = (p: Portal) => p.groups.flatMap((g) => g.items);
