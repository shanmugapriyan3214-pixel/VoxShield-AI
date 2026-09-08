import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center">
        <div className="relative">
          <Shield className="w-16 h-16 text-cyber-cyan animate-shield-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-cyber-cyan/30 animate-ping"></div>
        </div>
        <p className="mt-4 text-cyber-muted text-sm font-mono tracking-wider">
          AUTHENTICATING CREDENTIALS...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
