import { useMemo } from 'react';
import { label, fmtDate } from './ui.jsx';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR = { present: 'var(--green)', late: 'var(--amber)', absent: 'var(--red)', leave: 'var(--blue)', excused: 'var(--blue)' };

/** GitHub-style attendance heat map: one square per day, weeks across, Monday at the top. */
export default function Heatmap({ days }) {
  const { weeks, months } = useMemo(() => {
    if (!days?.length) return { weeks: [], months: [] };
    const first = new Date(`${days[0].date}T00:00:00`);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const cells = [...Array.from({ length: offset }, () => null), ...days];
    const w = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    const m = [];
    w.forEach((wk, i) => { const d = wk.find(Boolean); if (d && (i === 0 || d.date.slice(5, 7) !== (w[i - 1].find(Boolean)?.date || '').slice(5, 7))) m.push({ i, name: MON[Number(d.date.slice(5, 7)) - 1] }); });
    return { weeks: w, months: m };
  }, [days]);
  if (!weeks.length) return <div className="empty small">No attendance has been recorded yet</div>;
  const size = 14; const gap = 3;
  return (
    <div role="img" aria-label="Attendance heat map for the academic year" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap, marginLeft: 26, marginBottom: 4, position: 'relative', height: 14 }}>
        {weeks.map((_, i) => <div key={i} style={{ width: size, fontSize: 10, color: 'var(--muted)', overflow: 'visible', whiteSpace: 'nowrap' }}>{months.find((m) => m.i === i)?.name}</div>)}
      </div>
      <div style={{ display: 'flex', gap }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, width: 22, fontSize: 10, color: 'var(--muted)' }}>{['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => <div key={i} style={{ height: size, lineHeight: `${size}px` }}>{d}</div>)}</div>
        {weeks.map((wk, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap }}>
            {Array.from({ length: 7 }, (_, j) => wk[j]).map((d, j) => d ? (
              <div key={j} data-status={d.status || (d.working ? 'unmarked' : 'off')} title={`${fmtDate(d.date, true)} — ${d.status ? label(d.status) : d.holiday ? `Holiday: ${d.holiday}` : d.working ? 'Not recorded' : 'Non-working day'}`}
                style={{ width: size, height: size, borderRadius: 3, background: d.status ? COLOR[d.status] : 'var(--grey-50)', opacity: d.status || d.working ? 1 : 0.45, border: !d.status && d.working ? '1px solid var(--border)' : 'none' }} />
            ) : <div key={j} style={{ width: size, height: size }} />)}
          </div>))}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: 'var(--green)' }} />Present</span><span><i style={{ background: 'var(--amber)' }} />Late</span><span><i style={{ background: 'var(--red)' }} />Absent</span><span><i style={{ background: 'var(--blue)' }} />Leave</span><span><i style={{ background: 'var(--grey-50)', border: '1px solid var(--border)' }} />Not recorded</span><span><i style={{ background: 'var(--grey-50)', opacity: 0.45 }} />Non-working</span>
      </div>
    </div>
  );
}
