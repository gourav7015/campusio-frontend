import { createContext, useContext, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronRight, Copy, Mail, MessageCircle, Phone } from 'lucide-react';
import { useGet } from '../api/query';
import { post } from '../api/client.js';
import { cn } from '../design/lib/cn';
import { Button, ErrorState, PageSkeleton } from '../design/ui';
import { PublicPage } from './PublicPage';

/**
 * The public Connect page (atkaksha.in/connect): the people on the team, with how to reach each one, opening hours, and a message form.
 * The team, wording, hours and mailboxes are kept by the platform administrator, so nothing here is written into the page itself.
 */
interface Person { id: string; name: string; role: string; about: string; topics: string[]; phone: string; whatsapp: string; email: string; languages: string; tone: number }
interface Connect { title: string; intro: string; hours: { days: number[]; opens: string; closes: string; timezone: string; note: string }; mailboxes: { address: string; purpose: string }[]; team: Person[] }

const TONES: Record<number, { soft: string; ink: string }> = {
  1: { soft: 'bg-primary-soft', ink: 'text-primary-ink' }, 2: { soft: 'bg-success-soft', ink: 'text-success-ink' },
  3: { soft: 'bg-warning-soft', ink: 'text-warning-ink' }, 4: { soft: 'bg-danger-soft', ink: 'text-danger-ink' },
};
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const digits = (s: string) => s.replace(/[^\d]/g, '');
const DAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const clock = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`; };
const daysText = (days: number[]) => {
  const d = [...days].sort((a, b) => a - b);
  if (!d.length) return 'No fixed days';
  const run = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  return run && d.length > 1 ? `${DAY[d[0]].slice(0, 3)} to ${DAY[d[d.length - 1]].slice(0, 3)}` : d.map((x) => DAY[x].slice(0, 3)).join(', ');
};

/** Open now / closed now, in the team's own time zone. */
function openStatus(h: Connect['hours']) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: h.timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const iso = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
    const now = `${get('hour').padStart(2, '0')}:${get('minute').padStart(2, '0')}`;
    if (h.days.includes(iso) && now >= h.opens && now < h.closes) return { on: true, text: 'Open now', note: `Until ${clock(h.closes)}` };
    for (let i = 0; i <= 7; i++) {
      const d = ((iso - 1 + i) % 7) + 1;
      if (!h.days.includes(d) || (i === 0 && now >= h.opens)) continue;
      return { on: false, text: 'Closed now', note: `Opens ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY[d]} at ${clock(h.opens)}` };
    }
  } catch { /* an unknown time zone: say the hours without claiming open or closed */ }
  return { on: false, text: daysText(h.days), note: `${clock(h.opens)} to ${clock(h.closes)}` };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={`Copy ${label}`} title="Copy"
      className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground', done && 'text-success-ink')}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* the address is on screen to copy by hand */ } }}>
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5 first:border-t-0">
      <div className="min-w-0"><span className="block text-[13px] text-muted-foreground">{label}</span><span className="block break-words text-base font-medium tabular-nums">{value}</span></div>
      {copy && <CopyButton text={value} label={label.toLowerCase()} />}
    </div>
  );
}

function TeamTab({ data, goMessage }: { data: Connect; goMessage: () => void }) {
  const [sel, setSel] = useState(0);
  const status = useMemo(() => openStatus(data.hours), [data.hours]);
  const p = data.team[Math.min(sel, data.team.length - 1)];
  if (!p) return <p className="text-muted-foreground">Our team will be listed here soon. In the meantime, <button className="font-medium text-primary-ink underline underline-offset-4" onClick={goMessage}>send us a message</button>.</p>;
  const t = TONES[p.tone] || TONES[1];
  const wa = digits(p.whatsapp || p.phone);
  const first = p.name.split(' ')[0];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-9 lg:grid-cols-[5fr_7fr]">
      <div className="min-w-0 lg:row-span-2">
        <h2 id="pick-label" className="mb-3.5 text-[13px] font-medium text-muted-foreground">Who would you like to talk to?</h2>
        <div role="radiogroup" aria-labelledby="pick-label" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
          {data.team.map((m, i) => {
            const mt = TONES[m.tone] || TONES[1]; const on = i === sel;
            return (
              <button key={m.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => setSel(i)}
                onKeyDown={(e) => { const n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null; if (n === null) return; e.preventDefault(); setSel((n + data.team.length) % data.team.length); }}
                className={cn('flex shrink-0 items-center gap-4 rounded-full border px-2 py-1.5 pr-5 text-left transition lg:w-full lg:rounded-2xl lg:px-4 lg:py-3.5', on ? 'border-border bg-card shadow-md lg:border-border' : 'border-border/60 hover:bg-card/70 lg:border-transparent')}>
                <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-medium lg:size-12 lg:text-base', mt.soft, mt.ink)}>{initials(m.name)}</span>
                <span className="min-w-0"><b className="block text-[15px] font-semibold tracking-tight lg:text-base">{m.name}</b><span className="hidden text-sm text-muted-foreground lg:block">{m.role}</span></span>
                <ChevronRight aria-hidden className={cn('ml-auto hidden size-[18px] text-muted-foreground transition lg:block', on ? 'opacity-100' : '-translate-x-1 opacity-0')} />
              </button>
            );
          })}
        </div>
      </div>

      <article aria-live="polite" aria-label={`Contact details for ${p.name}`} className="min-w-0 overflow-hidden rounded-[28px] border border-border bg-card shadow-lg lg:sticky lg:top-6 lg:row-span-2 lg:self-start">
        <div className={cn('flex items-center gap-5 px-6 py-7 sm:gap-6 sm:px-10 sm:py-9', t.soft)}>
          <span aria-hidden className={cn('grid size-[72px] shrink-0 place-items-center rounded-full bg-card text-2xl font-medium sm:size-24 sm:text-[32px]', t.ink)}>{initials(p.name)}</span>
          <div className="min-w-0"><h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{p.name}</h3>{p.role && <div className={cn('mt-1 font-medium', t.ink)}>{p.role}</div>}</div>
        </div>
        <div className="grid gap-7 px-5 py-6 sm:px-10 sm:py-8">
          {(p.about || p.topics.length > 0) && (
            <div>
              {p.about && <p className="max-w-[40ch] text-[17px] leading-relaxed tracking-tight">{p.about}</p>}
              {p.topics.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-label="Good for">{p.topics.map((x) => <span key={x} className="rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">{x}</span>)}</div>}
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${[p.phone, wa, p.email].filter(Boolean).length || 1}, minmax(0, 1fr))` }}>
            {p.phone && <a className="grid h-[88px] place-items-center rounded-2xl bg-primary text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110" href={`tel:${p.phone.replace(/[^+\d]/g, '')}`}><span className="grid place-items-center gap-2"><Phone className="size-[22px]" aria-hidden />Call {first}</span></a>}
            {wa && <a className="grid h-[88px] place-items-center rounded-2xl bg-muted text-sm font-medium transition hover:-translate-y-0.5 hover:bg-primary-soft" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><span className="grid place-items-center gap-2"><MessageCircle className="size-[22px] text-primary-ink" aria-hidden />WhatsApp</span></a>}
            {p.email && <a className="grid h-[88px] place-items-center rounded-2xl bg-muted text-sm font-medium transition hover:-translate-y-0.5 hover:bg-primary-soft" href={`mailto:${p.email}`}><span className="grid place-items-center gap-2"><Mail className="size-[22px] text-primary-ink" aria-hidden />Email</span></a>}
          </div>
          {(p.phone || p.email || p.languages) && (
            <div className="rounded-2xl border border-border">
              {p.phone && <Row label="Mobile" value={p.phone} copy />}
              {p.email && <Row label="Email" value={p.email} copy />}
              {p.languages && <Row label="Speaks" value={p.languages} />}
            </div>
          )}
        </div>
      </article>

      <div className="grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
        <div className={cn('inline-flex items-center gap-2 font-medium text-foreground')}>
          <span aria-hidden className={cn('size-2 rounded-full', status.on ? 'bg-success ring-4 ring-success/20' : 'bg-muted-foreground/60')} />
          {status.text} <small className="font-normal text-muted-foreground">· {status.note}</small>
        </div>
        <p>{daysText(data.hours.days)}, {clock(data.hours.opens)} to {clock(data.hours.closes)} India time. Outside these hours, <button type="button" className="font-medium text-primary-ink underline underline-offset-4" onClick={goMessage}>send a message</button> and we reply the next working day.</p>
        {data.hours.note && <p>{data.hours.note}</p>}
      </div>
    </div>
  );
}

const REASONS: Record<string, { label: string; sub: string; msg: string; req: boolean; ph: string; size: boolean; when: boolean; who: string; btn: string }> = {
  demo: { label: 'See a demo', sub: 'We will show AtKaksha with your class structure, so it looks like your school and not a sample.', msg: 'Anything we should know?', req: false, ph: 'For example: we run classes from nursery to 12 and manage fees on paper today.', size: true, when: true, who: 'hello', btn: 'Request a demo' },
  price: { label: 'Pricing and plans', sub: 'Tell us roughly how big your school is and we will send a clear quote by email.', msg: 'What would you like a quote for?', req: false, ph: 'For example: fees, attendance and report cards for 1,200 students.', size: true, when: false, who: 'hello', btn: 'Ask about pricing' },
  help: { label: 'Help for my school (existing schools)', sub: 'For school admins already on AtKaksha. Tell us what is going wrong and which page you were on.', msg: 'What is going wrong?', req: true, ph: 'Describe what you did, what you expected, and what happened instead.', size: false, when: false, who: 'support', btn: 'Send to support' },
  other: { label: 'Something else', sub: 'Ask anything. If it belongs with someone else on the team, we will pass it on.', msg: 'Your message', req: true, ph: 'Write your message here.', size: false, when: false, who: 'hello', btn: 'Send message' },
};
const SIZES = ['Under 300', '300 to 800', '800 to 2,000', 'Over 2,000'];
const TIMES = ['Weekday mornings, 10 am to 1 pm', 'Weekday afternoons, 2 pm to 5 pm', 'Weekday evenings, 5 pm to 7 pm'];
const control = 'h-11 w-full rounded-[10px] border border-input bg-card px-3 text-[15px] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

/** Which fields failed their check: read by every Field, so Field itself never has to be made inside a component (that would lose focus while typing). */
const BadFields = createContext<Record<string, boolean>>({});
function Field({ id, label, optional, err, children }: { id: string; label: string; optional?: boolean; err?: string; children: React.ReactNode }) {
  const bad = useContext(BadFields)[id];
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">{label}{optional && <span className="font-normal text-muted-foreground"> (optional)</span>}</label>
      {children}{bad && err && <span className="text-[13px] text-danger-ink" role="alert">{err}</span>}
    </div>
  );
}

function MessageTab({ data, goTeam }: { data: Connect; goTeam: () => void }) {
  const [reason, setReason] = useState('demo');
  const [f, setF] = useState({ name: '', email: '', school: '', phone: '', size: SIZES[2], bestTime: '', message: '', website: '' });
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [done, setDone] = useState<{ ref: string; rows: [string, string][] } | null>(null);
  const R = REASONS[reason];
  const set = (k: string, v: string) => { setF((x) => ({ ...x, [k]: v })); setBad((b) => (b[k] ? { ...b, [k]: false } : b)); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    const b = { name: !f.name.trim(), email: !/^\S+@\S+\.\S+$/.test(f.email.trim()), school: !f.school.trim(), message: R.req && !f.message.trim() };
    setBad(b);
    if (Object.values(b).some(Boolean)) return;
    setBusy(true);
    try {
      const res = (await post('/api/public/connect/message', { reason, name: f.name.trim(), email: f.email.trim(), school: f.school.trim(), phone: f.phone.trim(), size: R.size ? f.size : '', bestTime: R.when ? f.bestTime : '', message: f.message.trim(), website: f.website })) as { ref: string };
      setDone({ ref: res.ref, rows: [['Reason', REASONS[reason].label], ['Name', f.name.trim()], ['School', f.school.trim()], ['Reply to', f.email.trim()], ...(R.size ? [['Students', f.size] as [string, string]] : []), ...(R.when && f.bestTime ? [['Best time', f.bestTime] as [string, string]] : []), ['Reference', res.ref]] });
    } catch (err) { setError((err as Error).message || 'We could not send your message. Please try again, or write to us by email.'); } finally { setBusy(false); }
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[7fr_4fr]">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-8" aria-labelledby="form-title">
        {done ? (
          <div>
            <div className="mb-4 grid size-11 place-items-center rounded-full bg-muted text-success-ink"><Check className="size-[22px]" aria-hidden /></div>
            <h2 tabIndex={-1} ref={(el) => el?.focus()} className="mb-1.5 text-[22px] font-semibold tracking-tight">Thank you, we have your message</h2>
            <p className="text-muted-foreground">A copy is on its way to {f.email.trim()}. Our team replies from {R.who}@{data.mailboxes[0]?.address.split('@')[1] || 'atkaksha.com'}, usually within one working day.</p>
            <dl className="my-6 border-t border-border">{done.rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-border py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words text-right font-medium">{v}</dd></div>)}</dl>
            <Button onClick={() => { setDone(null); setF({ name: '', email: '', school: '', phone: '', size: SIZES[2], bestTime: '', message: '', website: '' }); }}>Send another message</Button>
          </div>
        ) : (
          <>
            <h2 id="form-title" className="mb-1.5 text-[22px] font-semibold tracking-tight">Send us a message</h2>
            <p className="mb-6 text-muted-foreground">{R.sub}</p>
            <BadFields.Provider value={bad}><form noValidate onSubmit={submit}>
              <Field id="reason" label="What can we help with?"><select id="reason" className={control} value={reason} onChange={(e) => { setReason(e.target.value); setBad({}); }}>{Object.entries(REASONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field id="name" label="Your name" err="Enter your name."><input id="name" className={cn(control, bad.name && 'border-danger')} autoComplete="name" placeholder="Anita Sharma" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!bad.name} /></Field>
                <Field id="email" label="Email" err="Enter an email address we can reply to."><input id="email" type="email" className={cn(control, bad.email && 'border-danger')} autoComplete="email" placeholder="you@school.edu.in" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!bad.email} /></Field>
              </div>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field id="school" label="School name" err="Enter your school's name."><input id="school" className={cn(control, bad.school && 'border-danger')} autoComplete="organization" placeholder="St. Mary's Public School" value={f.school} onChange={(e) => set('school', e.target.value)} aria-invalid={!!bad.school} /></Field>
                <Field id="phone" label="Mobile" optional>
                  <div className="flex"><span aria-hidden className="grid place-items-center rounded-l-[10px] border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">+91</span><input id="phone" type="tel" inputMode="numeric" className={cn(control, 'rounded-l-none')} autoComplete="tel-national" placeholder="98765 43210" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                </Field>
              </div>
              {(R.size || R.when) && (
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {R.size && <Field id="size" label="Number of students"><select id="size" className={control} value={f.size} onChange={(e) => set('size', e.target.value)}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></Field>}
                  {R.when && <Field id="bestTime" label="Best time for a call" optional><select id="bestTime" className={control} value={f.bestTime} onChange={(e) => set('bestTime', e.target.value)}><option value="">Any time, you decide</option>{TIMES.map((s) => <option key={s}>{s}</option>)}</select></Field>}
                </div>
              )}
              <Field id="message" label={R.msg} optional={!R.req} err="Tell us a little about what you need."><textarea id="message" className={cn(control, 'min-h-[120px] resize-y py-2.5 leading-relaxed', bad.message && 'border-danger')} placeholder={R.ph} value={f.message} onChange={(e) => set('message', e.target.value)} aria-invalid={!!bad.message} maxLength={2000} /></Field>
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label></div>
              <p className="mb-5 mt-1 text-[13px] text-muted-foreground">We use these details only to reply to you. Read our <a className="underline underline-offset-4" href="/privacy">privacy policy</a>.</p>
              {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>}
              <div className="flex flex-wrap items-center gap-4"><Button type="submit" variant="primary" loading={busy}>{R.btn}</Button><span className="text-sm text-muted-foreground">We reply within one working day.</span></div>
            </form></BadFields.Provider>
          </>
        )}
      </section>
      <aside className="flex flex-col gap-8 pt-1.5" aria-label="What to expect">
        <div>
          <h3 className="mb-3.5 text-[15px] font-semibold">What happens next</h3>
          <ol className="space-y-4 text-sm">
            {[['We read your message', 'Someone on the team looks at your school and what you asked.'], ['We reply by email', 'With answers, or a few times to choose from for a call.'], ['You see it with your own classes', 'A short demo built around your school, if you want one.']].map(([b, s], i) => (
              <li key={b} className="flex gap-3"><span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">{i + 1}</span><span><b className="block font-medium">{b}</b><span className="text-muted-foreground">{s}</span></span></li>
            ))}
          </ol>
        </div>
        {data.mailboxes.length > 0 && (
          <div>
            <h3 className="mb-1 text-[15px] font-semibold">Prefer email?</h3>
            <p className="mb-2 text-sm text-muted-foreground">Each address goes to the person who handles it.</p>
            <ul className="border-b border-border">{data.mailboxes.map((m) => (
              <li key={m.address} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><div className="break-words text-sm font-medium">{m.address}</div><div className="text-[13px] text-muted-foreground">{m.purpose}</div></div><CopyButton text={m.address} label={m.address} /></li>
            ))}</ul>
          </div>
        )}
        <p className="text-sm text-muted-foreground">Prefer to talk now? <button type="button" className="font-medium text-primary-ink underline underline-offset-4" onClick={goTeam}>See who to call</button>.</p>
      </aside>
    </div>
  );
}

export default function ConnectPage() {
  const { data, error, refetch } = useGet<Connect>('/api/public/connect');
  const [tab, setTab] = useState<'team' | 'message'>(() => (location.hash === '#message' ? 'message' : 'team'));
  useEffect(() => { const on = () => setTab(location.hash === '#message' ? 'message' : 'team'); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  const go = (t: 'team' | 'message') => { setTab(t); history.replaceState(null, '', `#${t}`); };
  return (
    <PublicPage title="Connect with the team" index>
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <PageSkeleton /> : (
        <>
          <section className="max-w-3xl py-10 sm:py-14">
            <h1 className="text-balance text-4xl font-semibold leading-[1.07] tracking-tight sm:text-5xl">{data.title}</h1>
            {data.intro && <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">{data.intro}</p>}
          </section>
          <div role="tablist" aria-label="How to reach us" className="mb-8 inline-flex rounded-xl bg-muted p-1">
            {([['team', 'Our team'], ['message', 'Send a message']] as const).map(([k, label]) => (
              <button key={k} role="tab" type="button" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
                onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(tab === 'team' ? 'message' : 'team'); } }}
                className={cn('whitespace-nowrap rounded-[9px] px-5 py-2 text-sm font-medium transition', tab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="pb-8 focus-visible:outline-none">
            {tab === 'team' ? <TeamTab data={data} goMessage={() => go('message')} /> : <MessageTab data={data} goTeam={() => go('team')} />}
          </div>
        </>
      )}
    </PublicPage>
  );
}
