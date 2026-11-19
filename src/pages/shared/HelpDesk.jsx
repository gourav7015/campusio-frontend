import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch, upload, openFile } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, PageHeader, Select, useAction, useDebounced, fmtDateTime, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';

const STATUS_TONE = { open: 'amber', pending: 'blue', resolved: 'green', closed: '' };
const PRIORITY_TONE = { low: '', normal: 'blue', high: 'amber', urgent: 'red' };
const CATEGORIES = [{ value: 'general', label: 'General question' }, { value: 'how_to', label: 'How do I…?' }, { value: 'bug', label: 'Something is not working' }, { value: 'account', label: 'Login or account' }, { value: 'billing', label: 'Billing and licences' }, { value: 'feature', label: 'Feature request' }, { value: 'other', label: 'Other' }];
const STATUSES = ['open', 'pending', 'resolved', 'closed'];
const STATUS_HELP = { open: 'Waiting for us', pending: 'Waiting for you', resolved: 'Resolved', closed: 'Closed' };

const MAX_FILES = 3; const MAX_MB = 10; const MAX_TEXT = 5000;
const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,text/plain';
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Up to three files (a screenshot, a PDF). The list and any problem stay next to the button. */
function FilePicker({ files, setFiles }) {
  const [problem, setProblem] = useState('');
  const pick = (e) => {
    const chosen = [...e.target.files]; e.target.value = '';
    const next = [...files]; let msg = '';
    for (const f of chosen) {
      if (next.length >= MAX_FILES) { msg = `You can attach up to ${MAX_FILES} files.`; break; }
      if (f.size > MAX_MB * 1048576) { msg = `${f.name} is larger than ${MAX_MB} MB.`; continue; }
      next.push(f);
    }
    setProblem(msg); setFiles(next);
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="btn sm" style={{ cursor: files.length >= MAX_FILES ? 'not-allowed' : 'pointer', opacity: files.length >= MAX_FILES ? 0.5 : 1 }}>
          Attach a screenshot or file<input type="file" multiple accept={ACCEPT} hidden onChange={pick} disabled={files.length >= MAX_FILES} aria-label="Attach files" />
        </label>
        <span className="small muted">Pictures, PDF or text. Up to {MAX_FILES} files, {MAX_MB} MB each.</span>
      </div>
      {problem && <div className="small" role="alert" style={{ color: 'var(--danger-ink, #b3261e)' }}>{problem}</div>}
      {files.map((f, i) => <div key={`${f.name}-${i}`} className="row small" style={{ gap: 8 }}><span>{f.name}</span><span className="muted">{kb(f.size)}</span><button type="button" className="btn sm" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>Remove</button></div>)}
    </div>
  );
}

/** Send text and files together as a form when there are files, as plain JSON otherwise. */
const sendForm = (path, fields, files) => {
  if (!files.length) return post(path, fields);
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') form.append(k, String(v)); });
  files.forEach((f) => form.append('files', f));
  return upload(path, form);
};

const StatusBadge = ({ s, handler }) => <Badge tone={STATUS_TONE[s]}>{handler ? label(s) : STATUS_HELP[s] || label(s)}</Badge>;

/**
 * The help desk, used by every portal.
 *  handler=false: the person who has a problem. Lists their own tickets, raises a new one, follows the conversation, closes it.
 *  handler=true : the side that answers. An inbox with filters, replies, private notes, status, priority and assignment.
 * `base` is the API path of the portal (for example /api/teacher/tickets or /api/platform/helpdesk).
 */
export default function HelpDesk({ base, handler = false, platform = false, title, subtitle, noun = 'ticket' }) {
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState(params.get('open')); // a notification or an email can open one ticket directly
  const [modal, setModal] = useState(false);
  const [status, setStatus] = useState(handler ? 'attention' : '');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const query = handler ? { ...(status === 'attention' ? { open: 'true' } : status ? { status } : {}), ...(priority ? { priority } : {}), ...(dq ? { q: dq } : {}), limit: 50 } : { limit: 100 };
  const list = useApi(base, query);

  if (openId) return <Thread key={openId} base={base} id={openId} handler={handler} platform={platform} onBack={() => { setOpenId(null); if (params.has('open')) setParams({}, { replace: true }); list.reload(); }} />;

  const columns = [
    { label: 'Ref', render: (t) => <b>{t.reference}</b> }, { label: 'Subject', render: (t) => t.subject },
    ...(platform ? [{ label: 'School', render: (t) => t.school?.name || '—' }] : []),
    ...(handler ? [{ label: 'From', render: (t) => <>{t.raisedBy?.name} <span className="muted small">{label(t.raisedBy?.role)}</span></> }] : []),
    { label: 'Status', render: (t) => <StatusBadge s={t.status} handler={handler} /> }, { label: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{label(t.priority)}</Badge> },
    ...(handler && platform ? [{ label: 'Assigned', render: (t) => t.assignedTo?.name || <span className="muted">—</span> }] : []),
    { label: 'Last activity', render: (t) => fmtDateTime(t.lastActivityAt) },
  ];
  const rows = (d) => (handler ? d.tickets : d);
  return (
    <div className="stack">
      <PageHeader title={title} subtitle={subtitle} actions={!handler && <Button variant="primary" onClick={() => setModal(true)}>+ New {noun}</Button>} />
      {handler && (
        <Card>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <Field label="Show"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'attention', label: 'Needs attention (open and pending)' }, ...STATUSES.map((s) => ({ value: s, label: label(s) }))]} placeholder="Everything" /></Field>
            <Field label="Priority"><Select value={priority} onChange={(e) => setPriority(e.target.value)} options={['low', 'normal', 'high', 'urgent'].map((p) => ({ value: p, label: label(p) }))} placeholder="Any" /></Field>
            <Field label="Search"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Subject, reference or name" /></Field>
            {list.data && <div className="small muted" style={{ alignSelf: 'end' }}>{['open', 'pending', 'resolved', 'closed'].map((s) => `${list.data.counts[s]} ${s}`).join(' · ')}</div>}
          </div>
        </Card>
      )}
      <Card flush>
        <Async state={list} empty={<Empty title={handler ? 'No tickets here' : 'No tickets yet'}>{handler ? 'Nothing matches these filters.' : `Use “New ${noun}” to ask for help.`}</Empty>}>
          {(d) => (rows(d).length ? <DataTable rows={rows(d)} columns={columns} onRowClick={(t) => setOpenId(t._id)} /> : <Empty title={handler ? 'No tickets here' : 'No tickets yet'}>{handler ? 'Nothing matches these filters.' : 'Use “New ticket” to ask for help.'}</Empty>)}
        </Async>
      </Card>
      {modal && <NewTicket noun={noun} base={base} onClose={() => setModal(false)} onCreated={(t) => { list.reload(); setOpenId(t._id); }} />}
    </div>
  );
}

function NewTicket({ base, onClose, onCreated, noun = 'ticket' }) {
  const [files, setFiles] = useState([]);
  return (
        <FormModal wide title={`New ${noun}`} submitLabel="Send"
          fields={[{ name: 'subject', label: 'Subject', required: true, placeholder: 'A short summary' }, { name: 'category', label: 'About', type: 'select', options: CATEGORIES, default: 'general', required: true },
            { name: 'priority', label: 'How urgent?', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }], default: 'normal', required: true },
            { name: 'body', label: noun === 'query' ? 'Your question' : 'What happened?', type: 'textarea', required: true, full: true, placeholder: noun === 'query' ? 'Say what you would like the office to check or answer.' : 'Tell us what you were trying to do and what went wrong.' }]}
          onClose={onClose} onSubmit={async (v) => { const t = await sendForm(base, v, files); onCreated(t); return true; }}>
          <div style={{ marginTop: 12 }}><FilePicker files={files} setFiles={setFiles} /></div>
        </FormModal>
  );
}

function Thread({ base, id, handler, platform, onBack }) {
  const { user } = useAuth();
  const q = useApi(`${base}/${id}`);
  const [text, setText] = useState(''); const [internal, setInternal] = useState(false); const [files, setFiles] = useState([]); const [run, busy] = useAction();
  const t = q.data;
  const send = async () => { const body = text.trim(); if (!body) return; const r = await run(() => sendForm(`${base}/${id}/replies`, handler ? { body, internal } : { body }, files)); if (r) { setText(''); setInternal(false); setFiles([]); q.reload(); } };
  const closeTicket = () => run(async () => { await post(`${base}/${id}/close`); q.reload(); return true; });
  const change = (patchBody) => run(async () => { await patch(`${base}/${id}`, patchBody); q.reload(); return true; });
  return (
    <div className="stack">
      <PageHeader title={t ? `${t.reference} · ${t.subject}` : 'Ticket'} actions={<Button onClick={onBack}>← All tickets</Button>} />
      <Async state={q}>
        {() => t && (
          <>
            <Card>
              <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <StatusBadge s={t.status} handler={handler} /><Badge tone={PRIORITY_TONE[t.priority]}>{label(t.priority)} priority</Badge><Badge>{label(t.category)}</Badge>
                {platform && t.school && <span className="small muted">{t.school.name}</span>}
                <span className="small muted">Raised by {t.raisedBy?.name} ({label(t.raisedBy?.role)}) · {fmtDateTime(t.createdAt)}</span>
                {t.assignedTo && <span className="small muted">Assigned to {t.assignedTo.name}</span>}
              </div>
              {handler && (
                <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  <Field label="Status"><Select value={t.status} onChange={(e) => change({ status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: label(s) }))} /></Field>
                  <Field label="Priority"><Select value={t.priority} onChange={(e) => change({ priority: e.target.value })} options={['low', 'normal', 'high', 'urgent'].map((p) => ({ value: p, label: label(p) }))} /></Field>
                  {platform && String(t.assignedTo?.userId) !== String(user?.id || user?._id) && <Button style={{ alignSelf: 'end' }} onClick={() => change({ assignedTo: user.id || user._id })}>Assign to me</Button>}
                  {t.status !== 'resolved' && t.status !== 'closed' && <Button style={{ alignSelf: 'end' }} onClick={() => change({ status: 'resolved' })}>Mark resolved</Button>}
                </div>
              )}
              {!handler && t.status !== 'closed' && <div style={{ marginTop: 12 }}><ConfirmButton size="sm" message="Close this ticket? You can still raise a new one later." onConfirm={closeTicket}>Close ticket</ConfirmButton></div>}
            </Card>
            <Card title="Conversation">
              <div className="stack" style={{ gap: 10 }}>
                {t.messages.map((m) => (
                  <div key={m._id} style={{ borderLeft: `3px solid ${m.internal ? '#d97706' : m.fromRequester ? '#2563eb' : '#16a34a'}`, background: m.internal ? 'rgba(217,119,6,.08)' : 'transparent', padding: '6px 12px' }}>
                    <div className="small muted"><b>{m.authorName}</b> · {label(m.authorRole)} · {fmtDateTime(m.at)}{m.internal && <> · <b>Private note (the requester cannot see this)</b></>}</div>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>{m.body}</div>
                    {m.attachments?.length > 0 && <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>{m.attachments.map((a) => <button key={a.fileId} type="button" className="btn sm" onClick={() => run(async () => { await openFile(a.fileId, `${base}/${id}/files/${a.fileId}/link`); return true; })} aria-label={`Open ${a.name}`}>📎 {a.name} <span className="muted">{kb(a.size)}</span></button>)}</div>}
                  </div>
                ))}
              </div>
            </Card>
            {(handler || t.status !== 'closed') && (
              <Card title={t.status === 'closed' ? 'Reopen to reply' : 'Reply'}>
                {handler && t.status === 'closed' ? <Button onClick={() => change({ status: 'open' })}>Reopen this ticket</Button> : (
                  <div className="stack" style={{ gap: 8 }}>
                    <textarea rows={4} value={text} maxLength={MAX_TEXT} onChange={(e) => setText(e.target.value)} placeholder={handler && internal ? 'A private note for your team…' : 'Write your reply…'} />
                    <div className="small muted right" aria-live="polite">{text.length} / {MAX_TEXT}</div>
                    <FilePicker files={files} setFiles={setFiles} />
                    <div className="row between">
                      {handler ? <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> <span className="small">Private note (not shown to the requester, no email sent)</span></label> : <span />}
                      <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={send}>{internal ? 'Add note' : 'Send reply'}</Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </Async>
    </div>
  );
}
