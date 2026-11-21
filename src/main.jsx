import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'framer-motion';
import '@fontsource-variable/inter';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-500.css';
import { AuthProvider } from './auth/AuthContext.jsx';
import { queryClient } from './api/query';
import App from './App.jsx';
import { ErrorBoundary, reportClientError } from './design/ErrorBoundary';
import { reloadForUpdate } from './design/ErrorScreen';
import './index.css';

// the animation engine is the biggest single library in the app: it loads after the first screen is shown, not before
const loadMotionFeatures = () => import('./design/motionFeatures').then((r) => r.default);

// a page open during an update asks for a file that is gone: Vite says so with this event; one automatic reload fixes it
window.addEventListener('vite:preloadError', (e) => { if (reloadForUpdate()) e.preventDefault(); });
// anything that escapes a screen's own error handling is reported too (once per kind)
window.addEventListener('error', (e) => reportClientError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={loadMotionFeatures}><MotionConfig reducedMotion="user"><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></MotionConfig></LazyMotion>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
