import { Badge, Button, Card, DataTable, fmtDate, fmtMoney } from './ui.jsx';

const STATE = { paid: ['green', 'Paid'], part: ['amber', 'Part paid'], overdue: ['red', 'Overdue'], open: ['amber', 'Open'] };
const keyOf = (c) => c.dueDate || `none-${c.period || c.label}`; // the same grouping the server uses for instalments

/**
 * A student's fees in one table: each instalment (what falls due on a date) with the charges that make it up underneath,
 * then any other charges (library fines, one-off charges). Used by Finance and the School Admin (on the student's account) and on the student's own fee page.
 * `charges` are plain rows: { id, label, kind, dueDate, period, amount, concession, paid, outstanding, status, overdue, notes? }.
 * `action(charge)` may return a button for a charge row (Finance gives a concession).
 * `payments` ({ id, kind, status, paidOn, chargeIds }) with `onReceipt(payment)` put a Receipt button on every charge a payment covered.
 */
export default function FeeSchedule({ installments = [], charges = [], action, payments = [], onReceipt }) {
  const receiptFor = (c) => payments.filter((p) => p.kind === 'payment' && p.status !== 'reversed' && p.chargeIds?.includes(String(c.id))).sort((a, b) => String(b.paidOn).localeCompare(String(a.paidOn)))[0];
  const rows = [];
  for (const i of installments) {
    rows.push({ key: `i-${i.key}`, head: { no: i.no, title: i.label, due: i.dueDate, billed: i.billed, concession: i.concession, paid: i.paid, balance: i.balance, state: i.state } });
    for (const c of charges.filter((x) => x.kind === 'fee' && keyOf(x) === i.key)) rows.push({ key: `c-${c.id}`, c });
  }
  const others = charges.filter((c) => c.kind !== 'fee');
  if (others.length) {
    rows.push({ key: 'other', head: { title: 'Other charges' } });
    for (const c of others) rows.push({ key: `c-${c.id}`, c });
  }
  if (!rows.length) return null;
  const paid = installments.filter((r) => r.state === 'paid').length;
  const chargeState = (c) => (c.status === 'paid' ? <Badge tone="green">Paid</Badge> : c.overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="amber">Open</Badge>);
  return (
    <Card title="Fees" action={installments.length ? <span className="small muted">{paid} of {installments.length} instalments paid</span> : undefined} flush>
      <DataTable rows={rows} rowKey="key" columns={[
        { label: 'Instalment / charge', render: (r) => (r.head
          ? <b>{r.head.no ? `${r.head.no}. ` : ''}{r.head.title}</b>
          : <div style={{ paddingLeft: 18 }}>{r.c.label} {r.c.kind === 'library_fine' && <Badge tone="amber">Library fine</Badge>}{r.c.notes?.map((n, k) => <div key={k} className="small muted">{n}</div>)}</div>) },
        { label: 'Due', render: (r) => (r.head ? (r.head.due ? fmtDate(r.head.due, true) : '') : fmtDate(r.c.dueDate, true)) },
        { label: 'Amount', render: (r) => { const x = r.head ? { b: r.head.billed, k: r.head.concession } : { b: r.c.amount, k: r.c.concession }; return x.b == null ? '' : <>{fmtMoney(x.b - (x.k || 0))}{x.k > 0 && <div className="small muted">after {fmtMoney(x.k)} concession</div>}</>; } },
        { label: 'Paid', render: (r) => (r.head ? (r.head.paid == null ? '' : fmtMoney(r.head.paid)) : fmtMoney(r.c.paid)) },
        { label: 'Balance', render: (r) => (r.head ? (r.head.balance == null ? '' : <b>{fmtMoney(r.head.balance)}</b>) : fmtMoney(r.c.outstanding)) },
        { label: 'Status', render: (r) => (r.head ? (r.head.state ? <Badge tone={STATE[r.head.state][0]}>{STATE[r.head.state][1]}</Badge> : null) : chargeState(r.c)) },
        ...(action || onReceipt ? [{ label: '', render: (r) => (r.c ? <div className="row">{onReceipt && receiptFor(r.c) && <Button size="sm" onClick={() => onReceipt(receiptFor(r.c))}>Receipt</Button>}{action?.(r.c)}</div> : null) }] : []),
      ]} />
    </Card>
  );
}
