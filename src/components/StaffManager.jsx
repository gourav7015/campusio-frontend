import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { del, patch, post } from '../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, CredentialsModal, DataTable, Empty, Field, Input, Modal, Select, useAction, fmtDate, label } from './ui.jsx';

const soon = (iso, today = new Date().toISOString().slice(0, 10)) => iso && iso <= new Date(Date.parse(today) + 30 * 864e5).toISOString().slice(0, 10);
const BUS_ROLES = [{ value: '', label: 'None' }, { value: 'driver', label: 'Can drive a bus' }, { value: 'conductor', label: 'Can be a bus conductor' }];

/**
 * Non-teaching staff and the school's own designations (job titles).
 * Used by the School Admin (everyone) and by the Transport officer (transport staff only).
 */
export default function StaffManager({ staffBase, designationBase, canEdit = true, group = 'general', noun = 'staff member' }) {
  const [q, setQ] = useState(''); const [designationId, setDesignationId] = useState(''); const [status, setStatus] = useState('active');
  const list = useApi(staffBase, { q: q || undefined, designationId: designationId || undefined, status, limit: 200 });
  const designations = useApi(designationBase);
  const [edit, setEdit] = useState(null); const [manage, setManage] = useState(false); const [creds, setCreds] = useState(null);
  const [run] = useAction();
  const reload = () => { list.reload(); designations.reload(); };
  const active = (designations.data || []).filter((d) => d.status === 'active');
  return (
    <>
      <Card title={`${noun[0].toUpperCase()}${noun.slice(1)}s`} action={<div className="row wrap">
        <Input aria-label="Search staff" placeholder="Search name, id or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select aria-label="Designation" value={designationId} onChange={(e) => setDesignationId(e.target.value)} placeholder="All designations" options={(designations.data || []).map((d) => ({ value: d._id, label: `${d.name} (${d.staff})` }))} />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'all', label: 'All' }]} />
        {canEdit && <><Button size="sm" onClick={() => setManage(true)}>Designations</Button><Button size="sm" variant="primary" onClick={() => setEdit({})}>+ Add {noun}</Button></>}</div>} flush>
        <Async state={list} empty={<Empty title={`No ${noun}s yet`} />}>{(d) => (
          <DataTable rows={d.items} empty={`No ${noun}s match`} columns={[
            { label: 'ID', key: 'staffId' }, { label: 'Name', render: (s) => <><b>{s.name}</b><div className="small muted">{s.phone || '—'}</div></> },
            { label: 'Designation', render: (s) => <Badge tone={s.group === 'transport' ? 'blue' : ''}>{s.designation}</Badge> },
            { label: 'On bus', render: (s) => (s.bus ? <Badge tone="green">{s.bus.busNo} · {s.bus.as}</Badge> : s.busRole ? <Badge tone="amber">Not on a bus</Badge> : <span className="muted">—</span>) },
            { label: 'Licence', render: (s) => (s.licenseNo ? <>{s.licenseNo}<div className="small"><Badge tone={soon(s.licenseExpiry) ? 'red' : 'green'}>{s.licenseExpiry ? `valid to ${fmtDate(s.licenseExpiry, true)}` : 'no expiry set'}</Badge></div></> : <span className="muted">—</span>) },
            { label: 'Joined', render: (s) => fmtDate(s.joiningDate, true) }, { label: 'Login', render: (s) => (s.hasLogin ? <Badge tone="green">Has login</Badge> : <span className="muted">None</span>) }, { label: 'Status', render: (s) => <Badge tone={s.status === 'active' ? 'green' : ''}>{label(s.status)}</Badge> },
            ...(canEdit ? [{ label: '', render: (s) => <div className="row"><Button size="sm" onClick={() => setEdit(s)}>Edit</Button>
              {s.status === 'active' && (s.hasLogin
                ? <Button size="sm" onClick={async () => { const r = await run(() => post(`${staffBase}/${s._id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button>
                : <Button size="sm" onClick={async () => { const r = await run(() => post(`${staffBase}/${s._id}/login`), 'Login created'); if (r) { setCreds(r); reload(); } }}>Create login</Button>)}
              {s.status === 'active' ? <ConfirmButton size="sm" variant="danger" message={`Deactivate ${s.name}?`} onConfirm={async () => { await run(() => post(`${staffBase}/${s._id}/deactivate`), 'Deactivated'); reload(); }}>Deactivate</ConfirmButton>
                : <Button size="sm" onClick={async () => { await run(() => post(`${staffBase}/${s._id}/reactivate`), 'Reactivated'); reload(); }}>Reactivate</Button>}</div> }] : []),
          ]} />
        )}</Async>
      </Card>
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Staff portal login" />
      {edit && <StaffModal member={edit._id ? edit : null} designations={active} staffBase={staffBase} noun={noun} onClose={() => setEdit(null)} onSaved={reload} />}
      {manage && <DesignationsModal base={designationBase} group={group} onClose={() => { setManage(false); reload(); }} />}
    </>
  );
}

const blank = { name: '', designationId: '', phone: '', gender: '', dob: '', bloodGroup: '', joiningDate: '', address: '', licenseNo: '', licenseExpiry: '', idProof: '', emergencyName: '', emergencyPhone: '', notes: '', bankName: '', accountName: '', accountNo: '', ifsc: '', uan: '', esiNo: '', pan: '' };
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

function StaffModal({ member, designations, staffBase, noun, onClose, onSaved }) {
  const [f, setF] = useState({ ...blank, ...(member ? { ...member, designationId: member.designationId, emergencyName: member.emergencyContact?.name || '', emergencyPhone: member.emergencyContact?.phone || '', bankName: member.bank?.bankName || '', accountName: member.bank?.accountName || '', accountNo: member.bank?.accountNo || '', ifsc: member.bank?.ifsc || '', uan: member.statutory?.uan || '', esiNo: member.statutory?.esiNo || '', pan: member.statutory?.pan || '' } : {}) });
  const [run, busy] = useAction();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const d = designations.find((x) => x._id === f.designationId);
  const save = async () => {
    const { emergencyName, emergencyPhone, ...rest } = f;
    const body = { ...clean({ name: rest.name.trim(), designationId: rest.designationId, phone: rest.phone, gender: rest.gender, dob: rest.dob, bloodGroup: rest.bloodGroup, joiningDate: rest.joiningDate, address: rest.address, licenseNo: rest.licenseNo, licenseExpiry: rest.licenseExpiry, idProof: rest.idProof, notes: rest.notes }),
      ...((emergencyName || emergencyPhone) ? { emergencyContact: clean({ name: emergencyName, phone: emergencyPhone }) } : {}),
      ...(rest.accountNo || rest.ifsc || rest.bankName || rest.accountName ? { bank: clean({ bankName: rest.bankName, accountName: rest.accountName, accountNo: rest.accountNo, ifsc: rest.ifsc }) } : {}),
      ...(rest.uan || rest.esiNo || rest.pan ? { statutory: clean({ uan: rest.uan, esiNo: rest.esiNo, pan: rest.pan }) } : {}) };
    const ok = await run(() => (member ? patch(`${staffBase}/${member._id}`, body) : post(staffBase, body)), member ? 'Saved' : `${noun[0].toUpperCase()}${noun.slice(1)} added`);
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal wide title={member ? `Edit ${member.name}` : `Add ${noun}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={f.name.trim().length < 2 || !f.designationId} onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Full name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Designation" hint="Job titles are kept per school. Use “Designations” to add more."><Select value={f.designationId} onChange={(e) => set('designationId', e.target.value)} placeholder="Choose" options={designations.map((x) => ({ value: x._id, label: x.name }))} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Gender"><Select value={f.gender} onChange={(e) => set('gender', e.target.value)} placeholder="—" options={['male', 'female', 'other']} /></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
        <Field label="Blood group"><Input value={f.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="B+" /></Field>
        <Field label="Joining date"><Input type="date" value={f.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} /></Field>
        <Field label="ID proof (Aadhaar / voter id)"><Input value={f.idProof} onChange={(e) => set('idProof', e.target.value)} /></Field>
        {d?.busRole === 'driver' && <><Field label="Driving licence number"><Input value={f.licenseNo} onChange={(e) => set('licenseNo', e.target.value)} /></Field><Field label="Licence valid until"><Input type="date" value={f.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} /></Field></>}
        <Field label="Address" full><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Emergency contact name"><Input value={f.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} /></Field>
        <Field label="Emergency contact phone"><Input value={f.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} /></Field>
        <Field label="Bank name"><Input value={f.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
        <Field label="Name on the account"><Input value={f.accountName} onChange={(e) => set('accountName', e.target.value)} /></Field>
        <Field label="Account number" hint="Salary is paid here"><Input value={f.accountNo} onChange={(e) => set('accountNo', e.target.value)} /></Field>
        <Field label="IFSC code"><Input value={f.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" /></Field>
        <Field label="UAN (for PF)"><Input value={f.uan} onChange={(e) => set('uan', e.target.value)} placeholder="12 digits" /></Field>
        <Field label="ESI number"><Input value={f.esiNo} onChange={(e) => set('esiNo', e.target.value)} /></Field>
        <Field label="PAN"><Input value={f.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></Field>
        <Field label="Notes" full><Input value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function DesignationsModal({ base, group, onClose }) {
  const list = useApi(base);
  const [name, setName] = useState(''); const [busRole, setBusRole] = useState('');
  const [run, busy] = useAction();
  const add = async () => {
    const ok = await run(() => post(base, { name: name.trim(), group, ...(group === 'transport' && busRole ? { busRole } : {}) }), 'Designation added');
    if (ok) { setName(''); setBusRole(''); list.reload(); }
  };
  return (
    <Modal wide title="Designations (job titles)" onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>{group === 'transport' ? 'Your own transport titles, such as Driver, Conductor, Maintainer, Bus Attendant. A title that can drive or conduct can be put on a bus.' : 'Your own titles for non-teaching staff, such as Maid, Sweeper, Gardener, Security Guard, Electrician. Transport titles (driver, conductor, maintainer) are kept by the Transport officer.'} Every school keeps its own list.</p>
        <div className="row wrap" style={{ alignItems: 'end' }}>
          <Field label="New designation"><Input aria-label="New designation" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bus Attendant" /></Field>
          {group === 'transport' && <Field label="On a bus"><Select aria-label="On a bus" value={busRole} onChange={(e) => setBusRole(e.target.value)} options={BUS_ROLES} /></Field>}
          <Button variant="primary" loading={busy} disabled={name.trim().length < 2} onClick={add}>Add designation</Button>
        </div>
        <Async state={list}>{(rows) => <DataTable rows={rows} columns={[
          { label: 'Designation', render: (d) => <><b>{d.name}</b> {d.status === 'archived' && <Badge>archived</Badge>}</> }, { label: 'Group', render: (d) => <Badge tone={d.group === 'transport' ? 'blue' : ''}>{label(d.group)}</Badge> },
          { label: 'On a bus', render: (d) => (d.busRole ? label(d.busRole) : '—') }, { label: 'Staff', key: 'staff' },
          { label: '', render: (d) => <div className="row">
            <Button size="sm" onClick={async () => { await run(() => patch(`${base}/${d._id}`, { status: d.status === 'active' ? 'archived' : 'active' }), d.status === 'active' ? 'Archived' : 'Restored'); list.reload(); }}>{d.status === 'active' ? 'Archive' : 'Restore'}</Button>
            <ConfirmButton size="sm" variant="danger" message={`Delete ${d.name}?`} onConfirm={async () => { await run(() => del(`${base}/${d._id}`), 'Deleted'); list.reload(); }}>Delete</ConfirmButton></div> },
        ]} />}</Async>
      </div>
    </Modal>
  );
}
