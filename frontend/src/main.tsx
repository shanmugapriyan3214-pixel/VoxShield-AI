import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ServerHealthProvider } from './context/ServerHealthContext';
import { ToastProvider } from './components/common/Toast';
import { isNativePlatform } from './platform/capacitor';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element in DOM');
}

// Use HashRouter for Capacitor native (file:// protocol doesn't support HTML5 History),
// BrowserRouter for standard web browser (existing behavior, zero change).
const Router = isNativePlatform() ? HashRouter : BrowserRouter;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <ServerHealthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ServerHealthProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
