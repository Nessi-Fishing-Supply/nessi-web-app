'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import styles from './navbar.module.scss';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HiBell,
  HiOutlineShoppingBag,
  HiUser,
  HiOutlineHome,
  HiOutlineUserCircle,
  HiSearch,
} from 'react-icons/hi';

// Components
import NotificationBar from '@/components/navigation/notification-bar';
import Modal from '@/components/layout/modal';
import Toast from '@/components/indicators/toast';
import LoginForm from '@/features/auth/components/login-form';
import RegisterForm from '@/features/auth/components/registration-form';
import ResendVerificationForm from '@/features/auth/components/resend-verification-form';
import { Button, AppLink, Dropdown, DropdownItem, DropdownTitle } from '@/components/controls';

// Assets
import LogoFull from '@/assets/logos/logo_full.svg';

// Auth
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';

export default function Navbar() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isResendModalOpen, setResendModalOpen] = useState(false);
  const [loginBanner, setLoginBanner] = useState<{ type: 'verified' } | null>(null);

  // Toast state for auth success notifications
  const [toast, setToast] = useState<{
    visible: boolean;
    email: string;
    message: string;
    description: string;
    subtitle: string;
  }>({ visible: false, email: '', message: '', description: '', subtitle: '' });

  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  // Detect query params and open appropriate modals
  useEffect(() => {
    const loginQuery = searchParams?.get('login');
    const verified = searchParams?.get('verified');
    const authError = searchParams?.get('auth_error');

    if (loginQuery === 'true') {
      requestAnimationFrame(() => setLoginModalOpen(true));
    }

    if (verified === 'true') {
      requestAnimationFrame(() => {
        setLoginBanner({ type: 'verified' });
        setLoginModalOpen(true);
      });
    }

    if (authError === 'true') {
      requestAnimationFrame(() => setResendModalOpen(true));
    }

    // Clean up query params after consuming
    if (loginQuery || verified || authError) {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('verified');
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch {
      // Logout failed silently — user stays on page
    }
  };

  const toggleLoginModal = () => {
    setLoginModalOpen((prev) => !prev);
    setLoginBanner(null);
    if (isRegisterModalOpen) setRegisterModalOpen(false);
    if (isResendModalOpen) setResendModalOpen(false);
  };

  const toggleRegisterModal = () => {
    setRegisterModalOpen((prev) => !prev);
    if (isLoginModalOpen) setLoginModalOpen(false);
    if (isResendModalOpen) setResendModalOpen(false);
  };

  const toggleResendModal = () => {
    setResendModalOpen((prev) => !prev);
    if (isLoginModalOpen) setLoginModalOpen(false);
    if (isRegisterModalOpen) setRegisterModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
    setLoginBanner(null);
  };

  const handleRegisterSuccess = (response: { message: string; email?: string }) => {
    setRegisterModalOpen(false);
    setToast({
      visible: true,
      email: response.email || '',
      message: 'Account created!',
      description: `Check your inbox at ${response.email} for a verification link.`,
      subtitle: 'Come back and sign in once verified.',
    });
  };

  const handleResendSuccess = (email: string) => {
    setResendModalOpen(false);
    setToast({
      visible: true,
      email,
      message: 'Verification email sent!',
      description: `If an account exists for ${email}, you'll receive a verification link shortly.`,
      subtitle: 'Check your inbox and sign in once verified.',
    });
  };

  const handleResendToLogin = () => {
    setResendModalOpen(false);
    setLoginModalOpen(true);
    setLoginBanner(null);
  };

  const handleUnverifiedResend = () => {
    setLoginModalOpen(false);
    setResendModalOpen(true);
  };

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';

  return (
    <nav>
      <NotificationBar />
      <div className={styles.container}>
        <Link href="/">
          <LogoFull className={styles.logo} />
        </Link>
        <form className={styles.form}>
          <input type="search" placeholder="Search Fishing Gear" />
          <button className={styles.searchButton} type="submit">
            <HiSearch />
          </button>
        </form>
        <button className={styles.button}>Sell Your Gear</button>

        {mounted && isAuthenticated && <HiBell className={styles.icon} />}

        {mounted && isAuthenticated && user ? (
          <Dropdown icon={<HiUser />}>
            <DropdownItem isClickable={false}>
              <p>
                {firstName} {lastName}
              </p>
            </DropdownItem>
            <DropdownTitle>
              <p>My Account</p>
            </DropdownTitle>
            <DropdownItem>
              <AppLink href="/dashboard" icon={<HiOutlineHome />}>
                Dashboard
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>
                Account
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/products" icon={<HiOutlineShoppingBag />}>
                Products
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <Button onClick={handleLogout} fullWidth>
                Log Out
              </Button>
            </DropdownItem>
          </Dropdown>
        ) : (
          mounted && (
            <button onClick={toggleLoginModal} className={styles.link}>
              Sign Up / Log In
            </button>
          )
        )}

        <HiOutlineShoppingBag className={styles.icon} />
      </div>

      <div className={styles.categories}>
        {[
          'Rods',
          'Reels',
          'Combos',
          'Baits',
          'Lures',
          'Tackle',
          'Line',
          'Storage',
          'Apparel',
          'Bargain Bin',
        ].map((category) => (
          <Link key={category} href="#">
            {category}
          </Link>
        ))}
      </div>

      {/* Login Modal */}
      <Modal isOpen={isLoginModalOpen} onClose={toggleLoginModal}>
        <div className={styles.modalHeader}>
          <h6>Log In</h6>
          <Button style="dark" round outline onClick={toggleRegisterModal}>
            Register
          </Button>
        </div>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={toggleLoginModal}
          onResendVerification={handleUnverifiedResend}
          redirectUrl="/dashboard"
          banner={loginBanner}
        />
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={toggleRegisterModal}>
        <h6>Create Your Account</h6>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </Modal>

      {/* Resend Verification Modal */}
      <Modal isOpen={isResendModalOpen} onClose={toggleResendModal}>
        <ResendVerificationForm onBackToLogin={handleResendToLogin} onSuccess={handleResendSuccess} />
      </Modal>

      {/* Registration Success Toast */}
      <Toast
        visible={toast.visible}
        type="success"
        message={toast.message}
        description={toast.description}
        subtitle={toast.subtitle}
        onDismiss={() =>
          setToast({ visible: false, email: '', message: '', description: '', subtitle: '' })
        }
      />
    </nav>
  );
}
