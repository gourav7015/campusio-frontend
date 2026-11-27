/** Helpers for browser tests of "attendance once a day or period by period". The shared demo school is put back to once a day with nothing taken today. */
export const API = process.env.API_URL || 'http://localhost:4010';
export const adminToken = async () => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json()).token;

/** Once a day again, and no attendance taken today (demo only). */
export const resetAttendance = async () => { const r = await fetch(`${API}/__demo/attendance-reset`, { method: 'POST' }); if (!r.ok) throw new Error(`attendance reset failed: ${r.status}`); return r.json(); };

/** Switch the school's way from today (the demo must be freshly reset so nothing has been started today). */
export async function setWay(periodWise) {
  const token = await adminToken();
  const { today } = await resetAttendance();
  const r = await fetch(`${API}/api/school/attendance-mode`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ periodWise, from: today }) });
  if (!r.ok && periodWise) throw new Error(`could not switch: ${r.status} ${await r.text()}`);
  return today;
}
