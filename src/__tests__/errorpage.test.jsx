import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from '../design/ErrorBoundary';
import { ErrorScreen, kindOf } from '../design/ErrorScreen';
import { ErrorBox } from '../components/ui.jsx';

const Bomb = ({ explode }) => { if (explode) throw new Error('The schedule exploded'); return <p>All fine</p>; };

describe('error page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a crash while drawing shows the page instead of a blank screen, with a way to recover and a reference', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Our school bus broke down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
    expect(screen.getByText(/Reference:/)).toBeInTheDocument();
    expect(screen.getByText(/The schedule exploded/)).toBeInTheDocument(); // the message only, never a stack trace
    expect(document.body.textContent).not.toMatch(/at Bomb|\.jsx:\d+/);
  });

  it('"Try again" draws the page again once the cause has gone', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let explode = true;
    const Flaky = () => <Bomb explode={explode} />;
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    explode = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('All fine')).toBeInTheDocument();
  });

  it('moving to another page clears the error (inline boundary keyed on the address)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Host() {
      const [path, setPath] = useState('/a');
      return <><button onClick={() => setPath('/b')}>go</button><ErrorBoundary inline resetKey={path}>{path === '/a' ? <Bomb explode /> : <p>Page B</p>}</ErrorBoundary></>;
    }
    render(<Host />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
  });

  it('tells a stale site (after an update) and a lost connection apart from a crash', () => {
    expect(kindOf(new Error('Failed to fetch dynamically imported module: http://x/assets/Finance-abc.js'))).toBe('update');
    expect(kindOf(new TypeError('Failed to fetch'))).toBe('offline');
    expect(kindOf(new Error('Cannot read properties of undefined'))).toBe('crash');
    render(<ErrorScreen error={new Error('Failed to fetch dynamically imported module: x')} />);
    expect(screen.getByRole('heading', { name: 'We have just updated Campusio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload now' })).toBeInTheDocument();
  });

  it('the 404 variant says wrong stop and keeps the supplied way home', () => {
    render(<ErrorScreen kind="notfound" homeHref="/student" />);
    expect(screen.getByRole('heading', { name: 'Wrong stop' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/student');
  });
  it('a dropped connection becomes the friendly "no signal" page, and a server fault the "bad moment" page', async () => {
    const { api } = await import('../api/client.js');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api('/api/x').catch((e) => e);
    vi.unstubAllGlobals();
    expect(err.code).toBe('UNREACHABLE');
    expect(err.message).not.toMatch(/Failed to fetch/);
    const { unmount } = render(<ErrorBox error={err} retry={() => {}} />);
    expect(screen.getByRole('heading', { name: 'No signal on this route' })).toBeInTheDocument();
    unmount();
    render(<ErrorBox error={Object.assign(new Error('boom'), { status: 500 })} retry={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Our server is having a bad moment' })).toBeInTheDocument();
  });

  it('a wrong password is still a plain message, not an error page', () => {
    render(<ErrorBox error={Object.assign(new Error('Invalid login id or password'), { status: 401 })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid login id or password');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
