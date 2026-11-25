import { useState } from 'react';
import { Button, Field, Input, Modal, Select, useAction } from './ui.jsx';

const EMPTY = ['', undefined, null];

/** Config-driven form in a modal. fields: [{name,label,type,options,required,hint,full,placeholder}] */
export default function FormModal({ title, fields, initial = {}, onSubmit, onClose, submitLabel = 'Save', wide, children }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === 'checkbox' ? false : f.type === 'multi' ? [] : f.default ?? '')])));
  const [run, busy] = useAction();
  const set = (n, val) => setV((s) => ({ ...s, [n]: val }));
  const shown = (f) => !f.showIf || f.showIf(v); // a field can appear only when another answer asks for it
  const missing = fields.some((f) => shown(f) && f.required && (EMPTY.includes(v[f.name]) || (f.type === 'multi' && !v[f.name].length)) && f.type !== 'checkbox');
  const submit = async (e) => {
    e?.preventDefault();
    const out = {};
    for (const f of fields) {
      if (!shown(f)) continue;
      let val = v[f.name];
      if (f.type === 'number' && !EMPTY.includes(val)) val = Number(val);
      if ((EMPTY.includes(val) || (f.type === 'multi' && !val.length)) && !f.keepEmpty) continue;
      out[f.name] = val;
    }
    const ok = await run(() => onSubmit(out));
    if (ok !== undefined && ok !== false) onClose();
  };
  return (
    <Modal title={title} onClose={onClose} wide={wide} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={missing} onClick={submit}>{submitLabel}</Button></>}>
      <form className="form-grid" onSubmit={submit}>
        {fields.filter(shown).map((f) => (
          <Field key={f.name} label={typeof f.label === 'function' ? f.label(v) : f.label} hint={f.hint} full={f.full || f.type === 'textarea' || f.type === 'multi'}>
            {f.type === 'select' ? <Select value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} options={f.options || []} placeholder={f.required ? 'Select…' : '—'} />
              : f.type === 'multi' ? <MultiPick options={f.options || []} value={v[f.name]} onChange={(val) => set(f.name, val)} allLabel={f.allLabel} label={typeof f.label === 'string' ? f.label : undefined} />
              : f.type === 'textarea' ? <textarea rows={3} value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
              : f.type === 'swatches' ? <div className="row" role="radiogroup" aria-label={typeof f.label === 'string' ? f.label : undefined} style={{ gap: 8, flexWrap: 'wrap' }}>
                {f.choices.map((c) => <button type="button" key={c.value} role="radio" aria-checked={v[f.name] === c.value} disabled={!!c.takenBy} title={c.takenBy ? `Already used by ${c.takenBy}` : undefined} onClick={() => set(f.name, v[f.name] === c.value ? '' : c.value)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--surface, #fff)', cursor: c.takenBy ? 'not-allowed' : 'pointer', opacity: c.takenBy ? 0.4 : 1, font: 'inherit', border: v[f.name] === c.value ? `2px solid ${c.value}` : '1px solid var(--border, #cbd5e1)' }}>
                  <span aria-hidden style={{ width: 14, height: 14, borderRadius: 7, background: c.value, display: 'inline-block' }} />{c.label}{c.takenBy ? ` · ${c.takenBy}` : ''}</button>)}</div>
              : f.type === 'checkbox' ? <input type="checkbox" checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
              : <Input type={f.type || 'text'} list={f.list} value={v[f.name]} min={f.min} max={f.max} step={f.step} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />}
          </Field>
        ))}
        <button type="submit" hidden />
      </form>
      {children}
    </Modal>
  );
}

/** Pick one, several or all of a list: tick the ones you want, or use "All" / "Clear". */
function MultiPick({ options, value, onChange, allLabel = 'Select all', label }) {
  const all = options.length > 0 && value.length === options.length;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : options.map((o) => o.value).filter((x) => x === id || value.includes(x)));
  return (
    <div role="group" aria-label={label}>
      <div className="row" style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <Button size="sm" type="button" variant={all ? 'primary' : undefined} onClick={() => onChange(all ? [] : options.map((o) => o.value))}>{allLabel}</Button>
        {value.length > 0 && <Button size="sm" type="button" onClick={() => onChange([])}>Clear</Button>}
        <span className="muted small">{value.length === 0 ? 'None chosen yet' : all ? `All ${options.length} chosen` : `${value.length} of ${options.length} chosen`}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 190, overflowY: 'auto' }}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return <label key={o.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: on ? '1.5px solid rgb(var(--c-primary))' : '1px solid var(--border)', background: on ? 'rgb(var(--c-primary-soft))' : 'var(--surface, #fff)', font: 'inherit' }}>
            <input type="checkbox" checked={on} onChange={() => toggle(o.value)} style={{ margin: 0 }} />{o.label}</label>;
        })}
      </div>
    </div>
  );
}
