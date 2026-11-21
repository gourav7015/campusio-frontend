import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface Props { children: ReactNode; /** Show inside a page instead of replacing the whole window. */ inline?: boolean; /** When this changes (for example the address), the boundary tries again. */ resetKey?: unknown }
interface State { error: unknown | null }

/** Catches a crash while drawing and shows the error screen instead of a blank page. */
const reported = new Set<string>();
/** Tells the server a screen crashed (once per kind of crash), so the Platform Admin sees it. Never throws and never blocks the error screen. */
export function reportClientError(error: unknown, extra?: string | null) {
  try {
    const message = String((error as Error)?.message || error).slice(0, 480);
    if (reported.has(message)) return;
    reported.add(message);
    const stack = `${(error as Error)?.stack || ''}\n${extra || ''}`.slice(0, 3900);
    const token = sessionStorage.getItem('erp.token') ?? localStorage.getItem('erp.token');
    void fetch(`${import.meta.env.VITE_API_URL || ''}/api/client-errors`, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message, stack, path: window.location.pathname }),
    }).catch(() => {});
  } catch { /* reporting must never cause another error */ }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: unknown): State { return { error: error ?? new Error('Unknown error') }; }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
    reportClientError(error, info.componentStack);
  }
  componentDidUpdate(prev: Props) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (this.state.error == null) return this.props.children;
    return <ErrorScreen error={this.state.error} inline={this.props.inline} onRetry={() => this.setState({ error: null })} />;
  }
}
