import { Link, NavLink } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { get } from '../api/client.js';
import { cn } from '../design/lib/cn';
import { Logo } from '../pages/PublicPage';
import type { NavGroup, Portal } from './portals';

/**
 * School admin is organised as a few areas (Home, People, Academics, ...) in a slim rail; the open area's pages sit in a quiet list beside it.
 * Every page keeps its own address. The area is whichever one holds the page you are on.
 */
export const areaOf = (groups: NavGroup[], pathname: string): NavGroup | undefined => {
  let best: { g: NavGroup; len: number } | undefined;
  for (const g of groups) for (const i of g.items) if ((pathname === i.to || pathname.startsWith(`${i.to}/`)) && (!best || i.to.length > best.len)) best = { g, len: i.to.length };
  return best?.g ?? groups[0];
};

/** Waiting items (tickets, approvals) in an area: the sum of the counts its pages show. */
function useWaiting(g: NavGroup) {
  const urls = g.items.map((i) => i.badge).filter(Boolean) as string[];
  const rs = useQueries({ queries: urls.map((u) => ({ queryKey: [u, {}], queryFn: () => get(u) as Promise<{ count: number }>, refetchInterval: 60_000, staleTime: 20_000, retry: false })) });
  return rs.reduce((n, r) => n + (r.data?.count || 0), 0);
}

function RailItem({ g, active }: { g: NavGroup; active: boolean }) {
  const n = useWaiting(g);
  const Icon = g.icon!;
  return (
    <Link to={g.items[0].to} aria-current={active ? 'true' : undefined} aria-label={n ? `${g.label}, ${n} waiting` : g.label}
      className={cn('relative flex w-[58px] flex-col items-center gap-[3px] rounded-2xl pb-[7px] pt-[9px] text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-tone-soft text-tone-ink' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
      <Icon className="size-[22px]" strokeWidth={1.7} aria-hidden />
      <span aria-hidden>{g.label}</span>
      {n > 0 && <span aria-hidden className="absolute right-3 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-on-accent tabular-nums">{n > 99 ? '99+' : n}</span>}
    </Link>
  );
}

export function AreaRail({ portal, pathname }: { portal: Portal; pathname: string }) {
  const current = areaOf(portal.groups, pathname);
  return (
    <nav aria-label="Areas" className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col items-center gap-1.5 border-r border-border/60 bg-card py-3.5 lg:flex">
      <Link to={portal.home} aria-label="School admin home" className="mb-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Logo size={42} className="rounded-[13px]" /></Link>
      {portal.groups.map((g) => <RailItem key={g.label} g={g} active={g === current} />)}
    </nav>
  );
}

export function AreaPanel({ portal, pathname, open }: { portal: Portal; pathname: string; open: boolean }) {
  const g = areaOf(portal.groups, pathname);
  if (!g) return null;
  return (
    <aside aria-label={`${g.label} pages`} className={cn('sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-border/60 bg-card transition-[width,opacity] duration-200 lg:block', open ? 'w-[244px] border-r opacity-100' : 'invisible w-0 border-0 opacity-0')}>
      <div className="flex h-full w-[244px] flex-col px-3.5 pb-3.5 pt-[22px]">
        <h2 className="px-2.5 text-xl font-semibold tracking-[-0.025em]">{g.label}</h2>
        <div className="pb-3.5" />
        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} end={it.end}
                  className={({ isActive }) => cn('group flex items-center gap-[11px] rounded-[11px] px-2.5 py-[9px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  {({ isActive }) => (<>
                    <it.icon className={cn('size-[19px] shrink-0', isActive ? 'text-tone' : 'text-subtle group-hover:text-muted-foreground')} strokeWidth={1.7} aria-hidden />
                    <span className="truncate">{it.label}</span>
                    {it.badge && <PageCount url={it.badge} />}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-2 px-2.5 py-3 text-[12.5px] leading-[1.45] text-muted-foreground">Stuck? Press Ctrl K to find any page or person, or open the Quick guide.</p>
      </div>
    </aside>
  );
}

function PageCount({ url }: { url: string }) {
  const { data } = useQueries({ queries: [{ queryKey: [url, {}], queryFn: () => get(url) as Promise<{ count: number }>, refetchInterval: 60_000, staleTime: 20_000, retry: false }] })[0];
  const n = data?.count ?? 0;
  if (!n) return null;
  return <span aria-label={`${n} waiting`} className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-5 text-on-accent tabular-nums">{n > 99 ? '99+' : n}</span>;
}

/** Teacher and Staff: the areas along the top bar (a person with one area, like the office desk, sees its pages straight along the bar). */
export function TopNav({ portal, pathname }: { portal: Portal; pathname: string }) {
  const flat = portal.groups.length === 1;
  const current = areaOf(portal.groups, pathname);
  const link = (active: boolean) => cn('relative flex items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-tone-soft text-tone-ink' : 'text-muted-foreground hover:bg-muted hover:text-foreground');
  if (flat) {
    return (
      <nav aria-label="Main" className="hidden min-w-0 flex-1 gap-0.5 overflow-x-auto lg:flex">
        {portal.groups[0].items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => link(isActive)}>{it.label}{it.badge && <PageCount url={it.badge} />}</NavLink>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Areas" className="hidden min-w-0 flex-1 gap-0.5 overflow-x-auto lg:flex">
      {portal.groups.map((g) => <Link key={g.label} to={g.items[0].to} aria-current={g === current ? 'true' : undefined} className={link(g === current)}>{g.label}</Link>)}
    </nav>
  );
}

/** The pages of the open area, under the top bar. */
export function SubNav({ portal, pathname }: { portal: Portal; pathname: string }) {
  const g = portal.groups.length > 1 ? areaOf(portal.groups, pathname) : undefined;
  if (!g || g.items.length < 2) return null;
  return (
    <nav aria-label="Main" className="sticky top-14 z-20 hidden gap-0.5 overflow-x-auto border-b border-border/60 bg-background px-5 py-2 lg:flex">
      {g.items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn('flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          {it.label}{it.badge && <PageCount url={it.badge} />}
        </NavLink>
      ))}
    </nav>
  );
}
