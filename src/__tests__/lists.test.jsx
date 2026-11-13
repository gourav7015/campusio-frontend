import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilterBar, ListFooter } from '../design/ui/list.tsx';
import BookGrid from '../components/BookGrid.tsx';
import { BookCover } from '../components/BookCover.tsx';

describe('list components', () => {
  it('FilterBar reports typing and keeps an accessible search name', () => {
    const onSearch = vi.fn();
    render(<FilterBar search="" onSearch={onSearch} searchLabel="Search students" placeholder="Search name"><select aria-label="Status"><option>Active</option></select></FilterBar>);
    fireEvent.change(screen.getByLabelText('Search students'), { target: { value: 'asha' } });
    expect(onSearch).toHaveBeenCalledWith('asha');
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('ListFooter shows a count on one page and previous/next when there are more', () => {
    const { rerender } = render(<ListFooter total={1} noun="student" page={1} pageSize={25} onPage={() => {}} />);
    expect(screen.getByText('1 student')).toBeInTheDocument();
    const onPage = vi.fn();
    rerender(<ListFooter total={60} noun="student" page={1} pageSize={25} onPage={onPage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('BookGrid shows availability honestly and opens a book', () => {
    const onOpen = vi.fn();
    render(<BookGrid onOpen={onOpen} items={[{ _id: 'b1', title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', category: 'Biography', available: 2, total: 3 }, { _id: 'b2', title: 'Malgudi Days', category: 'Fiction', available: 0, total: 1 }]} />);
    expect(screen.getByText('2 of 3 available')).toBeInTheDocument();
    expect(screen.getByText('All on loan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Wings of Fire/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ _id: 'b1' }));
  });

  it('BookGrid explains an empty catalogue', () => {
    render(<BookGrid items={[]} onOpen={() => {}} />);
    expect(screen.getByText('No books yet')).toBeInTheDocument();
  });

  it('a cover is decorative and stable for the same category', () => {
    const { container: a } = render(<BookCover title="Atlas of India" category="Reference" />);
    const { container: b } = render(<BookCover title="Another Book" category="Reference" />);
    expect(a.firstChild.className.split(' ').find((c) => c.startsWith('bg-'))).toBe(b.firstChild.className.split(' ').find((c) => c.startsWith('bg-')));
    expect(a.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
