"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { verifyEmail, resendVerificationEmail } from "@services/auth";
import { getUserProfile } from "@services/user";
import { useAuth } from '@context/auth';
import styles from './VerifyEmail.module.scss'
import { HiOutlineExclamationCircle, HiOutlineXCircle, HiOutlineCheckCircle } from 'react-icons/hi';
import Button from '@components/controls/button';

export default function VerifyEmailBanner() {
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<boolean>(false);
  const { isAuthenticated, token, setUserProfile, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const hasRunEffect = useRef(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);

  // Global authentication check
  const shouldRender = isAuthenticated;

  // Check if email is already verified
  const checkIfEmailAlreadyVerified = useCallback(async (): Promise<boolean> => {
    if (userProfile?.emailVerified) {
      setVerificationMessage(null);
      setShowBanner(false);
      return true;
    }

    if (isAuthenticated && token) {
      try {
        const profile = await getUserProfile(token);
        if (profile && profile.emailVerified) {
          setUserProfile(profile);
          setVerificationMessage(null);
          setShowBanner(false);
          return true;
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    return false;
  }, [isAuthenticated, token, userProfile, setUserProfile]);

  // Handle email verification process
  const handleEmailVerification = useCallback(async (verificationToken: string) => {
    if (verificationInProgress) return;

    try {
      const result = await verifyEmail(verificationToken);
      if (result.success || result.message.includes('successfully')) {
        setVerificationMessage('Your email was verified successfully!');
        setVerificationInProgress(false);
        const updatedProfile = await getUserProfile(token);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
        localStorage.setItem('emailVerified', 'true');
        setTimeout(() => {
          setShowBanner(false);
        }, 5000);
      } else {
        setVerificationMessage('Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during email verification:', error);
      setVerificationMessage('Verification failed. Please try again later.');
      setVerificationInProgress(false);
    }
  }, [verificationInProgress, token, setUserProfile]);

  // Fetch user profile on component mount or when authentication state changes
  useEffect(() => {
    async function fetchUserProfile() {
      if (isAuthenticated && token) {
        try {
          const profile = await getUserProfile(token);
          if (profile) {
            setUserProfile(profile);
            if (profile.emailVerified) {
              localStorage.setItem('emailVerified', 'true');
              setShowBanner(false);
            } else {
              setShowBanner(true);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    }

    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated, token, setUserProfile]);

  // Verify email if a verification token is present in the URL
  useEffect(() => {
    async function verifyEmail() {
      if (isAuthenticated && !hasRunEffect.current && !verificationInProgress) {
        hasRunEffect.current = true;
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

    if (isAuthenticated) {
      verifyEmail();
    }
  }, [searchParams, isAuthenticated, userProfile?.emailVerified, verificationInProgress, checkIfEmailAlreadyVerified, handleEmailVerification]);

  // Handle resending of verification email
  const handleResendVerificationEmail = async () => {
    if (userProfile?.email) {
      try {
        const result = await resendVerificationEmail(userProfile.email);
        setVerificationMessage(result.message);
      } catch (error) {
        console.error('Error resending verification email:', error);
        setVerificationMessage('Failed to resend verification email. Please try again later.');
      }
    }
  };

  // Hide the banner after showing a success message for 5 seconds
  useEffect(() => {
    if (verificationMessage?.includes('successfully')) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [verificationMessage]);

  if (!shouldRender || !showBanner) {
    return null;
  }

  // Get the appropriate icon based on the verification message
  const getIcon = () => {
    if (verificationMessage?.includes('successfully')) {
      return <HiOutlineCheckCircle className={styles.iconSuccess} />;
    } else if (verificationMessage?.includes('failed')) {
      return <HiOutlineXCircle className={styles.iconError} />;
    } else {
      return <HiOutlineExclamationCircle className={styles.iconAlert} />;
    }
  };

  return (
    <>
      {userProfile && (
        <div className={styles.container}>
          <div className={styles.message}>
            {getIcon()}
            {verificationMessage ? (
              <p>{verificationMessage}</p>
            ) : (
              <p>{userProfile.firstName}, We sent an email to {userProfile.email}. Please click the link to verify your email and get full access to Nessi Fishing Supply.</p>
            )}
          </div>
          {!userProfile.emailVerified && (
            <Button onClick={handleResendVerificationEmail}>Resend Verification Email</Button>
          )}
        </div>
      )}
    </>
  );
}