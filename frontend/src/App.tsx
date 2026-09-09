import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Calls } from './pages/Calls';
import { CallScreen } from './pages/CallScreen';
import { VoiceProfile } from './pages/VoiceProfile';
import { TrustedVoices } from './pages/TrustedVoices';
import { SecurityEvents } from './pages/SecurityEvents';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { Analytics } from './pages/Analytics';
import { AIStatus } from './pages/AIStatus';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Application Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <AppLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/:callId" element={<CallScreen />} />
        <Route path="voices" element={<VoiceProfile />} />
        <Route path="voice-profile" element={<VoiceProfile />} />
        <Route path="trusted-voices" element={<TrustedVoices />} />
        <Route path="events" element={<SecurityEvents />} />
        <Route path="security-events" element={<SecurityEvents />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="incidents/:incidentId" element={<IncidentDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-status" element={<AIStatus />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  </ErrorBoundary>
  );
};

export default App;
