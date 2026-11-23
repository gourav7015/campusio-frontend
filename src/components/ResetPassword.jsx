import { useState } from 'react';
import { post } from '../api/client.js';
import { Button, Field, Modal, useAction } from './ui.jsx';
import { PasswordInput } from '../design/ui';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'; const DIGITS = '23456789'; const SYMBOLS = '#@$%&*';
/** A random password of 12 characters (a letter, a digit and a symbol among them), made in the browser so it can be seen before it is applied. */
export function generatePassword() {
  const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(LETTERS.toUpperCase()), pick(LETTERS.toLowerCase()), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < 12) chars.push(pick(LETTERS + DIGITS));
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

/**
 * Nothing is changed by pressing Reset password: this dialog asks first. Choose a password for the person (type one, or let one be generated),
 * then press "Set this password". They are signed out everywhere and choose their own at the next sign-in.
 */
function ResetDialog({ url, name, onClose, onDone }) {
  const [mode, setMode] = useState('generate');
  const [generated, setGenerated] = useState(generatePassword);
  const [typed, setTyped] = useState('');
  const [run, busy] = useAction();
  const password = mode === 'generate' ? generated : typed;
  const ok = mode === 'generate' || (typed.length >= 10 && /[A-Za-z]/.test(typed) && /\d/.test(typed));
  const apply = async () => { const r = await run(() => post(url, { password })); if (r) onDone(r); };
  return (
    <Modal title={`Reset password · ${name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!ok} onClick={apply}>Set this password</Button></>}>
      <div className="stack">
        <div className="alert">Nothing has changed yet. When you press <b>Set this password</b>, {name} is signed out everywhere and must choose their own password the next time they sign in.</div>
        <div role="radiogroup" aria-label="How to choose the password" className="stack-sm">
          <label className="row" style={{ gap: 8, alignItems: 'center' }}><input type="radio" name="how" checked={mode === 'generate'} onChange={() => setMode('generate')} /> Generate a password for me</label>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}><input type="radio" name="how" checked={mode === 'type'} onChange={() => setMode('type')} /> I will type the new password</label>
        </div>
        {mode === 'generate' ? (
          <Field label="The new password" hint="Copy it after you set it: it is not shown again.">
            <div className="row" style={{ gap: 8 }}>
              <input className="input" readOnly value={generated} aria-label="Generated password" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600 }} onFocus={(e) => e.target.select()} />
              <Button type="button" onClick={() => setGenerated(generatePassword())}>Generate another</Button>
            </div>
          </Field>
        ) : (
          <Field label="The new password" hint="At least 10 characters with a letter and a number; not a common password; it must not contain the login id.">
            <PasswordInput autoComplete="new-password" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/** A "Reset password" button that opens the dialog above. onDone receives { loginId, temporaryPassword } once it is applied. */
export default function ResetPasswordButton({ url, name, onDone, size = 'sm', children = 'Reset password' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>{children}</Button>
      {open && <ResetDialog url={url} name={name} onClose={() => setOpen(false)} onDone={(r) => { setOpen(false); onDone({ ...r, name }); }} />}
    </>
  );
}
