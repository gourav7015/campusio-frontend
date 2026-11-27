import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { put, del, post, download } from '../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, Field, Input, fmtDate, useAction } from './ui.jsx';

/** The privacy tools for one student: the guardian's consent, a copy of everything held, and erasure once the student has left. School Admin only. */
export default function StudentPrivacy({ studentId, name, onErased }) {
  const q = useApi(`/api/school/privacy/students/${studentId}`);
  const [run, busy] = useAction();
  const [c, setC] = useState({ givenOn: new Date().toLocaleDateString('en-CA'), guardianName: '', relationship: '', note: '' });
  const [erase, setErase] = useState({ admissionNo: '', reason: '' });
  return (
    <Async skeleton="form" keep state={q}>{(p) => (
      <div className="stack">
        <Card title="Guardian consent" action={p.consent ? <Badge tone="green">Recorded</Badge> : <Badge tone="amber">Not recorded</Badge>}>
          {p.erased ? <p className="muted" style={{ margin: 0 }}>This student's personal details were erased on {fmtDate(p.erasedAt, true)}.</p> : p.consent ? (
            <div className="stack">
              <dl className="kv"><dt>Given by</dt><dd>{p.consent.guardianName}{p.consent.relationship ? ` (${p.consent.relationship})` : ''}</dd><dt>On</dt><dd>{fmtDate(p.consent.givenOn, true)}</dd><dt>Note</dt><dd>{p.consent.note || '—'}</dd><dt>Recorded by</dt><dd>{p.consent.recordedByName || '—'}</dd></dl>
              <div><ConfirmButton size="sm" message="Remove the consent record?" onConfirm={async () => { await run(() => del(`/api/school/privacy/students/${studentId}/consent`), 'Removed'); q.reload(); }}>Remove record</ConfirmButton></div>
            </div>
          ) : (
            <form className="stack" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => put(`/api/school/privacy/students/${studentId}/consent`, { ...c, relationship: c.relationship || undefined, note: c.note || undefined }), 'Consent recorded'); if (r) q.reload(); }}>
              <p className="muted" style={{ margin: 0 }}>Record that a parent or guardian agreed to the school holding {name}'s details (for example on the admission form). Keep the signed paper with your admission records.</p>
              <div className="grid g2">
                <Field label="Guardian's name"><Input value={c.guardianName} onChange={(e) => setC({ ...c, guardianName: e.target.value })} required /></Field>
                <Field label="Relationship"><Input value={c.relationship} onChange={(e) => setC({ ...c, relationship: e.target.value })} placeholder="Father, mother, guardian" /></Field>
                <Field label="Given on"><Input type="date" value={c.givenOn} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setC({ ...c, givenOn: e.target.value })} required /></Field>
                <Field label="Note"><Input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="Signed admission form" /></Field>
              </div>
              <div><Button variant="primary" type="submit" loading={busy}>Record consent</Button></div>
            </form>
          )}
        </Card>
        <Card title="Everything held about this student">
          <p className="muted" style={{ marginTop: 0 }}>Downloads one file with the profile, guardians, enrolments, attendance, marks, fees, library records and remarks. Use it when a family asks to see their child's data. Documents and photos are listed by name.</p>
          <Button loading={busy} disabled={p.erased} onClick={() => run(() => download(`/api/school/privacy/students/${studentId}/export`, `student-${p.admissionNo}-data.json`))}>Download data (JSON)</Button>
        </Card>
        <Card title="Erase personal details" action={p.erased ? <Badge tone="grey">Erased</Badge> : null}>
          {p.erased ? <p className="muted" style={{ margin: 0 }}>Already erased.</p> : !p.canErase ? (
            <p className="muted" style={{ margin: 0 }}>Only a student who has left the school can be erased. Withdraw the student first.</p>
          ) : (
            <form className="stack" onSubmit={(e) => e.preventDefault()}>
              <div className="alert">This removes the name, date of birth, contact details, guardians, photo, documents and login of {name}. It cannot be undone. Fee payments, marks and attendance stay, without a name, because the school's accounts and records need them.</div>
              <div className="grid g2">
                <Field label={`Type the admission number (${p.admissionNo})`}><Input value={erase.admissionNo} onChange={(e) => setErase({ ...erase, admissionNo: e.target.value })} autoComplete="off" /></Field>
                <Field label="Why"><Input value={erase.reason} onChange={(e) => setErase({ ...erase, reason: e.target.value })} placeholder="Family asked for deletion" /></Field>
              </div>
              <div><ConfirmButton variant="danger" loading={busy} disabled={!erase.admissionNo || erase.reason.trim().length < 3} message={`Erase ${name}'s personal details for good?`} confirmLabel="Erase"
                onConfirm={async () => { const r = await run(() => post(`/api/school/privacy/students/${studentId}/erase`, { confirmAdmissionNo: erase.admissionNo, reason: erase.reason }), 'Personal details erased'); if (r) { q.reload(); onErased?.(); } }}>Erase personal details</ConfirmButton></div>
            </form>
          )}
        </Card>
      </div>)}</Async>
  );
}
