import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonScene } from '../design/ui';
import { Async } from '../components/ui.jsx';

describe('loading skeletons', () => {
  it.each(['dashboard', 'table', 'list', 'cards', 'profile', 'form', 'roster', 'boot'])('%s: announced once as "Loading", with every shape hidden from a screen reader', (kind) => {
    const { container } = render(<SkeletonScene kind={kind} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    const shapes = container.querySelectorAll('.sk');
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    shapes.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
    expect(container.textContent).toBe(''); // shapes only: no made-up words or numbers
  });

  it('Async shows the skeleton while loading with nothing yet, the content once it arrives, and keeps old content while refreshing', () => {
    const { rerender } = render(<Async state={{ loading: true, data: null }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    rerender(<Async state={{ loading: false, data: [1] }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByText('Done')).toBeInTheDocument();
    rerender(<Async state={{ loading: true, data: [1] }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
