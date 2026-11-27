import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { put } from '../../api/client.js';
import AttendanceWay from './AttendanceWay.jsx';
import { Async, Badge, Button, Card, Field, Input, PageHeader, Select, Tabs, useAction, useToast, label } from '../../components/ui.jsx';
import { SETTINGS_GROUPS } from '../../shell/settingsGroups';
import { setDirtyGroups, setDraft, useDraft } from '../../shell/settingsStore';

/**
 * School settings, one group at a time. The groups sit under "School settings" in the side menu (General, Attendance, Grading, Leave, Staff attendance,
 * Payroll); each row has its label and help on the left and its control on the right; one Save bar stays at the bottom and says what has changed.
 * All groups share one set of unsaved changes, so moving between them loses nothing, and a dot in the menu marks each group with a change.
 */

/** Which parts of the settings belong to which group, to say where something changed. */
const SLICES = {
  general: ['schoolName', 'timezone', 'workingDays', 'admissionFormat', 'passwordFormat'],
  attendance: ['attendance', 'showAttendanceVsPerformance'],
  grading: ['grading'],
  leave: ['leaveBalances', 'staffLeaveBalances', 'leaveRules', 'transportLeaveApprover'],
  'staff-attendance': ['staffAttendance'],
  payroll: ['statutory'],
};
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function Settings() {
  const s = useApi('/api/school/settings');
  const draft = useDraft();
  const [run, busy] = useAction();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const base = JSON.stringify(s.data ?? null);
  const v = draft && draft.base === base ? draft.value : null; // edits made on these saved settings
  const data = v || s.data;
  const set = (patch) => setDraft({ base, value: { ...(v || s.data), ...patch } });
  const setV = (x) => { if (x === null) setDraft(null); };
  const changed = useMemo(() => (data && s.data ? Object.fromEntries(Object.entries(SLICES).map(([g, keys]) => [g, keys.filter((k) => !same(data[k], s.data[k]))])) : {}), [data, s.data]);
  const dirtyGroups = Object.keys(changed).filter((g) => changed[g].length);
  const count = dirtyGroups.reduce((n, g) => n + changed[g].length, 0);
  useEffect(() => { setDirtyGroups(dirtyGroups); }, [dirtyGroups.join('|')]);
  useEffect(() => { // leaving the page with unsaved changes asks first
    if (!count) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [count]);
  const save = async () => {
    const body = { schoolName: data.schoolName, timezone: data.timezone, workingDays: data.workingDays, admissionFormat: data.admissionFormat, passwordFormat: data.passwordFormat ?? '', attendance: { lateCountsAsPresent: data.attendance.lateCountsAsPresent, dayRule: data.attendance.dayRule }, leaveBalances: data.leaveBalances, staffLeaveBalances: data.staffLeaveBalances, leaveRules: data.leaveRules, transportLeaveApprover: data.transportLeaveApprover || 'officer', staffAttendance: data.staffAttendance, statutory: data.statutory, showAttendanceVsPerformance: data.showAttendanceVsPerformance, grading: data.grading };
    const r = await run(() => put('/api/school/settings', body), 'Settings saved'); if (r) { setV(null); s.reload(); }
  };
  const group = SETTINGS_GROUPS.find((g) => g.to === pathname.replace(/\/$/, '')) || SETTINGS_GROUPS[0];
  if (!data) return <Async state={s}>{() => null}</Async>;
  const where = dirtyGroups.map((g) => SETTINGS_GROUPS.find((x) => x.key === g).label);
  return (
    <div className="stack set-page">
      <PageHeader title={group.key === 'general' ? 'School settings' : group.label} subtitle={group.key === 'general' ? 'Changes apply going forward. Published report cards keep the grading they were published with.' : { attendance: 'How student attendance is taken and counted.', grading: 'The pass mark and the grades. Published report cards keep the grading they were published with.', leave: 'The yearly allowance and the rules for applying for leave.', 'staff-attendance': 'Shift hours and how staff check in.', payroll: 'Statutory deductions taken from every payslip.' }[group.key]}
        actions={<Find go={(to) => nav(to)} />} />
      <div className="set-mobile-groups"><Select aria-label="Group of settings" value={group.to} onChange={(e) => nav(e.target.value)} options={SETTINGS_GROUPS.map((g) => ({ value: g.to, label: g.label }))} /></div>
      <div className="set-col"><Outlet context={{ data, set }} /></div>
      <div className="set-save" role="region" aria-label="Save settings">
        {count ? (<><div className="row" style={{ gap: 10, flexWrap: 'wrap' }}><span className="set-dot" aria-hidden /><b>{count} unsaved {count === 1 ? 'change' : 'changes'}</b><span className="muted small">in {where.join(' and ')}</span></div>
          <div className="row" style={{ gap: 10 }}><Button onClick={() => setV(null)}>Discard</Button><Button variant="primary" loading={busy} onClick={save}>Save settings</Button></div></>)
          : (<><span className="muted small">All changes saved</span><Button disabled>Save settings</Button></>)}
      </div>
    </div>
  );
}

/** "Find a setting": type a word (password, late, notice…) and open the group that holds it. */
function Find({ go }) {
  const [q, setQ] = useState('');
  const hits = q.trim().length < 2 ? [] : SETTINGS_GROUPS.filter((g) => `${g.label} ${g.sub} ${g.words}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={{ position: 'relative' }}>
      <Input aria-label="Find a setting" placeholder="Find a setting…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
      {q.trim().length >= 2 && (
        <div className="card" role="listbox" aria-label="Matching groups" style={{ position: 'absolute', right: 0, top: 44, width: 280, zIndex: 20, padding: 6 }}>
          {hits.length ? hits.map((g) => <button type="button" role="option" aria-selected={false} key={g.key} className="btn" style={{ width: '100%', justifyContent: 'flex-start', border: 0 }} onClick={() => { setQ(''); go(g.to); }}><b>{g.label}</b>&nbsp;<span className="muted small">{g.sub}</span></button>) : <div className="muted small" style={{ padding: 10 }}>Nothing matches "{q}".</div>}
        </div>)}
    </div>
  );
}

// ── building blocks ──
/** A label and its help on the left, the control on the right. */
function Row({ label: title, help, children, top }) {
  return <div className={`set-row${top ? ' top' : ''}`}><div><b>{title}</b>{help && <div className="small muted">{help}</div>}</div><div>{children}</div></div>;
}
function Group({ title, help, children }) {
  return <Card flush title={title}>{help && <div className="small muted" style={{ padding: '0 20px 6px' }}>{help}</div>}{children}</Card>;
}
function Switch({ checked, onChange, label: name }) {
  return <label className="set-switch"><input type="checkbox" role="switch" aria-label={name} checked={checked} onChange={(e) => onChange(e.target.checked)} /><span aria-hidden /></label>;
}
const num = (v) => (v === '' ? '' : Number(v));
const useData = () => useOutletContext();

// ── General ──
const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** The same rules as the server, to preview a starting password while the format is being typed. */
function exampleFormat(f) {
  if (!f) return 'a random password';
  if (!/\{(NAME4|NAME3|name4|DDMMYYYY|DDMM|YYYY|YY|PHONE4)\}/.test(f)) return 'not valid yet: use at least one {token}';
  return f.replace(/\{NAME4\}/g, 'AARA').replace(/\{NAME3\}/g, 'AAR').replace(/\{name4\}/g, 'aara').replace(/\{DDMMYYYY\}/g, '10012013').replace(/\{DDMM\}/g, '1001').replace(/\{YYYY\}/g, '2013').replace(/\{YY\}/g, '13').replace(/\{PHONE4\}/g, '4321');
}
const exampleAdmission = (f) => String(f || '').replace(/\{YYYY\}/g, String(new Date().getFullYear())).replace(/\{SEQ:(\d)\}/g, (_m, n) => '1'.padStart(Number(n), '0')).replace(/\{SEQ\}/g, '1');
function Tokens({ list, onAdd }) {
  return <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>{list.map((t) => <button type="button" key={t} className="set-token" aria-label={`Add ${t}`} onClick={() => onAdd(t)}>{t}</button>)}</div>;
}
function timeThere(tz) { try { return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date()); } catch { return null; } }

export function General() {
  const { data, set } = useData();
  const there = timeThere(data.timezone);
  const zones = useMemo(() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return ['Asia/Kolkata']; } }, []);
  return (
    <>
      <Group title="School">
        <Row label="School name" help="Shown on report cards, receipts and the sign-in page"><Input aria-label="School name" value={data.schoolName} onChange={(e) => set({ schoolName: e.target.value })} /></Row>
        <Row top label="Time zone" help="Decides what “today” means, countdowns and scheduling">
          <Input aria-label="Time zone" list="tz-list" value={data.timezone} onChange={(e) => set({ timezone: e.target.value })} /><datalist id="tz-list">{zones.map((z) => <option key={z} value={z} />)}</datalist>
          <div className="small muted" style={{ marginTop: 6 }}>{there ? <>It is <b>{there}</b> there now.</> : <>This is not a time zone name yet. Example: Asia/Kolkata.</>}</div></Row>
        <Row top label="Working days" help="Used for attendance, timetables and the school calendar">
          <div className="row wrap" style={{ gap: 6 }}>{[1, 2, 3, 4, 5, 6, 7].map((d) => <label key={d} className={`set-day${data.workingDays.includes(d) ? ' on' : ''}`}><input type="checkbox" aria-label={DAYS[d]} checked={data.workingDays.includes(d)} onChange={(e) => set({ workingDays: e.target.checked ? [...data.workingDays, d].sort() : data.workingDays.filter((x) => x !== d) })} />{DAYS[d]}</label>)}</div></Row>
      </Group>
      <Group title="Numbers and passwords">
        <Row top label="Admission number format" help="Each new student gets the next number">
          <Input aria-label="Admission number format" value={data.admissionFormat} onChange={(e) => set({ admissionFormat: e.target.value })} />
          <div className="small muted" style={{ marginTop: 6 }}>The first one will look like <b>{exampleAdmission(data.admissionFormat)}</b></div>
          <Tokens list={['{YYYY}', '{SEQ:4}']} onAdd={(t) => set({ admissionFormat: `${data.admissionFormat || ''}${t}` })} /></Row>
        <Row top label="Starting password" help="For new students, teachers and staff, and when you reset a password. People choose their own at first sign-in.">
          <Input aria-label="Starting password format" value={data.passwordFormat ?? ''} placeholder="{NAME4}{DDMMYYYY}" onChange={(e) => set({ passwordFormat: e.target.value })} />
          <div className="small muted" style={{ marginTop: 6 }}>Aarav Singh, born 10 Jan 2013, starts with <b>{exampleFormat(data.passwordFormat ?? '')}</b></div>
          <Tokens list={['{NAME4}', '{name4}', '{DDMMYYYY}', '{DDMM}', '{YYYY}', '{YY}', '{PHONE4}']} onAdd={(t) => set({ passwordFormat: `${data.passwordFormat ?? ''}${t}` })} />
          <div className="small muted" style={{ marginTop: 8 }}>Tap a piece to add it. Clear the box for a random password each time.</div></Row>
      </Group>
    </>
  );
}

// ── Attendance ──
export function AttendanceGroup() {
  const { data, set } = useData();
  return (
    <>
      <Card title="How student attendance is taken"><AttendanceWay rule={data.attendance.dayRule} onRule={(dayRule) => set({ attendance: { ...data.attendance, dayRule } })} /></Card>
      <Group title="Counting">
        <Row label="Late counts as present" help="In each student's attendance percentage"><div className="set-end"><Switch label="Late counts as present" checked={data.attendance.lateCountsAsPresent} onChange={(lateCountsAsPresent) => set({ attendance: { ...data.attendance, lateCountsAsPresent } })} /></div></Row>
        <Row label="Show attendance against marks to teachers" help="A small chart on a student's page"><div className="set-end"><Switch label="Show attendance against marks to teachers" checked={!!data.showAttendanceVsPerformance} onChange={(showAttendanceVsPerformance) => set({ showAttendanceVsPerformance })} /></div></Row>
      </Group>
      <div className="small muted">Once a register is submitted it is locked. Later changes need a reason and are kept in its history.</div>
    </>
  );
}

// ── Grading ──
export function Grading() {
  const { data, set } = useData();
  const g = data.grading; const scale = g.scale;
  const [try1, setTry] = useState(72);
  const setBand = (i, patch) => set({ grading: { ...g, scale: scale.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  const gradeOf = (p) => sorted.find((b) => p >= b.min)?.grade || '—';
  const tone = ['rgb(var(--c-success))', 'rgb(var(--c-primary))', 'rgb(var(--c-warning))', 'rgb(var(--c-danger))'];
  const asc = [...sorted].reverse();
  return (
    <>
      <Group title="Pass mark">
        <Row label="Pass percentage" help="A student below this fails the exam"><div className="row" style={{ gap: 8 }}><Input aria-label="Pass percentage" type="number" min="0" max="100" value={g.passPercentage} onChange={(e) => set({ grading: { ...g, passPercentage: Number(e.target.value) } })} style={{ maxWidth: 110 }} /><span className="muted">%</span></div></Row>
      </Group>
      <Group title="Grade bands" help="Highest first. A grade starts at its minimum and runs up to the next band.">
        <div className="set-scale" role="img" aria-label={`Grades from ${asc.map((b) => `${b.grade} at ${b.min}%`).join(', ')}`}>
          {asc.map((b, i) => <span key={`${b.grade}-${i}`} style={{ flex: Math.max((asc[i + 1]?.min ?? 100) - b.min, 4), background: tone[Math.min(Math.floor((i / Math.max(asc.length - 1, 1)) * 3.99), 3)] }}>{b.grade}</span>)}
        </div>
        {scale.map((b, i) => (
          <div className="set-band" key={i}>
            <span className="muted small">{`${b.min}% or more`}</span>
            <Field label="From (minimum %)"><Input type="number" min="0" max="100" value={b.min} onChange={(e) => setBand(i, { min: Number(e.target.value) })} /></Field>
            <Field label="Grade"><Input value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value })} /></Field>
            <Button size="sm" aria-label={`Remove band ${b.grade}`} disabled={scale.length <= 2} onClick={() => set({ grading: { ...g, scale: scale.filter((_, j) => j !== i) } })}>Remove</Button>
          </div>))}
        <div className="row between wrap" style={{ padding: '12px 20px', gap: 10 }}>
          <Button size="sm" onClick={() => set({ grading: { ...g, scale: [...scale, { min: 0, grade: '' }] } })}>+ Add band</Button>
          <span className="row small" style={{ gap: 8 }}>Try a percentage <Input aria-label="Try a percentage" type="number" min="0" max="100" value={try1} onChange={(e) => setTry(Number(e.target.value))} style={{ width: 80 }} /> gets <Badge tone="blue">{gradeOf(try1)}</Badge></span>
        </div>
      </Group>
    </>
  );
}

// ── Leave ──
function Allowance({ keyName }) {
  const { data, set } = useData();
  return ['casual', 'sick', 'earned', 'other'].map((k) => (
    <Row key={k} label={label(k)}><div className="row" style={{ gap: 8 }}><Input aria-label={`${label(k)} days`} type="number" min="0" value={data[keyName][k]} onChange={(e) => set({ [keyName]: { ...data[keyName], [k]: Number(e.target.value) } })} style={{ maxWidth: 110 }} /><span className="muted">days</span></div></Row>));
}
function LeaveRules({ who }) {
  const { data, set } = useData();
  const r = { maxDays: 0, noticeDays: 0, halfDay: true, ...(data.leaveRules?.[who] || {}) };
  const put1 = (patch) => set({ leaveRules: { teaching: { maxDays: 0, noticeDays: 0, halfDay: true }, nonTeaching: { maxDays: 0, noticeDays: 0, halfDay: true }, ...(data.leaveRules || {}), [who]: { ...r, ...patch } } });
  const name = who === 'teaching' ? 'teaching staff' : 'non-teaching staff';
  return (
    <Group title="Rules for applying" help="0 means no limit.">
      <Row label="Most days in one application"><div className="row" style={{ gap: 8 }}><Input aria-label={`Most days in one application, ${name}`} type="number" min="0" max="365" value={r.maxDays} onChange={(e) => put1({ maxDays: Number(e.target.value) })} style={{ maxWidth: 110 }} /><span className="muted">days</span></div></Row>
      <Row label="Days of notice needed" help="Sick leave never needs notice"><div className="row" style={{ gap: 8 }}><Input aria-label={`Days of notice needed, ${name}`} type="number" min="0" max="60" value={r.noticeDays} onChange={(e) => put1({ noticeDays: Number(e.target.value) })} style={{ maxWidth: 110 }} /><span className="muted">days</span></div></Row>
      <Row label="Half-day leave is allowed" help={`For ${name}`}><div className="set-end"><Switch label={`Half-day leave is allowed for ${name}`} checked={r.halfDay} onChange={(halfDay) => put1({ halfDay })} /></div></Row>
    </Group>
  );
}
export function Leave() {
  const { data, set } = useData();
  const [who, setWho] = useState('teaching');
  return (
    <>
      <Tabs tabs={[['teaching', 'Teaching staff'], ['staff', 'Non-teaching and transport']]} value={who} onChange={setWho} />
      {who === 'teaching' ? (<>
        <Group title="Yearly allowance" help="Days per school year for teaching staff."><Allowance keyName="leaveBalances" /></Group>
        <LeaveRules who="teaching" />
      </>) : (<>
        <Group title="Yearly allowance" help="Days per school year for non-teaching and transport staff. Unpaid leave has no limit."><Allowance keyName="staffLeaveBalances" /></Group>
        <LeaveRules who="nonTeaching" />
        <Group title="Who approves transport staff leave">
          <Row top label="Approved by" help="Either way the officer can send any single leave to you. Those waiting are under Staff leave, Transport staff.">
            <Select aria-label="Who approves transport staff leave" value={data.transportLeaveApprover || 'officer'} onChange={(e) => set({ transportLeaveApprover: e.target.value })} options={[{ value: 'officer', label: 'The Transport officer (the admin is told)' }, { value: 'admin', label: 'The School Admin (the officer can only pass applications on)' }]} /></Row>
        </Group>
      </>)}
    </>
  );
}

// ── Staff attendance ──
export function StaffAttendanceGroup() {
  const { data, set } = useData();
  const sa = data.staffAttendance; const toast = useToast();
  const [locating, setLocating] = useState(false);
  const setSa = (patch) => set({ staffAttendance: { ...sa, ...patch } });
  const useHere = () => { setLocating(true); navigator.geolocation.getCurrentPosition((p) => { setSa({ location: { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), radiusMeters: sa.location?.radiusMeters || 200 } }); setLocating(false); }, () => { setLocating(false); toast('Could not get your location. Allow location access, or type the coordinates.', 'error'); }); };
  const unit = (u) => <span className="muted">{u}</span>;
  return (
    <>
      <Group title="Shift">
        <Row label="Shift starts"><Input aria-label="Shift starts" type="time" value={sa.shiftStart} onChange={(e) => setSa({ shiftStart: e.target.value })} style={{ maxWidth: 160 }} /></Row>
        <Row label="Shift ends"><Input aria-label="Shift ends" type="time" value={sa.shiftEnd} onChange={(e) => setSa({ shiftEnd: e.target.value })} style={{ maxWidth: 160 }} /></Row>
        <Row label="Grace period" help="Arriving within this is on time"><div className="row" style={{ gap: 8 }}><Input aria-label="Grace period (minutes)" type="number" min="0" value={sa.graceMinutes} onChange={(e) => setSa({ graceMinutes: num(e.target.value) })} style={{ maxWidth: 110 }} />{unit('minutes')}</div></Row>
        <Row label="Full day"><div className="row" style={{ gap: 8 }}><Input aria-label="Full day (hours)" type="number" min="1" step="0.5" value={sa.fullDayHours} onChange={(e) => setSa({ fullDayHours: num(e.target.value) })} style={{ maxWidth: 110 }} />{unit('hours')}</div></Row>
        <Row label="Half day below"><div className="row" style={{ gap: 8 }}><Input aria-label="Half day below (hours)" type="number" min="0.5" step="0.5" value={sa.halfDayHours} onChange={(e) => setSa({ halfDayHours: num(e.target.value) })} style={{ maxWidth: 110 }} />{unit('hours')}</div></Row>
      </Group>
      <Group title="Check-in">
        <Row label="Check-in opens" help="Staff cannot check in earlier than this"><div className="row" style={{ gap: 8 }}><Input aria-label="Check-in opens (minutes before shift)" type="number" min="0" max="600" value={sa.checkInOpensBeforeMinutes ?? 60} onChange={(e) => setSa({ checkInOpensBeforeMinutes: num(e.target.value) })} style={{ maxWidth: 110 }} />{unit('minutes before')}</div></Row>
        <Row label="Closes when the shift ends" help="The office can still enter a time"><div className="set-end"><Switch label="Check-in closes when the shift ends" checked={sa.checkInClosesAtShiftEnd !== false} onChange={(checkInClosesAtShiftEnd) => setSa({ checkInClosesAtShiftEnd })} /></div></Row>
      </Group>
      <Group title="Check in only from the school" help="Optional. Staff without a login, and machine imports, are not affected.">
        <Row label="Limit check-in to the school" help="A check-in from outside the distance is refused"><div className="set-end"><Switch label="Limit check-in to the school" checked={!!sa.location} onChange={(on) => setSa({ location: on ? { lat: 0, lng: 0, radiusMeters: 200 } : null })} /></div></Row>
        {sa.location && (<>
          <Row label="Latitude"><Input aria-label="Latitude" type="number" step="any" value={sa.location.lat} onChange={(e) => setSa({ location: { ...sa.location, lat: num(e.target.value) } })} /></Row>
          <Row label="Longitude"><Input aria-label="Longitude" type="number" step="any" value={sa.location.lng} onChange={(e) => setSa({ location: { ...sa.location, lng: num(e.target.value) } })} /></Row>
          <Row label="Allowed distance"><div className="row" style={{ gap: 8 }}><Input aria-label="Allowed distance (metres)" type="number" min="20" value={sa.location.radiusMeters} onChange={(e) => setSa({ location: { ...sa.location, radiusMeters: num(e.target.value) } })} style={{ maxWidth: 110 }} />{unit('metres')}</div></Row>
          <div style={{ padding: '4px 20px 16px' }}><Button size="sm" loading={locating} onClick={useHere}>Use my current location</Button> <span className="muted small">Stand at the school and press it.</span></div>
        </>)}
      </Group>
    </>
  );
}

// ── Payroll ──
export function Payroll() {
  const { data, set } = useData();
  const st = data.statutory;
  const setSt = (k, patch) => set({ statutory: { ...st, [k]: { ...st[k], ...patch } } });
  const pct = (k, f, name) => <Input aria-label={name} type="number" step="0.01" value={st[k][f]} onChange={(e) => setSt(k, { [f]: num(e.target.value) })} style={{ maxWidth: 110 }} />;
  return (
    <>
      <div className="small muted">Switch on what applies to your school. These are deducted on every payslip, unless a pay level already has its own line for that deduction (it is then used, never added twice). Employer shares are shown in the monthly statutory report.</div>
      <Group title="Provident Fund (PF)">
        <Row label="Deducted on every payslip"><div className="set-end"><Switch label="Provident Fund (PF)" checked={st.pf.enabled} onChange={(enabled) => setSt('pf', { enabled })} /></div></Row>
        {st.pf.enabled && (<>
          <Row label="Employee"><div className="row" style={{ gap: 8 }}>{pct('pf', 'employeeRate', 'PF employee %')}<span className="muted">%</span></div></Row>
          <Row label="Employer"><div className="row" style={{ gap: 8 }}>{pct('pf', 'employerRate', 'PF employer %')}<span className="muted">%</span></div></Row>
          <Row label="Wage ceiling"><div className="row" style={{ gap: 8 }}><Input aria-label="PF wage ceiling" type="number" value={st.pf.wageCeiling} onChange={(e) => setSt('pf', { wageCeiling: num(e.target.value) })} style={{ maxWidth: 140 }} /><span className="muted">₹ / month</span></div></Row>
        </>)}
      </Group>
      <Group title="ESI">
        <Row label="Applies up to a gross salary"><div className="set-end"><Switch label="ESI" checked={st.esi.enabled} onChange={(enabled) => setSt('esi', { enabled })} /></div></Row>
        {st.esi.enabled && (<>
          <Row label="Employee"><div className="row" style={{ gap: 8 }}>{pct('esi', 'employeeRate', 'ESI employee %')}<span className="muted">%</span></div></Row>
          <Row label="Employer"><div className="row" style={{ gap: 8 }}>{pct('esi', 'employerRate', 'ESI employer %')}<span className="muted">%</span></div></Row>
          <Row label="Applies up to gross"><div className="row" style={{ gap: 8 }}><Input aria-label="ESI gross ceiling" type="number" value={st.esi.grossCeiling} onChange={(e) => setSt('esi', { grossCeiling: num(e.target.value) })} style={{ maxWidth: 140 }} /><span className="muted">₹ / month</span></div></Row>
        </>)}
      </Group>
      <Group title="Professional Tax">
        <Row label="Slabs by gross salary"><div className="set-end"><Switch label="Professional Tax" checked={st.pt.enabled} onChange={(enabled) => setSt('pt', { enabled })} /></div></Row>
        {st.pt.enabled && st.pt.slabs.map((sl, i) => (
          <Row key={i} label={`Slab ${i + 1}`}>
            <div className="row" style={{ gap: 8 }}><span className="muted">Gross up to ₹</span><Input aria-label={`Slab ${i + 1} up to`} type="number" value={sl.upTo >= 1e9 ? '' : sl.upTo} placeholder="no limit" onChange={(e) => setSt('pt', { slabs: st.pt.slabs.map((x, j) => (j === i ? { ...x, upTo: e.target.value === '' ? 1000000000 : num(e.target.value) } : x)) })} style={{ maxWidth: 120 }} /><span className="muted">tax ₹</span><Input aria-label={`Slab ${i + 1} amount`} type="number" value={sl.amount} onChange={(e) => setSt('pt', { slabs: st.pt.slabs.map((x, j) => (j === i ? { ...x, amount: num(e.target.value) } : x)) })} style={{ maxWidth: 100 }} /></div>
          </Row>))}
      </Group>
    </>
  );
}

