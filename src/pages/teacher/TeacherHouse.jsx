import { useApi } from '../../hooks/useApi.js';
import { Async, Card, DataTable, Empty, PageHeader } from '../../components/ui.jsx';

/** The house a teacher belongs to: its mentors and its students (any class), to guide and look after. */
export default function TeacherHouse() {
  const q = useApi('/api/teacher/house');
  return (
    <Async skeleton="datatable" state={q}>{(d) => (d.house
      ? <div className="stack">
        <PageHeader title={`${d.house.name} house`} subtitle={`${d.students.length} students and ${d.teachers.length} mentors${d.house.motto ? ` · “${d.house.motto}”` : ''}. You are one of its mentors: guide and look after its students.`} />
        <div className="grid g2">
          <Card title="Mentors" flush><DataTable rows={d.teachers} rowKey="_id" columns={[{ label: 'Name', render: (t) => <b>{t.name}</b> }, { label: 'Designation', render: (t) => t.designation || '—' }, { label: 'Phone', render: (t) => t.phone || '—' }]} /></Card>
          <Card title="Students in the house" flush><DataTable rows={d.students} rowKey="_id" empty="No students yet" columns={[{ label: 'Name', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => (s.className ? `${s.className} ${s.section}` : '—') }, { label: 'Adm. no', key: 'admissionNo' }]} /></Card>
        </div>
      </div>
      : <div className="stack"><PageHeader title="My house" /><Empty title="You are not in a house yet">The School Admin places each teacher in one of the school's houses to mentor its students.</Empty></div>)}</Async>
  );
}
