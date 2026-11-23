import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, MoreHorizontal, Plus, Search } from 'lucide-react';
import { post, put, patch, del } from '../../api/client.js';
import { Modal, useAction } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { Avatar, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger, Segmented, useDialogs } from '../../design/ui';
import { cn } from '../../design/lib/cn';

/**
 * One class of the "Subjects & teachers" page: a header that opens into a section switcher and a quiet list of subjects.
 * Tap a subject to choose its teacher in a small picker (search, "use for all sections", remove). A second view shows every section at once.
 */

const sectionGaps = (c, s) => (s.classTeacher ? 0 : 1) + c.subjects.filter((sub) => !sub.teachers.find((t) => String(t.sectionId) === String(s.id))?.teacher).length;
const first = (name) => String(name || '').split(' ')[0];

/** The teacher chooser: a search box, the teachers with their weekly load, and (for a subject) a switch to set every section at once. */
function TeacherPicker({ trigger, title, subtitle, teachers, currentId, loads, hint, canAll, onPick, onRemove, currentName }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(''); const [all, setAll] = useState(false); const [sure, setSure] = useState(false);
  const change = (o) => { setOpen(o); if (!o) { setQ(''); setAll(false); setSure(false); } };
  const needle = q.trim().toLowerCase();
  const list = teachers.filter((t) => !needle || t.name.toLowerCase().includes(needle) || String(t.employeeId || '').toLowerCase().includes(needle));
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[330px] rounded-2xl p-0">
        <div className="px-4 pb-2 pt-3.5">
          <div className="text-xs text-muted-foreground">{subtitle}</div>
          <div className="text-[15px] font-semibold">{title}</div>
          <label className="relative mt-2.5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
            <input aria-label="Search teachers" placeholder="Search teachers" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-9 w-full rounded-full border-0 bg-muted pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          {hint && <p className="mb-0 mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ul className="m-0 max-h-64 list-none overflow-auto px-2 pb-2">
          {list.map((t) => {
            const n = loads.get(String(t._id)) || 0;
            return (
              <li key={t._id}>
                <button type="button" onClick={async () => { change(false); await onPick(t._id, all, t.name); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <Avatar name={t.name} size={28} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className={cn('text-xs tabular-nums', n >= 30 ? 'text-warning-ink' : 'text-muted-foreground')}>{n} periods</span>
                  <span className="grid w-4 place-items-center text-primary-ink">{String(t._id) === String(currentId) && <Check className="size-3.5" aria-label="Current teacher" />}</span>
                </button>
              </li>
            );
          })}
          {!list.length && <li className="px-2 py-3 text-sm text-muted-foreground">{teachers.length ? 'No teacher found.' : 'No teacher can be chosen here.'}</li>}
        </ul>
        {(canAll || (currentId && onRemove)) && (
          <div className="flex flex-col border-t border-border p-1.5">
            {canAll && (
              <button type="button" role="switch" aria-checked={all} onClick={() => setAll((x) => !x)} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm hover:bg-muted">
                <span>Use for all sections</span>
                <span className={cn('relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors', all ? 'bg-success' : 'bg-border-strong/40')}>
                  <span className={cn('absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none', all && 'translate-x-4')} />
                </span>
              </button>
            )}
            {currentId && onRemove && (
              <button type="button" onClick={async () => { if (!sure) { setSure(true); return; } change(false); await onRemove(); }}
                className="rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-danger-ink hover:bg-muted">
                {sure ? `Remove ${currentName}? Click again to confirm` : 'Remove teacher'}
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Large section tiles with a highlight that slides to the chosen one. */
function SectionStrip({ sections, value, onChange, openOf, label }) {
  const wrap = useRef(null);
  const [box, setBox] = useState(null); const [ready, setReady] = useState(false);
  const measure = useCallback(() => {
    const el = wrap.current?.querySelector('[aria-selected="true"]');
    if (el) setBox({ w: el.offsetWidth, x: el.offsetLeft });
  }, []);
  useLayoutEffect(() => { measure(); }, [measure, value, sections.length]);
  useEffect(() => { const r = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure); ro.observe(wrap.current); return () => ro.disconnect();
  }, [measure]);
  const move = (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
    e.preventDefault();
    const i = sections.findIndex((s) => s.id === value);
    const next = sections[(i + d + sections.length) % sections.length];
    onChange(next.id);
    requestAnimationFrame(() => wrap.current?.querySelector('[aria-selected="true"]')?.focus());
  };
  return (
    <div ref={wrap} role="tablist" aria-label={label} onKeyDown={move}
      className="relative inline-grid max-w-full overflow-x-auto rounded-2xl bg-muted p-1 [scrollbar-width:none]" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(72px, 112px))` }}>
      {box && <span aria-hidden className={cn('absolute bottom-1 top-1 left-0 rounded-[14px] bg-card shadow-sm ring-1 ring-border/60', ready && 'transition-[transform,width] duration-300 ease-out motion-reduce:transition-none')} style={{ width: box.w, transform: `translateX(${box.x}px)` }} />}
      {sections.map((s) => {
        const n = openOf(s); const on = s.id === value;
        return (
          <button key={s.id} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(s.id)} aria-label={`Section ${s.name}, ${n ? `${n} open` : 'complete'}`}
            className="relative z-10 flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-[14px] px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={cn('text-xl font-semibold leading-none tracking-tight transition-colors', on ? 'text-primary-ink' : 'text-foreground')}>{s.name}</span>
            <span className={cn('inline-flex items-center gap-1 text-xs leading-none', n ? 'font-medium text-warning-ink' : 'text-muted-foreground')}>{n ? `${n} open` : <><Check className="size-3 text-success-ink" aria-hidden />Done</>}</span>
          </button>
        );
      })}
    </div>
  );
}

const TeacherValue = ({ name, compact }) => (name
  ? <span className="flex min-w-0 items-center gap-2.5"><Avatar name={name} size={compact ? 24 : 28} /><span className="truncate">{compact ? first(name) : name}</span></span>
  : <span className="flex min-w-0 items-center gap-2.5 font-medium text-primary-ink"><span className="grid size-6 place-items-center rounded-full border-[1.5px] border-dashed border-warning-ink text-warning-ink"><Plus className="size-3" aria-hidden /></span><span className="truncate">{compact ? 'Add' : 'Choose teacher'}</span></span>);

export function ClassPanel({ c, year, open, onToggle, onChange, teachers, loads, subjects, goSubjects, visible, inCharge }) {
  const [run] = useAction();
  const { confirm } = useDialogs();
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('section');
  const many = c.sections.length > 1; // one section: no switcher needed
  const closed = year.status === 'closed';
  const gaps = c.gaps.noClassTeacher.length + c.gaps.noTeacher.reduce((a, x) => a + x.sections.length, 0);
  const [secId, setSecId] = useState(() => (c.sections.find((s) => sectionGaps(c, s)) || c.sections[0])?.id);
  const sec = c.sections.find((s) => s.id === secId) || c.sections[0];
  const rows = c.subjects.filter((sub) => !visible || visible.has(sub.offeringId));
  const sectionIds = c.sections.map((s) => s.id);
  const teacherIn = (sub, s) => sub.teachers.find((t) => String(t.sectionId) === String(s.id));
  const label = (sub, s) => `${sub.subject} in ${c.className} ${s.name}`;

  const assign = async (sub, ids, teacherId, name) => {
    await run(async () => {
      for (const id of ids) {
        const t = sub.teachers.find((x) => String(x.sectionId) === String(id));
        if (t?.teacherId && String(t.teacherId) === String(teacherId)) continue;
        if (t?.assignmentId) await post(`/api/school/teaching-assignments/${t.assignmentId}/end`, {});
        await post('/api/school/teaching-assignments', { teacherId, sectionId: id, subjectId: sub.subjectId });
      }
    }, ids.length > 1 ? `${name} set for all sections` : `${name} assigned`);
    onChange();
  };
  const unassign = async (t) => { await run(() => post(`/api/school/teaching-assignments/${t.assignmentId}/end`, {}), 'Teacher removed'); onChange(); };
  const setClassTeacher = async (s, teacherId, name) => { await run(() => put(`/api/school/sections/${s.id}/class-teacher`, { teacherId }), `${name} is now class teacher`); onChange(); };
  const clearClassTeacher = async (s) => { await run(() => del(`/api/school/sections/${s.id}/class-teacher`), 'Class teacher removed'); onChange(); };
  const classTeacherChoices = (s) => teachers.filter((t) => { const other = inCharge.get(String(t._id)); return !other || other === s.id; });
  const CT_HINT = 'Teachers who are already in charge of another class are not listed: a teacher can be in charge of one class at a time.';

  /** The button that opens the picker for one subject in one section; `compact` is the cell of the whole-class table. */
  const subjectPicker = (sub, s, trigger) => {
    const t = teacherIn(sub, s);
    return (
      <TeacherPicker trigger={trigger} title={sub.subject} subtitle={`${c.className}, Section ${s.name}`} teachers={teachers} loads={loads} currentId={t?.teacherId} currentName={t?.teacher} canAll={c.sections.length > 1}
        onPick={(teacherId, all, name) => assign(sub, all ? sectionIds : [s.id], teacherId, name)} onRemove={t?.assignmentId ? () => unassign(t) : undefined} />
    );
  };
  const classTeacherPicker = (s, trigger) => (
    <TeacherPicker trigger={trigger} title="Class teacher" subtitle={`${c.className}, Section ${s.name}`} teachers={classTeacherChoices(s)} loads={loads} currentId={s.classTeacher?.id} currentName={s.classTeacher?.name} hint={CT_HINT}
      onPick={(teacherId, _all, name) => setClassTeacher(s, teacherId, name)} onRemove={s.classTeacher ? () => clearClassTeacher(s) : undefined} />
  );
  const ctLabel = (s) => `${s.classTeacher ? 'Change' : 'Assign'} class teacher of ${c.className} ${s.name}`;

  const status = c.gaps.noSubjects ? <Badge tone="warning" dot>No subjects yet</Badge> : gaps > 0 ? <Badge tone="warning" dot>{gaps} to assign</Badge> : <Badge tone="success">All set</Badge>;
  const addSubject = !closed && <Button size="sm" variant="soft" onClick={() => setModal('subject')}><Plus />Add subject</Button>;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs" aria-label={c.className}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
        {open ? <ChevronDown className="size-4 shrink-0 text-subtle" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />}
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold tracking-tight">{c.className}</span>
          <span className="block text-sm text-muted-foreground">{c.sections.length} {c.sections.length === 1 ? 'section' : 'sections'} · {c.subjects.length} {c.subjects.length === 1 ? 'subject' : 'subjects'}</span>
        </span>
        {status}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 pb-5 pt-4 sm:px-5">
          {many && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {view === 'section' ? <SectionStrip sections={c.sections} value={sec.id} onChange={setSecId} openOf={(s) => sectionGaps(c, s)} label={`Sections of ${c.className}`} /> : <span />}
              <Segmented label={`View of ${c.className}`} value={view} onChange={setView} options={[{ value: 'section', label: 'By section' }, { value: 'all', label: 'Whole class' }]} />
            </div>
          )}

          {!sec && <p className="m-0 text-sm text-muted-foreground">This class has no sections yet.</p>}

          {sec && (view === 'section' || !many) && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/70 px-5 py-4">
                <div>
                  <h3 className="m-0 text-lg font-semibold tracking-tight">{c.className}, Section {sec.name}</h3>
                  <p className={cn('m-0 mt-1 flex items-center gap-1.5 text-sm', sectionGaps(c, sec) ? 'text-warning-ink' : 'text-muted-foreground')}>
                    {sectionGaps(c, sec) ? `${sectionGaps(c, sec)} ${sectionGaps(c, sec) === 1 ? 'thing needs' : 'things need'} a teacher` : <><Check className="size-3.5 text-success-ink" aria-hidden />Every subject has a teacher</>}
                  </p>
                </div>
                {closed
                  ? <div className="flex items-center gap-2.5 text-sm"><span className="text-muted-foreground">Class teacher</span><b className="font-medium">{sec.classTeacher?.name || 'None'}</b></div>
                  : classTeacherPicker(sec, (
                    <button type="button" aria-label={ctLabel(sec)} className={cn('flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 text-left hover:brightness-95', sec.classTeacher ? 'bg-card shadow-xs' : 'bg-warning-soft')}>
                      {sec.classTeacher ? <Avatar name={sec.classTeacher.name} size={44} /> : <span className="grid size-11 place-items-center rounded-full border-[1.5px] border-dashed border-warning-ink text-warning-ink"><Plus className="size-4" aria-hidden /></span>}
                      <span className="flex flex-col leading-tight"><small className={cn('text-xs', sec.classTeacher ? 'text-muted-foreground' : 'text-warning-ink')}>Class teacher</small><b className={cn('text-sm font-medium', !sec.classTeacher && 'text-warning-ink')}>{sec.classTeacher?.name || 'Choose teacher'}</b></span>
                    </button>))}
              </div>

              {rows.length > 0 && (
                <ul className="m-0 list-none overflow-hidden rounded-2xl border border-border/70 p-0">
                  {rows.map((sub, i) => {
                    const t = teacherIn(sub, sec);
                    const body = (
                      <>
                        <span className="min-w-0 sm:flex-1"><span className="block text-[15px] font-medium">{sub.subject} <span className="text-xs font-normal text-muted-foreground">{sub.code}</span></span><span className="block text-sm text-muted-foreground">{sub.weeklyPeriods} periods a week</span></span>
                        <TeacherValue name={t?.teacher} />
                      </>);
                    return (
                      <li key={sub.offeringId} className={cn('flex items-center gap-1 pr-2', i > 0 && 'border-t border-border/70')}>
                        {closed
                          ? <div className="flex min-h-16 flex-1 flex-col items-start gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">{body}</div>
                          : subjectPicker(sub, sec, (
                            <button type="button" aria-label={`${t?.teacher ? 'Change' : 'Assign'} teacher of ${label(sub, sec)}`} className="flex min-h-16 min-w-0 flex-1 flex-col items-start justify-center gap-1.5 px-5 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4">
                              {body}<ChevronRight className="hidden size-4 shrink-0 text-subtle sm:block" aria-hidden />
                            </button>))}
                        {!closed && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`More for ${sub.subject}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setModal({ periods: sub })}>Edit periods</DropdownMenuItem>
                              <DropdownMenuItem danger onSelect={async () => { if (await confirm(`Remove ${sub.subject} from ${c.className}?`, { danger: true, confirmLabel: 'Remove subject', title: 'Remove subject' })) { await run(() => del(`/api/school/offerings/${sub.offeringId}`), 'Subject removed'); onChange(); } }}>Remove subject</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!c.subjects.length && <p className="m-0 rounded-2xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">This class has no subjects yet. Add the ones it studies this year.</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted-foreground"><span>The class teacher takes the daily attendance.</span>{addSubject}</div>
            </div>
          )}

          {sec && many && view === 'all' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead><tr className="bg-muted/60 text-left text-xs font-semibold text-muted-foreground"><th className="px-5 py-3">Subject</th>{c.sections.map((s) => <th key={s.id} className="px-2 py-3">Section {s.name}</th>)}</tr></thead>
                  <tbody>
                    <tr className="border-t border-border/70">
                      <th scope="row" className="px-5 py-2 text-left font-medium text-muted-foreground">Class teacher</th>
                      {c.sections.map((s) => (
                        <td key={s.id} className="px-1 py-1">
                          {closed ? <span className="px-2">{first(s.classTeacher?.name) || 'None'}</span> : classTeacherPicker(s, (
                            <button type="button" aria-label={ctLabel(s)} title={s.classTeacher?.name || 'No class teacher'} className="flex w-full min-w-0 items-center rounded-xl px-2 py-1.5 text-left hover:bg-muted"><TeacherValue name={s.classTeacher?.name} compact /></button>))}
                        </td>))}
                    </tr>
                    {rows.map((sub) => (
                      <tr key={sub.offeringId} className="border-t border-border/70">
                        <th scope="row" className="px-5 py-2 text-left font-medium">{sub.subject}<span className="block text-xs font-normal text-muted-foreground">{sub.weeklyPeriods} periods a week</span></th>
                        {c.sections.map((s) => {
                          const t = teacherIn(sub, s);
                          return (
                            <td key={s.id} className="px-1 py-1">
                              {closed ? <span className="px-2">{first(t?.teacher) || 'None'}</span> : subjectPicker(sub, s, (
                                <button type="button" aria-label={`${t?.teacher ? 'Change' : 'Assign'} teacher of ${label(sub, s)}`} title={t?.teacher || 'No teacher yet'}
                                  className="flex w-full min-w-0 items-center rounded-xl px-2 py-1.5 text-left hover:bg-muted"><TeacherValue name={t?.teacher} compact /></button>))}
                            </td>);
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted-foreground"><span>Names are shortened to the first name. Hover one to see the full name.</span>{addSubject}</div>
            </div>
          )}
        </div>
      )}

      {modal === 'subject' && (() => {
        const have = new Set(c.subjects.map((x) => String(x.subjectId)));
        const choices = subjects.filter((x) => x.status === 'active' && !have.has(String(x._id))).map((x) => ({ value: x._id, label: x.name }));
        return choices.length
          ? <FormModal title={`Add a subject to ${c.className}`} fields={[{ name: 'subjectId', label: 'Subject', type: 'select', options: choices, required: true, hint: 'Pick from the school\'s subjects. A subject that is not listed is added on the Subjects tab.' }, { name: 'weeklyPeriods', label: 'Periods per week', type: 'number', min: 1, default: 5 }]}
            onClose={() => setModal(null)} onSubmit={async (v) => { await post('/api/school/offerings', { yearId: year.id, classId: c.classId, subjectId: v.subjectId, weeklyPeriods: Number(v.weeklyPeriods) || 5 }); onChange(); return true; }} />
          : <Modal title={`Add a subject to ${c.className}`} onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Close</Button><Button variant="primary" onClick={() => { setModal(null); goSubjects(); }}>Go to Subjects</Button></>}>
            <p style={{ margin: 0 }}>{subjects.length ? `${c.className} already has every subject the school has listed.` : 'The school has no subjects yet.'} Add the subject on the Subjects tab first, then come back and choose it here.</p>
          </Modal>;
      })()}
      {modal?.periods && <FormModal title={`Periods per week · ${modal.periods.subject} · ${c.className}`} initial={{ weeklyPeriods: modal.periods.weeklyPeriods }} fields={[{ name: 'weeklyPeriods', label: 'Periods per week', type: 'number', min: 1, required: true }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await patch(`/api/school/offerings/${modal.periods.offeringId}`, { weeklyPeriods: Number(v.weeklyPeriods) }); onChange(); return true; }} />}
    </section>
  );
}
