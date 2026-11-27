import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { openFile } from '../../api/client.js';
import { Async, Badge, Card, Empty, PageHeader, Tabs, fmtDate } from '../../components/ui.jsx';
import { HomeworkDay } from '../admin/ClassHub.jsx';

const S = '/api/student';
const todayStr = () => new Date().toLocaleDateString('en-CA');

/** "Due today", "Due tomorrow", "Due 3 Dec". */
const dueText = (h) => (h.daysLeft === 0 ? 'Due today' : h.daysLeft === 1 ? 'Due tomorrow' : `Due ${fmtDate(h.dueDate)}`);
const dueTone = (h) => (h.daysLeft <= 1 ? 'red' : h.daysLeft <= 3 ? 'amber' : undefined);

function Item({ h }) {
  return (
    <Card>
      <div className="row between wrap" style={{ gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}><div className="small muted">{h.subject}</div><b style={{ fontSize: 16 }}>{h.title}</b></div>
        <Badge tone={dueTone(h)}>{dueText(h)}</Badge>
      </div>
      {h.description && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-line' }}>{h.description}</p>}
      {h.attachmentFiles?.length ? <p className="row wrap" style={{ gap: 8, margin: '10px 0 0' }}>{h.attachmentFiles.map((f) => <a key={f._id} className="chip" href="#!" onClick={(e) => { e.preventDefault(); openFile(f._id); }}>{f.originalName}</a>)}</p> : null}
      <div className="small muted" style={{ marginTop: 10 }}>{[h.teacher && `Set by ${h.teacher}`, h.assignedDate && `on ${fmtDate(h.assignedDate)}`].filter(Boolean).join(' ')}</div>
    </Card>
  );
}

/** Today: what was set today or falls due today, then what is still due in the coming days. */
function Today() {
  const q = useApi(`${S}/homework`, { tab: 'pending' });
  const day = todayStr();
  return (
    <Async state={q}>{(rows) => {
      const now = rows.filter((h) => h.assignedDate === day || h.dueDate === day);
      const later = rows.filter((h) => h.assignedDate !== day && h.dueDate > day).sort((a, b) => a.daysLeft - b.daysLeft);
      return (
        <div className="stack">
          <div className="small muted" style={{ fontWeight: 600 }}>Homework on {fmtDate(day, true)}</div>
          {now.length ? now.map((h) => <Item key={h._id} h={h} />) : <Card><Empty title="No homework was set or is due today">When a teacher sets homework it appears here.</Empty></Card>}
          {later.length > 0 && <><div className="small muted" style={{ fontWeight: 600, marginTop: 6 }}>Still due in the coming days</div>{later.map((h) => <Item key={h._id} h={h} />)}</>}
        </div>
      );
    }}</Async>
  );
}

/** Set by the student's teachers. Today first; earlier days are read the same way the school office reads them: a week strip and the day's list. */
export function StudentHomework() {
  const [tab, setTab] = useState('today');
  return (
    <div className="stack">
      <PageHeader title="Homework" subtitle="Set by your teachers for your class. Your teacher checks it in class." />
      <Tabs tabs={[['today', 'Today'], ['earlier', 'Earlier']]} value={tab} onChange={setTab} />
      {tab === 'today' ? <Today /> : <HomeworkDay url={`${S}/homework-day`} />}
    </div>
  );
}
