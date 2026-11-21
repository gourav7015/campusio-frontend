// A size budget for the built site, so a heavy new library is noticed before it ships. Run after `npm run build` (the CI does).
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const gz = (f) => gzipSync(readFileSync(new URL(f, dir))).length / 1024;
const sizes = files.map((f) => ({ f, kb: gz(f) })).sort((a, b) => b.kb - a.kb);
const entry = sizes.find((s) => /^index-/.test(s.f));
const total = sizes.reduce((n, s) => n + s.kb, 0);
// Limits in kB of gzipped JavaScript. Raise them on purpose, with a reason, not by accident.
const LIMITS = { entry: 260, biggestOther: 130, total: 1500 };
const biggestOther = sizes.find((s) => s !== entry);
const rows = [['entry (loads on every page)', entry?.kb, LIMITS.entry], ['largest other file', biggestOther?.kb, LIMITS.biggestOther], ['all JavaScript', total, LIMITS.total]];
let bad = 0;
for (const [name, v, max] of rows) { const ok = v <= max; if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'OVER'} ${name}: ${v.toFixed(0)} kB (limit ${max} kB)`); }
if (bad) { console.error(`\n${bad} limit(s) exceeded. Largest files:\n${sizes.slice(0, 5).map((s) => `  ${s.kb.toFixed(0)} kB ${s.f}`).join('\n')}`); process.exit(1); }
