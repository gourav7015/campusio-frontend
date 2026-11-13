import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeToggle } from '../design/ui';
import { site } from '../config';
import { useRobots, usePageTitle } from '../design/lib/page';

/** The Campusio mark. The artwork is the product logo; it is decorative where the name is shown beside it. */
export const Logo = ({ size = 32, className }: { size?: number; className?: string }) => (
  <img src="/logo.png" alt="" width={size} height={size} className={className} style={{ width: size, height: size }} />
);

export const Wordmark = () => (
  <Link to="/" aria-label={`${site.name} home`} className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Logo size={32} className="rounded-lg" />
    <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
  </Link>
);

/** A contact detail as a real link (mailto: / tel:). Renders nothing until the company has set it. */
export function Contact({ kind }: { kind: 'email' | 'phone' }) {
  const v = kind === 'email' ? site.email : site.phone;
  if (!v) return null;
  return <a className="font-medium text-primary-ink hover:underline" href={kind === 'email' ? `mailto:${v}` : `tel:${v.replace(/[^+\d]/g, '')}`}>{v}</a>;
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 text-sm text-muted-foreground sm:px-8">
        <p>© {new Date().getFullYear()} {site.company || site.name}</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="hover:text-foreground hover:underline" to="/privacy">Privacy policy</Link>
          <Link className="hover:text-foreground hover:underline" to="/terms">Terms</Link>
          <Link className="hover:text-foreground hover:underline" to="/cookies">Cookies and storage</Link>
          <Link className="hover:text-foreground hover:underline" to="/refunds">Refunds and cancellation</Link>
        </nav>
      </div>
    </footer>
  );
}

/** Frame for the public pages (landing, sign-in, policies): skip link, quiet header with the theme switch, footer. */
export function PublicPage({ children, narrow, title, index = false }: { children: ReactNode; narrow?: boolean; title?: string; index?: boolean }) {
  usePageTitle(title);
  useRobots(index);
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only z-[80] rounded-md bg-card px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8"><Wordmark /><ThemeToggle /></header>
      <main id="main-content" tabIndex={-1} className={`mx-auto w-full flex-1 px-5 pb-16 focus-visible:outline-none sm:px-8 ${narrow ? 'max-w-md' : 'max-w-6xl'}`}>{children}</main>
      <PublicFooter />
    </div>
  );
}
