import { useApi } from '../../hooks/useApi.js';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Card, Empty, PageHeader, useAction, fmtDate, label } from '../../components/ui.jsx';
import ChatView from '../../components/ChatView.jsx';

const S = '/api/student';
export const StudentChats = () => <ChatView base={S} side="student" />;

/** What teachers have written about the student. The family (who sign in as the student) reads each one and acknowledges it. */
export function StudentRemarks() {
  const q = useApi(`${S}/remarks`); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Teacher remarks and guidelines" subtitle="Notes from your teachers about homework, behaviour and guidelines. Please read each one and tap “I have read this”, so the teacher knows it reached you." />
      <Async state={q} empty={<Card><Empty title="No remarks">Remarks from teachers appear here.</Empty></Card>}>{(rows) => rows.length ? (
        <div className="stack">{rows.map((r) => (
          <Card key={r._id}><div className="row between wrap"><div className="row"><b>{r.teacher || 'Teacher'}</b><Badge>{label(r.category)}</Badge><span className="muted small">{fmtDate(r.date, true)}</span></div>
            {!r.requireAck ? null : r.acknowledged ? <Badge tone="green">Acknowledged</Badge> : <Button variant="primary" size="sm" onClick={async () => { await run(() => post(`${S}/remarks/${r._id}/acknowledge`), 'Thank you. The teacher can see you have read it.'); q.reload(); }}>I have read this</Button>}</div>
            <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{r.text}</p></Card>))}</div>) : <Card><Empty title="No remarks">Remarks from teachers appear here.</Empty></Card>}</Async>
    </div>
  );
}
