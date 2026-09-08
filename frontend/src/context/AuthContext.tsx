import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPrivate, AuthResponseData } from '../types/auth';
import { api, setTokens, clearTokens, getStoredRefreshToken } from '../api/client';

interface AuthContextType {
  user: UserPrivate | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPrivate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Attempt token refresh to obtain fresh access token and profile
      const res = await api.post<AuthResponseData>('/auth/refresh', { refresh_token: refreshToken });
      setTokens(res.tokens);
      setUser(res.user);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('voxshield:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('voxshield:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponseData>('/auth/login', { email, password });
    setTokens(res.tokens);
    setUser(res.user);
  };

  const register = async (displayName: string, username: string, email: string, password: string) => {
    const res = await api.post<AuthResponseData>('/auth/register', {
      display_name: displayName,
      username,
      email,
      password,
    });
    setTokens(res.tokens);
    setUser(res.user);
  };

  const logout = async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore errors on logout
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const u = await api.get<UserPrivate>('/auth/me');
      setUser(u);
    } catch {
      // Fail silently
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
