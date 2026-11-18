import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface Props { children: ReactNode; /** Show inside a page instead of replacing the whole window. */ inline?: boolean; /** When this changes (for example the address), the boundary tries again. */ resetKey?: unknown }
interface State { error: unknown | null }

/** Catches a crash while drawing and shows the error screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: unknown): State { return { error: error ?? new Error('Unknown error') }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error('Screen crashed:', error, info.componentStack); }
  componentDidUpdate(prev: Props) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (this.state.error == null) return this.props.children;
    return <ErrorScreen error={this.state.error} inline={this.props.inline} onRetry={() => this.setState({ error: null })} />;
  }
}
