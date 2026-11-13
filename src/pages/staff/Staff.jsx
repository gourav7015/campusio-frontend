import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { patch, post } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, PageHeader, Stat, useAction, fmtDate, fmtMoney, label, statusTone } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import Heatmap from '../../components/Heatmap.jsx';
import PunchCard from '../../components/PunchCard.jsx';
import { BarsChart } from '../../components/Charts.jsx';
import Salary from '../teacher/Salary.jsx';

const S = '/api/staff';

export function StaffDashboard() {
  const d = useApi(`${S}/dashboard`);
  return (
    <div className="stack">
      <Async state={d}>{(x) => (<>
        <PageHeader title={`Hello, ${x.name}`} subtitle={`${x.designation || 'Staff'} · ${fmtDate(x.today, true)}`} />
        <PunchCard base={S} />
        <div className="grid g4">
          <Stat value={x.attendance.percentage != null ? `${x.attendance.percentage}%` : '—'} label="Attendance this year" tone="green" sub={`${x.attendance.absent} absent · ${x.attendance.half_day} half day`} />
          <Stat value={x.balances.casual.remaining} label="Casual leave left" sub={`of ${x.balances.casual.allowance}`} tone="blue" />
          <Stat value={x.balances.sick.remaining} label="Sick leave left" sub={`of ${x.balances.sick.allowance}`} tone="blue" />
          <Stat value={x.pendingLeave} label="Leave waiting for approval" tone={x.pendingLeave ? 'amber' : ''} />
        </div>
        {x.lastPayslip && <Card title="Latest payslip"><div className="row between"><span>{new Date(`${x.lastPayslip.month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })} — <b>{fmtMoney(x.lastPayslip.net)}</b> <Badge tone={x.lastPayslip.status === 'paid' ? 'green' : 'amber'}>{label(x.lastPayslip.status)}</Badge></span></div></Card>}
      </>)}</Async>
    </div>
  );
}

export function StaffAttendance() {
  const q = useApi(`${S}/my-attendance`);
  return (
    <div className="stack">
      <PageHeader title="My attendance" subtitle="Marked by the school office from your check-in times. If something looks wrong, tell them." />
      <PunchCard base={S} />
      <Async state={q}>{(d) => {
        const s = d.summary;
        const marked = d.days.filter((x) => x.working && x.rawStatus && x.rawStatus !== 'present');
        const byMonth = [...d.days.filter((x) => x.working && x.status).reduce((m, x) => { const k = x.date.slice(0, 7); if (!m.has(k)) m.set(k, { month: k, n: 0, ok: 0 }); const e = m.get(k); e.n++; if (['present', 'late'].includes(x.status) || x.rawStatus === 'half_day') e.ok += x.rawStatus === 'half_day' ? 0.5 : 1; return m; }, new Map()).values()].map((m) => ({ month: m.month, 'Present %': Math.round((m.ok / m.n) * 1000) / 10 }));
        return (<>
          <div className="grid g4"><Stat value={s.percentage != null ? `${s.percentage}%` : '—'} label="Attendance this year" tone="green" /><Stat value={s.present + s.late} label="Days present" sub={s.late ? `${s.late} late` : undefined} /><Stat value={s.absent} label="Days absent" tone={s.absent ? 'red' : 'green'} sub="deducted from salary" /><Stat value={s.half_day + s.leave} label="Half days / leave" sub={`${s.half_day} half day · ${s.leave} leave`} /></div>
          <Card title="Attendance heat map — this academic year"><Heatmap days={d.days} /></Card>
          {byMonth.length > 0 && <Card title="Month by month"><BarsChart data={byMonth} x="month" bars={[{ key: 'Present %' }]} domain={[0, 100]} unit="%" /></Card>}
          <Card title="Days that were not a normal present day" flush><DataTable rows={marked} rowKey="date" empty="Nothing to show" columns={[{ label: 'Date', render: (x) => fmtDate(x.date, true) }, { label: 'Status', render: (x) => <Badge tone={x.rawStatus === 'absent' ? 'red' : x.rawStatus === 'leave' ? 'blue' : 'amber'}>{x.rawStatus === 'half_day' ? 'Half day' : label(x.rawStatus)}</Badge> }, { label: 'Remark', key: 'remark' }]} /></Card>
        </>);
      }}</Async>
    </div>
  );
}

export function StaffLeave() {
  const q = useApi(`${S}/leave`);
  const [modal, setModal] = useState(false); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Leave" subtitle="Apply for leave. The school office approves it, and approved leave fills in your attendance." actions={<Button variant="primary" onClick={() => setModal(true)}>Apply for leave</Button>} />
      <Async state={q}>{(d) => (<>
        <div className="grid g4">{Object.entries(d.balances).filter(([k, b]) => k !== 'other' || b.allowance).map(([k, b]) => <Stat key={k} value={b.allowance == null ? b.used : b.remaining} label={`${label(k)} leave ${b.allowance == null ? 'taken' : 'left'}`} sub={b.allowance == null ? 'no pay for these days' : `${b.used} used of ${b.allowance}`} tone={k === 'unpaid' ? 'amber' : 'blue'} />)}</div>
        <Card title="My applications" flush><DataTable rows={d.applications} empty="No applications yet" columns={[
          { label: 'Type', render: (l) => label(l.leaveType) }, { label: 'From', render: (l) => fmtDate(l.startDate, true) }, { label: 'To', render: (l) => fmtDate(l.endDate, true) }, { label: 'Days', key: 'days' }, { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (l) => <Badge tone={statusTone(l.status)}>{label(l.status)}</Badge> }, { label: 'Remarks', key: 'decisionRemark' },
          { label: '', render: (l) => ['submitted', 'approved'].includes(l.status) && <Button size="sm" onClick={async () => { if (window.confirm('Cancel this leave?')) { await run(() => post(`${S}/leave/${l._id}/cancel`), 'Cancelled'); q.reload(); } }}>Cancel</Button> },
        ]} /></Card>
        {modal && <FormModal title="Apply for leave" fields={[{ name: 'leaveType', label: 'Leave type', type: 'select', options: ['casual', 'sick', 'earned', 'other', 'unpaid'], required: true, default: 'casual', hint: 'Unpaid leave is deducted from your salary for those days.' }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
          onClose={() => setModal(false)} onSubmit={async (v) => { await post(`${S}/leave`, v); q.reload(); return true; }} />}
      </>)}</Async>
    </div>
  );
}

export function StaffPayslips() { return <Salary base={S} />; }

export function StaffProfile() {
  const p = useApi(`${S}/profile`);
  const [edit, setEdit] = useState(false);
  return (
    <Async state={p}>{(x) => (
      <div className="stack">
        <PageHeader title="My profile" actions={<Button onClick={() => setEdit(true)}>Edit contact details</Button>} />
        <div className="grid g2">
          <Card title="Details"><dl className="kv"><dt>Name</dt><dd>{x.name}</dd><dt>Staff id</dt><dd>{x.staffId}</dd><dt>Designation</dt><dd>{x.designation}</dd><dt>Joined</dt><dd>{fmtDate(x.joiningDate, true)}</dd><dt>Phone</dt><dd>{x.phone || '—'}</dd><dt>Address</dt><dd>{x.address || '—'}</dd>{x.licenseNo && <><dt>Driving licence</dt><dd>{x.licenseNo}{x.licenseExpiry ? ` (to ${fmtDate(x.licenseExpiry, true)})` : ''}</dd></>}</dl></Card>
          <Card title="Salary account & ids"><dl className="kv"><dt>Bank</dt><dd>{x.bank ? `${x.bank.bankName || ''} ${x.bank.accountNo} · ${x.bank.ifsc}` : 'Not on record — ask the school office'}</dd><dt>UAN (PF)</dt><dd>{x.statutory.uan || '—'}</dd><dt>ESI number</dt><dd>{x.statutory.esiNo || '—'}</dd></dl></Card>
        </div>
        {edit && <FormModal title="Contact details" initial={x} fields={[{ name: 'phone', label: 'Phone' }, { name: 'address', label: 'Address', full: true }]} onClose={() => setEdit(false)} onSubmit={async (v) => { await patch(`${S}/profile`, v); p.reload(); return true; }} />}
      </div>)}</Async>
  );
}
