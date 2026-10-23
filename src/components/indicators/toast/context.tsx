'use client';

import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Toast from './index';

interface ToastData {
  message: string;
  description: string;
  subtitle?: string;
  type: 'success' | 'error';
  duration?: number;
}

interface ToastContextType {
  showToast: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<(ToastData & { visible: boolean }) | null>(null);

  const showToast = useCallback((data: ToastData) => {
    setToast({ ...data, visible: true });
  }, []);

  const handleDismiss = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && toast.visible && (
        <Toast
          visible
          type={toast.type}
          message={toast.message}
          description={toast.description}
          subtitle={toast.subtitle}
          duration={toast.duration}
          onDismiss={handleDismiss}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
