import { useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Button, Input, Modal } from './ui.jsx';
import { STATUSES, STATUS_NAME, SESSION_NAME, StatusControl, Icon, statusText } from './attendanceUi.jsx';

/**
 * The one attendance register every screen uses (students, teachers, office staff, transport crew, period attendance), so taking
 * attendance looks and behaves the same everywhere: a count and bar on top, filter chips, "Mark all present / Mark all absent",
 * a row per person with the status buttons (a single status pill that opens a sheet on a phone), an undo, and a review before submit.
 *
 * It only shows and edits what it is given. The screen that uses it still loads, saves and submits, and keeps its own rules.
 *   people: [{ id, roll?, name, sub?, status, halfSession?, remark?, badges? }]   (status '' or null = not marked yet)
 *   onSet(changes): changes = [{ id, status, halfSession }]
 */
const norm = (s) => (s === 'excused' ? 'leave' : s || '');
const CHIP_NAME = { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half day', leave: 'On leave' };
const BAR = [['present', 'p'], ['late', 'l'], ['half_day', 'h'], ['leave', 'v'], ['absent', 'a']];

export function countsOf(people) {
  const t = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, unmarked: 0 };
  for (const p of people) { const s = norm(p.status); if (s) t[s] += 1; else t.unmarked += 1; }
  t.here = t.present + t.late + t.half_day;
  t.notHere = t.absent + t.late + t.half_day + t.leave;
  return t;
}

/** A status as an icon plus a word. Used on locked rows and in the review. */
export function StatusPill({ status, halfSession }) {
  const s = norm(status);
  return <span className={`ar-pill static ${s || 'none'}`}>{s ? <Icon st={s} /> : null}{statusText(s, halfSession)}</span>;
}

export default function AttendanceRoster({
  people, editable, onSet, onRemark, onMarkAll, statuses = STATUSES, requireAll = false, noun = 'student', nounPlural,
  searchLabel = 'Search student', searchPlaceholder = 'Search name or roll number', match, nameHead = 'Student',
  toolbar, footer, renderExtra, extraHead, rowAction, emptyText, hideRoll, remarkLabel = (p) => `Remark for ${p.name}`,
}) {
  const plural = nounPlural || `${noun}s`;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [undo, setUndo] = useState([]);
  const [sheet, setSheet] = useState(null);
  const t = useMemo(() => countsOf(people), [people]);
  const total = people.length;
  const hasRoll = !hideRoll && people.some((p) => p.roll != null && p.roll !== '');
  const test = match || ((p, text) => `${p.name} ${p.roll ?? ''} ${p.code ?? ''}`.toLowerCase().includes(text));
  const needle = q.trim().toLowerCase();
  const passes = (p) => {
    const s = norm(p.status);
    const ok = filter === 'all' || (filter === 'unmarked' ? !s : filter === 'notHere' ? !!s && s !== 'present' : s === filter);
    return ok && (!needle || test(p, needle));
  };
  const shown = people.filter(passes);
  const filtered = !!needle || filter !== 'all';

  const push = (items) => setUndo((u) => [...u.slice(-19), items]);
  const snapshot = (list) => list.map((p) => ({ id: p.id, status: p.status || '', halfSession: p.halfSession || null }));
  const choose = (p, status, halfSession = null) => { push(snapshot([p])); onSet([{ id: p.id, status, halfSession: status === 'half_day' ? halfSession || 'first' : null }]); };
  const bulk = (status) => {
    push(snapshot(people));
    if (onMarkAll) onMarkAll(status, { shown: shown.length, filtered }); else onSet(people.map((p) => ({ id: p.id, status, halfSession: null })));
  };
  const markRest = () => { const rest = people.filter((p) => !norm(p.status)); push(snapshot(rest)); onSet(rest.map((p) => ({ id: p.id, status: 'present', halfSession: null }))); };
  const doUndo = () => { const last = undo[undo.length - 1]; if (!last) return; setUndo(undo.slice(0, -1)); onSet(last); };

  const chips = [['all', 'All', total], ...(requireAll ? [['unmarked', 'Unmarked', t.unmarked]] : []), ['notHere', 'Not here', t.notHere], ...statuses.map((s) => [s, CHIP_NAME[s], t[s]])];
  const headline = requireAll ? { big: total - t.unmarked, of: `of ${total} marked` } : { big: t.here, of: `of ${total} here` };
  const sp = sheet ? people.find((p) => p.id === sheet) : null;

  return (
    <div className="ar">
      <div className="ar-sum">
        <div className="ar-big tn">{headline.big} <small>{headline.of}</small></div>
        <div className="ar-bar" aria-hidden="true">{BAR.map(([k, c]) => <i key={k} className={c} style={{ width: `${total ? (t[k] / total) * 100 : 0}%` }} />)}</div>
        <div className="ar-chips" role="group" aria-label="Show">{chips.map(([k, l, n]) => <button key={k} type="button" className={`ar-chip ${filter === k ? 'on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l} <span className="n">{n}</span></button>)}</div>
      </div>

      <div className="ar-tools">
        <div className="ar-search"><Input type="search" aria-label={searchLabel} placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {toolbar}
        {editable && <>
          <Button variant="primary" onClick={() => bulk('present')}>Mark all present</Button>
          <Button onClick={() => bulk('absent')}>Mark all absent</Button>
          {requireAll && t.unmarked > 0 && t.unmarked < total && <Button onClick={markRest}>Mark {t.unmarked} unmarked as present</Button>}
          <Button onClick={doUndo} disabled={!undo.length} aria-label="Undo the last change"><Undo2 size={16} aria-hidden />Undo</Button>
        </>}
        <span className="muted small ar-count" aria-live="polite">Showing {shown.length} of {total}</span>
      </div>

      {editable && requireAll && t.unmarked > 0 && <div className="ar-warn">{t.unmarked} {t.unmarked === 1 ? noun : plural} not marked yet. Not marked is not the same as present, so it blocks submitting.</div>}

      <div className="ar-table" role="table" aria-label="Register">
        <div className={`ar-head ar-r ${hasRoll ? '' : 'nr'} ${renderExtra ? 'hx' : ''}`} role="row">
          {hasRoll && <span role="columnheader" className="ar-roll">Roll</span>}
          <span role="columnheader" className="ar-who">{nameHead}</span>
          <span role="columnheader" className="ar-ctl">Status</span>
          {renderExtra && <span role="columnheader" className="ar-ext">{extraHead || 'Times'}</span>}
          <span role="columnheader" className="ar-rem">Remark</span>
        </div>
        {!shown.length && <div className="ar-empty muted">{emptyText || (filtered ? 'No one matches' : `No ${plural} yet`)}</div>}
        {shown.map((p) => {
          const s = norm(p.status);
          return (
            <div key={p.id} role="row" className={`ar-r ${hasRoll ? '' : 'nr'} ${renderExtra ? 'hx' : ''} ${editable && !s && requireAll ? 'unm' : ''}`}>
              {hasRoll && <span role="cell" className="ar-roll tn">{p.roll != null && p.roll !== '' ? String(p.roll).padStart(2, '0') : ''}</span>}
              <span role="cell" className="ar-who"><b>{p.name}</b> {p.badges}{p.sub && <span className="small muted ar-sub">{p.sub}</span>}</span>
              <span role="cell" className={`ar-ctl ${editable ? '' : 'locked'}`}>{editable
                ? <StatusControl name={p.name} status={s} halfSession={p.halfSession} statuses={statuses} onChange={(st, hs) => choose(p, st, hs)} />
                : <span className="row" style={{ gap: 8 }}><StatusPill status={s} halfSession={p.halfSession} />{rowAction?.(p)}</span>}</span>
              {renderExtra && <span role="cell" className="ar-ext">{renderExtra(p)}</span>}
              <span role="cell" className="ar-rem">{editable && onRemark
                ? <Input value={p.remark || ''} placeholder="Remark" aria-label={remarkLabel(p)} onChange={(e) => onRemark(p.id, e.target.value)} />
                : <span className="muted small">{p.remark}</span>}</span>
              {editable && <span role="cell" className="ar-pillcell"><button type="button" className={`ar-pill ${s || 'none'}`} aria-haspopup="dialog" aria-label={`${p.name}: ${statusText(s, p.halfSession)}. Change`} onClick={() => setSheet(p.id)}>{s ? <Icon st={s} /> : null}{statusText(s, p.halfSession)}</button></span>}
            </div>
          );
        })}
      </div>

      {footer && <div className="ar-actions">{footer}</div>}

      {sp && (
        <Modal title={`${hasRoll && sp.roll != null ? `${String(sp.roll).padStart(2, '0')} · ` : ''}${sp.name}`} onClose={() => setSheet(null)} footer={<Button variant="primary" onClick={() => setSheet(null)}>Done</Button>}>
          <div className="stack">
            <div className="muted small">Mark as</div>
            <div className="ar-opts" role="group" aria-label={`Mark ${sp.name} as`}>{statuses.map((st) => { const on = norm(sp.status) === st; return <button key={st} type="button" className={`ar-opt ${st} ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => choose(sp, st, sp.halfSession)}><Icon st={st} size={18} />{STATUS_NAME[st]}</button>; })}</div>
            {norm(sp.status) === 'half_day' && <div className="status-seg" role="group" aria-label={`Session attended by ${sp.name}`} style={{ alignSelf: 'flex-start' }}>{['first', 'second'].map((x) => <button key={x} type="button" className={(sp.halfSession || 'first') === x ? 'on half_day' : ''} aria-pressed={(sp.halfSession || 'first') === x} onClick={() => choose(sp, 'half_day', x)}>{SESSION_NAME[x]}</button>)}</div>}
            {renderExtra && <div className="row wrap" style={{ gap: 10 }}>{renderExtra(sp)}</div>}
            {onRemark && <Input value={sp.remark || ''} placeholder="Remark (optional)" aria-label={`Remark for ${sp.name} (sheet)`} onChange={(e) => onRemark(sp.id, e.target.value)} />}
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * The step before submitting, the same for every register: the counts, who is not here and why, a warning for anyone not marked,
 * and one clear Submit. `unmarkedBlocks` (students) stops the submit until everyone is marked.
 */
export function ReviewSubmit({ people, requireAll, submitLabel, busy, onClose, onSubmit, onMarkRest, note, title = 'Review before submitting' }) {
  const t = countsOf(people);
  const away = people.filter((p) => { const s = norm(p.status); return s && s !== 'present'; });
  const blocked = requireAll && t.unmarked > 0;
  return (
    <Modal title={title} onClose={onClose} footer={<><Button onClick={onClose}>Back to the register</Button><Button variant="primary" loading={busy} disabled={blocked} onClick={onSubmit}>{submitLabel}</Button></>}>
      <div className="stack">
        <div><b className="tn">{t.here}</b> here · <b className="tn">{t.notHere}</b> not here{requireAll ? <> · <b className="tn">{t.unmarked}</b> not marked</> : null}</div>
        {blocked && <div className="ar-warn">{t.unmarked} not marked. Mark them before you submit.<div style={{ marginTop: 8 }}><Button size="sm" variant="primary" onClick={onMarkRest}>Mark {t.unmarked} as present</Button></div></div>}
        {away.length > 0 ? (
          <div className="stack" style={{ gap: 6 }}>
            <b>Not here ({away.length})</b>
            {away.map((p) => <div key={p.id} className="ar-rev"><span className="grow"><b>{p.name}</b>{p.remark && <span className="muted small"> · {p.remark}</span>}</span><StatusPill status={p.status} halfSession={p.halfSession} /></div>)}
          </div>
        ) : <div className="muted">Everyone is here.</div>}
        {note && <div className="muted small">{note}</div>}
      </div>
    </Modal>
  );
}
