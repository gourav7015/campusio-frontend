import { Link } from 'react-router-dom';
import { ChevronRight, Book, Bus, GraduationCap, IndianRupee, Monitor, ShieldCheck, SquareCheckBig } from 'lucide-react';
import { usePageTitle, useRobots } from '../../design/lib/page';
import { ThemeToggle } from '../../design/ui';
import { Logo } from '../PublicPage';
import { THEMES, CHOICES } from './themes';
import { AdminHero, FinanceHero, LibraryShelf, StaffHero, StudentHero, TeacherHero, TransportMap } from './Heroes';

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

export function LandingScreen() {
  usePageTitle('Sign in'); useRobots(true);
  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground xl:flex-row"><SkipLink /><TopBar />
      <section className="flex flex-col px-6 pb-6 pt-24 sm:px-10 xl:w-[520px] xl:flex-none xl:pb-10 xl:pl-20 xl:pr-0">
        <div className="py-6 xl:my-auto xl:pr-10">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[46px]">Sign in to<br />your school</h1>
          <p className="mt-4 max-w-[380px] text-[17px] leading-[1.55] text-muted-foreground">Choose your portal. Your school creates every account, so there is nothing to sign up for.</p>
          <div aria-hidden="true" className="mt-9 flex h-1.5 w-60 overflow-hidden rounded-[3px]">{CHOICES.map((c) => <span key={c.key} data-portal={c.key} className="flex-1 bg-tone" />)}</div>
        </div>
        <p className="hidden text-[13px] text-muted-foreground xl:block">© {new Date().getFullYear()} AtKaksha</p>
      </section>
      <main {...mainProps} className="flex flex-1 flex-col px-6 pb-10 focus-visible:outline-none sm:px-10 xl:py-12 xl:pl-10 xl:pr-20">
        <nav aria-label="Portals" className="flex flex-col gap-2 xl:mt-14">
          {CHOICES.map((c) => {
            const Icon = ROW_ICON[c.key];
            return (
              <Link key={c.key} to={`/${c.key}/login`} data-portal={c.key} aria-label={`Login as ${c.title}`} className="group flex min-h-[72px] items-center gap-4 rounded-xl border border-border bg-card px-5 py-2.5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-[10px] bg-tone-soft text-tone"><Icon className="size-[22px]" strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1"><span className="block text-base font-semibold">{c.title}</span><span className="mt-0.5 block text-sm text-muted-foreground">{c.text}</span></span>
                <ChevronRight aria-hidden="true" className="size-5 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.8} />
              </Link>);
          })}
        </nav>
        <nav aria-label="Legal and platform" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground xl:mt-auto xl:justify-end">
          {[['/privacy', 'Privacy policy'], ['/terms', 'Terms'], ['/cookies', 'Cookies and storage'], ['/refunds', 'Refunds and cancellation'], ['/platform/login', 'Platform administrator']].map(([to, t]) => <Link key={to} to={to} className="hover:text-foreground hover:underline">{t}</Link>)}
        </nav>
      </main>
    </div>
  );
}

// ───────── one sign-in page per portal ─────────
/** Below 1280 px: a band in the portal's soft tone carries the headline that the picture carries beside the form. */
function Banner({ portal }) {
  const { h, p } = THEMES[portal].band;
  return (
    <div className="bg-tone-soft px-6 pb-8 pt-24 sm:px-10 xl:hidden">
      <div className="mx-auto w-full max-w-[400px]">
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">{h}</h1>
        <p className="mt-2.5 max-w-[480px] text-base leading-6 text-muted-foreground">{p}</p>
      </div>
    </div>
  );
}
const Box = ({ children }) => <div className="mx-auto w-full max-w-[400px] xl:mx-0">{children}</div>;
const col = 'flex w-full flex-col px-6 pb-10 pt-8 sm:px-12 xl:pt-24';
const Root = ({ portal, children, className = '' }) => <div data-portal={portal} className={`relative flex min-h-dvh flex-col bg-background text-foreground xl:flex-row ${className}`}><SkipLink /><TopBar />{children}</div>;

export function PortalScreen({ portal, form }) {
  switch (portal) {
    case 'student': return (
      <Root portal={portal}>
        <Banner portal={portal} />
        <main {...mainProps} className={`${col} focus-visible:outline-none xl:w-[520px] xl:flex-none xl:px-[60px]`}><div className="my-auto"><Box>{form}</Box></div></main>
        <section className="hidden flex-1 overflow-hidden bg-tone-soft px-16 pb-10 pt-24 xl:block"><StudentHero /></section>
      </Root>);
    case 'teacher': return ( // a notebook page: ruled lines and a margin, in the portal's soft tone
      <Root portal={portal} className="bg-tone-soft">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(to bottom,transparent 0,transparent 39px,rgb(var(--c-tone) / 0.12) 39px,rgb(var(--c-tone) / 0.12) 40px)' }} />
        <div aria-hidden="true" className="absolute inset-y-0 left-[112px] hidden w-[2px] bg-danger/40 xl:block" />
        <div className="relative hidden xl:block xl:flex-1 xl:pl-[152px] xl:pr-6 xl:pt-[170px]"><div className="max-w-[520px]"><TeacherHero /></div></div>
        <div className="relative xl:hidden"><Banner portal={portal} /></div>
        <main {...mainProps} className="relative flex items-center justify-center px-6 pb-10 pt-4 focus-visible:outline-none sm:px-12 xl:justify-end xl:pr-24 xl:pt-16"><div className="w-full max-w-[448px] rounded-2xl border border-border bg-card p-8 shadow-lg sm:p-10">{form}</div></main>
      </Root>);
    case 'transport': return (
      <Root portal={portal}>
        <Banner portal={portal} />
        <main {...mainProps} className={`${col} focus-visible:outline-none xl:w-[560px] xl:flex-none xl:pl-[72px] xl:pr-20`}><div className="my-auto"><Box>{form}</Box></div></main>
        <section className="relative hidden flex-1 overflow-hidden bg-muted xl:block" style={{ backgroundImage: 'radial-gradient(rgb(var(--c-border-strong) / 0.5) 1.2px,transparent 1.2px)', backgroundSize: '24px 24px' }}>
          <TransportMap />
          <div className="absolute left-20 right-14 top-24"><h1 className="text-[64px] font-semibold uppercase leading-[1] tracking-[-0.03em] text-foreground">Every stop,<br />on time.</h1><p className="mt-[18px] max-w-[400px] text-[17px] leading-[1.55] text-muted-foreground">Buses, routes, drivers and riders in one place.</p></div>
        </section>
      </Root>);
    case 'finance': return (
      <Root portal={portal}>
        <Banner portal={portal} />
        <section className="hidden shrink-0 overflow-hidden border-r border-border bg-tone-soft px-14 pb-10 pt-24 xl:block xl:w-[720px]"><FinanceHero /></section>
        <main {...mainProps} className={`${col} flex-1 justify-center focus-visible:outline-none xl:px-20`}><Box>{form}</Box></main>
      </Root>);
    case 'library': return (
      <Root portal={portal}>
        <Banner portal={portal} />
        <section className="relative hidden shrink-0 overflow-hidden border-r border-border bg-tone-soft xl:block xl:w-[720px]">
          <LibraryShelf />
          <div className="absolute inset-x-14 top-24"><h1 className="text-[56px] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground">Every book<br />in its place.</h1><p className="mt-[18px] max-w-[400px] text-[17px] leading-[1.55] text-muted-foreground">Catalogue, issue and return, tracked accurately.</p></div>
        </section>
        <main {...mainProps} className={`${col} flex-1 justify-center focus-visible:outline-none xl:px-20`}><Box>{form}</Box></main>
      </Root>);
    case 'staff': return (
      <Root portal={portal}>
        <Banner portal={portal} />
        <section className="hidden shrink-0 overflow-hidden border-r border-border bg-tone-soft px-14 pb-10 pt-24 xl:block xl:w-[740px]"><StaffHero /></section>
        <main {...mainProps} className={`${col} flex-1 justify-center focus-visible:outline-none xl:px-16`}><Box>{form}</Box></main>
      </Root>);
    default: return ( // admin and platform
      <Root portal={portal}>
        <Banner portal={portal} />
        <main {...mainProps} className={`${col} border-border focus-visible:outline-none xl:w-[520px] xl:flex-none xl:border-r xl:px-[60px]`}><div className="my-auto"><Box>{form}</Box></div></main>
        <section className="hidden flex-1 overflow-hidden bg-muted px-16 pb-10 pt-24 xl:block" style={{ backgroundImage: 'linear-gradient(rgb(var(--c-border) / 0.5) 1px,transparent 1px),linear-gradient(90deg,rgb(var(--c-border) / 0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }}>
          {portal === 'platform' ? <AdminHero heading={<>Every school,<br />one console.</>} text="Schools, subscriptions and support, for the platform operator." /> : <AdminHero />}
        </section>
      </Root>);
  }
}
