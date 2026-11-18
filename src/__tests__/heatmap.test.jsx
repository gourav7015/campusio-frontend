import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Heatmap from '../components/Heatmap.jsx';

// one month: alternating recorded and unrecorded days, a Sunday and a holiday
const days = Array.from({ length: 14 }, (_, i) => {
  const date = `2026-11-${String(i + 2).padStart(2, '0')}`; // Mon 2 Nov … Sun 15 Nov
  const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
  if (sunday) return { date, working: false, status: null };
  if (date === '2026-11-04') return { date, working: false, holiday: 'Diwali', status: null };
  return { date, working: true, status: i % 2 === 0 ? 'present' : null };
});

describe('attendance heat map', () => {
  it('draws exactly one square for every date, odd and even, and tells the kinds apart', () => {
    const { container } = render(<Heatmap days={days} />);
    const cells = [...container.querySelectorAll('[data-date]')];
    expect(cells.map((c) => c.dataset.date)).toEqual(days.map((d) => d.date));
    const kind = (d) => cells.find((c) => c.dataset.date === d).dataset.status;
    expect(kind('2026-11-02')).toBe('present'); expect(kind('2026-11-03')).toBe('unmarked');
    expect(kind('2026-11-04')).toBe('off'); // holiday
    expect(kind('2026-11-08')).toBe('off'); // Sunday
    // unrecorded working days carry the hatched class, so they never look empty
    expect(cells.find((c) => c.dataset.date === '2026-11-03').className).toContain('hm-unmarked');
    expect(cells.find((c) => c.dataset.date === '2026-11-08').className).toContain('hm-off');
    // each square has a tooltip naming the date and what it is
    expect(cells.find((c) => c.dataset.date === '2026-11-04').getAttribute('title')).toMatch(/Holiday: Diwali/);
    expect(cells.find((c) => c.dataset.date === '2026-11-03').getAttribute('title')).toMatch(/Not recorded/);
  });
  it('says how many working days are recorded', () => {
    const { container } = render(<Heatmap days={days} />);
    expect(container.textContent).toMatch(/\d+ of \d+ working days have a recorded status/);
  });
});
