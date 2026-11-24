import { site } from '../config';
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '../design/ErrorBoundary';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as m from 'framer-motion/m';
import * as D from '@radix-ui/react-dialog';
import { Ellipsis, Lock, Menu, PanelLeftClose, PanelLeftOpen, ShieldAlert } from 'lucide-react';
import { BackToTop, Badge, Breadcrumbs, Button, EmptyState, PageSkeleton, ThemeToggle, TooltipProvider, type Crumb } from '../design/ui';
import { usePageTitle, useRobots } from '../design/lib/page';
import { cn } from '../design/lib/cn';
import { ease } from '../design/lib/motion';
import { useSession } from '../types/auth';
import { Logo } from '../pages/PublicPage';
import { blockedAdminPage, flatNav, HIDDEN_PAGES, portalFor, PORTALS, type Portal, type PortalKey } from './portals';
import { NavList } from './NavList';
import { Notifications } from './Notifications';
import { CommandSearch } from './CommandSearch';
import { UserMenu } from './UserMenu';
import YearSwitcher from './YearSwitcher';

/** Short phone tab label: "My timetable" becomes "Timetable", "Homework and assignments" becomes "Homework". */
const tabLabel = (l: string) => { const s = l.replace(/^My /, '').replace(/ and .*/, ''); return s.charAt(0).toUpperCase() + s.slice(1); };

const STORE = 'erp.nav.collapsed';
const readCollapsed = () => { try { return localStorage.getItem(STORE) === '1'; } catch { return false; } };

function Brand({ portal, schoolName, collapsed, dark }: { portal: Portal; schoolName?: string; collapsed?: boolean; dark?: boolean }) {
  return (
    <Link to={portal.home} aria-label={`${portal.title} home`} className={cn('flex h-14 shrink-0 items-center gap-3 rounded-md px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', collapsed && 'justify-center px-0')}>
      <Logo size={32} className="shrink-0 rounded-lg" />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className={cn('truncate text-sm font-semibold', dark && 'text-white')}>{portal.title}</p>
          <p className={cn('truncate text-xs', dark ? 'text-white/55' : 'text-muted-foreground')}>{portal.key === 'platform' ? 'AtKaksha' : schoolName}</p>
        </div>
      )}
    </Link>
  );
}

function useCrumbs(portal: Portal): Crumb[] {
  const { pathname } = useLocation();
  return useMemo(() => {
    const hidden = Object.entries(HIDDEN_PAGES).find(([to]) => pathname === to || pathname.startsWith(`${to}/`));
    if (hidden) return [{ label: portal.title, to: portal.home }, { label: hidden[1].parent.label, to: hidden[1].parent.to }, { label: hidden[1].label }];
    const items = flatNav(portal).filter((i) => !i.end);
    const section = items.filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
    if (!section) return [];
    const crumbs: Crumb[] = [{ label: portal.title, to: portal.home }, { label: section.label, to: section.to }];
    if (pathname.length > section.to.length + 1) crumbs.push({ label: 'Details' });
    return crumbs;
  }, [portal, pathname]);
}

export function AppShell({ area }: { area: PortalKey }) {
  const { user, school, acting, setActing } = useSession();
  const portal = portalFor(PORTALS[area], user as unknown as { adminLevel?: string; permissions?: string[]; canMarkAttendance?: boolean; periodWise?: boolean } | null);
  const { pathname } = useLocation();
  const blocked = area === 'admin' ? blockedAdminPage(pathname, user as unknown as { adminLevel?: string; permissions?: string[] } | null) : null;
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const crumbs = useCrumbs(portal);
  usePageTitle((crumbs.length === 3 && crumbs[2].label !== 'Details' ? crumbs[2].label : crumbs[1]?.label) ?? 'Dashboard', portal.title);
  useRobots(false);
  const dark = portal.variant === 'control';
  const personal = portal.variant === 'personal';
  const tabs = portal.tabs?.map((to) => flatNav(portal).find((i) => i.to === to)).filter(Boolean) as ReturnType<typeof flatNav> | undefined;

  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(STORE, c ? '0' : '1'); } catch { /* ignore */ } return !c; });

  const sidebar = (
    <m.aside initial={false} animate={{ width: collapsed ? 72 : 264 }} transition={{ duration: 0.2, ease }}
      className={cn('hidden shrink-0 flex-col lg:flex',
        personal ? 'sticky top-3 m-3 mr-0 h-[calc(100dvh-1.5rem)] rounded-2xl border border-border/70 bg-card shadow-sm'
          : cn('sticky top-0 h-dvh border-r', dark ? 'border-white/10 bg-navy text-white' : 'border-border/60 bg-background'))}>
      <Brand portal={portal} schoolName={school?.name} collapsed={collapsed} dark={dark} />
      <div className={cn('min-h-0 flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}><NavList groups={portal.groups} collapsed={collapsed} dark={dark} soft={personal} /></div>
    </m.aside>
  );

  return (
    <TooltipProvider>
      <div data-portal={area} className="flex min-h-dvh bg-background text-foreground">
        <a href="#main-content" className="sr-only z-[80] rounded-md bg-card px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
        {sidebar}

        <D.Root open={drawer} onOpenChange={setDrawer}>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-50 bg-navy/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
            <D.Content aria-describedby={undefined} className={cn('fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col shadow-lg focus-visible:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden', dark ? 'bg-navy text-white' : 'bg-background')}>
              <D.Title className="sr-only">Navigation</D.Title>
              <Brand portal={portal} schoolName={school?.name} dark={dark} />
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6"><NavList groups={portal.groups} dark={dark} onNavigate={() => setDrawer(false)} /></div>
            </D.Content>
          </D.Portal>
        </D.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-border/60 bg-background px-3 sm:gap-2 sm:px-5">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu /></Button>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
            <Breadcrumbs items={crumbs} className="hidden min-w-0 sm:block" />
            <div className="flex-1" />
            {portal.search && portal.api && (area === 'admin' || area === 'teacher') && <CommandSearch base={portal.api} role={area} />}
            {(area === 'admin' || area === 'teacher') ? <YearSwitcher area={area} fallback={school?.academicYear} /> : (school?.academicYear && area !== 'finance' && <Badge className="hidden xl:inline-flex" title="Current academic year">{school.academicYear}</Badge>)}
            <ThemeToggle />
            {portal.api && <Notifications base={portal.api} role={area} />}
            <UserMenu hasProfile={area === 'teacher' || area === 'student' || area === 'staff'} area={area} />
          </header>

          <main id="main-content" tabIndex={-1} className={cn('mx-auto w-full flex-1 px-4 py-6 focus-visible:outline-none sm:px-6 lg:px-8 lg:py-8', portal.variant === 'teaching' ? 'max-w-[1360px]' : 'max-w-[1480px]', tabs && 'pb-28 lg:pb-8')}>
            {acting && area === 'admin' && user.role === 'super_admin' && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-ink" role="status">
                <ShieldAlert className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">You are acting on <b>{acting.name}</b> as a platform administrator. Every change is audited.</span>
                <Button size="sm" onClick={() => { setActing(null); nav('/platform/schools'); }}>Exit school</Button>
              </div>
            )}
            <m.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease }}>{blocked ? (
              <EmptyState icon={Lock} className="py-24" title="This part of the portal is not open to your account"
                description={<>Your sub-admin account does not include <b>{blocked}</b>. If you need it, ask your School Admin to add it to your access.</>}
                action={<Button asChild><Link to={portal.home}>Back to the dashboard</Link></Button>} />
            ) : (<ErrorBoundary inline resetKey={pathname}><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></ErrorBoundary>)}</m.div>
          </main>
          <footer className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-2 px-4 pb-6 text-xs text-muted-foreground sm:px-6 lg:px-8"><span>© {new Date().getFullYear()} AtKaksha</span><span className="flex gap-4">{(user.role === 'school_admin' || user.role === 'super_admin') && <a className="hover:text-foreground hover:underline" href={`mailto:${site.mailboxes.support}?subject=${encodeURIComponent('AtKaksha support')}&body=${encodeURIComponent(`\n\n---\nSchool: ${school?.name || '-'}\nLogin ID: ${user.loginId || '-'}\nRole: ${user.role}`)}`}>Support</a>}<Link className="hover:text-foreground hover:underline" to="/privacy">Privacy</Link><Link className="hover:text-foreground hover:underline" to="/terms">Terms</Link><Link className="hover:text-foreground hover:underline" to="/cookies">Cookies</Link></span></footer>
          <BackToTop />
        </div>

        {tabs && (
          <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
            <ul className="mx-auto grid max-w-xl grid-cols-5">
              {tabs.map((t) => (
                <li key={t.to}>
                  <NavLink to={t.to} end={t.end} className={({ isActive }) => cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', isActive ? 'text-tone' : 'text-muted-foreground')}>
                    <t.icon className="size-5" strokeWidth={1.75} aria-hidden /><span>{t.to === portal.home ? 'Home' : tabLabel(t.label)}</span>
                  </NavLink>
                </li>
              ))}
              <li><button type="button" onClick={() => setDrawer(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Ellipsis className="size-5" strokeWidth={1.75} aria-hidden /><span>More</span></button></li>
            </ul>
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
}
