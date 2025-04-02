'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@context/auth';
import { getUserProfile, logout } from '@services/auth';

const Account: React.FC = () => {
  const { isAuthenticated, setAuthenticated, setToken } = useAuth();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setAuthenticated(false);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [setAuthenticated, setToken]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated) {
        try {
          const profile = await getUserProfile();
          setUser(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          await handleLogout();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, handleLogout]);

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';
  const email = user?.email ?? '';
  const emailVerified = user?.email_confirmed_at ? 'Yes' : 'No';
  const userId = user?.id ?? '';

  return (
    <div>
      <h1>Account</h1>
      {loading ? (
        <p>Loading user profile...</p>
      ) : isAuthenticated && user ? (
        <div>
          <h2>User Profile</h2>
          <p>User ID: {userId}</p>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>Email: {email}</p>
          <p>Email Verified: {emailVerified}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <p>Please log in to see your profile.</p>
      )}
    </div>
  );
};

export default Account;
