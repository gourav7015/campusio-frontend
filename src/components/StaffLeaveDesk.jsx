import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post } from '../api/client.js';
import { Async, Badge, Button, Card, DataTable, Select, useAction, fmtDate, label, statusTone } from './ui.jsx';
import FormModal from './FormModal.jsx';
import { useDialogs } from '../design/ui';

/** The leave desk for one group of staff: decide applications, and record a leave for someone who cannot apply themselves. */
export default function StaffLeaveDesk({ base, staffBase, canEdit = true }) {
  const [status, setStatus] = useState('submitted');
  const list = useApi(base, { status: status === 'all' ? undefined : status });
  const staff = useApi(canEdit ? staffBase : null, { limit: 200 });
  const [modal, setModal] = useState(false); const [run] = useAction();
  const dlg = useDialogs();
  const decide = async (l, decision) => {
    const remark = decision === 'reject' ? await dlg.prompt('Reason for rejecting (the person will see it)', { title: 'Reject leave', required: true }) : '';
    if (decision === 'reject' && !remark) return;
    await run(() => post(`${base}/${l._id}/decide`, { decision, ...(remark ? { remark } : {}) }), decision === 'approve' ? 'Approved' : 'Rejected'); list.reload();
  };
  return (
    <div className="stack">
      <Card title="Staff leave" action={<div className="row"><Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'submitted', label: 'Waiting for a decision' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} />
        {canEdit && <Button size="sm" variant="primary" onClick={() => setModal(true)}>Record leave</Button>}</div>} flush>
        <Async state={list} empty={<div className="empty">No applications</div>}>{(rows) => <DataTable rows={rows} empty="No applications" columns={[
          { label: 'Staff member', render: (l) => <><b>{l.staffId?.name}</b><div className="small muted">{l.staffId?.staffId}</div></> }, { label: 'Type', render: (l) => label(l.leaveType) },
          { label: 'From', render: (l) => fmtDate(l.startDate, true) }, { label: 'To', render: (l) => fmtDate(l.endDate, true) }, { label: 'Days', key: 'days' }, { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (l) => <><Badge tone={statusTone(l.status)}>{label(l.status)}</Badge>{l.recordedBy && <div className="small muted">recorded by the desk</div>}</> },
          ...(canEdit ? [{ label: '', render: (l) => l.status === 'submitted' && <div className="row"><Button size="sm" variant="primary" onClick={() => decide(l, 'approve')}>Approve</Button><Button size="sm" variant="danger" onClick={() => decide(l, 'reject')}>Reject</Button></div> }] : []),
        ]} />}</Async>
      </Card>
      <p className="muted small">Approved leave fills the attendance register for those days. Unpaid leave is deducted from salary.</p>
      {modal && <FormModal title="Record a leave" submitLabel="Record" fields={[{ name: 'staffId', label: 'Staff member', type: 'select', required: true, options: (staff.data?.items || []).map((s) => ({ value: s._id, label: `${s.name} (${s.staffId})` })) },
        { name: 'leaveType', label: 'Leave type', type: 'select', options: ['casual', 'sick', 'earned', 'other', 'unpaid'], required: true, default: 'casual' }, { name: 'startDate', label: 'From', type: 'date', required: true }, { name: 'endDate', label: 'To', type: 'date', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { await post(base, v); list.reload(); return true; }} />}
    </div>
  );
}
