import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, session, ApiError } from '../api/client.js';

describe('api client', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { session.token = null; session.acting = null; session.onUnauthorized = vi.fn(); });
  afterEach(() => { globalThis.fetch = realFetch; });

  it('sends the bearer token and the acting-school header, and encodes query params', async () => {
    session.token = 'tok'; session.acting = { id: 'school1', name: 'X' };
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: 1 }) });
    await api('/api/school/years', { query: { yearId: 'a b', empty: '', none: undefined } });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/school/years?yearId=a+b');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['X-Acting-School']).toBe('school1');
  });
  it('turns validation failures into readable ApiErrors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Validation failed', code: 'VALIDATION', details: [{ path: 'dueDate', message: 'Use YYYY-MM-DD' }] }) });
    await expect(api('/x', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('dueDate: Use YYYY-MM-DD') });
    await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
  });
  it('explains a proxy/gateway failure (API down) instead of a bare status code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('not json'); } });
    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'UNREACHABLE', message: expect.stringContaining('The server did not answer') });
  });
  it('a dropped connection is reported as "no internet connection", not as an app error, and is not retried when the device is offline', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await api('/x').catch((e) => e);
    expect(err).toMatchObject({ code: 'OFFLINE', message: expect.stringContaining('No internet connection') });
    expect(err.message).not.toMatch(/Failed to fetch/);
    vi.stubGlobal('navigator', { onLine: false });
    globalThis.fetch = vi.fn();
    await expect(api('/x')).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('signs the user out locally on 401', async () => {
    session.token = 'tok';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Session expired' }) });
    await expect(api('/x')).rejects.toThrow('Session expired');
    expect(session.onUnauthorized).toHaveBeenCalled();
  });
  it('does not set a JSON content type for FormData uploads', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await api('/up', { method: 'POST', form: new FormData() });
    expect(globalThis.fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
});
