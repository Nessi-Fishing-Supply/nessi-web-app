'use client';

import React from 'react';
import { useAuth } from '@/context/auth';
import { logout } from '@/services/auth';

const Account: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';
  const email = user?.email ?? '';
  const emailVerified = user?.email_confirmed_at ? 'Yes' : 'No';
  const userId = user?.id ?? '';

  return (
    <div>
      <h1>Account</h1>
      {isLoading ? (
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
