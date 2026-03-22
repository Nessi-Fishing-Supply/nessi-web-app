'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import styles from './navbar.module.scss';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HiBell,
  HiOutlineShoppingBag,
  HiOutlineHome,
  HiOutlineUserCircle,
  HiSearch,
  HiSwitchHorizontal,
} from 'react-icons/hi';

// Components
import NotificationBar from '@/components/navigation/notification-bar';
import Modal from '@/components/layout/modal';
import LoginForm from '@/features/auth/components/login-form';
import RegisterForm from '@/features/auth/components/registration-form';
import ResendVerificationForm from '@/features/auth/components/resend-verification-form';
import {
  Button,
  AppLink,
  Dropdown,
  DropdownItem,
  DropdownTitle,
  DropdownDivider,
} from '@/components/controls';

// Assets
import LogoFull from '@/assets/logos/logo_full.svg';

// Auth & Toast
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';
import { useToast } from '@/components/indicators/toast/context';
import { useMember } from '@/features/members/hooks/use-member';
import useContextStore from '@/features/context/stores/context-store';
import { useShop, useShopsByMember } from '@/features/shops/hooks/use-shops';

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

  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: member } = useMember(user?.id ?? '', !!user);
  const activeContext = useContextStore.use.activeContext();
  const switchToMember = useContextStore.use.switchToMember();
  const switchToShop = useContextStore.use.switchToShop();
  const { data: shops } = useShopsByMember(user?.id ?? '', !!user);
  const activeShopId = activeContext.type === 'shop' ? activeContext.shopId : '';
  const { data: activeShop } = useShop(activeShopId, activeContext.type === 'shop');
  const searchParams = useSearchParams();

  // Detect query params and open appropriate modals/toasts
  useEffect(() => {
    const loginQuery = searchParams?.get('login');
    const verified = searchParams?.get('verified');
    const authError = searchParams?.get('auth_error');
    const passwordReset = searchParams?.get('password_reset');

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

    if (passwordReset === 'true') {
      requestAnimationFrame(() =>
        showToast({
          type: 'success',
          message: 'Password updated!',
          description: 'Your password has been reset and you are now logged in.',
        }),
      );
    }

    // Clean up query params after consuming
    if (loginQuery || verified || authError || passwordReset) {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('verified');
      url.searchParams.delete('auth_error');
      url.searchParams.delete('password_reset');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams, showToast]);

  const handleLogout = async () => {
    try {
      useContextStore.getState().reset();
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
    showToast({
      type: 'success',
      message: 'Account created!',
      description: `Check your inbox at ${response.email} for a verification link.`,
      subtitle: 'Come back and sign in once verified.',
    });
  };

  const handleResendSuccess = (email: string) => {
    setResendModalOpen(false);
    showToast({
      type: 'success',
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

  const handleRegisterToLogin = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
    setLoginBanner(null);
  };

  const handleUnverifiedResend = () => {
    setLoginModalOpen(false);
    setResendModalOpen(true);
  };

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';

  // Determine displayed identity based on active context
  const isShopContext = mounted && activeContext.type === 'shop' && !!activeShop;
  const displayName = isShopContext ? activeShop.shop_name : `${firstName} ${lastName}`;
  const displayAvatarUrl = isShopContext ? activeShop.avatar_url : member?.avatar_url;
  const displayInitials = isShopContext
    ? (activeShop.shop_name?.[0] ?? '').toUpperCase()
    : `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`;

  // Filter shops available for switching (exclude current shop context)
  const switchableShops = shops?.filter((shop) => shop.id !== activeShopId) ?? [];
  const hasShops = (shops?.length ?? 0) > 0;

  return (
    <nav>
      <NotificationBar />
      <div className={styles.container}>
        <Link href="/" aria-label="Nessi — Home">
          <LogoFull className={styles.logo} aria-hidden="true" />
        </Link>
        <form className={styles.form} role="search" aria-label="Site search">
          <label htmlFor="site-search" className="sr-only">
            Search fishing gear
          </label>
          <input id="site-search" type="search" placeholder="Search Fishing Gear" />
          <button className={styles.searchButton} type="submit" aria-label="Submit search">
            <HiSearch aria-hidden="true" />
          </button>
        </form>
        <button className={styles.button} type="button" aria-disabled="true">
          Sell Your Gear
        </button>

        {mounted && isAuthenticated && <HiBell className={styles.icon} aria-hidden="true" />}

        {mounted && isAuthenticated && user ? (
          <Dropdown
            icon={
              displayAvatarUrl ? (
                <Image
                  src={displayAvatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  priority
                  className={styles.navAvatar}
                />
              ) : (
                <span className={styles.navAvatarInitials} aria-hidden="true">
                  {displayInitials}
                </span>
              )
            }
            ariaLabel="Account menu"
          >
            <DropdownItem isClickable={false}>
              <p>{displayName}</p>
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
              <AppLink href="/dashboard/listings" icon={<HiOutlineShoppingBag />}>
                Listings
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <Button onClick={handleLogout} fullWidth>
                Log Out
              </Button>
            </DropdownItem>
            {mounted && hasShops && (
              <>
                <DropdownDivider />
                <DropdownTitle>
                  <p>Switch context</p>
                </DropdownTitle>
                {isShopContext && (
                  <DropdownItem>
                    <button
                      type="button"
                      className={styles.switchItem}
                      onClick={() => {
                        switchToMember();
                        router.push('/dashboard');
                      }}
                    >
                      <span className={styles.switchAvatar} aria-hidden="true">
                        {(firstName?.[0] ?? '').toUpperCase()}
                        {(lastName?.[0] ?? '').toUpperCase()}
                      </span>
                      <span>
                        {firstName} {lastName}
                      </span>
                      <HiSwitchHorizontal className={styles.switchIcon} aria-hidden="true" />
                    </button>
                  </DropdownItem>
                )}
                {switchableShops.map((shop) => (
                  <DropdownItem key={shop.id}>
                    <button
                      type="button"
                      className={styles.switchItem}
                      onClick={() => {
                        switchToShop(shop.id, shop.shop_name ?? undefined);
                        router.push('/dashboard');
                      }}
                    >
                      {shop.avatar_url ? (
                        <Image
                          src={shop.avatar_url}
                          alt=""
                          width={24}
                          height={24}
                          className={styles.switchAvatarImage}
                        />
                      ) : (
                        <span className={styles.switchAvatar} aria-hidden="true">
                          {(shop.shop_name?.[0] ?? '').toUpperCase()}
                        </span>
                      )}
                      <span>{shop.shop_name}</span>
                      <HiSwitchHorizontal className={styles.switchIcon} aria-hidden="true" />
                    </button>
                  </DropdownItem>
                ))}
              </>
            )}
          </Dropdown>
        ) : (
          mounted && (
            <button onClick={toggleLoginModal} className={styles.link}>
              Sign Up / Log In
            </button>
          )
        )}

        <HiOutlineShoppingBag className={styles.icon} aria-hidden="true" />
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
          <span key={category} className={styles.categoryLink} role="link" aria-disabled="true">
            {category}
          </span>
        ))}
      </div>

      {/* Login Modal */}
      <Modal isOpen={isLoginModalOpen} onClose={toggleLoginModal} ariaLabelledBy="login-title">
        <div className={styles.modalHeader}>
          <h2 id="login-title">Log In</h2>
          <Button style="dark" round outline onClick={toggleRegisterModal}>
            Register
          </Button>
        </div>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={toggleLoginModal}
          onResendVerification={handleUnverifiedResend}
          banner={loginBanner}
        />
      </Modal>

      {/* Register Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={toggleRegisterModal}
        ariaLabelledBy="register-title"
      >
        <h2 id="register-title">Create Your Account</h2>
        <RegisterForm onSuccess={handleRegisterSuccess} onSwitchToLogin={handleRegisterToLogin} />
      </Modal>

      {/* Resend Verification Modal */}
      <Modal
        isOpen={isResendModalOpen}
        onClose={toggleResendModal}
        ariaLabel="Resend verification email"
      >
        <ResendVerificationForm
          onBackToLogin={handleResendToLogin}
          onSuccess={handleResendSuccess}
        />
      </Modal>
    </nav>
  );
}
