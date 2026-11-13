import { useApi } from '../../hooks/useApi.js';
import { download } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, PageHeader, Stat, useAction, fmtDate, fmtMoney, label } from '../../components/ui.jsx';

const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A teacher's own pay: level, salary structure, and payslips. Read-only; set by the School Admin. */
export default function Salary({ base = '/api/teacher' }) {
  const sal = useApi(`${base}/salary`);
  const slips = useApi(`${base}/payslips`);
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Salary & payslips" subtitle="Your pay is set by the school office. Contact the administrator if something looks wrong." />
      <Async state={sal}>{(s) => (
        <>
          <div className="grid g4">
            <Stat value={s.current?.levelName || (s.current ? 'Custom' : '—')} label="Pay level" sub={s.teacher.designation || undefined} tone="blue" />
            <Stat value={fmtMoney(s.current?.gross)} label="Gross per month" />
            <Stat value={fmtMoney(s.current?.net)} label="Take-home per month" sub="Before any unpaid leave" tone="green" />
            <Stat value={fmtMoney(s.paidThisYear)} label="Received this academic year" sub={`${s.monthsPaidThisYear} month(s) paid`} />
          </div>
          {!s.current && <div className="alert">Your salary has not been set up yet. Please contact the school administrator.</div>}
          {s.current && (
            <div className="grid g2">
              <Card title="Earnings (per month)" flush><DataTable rows={s.current.earnings} rowKey="label" columns={[{ label: 'Component', key: 'label' }, { label: 'Amount', render: (e) => fmtMoney(e.amount) }]} /></Card>
              <Card title="Deductions (per month)" flush><DataTable rows={s.current.deductions} rowKey="label" empty="No fixed deductions" columns={[{ label: 'Component', key: 'label' }, { label: 'Amount', render: (e) => fmtMoney(e.amount) }]} /></Card>
            </div>
          )}
          {s.current && <p className="muted">Unpaid leave is deducted in proportion to the working days of the month. Salary in effect since {fmtDate(s.current.effectiveFrom, true)}.</p>}
          {s.history.length > 1 && <Card title="Salary history" flush><DataTable rows={s.history} rowKey="effectiveFrom" columns={[{ label: 'From', render: (h) => fmtDate(h.effectiveFrom, true) }, { label: 'Level', render: (h) => h.levelName || 'Custom' }, { label: 'Gross', render: (h) => fmtMoney(h.gross) }, { label: 'Net', render: (h) => fmtMoney(h.net) }]} /></Card>}
        </>
      )}</Async>
      <Card title="Payslips" flush>
        <Async state={slips}>{(rows) => (
          <DataTable rows={rows} empty="No payslips yet. They appear here once the school approves the month's payroll." columns={[
            { label: 'Month', render: (p) => <b>{monthLabel(p.month)}</b> }, { label: 'Days paid', render: (p) => `${p.paidDays} / ${p.workingDays}` }, { label: 'Gross', render: (p) => fmtMoney(p.gross) },
            { label: 'Deductions', render: (p) => fmtMoney(p.totalDeductions) }, { label: 'Net pay', render: (p) => <b>{fmtMoney(p.net)}</b> },
            { label: 'Status', render: (p) => <><Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{label(p.status)}</Badge>{p.paidOn && <div className="muted">{fmtDate(p.paidOn, true)}</div>}</> },
            { label: '', render: (p) => <Button size="sm" onClick={() => run(() => download(`${base}/payslips/${p._id}/pdf`, `payslip-${p.payslipNo}.pdf`))}>Download PDF</Button> },
          ]} />
        )}</Async>
      </Card>
    </div>
  );
}
