import { Button, Input, Select } from './ui.jsx';

/** Edit a list of allowances or deductions: a name, "₹ fixed" or "% of basic", and a value. */
export default function PayItems({ title, items, onChange, basic }) {
  const set = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const amount = (it) => (it.kind === 'percent' ? ((Number(basic) || 0) * (Number(it.value) || 0)) / 100 : Number(it.value) || 0);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between"><div className="bold">{title}</div><Button size="sm" type="button" onClick={() => onChange([...items, { label: '', kind: 'fixed', value: '' }])}>+ Add</Button></div>
      {!items.length && <div className="muted">None</div>}
      {items.map((it, i) => (
        <div className="row" key={i} style={{ gap: 6 }}>
          <Input aria-label={`${title} name ${i + 1}`} placeholder="Name (e.g. HRA)" value={it.label} onChange={(e) => set(i, { label: e.target.value })} />
          <Select aria-label={`${title} type ${i + 1}`} value={it.kind} onChange={(e) => set(i, { kind: e.target.value })} options={[{ value: 'fixed', label: '₹ fixed' }, { value: 'percent', label: '% of basic' }]} />
          <Input aria-label={`${title} value ${i + 1}`} type="number" min="0" step="any" placeholder="Value" value={it.value} onChange={(e) => set(i, { value: e.target.value })} style={{ maxWidth: 110 }} />
          <span className="muted" style={{ minWidth: 80 }}>= ₹{amount(it).toLocaleString('en-IN')}</span>
          <Button size="sm" type="button" variant="danger" aria-label={`Remove ${title} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</Button>
        </div>
      ))}
    </div>
  );
}

export const cleanItems = (items) => items.filter((i) => i.label.trim() && i.value !== '').map((i) => ({ label: i.label.trim(), kind: i.kind, value: Number(i.value) }));
