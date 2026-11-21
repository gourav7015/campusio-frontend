import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import '@fontsource-variable/inter';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-500.css';
import { AuthProvider } from './auth/AuthContext.jsx';
import { queryClient } from './api/query';
import App from './App.jsx';
import { ErrorBoundary, reportClientError } from './design/ErrorBoundary';
import './index.css';

// anything that escapes a screen's own error handling is reported too (once per kind)
window.addEventListener('error', (e) => reportClientError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user"><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
