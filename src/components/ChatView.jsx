import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { post } from '../api/client.js';
import { Async, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, useAction, fmtDateTime } from './ui.jsx';

/**
 * Teacher and family chat. `side` is 'teacher' or 'student' (the family signs in as the student).
 * A teacher starts a chat from a student's page or here; the family starts one with their own teachers.
 */
export default function ChatView({ base, side }) {
  const threads = useApi(`${base}/chats`);
  const [sp, setSp] = useSearchParams();
  const openId = sp.get('open');
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div className="stack">
      <PageHeader title={side === 'teacher' ? 'Messages from families' : 'Message a teacher'} subtitle={side === 'teacher' ? 'Talk to a student\'s family about homework or anything about school. Messages are kept on record.' : 'Ask your child\'s teachers a question. Messages are kept on record and teachers reply when they can.'} actions={<Button variant="primary" onClick={() => setNewOpen(true)}>+ New message</Button>} />
      <div className="grid chat-grid">
        <Card title="Conversations" flush>
          <Async state={threads} empty={<Empty title="No conversations yet">Start one with “New message”.</Empty>}>{(rows) => rows.length ? (
            <ul className="timeline" style={{ margin: 0 }}>{rows.map((t) => (
              <li key={t._id}><button type="button" onClick={() => setSp({ open: t._id })} aria-current={openId === t._id} className="grow" style={{ textAlign: 'left', background: 'none', border: 0, padding: '8px 12px', cursor: 'pointer', width: '100%', font: 'inherit', color: 'inherit', fontWeight: openId === t._id ? 600 : 400 }}>
                <div className="row between"><b>{side === 'teacher' ? t.student : t.teacher}</b>{t.unread > 0 && <Badge tone="primary">{t.unread} new</Badge>}</div>
                <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastPreview}</div></button></li>))}</ul>) : <Empty title="No conversations yet">Start one with “New message”.</Empty>}</Async>
        </Card>
        {openId ? <Thread key={openId} base={base} side={side} id={openId} onActivity={threads.reload} /> : <Card><Empty title="Choose a conversation" /></Card>}
      </div>
      {newOpen && <NewChat base={base} side={side} onClose={() => setNewOpen(false)} onCreated={(t) => { threads.reload(); setSp({ open: t._id }); }} />}
    </div>
  );
}

function Thread({ base, side, id, onActivity }) {
  const q = useApi(`${base}/chats/${id}`);
  const [text, setText] = useState(''); const [run, busy] = useAction();
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [q.data?.messages.length]);
  const send = async () => { const t = text.trim(); if (!t) return; const r = await run(() => post(`${base}/chats/${id}/messages`, { text: t })); if (r) { setText(''); q.reload(); onActivity(); } };
  return (
    <Card title={<span>{side === 'teacher' ? `Family of ${q.data?.student || ''}` : q.data?.teacher || ''}</span>} flush>
      <Async state={q}>{(d) => (<>
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
          {d.messages.map((m) => { const mine = m.from === side; return (
            <div key={m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', background: mine ? 'rgb(var(--c-primary-soft))' : 'var(--grey-50)', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div><div className="small muted">{mine ? 'You' : m.from === 'teacher' ? d.teacher : `Family of ${d.student}`} · {fmtDateTime(m.at)}</div></div>); })}
          <div ref={end} /></div>
        <div className="card-b row"><div className="grow"><Input value={text} maxLength={1000} placeholder="Write a message" aria-label="Message" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} /></div><Button variant="primary" loading={busy} disabled={!text.trim()} onClick={send}>Send</Button></div></>)}</Async>
    </Card>
  );
}

function NewChat({ base, side, onClose, onCreated }) {
  const teachers = useApi(side === 'student' ? `${base}/chat-teachers` : null);
  const classes = useApi(side === 'teacher' ? `${base}/classes` : null);
  const [sectionId, setSectionId] = useState('');
  const students = useApi(side === 'teacher' && sectionId ? `${base}/classes/${sectionId}/students` : null);
  const [to, setTo] = useState(''); const [text, setText] = useState(''); const [run, busy] = useAction();
  const send = async () => { const t = await run(() => post(`${base}/chats`, side === 'student' ? { teacherId: to, text } : { studentId: to, text })); if (t) { onCreated(t); onClose(); } };
  return (
    <Modal title="New message" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!to || !text.trim()} onClick={send}>Send</Button></>}>
      <div className="stack">
        {side === 'student' && <Field label="To"><Select value={to} onChange={(e) => setTo(e.target.value)} placeholder="Choose a teacher" options={(teachers.data || []).map((t) => ({ value: t.teacherId, label: `${t.name} (${t.role})` }))} /></Field>}
        {side === 'teacher' && <><Field label="Class"><Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setTo(''); }} placeholder="Choose a class" options={(classes.data || []).map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))} /></Field>
          <Field label="Student's family"><Select value={to} onChange={(e) => setTo(e.target.value)} placeholder={sectionId ? 'Choose a student' : 'Choose a class first'} options={(students.data || []).map((s) => ({ value: s.studentId, label: `${String(s.rollNo).padStart(2, '0')} · ${s.name}` }))} /></Field></>}
        <Field label="Message"><textarea rows={4} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
