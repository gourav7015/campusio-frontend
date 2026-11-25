import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useGet } from '../../api/query';
import { Button, Card, CardHeader, CardTitle } from '../../design/ui';
import RegisterEditor from '../../components/Register.jsx';

interface Cls { sectionId: string; className: string; section: string; isClassTeacher?: boolean }

/** The class teacher's register for today, right on the home page: open it, mark, submit. (Only the class teacher takes a section's daily register.) */
export function TodayRegister({ date }: { date: string }) {
  const { data } = useGet<Cls[]>('/api/teacher/classes');
  const mine = (data ?? []).filter((c) => c.isClassTeacher);
  const [open, setOpen] = useState(false);
  const [sid, setSid] = useState('');
  if (!mine.length) return null;
  const cur = mine.find((c) => c.sectionId === sid) ?? mine[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today’s register · {cur.className} {cur.section}</CardTitle>
        <div className="flex items-center gap-2">
          {mine.length > 1 && <select aria-label="Your class" value={cur.sectionId} onChange={(e) => setSid(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2 text-sm">{mine.map((c) => <option key={c.sectionId} value={c.sectionId}>{c.className} {c.section}</option>)}</select>}
          <Button size="sm" variant={open ? undefined : 'primary'} onClick={() => setOpen((o) => !o)} aria-expanded={open}><ClipboardCheck aria-hidden />{open ? 'Close' : 'Take attendance'}</Button>
        </div>
      </CardHeader>
      {open && <div className="p-5"><RegisterEditor key={cur.sectionId} base="/api/teacher" sectionId={cur.sectionId} date={date} onChange={() => undefined} /></div>}
    </Card>
  );
}
