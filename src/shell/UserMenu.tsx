import { Link, useNavigate } from 'react-router-dom';
import { Check, KeyRound, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../design/ui';
import { useTheme, type ThemeChoice } from '../design/lib/theme';
import { loginFor } from '../pages/Login.jsx';
import { useSession } from '../types/auth';

const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }, { id: 'system', label: 'Match device', icon: Monitor }];
const roleLabel = (r: string) => r.replace('_', ' ').replace(/^./, (c) => c.toUpperCase());

export function UserMenu({ hasProfile, area }: { hasProfile: boolean; area: string }) {
  const { user, logout } = useSession();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Profile menu" className="flex h-9 items-center gap-2 rounded-md pl-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={user.name} size={28} /><span className="hidden max-w-32 truncate text-sm font-medium lg:block">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2.5 py-2"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{roleLabel(user.role)}</p></div>
        <DropdownMenuSeparator />
        {hasProfile && <DropdownMenuItem asChild><Link to={`/${area}/profile`}><UserRound aria-hidden />My profile</Link></DropdownMenuItem>}
        <DropdownMenuItem asChild><Link to="/account"><KeyRound aria-hidden />Password and sessions</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {THEMES.map((t) => <DropdownMenuItem key={t.id} onSelect={(e) => { e.preventDefault(); setTheme(t.id); }}><t.icon aria-hidden />{t.label}{theme === t.id && <Check className="ml-auto !text-primary" aria-hidden />}</DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={async () => { const role = user.role; await logout(); nav(loginFor(role)); }}><LogOut aria-hidden />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
