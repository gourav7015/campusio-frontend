import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch, del } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction, fmtDateTime } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';

/**
 * The public Connect page (atkaksha.in/connect), run from here: who is on it and how to reach them, its wording and opening hours, the mailboxes it
 * lists, and the messages people send from it.
 */
const TONES = [{ value: '1', label: 'Blue' }, { value: '2', label: 'Green' }, { value: '3', label: 'Amber' }, { value: '4', label: 'Rose' }];
const TONE_BADGE = { 1: 'blue', 2: 'green', 3: 'amber', 4: 'red' };
const DAYS = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['7', 'Sun']];
const REASON = { demo: 'See a demo', price: 'Pricing and plans', help: 'Help for a school', other: 'Something else' };

function Team() {
  const list = useApi('/api/platform/team');
  const [edit, setEdit] = useState(null); const [run] = useAction();
  const fields = [
    { name: 'name', label: 'Name', required: true },
    { name: 'role', label: 'Role', placeholder: 'Demos and onboarding', keepEmpty: true },
    { name: 'about', label: 'About', type: 'textarea', hint: 'One or two sentences, in the first person if you like (up to 300 characters)', keepEmpty: true },
    { name: 'topics', label: 'Good for', hint: 'What to talk to them about. Separate with commas, up to six.', keepEmpty: true },
    { name: 'phone', label: 'Mobile', placeholder: '+91 98765 43210', keepEmpty: true },
    { name: 'whatsapp', label: 'WhatsApp number', hint: 'Leave blank to use the mobile number', keepEmpty: true },
    { name: 'email', label: 'Email', type: 'email', keepEmpty: true },
    { name: 'languages', label: 'Speaks', placeholder: 'English, Hindi', keepEmpty: true },
    { name: 'tone', label: 'Card colour', type: 'select', options: TONES, default: '1' },
    { name: 'visible', label: 'Shown on the page', type: 'checkbox', hint: 'Untick to hide them without deleting' },
  ];
  const body = (v) => ({ ...v, topics: String(v.topics || '').split(',').map((x) => x.trim()).filter(Boolean), tone: Number(v.tone) || 1 });
  const move = async (rows, i, dir) => {
    const ids = rows.map((r) => r.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await run(() => post('/api/platform/team/reorder', { ids }));
    list.reload();
  };
  return (
    <div className="stack">
      <Card title="People on the Connect page" action={<div className="row"><a className="btn sm" href="/connect" target="_blank" rel="noopener noreferrer">View the public page</a><Button size="sm" variant="primary" onClick={() => setEdit({})}>+ Add a person</Button></div>} flush>
        <Async skeleton="datatable" state={list} empty={<Empty title="Nobody is listed yet">Add the people visitors can reach.</Empty>}>{(rows) => rows.length ? (
          <DataTable searchable={false} pageSize={50} rowKey="id" rows={rows} columns={[
            { label: 'Order', render: (r) => { const i = rows.findIndex((x) => x.id === r.id); return <div className="row" style={{ gap: 4 }}><Button size="sm" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(rows, i, -1)}>▲</Button><Button size="sm" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(rows, i, 1)}>▼</Button></div>; } },
            { label: 'Person', render: (r) => <><b>{r.name}</b> <Badge tone={TONE_BADGE[r.tone]}>{TONES[(r.tone || 1) - 1].label}</Badge><div className="small muted">{r.role || '—'}</div></> },
            { label: 'How to reach', render: (r) => <>{r.email || <span className="muted">No email</span>}<div className="small muted">{r.phone || 'No mobile'}{r.whatsapp && r.whatsapp !== r.phone ? ` · WhatsApp ${r.whatsapp}` : ''}</div></> },
            { label: 'On the page', render: (r) => (r.visible ? <Badge tone="green">Shown</Badge> : <Badge tone="amber">Hidden</Badge>) },
            { label: '', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="sm" onClick={async () => { await run(() => patch(`/api/platform/team/${r.id}`, { visible: !r.visible }), r.visible ? 'Hidden from the page' : 'Shown on the page'); list.reload(); }}>{r.visible ? 'Hide' : 'Show'}</Button>
                <ConfirmButton size="sm" variant="danger" message={`Remove ${r.name} from the Connect page? You can add them again later.`} onConfirm={async () => { await run(() => del(`/api/platform/team/${r.id}`), 'Removed'); list.reload(); }}>Remove</ConfirmButton>
              </div>) },
          ]} />
        ) : <Empty title="Nobody is listed yet">Add the people visitors can reach.</Empty>}</Async>
      </Card>
      <p className="small muted">Only people marked Shown appear on the public page. Their mobile number and email are public there, so use work contacts.</p>
      {edit && (
        <FormModal wide title={edit.id ? `Edit ${edit.name}` : 'Add a person'} fields={fields} initial={edit.id ? { ...edit, topics: (edit.topics || []).join(', '), tone: String(edit.tone || 1) } : { visible: true, tone: '1' }}
          onClose={() => setEdit(null)} onSubmit={async (v) => { await (edit.id ? patch(`/api/platform/team/${edit.id}`, body(v)) : post('/api/platform/team', body(v))); list.reload(); return true; }} />
      )}
    </div>
  );
}

function PageSettings() {
  const cur = useApi('/api/platform/connect');
  return <Async skeleton="form" state={cur}>{(d) => <SettingsForm key={JSON.stringify(d)} d={d} reload={cur.reload} />}</Async>;
}
function SettingsForm({ d, reload }) {
  const [f, setF] = useState({ ...d, hoursDays: d.hoursDays.map(String), mailboxes: d.mailboxes.map((m) => ({ ...m })) });
  const [run, busy] = useAction();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleDay = (k) => set('hoursDays', f.hoursDays.includes(k) ? f.hoursDays.filter((x) => x !== k) : [...f.hoursDays, k]);
  const box = (i, p, v) => set('mailboxes', f.mailboxes.map((m, j) => (j === i ? { ...m, [p]: v } : m)));
  const save = async () => { if (await run(() => put('/api/platform/connect', { ...f, hoursDays: f.hoursDays.map(Number).sort((a, b) => a - b) }), 'Saved: the public page now shows this')) reload(); };
  return (
    <div className="stack">
      <Card title="Wording">
        <div className="stack-sm">
          <Field label="Headline"><Input aria-label="Headline" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={120} /></Field>
          <Field label="Introduction"><Input aria-label="Introduction" value={f.intro || ''} onChange={(e) => set('intro', e.target.value)} maxLength={300} /></Field>
        </div>
      </Card>
      <Card title="Opening hours">
        <div className="stack-sm">
          <div className="row wrap" role="group" aria-label="Days the team answers" style={{ gap: 6 }}>{DAYS.map(([k, label]) => <Button key={k} size="sm" variant={f.hoursDays.includes(k) ? 'primary' : undefined} aria-pressed={f.hoursDays.includes(k)} onClick={() => toggleDay(k)}>{label}</Button>)}</div>
          <div className="row wrap">
            <Field label="Opens"><Input aria-label="Opens" type="time" value={f.opensAt} onChange={(e) => set('opensAt', e.target.value)} /></Field>
            <Field label="Closes"><Input aria-label="Closes" type="time" value={f.closesAt} onChange={(e) => set('closesAt', e.target.value)} /></Field>
          </div>
          <Field label="Note under the hours" hint="Shown on the Our team tab, e.g. who to ask for sign-in help"><Input aria-label="Note under the hours" value={f.hoursNote || ''} onChange={(e) => set('hoursNote', e.target.value)} maxLength={200} /></Field>
          <p className="small muted">Open now and Closed now are worked out from these hours in India time.</p>
        </div>
      </Card>
      <Card title="Prefer email? (the list on the Send a message tab)" action={<Button size="sm" disabled={f.mailboxes.length >= 10} onClick={() => set('mailboxes', [...f.mailboxes, { address: '', purpose: '' }])}>+ Add an address</Button>}>
        <div className="stack-sm">
          {f.mailboxes.map((m, i) => (
            <div key={i} className="row wrap" style={{ alignItems: 'end' }}>
              <Field label="Address"><Input aria-label={`Address ${i + 1}`} type="email" value={m.address} onChange={(e) => box(i, 'address', e.target.value)} /></Field>
              <Field label="What it is for"><Input aria-label={`Purpose ${i + 1}`} value={m.purpose} onChange={(e) => box(i, 'purpose', e.target.value)} maxLength={100} /></Field>
              <Button size="sm" variant="danger" aria-label={`Remove address ${i + 1}`} onClick={() => set('mailboxes', f.mailboxes.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          {!f.mailboxes.length && <p className="muted small" style={{ margin: 0 }}>No addresses are listed.</p>}
        </div>
      </Card>
      <Card title="Where messages are sent">
        <div className="row wrap">
          <Field label="Demos, pricing and other" hint="Blank: the support address set on the server"><Input aria-label="Send demos, pricing and other messages to" type="email" value={f.helloTo || ''} onChange={(e) => set('helloTo', e.target.value)} /></Field>
          <Field label="Help for schools" hint="Blank: the support address set on the server"><Input aria-label="Send help messages to" type="email" value={f.supportTo || ''} onChange={(e) => set('supportTo', e.target.value)} /></Field>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Every message is also kept on the Messages tab, so nothing is lost if an email does not arrive.</p>
      </Card>
      <div className="row"><Button variant="primary" loading={busy} disabled={f.title.trim().length < 3 || f.closesAt <= f.opensAt} onClick={save}>Save page settings</Button></div>
    </div>
  );
}

function Messages() {
  const [status, setStatus] = useState('new');
  const list = useApi('/api/platform/connect/messages', { status: status || undefined });
  const [open, setOpen] = useState(null); const [run] = useAction();
  const mark = async (m, s) => { await run(() => patch(`/api/platform/connect/messages/${m._id}`, { status: s }), s === 'handled' ? 'Marked as handled' : 'Reopened'); list.reload(); setOpen(null); };
  return (
    <div className="stack">
      <Card title="Messages from the Connect page" action={<Select aria-label="Show messages" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'new', label: 'New' }, { value: 'handled', label: 'Handled' }, { value: '', label: 'All' }]} />} flush>
        <Async skeleton="datatable" state={list} empty={<Empty title="No messages here">Messages sent from the public Connect page appear here.</Empty>}>{(rows) => rows.length ? (
          <DataTable searchable={false} pageSize={25} rowKey="_id" rows={rows} onRowClick={setOpen} columns={[
            { label: 'Received', render: (m) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(m.createdAt)}<div className="small muted">{m.ref}</div></span> },
            { label: 'From', render: (m) => <><b>{m.name}</b><div className="small muted">{m.school}</div></> },
            { label: 'About', render: (m) => <>{REASON[m.reason]}{m.message && <div className="small muted">{m.message.length > 70 ? `${m.message.slice(0, 68)}…` : m.message}</div>}</> },
            { label: 'Status', render: (m) => <Badge tone={m.status === 'new' ? 'amber' : 'green'}>{m.status === 'new' ? 'New' : 'Handled'}</Badge> },
            { label: '', render: (m) => <Button size="sm" onClick={(e) => { e.stopPropagation(); setOpen(m); }}>Open</Button> },
          ]} />
        ) : <Empty title="No messages here">Messages sent from the public Connect page appear here.</Empty>}</Async>
      </Card>
      {open && (
        <Modal wide title={`${REASON[open.reason]} · ${open.ref}`} onClose={() => setOpen(null)} footer={<>
          <Button onClick={() => setOpen(null)}>Close</Button>
          <a className="btn" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your message to AtKaksha (${open.ref})`)}`}>Reply by email</a>
          <ConfirmButton variant="danger" message="Delete this message for good?" onConfirm={async () => { await run(() => del(`/api/platform/connect/messages/${open._id}`), 'Deleted'); list.reload(); setOpen(null); }}>Delete</ConfirmButton>
          {open.status === 'new' ? <Button variant="primary" onClick={() => mark(open, 'handled')}>Mark as handled</Button> : <Button onClick={() => mark(open, 'new')}>Reopen</Button>}
        </>}>
          <dl className="kv">
            <dt>From</dt><dd>{open.name} · <a href={`mailto:${open.email}`}>{open.email}</a></dd><dt>School</dt><dd>{open.school}</dd>
            {open.phone && <><dt>Mobile</dt><dd>{open.phone}</dd></>}{open.size && <><dt>Students</dt><dd>{open.size}</dd></>}{open.bestTime && <><dt>Best time</dt><dd>{open.bestTime}</dd></>}
            <dt>Received</dt><dd>{fmtDateTime(open.createdAt)}</dd><dt>Message</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{open.message || <span className="muted">No message</span>}</dd>
          </dl>
        </Modal>
      )}
    </div>
  );
}

export default function ConnectAdmin() {
  const [tab, setTab] = useState('team');
  const sum = useApi('/api/platform/connect/messages/summary');
  return (
    <div className="stack">
      <PageHeader title="Connect page" subtitle="The public page at /connect (the business card's QR code opens it): who visitors can reach, its wording and hours, and the messages they send." />
      <Tabs tabs={[['team', 'Team'], ['page', 'Page settings'], ['messages', `Messages${sum.data?.count ? ` (${sum.data.count})` : ''}`]]} value={tab} onChange={setTab} />
      {tab === 'team' && <Team />}
      {tab === 'page' && <PageSettings />}
      {tab === 'messages' && <Messages />}
    </div>
  );
}
