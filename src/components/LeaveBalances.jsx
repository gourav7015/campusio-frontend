import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { post, del } from '../api/client.js';
import { Async, Button, Card, DataTable, Input, Modal, Tabs, useAction, fmtDate, label } from './ui.jsx';
import FormModal from './FormModal.jsx';
import { useDialogs } from '../design/ui';

const TYPES = ['casual', 'sick', 'earned', 'other'];

/** What each person may take this year, has taken and has left. The yearly allowance is one school-wide setting; the admin adds extra leave to one person here. */
export default function LeaveBalances({ may = () => true, isOwner = false }) {
  const groups = [...(may('teachers') ? [['teachers', 'Teaching staff']] : []), ...(may('staff_attendance') ? [['general', 'Non-teaching staff'], ['transport', 'Transport crew']] : [])];
  const [group, setGroup] = useState(groups[0]?.[0]);
  const [find, setFind] = useState('');
  const list = useApi(group ? '/api/school/leave-balances' : null, { group });
  const [giving, setGiving] = useState(null); const [history, setHistory] = useState(null);
  if (!groups.length) return <div className="empty">You do not have access to leave balances.</div>;
  const q = find.trim().toLowerCase();
  return (
    <div className="stack">
      <div className="alert" role="note">
        Everyone gets the same yearly allowance{isOwner ? <> (set in <Link to="/admin/settings">School settings</Link>)</> : ' (set in School settings by the School Admin)'}. To give <b>one person</b> more, for example a day off for working on a holiday, use “Give extra leave”. It is added to their balance for this school year and they are told.
      </div>
      <Tabs tabs={groups} value={group} onChange={(g) => { setGroup(g); setFind(''); }} />
      <Card title="Leave balances (this year)" action={<Input aria-label="Find a person" placeholder="Find by name or id" value={find} onChange={(e) => setFind(e.target.value)} style={{ width: 220 }} />} flush>
        <Async skeleton="datatable" state={list} empty={<div className="empty">No one here yet</div>}>{(d) => <DataTable rowKey="id" empty="No one matches" rows={d.rows.filter((r) => !q || `${r.name} ${r.code}`.toLowerCase().includes(q))} columns={[
          { label: 'Name', sort: (a, b) => a.name.localeCompare(b.name), render: (r) => <><b>{r.name}</b><div className="small muted">{r.code} · {r.title}</div></> },
          ...TYPES.map((t) => ({
            label: label(t), render: (r) => { const b = r.balances[t]; return b && b.allowance > 0 ? <>{b.remaining} <span className="muted small">of {b.allowance}</span>{b.granted > 0 && <div className="small" style={{ color: 'var(--blue, #2563eb)' }}>+{b.granted} extra</div>}</> : <span className="muted">—</span>; },
          })),
          { label: '', render: (r) => <div className="row"><Button size="sm" onClick={() => setGiving({ ...r, personType: d.personType })}>Give extra leave</Button><Button size="sm" onClick={() => setHistory({ ...r, personType: d.personType })}>History</Button></div> },
        ]} />}</Async>
      </Card>
      {giving && <FormModal title={`Give extra leave · ${giving.name}`} submitLabel="Add to balance" fields={[
        { name: 'leaveType', label: 'Leave type', type: 'select', options: TYPES.map((t) => ({ value: t, label: label(t) })), required: true, default: 'casual' },
        { name: 'days', label: 'Days', type: 'number', required: true, default: 1, hint: 'Whole or half days, up to 60.' },
        { name: 'reason', label: 'Reason (the person sees this)', type: 'textarea', required: true, full: true, placeholder: 'e.g. Worked on the Annual Day holiday' },
      ]} onClose={() => setGiving(null)} onSubmit={async (v) => { await post('/api/school/leave-balances/grants', { ...v, personType: giving.personType, personId: giving.id }); list.reload(); return true; }} />}
      {history && <History person={history} onClose={() => { setHistory(null); list.reload(); }} />}
    </div>
  );
}

function History({ person, onClose }) {
  const g = useApi('/api/school/leave-balances/grants', { personType: person.personType, personId: person.id });
  const [run] = useAction(); const dlg = useDialogs();
  return (
    <Modal wide title={`Extra leave · ${person.name}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Async skeleton="datatable" state={g} empty={<div className="empty small">No extra leave has been given this year.</div>}>{(rows) => <DataTable rowKey="_id" rows={rows} columns={[
        { label: 'Type', render: (x) => label(x.leaveType) }, { label: 'Days', key: 'days' }, { label: 'Reason', key: 'reason' }, { label: 'Given on', render: (x) => fmtDate(x.createdAt, true) },
        { label: '', render: (x) => <Button size="sm" onClick={async () => { if (await dlg.confirm(`Take back these ${x.days} day(s)?`)) { await run(() => del(`/api/school/leave-balances/grants/${x._id}`), 'Withdrawn'); g.reload(); } }}>Withdraw</Button> },
      ]} />}</Async>
    </Modal>
  );
}
