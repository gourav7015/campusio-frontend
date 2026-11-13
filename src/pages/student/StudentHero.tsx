import { useEffect, useRef } from 'react';
import { Check, Palette } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Badge, Popover, PopoverContent, PopoverTrigger } from '../../design/ui';
import { useTheme } from '../../design/lib/theme';
import { cn } from '../../design/lib/cn';
import { SCENES, useWallpaper, type Scene } from './wallpapers';

/** Decorative scene art. Drawn in SVG/CSS, transform-only animation, still when the user prefers less motion. */
function Art({ kind }: { kind: Scene['art'] }) {
  if (kind === 'none') return null;
  const base = 'pointer-events-none absolute';
  if (kind === 'orbs') return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <span className={cn(base, '-right-10 -top-16 size-64 rounded-full bg-primary/10 motion-safe:animate-[drift_18s_ease-in-out_infinite]')} style={{ transform: 'translate(calc(var(--px,0) * -14px), calc(var(--py,0) * -10px))' }} />
      <span className={cn(base, 'bottom-[-5rem] right-1/3 size-48 rounded-full bg-primary/10 motion-safe:animate-[drift_24s_ease-in-out_infinite_reverse]')} style={{ transform: 'translate(calc(var(--px,0) * 10px), calc(var(--py,0) * 8px))' }} />
      <span className={cn(base, 'right-12 top-1/2 size-16 rounded-full bg-primary/15 motion-safe:animate-[drift_14s_ease-in-out_infinite]')} />
    </div>
  );
  if (kind === 'hills') return (
    <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ transform: 'translateX(calc(var(--px,0) * -6px))' }}>
      <path d="M0 140 C120 90 220 150 340 120 C460 90 560 150 800 100 L800 200 L0 200Z" fill="rgb(120 170 130 / .22)" />
      <path d="M0 170 C140 130 260 180 400 150 C540 120 660 180 800 150 L800 200 L0 200Z" fill="rgb(90 150 110 / .28)" />
    </svg>
  );
  if (kind === 'grid') return <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgb(120 110 90 / .12) 1px, transparent 1px), linear-gradient(90deg, rgb(120 110 90 / .12) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(120deg, transparent 30%, black)' }} />;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[[12, 22, 2], [30, 70, 1], [52, 18, 2], [70, 60, 1], [86, 28, 2], [92, 78, 1], [44, 46, 1]].map(([x, y, s], i) => (
        <span key={i} className="absolute rounded-full bg-white/70 motion-safe:animate-[twinkle_5s_ease-in-out_infinite]" style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${i * 0.7}s` }} />
      ))}
    </div>
  );
}

export function StudentHero({ name, greeting, dateLabel, classLabel, year, status }: { name: string; greeting: string; dateLabel: string; classLabel: string; year: string; status?: string }) {
  const { scene, set } = useWallpaper();
  const { resolved } = useTheme();
  const tone = resolved === 'dark' ? scene.dark : scene.light;
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // gentle parallax on devices with a mouse; nothing runs for touch screens or reduced motion
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5) * 2));
        el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5) * 2));
      });
    };
    el.addEventListener('pointermove', move);
    return () => { el.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [reduce]);

  return (
    <section ref={ref} aria-label="Welcome" className="relative overflow-hidden rounded-2xl border border-border/70 px-6 py-7 shadow-xs sm:px-8 sm:py-9" style={{ background: tone.bg, color: tone.ink }}>
      <Art kind={scene.art} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm" style={{ color: tone.sub }}>{dateLabel}</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-10 tracking-[-0.025em] sm:text-4xl">{greeting}, {name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" style={{ color: tone.sub }}>
            <span className="rounded-full px-3 py-1 font-medium" style={{ background: tone.chip, color: tone.ink }}>{classLabel}</span>
            <span className="rounded-full px-3 py-1" style={{ background: tone.chip }}>{year}</span>
            {status && status !== 'active' && <Badge tone="warning">{status}</Badge>}
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Change wallpaper" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: tone.chip, color: tone.ink }}>
              <Palette className="size-4" aria-hidden />Wallpaper
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" aria-label="Wallpaper">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Wallpaper</p>
            <div role="radiogroup" aria-label="Wallpaper" className="grid grid-cols-5 gap-2">
              {SCENES.map((s) => {
                const t = resolved === 'dark' ? s.dark : s.light; const on = s.id === scene.id;
                return (
                  <button key={s.id} type="button" role="radio" aria-checked={on} aria-label={s.label} title={s.label} onClick={() => set(s.id)}
                    className={cn('relative grid aspect-square place-items-center rounded-lg border transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary ring-2 ring-primary/30' : 'border-border')} style={{ background: t.bg }}>
                    {on && <Check className="size-4" style={{ color: t.ink }} aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p className="px-1 pt-2 text-xs text-muted-foreground">{scene.label}</p>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}
