import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, del, openFile } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, Empty, Modal, PageHeader, Select, useAction, fmtDateTime, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';

const CATS = ['homework', 'attendance', 'examination', 'results', 'announcements', 'timetable', 'leave', 'fees', 'library', 'system'];
const LINKS = { homework: 'homework', attendance: 'attendance', material: 'materials', announcement: 'announcements', result: 'results', exam: 'exams', timetable: 'timetable', leave: 'leave', staff_leave: 'leave?tab=transport', marks: 'exams', message: 'messages', fees: 'fees', library: 'library', ticket: 'helpdesk' };

export function NotificationsPage({ role, base }) {
  const [cat, setCat] = useState('');
  const [unread, setUnread] = useState(false);
  const list = useApi(`${base}/notifications`, { category: cat, unread: unread ? 'true' : undefined, limit: 100 });
  const nav = useNavigate();
  const [run] = useAction();
  const open = async (n) => { if (!n.readAt) { await post(`${base}/notifications/${n._id}/read`).catch(() => {}); list.reload(); } const to = LINKS[n.link?.type]; if (to) nav(`/${role}/${to}${n.link?.id && n.link.type === 'ticket' ? `?open=${n.link.id}` : ''}`); };
  return (
    <div className="stack">
      <PageHeader title="Notifications" actions={<>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} options={CATS.map((c) => ({ value: c, label: label(c) }))} placeholder="All categories" aria-label="Category" />
        <label className="row"><input type="checkbox" checked={unread} onChange={(e) => setUnread(e.target.checked)} /> Unread only</label>
        <Button onClick={async () => { await run(() => post(`${base}/notifications/read-all`, {}), 'All marked as read'); list.reload(); }}>Mark all read</Button></>} />
      <Card flush><Async state={list} empty={<Empty title="No notifications" />}>{(d) => d.items.length ? (
        <ul className="timeline" style={{ padding: '0 18px' }}>{d.items.map((n) => (
          <li key={n._id} style={{ cursor: n.link?.type ? 'pointer' : 'default', opacity: n.readAt ? 0.7 : 1 }} onClick={() => open(n)}>
            <span className="dotc" style={{ background: n.readAt ? 'var(--border)' : undefined }} /><div className="grow"><div className="bold">{n.title}</div><div className="small muted">{n.body}</div></div>
            <div className="right small muted"><Badge>{label(n.category)}</Badge><div>{fmtDateTime(n.createdAt)}</div></div></li>))}</ul>) : <Empty title="No notifications" />}</Async></Card>
    </div>
  );
}

export function AnnouncementsPage({ base, title = 'Notices', canDelete, actions, subtitle = 'Notices from your school' }) {
  const list = useApi(`${base}/announcements`);
  const [open, setOpen] = useState(null);
  const [run] = useAction();
  const show = async (a) => { setOpen(a); if (!a.read) { await post(`${base}/announcements/${a._id}/read`).catch(() => {}); list.reload(); } };
  return (
    <div className="stack">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <Async state={list} empty={<Empty title="No notices yet" />}>{(rows) => (
        <div className="stack-sm">{rows.map((a) => (
          <Card key={a._id}><div className="row between wrap"><div className="row"><b style={{ cursor: 'pointer' }} onClick={() => show(a)}>{a.title}</b> {!a.read && <Badge tone="primary">New</Badge>}<Badge tone={a.category === 'urgent' ? 'red' : undefined}>{a.category === 'urgent' ? 'Urgent' : a.category}</Badge></div><span className="muted small">{fmtDateTime(a.createdAt)}</span></div>
            <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{(a.body || '').slice(0, 220)}{(a.body || '').length > 220 && '…'}</p>
            {canDelete && a.mine && <div style={{ marginTop: 8 }}><ConfirmButton size="sm" variant="danger" message="Delete this notice? Students lose it and their notifications are removed." onConfirm={async () => { await run(() => del(`${base}/announcements/${a._id}`), 'Notice deleted'); list.reload(); }}>Delete (sent by mistake)</ConfirmButton></div>}
            {a.attachmentFiles.length > 0 && <div style={{ marginTop: 8 }}>{a.attachmentFiles.map((f) => <a key={f._id} className="chip" style={{ marginRight: 6 }} href="#!" onClick={(e) => { e.preventDefault(); run(() => openFile(f._id)); }}>{f.originalName}</a>)}</div>}</Card>))}</div>)}</Async>
      {open && <Modal title={open.title} onClose={() => setOpen(null)}><div className="small muted">{label(open.category)} · {fmtDateTime(open.createdAt)}</div><p style={{ whiteSpace: 'pre-wrap' }}>{open.body}</p></Modal>}
    </div>
  );
}

/** The teacher's Notices: what the school has told them and the notices they send to their own classes. (Anything for the office goes through "Queries to the office".) */
export function Notices() {
  const classes = useApi('/api/teacher/classes');
  const [modal, setModal] = useState(false);
  const [bump, setBump] = useState(0);
  return (
    <>
      <AnnouncementsPage key={bump} base="/api/teacher" title="Notices" canDelete subtitle="Notices from the school, and notices to your classes" actions={<Button variant="primary" onClick={() => setModal(true)}>+ Notice to my class</Button>} />
      {modal && <FormModal wide title="Send a notice to your class" submitLabel="Send notice" fields={[{ name: 'sectionId', label: 'Class', type: 'select', required: true, options: [...((classes.data || []).length > 1 ? [{ value: '__all', label: 'All my classes' }] : []), ...(classes.data || []).map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))] }, { name: 'category', label: 'Category', type: 'select', options: ['general', 'urgent', 'homework', 'examination', 'event'], default: 'general', required: true }, { name: 'title', label: 'Title', required: true, full: true }, { name: 'body', label: 'Message', type: 'textarea' }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { const { sectionId, ...rest } = v; await post('/api/teacher/announcements', { ...rest, sectionIds: sectionId === '__all' ? [...new Set((classes.data || []).map((c) => c.sectionId))] : [sectionId] }); /* "All my classes" is one notice, not one per class */ setBump((n) => n + 1); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Students of the class (or of every class you choose) are notified immediately, once. If you send something wrong, delete it from the list and it disappears for everyone.</p></FormModal>}
    </>
  );
}
