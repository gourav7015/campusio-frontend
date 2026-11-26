import { Check, X, Clock, Contrast, CalendarDays } from 'lucide-react';
import { Button } from './ui.jsx';

/**
 * The attendance controls every register shares (students, teachers, non-teaching staff, officers, transport crew), so a register looks and
 * behaves the same wherever you take it: the same five statuses, the same two bulk buttons, and a half day always says which session was attended.
 */
export const STATUSES = ['present', 'absent', 'late', 'half_day', 'leave'];
export const STATUS_NAME = { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half day', leave: 'Leave', excused: 'Leave' };
/** Every status is an icon plus a word, never colour alone. */
export const STATUS_ICON = { present: Check, absent: X, late: Clock, half_day: Contrast, leave: CalendarDays, excused: CalendarDays };
export const SESSION_NAME = { first: 'First session', second: 'Second session' };
export const SESSION_SHORT = { first: '1st session', second: '2nd session' };

/** "Half day · 2nd session" for a half day, otherwise just the status. */
export const statusText = (status, halfSession) => (!status ? 'Not marked' : status === 'half_day' ? `Half day · ${SESSION_SHORT[halfSession || 'first']}` : STATUS_NAME[status] || status);

/** The small icon that goes with a status. */
export function Icon({ st, size = 14 }) { const I = STATUS_ICON[st]; return I ? <I size={size} aria-hidden strokeWidth={2.4} /> : null; }

/** The status buttons for one person. Choosing Half day reveals which session they attended. */
export function StatusControl({ status, halfSession, onChange, name, size, statuses = STATUSES }) {
  const session = halfSession || 'first';
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="status-seg" role="group" aria-label={`Status of ${name}`}>
        {statuses.map((st) => (
          <button key={st} type="button" className={`${status === st ? 'on' : ''} ${st}`} aria-pressed={status === st} onClick={() => onChange(st, st === 'half_day' ? session : null)}><Icon st={st} />{STATUS_NAME[st]}</button>
        ))}
      </div>
      {status === 'half_day' && (
        <div className="status-seg" role="group" aria-label={`Session attended by ${name}`} style={{ alignSelf: 'flex-start' }}>
          {['first', 'second'].map((x) => <button key={x} type="button" className={`${session === x ? 'on half_day' : ''}`} aria-pressed={session === x} onClick={() => onChange('half_day', x)} style={size === 'sm' ? { padding: '3px 8px' } : undefined}>{SESSION_NAME[x]}</button>)}
        </div>
      )}
    </div>
  );
}

/** Mark everyone present, or everyone absent, in one tap. Nothing is saved until the register is saved or submitted. */
export function BulkMarkBar({ onAll, disabled }) {
  return (
    <>
      <Button disabled={disabled} onClick={() => onAll('present')}>Mark all present</Button>
      <Button disabled={disabled} onClick={() => onAll('absent')}>Mark all absent</Button>
    </>
  );
}
