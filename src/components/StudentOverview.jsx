import { Async, Badge, Button, Card, DataTable, Empty, Stat, fmtDate, fmtMoney, label, statusTone, useAction } from './ui.jsx';
import FeeSchedule from './FeeSchedule.jsx';
import { useApi } from '../hooks/useApi.js';
import { download } from '../api/client.js';
import { useOffice } from '../context/ClassOffice.jsx';
import Heatmap from './Heatmap.jsx';
import { BarsChart } from './Charts.jsx';

const tone = (p) => (p == null ? '' : p >= 75 ? 'green' : p >= 50 ? 'blue' : p >= 33 ? 'amber' : 'red');

/** The top strip of a student's page: everything the school knows, at a glance. */
export function SummaryStrip({ o }) {
  const last = o.exams[o.exams.length - 1];
  const holding = o.library.filter((l) => l.status === 'issued');
  return (
    <div className="grid g4">
      <Stat value={o.attendance.percentage != null ? `${o.attendance.percentage}%` : '—'} label="Attendance this year" sub={`${o.attendance.absent} absent · ${o.attendance.late} late`} tone={o.attendance.percentage != null && o.attendance.percentage < 75 ? 'red' : 'green'} />
      <Stat value={last ? `${last.percentage}%` : '—'} label={last ? `Latest: ${last.exam}` : 'Exams'} sub={last ? `Grade ${last.grade}` : 'No results yet'} tone={tone(last?.percentage)} />
      <Stat value={fmtMoney(o.fees.totals.pending)} label="Fees pending" sub={o.fees.totals.overdue > 0 ? `${fmtMoney(o.fees.totals.overdue)} overdue` : 'Nothing overdue'} tone={o.fees.totals.overdue > 0 ? 'red' : o.fees.totals.pending > 0 ? 'amber' : 'green'} />
      <Stat value={o.bus ? o.bus.busNo : 'No bus'} label={`Library: ${holding.length} book(s) out`} sub={o.bus ? `${o.bus.stop || ''}` : 'Does not use school transport'} tone={o.bus ? 'blue' : ''} />
    </div>
  );
}

export function AttendancePanel({ o }) {
  const a = o.attendance;
  return (
    <div className="stack">
      <div className="grid g4"><Stat value={`${a.percentage ?? '—'}%`} label="Attendance" tone="green" /><Stat value={a.present} label="Present" /><Stat value={a.absent} label="Absent" tone={a.absent > 5 ? 'amber' : ''} /><Stat value={a.late} label="Late" /></div>
      <Card title="Attendance heat map — this academic year"><Heatmap days={a.days} /></Card>
      <Card title="Month by month"><BarsChart data={a.byMonth.map((m) => ({ month: m.month, 'Attendance %': m.percentage }))} x="month" bars={[{ key: 'Attendance %' }]} domain={[0, 100]} unit="%" /></Card>
    </div>
  );
}

export function ExamsPanel({ o }) {
  if (!o.exams.length) return <Empty title="No published results yet" />;
  return (
    <div className="stack">
      <Card title="Performance across exams"><BarsChart data={o.exams.map((e) => ({ exam: e.exam, Percentage: e.percentage }))} x="exam" bars={[{ key: 'Percentage' }]} domain={[0, 100]} unit="%" /></Card>
      {o.exams.map((e) => (
        <Card key={e.id} title={`${e.exam} — ${e.percentage}% · Grade ${e.grade} · ${label(e.result)}`} flush>
          <DataTable rows={e.subjects} rowKey="subject" columns={[
            { label: 'Subject', render: (s) => <b>{s.subject}</b> }, { label: 'Marks', render: (s) => s.absent ? <Badge tone="amber">Absent</Badge> : `${s.obtained} / ${s.max}` },
            { label: 'Fields', render: (s) => (s.components || []).map((c) => `${c.label} ${c.value ?? '—'}/${c.max}`).join(' · ') }, { label: '%', render: (s) => s.percentage != null ? <Badge tone={tone(s.percentage)}>{s.percentage}%</Badge> : '—' }, { label: 'Grade', key: 'grade' },
          ]} />
        </Card>
      ))}
    </div>
  );
}

export function HomeworkPanel({ o }) {
  return <Card title="Recent homework for this student's class" flush><DataTable rows={o.homework} empty="No homework yet" columns={[
    { label: 'Subject', render: (h) => <b>{h.subject}</b> }, { label: 'Homework', key: 'title' }, { label: 'Teacher', key: 'teacher' }, { label: 'Given', render: (h) => fmtDate(h.assignedDate) }, { label: 'Due', render: (h) => fmtDate(h.dueDate) },
  ]} /></Card>;
}

/** A student's fees as the School Admin sees them: every instalment and charge with its Receipt, and every payment. Read-only; Finance does the collecting. */
export function FeesPanel({ studentId }) {
  const { finance: base } = useOffice();
  const a = useApi(`${base}/students/${studentId}/account`);
  const [run] = useAction();
  const receipt = (p) => run(() => download(`${base}/payments/${p.id || p._id}/receipt.pdf`, `receipt-${p.receiptNo}.pdf`));
  return (
    <Async skeleton="profile" state={a}>{(x) => (
      <div className="stack">
        <div className="grid g4"><Stat value={fmtMoney(x.totals.assigned)} label="Billed" /><Stat value={fmtMoney(x.totals.paid)} label="Paid" tone="green" /><Stat value={fmtMoney(x.totals.pending)} label="Pending" tone="amber" /><Stat value={fmtMoney(x.totals.overdue)} label="Overdue" tone={x.totals.overdue ? 'red' : 'green'} /></div>
        <FeeSchedule installments={x.installments} charges={x.charges.map((c) => ({ id: c._id, label: c.label, kind: c.kind, dueDate: c.dueDate, period: c.period, amount: c.amount, concession: c.concession, paid: c.paidAmount, outstanding: c.outstanding, status: c.status, overdue: c.overdue, notes: c.concessions?.map((k) => `Concession ${fmtMoney(k.amount)} — ${k.reason}`) }))}
          payments={x.payments.map((p) => ({ id: p._id, receiptNo: p.receiptNo, kind: p.kind, status: p.status, paidOn: p.paidOn, chargeIds: p.allocations.map((al) => String(al.chargeId)) }))} onReceipt={receipt} />
        <Card title="Payments and receipts" flush><DataTable rows={x.payments} empty="No payments yet" columns={[
          { label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) },
          { label: 'Type', render: (p) => (p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : p.status === 'reversed' ? <Badge tone="red">Reversed</Badge> : <Badge tone="green">Payment</Badge>) },
          { label: 'Amount', render: (p) => fmtMoney(p.amount) }, { label: 'Mode', render: (p) => label(p.mode) }, { label: 'For', render: (p) => p.allocations.map((al) => al.label).join(', ') },
          { label: '', render: (p) => <Button size="sm" onClick={() => receipt(p)}>Receipt</Button> }]} /></Card>
        <p className="muted small">Fees are handled by the Finance desk. This is a read-only view.</p>
      </div>
    )}</Async>
  );
}

export function LibraryPanel({ o }) {
  return <Card title="Library — books borrowed" flush><DataTable rows={o.library} empty="This student has not borrowed any book" columns={[
    { label: 'Book', render: (l) => <><b>{l.title}</b><div className="small muted">{l.author}</div></> }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn, true) }, { label: 'Due', render: (l) => fmtDate(l.dueDate, true) },
    { label: 'Returned', render: (l) => l.returnedOn ? fmtDate(l.returnedOn, true) : '—' }, { label: 'Status', render: (l) => <Badge tone={l.overdue ? 'red' : statusTone(l.status)}>{l.overdue ? 'Overdue' : label(l.status)}</Badge> }, { label: 'Fine', render: (l) => l.fine ? fmtMoney(l.fine) : '—' },
  ]} /></Card>;
}

export function BusCard({ bus }) {
  if (!bus) return <Empty title="Does not use the school bus" />;
  return (
    <div className="grid g2">
      <Card title={`Bus ${bus.busNo}`}><dl className="kv"><dt>Route</dt><dd>{bus.routeName || '—'}</dd><dt>Registration</dt><dd>{bus.registrationNo || '—'}</dd><dt>Boarding stop</dt><dd><b>{bus.stop || '—'}</b></dd>
        <dt>Pick-up time</dt><dd>{bus.pickupTime || '—'}</dd><dt>Drop time</dt><dd>{bus.dropTime || '—'}</dd><dt>Since</dt><dd>{fmtDate(bus.since, true)}</dd></dl></Card>
      <Card title="Driver and conductor"><dl className="kv"><dt>Driver</dt><dd><b>{bus.driver?.name || '—'}</b></dd><dt>Driver phone</dt><dd>{bus.driver?.phone || '—'}</dd><dt>Conductor</dt><dd><b>{bus.conductor?.name || '—'}</b></dd><dt>Conductor phone</dt><dd>{bus.conductor?.phone || '—'}</dd></dl></Card>
      {bus.stops?.length > 0 && <Card title="Route stops" flush><DataTable rows={bus.stops} rowKey="name" columns={[{ label: 'Stop', render: (s) => <b>{s.name}</b> }, { label: 'Pick-up', key: 'pickupTime' }, { label: 'Drop', key: 'dropTime' }]} /></Card>}
    </div>
  );
}
