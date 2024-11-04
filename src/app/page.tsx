"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getUserProfile } from "@services/user";
import { useAuth } from '@context/auth';
import { logout } from "@services/auth";
import VerifyEmailBanner from "@components/banners/VerifyEmail/VerifyEmailBanner";

export default function Home() {
  const { isAuthenticated, token, setAuthenticated, setToken, userProfile, setUserProfile } = useAuth();

  useEffect(() => {
    async function fetchUserProfile() {
      if (isAuthenticated && token) {
        try {
          const profile = await getUserProfile(token);
          setUserProfile(profile);
        } catch (error) {
          if (error instanceof Error && error.message === 'Unauthorized') {
            await handleLogout();
          }
        }
      }
    }

    fetchUserProfile();
  }, [isAuthenticated, token]);

  const handleLogout = async () => {
    try {
      if (token) {
        await logout(token, setAuthenticated, setToken);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div>
      <main>
        <VerifyEmailBanner />
        <h1>Home - Dev!</h1>
        {isAuthenticated ? (
          userProfile ? (
            <div>
              <h2>User Profile</h2>
              <p>First Name: {userProfile.firstName}</p>
              <p>Last Name: {userProfile.lastName}</p>
              <p>Email: {userProfile.email}</p>
              <p>Email Verified: {userProfile.emailVerified ? "Yes" : "No"}</p>
            </div>
          ) : (
            <p>Loading user profile...</p>
          )
        ) : (
          <p>Please log in to see your profile.</p>
        )}
        {isAuthenticated && (
          <button onClick={handleLogout}>Logout</button>
        )}
        <Link href="/components">View Components</Link>
        <Link href="/forgot-password">Forgot Password</Link>
        <Link href="/reset-password">Reset Password</Link>
      </main>
    </div>
  );
}
