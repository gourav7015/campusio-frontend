import { NavLink } from 'react-router-dom';
import { cn } from '../design/lib/cn';
import { Tooltip } from '../design/ui';
import type { NavGroup } from './portals';

/** Navigation rows are the densest part of the app: 36px tall, icons in one column, section labels closer to their own items. */
export function NavList({ groups, collapsed, dark, soft, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; dark?: boolean; soft?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col">
      {groups.map((g, gi) => (
        <div key={g.label ?? gi} className={cn(gi > 0 && (collapsed ? 'mt-3 border-t pt-3' : 'mt-6'), collapsed && dark ? 'border-white/10' : collapsed && 'border-border')}>
          {g.label && !collapsed && <p className={cn('mb-2 px-3 text-xs font-medium', dark ? 'text-white/50' : 'text-muted-foreground')}>{g.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => {
              const link = (
                <NavLink to={it.to} end={it.end} onClick={onNavigate} aria-label={collapsed ? it.label : undefined}
                  className={({ isActive }) => cn(
                    'group flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    collapsed && 'justify-center px-0',
                    dark
                      ? isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
                      : isActive ? (soft ? 'bg-tone-soft text-foreground' : 'bg-card text-foreground shadow-xs ring-1 ring-border/70') : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground')}>
                  {({ isActive }) => (
                    <>
                      <it.icon className={cn('size-4 shrink-0', dark ? (isActive ? 'text-white' : 'text-white/60') : isActive ? 'text-tone' : 'text-subtle group-hover:text-muted-foreground')} strokeWidth={1.75} aria-hidden />
                      {!collapsed && <span className="truncate">{it.label}</span>}
                    </>
                  )}
                </NavLink>
              );
              return <li key={it.to}>{collapsed ? <Tooltip label={it.label}>{link}</Tooltip> : link}</li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
