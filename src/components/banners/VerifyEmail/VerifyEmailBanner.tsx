"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from "@services/auth";
import { getUserProfile, UserProfileDto } from "@services/user";
import { useAuth } from '@context/auth';

export default function VerifyEmailBanner() {
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const { isAuthenticated, token, setUserProfile, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [localUserProfile, setLocalUserProfile] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    async function initializeUserProfile() {
      if (isAuthenticated && token) {
        try {
          const profile = await getUserProfile(token);
          if (profile) {
            setLocalUserProfile(profile);
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    }

    initializeUserProfile();
  }, [isAuthenticated, token, setUserProfile]);

  useEffect(() => {
    async function verifyEmail() {
      if (isAuthenticated) {
        const alreadyVerified = await checkIfEmailAlreadyVerified();
        if (!alreadyVerified) {
          handleEmailVerification();
        } else {
          const successMessageShown = localStorage.getItem('emailVerifiedSuccess');
          if (successMessageShown) {
            setVerificationMessage(null);
            localStorage.removeItem('emailVerifiedSuccess');
          }
        }
      }
    }

    verifyEmail();
  }, [searchParams, isAuthenticated, localUserProfile?.emailVerified, userProfile?.emailVerified]);

  const handleEmailVerification = async () => {
    const verificationToken = searchParams.get('token');

    if (!verificationToken) {
      return;
    }

    try {
      const result = await verifyEmail(verificationToken);
      if (result.success) {
        setVerificationMessage('Your email was verified successfully!');
        localStorage.setItem('emailVerifiedSuccess', 'true');
        await updateUserProfile();
        router.push('/');
      } else {
        setVerificationMessage('Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during email verification:', error);
      setVerificationMessage('Verification failed. Please try again later.');
    }
  };

  const checkIfEmailAlreadyVerified = async (): Promise<boolean> => {
    if (localUserProfile?.emailVerified) {
      setVerificationMessage(null);
      return true;
    }

    if (isAuthenticated && token) {
      try {
        const profile = await getUserProfile(token);
        if (profile) {
          setLocalUserProfile(profile);
          setUserProfile(profile);
          if (profile.emailVerified) {
            setVerificationMessage(null);
            return true;
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    return false;
  };

  const updateUserProfile = async () => {
    if (isAuthenticated && token) {
      try {
        const profile = await getUserProfile(token);
        if (profile) {
          setLocalUserProfile(profile);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  const currentUserProfile = localUserProfile || userProfile;

  return (
    <>
      {verificationMessage && <div className="banner">{verificationMessage}</div>}
      {currentUserProfile && !currentUserProfile.emailVerified && !verificationMessage && (
        <div className="banner">
          Please verify your email. Check your inbox for the verification link.
        </div>
      )}
    </>
  );
}
