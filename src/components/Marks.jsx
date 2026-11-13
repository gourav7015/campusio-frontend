import { Button, Input } from './ui.jsx';

/** Edit an exam's marks fields (e.g. Written 40, Oral 10). Nothing is hard-coded to theory/practical. */
export const PRESETS = [
  { name: 'Single score', fields: (max) => [{ label: 'Marks', max }] },
  { name: 'Written + Oral', fields: (max) => [{ label: 'Written', max: Math.round(max * 0.8) }, { label: 'Oral', max: max - Math.round(max * 0.8) }] },
  { name: 'Written + Practical', fields: (max) => [{ label: 'Written', max: Math.round(max * 0.8) }, { label: 'Practical', max: max - Math.round(max * 0.8) }] },
];

export function ComponentsEditor({ value, onChange, locked }) {
  const set = (i, patch) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const total = value.reduce((n, c) => n + (Number(c.max) || 0), 0);
  return (
    <div className="stack-sm" aria-label="Marks fields">
      {!locked && <div className="row wrap small"><span className="muted">Quick start:</span>{PRESETS.map((p) => <button type="button" key={p.name} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => onChange(p.fields(total || 100))}>{p.name}</button>)}</div>}
      {value.map((c, i) => (
        <div key={i} className="row">
          <div className="grow"><Input aria-label={`Field ${i + 1} name`} placeholder="Field name, e.g. Written" value={c.label} disabled={locked} onChange={(e) => set(i, { label: e.target.value })} /></div>
          <Input aria-label={`Field ${i + 1} maximum`} type="number" min="1" style={{ width: 110 }} placeholder="Max" value={c.max} disabled={locked} onChange={(e) => set(i, { max: e.target.value === '' ? '' : Number(e.target.value) })} />
          {!locked && <Button type="button" size="sm" disabled={value.length <= 1} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove field ${i + 1}`}>Remove</Button>}
        </div>))}
      <div className="row between small"><span className="muted">Total maximum: <b>{total}</b></span>{!locked && value.length < 8 && <Button type="button" size="sm" onClick={() => onChange([...value, { label: '', max: 10 }])}>+ Add field</Button>}</div>
    </div>
  );
}
export const cleanComponents = (list) => list.map((c) => ({ label: String(c.label).trim(), max: Number(c.max) }));
export const componentsText = (list = []) => list.map((c) => `${c.label} ${c.max}`).join(' + ');
