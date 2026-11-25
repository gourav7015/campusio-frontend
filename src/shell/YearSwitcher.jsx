import { useApi } from '../hooks/useApi.js';
import { getViewYear, setViewYear } from '../api/client.js';
import { Badge } from '../design/ui';

/**
 * Classes finish their year on their own dates, so a school can have classes in two academic years at once. When it does, the header offers a
 * year to look at (the default is the school's current year); everything on screen then shows that year. With one year there is nothing to pick.
 */
export default function YearSwitcher({ area, fallback }) {
  const years = useApi(area === 'teacher' ? '/api/teacher/years' : '/api/school/years');
  const list = (years.data || []).map((y) => ({ id: y.id || y._id, name: y.name, isCurrent: y.isDefault ?? y.isCurrent, closed: y.status === 'closed' }));
  const open = list.filter((y) => !y.closed || y.id === getViewYear());
  const name = fallback || list.find((y) => y.isCurrent)?.name;
  if (open.length < 2) return name ? <Badge className="hidden xl:inline-flex" title="Current academic year">Academic year {name}</Badge> : null;
  const chosen = getViewYear();
  const current = list.find((y) => y.isCurrent)?.id || '';
  return (
    <label className="hidden items-center gap-1.5 text-xs text-muted-foreground xl:flex" title="Classes can be in different academic years. Choose the year to look at.">
      <span>Year</span>
      <select aria-label="Show year" className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground" value={chosen || current}
        onChange={(e) => { setViewYear(e.target.value === current ? null : e.target.value); window.location.reload(); }}>
        {open.map((y) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (current)' : ''}</option>)}
      </select>
    </label>
  );
}
