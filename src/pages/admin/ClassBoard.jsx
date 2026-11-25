import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Archive, BookOpen, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2, Users, X } from 'lucide-react';
import * as m from 'framer-motion/m';
import { post, patch, put, del } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { useAction } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { Avatar, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, FormField, Input, PageHeader, PageSkeleton, Segmented, Select, StatCard, useDialogs } from '../../design/ui';
import { cn } from '../../design/lib/cn';
import { GRADE_NAMES, gradeRank, stageOf, STAGES } from '../../utils/grades.js';

/**
 * Classes and sections: the shape of the school, not two long tables.
 * Classes are listed by stage on the left; the open class shows its sections as cards (class teacher, seats, room).
 * Editing opens a side panel; archive is the normal way to retire something, delete is only for what is empty.
 */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The side panel: one section's name, capacity, room and class teacher (or a new section). */
function SectionPanel({ cls, section, current, choices, yearId, defaultCapacity, onClose, onSaved }) {
  const isNew = !section;
  const [run, busy] = useAction();
  const [name, setName] = useState(section?.name || '');
  const [capacity, setCapacity] = useState(String(section?.capacity || defaultCapacity));
  const [room, setRoom] = useState(section?.room || '');
  const [teacherId, setTeacherId] = useState(current?.id ? String(current.id) : '');
  const [err, setErr] = useState('');
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const valid = name.trim() && Number(capacity) >= 1 && Number(capacity) <= 200;
  const save = async (e) => {
    e.preventDefault(); setErr('');
    if (!valid) { setErr('Give the section a name and a capacity from 1 to 200.'); return; }
    const body = { name: name.trim(), capacity: Number(capacity), room: room.trim() };
    const ok = await run(async () => {
      let id = section?._id;
      if (isNew) id = (await post('/api/school/sections', { ...body, yearId, classId: cls._id }))._id; else await patch(`/api/school/sections/${id}`, body);
      if (teacherId !== (current?.id ? String(current.id) : '')) { if (teacherId) await put(`/api/school/sections/${id}/class-teacher`, { teacherId }); else await del(`/api/school/sections/${id}/class-teacher`); }
      return true;
    }, isNew ? `Section ${name.trim().toUpperCase()} added to ${cls.name}` : 'Saved');
    if (ok !== false) onSaved();
  };
  return createPortal(
    <>
      <button type="button" aria-label="Close panel" onClick={onClose} className="fixed inset-0 z-[55] bg-navy/30 lg:hidden" />
      <m.aside initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }} role="dialog" aria-label={isNew ? `New section in ${cls.name}` : `Edit ${cls.name} section ${section.name}`}
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[420px] flex-col border-l border-border bg-card shadow-lg">
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div><h2 className="text-lg font-semibold tracking-tight">{isNew ? `New section in ${cls.name}` : `${cls.name} · Section ${section.name}`}</h2><p className="text-[13px] text-muted-foreground">{isNew ? 'It appears on the page straight away.' : `${plural(section.studentCount, 'student', 'students')} in this section`}</p></div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}><X /></Button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Section name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="A" maxLength={10} /></FormField>
              <FormField label="Capacity" required hint={section?.studentCount ? `${section.studentCount} already in` : 'Seats for students'}><Input type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></FormField>
            </div>
            <FormField label="Class teacher" hint="A teacher can be class teacher of one section only, so teachers already in charge elsewhere are not listed.">
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">No class teacher yet</option>{choices.map((t) => <option key={t._id} value={t._id}>{t.name}{t.employeeId ? ` (${t.employeeId})` : ''}</option>)}</Select>
            </FormField>
            <FormField label="Default room"><Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="For example R204" maxLength={20} /></FormField>
            {err && <p role="alert" className="text-sm text-danger-ink">{err}</p>}
          </div>
          <div className="flex gap-2 border-t border-border px-5 py-4"><Button type="submit" variant="primary" className="flex-1" disabled={busy}>{isNew ? 'Add section' : 'Save changes'}</Button><Button type="button" onClick={onClose}>Cancel</Button></div>
        </form>
      </m.aside>
    </>,
    document.body,
  );
}

function SectionCard({ s, teacher, onEdit, onAssign, onArchive, onDelete, archived }) {
  const full = s.studentCount >= s.capacity, free = Math.max(0, s.capacity - s.studentCount);
  return (
    <div className={cn('group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md', archived && 'opacity-70')}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-[14px] bg-tone-soft text-xl font-semibold text-tone-ink" aria-hidden>{s.name}</span>
        <div className="min-w-0 flex-1"><p className="font-semibold tracking-tight">Section {s.name}</p><p className="truncate text-[12.5px] text-muted-foreground">{s.room ? `Room ${s.room}` : 'No room set'}{archived ? ' · Archived' : ''}</p></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`More for section ${s.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={onEdit}><Pencil /> Edit section</DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>{archived ? <><RotateCcw /> Restore section</> : <><Archive /> Archive section</>}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger disabled={s.studentCount > 0} onSelect={onDelete}><Trash2 /> {s.studentCount > 0 ? 'Delete (has students)' : 'Delete section'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {teacher ? <div className="flex items-center gap-2.5 text-sm"><Avatar name={teacher.name} size={28} /><span className="min-w-0"><span className="block truncate">{teacher.name}</span><span className="block text-[12px] text-muted-foreground">Class teacher</span></span></div>
        : <div className="flex items-center gap-2"><Badge tone="warning">No class teacher</Badge><Button size="sm" variant="soft" onClick={onAssign}>Assign</Button></div>}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="tabular-nums"><b className="font-semibold">{s.studentCount}</b> / {s.capacity} students</span><span className={full ? 'text-warning-ink' : 'text-muted-foreground'}>{full ? 'Full' : `${free} seats free`}</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-primary')} style={{ width: `${Math.min(100, (s.studentCount / Math.max(1, s.capacity)) * 100)}%` }} /></div>
      </div>
      <div className="mt-auto flex gap-2"><Button asChild size="sm" variant="soft"><Link to={`/admin/classes/${s._id}`}><Users /> Open</Link></Button><Button size="sm" onClick={onEdit}><Pencil /> Edit</Button></div>
    </div>
  );
}

/** Opens a confirmation only after the menu that asked for it has closed, so Escape and focus belong to the dialog and not to the closing menu. */
const later = (fn) => setTimeout(fn, 80);

export function ClassBoard() {
  const L = useLookups();
  const { confirm } = useDialogs();
  const [run] = useAction();
  const yid = L.currentYear?._id;
  const st = useApi(yid ? '/api/school/offerings/structure' : null, { yearId: yid });
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [panel, setPanel] = useState(null); // { sectionId } or { isNew: true }
  const [modal, setModal] = useState(false);
  const reload = () => { L.reload(); st.reload?.(); };

  const sectionsAll = useMemo(() => L.sections.filter((s) => !yid || s.yearId === yid), [L.sections, yid]);
  const teacherOf = useMemo(() => { const mp = new Map(); (st.data?.classes || []).forEach((c) => c.sections.forEach((x) => { if (x.classTeacher) mp.set(String(x.id), x.classTeacher); })); return mp; }, [st.data]);
  const inCharge = useMemo(() => { const mp = new Map(); teacherOf.forEach((t, sid) => mp.set(String(t.id), sid)); return mp; }, [teacherOf]);
  const classes = useMemo(() => [...L.classes].sort((a, b) => gradeRank(a.name) - gradeRank(b.name) || a.name.localeCompare(b.name)), [L.classes]);
  const secsOf = (c) => sectionsAll.filter((s) => s.classId === c._id && (showArchived || s.status === 'active')).sort((a, b) => a.name.localeCompare(b.name));
  const visible = classes.filter((c) => (showArchived || c.status === 'active') && (stage === 'All' || stageOf(c.name) === stage) && (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = visible.find((c) => c._id === sel) || visible[0];
  const available = GRADE_NAMES.filter((n) => !L.classes.some((c) => c.name === n));

  const active = sectionsAll.filter((s) => s.status === 'active' && L.classes.find((c) => c._id === s.classId)?.status === 'active');
  const students = active.reduce((a, s) => a + s.studentCount, 0), seats = active.reduce((a, s) => a + s.capacity, 0);
  const noTeacher = st.data ? active.filter((s) => !teacherOf.has(String(s._id))).length : null;

  if (!L.ready) return <PageSkeleton />;

  const archiveClass = async (c) => {
    const n = secsOf(c).length, t = secsOf(c).reduce((a, s) => a + s.studentCount, 0);
    if (!(await confirm(`${c.name} will be hidden from the daily screens. Its ${plural(n, 'section', 'sections')} and ${plural(t, 'student', 'students')} stay in the school's records, and you can bring it back from "Show archived".`, { title: `Archive ${c.name}?`, confirmLabel: 'Archive class' }))) return;
    await run(() => patch(`/api/school/classes/${c._id}`, { status: 'archived' }), `${c.name} archived`); reload();
  };
  const restoreClass = async (c) => { await run(() => patch(`/api/school/classes/${c._id}`, { status: 'active' }), `${c.name} restored`); reload(); };
  const deleteClass = async (c) => {
    if (!(await confirm(`${c.name} has no sections and no students, so nothing is lost. This cannot be undone.`, { title: `Delete ${c.name}?`, confirmLabel: 'Delete class', danger: true }))) return;
    await run(() => del(`/api/school/classes/${c._id}`), `${c.name} deleted`); reload();
  };
  const archiveSection = async (c, s) => {
    if (s.status === 'archived') { await run(() => patch(`/api/school/sections/${s._id}`, { status: 'active' }), `Section ${s.name} restored`); reload(); return; }
    if (!(await confirm(`${c.name} section ${s.name} disappears from the daily screens. Its ${plural(s.studentCount, 'student', 'students')} keep their history, and attendance and timetable records stay.`, { title: `Archive section ${s.name}?`, confirmLabel: 'Archive section' }))) return;
    await run(() => patch(`/api/school/sections/${s._id}`, { status: 'archived' }), `Section ${s.name} archived`); reload();
  };
  const deleteSection = async (c, s) => {
    if (!(await confirm(`${c.name} section ${s.name} is empty, so nothing is lost. This cannot be undone.`, { title: `Delete section ${s.name}?`, confirmLabel: 'Delete section', danger: true }))) return;
    await run(() => del(`/api/school/sections/${s._id}`), 'Section deleted'); reload();
  };

  const secs = cur ? secsOf(cur) : [];
  const panelSection = panel?.sectionId ? sectionsAll.find((s) => s._id === panel.sectionId) : null;
  const panelClass = panel ? (panelSection ? classes.find((c) => c._id === panelSection.classId) : cur) : null;
  const choices = (sid) => L.teachers.filter((t) => { const other = inCharge.get(String(t._id)); return !other || other === String(sid); });
  const nextLetter = cur ? String.fromCharCode(65 + secs.filter((s) => s.status === 'active').length) : 'A';

  return (
    <div className="space-y-5">
      <PageHeader title="Classes & sections" description={`${plural(active.length, 'section', 'sections')} across ${plural(classes.filter((c) => c.status === 'active').length, 'class', 'classes')} · academic year ${L.currentYear?.name || 'not set yet'}`}
        actions={<><Button onClick={() => setModal(true)} disabled={!available.length}>+ Class</Button><Button variant="primary" onClick={() => cur && setPanel({ isNew: true })} disabled={!cur || !yid}>+ Section</Button></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={students.toLocaleString('en-IN')} />
        <StatCard label="Seats free" value={Math.max(0, seats - students).toLocaleString('en-IN')} hint={`of ${seats.toLocaleString('en-IN')} seats`} />
        <StatCard label="Sections full" value={active.filter((s) => s.studentCount >= s.capacity).length} />
        <StatCard label="Need a class teacher" value={noTeacher == null ? '—' : noTeacher} to={noTeacher ? '/admin/class-structure' : undefined} hint={noTeacher ? 'Assign them on Subjects and teachers' : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden /><Input aria-label="Find a class" placeholder="Find a class" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
        <div className="max-w-full overflow-x-auto"><Segmented label="Stage" value={stage} onChange={setStage} options={['All', ...STAGES].map((x) => ({ value: x, label: x }))} /></div>
        <button type="button" role="switch" aria-checked={showArchived} onClick={() => setShowArchived((v) => !v)} className="inline-flex items-center gap-2.5 rounded-md text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={cn('relative h-[22px] w-9 rounded-full transition-colors', showArchived ? 'bg-primary' : 'bg-border-strong')}><span className={cn('absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white shadow transition-transform', showArchived && 'translate-x-3.5')} /></span>Show archived
        </button>
      </div>

      {!classes.length ? <EmptyState title="No classes yet" description="Add the first class, then give it sections." action={<Button variant="primary" onClick={() => setModal(true)}>Add a class</Button>} />
        : !visible.length ? <EmptyState title="No class matches" description="Clear the search or the stage filter." action={<Button onClick={() => { setQ(''); setStage('All'); }}>Clear filters</Button>} />
        : (
          <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <nav aria-label="Classes" className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-2.5 shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100dvh-9rem)]">
              {STAGES.map((sg) => { const cs = visible.filter((c) => stageOf(c.name) === sg); return cs.length ? (
                <div key={sg}>
                  <h3 className="px-2.5 pb-1.5 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-subtle">{sg}</h3>
                  {cs.map((c) => { const ss = secsOf(c), t = ss.reduce((a, s) => a + s.studentCount, 0), cp = ss.reduce((a, s) => a + s.capacity, 0), pc = cp ? Math.round((t / cp) * 100) : 0; const on = cur && c._id === cur._id; return (
                    <button key={c._id} type="button" onClick={() => setSel(c._id)} aria-current={on ? 'true' : undefined} className={cn('block w-full rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'bg-tone-soft' : 'hover:bg-muted')}>
                      <span className="flex items-center justify-between gap-2"><span className={cn('font-medium', on && 'text-tone-ink')}>{c.name}</span>{c.status === 'archived' ? <Badge>Archived</Badge> : <span className="text-[12.5px] tabular-nums text-muted-foreground">{plural(ss.length, 'section', 'sections')}</span>}</span>
                      <span className="mt-0.5 flex justify-between text-[12.5px] tabular-nums text-muted-foreground"><span>{plural(t, 'student', 'students')}</span><span>{pc}%</span></span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full', pc >= 100 ? 'bg-warning' : 'bg-primary')} style={{ width: `${Math.min(100, pc)}%` }} /></span>
                    </button>
                  ); })}
                </div>
              ) : null; })}
            </nav>

            {cur && (
              <section aria-label={cur.name} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-2xl font-semibold tracking-[-0.03em]">{cur.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><Badge>{stageOf(cur.name)}</Badge><Badge tone={cur.status === 'active' ? 'success' : 'neutral'}>{cur.status === 'active' ? 'Active' : 'Archived'}</Badge></div></div>
                  <div className="flex items-center gap-2">
                    <Button asChild><Link to="/admin/class-structure"><BookOpen /> Subjects and teachers</Link></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" aria-label={`More for ${cur.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {cur.status === 'active' ? <DropdownMenuItem onSelect={() => later(() => archiveClass(cur))}><Archive /> Archive class</DropdownMenuItem> : <DropdownMenuItem onSelect={() => later(() => restoreClass(cur))}><RotateCcw /> Restore class</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem danger disabled={sectionsAll.some((s) => s.classId === cur._id)} onSelect={() => later(() => deleteClass(cur))}><Trash2 /> {sectionsAll.some((s) => s.classId === cur._id) ? 'Delete (it has sections)' : 'Delete class'}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mb-5 grid grid-cols-3 gap-2.5">
                  {[['Sections', secs.filter((s) => s.status === 'active').length], ['Students', `${secs.reduce((a, s) => a + s.studentCount, 0)} of ${secs.reduce((a, s) => a + s.capacity, 0)}`], ['Seats free', Math.max(0, secs.reduce((a, s) => a + s.capacity - s.studentCount, 0))]].map(([k, v]) => <div key={k} className="rounded-2xl bg-muted px-4 py-3"><p className="text-[12.5px] text-muted-foreground">{k}</p><p className="text-xl font-semibold tabular-nums tracking-tight">{v}</p></div>)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {secs.map((s) => <SectionCard key={s._id} s={s} archived={s.status === 'archived'} teacher={teacherOf.get(String(s._id))} onEdit={() => setPanel({ sectionId: s._id })} onAssign={() => setPanel({ sectionId: s._id })} onArchive={() => archiveSection(cur, s)} onDelete={() => deleteSection(cur, s)} />)}
                  {cur.status === 'active' && (
                    <button type="button" onClick={() => setPanel({ isNew: true })} className="grid min-h-[150px] place-items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-border-strong p-4 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Plus className="mx-auto size-6" aria-hidden /><span className="font-medium">{secs.length ? `Add section ${nextLetter}` : 'Add the first section'}</span><span className="text-[12.5px] text-subtle">Capacity {secs[secs.length - 1]?.capacity || 40} by default</span>
                    </button>
                  )}
                </div>
                {!secs.length && cur.status === 'active' && <p className="mt-4 text-sm text-muted-foreground">{cur.name} has no sections this year. Add one to start enrolling students.</p>}
              </section>
            )}
          </div>
        )}

      {panel && panelClass && (
        <SectionPanel key={panel.sectionId || 'new'} cls={panelClass} section={panelSection} current={panelSection ? teacherOf.get(String(panelSection._id)) : null} choices={choices(panelSection?._id)} yearId={yid}
          defaultCapacity={secs[secs.length - 1]?.capacity || 40} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); reload(); }} />
      )}
      {modal && <FormModal title="Add class" submitLabel="Add class" fields={[{ name: 'name', label: 'Class', type: 'select', options: available, required: true, hint: 'LKG, UKG and Class 1 to 12 can be added. For Class 11 and 12 you can add the streams: Medical, Non-Medical, Commerce and Arts, each with its own subjects and date sheet. Promotion follows this order.' }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { const c = await post('/api/school/classes', { name: v.name }); reload(); if (c?._id) setSel(c._id); return true; }} />}
    </div>
  );
}
