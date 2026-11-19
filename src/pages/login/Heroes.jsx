import { BarChart3, Book, Bus, Check, ChartColumn, IndianRupee, SquareCheckBig, Users } from 'lucide-react';

/** The pictures beside each sign-in form. Decorative (aria-hidden), made-up sample content, and coloured only from the app's tokens. */
const C = (name, a) => `rgb(var(--c-${name})${a != null ? ` / ${a}` : ''})`;
const fill = (name, a) => ({ fill: C(name, a) });
const PILL = { success: 'bg-success-soft text-success-ink', warning: 'bg-warning-soft text-warning-ink', danger: 'bg-danger-soft text-danger-ink', primary: 'bg-primary-soft text-primary-ink' };
const Pill = ({ tone, children }) => <span className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold leading-4 ${PILL[tone]}`}>{children}</span>;

export const Headline = ({ children, text, tone = false }) => (
  <>
    <h1 className="max-w-[520px] text-[42px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">{children}</h1>
    <p className={`mt-3.5 max-w-[440px] text-[17px] leading-[1.55] ${tone ? 'text-tone-ink' : 'text-muted-foreground'}`}>{text}</p>
  </>
);

// ── Student: a week's timetable ──
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SUBJECT = { Mathematics: 'primary', Science: 'success', English: 'warning', 'Social Studies': 'muted', Hindi: 'danger', Computer: 'primary', Art: 'warning', 'Physical Ed.': 'success' };
const CHIP = { primary: 'bg-primary-soft text-primary-ink', success: 'bg-success-soft text-success-ink', warning: 'bg-warning-soft text-warning-ink', danger: 'bg-danger-soft text-danger-ink', muted: 'bg-muted text-muted-foreground' };
const GRID = [
  ['Mathematics', 'Science', 'English', 'Social Studies', 'Mathematics'], ['English', 'Mathematics', 'Hindi', 'Science', 'Computer'],
  ['Science', 'Social Studies', 'Mathematics', 'English', 'Hindi'], ['Hindi', 'Computer', 'Art', 'Physical Ed.', 'Science'],
];
export function StudentHero() {
  return (
    <>
      <Headline text="Check the timetable, hand in homework and follow results and fees from one login.">Your school day,<br />in one place.</Headline>
      <div aria-hidden="true" className="mt-11 max-w-[632px] rounded-2xl border border-border bg-card p-5 shadow-md">
        <div className="mb-3.5 flex items-center justify-between"><span className="text-[15px] font-semibold">Timetable</span><span className="text-[13px] text-muted-foreground">This week</span></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: '36px repeat(5,1fr)' }}>
          <span />{DAYS.map((d) => <span key={d} className="text-center text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{d}</span>)}
          {GRID.map((row, i) => [<span key={`p${i}`} className="flex items-center text-xs font-semibold text-muted-foreground">P{i + 1}</span>,
            ...row.map((s, j) => <span key={`${i}-${j}`} className={`flex h-[58px] items-center justify-center rounded-lg px-1.5 text-center text-[12.5px] font-semibold leading-tight ${CHIP[SUBJECT[s]]}`}>{s}</span>)])}
        </div>
      </div>
      <div aria-hidden="true" className="mt-7 flex gap-2.5">
        {[[Check, 'Attendance'], [ChartColumn, 'Results'], [IndianRupee, 'Fees']].map(([Ic, t]) => <span key={t} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13.5px] font-medium text-tone-ink"><Ic className="size-4" strokeWidth={1.8} />{t}</span>)}
      </div>
    </>
  );
}

// ── Teacher: three lines of what is ready ──
export function TeacherHero() {
  return (
    <>
      <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">Good morning,<br />teacher.</h1>
      <p className="mt-5 max-w-[440px] text-lg leading-[1.55] text-muted-foreground">Everything for today's classes is ready when you are.</p>
      <div className="mt-10 flex flex-col gap-4">
        {['Class registers and attendance', 'Homework and marks', 'Leave requests'].map((t) => (
          <div key={t} className="flex items-center gap-3 text-base text-foreground">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-tone/40 bg-card text-tone"><Check className="size-4" strokeWidth={2} /></span>{t}
          </div>))}
      </div>
    </>
  );
}

// ── Transport: a route map ──
const STOP = { fontFamily: 'inherit', fontWeight: 600, fontSize: 15, letterSpacing: 1.2, ...fill('fg') };
export function TransportMap() {
  const dots = [[80, 720], [80, 610], [180, 440], [340, 440], [520, 580], [640, 620], [330, 350]];
  return (
    <svg viewBox="0 0 720 800" preserveAspectRatio="xMinYMin slice" className="absolute left-0 top-0 h-full w-full min-w-[720px]" aria-hidden="true">
      <path d="M180 440V350H330" fill="none" style={{ stroke: C('border-strong') }} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80 720V540L180 440H420L520 540V620H640" fill="none" style={{ stroke: C('tone') }} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      {dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="11" strokeWidth="4" style={{ fill: C('surface'), stroke: C('fg') }} />)}
      <text x="106" y="725" style={STOP}>DEPOT</text><text x="106" y="615" style={STOP}>STOP 1</text>
      <text x="180" y="412" textAnchor="middle" style={STOP}>STOP 2</text><text x="340" y="412" textAnchor="middle" style={STOP}>STOP 3</text>
      <text x="494" y="585" textAnchor="end" style={STOP}>STOP 4</text><text x="640" y="592" textAnchor="middle" style={STOP}>SCHOOL</text><text x="330" y="322" textAnchor="middle" style={STOP}>STOP B</text>
      <g><rect x="228" y="476" width="62" height="28" rx="6" style={fill('tone')} /><path d="M252 476l4-8 4 8z" style={fill('tone')} /><text x="259" y="495" textAnchor="middle" style={{ ...STOP, ...fill('tone-fg') }}>BUS</text></g>
    </svg>
  );
}

// ── Finance: collections and receipts ──
const MONTHS = [['Apr', 54.6, 23.4], ['May', 67.08, 18.72], ['Jun', 76.44, 29.64], ['Jul', 87.36, 23.4], ['Aug', 98.28, 32.76], ['Sep', 117, 26.52]];
export function FinanceHero() {
  return (
    <>
      <Headline text="Collect, reconcile and follow up from one desk.">Fees, receipts<br />and dues.</Headline>
      <div aria-hidden="true" className="mt-12 max-w-[608px] rounded-xl border border-border bg-card px-6 pt-[18px] shadow-sm">
        <div className="mb-2.5 flex items-center justify-between"><span className="text-[15px] font-semibold">Collections by month</span>
          <span className="flex gap-4 text-[12.5px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="inline-block size-2.5 bg-tone" />Collected</span><span className="flex items-center gap-1.5"><i className="inline-block size-2.5 bg-tone/30" />Outstanding</span></span></div>
        <svg viewBox="0 0 560 200" width="100%" height="200" className="block">
          {[20, 55, 90, 125].map((y) => <path key={y} d={`M0 ${y}H560`} style={{ stroke: C('border') }} />)}<path d="M0 160H560" strokeWidth="1.5" style={{ stroke: C('border-strong') }} />
          {MONTHS.map(([m, a, b], i) => { const x = 36 + i * 88; return <g key={m}><rect x={x} y={160 - a} width="40" height={a} style={fill('tone')} /><rect x={x} y={160 - a - b} width="40" height={b} style={fill('tone', 0.3)} /><text x={x + 20} y="182" textAnchor="middle" fontSize="12" style={fill('fg-2')}>{m}</text></g>; })}
        </svg>
        <div className="pb-1.5">
          {[['REC-000124', 'Class 6 · A', 'Paid', 'success'], ['REC-000125', 'Class 8 · B', 'Part paid', 'warning'], ['REC-000126', 'Class 9 · A', 'Due', 'danger']].map(([r, c, s, tone]) => (
            <div key={r} className="grid h-[42px] items-center border-t border-border text-[13.5px]" style={{ gridTemplateColumns: '1.2fr 1fr auto' }}><span className="font-mono text-foreground">{r}</span><span className="text-muted-foreground">{c}</span><Pill tone={tone}>{s}</Pill></div>))}
        </div>
      </div>
    </>
  );
}

// ── Library: a wall of book spines, in shades of the portal's tone ──
const SPINES = [[0, 560, 28, 'a'], [30, 600, 42, 'b'], [74, 600, 36, 'c'], [112, 600, 36, 'd'], [150, 600, 24, 'b'], [176, 480, 32, 'b'], [210, 600, 24, 'd'], [236, 600, 32, 'e'], [270, 600, 36, 'c'], [308, 400, 42, 'd'], [352, 440, 20, 'd'], [374, 600, 32, 'c'],
  [408, 440, 20, 'e'], [430, 520, 24, 'a'], [456, 440, 24, 'b'], [482, 520, 36, 'd'], [520, 560, 42, 'b'], [564, 440, 36, 'f'], [602, 520, 24, 'b'], [628, 400, 36, 'b'], [666, 600, 36, 'd'], [704, 480, 14, 'f']];
const SPINE = { a: C('warning', 0.85), b: C('tone', 0.9), c: C('tone', 0.62), d: C('tone', 0.38), e: C('tone', 0.18), f: C('danger', 0.7) };
export function LibraryShelf() {
  return (
    <svg viewBox="0 0 720 800" preserveAspectRatio="xMinYMax slice" className="absolute bottom-0 left-0 h-full w-full min-w-[720px]" aria-hidden="true">
      {SPINES.map(([x, y, w, k]) => <g key={x}><rect x={x} y={y} width={w} height={800 - y} rx="2" style={{ fill: SPINE[k] }} /><rect x={x} y={y + 22} width={w} height="4" style={fill('fg', 0.18)} /><rect x={x} y={y + 34} width={w} height="2" style={fill('fg', 0.18)} /><rect x={x} y="754" width={w} height="4" style={fill('fg', 0.18)} /></g>)}
    </svg>
  );
}

// ── Staff: the three jobs of the desk ──
const COLUMNS = [
  ['Attendance', [[80, 55, 'Marked', 'success'], [64, 40, 'Pending', 'warning'], [72, 48, 'Marked', 'success']]],
  ['Leave', [[70, 50, 'Approved', 'success'], [84, 44, 'Pending', 'warning'], [60, 38, 'Declined', 'danger']]],
  ['Queries', [[76, 52, 'Open', 'primary'], [66, 42, 'Resolved', 'success'], [82, 36, 'Open', 'primary']]],
];
export function StaffHero() {
  return (
    <>
      <Headline text="Attendance, leave and queries, handled in one place.">The office desk.</Headline>
      <div aria-hidden="true" className="mt-11 flex gap-4">
        {COLUMNS.map(([title, cards]) => (
          <div key={title} className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="px-0.5 pb-1 text-[13px] font-bold uppercase tracking-[0.06em] text-tone-ink">{title}</div>
            {cards.map(([a, b, pill, tone], i) => <div key={i} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"><span className="block h-2 rounded bg-border" style={{ width: `${a}%` }} /><span className="block h-2 rounded bg-muted" style={{ width: `${b}%` }} /><span><Pill tone={tone}>{pill}</Pill></span></div>)}
          </div>))}
      </div>
    </>
  );
}

// ── Admin: the areas of the console ──
const AREAS = [[Users, 'Students', 'Admissions and records'], [SquareCheckBig, 'Staff', 'Teachers and office staff'], [IndianRupee, 'Fees', 'Plans, receipts and dues'], [Bus, 'Transport', 'Buses and routes'], [Book, 'Library', 'Catalogue and issues'], [BarChart3, 'Reports', 'Insights across the school']];
export function AdminHero({ heading = <>Run the whole<br />school.</>, text = 'Students, staff, fees and reports under one login.' }) {
  return (
    <>
      <Headline text={text}>{heading}</Headline>
      <div aria-hidden="true" className="mt-12 grid max-w-[660px] grid-cols-3 gap-4">
        {AREAS.map(([Ic, t, d]) => (
          <div key={t} className="flex h-[148px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-tone"><Ic className="size-[26px]" strokeWidth={1.6} /></span>
            <span><span className="block text-base font-semibold text-foreground">{t}</span><span className="mt-1 block text-[12.5px] leading-snug text-muted-foreground">{d}</span></span>
          </div>))}
      </div>
    </>
  );
}
