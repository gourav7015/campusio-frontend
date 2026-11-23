import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { del, patch, post } from '../../api/client.js';
import VehicleDocuments from '../../components/VehicleDocuments.jsx';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';

const tone = (s) => ({ active: 'green', maintenance: 'amber', retired: '' }[s] || '');
const blank = { busNo: '', registrationNo: '', vehicleModel: '', capacity: 40, status: 'active', routeName: '', startTime: '', endTime: '', monthlyFare: '', stops: [], driverId: '', conductorId: '', notes: '' };
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

/**
 * The school's buses: vehicle, who drives and conducts (chosen from the staff list), route and stops, and who rides.
 * The Transport officer edits everything; the School Admin gets the same page read-only (readOnly).
 */
export default function Buses({ base, readOnly = false }) {
  const list = useApi(`${base}/buses`);
  const [sp] = useSearchParams();
  // the dashboard links here already narrowed (?attention=crew or papers); these are the choices on screen
  const [fl, setFl] = useState({ q: '', status: '', attention: ['crew', 'papers', 'nodocs'].includes(sp.get('attention')) ? sp.get('attention') : '' });
  const setF = (patch) => setFl((x) => ({ ...x, ...patch }));
  const [edit, setEdit] = useState(null); const [view, setView] = useState(null); const [docsOf, setDocsOf] = useState(null); // view: the whole bus (riders, stops, papers); docsOf: only its papers
  return (
    <div className="stack">
      <PageHeader title="Buses and riders" subtitle={readOnly ? 'Managed by the Transport officer. You can see everything here, but buses and riders are changed from the Transport desk.' : 'Vehicles, their driver and conductor, routes and stops, and the students who ride each bus. Students see their own bus on their portal.'}
        actions={!readOnly && <Button variant="primary" onClick={() => setEdit({ ...blank })}>+ Add bus</Button>} />
      <Async state={list} empty={<Empty title="No buses yet" />}>{(rows) => {
        const riders = rows.reduce((n, b) => n + b.students, 0); const seats = rows.filter((b) => b.status === 'active').reduce((n, b) => n + b.capacity, 0);
        const alerts = rows.flatMap((b) => b.alerts.map((a) => ({ bus: b.busNo, ...a })));
        const nq = fl.q.trim().toLowerCase();
        const shortOfCrew = (b) => b.status === 'active' && (!b.driver || !b.conductor);
        const shown = rows.filter((b) => (!fl.status || b.status === fl.status)
          && (!fl.attention || (fl.attention === 'crew' ? shortOfCrew(b) : fl.attention === 'papers' ? b.alerts.length > 0 : !b.documents?.total))
          && (!nq || [b.busNo, b.registrationNo, b.routeName, b.driver?.name, b.conductor?.name].some((v) => String(v || '').toLowerCase().includes(nq))));
        const filtered = Object.values(fl).some(Boolean);
        return (<>
          <div className="grid g3"><Stat value={rows.length} label="Buses" sub={`${rows.filter((b) => b.status === 'active').length} running`} /><Stat value={riders} label="Students ride" sub={`${seats - riders} seats free`} tone="blue" /><Stat value={alerts.length} label="Certificates to renew" sub="expired or within 30 days" tone={alerts.length ? 'red' : 'green'} /></div>
          <Card><div className="row wrap" style={{ alignItems: 'end' }}>
            <Field label="Search"><Input aria-label="Search buses" placeholder="Bus, route, driver or conductor" value={fl.q} onChange={(e) => setF({ q: e.target.value })} /></Field>
            <Field label="Status"><Select aria-label="Status" value={fl.status} onChange={(e) => setF({ status: e.target.value })} placeholder="Any status" options={[{ value: 'active', label: 'Running' }, { value: 'maintenance', label: 'In maintenance' }, { value: 'retired', label: 'Retired' }]} /></Field>
            <Field label="Needs attention"><Select aria-label="Needs attention" value={fl.attention} onChange={(e) => setF({ attention: e.target.value })} placeholder="Everything" options={[{ value: 'crew', label: 'Short of a driver or conductor' }, { value: 'papers', label: 'Certificates or licences expired or due soon' }, { value: 'nodocs', label: 'No documents added' }]} /></Field>
            {filtered && <Button onClick={() => setFl({ q: '', status: '', attention: '' })}>Clear</Button>}
            <span className="muted small" role="status" style={{ alignSelf: 'center' }}>{shown.length} of {rows.length} buses</span>
          </div></Card>
          <Card flush><DataTable rows={shown} empty="No buses match these choices" onRowClick={(b) => setView(b._id)} columns={[
            { label: 'Bus', render: (b) => <><b>{b.busNo}</b> <Badge tone={tone(b.status)}>{label(b.status)}</Badge><div className="small muted">{b.registrationNo} {b.vehicleModel ? `· ${b.vehicleModel}` : ''}</div></> },
            { label: 'Route', render: (b) => <>{b.routeName || '—'}<div className="small muted">{b.stops.length} stops{b.startTime ? ` · starts ${b.startTime}` : ''}</div></> },
            { label: 'Driver', render: (b) => (b.driver ? <>{b.driver.name}<div className="small muted">{b.driver.phone}</div></> : <Badge tone="amber">No driver</Badge>) },
            { label: 'Conductor', render: (b) => (b.conductor ? <>{b.conductor.name}<div className="small muted">{b.conductor.phone}</div></> : <Badge tone="amber">No conductor</Badge>) },
            { label: 'Seats', render: (b) => <Badge tone={b.students >= b.capacity ? 'red' : b.students > b.capacity * 0.85 ? 'amber' : 'green'}>{b.students} / {b.capacity}</Badge> },
            { label: 'Documents', render: (b) => (b.documents?.total ? <Badge tone={b.documents.withCopy < b.documents.total ? 'amber' : 'green'}>{b.documents.total} on file</Badge> : <Badge tone="amber">None added</Badge>) },
            { label: 'To renew', render: (b) => (b.alerts.length ? <div className="stack" style={{ gap: 2 }}>{b.alerts.map((a, i) => <Badge key={i} tone={a.expired ? 'red' : 'amber'} title={fmtDate(a.date, true)}>{a.field}: {a.expired ? 'expired' : 'due'} {fmtDate(a.date, true)}</Badge>)}</div> : <span className="muted">—</span>) },
            { label: '', render: (b) => <div className="row"><Button size="sm" onClick={(e) => { e.stopPropagation(); setView(b._id); }}>{readOnly ? 'Open' : 'Riders and stops'}</Button><Button size="sm" onClick={(e) => { e.stopPropagation(); setDocsOf(b); }}>Documents</Button>{!readOnly && <Button size="sm" onClick={(e) => { e.stopPropagation(); setEdit(b); }}>Edit</Button>}</div> },
          ]} /></Card></>);
      }}</Async>
      {edit && <BusModal base={base} bus={edit} onClose={() => setEdit(null)} onSaved={list.reload} />}
      {docsOf && <BusDocuments base={base} bus={docsOf} readOnly={readOnly} onClose={() => { setDocsOf(null); list.reload(); }} />}
      {view && <BusDetail base={base} id={view} readOnly={readOnly} onClose={() => { setView(null); list.reload(); }} />}
    </div>
  );
}

function BusModal({ base, bus, onClose, onSaved }) {
  const isNew = !bus._id;
  const staff = useApi(`${base}/staff`, { limit: 200 });
  const [f, setF] = useState({ ...blank, ...bus, driverId: bus.driverId || '', conductorId: bus.conductorId || '', stops: (bus.stops || []).map((s) => ({ ...s })) });
  const [run, busy] = useAction();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const stop = (i, p, v) => set('stops', f.stops.map((s, j) => (j === i ? { ...s, [p]: v } : s)));
  // only people who can fill the seat, and who are not already on another bus
  const crew = (role) => (staff.data?.items || []).filter((s) => s.busRole === role && (!s.bus || s.bus.busNo === bus.busNo)).map((s) => ({ value: s._id, label: `${s.name} (${s.staffId})${s.licenseNo ? ` · ${s.licenseNo}` : ''}` }));
  const save = async () => {
    const body = { monthlyFare: Number(f.monthlyFare) || 0, ...clean({ busNo: f.busNo.trim(), registrationNo: f.registrationNo, vehicleModel: f.vehicleModel, status: f.status, routeName: f.routeName, startTime: f.startTime, endTime: f.endTime, notes: f.notes }),
      capacity: Number(f.capacity), driverId: f.driverId || null, conductorId: f.conductorId || null, stops: f.stops.filter((s) => s.name.trim()).map((s) => ({ ...clean({ name: s.name.trim(), pickupTime: s.pickupTime, dropTime: s.dropTime }), ...(s.fare !== '' && s.fare != null ? { fare: Number(s.fare) } : {}) })) };
    const ok = await run(() => (isNew ? post(`${base}/buses`, body) : patch(`${base}/buses/${bus._id}`, body)), isNew ? 'Bus added' : 'Bus updated');
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal wide title={isNew ? 'Add bus' : `Edit bus ${bus.busNo}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.busNo.trim() || !(Number(f.capacity) > 0)} onClick={save}>Save bus</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Bus number"><Input value={f.busNo} onChange={(e) => set('busNo', e.target.value)} placeholder="GJ-03-01" /></Field>
          <Field label="Registration number"><Input value={f.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} placeholder="GJ03AB1234" /></Field>
          <Field label="Vehicle model"><Input value={f.vehicleModel} onChange={(e) => set('vehicleModel', e.target.value)} placeholder="Tata Starbus 40-seater" /></Field>
          <Field label="Seats"><Input type="number" min="1" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value)} options={['active', 'maintenance', 'retired']} /></Field>
          <Field label="Monthly fare per student (₹)" hint="Billed to each rider by Finance every month. A stop below can have its own fare."><Input type="number" min="0" value={f.monthlyFare} onChange={(e) => set('monthlyFare', e.target.value)} /></Field>
          <Field label="Route name"><Input value={f.routeName} onChange={(e) => set('routeName', e.target.value)} placeholder="Route 1 — Kalawad Road" /></Field>
          <Field label="First pick-up"><Input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
          <Field label="Reaches school"><Input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
          <Field label="Driver" hint="Add drivers in Transport staff first"><Select value={f.driverId} onChange={(e) => set('driverId', e.target.value)} placeholder="No driver yet" options={crew('driver')} /></Field>
          <Field label="Conductor" hint="Add conductors in Transport staff first"><Select value={f.conductorId} onChange={(e) => set('conductorId', e.target.value)} placeholder="No conductor yet" options={crew('conductor')} /></Field>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row between"><div className="bold">Route stops</div><Button size="sm" type="button" onClick={() => set('stops', [...f.stops, { name: '', pickupTime: '', dropTime: '' }])}>+ Add stop</Button></div>
          {f.stops.map((s, i) => (
            <div className="row" key={i} style={{ gap: 6 }}>
              <Input aria-label={`Stop name ${i + 1}`} placeholder="Stop name" value={s.name} onChange={(e) => stop(i, 'name', e.target.value)} />
              <Input aria-label={`Pick-up time ${i + 1}`} type="time" value={s.pickupTime || ''} onChange={(e) => stop(i, 'pickupTime', e.target.value)} style={{ maxWidth: 130 }} />
              <Input aria-label={`Drop time ${i + 1}`} type="time" value={s.dropTime || ''} onChange={(e) => stop(i, 'dropTime', e.target.value)} style={{ maxWidth: 130 }} />
              <Input aria-label={`Fare ${i + 1}`} type="number" min="0" placeholder="₹ fare" value={s.fare ?? ''} onChange={(e) => stop(i, 'fare', e.target.value)} style={{ maxWidth: 110 }} />
              <Button size="sm" variant="danger" type="button" aria-label={`Remove stop ${i + 1}`} onClick={() => set('stops', f.stops.filter((_, j) => j !== i))}>Remove</Button>
            </div>))}
        </div>
      </div>
    </Modal>
  );
}

/** Only the bus's papers (registration, insurance, pollution...), without the riders and stops. */
function BusDocuments({ base, bus, readOnly, onClose }) {
  return (
    <Modal wide title={`Documents · Bus ${bus.busNo}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <VehicleDocuments base={base} busId={bus._id} readOnly={readOnly} />
    </Modal>
  );
}

function BusDetail({ base, id, readOnly, onClose }) {
  const d = useApi(`${base}/buses/${id}`);
  const [add, setAdd] = useState(false); const [run] = useAction();
  return (
    <Modal wide title={d.data ? `Bus ${d.data.busNo}` : 'Bus'} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Async state={d}>{(b) => (
        <div className="stack">
          <div className="grid g2">
            <Card title="Vehicle and route"><dl className="kv"><dt>Registration</dt><dd>{b.registrationNo || '—'}</dd><dt>Model</dt><dd>{b.vehicleModel || '—'}</dd><dt>Route</dt><dd>{b.routeName || '—'}</dd><dt>Timing</dt><dd>{b.startTime || '—'} → {b.endTime || '—'}</dd><dt>Seats</dt><dd>{b.students.length} of {b.capacity} taken</dd><dt>Monthly fare</dt><dd>{b.monthlyFare ? fmtMoney(b.monthlyFare) : '—'}</dd>
              </dl></Card>
            <Card title="Driver and conductor"><dl className="kv"><dt>Driver</dt><dd><b>{b.driver?.name || '—'}</b></dd><dt>Phone</dt><dd>{b.driver?.phone || '—'}</dd><dt>Licence</dt><dd>{b.driver?.licenseNo || '—'}{b.driver?.licenseExpiry ? ` (to ${fmtDate(b.driver.licenseExpiry, true)})` : ''}</dd><dt>Conductor</dt><dd><b>{b.conductor?.name || '—'}</b></dd><dt>Phone</dt><dd>{b.conductor?.phone || '—'}</dd></dl></Card>
          </div>
          <VehicleDocuments base={base} busId={id} readOnly={readOnly} onChange={d.reload} />
          {b.stops.length > 0 && <Card title="Stops" flush><DataTable rows={b.stops} rowKey="name" columns={[{ label: 'Stop', render: (s) => <b>{s.name}</b> }, { label: 'Pick-up', key: 'pickupTime' }, { label: 'Drop', key: 'dropTime' }, { label: 'Fare / month', render: (s) => (s.fare != null ? fmtMoney(s.fare) : '—') }, { label: 'Students', render: (s) => b.students.filter((x) => x.stop === s.name).length }]} /></Card>}
          <Card title={`Students on this bus (${b.students.length})`} action={!readOnly && <Button size="sm" variant="primary" onClick={() => setAdd(true)} disabled={b.status !== 'active' || b.students.length >= b.capacity}>+ Add students</Button>} flush>
            <DataTable rows={b.students} rowKey="studentId" empty="No students assigned yet" columns={[{ label: 'Student', render: (s) => <><b>{s.name}</b><div className="small muted">{s.admissionNo}</div></> }, { label: 'Class', render: (s) => (s.className ? `${s.className} ${s.section}` : '—') }, { label: 'Stop', key: 'stop' }, { label: 'Since', render: (s) => fmtDate(s.since, true) },
              ...(readOnly ? [] : [{ label: '', render: (s) => <ConfirmButton size="sm" message={`Remove ${s.name} from this bus?`} onConfirm={async () => { await run(() => del(`${base}/students/${s.studentId}`), 'Removed from bus'); d.reload(); }}>Remove</ConfirmButton> }])]} />
          </Card>
          {!readOnly && <ConfirmButton variant="danger" message={`Delete bus ${b.busNo}?`} onConfirm={async () => { const ok = await run(() => del(`${base}/buses/${b._id}`), 'Bus deleted'); if (ok) onClose(); }}>Delete bus</ConfirmButton>}
          {add && <AddStudents base={base} bus={b} onClose={() => setAdd(false)} onDone={d.reload} />}
        </div>
      )}</Async>
    </Modal>
  );
}

function AddStudents({ base, bus, onClose, onDone }) {
  const lookups = useApi(`${base}/lookups`);
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState(''); const [stop, setStop] = useState(''); const [picked, setPicked] = useState(new Set());
  const [run, busy] = useAction();
  const sections = (lookups.data?.sections || []).filter((s) => s.classId === classId);
  const students = useApi(sectionId ? `${base}/students` : null, { sectionId });
  const free = bus.capacity - bus.students.length;
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Modal title={`Add students to bus ${bus.busNo}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!picked.size || picked.size > free} onClick={async () => {
      const ok = await run(() => post(`${base}/assign`, { busId: bus._id, studentIds: [...picked], ...(stop ? { stop } : {}) }), `${picked.size} student(s) added`);
      if (ok) { onDone(); onClose(); }
    }}>Add {picked.size || ''} student{picked.size === 1 ? '' : 's'}</Button></>}>
      <div className="stack">
        <div className="row wrap">
          <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPicked(new Set()); }} placeholder="Class" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="Section" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPicked(new Set()); }} placeholder="Section" options={sections.map((s) => ({ value: s._id, label: s.name }))} disabled={!classId} />
        </div>
        <Field label="Boarding stop" hint={`${free} seat(s) free · Finance bills the monthly fare to each rider (${bus.stops.find((s) => s.name === stop)?.fare != null ? fmtMoney(bus.stops.find((s) => s.name === stop).fare) : bus.monthlyFare ? fmtMoney(bus.monthlyFare) : 'no fare set'})`}><Select value={stop} onChange={(e) => setStop(e.target.value)} placeholder="Choose a stop" options={bus.stops.map((s) => s.name)} /></Field>
        {sectionId && <Async state={students}>{(rows) => <div className="table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}><table><tbody>{rows.map((s) => (
          <tr key={s.studentId}><td><input type="checkbox" aria-label={`Select ${s.name}`} disabled={!!s.bus && s.bus !== bus.busNo} checked={picked.has(s.studentId)} onChange={() => toggle(s.studentId)} /></td><td>{s.rollNo}</td><td><b>{s.name}</b></td><td>{s.bus ? <Badge tone={s.bus === bus.busNo ? 'green' : ''}>{s.bus === bus.busNo ? 'on this bus' : `on ${s.bus}`}</Badge> : <span className="muted">no bus</span>}</td></tr>))}</tbody></table></div>}</Async>}
        {picked.size > free && <div className="alert">Only {free} seat(s) are free.</div>}
      </div>
    </Modal>
  );
}
