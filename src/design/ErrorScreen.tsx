import { useMemo, type ReactNode } from 'react';
import { cn } from './lib/cn';

export type ErrorKind = 'crash' | 'update' | 'offline' | 'server' | 'notfound';

const COPY: Record<ErrorKind, { code: string; title: string; text: string }> = {
  crash: { code: 'Oops', title: 'Our school bus broke down', text: 'Something went wrong while showing this page. Your data is safe. Try again, and if it keeps happening, tell your school office and quote the reference below.' },
  update: { code: 'New', title: 'We have just updated Campusio', text: 'A newer version is ready. Reload the page to pick it up. You will not lose anything you have saved.' },
  offline: { code: 'No signal', title: 'No signal on this route', text: 'We cannot reach the server right now. Check your internet connection and try again.' },
  server: { code: 'Busy', title: 'Our server is having a bad moment', text: 'The school server could not finish that request. Nothing you saved is lost. Wait a few seconds and try again, and if it keeps happening, tell your school office and quote the reference below.' },
  notfound: { code: '404', title: 'Wrong stop', text: 'This page is not on our route. The address may be mistyped, or the page may have moved.' },
};

/** Failures worth a friendlier message than the raw one. */
export function kindOf(error: unknown): ErrorKind {
  const m = error instanceof Error ? `${error.name} ${error.message}` : String(error || '');
  if (/dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i.test(m)) return 'update'; // the site was updated while this page was open
  if (/Failed to fetch|NetworkError|Load failed|UNREACHABLE|Cannot reach the server/i.test(m)) return 'offline';
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === 'number' && status >= 500) return 'server';
  return 'crash';
}

/** True when the failure is the connection or the server, not something the person typed wrong. Those get the full error page. */
export const isConnectionProblem = (error: unknown) => { const k = kindOf(error); return k === 'offline' || k === 'server'; };

/** A short reference a person can read out to the school office. Not secret and not tied to anyone. */
const newReference = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/** A school bus with a flat tyre (or, on a 404, a signpost). Decorative: the text carries the message. Motion is SMIL so it needs no style sheet, and is off for people who ask for reduced motion. */
function Illustration({ kind }: { kind: ErrorKind }) {
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const wobble = !still;
  return (
    <svg viewBox="0 0 320 190" role="presentation" aria-hidden className="mx-auto h-auto w-full max-w-sm">
      {/* road */}
      <rect x="0" y="150" width="320" height="6" rx="3" fill="rgb(var(--c-border))" />
      <g stroke="rgb(var(--c-fg-3))" strokeWidth="3" strokeLinecap="round" opacity=".6"><path d="M20 172h28M78 172h28M136 172h28M194 172h28M252 172h28" /></g>
      {kind === 'notfound' ? (
        <g>
          <rect x="150" y="40" width="8" height="112" rx="3" fill="rgb(var(--c-fg-2))" />
          <g transform="rotate(-6 154 62)"><path d="M70 48h112l16 14-16 14H70z" fill="rgb(var(--c-primary))" /><text x="92" y="68" fontSize="15" fontWeight="700" fill="rgb(var(--c-primary-fg, 255 255 255))">Classroom?</text></g>
          <g transform="rotate(7 154 100)"><path d="M232 90H122l-16 14 16 14h110z" fill="rgb(var(--c-warning))" /><text x="130" y="110" fontSize="15" fontWeight="700" fill="rgb(var(--c-fg))">Not here</text></g>
          <circle cx="154" cy="40" r="6" fill="rgb(var(--c-fg-2))" />
        </g>
      ) : (
        <g>
          {/* bus body, tilted a little on its flat tyre */}
          <g transform="rotate(-3 160 150)">
            <rect x="50" y="62" width="196" height="76" rx="14" fill="rgb(var(--c-warning))" />
            <rect x="50" y="108" width="196" height="8" fill="rgb(var(--c-fg))" opacity=".18" />
            {[68, 106, 144, 182].map((x) => <rect key={x} x={x} y="76" width="26" height="24" rx="5" fill="rgb(var(--c-surface))" />)}
            <path d="M212 76h22a8 8 0 0 1 8 8v16h-30z" fill="rgb(var(--c-surface))" />
            <circle cx="238" cy="122" r="5" fill="rgb(var(--c-fg))" opacity=".7" />
            <text x="120" y="131" fontSize="11" fontWeight="700" fill="rgb(var(--c-fg))" opacity=".75">CAMPUSIO</text>
            {/* smoke */}
            <g fill="rgb(var(--c-fg-3))">
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={64 - i * 14} cy={56 - i * 10} r={5 + i * 2} opacity={wobble ? 0 : 0.35}>
                  {wobble && <><animate attributeName="opacity" values="0;.45;0" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" /><animateTransform attributeName="transform" type="translate" values="0 0;-6 -10;-10 -20" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" /></>}
                </circle>
              ))}
            </g>
          </g>
          {/* wheels: the front one is flat */}
          <g>
            <circle cx="98" cy="142" r="17" fill="#2a2a2e" /><circle cx="98" cy="142" r="6" fill="#9a9aa0" />
            <g>
              <ellipse cx="206" cy="151" rx="21" ry="9" fill="#2a2a2e" /><ellipse cx="206" cy="150" rx="6" ry="3" fill="#9a9aa0" /><path d="M232 146h14M232 152h10" stroke="rgb(var(--c-fg-3))" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
              {wobble && <animateTransform attributeName="transform" type="rotate" values="-2 206 150;2 206 150;-2 206 150" dur="1.6s" repeatCount="indefinite" />}
            </g>
          </g>
          {/* a warning triangle on the road */}
          <g transform="translate(262 118)"><path d="M16 0 32 30H0z" fill="rgb(var(--c-danger))" /><rect x="14.5" y="10" width="3" height="11" rx="1.5" fill="#fff" /><circle cx="16" cy="25" r="1.8" fill="#fff" /></g>
        </g>
      )}
    </svg>
  );
}

export interface ErrorScreenProps {
  kind?: ErrorKind;
  /** The error itself, for the reference and the details a person can read out. Never a stack trace. */
  error?: unknown;
  onRetry?: () => void;
  /** Where the home button leads, and what it says. */
  homeHref?: string;
  homeLabel?: string;
  /** Show the full-page frame (the app crashed) or sit inside a page (one screen crashed). */
  inline?: boolean;
  children?: ReactNode;
}

/**
 * The page people see when something goes wrong, instead of a blank screen. It uses only plain links and buttons
 * (no router, no session, no data), so it still works when the part of the app that failed is the router or the session.
 */
export function ErrorScreen({ kind, error, onRetry, homeHref = '/', homeLabel = 'Go to home', inline, children }: ErrorScreenProps) {
  const k = kind ?? kindOf(error);
  const c = COPY[k];
  const reference = useMemo(() => newReference(), []);
  const detail = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const btn = 'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center bg-background px-5 text-center text-foreground', inline ? 'py-16' : 'min-h-dvh py-10')}>
      <div className="w-full max-w-md">
        <Illustration kind={k} />
        <p className="mt-6 text-sm font-semibold tracking-widest text-primary-ink">{c.code.toUpperCase()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{c.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{c.text}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {k === 'notfound' ? null : k === 'update'
            ? <button type="button" className={cn(btn, 'bg-primary text-primary-foreground hover:opacity-90')} onClick={() => window.location.reload()}>Reload now</button>
            : (<>
              <button type="button" className={cn(btn, 'bg-primary text-primary-foreground hover:opacity-90')} onClick={onRetry ?? (() => window.location.reload())}>Try again</button>
              {onRetry && <button type="button" className={cn(btn, 'border border-border bg-card hover:bg-muted')} onClick={() => window.location.reload()}>Reload the page</button>}
            </>)}
          <a href={homeHref} className={cn(btn, 'border border-border bg-card hover:bg-muted')}>{homeLabel}</a>
        </div>
        {children}
        {(k === 'crash' || k === 'offline' || k === 'server') && (
          <details className="mx-auto mt-8 max-w-sm text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer text-center">For the school office</summary>
            <p className="mt-2">Reference: <b className="font-mono text-foreground">{reference}</b></p>
            {detail && <p className="mt-1 break-words">Message: {detail.slice(0, 200)}</p>}
            <p className="mt-1">Time: {new Date().toLocaleString('en-IN')}</p>
          </details>
        )}
      </div>
    </div>
  );
}
