"use client";

import React, { useCallback, useEffect } from 'react';
import { useAuth } from '@context/auth';
import { getUserProfile } from '@services/user';
import { logout, resendVerificationEmail } from '@services/auth';
import axios from 'axios';

const Account: React.FC = () => {
  const { isAuthenticated, token, setAuthenticated, setToken, userProfile, setUserProfile } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await logout(token, setAuthenticated, setToken);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [token, setAuthenticated, setToken, setUserProfile]);

  useEffect(() => {
    async function fetchUserProfile() {
      if (isAuthenticated && token) {
        try {
          const profile = await getUserProfile(token);
          setUserProfile(profile);
        } catch (error) {
          if (axios.isAxiosError(error) && error.message === 'Unauthorized') {
            await handleLogout();
          } else {
            console.error('Unexpected error fetching user profile:', error);
          }
        }
      }
    }

    fetchUserProfile();
  }, [isAuthenticated, token, handleLogout, setUserProfile]);

  const handleResendVerificationEmail = async () => {
    if (userProfile?.email) {
      try {
        const result = await resendVerificationEmail(userProfile.email);
        alert(result.message);
      } catch (error) {
        console.error('Error resending verification email:', error);
        alert('Failed to resend verification email. Please try again later.');
      }
    }
  };

  return (
    <div>
      <h1>Account</h1>
      {isAuthenticated ? (
        userProfile ? (
          <div>
            <h2>User Profile</h2>
            <p>User ID: {userProfile.userId}</p>
            <p>First Name: {userProfile.firstName}</p>
            <p>Last Name: {userProfile.lastName}</p>
            <p>Email: {userProfile.email}</p>
            <p>Email Verified: {userProfile.emailVerified ? "Yes" : "No"}</p>
            <p>Token: {token}</p> {/* Add this line to display the token */}
            {!userProfile.emailVerified && (
              <button onClick={handleResendVerificationEmail}>Resend Verification Email</button>
            )}
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <p>Loading user profile...</p>
        )
      ) : (
        <p>Please log in to see your profile.</p>
      )}
    </div>
  );
};

export default Account;
