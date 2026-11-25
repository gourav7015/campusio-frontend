import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { Button, Input } from '../../design/ui';

/** The librarian's first move: scan or type the accession number printed on a book and carry on at the issue desk. */
export function ScanBox() {
  const [code, setCode] = useState('');
  const nav = useNavigate();
  return (
    <form onSubmit={(e) => { e.preventDefault(); const c = code.trim(); nav(c ? `/library/desk?acc=${encodeURIComponent(c)}` : '/library/desk'); }}
      className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-dashed border-tone bg-tone-soft p-[18px] sm:flex-row sm:items-center" aria-label="Scan a book">
      <ScanLine className="hidden size-8 flex-none text-tone-ink sm:block" strokeWidth={1.6} aria-hidden />
      <Input aria-label="Scan or type a book's accession number" placeholder="Scan or type the accession number on the book" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 flex-1 rounded-xl bg-card text-base" autoComplete="off" />
      <Button type="submit" variant="primary" size="lg" className="h-12">Issue this book</Button>
    </form>
  );
}
