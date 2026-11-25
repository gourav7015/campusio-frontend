import { useState } from 'react';
import { leaveFields, leavePayload, daysText, leaveStatus, canWithdraw } from './leaveForm.js';
import { useApi } from '../hooks/useApi.js';
import { post, patch } from '../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Select, useAction, fmtDate, label, statusTone } from './ui.jsx';
import FormModal from './FormModal.jsx';
import { useDialogs } from '../design/ui';

/** The leave desk for one group of staff: decide applications, and record a leave for someone who cannot apply themselves. */
export default function StaffLeaveDesk({ base, staffBase, canEdit = true, canRecord = canEdit, transport = false }) {
  const [status, setStatus] = useState('all');
  const list = useApi(base, { status: status === 'all' ? undefined : status });
  const staff = useApi(canRecord ? staffBase : null, { limit: 200 });
  const policy = useApi(transport && canRecord ? `${base}/policy` : null);
  const adminDecides = policy.data?.approver === 'admin'; // the school has kept leave approval for its admin
  const [modal, setModal] = useState(false); const [edit, setEdit] = useState(null); const [run] = useAction();
  const dlg = useDialogs();
  const decide = async (l, decision) => {
    const remark = decision === 'reject' ? await dlg.prompt('Reason for rejecting (the person will see it)', { title: 'Reject leave', required: true }) : '';
    if (decision === 'reject' && !remark) return;
    await run(() => post(`${base}/${l._id}/decide`, { decision, ...(remark ? { remark } : {}) }), decision === 'approve' ? 'Approved' : 'Rejected'); list.reload();
  };
  const passOn = async (l) => { await run(() => post(`${base}/${l._id}/pass-to-admin`), 'Sent to the school admin'); list.reload(); };
  return (
    <div className="stack">
      {adminDecides && <div className="alert" role="note">The school has kept leave approval for the School Admin. Whatever you record here is sent to the admin to decide.</div>}
      <Card title="Staff leave" action={<div className="row"><Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'submitted', label: 'Waiting for a decision' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        {canRecord && <Button size="sm" variant="primary" onClick={() => setModal(true)}>Record leave</Button>}</div>} flush>
        <Async state={list} empty={<div className="empty">No applications</div>}>{(rows) => <DataTable rows={rows} empty="No applications" columns={[
          { label: 'Staff member', render: (l) => <><b>{l.staffId?.name}</b><div className="small muted">{l.staffId?.staffId}</div></> }, { label: 'Type', render: (l) => label(l.leaveType) },
          { label: 'From', render: (l) => fmtDate(l.startDate, true) }, { label: 'To', render: (l) => fmtDate(l.endDate, true) }, { label: 'Days', render: daysText }, { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (l) => <><Badge tone={statusTone(l.status)}>{leaveStatus(l.status)}</Badge>{l.awaitingAdmin && l.status === 'submitted' && <div><Badge tone="amber">With the school admin</Badge></div>}{l.recordedBy && <div className="small muted">recorded by the desk</div>}</> },
          ...(canEdit ? [{ label: '', render: (l) => l.status === 'submitted' && (l.canDecide || l.canPassOn
            ? <div className="row">{l.canDecide && <><Button size="sm" variant="primary" onClick={() => decide(l, 'approve')}>Approve</Button><Button size="sm" variant="danger" onClick={() => decide(l, 'reject')}>Reject</Button></>}
              {l.canPassOn && <Button size="sm" onClick={() => passOn(l)}>Send to admin</Button>}</div>
            : <span className="small muted">Waiting for the school admin</span>) }, { label: 'Edit', render: (l) => l.status !== 'cancelled' && (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" onClick={() => setEdit(l)}>Edit</Button>
                {canWithdraw(l) && <ConfirmButton size="sm" message={l.status === 'approved' ? `Cancel the approved leave of ${l.staffId?.name}? The attendance for those days is no longer marked as leave.` : `Withdraw the leave application of ${l.staffId?.name}?`} onConfirm={async () => { await run(() => post(`${base}/${l._id}/withdraw`), l.status === 'approved' ? 'Leave cancelled' : 'Application withdrawn'); list.reload(); }}>{l.status === 'approved' ? 'Cancel leave' : 'Withdraw'}</ConfirmButton>}
              </div>) }] : []),
        ]} />}</Async>
      </Card>
      <p className="muted small">Approved leave fills the attendance register for those days. Unpaid leave is deducted from salary.</p>
      {edit && <FormModal title={`Edit leave · ${edit.staffId?.name || ''}`} initial={edit} submitLabel="Save changes" fields={leaveFields({ startLabel: 'From', endLabel: 'To' })} onClose={() => setEdit(null)} onSubmit={async (v) => { await patch(`${base}/${edit._id}`, leavePayload(v)); list.reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>The number of days is worked out again from the working days in the new dates.</p></FormModal>}
      {modal && <FormModal title="Record a leave" submitLabel="Record" fields={leaveFields({ startLabel: 'From', endLabel: 'To', before: [{ name: 'staffId', label: 'Staff member', type: 'select', required: true, options: (staff.data?.items || []).map((s) => ({ value: s._id, label: `${s.name} (${s.staffId})` })) }], after: transport && !adminDecides ? [{ name: 'sendToAdmin', label: 'Send to the school admin to approve', type: 'checkbox', hint: 'Leave this off to approve it yourself. The school admin is told either way.' }] : [] })}
        onClose={() => setModal(false)} onSubmit={async (v) => { await post(base, leavePayload(v)); list.reload(); return true; }} />}
    </div>
  );
}
