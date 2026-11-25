import { Bus, GraduationCap, IndianRupee, Book, Monitor, ShieldCheck, SquareCheckBig } from 'lucide-react';

/**
 * The words and icon of each sign-in page. Colours are not here: every page takes the portal's own tone from the same tokens the
 * dashboards use (see data-portal in src/design/tokens.css), so the outside and the inside always match, in light and in dark.
 */
export const THEMES = {
  student: { name: 'Student and parent', tag: 'Everything for the child, in one place.', sub: 'Sign in with the login id your school gave you.', who: 'your school office', icon: GraduationCap, eyebrow: 'Student and parent', heading: 'Welcome back', hint: 'Your school day, homework, results and fees.', note: 'Parents sign in with the student\'s login ID, printed on the slip from the school office.',
    band: { h: 'Your school day, in one place.', p: 'Check the timetable, hand in homework and follow results and fees from one login.' } },
  teacher: { name: 'Teacher', tag: 'Your classes, ready when you are.', sub: 'Sign in with the login id your school gave you.', who: 'your school office', icon: Monitor, eyebrow: 'Teacher', heading: 'Sign in to Teacher', hint: 'Use the login the school office gave you.',
    band: { h: 'Good morning, teacher.', p: 'Everything for today\'s classes is ready when you are.' } },
  transport: { name: 'Transport', tag: 'Every route, every rider.', sub: 'Sign in with the login id your School Admin gave you.', who: 'your School Admin', icon: Bus, eyebrow: 'Transport', heading: 'Transport sign in', hint: 'For the school\'s transport officer.',
    band: { h: 'Every stop, on time.', p: 'Buses, routes, drivers and riders in one place.' } },
  finance: { name: 'Finance', tag: 'Fees, receipts and dues.', sub: 'Sign in with the login id your School Admin gave you.', who: 'your School Admin', icon: IndianRupee, eyebrow: 'Finance', heading: 'Sign in to Finance', hint: 'For the school\'s accounts officer.',
    band: { h: 'Fees, receipts and dues.', p: 'Collect, reconcile and follow up from one desk.' } },
  library: { name: 'Library', tag: 'Books in, books out.', sub: 'Sign in with the login id your School Admin gave you.', who: 'your School Admin', icon: Book, eyebrow: 'Library', heading: 'Sign in to Library', hint: 'For the school\'s librarian.',
    band: { h: 'Every book in its place.', p: 'Catalogue, issue and return, tracked accurately.' } },
  staff: { name: 'Staff', tag: 'The office desk, organised.', sub: 'Sign in with the login id your school gave you.', who: 'your school office', icon: SquareCheckBig, eyebrow: 'Staff', heading: 'Staff sign in', hint: 'For office staff with desk access.',
    band: { h: 'The office desk.', p: 'Attendance, leave and queries, handled in one place.' } },
  admin: { name: 'School admin', tag: 'Run the whole school.', sub: 'Sign in with your administrator login id.', who: 'the AtKaksha team', icon: ShieldCheck, eyebrow: 'School Admin', heading: 'Admin sign in', hint: 'For the school administrator.',
    band: { h: 'Run the whole school.', p: 'Students, staff, fees and reports under one login.' } },
  platform: { name: 'Platform administrator', tag: 'AtKaksha platform control.', sub: 'For the AtKaksha team only.', who: 'another platform administrator', icon: ShieldCheck, eyebrow: 'Platform Admin', heading: 'Platform sign in', hint: 'Restricted: for the platform operator only.',
    band: { h: 'Every school, one console.', p: 'Schools, subscriptions and support, for the platform operator.' } },
};

/** The rows of the "choose your portal" page. */
export const CHOICES = [
  { key: 'student', title: 'Student and parent', text: 'Timetable, homework, attendance, results and fees.' },
  { key: 'teacher', title: 'Teacher', text: 'Classes, registers, homework, marks and leave.' },
  { key: 'staff', title: 'Staff', text: 'The office desk: attendance, leave and queries.' },
  { key: 'finance', title: 'Finance', text: 'Fees, receipts and dues.' },
  { key: 'library', title: 'Library', text: 'Catalogue, issue and return, fines.' },
  { key: 'transport', title: 'Transport', text: 'Buses, routes and riders.' },
  { key: 'admin', title: 'School admin', text: 'Run the whole school.' },
];
