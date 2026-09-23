import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { checkServerHealth, ServerHealthStatus } from '../api/client';

interface ServerHealthContextType {
  health: ServerHealthStatus;
  isChecking: boolean;
  refreshHealth: () => Promise<void>;
}

const defaultHealth: ServerHealthStatus = {
  isHealthy: false,
  status: 'CHECKING',
  lastChecked: new Date(),
};

const ServerHealthContext = createContext<ServerHealthContextType>({
  health: defaultHealth,
  isChecking: true,
  refreshHealth: async () => {},
});

export const ServerHealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<ServerHealthStatus>(defaultHealth);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const performCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkServerHealth();
      setHealth(result);
    } catch {
      setHealth({
        isHealthy: false,
        status: 'OFFLINE',
        details: 'Unable to reach VOXSHIELD backend',
        lastChecked: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    performCheck();

    // Gentle heartbeat every 45 seconds to keep connection status fresh without spamming
    const interval = setInterval(() => {
      performCheck();
    }, 45000);

    return () => clearInterval(interval);
  }, [performCheck]);

  return (
    <ServerHealthContext.Provider
      value={{
        health,
        isChecking,
        refreshHealth: performCheck,
      }}
    >
      {children}
    </ServerHealthContext.Provider>
  );
};

export const useServerHealth = () => useContext(ServerHealthContext);
