import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Avatar } from '../../components/FileImage.jsx';
import { Async, Badge, Button, Card, DataTable, PageHeader, Tabs, fmtDate, label, statusTone } from '../../components/ui.jsx';
import { SummaryStrip, AttendancePanel, ExamsPanel, HomeworkPanel, FeesPanel, LibraryPanel, BusCard } from '../../components/StudentOverview.jsx';
import { OfficeProvider, CLASS_OFFICE } from '../../context/ClassOffice.jsx';

/**
 * A student of the class teacher's own class, as the school office sees them: the profile and family, attendance, every exam and subject, homework, fees,
 * library and bus. Read-only. (Remarks, contact details and messages to the family stay on the teacher's own student page, linked at the top.)
 */
export default function ClassStudent() {
  return <OfficeProvider value={CLASS_OFFICE}><File /></OfficeProvider>;
}

function File() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'profile';
  const api = CLASS_OFFICE.api;
  const s = useApi(`${api}/students/${id}`);
  const ov = useApi(`${api}/students/${id}/overview`);
  const [open, setOpen] = useState(false);
  return (
    <Async state={s}>{(st) => {
      const active = (st.enrolments || []).find((e) => e.status === 'active');
      return (
        <div className="stack">
          <div className="row" style={{ gap: 12, alignItems: 'center' }}><Link className="btn sm" to="/teacher/my-class?tab=students">← My class</Link></div>
          <div className="row"><Avatar fileId={st.photoFileId} name={st.name} size={72} /></div>
          <PageHeader title={st.name} subtitle={`Admission no ${st.admissionNo} · ${active ? `${active.className} ${active.section}, roll ${active.rollNo}` : 'No active enrolment'}`}
            actions={<Link className="btn primary" to={`/teacher/students/${id}`}>Remarks, contact details and message the family</Link>} />
          <Async state={ov}>{(o) => <SummaryStrip o={o} />}</Async>
          <Tabs tabs={[['profile', 'Profile'], ['attendance', 'Attendance'], ['exams', 'Exams & marks'], ['homework', 'Homework'], ['fees', 'Fees'], ['library', 'Library'], ['transport', 'Bus'], ['history', 'Enrolment history']]} value={tab} onChange={(t) => setSp({ tab: t })} />
          {['attendance', 'exams', 'homework', 'fees', 'library', 'transport'].includes(tab) && <Async state={ov}>{(o) => (
            tab === 'attendance' ? <AttendancePanel o={o} /> : tab === 'exams' ? <ExamsPanel o={o} /> : tab === 'homework' ? <HomeworkPanel o={o} /> : tab === 'fees' ? <FeesPanel studentId={id} /> : tab === 'library' ? <LibraryPanel o={o} /> : <BusCard bus={o.bus} />)}</Async>}
          {tab === 'profile' && (
            <div className="grid g2">
              <Card title="Personal"><dl className="kv">
                <dt>Date of birth</dt><dd>{st.dob ? fmtDate(st.dob, true) : '—'}</dd><dt>Gender</dt><dd>{label(st.gender) || '—'}</dd><dt>Phone</dt><dd>{st.phone || '—'}</dd><dt>Email</dt><dd>{st.email || '—'}</dd>
                <dt>Address</dt><dd>{st.address || '—'}</dd><dt>House</dt><dd>{st.house || '—'}</dd><dt>Blood group</dt><dd>{st.bloodGroup || '—'}</dd><dt>Admitted on</dt><dd>{st.admissionDate ? fmtDate(st.admissionDate, true) : '—'}</dd>
                <dt>Status</dt><dd><Badge tone={statusTone(st.status)}>{label(st.status)}</Badge></dd></dl></Card>
              <Card title="Family">
                {(st.guardians || []).map((g, i) => <div key={i} className="stack-sm" style={{ marginBottom: 8 }}><b>{g.name}</b> <span className="muted">({g.relationship})</span><div className="small">{[g.phone, g.email, g.occupation].filter(Boolean).join(' · ') || '—'}</div></div>)}
                {!(st.guardians || []).length && <span className="muted">No guardian on record</span>}
                {st.emergencyContact?.name && <><hr style={{ border: 0, borderTop: '1px solid var(--border)' }} /><dl className="kv"><dt>Emergency contact</dt><dd>{st.emergencyContact.name}{st.emergencyContact.phone ? ` · ${st.emergencyContact.phone}` : ''}</dd></dl></>}
              </Card>
            </div>)}
          {tab === 'history' && (
            <div className="stack">
              <Card title="Academic enrolments" flush><DataTable rows={st.enrolments} rowKey="_id" empty="No enrolments" columns={[{ label: 'Year', key: 'year' }, { label: 'Class', key: 'className' }, { label: 'Section', key: 'section' }, { label: 'Roll', key: 'rollNo' }, { label: 'From', render: (e) => fmtDate(e.startDate, true) }, { label: 'To', render: (e) => (e.endDate ? fmtDate(e.endDate, true) : '—') }, { label: 'Status', render: (e) => <Badge tone={statusTone(e.status)}>{label(e.status)}</Badge> }]} /></Card>
              <Card title="Section transfers" flush><DataTable rows={st.transfers || []} empty="No transfers" columns={[{ label: 'Effective', render: (t) => fmtDate(t.effectiveDate, true) }, { label: 'From', key: 'fromSection' }, { label: 'To', key: 'toSection' }, { label: 'Reason', key: 'reason' }]} /></Card>
            </div>)}
          <p className="muted small">This is the school office's own view of your class, so it is read-only. {open ? '' : <Button size="sm" onClick={() => setOpen(true)}>Why can't I change things here?</Button>}{open && 'Admission details, fees, moving a student and similar changes are made by the school office. You keep the register, monitors, marks, remarks and contact details.'}</p>
        </div>
      );
    }}</Async>
  );
}
