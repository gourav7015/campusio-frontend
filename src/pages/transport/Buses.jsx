import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { del, patch, post } from '../../api/client.js';
import { ArrowLeftRight, FileText, MoreHorizontal, Pencil } from 'lucide-react';
import VehicleDocuments from '../../components/VehicleDocuments.jsx';
import { Button as DButton, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, FilterBar, ListCard } from '../../design/ui';
import { cn } from '../../design/lib/cn';
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
  const [swap, setSwap] = useState(null); const [edit, setEdit] = useState(null); const [view, setView] = useState(null); const [docsOf, setDocsOf] = useState(null); // view: the whole bus (riders, stops, papers); docsOf: only its papers
  return (
    <div className="stack">
      <PageHeader title="Buses and riders" subtitle={readOnly ? 'Managed by the Transport officer. You can see everything here, but buses and riders are changed from the Transport desk.' : 'Vehicles, their driver and conductor, routes and stops, and the students who ride each bus. Students see their own bus on their portal.'}
        actions={!readOnly && <Button variant="primary" onClick={() => setEdit({ ...blank })}>+ Add bus</Button>} />
      <Async skeleton="table" state={list} empty={<Empty title="No buses yet" />}>{(rows) => {
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
          <ListCard>
            <FilterBar search={fl.q} onSearch={(v) => setF({ q: v })} searchLabel="Search buses" placeholder="Search bus, route, driver or conductor">
              <Select aria-label="Status" value={fl.status} onChange={(e) => setF({ status: e.target.value })} placeholder="Any status" options={[{ value: 'active', label: 'Running' }, { value: 'maintenance', label: 'In maintenance' }, { value: 'retired', label: 'Retired' }]} />
              <Select aria-label="Needs attention" value={fl.attention} onChange={(e) => setF({ attention: e.target.value })} placeholder="Everything" options={[{ value: 'crew', label: 'Short of a driver or conductor' }, { value: 'papers', label: 'Certificates or licences expired or due soon' }, { value: 'nodocs', label: 'No documents added' }]} />
              {filtered && <Button size="sm" onClick={() => setFl({ q: '', status: '', attention: '' })}>Clear</Button>}
            </FilterBar>
            <div className="border-b border-border/70 px-4 py-2 text-[13.5px] text-muted-foreground" role="status">{shown.length} of {rows.length} buses</div>
            <DataTable compact rows={shown} pageSize={25} empty="No buses match these choices" onRowClick={(b) => setView(b._id)} columns={[
              { label: 'Bus', sort: (b) => b.busNo, render: (b) => <><div className="whitespace-nowrap"><b>{b.busNo}</b>{b.status !== 'active' && <> <Badge tone={tone(b.status)}>{label(b.status)}</Badge></>}</div><div className="small muted truncate" style={{ maxWidth: 150 }} title={[b.registrationNo, b.vehicleModel].filter(Boolean).join(' · ')}>{b.registrationNo}</div></> },
              { label: 'Route', render: (b) => <><div className="max-w-[140px] xl:max-w-[190px]">{b.routeName || '—'}</div><div className="small muted whitespace-nowrap">{b.stops.length} stops{b.startTime ? ` · ${b.startTime}` : ''}</div></> },
              { label: 'Crew', render: (b) => (
                <div className="max-w-[130px] space-y-1 text-sm xl:max-w-[190px]">
                  <div className="truncate" title={b.driver ? `${b.driver.name} ${b.driver.phone || ''}` : undefined}><span className="small muted">Driver </span>{b.driver ? b.driver.name : <Badge tone="amber">None yet</Badge>}</div>
                  <div className="truncate" title={b.conductor ? `${b.conductor.name} ${b.conductor.phone || ''}` : undefined}><span className="small muted">Conductor </span>{b.conductor ? b.conductor.name : <Badge tone="amber">None yet</Badge>}</div>
                </div>) },
              { label: 'Seats', sort: (b) => b.students / (b.capacity || 1), render: (b) => (
                <div className="flex items-center gap-2 whitespace-nowrap" title={`${b.students} of ${b.capacity} seats taken`}>
                  <div className="hidden h-1.5 w-10 overflow-hidden rounded-full bg-muted xl:block" aria-hidden><div className={cn('h-full rounded-full', b.students >= b.capacity ? 'bg-danger' : b.students > b.capacity * 0.85 ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.min(100, (b.students / (b.capacity || 1)) * 100)}%` }} /></div>
                  <span className="text-[13px] tabular-nums">{b.students} / {b.capacity}</span>
                </div>) },
              { label: 'Papers', render: (b) => (
                <div className="flex flex-col items-start gap-1">
                  {b.documents?.total ? <Badge tone={b.documents.withCopy < b.documents.total ? 'amber' : 'green'}>{b.documents.total} on file</Badge> : <Badge tone="amber">None added</Badge>}
                  {b.alerts.map((a, i) => <Badge key={i} tone={a.expired ? 'red' : 'amber'} title={fmtDate(a.date, true)}>{a.field} {a.expired ? 'expired' : 'due'} {fmtDate(a.date)}</Badge>)}
                </div>) },
              { label: '', render: (b) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button size="sm" aria-label={readOnly ? 'Open' : 'Riders and stops'} onClick={(e) => { e.stopPropagation(); setView(b._id); }}>{readOnly ? 'Open' : 'Riders'}</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><DButton variant="ghost" size="icon-sm" aria-label={`More for bus ${b.busNo}`} onClick={(e) => e.stopPropagation()}><MoreHorizontal /></DButton></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => setDocsOf(b)}><FileText /> Documents</DropdownMenuItem>
                      {!readOnly && <DropdownMenuItem onSelect={() => setEdit(b)}><Pencil /> Edit bus</DropdownMenuItem>}
                      {!readOnly && <DropdownMenuItem onSelect={() => setSwap(b)}><ArrowLeftRight /> Swap crew…</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>) },
            ]} />
          </ListCard></>);
      }}</Async>
      {edit && <BusModal base={base} bus={edit} onClose={() => setEdit(null)} onSaved={list.reload} />}
      {swap && <SwapCrewModal base={base} bus={swap} buses={list.data || []} onClose={() => setSwap(null)} onDone={list.reload} />}
      {docsOf && <BusDocuments base={base} bus={docsOf} readOnly={readOnly} onClose={() => { setDocsOf(null); list.reload(); }} />}
      {view && <BusDetail base={base} id={view} readOnly={readOnly} onClose={() => { setView(null); list.reload(); }} />}
    </div>
  );
}

/** Swap crew between this bus and another one (the driver, the conductor, or both), or this bus's driver and conductor with each other. Previewed first. */
function SwapCrewModal({ base, bus, buses, onClose, onDone }) {
  const [what, setWhat] = useState('driver'); const [other, setOther] = useState('');
  const [pre, setPre] = useState(null); const [run, busy] = useAction();
  const body = (preview) => ({ busId: bus._id, what, ...(what === 'roles' ? {} : { otherBusId: other }), preview });
  const ready = what === 'roles' || !!other;
  const change = (patch) => { if ('what' in patch) setWhat(patch.what); if ('other' in patch) setOther(patch.other); setPre(null); };
  const crewText = (b) => `${b.busNo}: ${b.driver?.name || 'no driver'} / ${b.conductor?.name || 'no conductor'}`;
  return (
    <Modal wide title={`Swap crew · ${bus.busNo}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button>
      {!pre ? <Button variant="primary" loading={busy} disabled={!ready} onClick={async () => { const r = await run(() => post(`${base}/buses/swap`, body(true))); if (r) setPre(r); }}>Preview</Button>
        : <Button variant="primary" loading={busy} onClick={async () => { const r = await run(() => post(`${base}/buses/swap`, body(false)), 'Crew swapped'); if (r) { onDone(); onClose(); } }}>Swap now</Button>}</>}>
      <div className="stack">
        <div className="alert info">Now: {crewText(bus)}</div>
        <div className="form-grid">
          <Field label="What to swap"><Select aria-label="What to swap" value={what} onChange={(e) => change({ what: e.target.value })} options={[{ value: 'driver', label: 'The drivers of the two buses' }, { value: 'conductor', label: 'The conductors of the two buses' }, { value: 'both', label: 'The whole crews (driver and conductor)' }, { value: 'roles', label: 'This bus: driver and conductor with each other' }]} /></Field>
          {what !== 'roles' && <Field label="With bus"><Select aria-label="With bus" value={other} onChange={(e) => change({ other: e.target.value })} placeholder="Choose a bus" options={buses.filter((x) => x._id !== bus._id).map((x) => ({ value: x._id, label: crewText(x) }))} /></Field>}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Each person must be able to do the job they move to. A driver marked "can also be a conductor" can take a conductor's seat.</p>
        {pre && <DataTable rows={pre.changes.map((c, i) => ({ ...c, key: `${i}` }))} rowKey="key" columns={[{ label: 'Bus', render: (c) => <b>{c.busNo}</b> }, { label: 'Seat', render: (c) => label(c.seat) }, { label: 'Now', render: (c) => c.from || '—' }, { label: 'After', render: (c) => <b>{c.to || 'No one'}</b> }]} />}
      </div>
    </Modal>
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
  const people = staff.data?.items || [];
  const skills = (s) => s.busRoles || (s.busRole ? [s.busRole] : []);
  // only people who can fill the seat, who are not on another bus, and who are not already in the other seat of this one
  const crew = (role) => people.filter((s) => skills(s).includes(role) && (!s.bus || s.bus.busNo === bus.busNo) && s._id !== (role === 'driver' ? f.conductorId : f.driverId))
    .map((s) => ({ value: s._id, label: `${s.name} (${s.staffId})${s.licenseNo ? ` · ${s.licenseNo}` : ''}${skills(s).length > 1 ? ' · driver and conductor' : ''}` }));
  const canFill = (id, role) => { const s = people.find((x) => x._id === id); return !id || (!!s && skills(s).includes(role)); };
  const canSwap = !!(f.driverId || f.conductorId) && canFill(f.driverId, 'conductor') && canFill(f.conductorId, 'driver');
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
          <Field label="Swap seats" full hint={canSwap ? 'The driver becomes the conductor and the conductor becomes the driver. Save the bus to keep it.' : 'Seats can be swapped only when each person is marked as able to do the other job (Drivers and staff, Edit, "Can also work as").'}>
            <div><Button type="button" disabled={!canSwap} onClick={() => setF((x) => ({ ...x, driverId: x.conductorId, conductorId: x.driverId }))}><ArrowLeftRight className="size-4" aria-hidden /> Swap driver and conductor</Button></div>
          </Field>
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
      <Async skeleton="profile" state={d}>{(b) => (
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
        {sectionId && <Async skeleton="datatable" keep state={students}>{(rows) => <div className="table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}><table><tbody>{rows.map((s) => (
          <tr key={s.studentId}><td><input type="checkbox" aria-label={`Select ${s.name}`} disabled={!!s.bus && s.bus !== bus.busNo} checked={picked.has(s.studentId)} onChange={() => toggle(s.studentId)} /></td><td>{s.rollNo}</td><td><b>{s.name}</b></td><td>{s.bus ? <Badge tone={s.bus === bus.busNo ? 'green' : ''}>{s.bus === bus.busNo ? 'on this bus' : `on ${s.bus}`}</Badge> : <span className="muted">no bus</span>}</td></tr>))}</tbody></table></div>}</Async>}
        {picked.size > free && <div className="alert">Only {free} seat(s) are free.</div>}
      </div>
    </Modal>
  );
}
