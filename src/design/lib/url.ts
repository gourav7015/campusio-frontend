/** A link from user-entered data is clickable only when it is a real http(s) address. Anything else (javascript:, data:, …) becomes undefined. */
export function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined; } catch { return undefined; }
}
