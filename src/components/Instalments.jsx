import { Badge, Card, DataTable, fmtDate, fmtMoney } from './ui.jsx';

const STATE = { paid: ['green', 'Paid'], part: ['amber', 'Part paid'], overdue: ['red', 'Overdue'], open: ['amber', 'Open'] };

/**
 * A student's fees instalment by instalment: what falls due on each date, what has been paid and what is left.
 * Used by Finance and the School Admin (on the student's account) and on the student's own fee page.
 */
export default function Instalments({ rows }) {
  if (!rows?.length) return null;
  const paid = rows.filter((r) => r.state === 'paid').length;
  return (
    <Card title="Instalments" action={<span className="small muted">{paid} of {rows.length} paid</span>} flush>
      <DataTable rows={rows} rowKey="key" columns={[
        { label: 'No.', render: (r) => r.no },
        { label: 'Instalment', render: (r) => <><b>{r.label}</b><div className="small muted">{r.items.map((i) => `${i.label} ${fmtMoney(i.amount - i.concession)}`).join(' · ')}</div></> },
        { label: 'Due', render: (r) => fmtDate(r.dueDate, true) },
        { label: 'Amount', render: (r) => <>{fmtMoney(r.billed - r.concession)}{r.concession > 0 && <div className="small muted">after {fmtMoney(r.concession)} concession</div>}</> },
        { label: 'Paid', render: (r) => fmtMoney(r.paid) },
        { label: 'Balance', render: (r) => <b>{fmtMoney(r.balance)}</b> },
        { label: 'Status', render: (r) => <Badge tone={STATE[r.state][0]}>{STATE[r.state][1]}</Badge> },
      ]} />
    </Card>
  );
}
