import { useApi } from '../hooks/useApi.js';
import { post } from '../api/client.js';
import { Async, Badge, Button, Card, useAction } from './ui.jsx';

/** Ask the browser where the person is. Required only when the school has set a location fence. */
function place(required) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return required ? reject(new Error('Your browser cannot share its location, which this school needs for check-in.')) : resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => (required ? reject(new Error('Allow location access in your browser to check in from the school.')) : resolve(undefined)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

/** Today's check-in / check-out for the signed-in teacher or staff member. `base` is '/api/teacher' or '/api/staff'. */
export default function PunchCard({ base }) {
  const q = useApi(`${base}/punch`);
  const [run, busy] = useAction();
  const go = (kind) => run(async () => { const location = await place(q.data?.policy?.requiresLocation); return post(`${base}/punch/check-${kind}`, location ? { location } : {}); }, kind === 'in' ? 'Checked in' : 'Checked out').then((r) => r && q.reload());
  return (
    <Async state={q}>{(d) => {
      const p = d.punch; const ev = d.evaluation;
      return (
        <Card title="Today" action={<span className="muted small">Shift {d.policy.shiftStart}–{d.policy.shiftEnd}{d.policy.requiresLocation ? ` · check in within ${d.policy.radiusMeters} m of the school` : ''}</span>}>
          <div className="row between wrap" style={{ gap: 12 }}>
            <div className="stack-sm">
              <div style={{ fontSize: 28, fontWeight: 600 }}>{d.now}</div>
              {!p?.checkIn && <div className="muted">You have not checked in yet.</div>}
              {!p?.checkIn && d.policy.checkInState === 'early' && <div className="small" role="status">Check-in opens at <b>{d.policy.opensAt}</b>.</div>}
              {!p?.checkIn && d.policy.checkInState === 'closed' && <div className="small" role="status">Check-in closed at <b>{d.policy.closesAt}</b>. Ask the school office to record your time.</div>}
              {p?.checkIn && <div>Checked in at <b>{p.checkIn}</b> {ev?.late ? <Badge tone="amber">{ev.minutesLate} min late</Badge> : <Badge tone="green">On time</Badge>}</div>}
              {p?.checkOut && <div>Checked out at <b>{p.checkOut}</b>{ev?.hours != null && <> · {ev.hours} hours</>}</div>}
            </div>
            <div className="row">
              {!p?.checkIn && <Button variant="primary" loading={busy} disabled={d.policy.checkInState !== 'open'} onClick={() => go('in')}>Check in</Button>}
              {p?.checkIn && !p?.checkOut && <Button variant="primary" loading={busy} onClick={() => go('out')}>Check out</Button>}
            </div>
          </div>
          <p className="muted small" style={{ margin: '10px 0 0' }}>Your attendance for the day is confirmed by the school office, using these times.</p>
        </Card>
      );
    }}</Async>
  );
}
