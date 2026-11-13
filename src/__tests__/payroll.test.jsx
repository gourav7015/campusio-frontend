import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import PayItems, { cleanItems } from '../components/PayItems.jsx';

function Harness({ basic = 50000, initial = [] }) {
  const [items, setItems] = useState(initial);
  return <PayItems title="Allowances" basic={basic} items={items} onChange={setItems} />;
}

describe('PayItems editor', () => {
  it('adds a percentage allowance and shows its rupee value from the basic salary', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add' }));
    fireEvent.change(screen.getByLabelText('Allowances name 1'), { target: { value: 'HRA' } });
    fireEvent.change(screen.getByLabelText('Allowances type 1'), { target: { value: 'percent' } });
    fireEvent.change(screen.getByLabelText('Allowances value 1'), { target: { value: '40' } });
    expect(screen.getByText('= ₹20,000')).toBeInTheDocument();
  });

  it('a fixed amount ignores the basic, and rows can be removed', () => {
    render(<Harness initial={[{ label: 'Transport', kind: 'fixed', value: 2000 }]} />);
    expect(screen.getByText('= ₹2,000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Allowances 1' }));
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('cleanItems drops blank rows and converts values to numbers', () => {
    expect(cleanItems([{ label: ' HRA ', kind: 'percent', value: '40' }, { label: '', kind: 'fixed', value: '5' }, { label: 'Bonus', kind: 'fixed', value: '' }])).toEqual([{ label: 'HRA', kind: 'percent', value: 40 }]);
    expect(vi.isMockFunction(cleanItems)).toBe(false);
  });
});
