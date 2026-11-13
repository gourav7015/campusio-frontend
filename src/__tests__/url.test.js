import { describe, expect, it } from 'vitest';
import { safeHref } from '../design/lib/url.ts';

describe('safeHref', () => {
  it('allows http and https only', () => {
    expect(safeHref('https://example.org/a?b=1')).toBe('https://example.org/a?b=1');
    expect(safeHref('http://example.org')).toBe('http://example.org/');
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd', '//evil.example', 'not a url', '', null, undefined]) expect(safeHref(bad), String(bad)).toBeUndefined();
  });
});
