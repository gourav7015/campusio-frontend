import { describe, it, expect } from 'vitest';
import { parseCsv, toCsvText } from '../lib.js';
import { fmtDate, fmtPct, label, statusTone, dayName } from '../components/ui.jsx';
import { tick } from '../components/Charts.jsx';

describe('CSV parsing (bulk import)', () => {
  it('parses headers, quotes, embedded commas/newlines and CRLF', () => {
    const rows = parseCsv('name,address,phone\r\n"Rao, Asha","12 Park Rd\nPune",9876\r\nBen,,\r\n');
    expect(rows).toEqual([{ name: 'Rao, Asha', address: '12 Park Rd\nPune', phone: '9876' }, { name: 'Ben', address: '', phone: '' }]);
  });
  it('handles escaped quotes, blank lines and empty input', () => {
    expect(parseCsv('a,b\n"say ""hi""",2\n\n')).toEqual([{ a: 'say "hi"', b: '2' }]);
    expect(parseCsv('')).toEqual([]);
  });
  it('round-trips through toCsvText', () => {
    const cols = ['name', 'note'];
    const rows = [{ name: 'A, B', note: 'he said "ok"' }];
    expect(parseCsv(toCsvText(rows, cols))).toEqual(rows);
  });
});

describe('formatting helpers', () => {
  it('formats dates, percentages and labels without inventing values', () => {
    expect(fmtDate('2026-11-05')).toBe('5 Nov');
    expect(fmtDate('2026-11-05', true)).toBe('5 Nov 2026');
    expect(fmtDate(null)).toBe('—');
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(0)).toBe('0%');
    expect(label('under_review')).toBe('Under review');
    expect(statusTone('absent')).toBe('red');
    expect(dayName(1)).toBe('Monday');
  });
  it('formats chart ticks for dates and months', () => {
    expect(tick('2026-11-05')).toBe('5 Nov');
    expect(tick('2026-04')).toBe('Apr 26');
    expect(tick('Unit Test 1')).toBe('Unit Test 1');
  });
});
