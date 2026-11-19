import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { post, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, PageHeader, Tabs, useAction } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';

const KINDS = {
  teaching: { tab: 'Teachers\' ranks', base: '/api/school/teacher-designations', who: 'teacher', note: 'The ranks teachers hold: Principal, Vice Principal, Head of Department, PGT, TGT, PRT… A teacher can be given only a rank listed here.' },
  general: { tab: 'Non-teaching jobs', base: '/api/school/designations', who: 'staff member', note: 'The jobs of non-teaching staff and officers: PT Teacher, Lab Assistant, Clerk, Accountant, Librarian… A staff member can hold only a job listed here. Drivers, conductors and other transport jobs are kept by the Transport officer.' },
};

/** The ranks (designations) of the school. Employees can hold only the ones registered here. */
export default function Designations() {
  const [tab, setTab] = useState('teaching');
  const k = KINDS[tab];
  const list = useApi(k.base);
  const [edit, setEdit] = useState(null); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Designations" subtitle="The ranks and job titles of your school. Teachers and staff can hold only the ones registered here, so the list never fills with different spellings." actions={<Button variant="primary" onClick={() => setEdit({})}>+ Add a designation</Button>} />
      <Tabs tabs={Object.entries(KINDS).map(([key, v]) => [key, v.tab])} value={tab} onChange={setTab} />
      <p className="muted small" style={{ margin: 0 }}>{k.note}</p>
      <Card flush><Async state={list} empty={null}>{(rows) => <DataTable rows={rows} rowKey="_id" empty="Nothing registered yet" columns={[
        { label: 'Designation', render: (d) => <b>{d.name}</b> }, { label: 'Held by', render: (d) => `${d.staff} ${k.who}${d.staff === 1 ? '' : 's'}` },
        { label: 'Status', render: (d) => <Badge tone={d.status === 'active' ? 'green' : 'amber'}>{d.status === 'active' ? 'In use' : 'Archived'}</Badge> },
        { label: '', render: (d) => <div className="row" style={{ gap: 8 }}><Button size="sm" onClick={() => setEdit(d)}>Rename</Button>
          <Button size="sm" onClick={async () => { await run(() => patch(`${k.base}/${d._id}`, { status: d.status === 'active' ? 'archived' : 'active' }), d.status === 'active' ? 'Archived' : 'Back in use'); list.reload(); }}>{d.status === 'active' ? 'Archive' : 'Use again'}</Button>
          <ConfirmButton size="sm" variant="danger" message={`Delete ${d.name}? Only possible when no one holds it.`} onConfirm={async () => { const r = await run(() => del(`${k.base}/${d._id}`), 'Deleted'); if (r) list.reload(); }}>Delete</ConfirmButton></div> },
      ]} />}</Async></Card>
      {edit && <FormModal title={edit._id ? 'Rename designation' : 'Add a designation'} initial={edit} fields={[{ name: 'name', label: 'Name', required: true, full: true, placeholder: tab === 'teaching' ? 'e.g. Sports Coordinator' : 'e.g. PT Teacher' }]} onClose={() => setEdit(null)}
        onSubmit={async (v) => { if (edit._id) await patch(`${k.base}/${edit._id}`, { name: v.name }); else await post(k.base, { name: v.name }); list.reload(); return true; }} />}
    </div>
  );
}
