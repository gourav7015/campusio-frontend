import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, PageHeader, useAction, fmtDate, fmtDateTime, statusTone } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';

export function AnnouncementsAdmin() {
  const L = useLookups();
  const list = useApi('/api/school/announcements');
  const [modal, setModal] = useState(false); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Announcements" subtitle="Notices to the whole school, a role, or selected sections" actions={<Button variant="primary" onClick={() => setModal(true)}>+ Add announcement</Button>} />
      <Card flush><Async state={list} empty={<Empty title="No announcements yet" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (a) => <b>{a.title}</b> }, { label: 'Category', render: (a) => <Badge tone={a.category === 'urgent' ? 'red' : undefined}>{a.category}</Badge> }, { label: 'To', render: (a) => (a.audience.all ? 'Everyone' : [...(a.audience.roles || []), ...(a.audience.sectionIds?.length ? [`${a.audience.sectionIds.length} section(s)`] : [])].join(', ')) },
        { label: 'By', render: (a) => <>{a.createdByName || '—'} {a.createdByRole === 'teacher' && <Badge tone="blue">teacher</Badge>}</> }, { label: 'Date', render: (a) => fmtDateTime(a.createdAt) }, { label: 'Status', render: (a) => <Badge tone={statusTone(a.status)}>{a.status}</Badge> },
        { label: '', render: (a) => <div className="row">{a.status !== 'archived' && <ConfirmButton size="sm" message="Archive this announcement? It stays on record but is hidden from users." onConfirm={async () => { await run(() => post(`/api/school/announcements/${a._id}/archive`), 'Archived'); list.reload(); }}>Archive</ConfirmButton>}
          <ConfirmButton size="sm" variant="danger" message="Delete this announcement? It disappears for everyone and their notifications are removed. Use this when it was sent by mistake." onConfirm={async () => { await run(() => del(`/api/school/announcements/${a._id}`), 'Announcement deleted'); list.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>
      {modal && <FormModal wide title="Add announcement" fields={[{ name: 'title', label: 'Title', required: true }, { name: 'category', label: 'Category', type: 'select', options: ['general', 'urgent', 'holiday', 'examination', 'event', 'homework'], default: 'general', required: true },
        { name: 'audience', label: 'Send to', type: 'select', required: true, default: 'all', options: [{ value: 'all', label: 'Everyone' }, { value: 'teacher', label: 'All teachers' }, { value: 'student', label: 'All students' }, ...L.sections.filter((s) => s.status === 'active').map((s) => ({ value: s._id, label: `Section ${L.sectionName(s._id)}` }))] }, { name: 'body', label: 'Message', type: 'textarea' }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { const a = v.audience; const audience = a === 'all' ? { all: true } : ['teacher', 'student'].includes(a) ? { all: false, roles: [a], sectionIds: [] } : { all: false, roles: [], sectionIds: [a] };
          await post('/api/school/announcements', { title: v.title, category: v.category, body: v.body, audience }); list.reload(); return true; }} />}
    </div>
  );
}

export function Events() {
  const L = useLookups();
  const list = useApi('/api/school/events');
  const [modal, setModal] = useState(null); const [run] = useAction();
  const fields = [{ name: 'title', label: 'Title', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['holiday', 'event', 'ptm', 'exam', 'deadline', 'other'], default: 'event', required: true }, { name: 'startDate', label: 'Starts', type: 'date', required: true }, { name: 'endDate', label: 'Ends', type: 'date', hint: 'Leave blank for one day' },
    { name: 'sectionId', label: 'Only for section', type: 'select', options: L.sectionOptions, hint: 'Blank = whole school' }, { name: 'description', label: 'Description', type: 'textarea' }];
  return (
    <div className="stack">
      <PageHeader title="School calendar and events" subtitle="Holidays block attendance; events show on every student's and teacher's calendar" actions={<><Button onClick={async () => { await run(() => post('/api/school/events/government-holidays'), (r) => (r.added ? `Added ${r.added} government holiday(s)` : 'Already added')); list.reload(); }}>Add government holidays</Button><Button variant="primary" onClick={() => setModal({})}>+ Add event</Button></>} />
      <p className="small muted" style={{ margin: 0 }}>“Add government holidays” adds the national holidays that fall on the same date every year (Republic Day, Ambedkar Jayanti, Independence Day, Gandhi Jayanti, Christmas). Festivals that move with the moon or the state, such as Diwali, Eid or Holi, are not guessed: add them yourself with the date your state declares.</p>
      <Card flush><Async state={list} empty={<Empty title="No events yet" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Event', render: (e) => <b>{e.title}</b> }, { label: 'Type', render: (e) => <Badge tone={e.type === 'holiday' ? 'red' : 'blue'}>{e.type}</Badge> }, { label: 'When', render: (e) => (e.endDate !== e.startDate ? `${fmtDate(e.startDate)} – ${fmtDate(e.endDate, true)}` : fmtDate(e.startDate, true)) }, { label: 'For', render: (e) => (e.sectionIds?.length ? 'Selected section(s)' : 'Whole school') },
        { label: '', render: (e) => <div className="row"><Button size="sm" onClick={() => setModal(e)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Delete this event?" onConfirm={async () => { await run(() => del(`/api/school/events/${e._id}`), 'Deleted'); list.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>
      {modal && <FormModal wide title={modal._id ? 'Edit event' : 'Add event'} initial={{ ...modal, sectionId: modal.sectionIds?.[0] }} fields={fields} onClose={() => setModal(null)} onSubmit={async (v) => { const { sectionId, ...rest } = v; const body = { ...rest, sectionIds: sectionId ? [sectionId] : [] }; await (modal._id ? patch(`/api/school/events/${modal._id}`, body) : post('/api/school/events', body)); list.reload(); return true; }} />}
    </div>
  );
}

export function MessagesAdmin() {
  const list = useApi('/api/school/messages');
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Messages from teachers" />
      <Card flush><Async state={list} empty={<Empty title="No messages" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'From', render: (m) => <b>{m.fromName}</b> }, { label: 'Subject', render: (m) => m.subject }, { label: 'Message', render: (m) => m.body }, { label: 'When', render: (m) => fmtDateTime(m.createdAt) }, { label: 'Status', render: (m) => <Badge tone={m.status === 'read' ? 'green' : 'amber'}>{m.status}</Badge> },
        { label: '', render: (m) => m.status !== 'read' && <Button size="sm" onClick={async () => { await run(() => post(`/api/school/messages/${m._id}/read`)); list.reload(); }}>Mark read</Button> }]} />}</Async></Card>
    </div>
  );
}
