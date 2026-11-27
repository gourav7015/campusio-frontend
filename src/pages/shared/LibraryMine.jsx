import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Empty, Input, PageHeader, Stat, Tabs, useDebounced, fmtDate, fmtMoney, label } from '../../components/ui.jsx';

/** Students and teachers: their own books and due dates, plus the catalogue (availability only). */
export default function LibraryMine({ base }) {
  const [tab, setTab] = useState('loans');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const loans = useApi(`${base}/library/loans`);
  const books = useApi(tab === 'catalogue' ? `${base}/library/books` : null, { q: dq });
  return (
    <div className="stack">
      <PageHeader title="Library" subtitle="Your books and due dates, and what the library has" />
      <Tabs tabs={[['loans', 'My books'], ['catalogue', 'Search the catalogue']]} value={tab} onChange={setTab} />
      {tab === 'loans' && <Async skeleton="stats" state={loans}>{(d) => (<>
        <div className="grid g4"><Stat value={`${d.current.length} / ${d.limit}`} label="Books borrowed" tone="blue" /><Stat value={d.current.filter((l) => l.overdue).length} label="Overdue" tone={d.current.some((l) => l.overdue) ? 'red' : undefined} /><Stat value={d.history.length} label="Returned so far" /></div>
        <Card title="On loan now" flush><DataTable rows={d.current} rowKey="_id" empty="You have no books out" columns={[{ label: 'Book', render: (l) => <><b>{l.book}</b><div className="small muted">{l.author}</div></> }, { label: 'Accession', key: 'accessionNo' }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn) }, { label: 'Due', render: (l) => <>{fmtDate(l.dueDate, true)} {l.overdue && <Badge tone="red">{l.daysLate} day(s) late</Badge>}</> }, { label: 'Fine so far', render: (l) => (l.fine ? fmtMoney(l.fine) : '—') }]} /></Card>
        <Card title="History" flush><DataTable rows={d.history} rowKey="_id" empty="No past loans" columns={[{ label: 'Book', render: (l) => <b>{l.book}</b> }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn) }, { label: 'Returned', render: (l) => fmtDate(l.returnedOn) }, { label: 'Status', render: (l) => <Badge>{label(l.status)}</Badge> }, { label: 'Fine', render: (l) => (l.fine ? <>{fmtMoney(l.fine)} {l.fineWaived ? <Badge>waived</Badge> : l.finePaid === false ? <Badge tone="amber">unpaid</Badge> : l.finePaid ? <Badge tone="green">paid</Badge> : ''}</> : '—') }]} /></Card>
        <div className="small muted">Late fines are charged per day and added to your fees; unpaid fines stop you borrowing more books.</div></>)}</Async>}
      {tab === 'catalogue' && <div className="stack"><Input placeholder="Search title, author or category" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search catalogue" />
        <Card flush><Async skeleton="datatable" state={books} empty={<Empty title="No books found" />}>{(d) => <DataTable rows={d.items} empty="No books found" columns={[{ label: 'Title', render: (b) => <><b>{b.title}</b><div className="small muted">{b.author}</div></> }, { label: 'Category', key: 'category' }, { label: 'Language', key: 'language' }, { label: 'Shelf', key: 'shelf' }, { label: 'Availability', render: (b) => (b.referenceOnly ? <Badge tone="amber">Library use only</Badge> : b.available > 0 ? <Badge tone="green">{b.available} of {b.total} available</Badge> : <Badge tone="red">All copies out</Badge>) }]} />}</Async></Card></div>}
    </div>
  );
}
