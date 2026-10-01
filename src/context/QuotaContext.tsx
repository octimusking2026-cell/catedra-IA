import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConsultasStatus } from '../types';
import { useSession } from './SessionContext';

interface QuotaContextType {
  consultas: ConsultasStatus | null;
  showLimiteModal: boolean;
  setShowLimiteModal: (show: boolean) => void;
  openLimiteModal: () => void;
  closeLimiteModal: () => void;
  refreshQuota: () => Promise<void>;
  isLimitReached: boolean;
  setConsultas: React.Dispatch<React.SetStateAction<ConsultasStatus | null>>;
}

const QuotaContext = createContext<QuotaContextType | null>(null);

export const QuotaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUser, consultas, setConsultas, refreshUser } = useSession();
  const [showLimiteModal, setShowLimiteModal] = useState(false);

  const refreshQuota = useCallback(async () => {
    if (!authUser) return;
    await refreshUser();
  }, [authUser, refreshUser]);

  // Sync window events
  useEffect(() => {
    const handleLimitReached = () => {
      setShowLimiteModal(true);
      refreshQuota();
    };

    const handleQuotaChanged = () => {
      refreshQuota();
    };

    window.addEventListener('limite-alcanzado-detected', handleLimitReached);
    window.addEventListener('quota-changed', handleQuotaChanged);

    return () => {
      window.removeEventListener('limite-alcanzado-detected', handleLimitReached);
      window.removeEventListener('quota-changed', handleQuotaChanged);
    };
  }, [refreshQuota]);

  const openLimiteModal = useCallback(() => setShowLimiteModal(true), []);
  const closeLimiteModal = useCallback(() => setShowLimiteModal(false), []);

  const isLimitReached = consultas ? consultas.restantes <= 0 : false;

  return (
    <QuotaContext.Provider
      value={{
        consultas,
        showLimiteModal,
        setShowLimiteModal,
        openLimiteModal,
        closeLimiteModal,
        refreshQuota,
        isLimitReached,
        setConsultas,
      }}
    >
      {children}
    </QuotaContext.Provider>
  );
};

export function useQuota(): QuotaContextType {
  const context = useContext(QuotaContext);
  if (!context) {
    throw new Error('useQuota must be used within a QuotaProvider');
  }
  return context;
}
