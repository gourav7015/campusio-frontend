import {
  Award, BarChart3, Building2, Bus, CalendarDays, CalendarRange, ClipboardList, Clock, CreditCard, FileSpreadsheet, FileText, GraduationCap,
  IndianRupee, KeyRound, Layers, LayoutDashboard, Mail, Megaphone, MessagesSquare, NotebookPen, PlaneTakeoff, Scale, School, ScrollText, Settings, SlidersHorizontal, TrendingUp,
  Upload, UserCheck, UserRound, Users, Wallet, BookMarked, BookOpen, ArrowLeftRight, BadgeCheck, ShieldCheck, Landmark, PiggyBank, Receipt, MessageCircle, MessageSquareWarning, Repeat, Info, HelpCircle, LifeBuoy, Smartphone, AlertTriangle, Flag, Inbox, FilePenLine, type LucideIcon,
} from 'lucide-react';

export type PortalKey = 'platform' | 'admin' | 'teacher' | 'student' | 'finance' | 'library' | 'transport' | 'staff';
export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; /** API path that returns { count }: shown as a small number beside the label */ badge?: string }
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
    groups: [{ items: [{ ...dash('/platform'), label: 'Overview' }, { to: '/platform/schools', label: 'Schools', icon: Building2 }, { to: '/platform/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/platform/helpdesk/summary' }, { to: '/platform/audit', label: 'Audit log', icon: ScrollText }, { to: '/platform/errors', label: 'Errors', icon: AlertTriangle }] }],
  },
  admin: {
    key: 'admin', title: 'School admin', home: '/admin', variant: 'workspace', api: '/api/school', search: true,
    groups: [
      { items: [dash('/admin'), { to: '/admin/approvals', label: 'Approvals', icon: BadgeCheck }] },
      { label: 'People', items: [
        { to: '/admin/students', label: 'Students', icon: GraduationCap }, { to: '/admin/classes', label: 'Classes and sections', icon: Layers },
        { to: '/admin/employees', label: 'Employees', icon: Users }, { to: '/admin/designations', label: 'Designations', icon: BadgeCheck }, { to: '/admin/houses', label: 'Houses', icon: Flag }, { to: '/admin/payroll', label: 'Payroll and salaries', icon: Wallet },
      ] },
      { label: 'Daily operations', items: [
        { to: '/admin/timetable', label: 'Timetable', icon: CalendarDays }, { to: '/admin/leave', label: 'Leave', icon: PlaneTakeoff },
        { to: '/admin/exams', label: 'Examinations', icon: ClipboardList },
        { to: '/admin/fees', label: 'Fees (view)', icon: IndianRupee }, { to: '/admin/library', label: 'Library (view)', icon: BookMarked }, { to: '/admin/transport', label: 'Transport (view)', icon: Bus },
      ] },
      { label: 'Communication', items: [{ to: '/admin/announcements', label: 'Announcements', icon: Megaphone }, { to: '/admin/events', label: 'Calendar and events', icon: CalendarDays }, { to: '/admin/messages', label: 'Messages', icon: Mail }, { to: '/admin/queries', label: 'Teachers\' queries', icon: Inbox, badge: '/api/school/queries/summary' }, { to: '/admin/school-info', label: 'School information', icon: Info }] },
      { label: 'Administration', items: [
        { to: '/admin/attendance', label: 'Attendance', icon: UserCheck }, { to: '/admin/years', label: 'Academic years', icon: CalendarRange }, { to: '/admin/promotion', label: 'Year-end promotion', icon: TrendingUp },
        { to: '/admin/import', label: 'Data import', icon: Upload }, { to: '/admin/reports', label: 'Reports and exports', icon: BarChart3 }, { to: '/admin/staff', label: 'Desk logins', icon: KeyRound },
        { to: '/admin/sub-admins', label: 'Sub-admins', icon: ShieldCheck }, { to: '/admin/settings', label: 'School settings', icon: Settings }, { to: '/admin/documents', label: 'Receipts and payslips', icon: FilePenLine }, { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
        { to: '/admin/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/school/helpdesk/summary' }, { to: '/admin/guide', label: 'Quick guide', icon: HelpCircle },
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
        { to: '/teacher/attendance', label: 'Attendance', icon: UserCheck }, { to: '/teacher/period-attendance', label: 'Period attendance', icon: Clock }, { to: '/teacher/homework', label: 'Homework', icon: NotebookPen }, 
        { to: '/teacher/exams', label: 'Examinations and marks', icon: ClipboardList }, { to: '/teacher/performance', label: 'Student performance', icon: TrendingUp }, { to: '/teacher/house', label: 'My house', icon: Flag },
      ] },
      { label: 'School', items: [{ to: '/teacher/library', label: 'Library', icon: BookMarked }, { to: '/teacher/communication', label: 'Communication', icon: MessagesSquare }, { to: '/teacher/chats', label: 'Parent messages', icon: MessageCircle }, { to: '/teacher/remarks', label: 'Remarks', icon: MessageSquareWarning }, { to: '/teacher/swaps', label: 'Period swaps', icon: Repeat }, { to: '/teacher/school-info', label: 'School information', icon: Info }] },
      { label: 'Me', items: [
        { to: '/teacher/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/teacher/queries', label: 'Queries to the office', icon: Inbox, badge: '/api/teacher/queries/summary' }, { to: '/teacher/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/teacher/tickets/summary' }, { to: '/teacher/leave', label: 'Leave', icon: PlaneTakeoff }, { to: '/teacher/my-attendance', label: 'My attendance', icon: Clock },
        { to: '/teacher/salary', label: 'Salary and payslips', icon: Wallet }, { to: '/teacher/profile', label: 'My profile', icon: UserRound }, { to: '/teacher/guide', label: 'Quick guide', icon: HelpCircle },
      ] },
    ],
  },
  student: {
    key: 'student', title: 'Student & Parent', home: '/student', variant: 'personal', api: '/api/student', search: false,
    tabs: ['/student', '/student/timetable', '/student/attendance', '/student/results'],
    groups: [
      { items: [{ ...dash('/student'), label: 'Home' }] },
      { label: 'Learning', items: [
        { to: '/student/timetable', label: 'My timetable', icon: CalendarDays }, 
        { to: '/student/exams', label: 'Examinations', icon: ClipboardList }, { to: '/student/results', label: 'Results and class ranks', icon: Award }, { to: '/student/performance', label: 'My performance', icon: TrendingUp },
      ] },
      { label: 'School', items: [
        { to: '/student/attendance', label: 'My attendance', icon: UserCheck }, { to: '/student/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/student/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/student/fees', label: 'Fee information', icon: IndianRupee }, { to: '/student/library', label: 'Library', icon: BookMarked },
        { to: '/student/remarks', label: 'Teacher remarks', icon: MessageSquareWarning }, { to: '/student/chats', label: 'Message a teacher', icon: MessageCircle }, { to: '/student/school-info', label: 'About the school', icon: Info },
      ] },
      { label: 'Me', items: [{ to: '/student/profile', label: 'My profile', icon: UserRound }, { to: '/student/documents', label: 'My documents', icon: FileText }, { to: '/student/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/student/tickets/summary' }, { to: '/student/settings', label: 'Settings', icon: SlidersHorizontal }, { to: '/student/guide', label: 'Quick guide', icon: HelpCircle }] },
    ],
  },
  finance: {
    key: 'finance', title: 'Finance', home: '/finance', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/finance'), { to: '/finance/structures', label: 'Fee structures', icon: FileSpreadsheet }, { to: '/finance/policy', label: 'Fee policy', icon: Scale },
      { to: '/finance/students', label: 'Students and dues', icon: Users }, { to: '/finance/payments', label: 'Payments and receipts', icon: CreditCard }, { to: '/finance/online', label: 'Online payments', icon: Smartphone }, { to: '/finance/defaulters', label: 'Defaulters', icon: AlertTriangle }, { to: '/finance/reports', label: 'Reports', icon: BarChart3 },
      { to: '/finance/expenses', label: 'Expenditure', icon: Receipt }, { to: '/finance/budgets', label: 'Budgets', icon: PiggyBank }, { to: '/finance/profile', label: 'Tax and bank details', icon: Landmark }, { to: '/finance/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/finance/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/finance/tickets/summary' }, { to: '/finance/school-info', label: 'School licences', icon: Info },
    ] }],
  },
  library: {
    key: 'library', title: 'Library', home: '/library', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/library'), { to: '/library/desk', label: 'Issue and Return', icon: ArrowLeftRight }, { to: '/library/books', label: 'Catalogue', icon: BookMarked },
      { to: '/library/loans', label: 'Loans and Overdue', icon: Clock }, { to: '/library/classes', label: 'By class', icon: School }, { to: '/library/settings', label: 'Library rules', icon: SlidersHorizontal }, { to: '/library/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/library/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/library/tickets/summary' }, { to: '/library/school-info', label: 'School information', icon: Info },
    ] }],
  },
  transport: {
    key: 'transport', title: 'Transport', home: '/transport', variant: 'workspace', api: null, search: false,
    groups: [{ items: [
      dash('/transport'), { to: '/transport/buses', label: 'Buses and riders', icon: Bus }, { to: '/transport/staff', label: 'Drivers and staff', icon: Users },
      { to: '/transport/attendance', label: 'Staff attendance', icon: Clock }, { to: '/transport/leave', label: 'Staff leave', icon: PlaneTakeoff }, { to: '/transport/calendar', label: 'School calendar', icon: CalendarDays }, { to: '/transport/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/transport/tickets/summary' }, { to: '/transport/school-info', label: 'School information', icon: Info },
    ] }],
  },
  staff: {
    key: 'staff', title: 'Staff', home: '/staff', variant: 'personal', api: null, search: false,
    tabs: ['/staff', '/staff/attendance-desk', '/staff/leave', '/staff/queries'],
    groups: [{ items: [
      dash('/staff'), { to: '/staff/attendance-desk', label: 'Attendance', icon: UserCheck }, { to: '/staff/leave', label: 'Leave', icon: PlaneTakeoff }, { to: '/staff/employees', label: 'Employees', icon: Users },
      { to: '/staff/queries', label: 'Teachers\' queries', icon: MessageCircle, badge: '/api/staff/queries/summary' }, { to: '/staff/calendar', label: 'School calendar', icon: CalendarDays },
      { to: '/staff/helpdesk', label: 'Help desk', icon: LifeBuoy, badge: '/api/staff/tickets/summary' }, { to: '/staff/school-info', label: 'School information', icon: Info }, { to: '/staff/profile', label: 'My profile', icon: UserRound },
    ] }],
  },
};

/** Pages reached from another page rather than from the menu, with the page they belong under (for the breadcrumb). */
export const HIDDEN_PAGES: Record<string, { label: string; parent: { label: string; to: string } }> = {
  '/admin/past-sessions': { label: 'Past sessions', parent: { label: 'Academic years', to: '/admin/years' } }, // opened with "View data" on an earlier year
};

export const flatNav = (p: Portal) => p.groups.flatMap((g) => g.items);

/** Which sub-admin permission opens each School admin page. Pages not listed here belong to the full School Admin. */
export const ADMIN_PAGE_PERMISSION: Record<string, string | string[] | null> = {
  '/admin': null, '/admin/approvals': 'approvals', '/admin/years': 'academics', '/admin/past-sessions': 'academics', '/admin/classes': 'academics', '/admin/timetable': 'academics', '/admin/promotion': 'academics',
  '/admin/students': 'students', '/admin/houses': 'students', '/admin/designations': ['teachers', 'staff_attendance'], '/admin/queries': ['communication', 'staff_attendance'], '/admin/employees': ['teachers', 'staff_attendance'], '/admin/import': 'students', '/admin/teachers': 'teachers', '/admin/leave': ['teachers', 'staff_attendance'],
  '/admin/support-staff': 'staff_attendance', '/admin/staff-attendance': 'staff_attendance', '/admin/attendance': ['attendance', 'staff_attendance'], '/admin/staff-leave': 'staff_attendance',
  '/admin/exams': 'exams', '/admin/announcements': 'communication', '/admin/events': 'communication', '/admin/messages': 'communication', '/admin/school-info': 'communication',
  '/admin/payroll': 'payroll', '/admin/fees': 'finance_view', '/admin/library': 'library_view', '/admin/transport': 'transport_view', '/admin/reports': 'reports', '/admin/guide': null, '/admin/helpdesk': null,
};

/** The portal as one signed-in person sees it: a sub-admin gets only the pages their permissions open. */
export function portalFor(p: Portal, user?: { adminLevel?: string; permissions?: string[]; canMarkAttendance?: boolean; periodWise?: boolean } | null): Portal {
  if (p.key === 'teacher' && !user?.periodWise) return { ...p, groups: p.groups.map((g) => ({ ...g, items: g.items.filter((i) => i.to !== '/teacher/period-attendance') })) };
  // a staff member sees "Mark attendance" only when the School Admin has given them the attendance desk
  if (p.key === 'staff') return user?.canMarkAttendance ? p : { ...p, groups: p.groups.map((g) => ({ ...g, items: g.items.filter((i) => i.to !== '/staff/attendance-desk') })) };
  if (p.key !== 'admin' || user?.adminLevel !== 'sub') return p;
  const perms = new Set(user.permissions || []);
  const groups = p.groups.map((g) => ({ ...g, items: g.items.filter((i) => { const need = ADMIN_PAGE_PERMISSION[i.to]; return need === null || (need !== undefined && (Array.isArray(need) ? need.some((n) => perms.has(n)) : perms.has(need))); }) })).filter((g) => g.items.length);
  return { ...p, groups };
}
