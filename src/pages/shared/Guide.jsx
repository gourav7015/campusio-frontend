import { Card, PageHeader } from '../../components/ui.jsx';

const GUIDES = {
  teacher: {
    title: 'Quick guide for teachers', intro: 'Ten minutes is enough to learn the daily work.',
    steps: [
      ['Sign in and change your starting password', 'The first time, you are asked to choose your own password. Use at least 10 characters with a letter and a number.'],
            ['Take attendance (class teachers)', 'Attendance → pick the date → Mark all present → mark the exceptions → Submit. A submitted register is locked. Missed or late students can be Regularised within a week, with a reason.'],
      ['Attendance on a Sunday or holiday', 'If the school is open for a test or duty, open that day in Attendance and press “Ask the admin to allow it”. You are told when it is approved.'],
      ['Homework and notices', 'Homework and assignments → New. Me and school → Notices → Notice to my class. Choose one class, or “All my classes”. Mark it Urgent for things like a holiday tomorrow.'],
      ['Marks', 'Examinations and marks → open the sheet → enter marks field by field → Submit. The school admin approves, then results are published to students.'],
      ['Remarks and guidelines', 'Open a student → Teacher remarks → write it → Send. The family is reminded every day until they acknowledge. Remarks → Not acknowledged yet shows who has not.'],
      ['Messages from parents', 'Parent messages lists the conversations. You can start one from a student’s page with “Message the family”.'],
      ['Swap a period', 'Period swaps → Ask for a swap. Your colleague agrees first, then the school admin approves.'],
      ['Your own details', 'Your details are kept by the school office. You can add your own photo under My profile.'],
    ],
  },
  student: {
    title: 'Quick guide for students and parents', intro: 'Students and parents use the same login: the student’s login id.',
    steps: [
      ['Your first sign-in', 'Your school gives a starting password. You are asked to choose your own the first time. Keep it private. If you forget it, ask the school office to reset it.'],
      ['Home', 'Today’s timetable, homework, attendance, upcoming exams, and anything waiting for you.'],
      ['Homework', 'Homework and assignments shows what each teacher has set and when it is due. You do not need to mark it done: your teacher checks it in class.'],
      ['Attendance', 'My attendance shows every day of the year. If a mark looks wrong, use “Report an error” in Daily history.'],
      ['Results', 'Results and class ranks show every test of the class and your own rank.'],
      ['Remarks from teachers', 'Teacher remarks lists notes from teachers. Read each one and press “I have read this”. You are reminded until you do.'],
      ['Ask a teacher', 'Message a teacher lets you write to your class teacher or any subject teacher. Please keep messages about school.'],
      ['Calendar', 'School calendar shows holidays (government holidays in green), exams, events and homework deadlines. Tap a day to see everything on it.'],
      ['Fees', 'Fee information shows what is billed, any personal discount, and what is paid. Payments are made at the school’s fee desk.'],
    ],
  },
  admin: {
    title: 'Quick guide for the school administrator', intro: 'The parts you will use most.',
    steps: [
      ['Set up once', 'Academic years → Classes and sections → Teachers → Timetable. Classes are LKG, UKG and Class 1 to 12. Section names are capitals (A, B, C).'],
      ['Admit students', 'Students → Admit student. The form shows the fees and lets you give a personal discount (with a reason). The student’s starting password is the first four letters of the name in capitals plus the date of birth. Data can also be imported.'],
      ['Approvals', 'Approvals collects what is waiting for you: classes ready to move to the next year, expenses from Finance, period swaps agreed by both teachers, and attendance on closed days.'],
      ['Moving classes to the next year', 'A class moves as a whole, all its sections together, and each class on its own dates. First set up the next year: Subjects and teachers shows each class’s subjects and who teaches them, and anything with nobody assigned is marked. Then open Year-end promotion, tick the classes whose session has ended, review the students and confirm. A class already moved is left alone, and a year closes only when every class has left it. A wrongly moved student can be put back from the student’s page until something is recorded in the new year. When classes are in two years, pick the year to look at in the header.'],
      ['Sub-admins', 'Sub-admins creates a limited admin login, for example only staff attendance. You choose exactly what each one can open.'],
      ['Desk logins', 'Finance, Library and Transport logins are created here. Their emails and logins come from you; you can reset the password any time.'],
      ['Staff attendance and leave', 'Staff attendance takes the daily register for teachers and non-teaching staff. Leave can be approved, edited or recorded for someone who cannot apply.'],
      ['Money', 'You can see fees, expenditure and budgets but not change them: Finance records them. You approve expenses.'],
      ['School page', 'School information is the page families see: the story, gallery, and the licences and approvals the school holds.'],
    ],
  },
};

export default function Guide({ role }) {
  const g = GUIDES[role];
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <PageHeader title={g.title} subtitle={g.intro} />
      {g.steps.map(([h, t], i) => <Card key={h}><div className="row" style={{ alignItems: 'flex-start' }}><span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgb(var(--c-primary-soft))', color: 'rgb(var(--c-primary-ink))', display: 'grid', placeItems: 'center', fontWeight: 600, flex: 'none' }}>{i + 1}</span><div><b>{h}</b><p style={{ margin: '4px 0 0' }}>{t}</p></div></div></Card>)}
    </div>
  );
}
