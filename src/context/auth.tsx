"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { UserProfileDto } from '@services/user';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setToken: (token: string | null) => void;
  userProfile: UserProfileDto | null;
  setUserProfile: (profile: UserProfileDto | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    // Initialize authentication state from local storage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    // Persist token to local storage
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, setAuthenticated, setToken, userProfile, setUserProfile }}>
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
