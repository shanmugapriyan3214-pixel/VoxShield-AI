import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { PhoneLayout } from './components/dialer/PhoneLayout';

// Phone Dialer Screens (Preserved for Mobile Simulation)
import { HomeScreen } from './screens/HomeScreen';
import { CallsScreen } from './screens/CallsScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { KeypadScreen } from './screens/KeypadScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SecurityCenterScreen } from './screens/SecurityCenterScreen';

// Core Application Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Calls } from './pages/Calls';
import { CallScreen } from './pages/CallScreen';
import { AudioAnalyzer } from './pages/AudioAnalyzer';
import { TrustedVoices } from './pages/TrustedVoices';
import { SecurityEvents } from './pages/SecurityEvents';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { ApiDocs } from './pages/ApiDocs';
import { Settings } from './pages/Settings';
import { VoiceProfile } from './pages/VoiceProfile';
import { Analytics } from './pages/Analytics';
import { AIStatus } from './pages/AIStatus';
import { VoiceVerification } from './pages/VoiceVerification';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Enterprise Cybersecurity Application Shell */}
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
          {/* Main 8 Navigation Sections */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calls" element={<Calls />} />
          <Route path="calls/:callId" element={<CallScreen />} />
          <Route path="call" element={<Calls />} />
          <Route path="analyzer" element={<AudioAnalyzer />} />
          <Route path="audio-analyzer" element={<AudioAnalyzer />} />
          <Route path="verify" element={<VoiceVerification />} />
          <Route path="voice-verification" element={<VoiceVerification />} />
          <Route path="trusted-voices" element={<TrustedVoices />} />
          <Route path="threat-history" element={<SecurityEvents />} />
          <Route path="security-events" element={<SecurityEvents />} />
          <Route path="events" element={<SecurityEvents />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="incidents/:incidentId" element={<IncidentDetail />} />
          <Route path="api-docs" element={<ApiDocs />} />
          <Route path="integration" element={<ApiDocs />} />
          <Route path="settings" element={<Settings />} />

          {/* Preserved Secondary & Advanced Tools */}
          <Route path="voices" element={<VoiceProfile />} />
          <Route path="voice-profile" element={<VoiceProfile />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="ai-status" element={<AIStatus />} />

          {/* Backwards-Compatible Dialer Tab Aliases */}
          <Route path="home" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="contacts" element={<TrustedVoices />} />
          <Route path="security-center" element={<SecurityEvents />} />
        </Route>

        {/* Mobile Phone Dialer Sandbox (Preserved) */}
        <Route
          path="/phone"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <PhoneLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/phone/home" replace />} />
          <Route path="home" element={<HomeScreen />} />
          <Route path="calls" element={<CallsScreen />} />
          <Route path="contacts" element={<ContactsScreen />} />
          <Route path="keypad" element={<KeypadScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
