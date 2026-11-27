/** Helpers for browser tests of "attendance once a day or period by period". The shared demo school is put back to once a day with nothing taken today. */
export const API = process.env.API_URL || 'http://localhost:4010';
/** The platform administrator: only AtKaksha changes how a school takes attendance. */
export const rootToken = async () => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'superadmin@erp.local', password: 'Super@12345', portal: 'platform' }) })).json()).token;
export const adminToken = async () => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json()).token;

/** Once a day again, and no attendance taken today (demo only). */
export const resetAttendance = async () => { const r = await fetch(`${API}/__demo/attendance-reset`, { method: 'POST' }); if (!r.ok) throw new Error(`attendance reset failed: ${r.status}`); return r.json(); };

/** The demo school's id, as the platform side knows it. */
export async function schoolId() {
  const token = await rootToken();
  const schools = await (await fetch(`${API}/api/platform/schools`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const s = (schools.items || schools).find((x) => x.code === 'gps');
  return s._id || s.id;
}

/** Switch the school's way from today (the demo must be freshly reset so nothing has been started today). */
export async function setWay(periodWise) {
  const token = await rootToken();
  const { today } = await resetAttendance();
  const schools = await (await fetch(`${API}/api/platform/schools`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const school = (schools.items || schools).find((s) => s.code === 'gps');
  const r = await fetch(`${API}/api/platform/schools/${school._id || school.id}/attendance-mode`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ periodWise, from: today }) });
  if (!r.ok && periodWise) throw new Error(`could not switch: ${r.status} ${await r.text()}`);
  return today;
}
