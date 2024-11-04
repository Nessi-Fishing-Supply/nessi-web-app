"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from "@services/auth";
import { getUserProfile } from "@services/user";
import { useAuth } from '@context/auth';
import styles from './VerifyEmail.module.scss'

export default function VerifyEmailBanner() {
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<boolean>(false);
  const { isAuthenticated, token, setUserProfile, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const hasRunEffect = useRef(false);

  // Grab user profile
  useEffect(() => {
    async function fetchUserProfile() {
      if (isAuthenticated && token) {
        try {
          const profile = await getUserProfile(token);
          if (profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    }

    fetchUserProfile();
  }, [isAuthenticated, token, setUserProfile]);

  // Verify email
  useEffect(() => {
    async function verifyEmail() {
      if (isAuthenticated && !hasRunEffect.current && !verificationInProgress) {
        hasRunEffect.current = true;
        // Check if user profile is already verified
        const alreadyVerified = await checkIfEmailAlreadyVerified();
        if (!alreadyVerified) {
          const verificationToken = searchParams.get('token');
          if (verificationToken) {
            setVerificationInProgress(true);
            handleEmailVerification(verificationToken);
          }
        }
      }
    }

    verifyEmail();
  }, [searchParams, isAuthenticated, userProfile?.emailVerified, verificationInProgress]);

  // Check if email is already verified
  const checkIfEmailAlreadyVerified = async (): Promise<boolean> => {
    if (userProfile?.emailVerified) {
      setVerificationMessage(null);
      return true;
    }

    if (isAuthenticated && token) {
      try {
        const profile = await getUserProfile(token);
        if (profile && profile.emailVerified) {
          setUserProfile(profile);
          setVerificationMessage(null);
          return true;
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    return false;
  };

  const handleEmailVerification = async (verificationToken: string) => {
    if (verificationInProgress) return; // Prevent multiple calls

    try {
      const result = await verifyEmail(verificationToken);
      if (result.success || result.message.includes('successfully')) {
        setVerificationMessage('Your email was verified successfully!');
        setVerificationInProgress(false);
        // Update user profile to reflect email verification
        const updatedProfile = await getUserProfile(token);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      } else {
        setVerificationMessage('Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during email verification:', error);
      if (verificationInProgress) {
        setVerificationMessage('Verification failed. Please try again later.');
      }
    }
  };

  return (
    <>
    <div className={styles.container}>
    {verificationMessage && <p className="banner">{verificationMessage}</p>}
      {userProfile && !userProfile.emailVerified && !verificationMessage && (
        <div>
          <p>{userProfile.firstName}, please complete the following:</p>
          <p>Check your email ({userProfile.email}) and click "Confirm my Email" to get full access to Nessi.</p>
        </div>
      )}
    </div>
    </>
  );
}
