import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { DialogsProvider, useDialogs } from '../design/ui/dialogs.tsx';
import { PasswordInput } from '../design/ui/form.tsx';

function Probe() {
  const { confirm, prompt } = useDialogs();
  const [out, setOut] = useState('');
  return (
    <>
      <button onClick={async () => setOut(`confirm:${await confirm('Delete this?', { danger: true, title: 'Delete' })}`)}>ask</button>
      <button onClick={async () => setOut(`prompt:${await prompt('Why?', { required: true, title: 'Reason' })}`)}>ask-text</button>
      <output>{out}</output>
    </>
  );
}
const renderProbe = () => render(<DialogsProvider><Probe /></DialogsProvider>);

describe('confirm and prompt dialogs', () => {
  it('resolves true on Confirm and false on Cancel or Escape', async () => {
    renderProbe();
    fireEvent.click(screen.getByText('ask'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('confirm:true'));
    fireEvent.click(screen.getByText('ask'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('confirm:false'));
    fireEvent.click(screen.getByText('ask'));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('confirm:false'));
  });

  it('a required prompt will not accept an empty answer, and returns the text otherwise', async () => {
    renderProbe();
    fireEvent.click(screen.getByText('ask-text'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('This is required.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Parent called' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('prompt:Parent called'));
  });

  it('cancelling a prompt answers null', async () => {
    renderProbe();
    fireEvent.click(screen.getByText('ask-text'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('prompt:null'));
  });
});

describe('password field', () => {
  it('reveals and hides the password and announces its state', () => {
    render(<label>Pass<PasswordInput defaultValue="s3cret-pass" /></label>);
    const input = screen.getByDisplayValue('s3cret-pass');
    expect(input).toHaveAttribute('type', 'password');
    const btn = screen.getByRole('button', { name: 'Show password' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });
});
