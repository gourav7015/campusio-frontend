import { useState } from 'react';
import { Button, Field, Input, Modal, Select, useAction } from './ui.jsx';

const EMPTY = ['', undefined, null];

/** Config-driven form in a modal. fields: [{name,label,type,options,required,hint,full,placeholder}] */
export default function FormModal({ title, fields, initial = {}, onSubmit, onClose, submitLabel = 'Save', wide, children }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === 'checkbox' ? false : f.default ?? '')])));
  const [run, busy] = useAction();
  const set = (n, val) => setV((s) => ({ ...s, [n]: val }));
  const shown = (f) => !f.showIf || f.showIf(v); // a field can appear only when another answer asks for it
  const missing = fields.some((f) => shown(f) && f.required && EMPTY.includes(v[f.name]) && f.type !== 'checkbox');
  const submit = async (e) => {
    e?.preventDefault();
    const out = {};
    for (const f of fields) {
      if (!shown(f)) continue;
      let val = v[f.name];
      if (f.type === 'number' && !EMPTY.includes(val)) val = Number(val);
      if (EMPTY.includes(val) && !f.keepEmpty) continue;
      out[f.name] = val;
    }
    const ok = await run(() => onSubmit(out));
    if (ok !== undefined && ok !== false) onClose();
  };
  return (
    <Modal title={title} onClose={onClose} wide={wide} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={missing} onClick={submit}>{submitLabel}</Button></>}>
      <form className="form-grid" onSubmit={submit}>
        {fields.filter(shown).map((f) => (
          <Field key={f.name} label={typeof f.label === 'function' ? f.label(v) : f.label} hint={f.hint} full={f.full || f.type === 'textarea'}>
            {f.type === 'select' ? <Select value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} options={f.options || []} placeholder={f.required ? 'Select…' : '—'} />
              : f.type === 'textarea' ? <textarea rows={3} value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
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
