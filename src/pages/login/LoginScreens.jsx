import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Book, BookOpen, Bus, Check, CreditCard, GraduationCap, IndianRupee, Lock, Monitor, ShieldCheck, SquareCheckBig } from 'lucide-react';
import { usePageTitle, useRobots } from '../../design/lib/page';
import { ThemeToggle } from '../../design/ui';
import { Logo } from '../PublicPage';
import { THEMES, CHOICES } from './themes';
import { artFor } from './PortalArt';

/**
 * The sign-in pages. Everything is coloured from the app's tokens, with each portal's own tone (data-portal), so these pages and the
 * dashboards behind them are one design, in light and in dark. From 1280 px a picture sits beside the form; below that a band replaces it.
 */
const SkipLink = () => <a href="#main-content" className="sr-only z-[80] rounded-md bg-card px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>;
const mainProps = { id: 'main-content', tabIndex: -1 };

/** The AtKaksha mark and the theme switch, along the top of every page. */
function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between px-6 sm:px-10">
      <Link to="/" aria-label="AtKaksha home" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Logo size={32} className="rounded-lg" /><span className="text-[17px] font-semibold tracking-tight">AtKaksha</span></Link>
      <ThemeToggle />
    </header>
  );
}

// ───────── "Choose your portal" ─────────
const ROW_ICON = { student: GraduationCap, teacher: Monitor, staff: SquareCheckBig, finance: IndianRupee, library: Book, transport: Bus, admin: ShieldCheck };
const rise = (n) => ({ className: 'rise', style: { '--n': n } });

function Peek({ Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 text-sm shadow-sm">
      <span className={`grid size-[30px] flex-none place-items-center rounded-[10px] ${tone[0]}`}><Icon className="size-4" strokeWidth={2} aria-hidden="true" /></span>
      <b className="flex-1 font-medium">{label}</b><span className={`font-semibold tabular-nums ${tone[1]}`}>{value}</span>
    </div>
  );
}

/** The front door: big words on the left over a faint outline of the logo; on the right the family portal as a hero card with a peek of the app, then the school team's portals in a grid. */
export function LandingScreen() {
  usePageTitle('Sign in'); useRobots(true);
  const [family, ...team] = CHOICES;
  const FamilyIcon = ROW_ICON[family.key];
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <SkipLink />
      {/* the real logo, very faint, behind everything */}
      <img aria-hidden="true" alt="" src="/mark.png" className="pointer-events-none absolute -bottom-[2%] -left-[30%] w-[120%] max-w-none select-none opacity-[0.05] dark:hidden min-[1021px]:-bottom-[6%] min-[1021px]:-left-[9%] min-[1021px]:w-[62%] min-[1021px]:max-w-[820px]" />
      <img aria-hidden="true" alt="" src="/mark-on-dark.png" className="pointer-events-none absolute -bottom-[2%] -left-[30%] hidden w-[120%] max-w-none select-none opacity-[0.07] dark:block min-[1021px]:-bottom-[6%] min-[1021px]:-left-[9%] min-[1021px]:w-[62%] min-[1021px]:max-w-[820px]" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-5">
        <header className="flex items-center justify-between py-6">
          <Link to="/" aria-label="AtKaksha home" className="inline-flex items-center gap-3 rounded-md text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Logo size={36} className="rounded-[11px] shadow-sm" />AtKaksha</Link>
          <div className="flex items-center gap-1"><Link to="/connect" className="hidden rounded-[10px] px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:block">Help</Link><ThemeToggle /></div>
        </header>

        <main {...mainProps} className="grid items-center gap-9 pb-14 pt-2 focus-visible:outline-none min-[1021px]:min-h-[calc(100dvh-190px)] min-[1021px]:grid-cols-[5fr_7fr] min-[1021px]:gap-[clamp(40px,7vw,96px)] min-[1021px]:pt-[clamp(24px,6vh,64px)]">
          <section {...rise(0)} className="rise max-w-[560px] min-[1021px]:max-w-[460px]">
            <h1 className="text-balance text-[clamp(42px,5.6vw,72px)] font-semibold leading-[1.02] tracking-[-0.04em]">Sign in to your school</h1>
            <p className="mt-5 max-w-[30ch] text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">Choose your portal. Your school creates every account, so there is nothing to sign up for.</p>
            <div className="mt-10 grid max-w-[400px] gap-3.5 border-t border-border pt-7 text-[14.5px] text-muted-foreground">
              <div className="flex gap-3"><CreditCard className="mt-0.5 size-[18px] flex-none text-subtle" strokeWidth={1.7} aria-hidden="true" /><span><b className="font-medium text-foreground">New here?</b> Your school office gives you a login id and a starting password.</span></div>
              <div className="flex gap-3"><Lock className="mt-0.5 size-[18px] flex-none text-subtle" strokeWidth={1.7} aria-hidden="true" /><span><b className="font-medium text-foreground">Forgot your password?</b> Use the link on the sign-in page, or ask the office to reset it.</span></div>
            </div>
          </section>

          <nav aria-label="Portals">
            <Link {...rise(1)} to={`/${family.key}/login`} data-portal={family.key} aria-label={`Login as ${family.title}`} className="rise group grid overflow-hidden rounded-[30px] border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-[3px] hover:border-[rgb(var(--c-tone)/0.55)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1fr_0.82fr]">
              <div className="flex flex-col justify-between gap-7 px-6 pb-2 pt-6 sm:py-9 sm:pl-9 sm:pr-2">
                <div>
                  <span aria-hidden="true" className="grid size-14 place-items-center rounded-[17px] bg-tone-soft text-tone"><FamilyIcon className="size-[26px]" strokeWidth={1.7} /></span>
                  <h2 className="mt-5 text-[27px] font-semibold leading-[1.1] tracking-[-0.03em]">{family.title}</h2>
                  <p className="mt-2 max-w-[30ch] text-[15.5px] text-muted-foreground">{family.text}</p>
                </div>
                <span className="inline-flex h-11 w-fit items-center gap-2.5 rounded-full bg-primary pl-5 pr-4 text-[15px] font-medium text-primary-foreground">Sign in <ArrowRight className="size-[17px] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} aria-hidden="true" /></span>
              </div>
              {/* a peek of the app: for show, not real data */}
              <div aria-hidden="true" className="flex flex-col justify-center gap-2.5 overflow-hidden bg-tone-soft px-5 pb-6 pt-4 sm:px-7 sm:py-8">
                <Peek Icon={Check} label="Attendance" value="96%" tone={['bg-success-soft text-success-ink', 'text-success-ink']} />
                <div className="ml-4"><Peek Icon={BookOpen} label="Homework" value="2 due" tone={['bg-warning-soft text-warning-ink', 'text-warning-ink']} /></div>
                <div className="ml-9"><Peek Icon={IndianRupee} label="Fees" value="Paid" tone={['bg-primary-soft text-primary-ink', 'text-primary-ink']} /></div>
              </div>
            </Link>

            <div {...rise(2)} className="rise mb-3 mt-8 flex items-center gap-3 pl-1.5 text-[13px] font-medium text-muted-foreground">School team<span aria-hidden="true" className="h-px flex-1 bg-border" /></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {team.map((c, i) => {
                const Icon = ROW_ICON[c.key];
                return (
                  <Link key={c.key} {...rise(3 + i)} to={`/${c.key}/login`} data-portal={c.key} aria-label={`Login as ${c.title}`} className="rise group relative flex min-w-0 flex-col gap-3.5 rounded-[22px] border border-border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-[3px] hover:border-[rgb(var(--c-tone)/0.55)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-[18px] sm:p-[18px]">
                    <ArrowUpRight aria-hidden="true" className="absolute right-4 top-[18px] size-[17px] -translate-x-1 translate-y-1 text-subtle opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-tone group-hover:opacity-100" strokeWidth={1.9} />
                    <span aria-hidden="true" className="grid size-[42px] place-items-center rounded-[13px] bg-tone-soft text-tone"><Icon className="size-[21px]" strokeWidth={1.7} /></span>
                    <span><b className="block text-base font-semibold tracking-tight">{c.title}</b><span className="mt-0.5 block text-[13.5px] leading-snug text-muted-foreground">{c.text}</span></span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </main>

        <footer className="flex flex-wrap justify-between gap-x-7 gap-y-2.5 border-t border-border pb-8 pt-6 text-[13.5px] text-muted-foreground">
          <span>© {new Date().getFullYear()} AtKaksha</span>
          <nav aria-label="Legal and platform" className="flex flex-wrap gap-x-6 gap-y-2">
            {[['/connect', 'Connect with us'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms'], ['/cookies', 'Cookies and storage'], ['/refunds', 'Refunds and cancellation'], ['/platform/login', 'Platform administrator']].map(([to, t]) => <Link key={to} to={to} className="hover:text-foreground hover:underline">{t}</Link>)}
          </nav>
        </footer>
      </div>
    </div>
  );
}

// ───────── one sign-in page per portal ─────────
const LEGAL = [['/connect', 'Connect with us'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms'], ['/cookies', 'Cookies and storage'], ['/refunds', 'Refunds and cancellation']];
// the drawing fades in from the left and bottom, so the words and the form always sit on calm paper
const FADE = 'radial-gradient(ellipse 60% 100% at 32% 66%, #000 38%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.1) 38%, #000 72%), linear-gradient(to right, #000 0%, #000 38%, transparent 60%)';

/**
 * One template for every portal: the page is the portal's own soft tone, a fine-line drawing blends into it, the portal's name is
 * said big on the left and the form sits quietly on the right. Below 1100 px the drawing goes and the name becomes a small banner.
 */
export function PortalScreen({ portal, form }) {
  const t = THEMES[portal];
  const Icon = t.icon;
  return (
    <div data-portal={portal} className="relative flex min-h-dvh flex-col text-foreground min-[1100px]:h-dvh min-[1100px]:overflow-hidden" style={{ background: 'color-mix(in srgb, rgb(var(--c-tone-soft)) 34%, rgb(var(--c-bg)))' }}>
      <SkipLink /><TopBar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden text-tone-ink min-[1100px]:block" style={{ WebkitMaskImage: FADE, maskImage: FADE, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="size-full" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: artFor(portal) }} />
      </div>
      <div className="relative z-[1] grid min-h-0 flex-1 min-[1100px]:grid-cols-[5fr_6fr]">
        <aside className="flex items-center gap-4 bg-tone-soft px-6 pb-6 pt-20 min-[1100px]:block min-[1100px]:bg-transparent min-[1100px]:px-[clamp(32px,5vw,72px)] min-[1100px]:pb-10 min-[1100px]:pt-[clamp(120px,19vh,200px)]">
          <span className="grid size-[52px] flex-none place-items-center rounded-2xl bg-card text-tone-ink shadow-sm min-[1100px]:hidden"><Icon className="size-6" strokeWidth={1.6} aria-hidden="true" /></span>
          <div className="max-w-[440px]">
            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.03em] min-[1100px]:text-[clamp(44px,4.8vw,64px)] min-[1100px]:tracking-[-0.045em]">
              <span className="max-[1099px]:sr-only min-[1100px]:mb-4 min-[1100px]:block min-[1100px]:text-xs min-[1100px]:font-medium min-[1100px]:uppercase min-[1100px]:tracking-[0.22em] min-[1100px]:text-muted-foreground">Sign in to </span>{t.name}
            </h1>
            <p className="mt-4 hidden max-w-[28ch] text-[17px] leading-[1.4] text-muted-foreground min-[1100px]:block">{t.tag}</p>
          </div>
        </aside>
        <main {...mainProps} className="flex min-w-0 flex-col px-[clamp(16px,4vw,56px)] pt-6 focus-visible:outline-none min-[1100px]:overflow-y-auto min-[1100px]:pt-16">
          <div className="flex flex-1 items-start justify-center pb-4 min-[1100px]:items-center"><div className="w-full max-w-[400px]">{form}</div></div>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-[22px] gap-y-1.5 py-4 text-[13px] text-muted-foreground">
            {LEGAL.map(([to, label]) => <Link key={to} to={to} className="hover:text-foreground hover:underline">{label}</Link>)}
          </nav>
        </main>
      </div>
    </div>
  );
}
