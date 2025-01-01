"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { verifyEmail, resendVerificationEmail } from "@services/auth";
import { getUserProfile } from "@services/user";
import { useAuth } from '@context/auth';
import styles from './VerifyEmail.module.scss'
import { HiOutlineExclamationCircle, HiOutlineXCircle, HiOutlineCheckCircle } from 'react-icons/hi';
import Button from '@components/controls/Button';

export default function VerifyEmailBanner() {
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<boolean>(false);
  const { isAuthenticated, token, setUserProfile, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const hasRunEffect = useRef(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);

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

    if (isAuthenticated) {
      verifyEmail();
    }
  }, [searchParams, isAuthenticated, userProfile?.emailVerified, verificationInProgress]);

  // Check if email is already verified
  const checkIfEmailAlreadyVerified = async (): Promise<boolean> => {
    if (userProfile?.emailVerified) {
      setVerificationMessage(null);
      setShowBanner(false); // Hide the banner if email is already verified
      return true;
    }

    if (isAuthenticated && token) {
      try {
        const profile = await getUserProfile(token);
        if (profile && profile.emailVerified) {
          setUserProfile(profile);
          setVerificationMessage(null);
          setShowBanner(false); // Hide the banner if email is already verified
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
        localStorage.setItem('emailVerified', 'true'); // Store flag in local storage
        setTimeout(() => {
          setShowBanner(false); // Hide the banner after showing the success message
        }, 5000);
      } else {
        setVerificationMessage('Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during email verification:', error);
      setVerificationMessage('Verification failed. Please try again later.');
      setVerificationInProgress(false);
    }
  };

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

  useEffect(() => {
    if (verificationMessage?.includes('successfully')) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 5000); // Hide the banner after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [verificationMessage]);

  if (!isAuthenticated || !showBanner) {
    return null;
  }

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