"use client";

import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.scss';
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
import LoginForm from '@/components/forms/login';
import RegisterForm from '@/components/forms/registration';
import { Button, AppLink, Dropdown, DropdownItem, DropdownTitle } from '@/components/controls';

// Assets
import LogoFull from '@/assets/logos/logo_full.svg';

// Auth
import { useAuth } from '@/context/auth';
import { logout, getUserProfile } from '@/services/auth';
import { User } from '@supabase/supabase-js';

/**
 * Main navigation component
 * Handles user authentication state
 * Manages login/registration modals
 * Provides user menu and navigation
 */
export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { isAuthenticated, setAuthenticated, setToken } = useAuth();
  const searchParams = useSearchParams();
  const loginQuery = searchParams?.get('login');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loginQuery === 'true') {
      setLoginModalOpen(true);
    }
  }, [loginQuery]);

  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated) {
        try {
          const user = await getUserProfile();
          setUser(user);
        } catch (err) {
          const error = err as Error;
          console.error('Failed to fetch user:', error);
          if (error.message === 'Auth session missing!') {
            setAuthenticated(false);
          }
        }
      }
    };
    fetchUser();
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      setAuthenticated(false);
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const toggleLoginModal = () => {
    setLoginModalOpen(prev => !prev);
    if (isRegisterModalOpen) setRegisterModalOpen(false);
  };

  const toggleRegisterModal = () => {
    setRegisterModalOpen(prev => !prev);
    setRegisterSuccess(false);
    if (isLoginModalOpen) setLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
  };

  const handleRegisterSuccess = (response: { message: string }) => {
    setRegisterSuccess(true);
    console.log(response.message);
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
          <button className={styles.form__button} type="submit">
            <HiSearch />
          </button>
        </form>
        <button className={styles.button}>Sell Your Gear</button>

        {mounted && isAuthenticated && <HiBell className={styles.icon} />}

        {mounted && isAuthenticated && user ? (
          <Dropdown icon={<HiUser />}>
            <DropdownItem isClickable={false}>
              <p>{firstName} {lastName}</p>
            </DropdownItem>
            <DropdownTitle><p>My Account</p></DropdownTitle>
            <DropdownItem>
              <AppLink href="/dashboard" icon={<HiOutlineHome />}>Dashboard</AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>Account</AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/products" icon={<HiOutlineShoppingBag />}>Products</AppLink>
            </DropdownItem>
            <DropdownItem>
              <Button onClick={handleLogout} fullWidth>Log Out</Button>
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
          'Rods', 'Reels', 'Combos', 'Baits', 'Lures',
          'Tackle', 'Line', 'Storage', 'Apparel', 'Bargain Bin',
        ].map(category => (
          <Link key={category} href="#">{category}</Link>
        ))}
      </div>

      <Modal isOpen={isLoginModalOpen} onClose={toggleLoginModal}>
        <div className={styles.modalHeader}>
          <h6>Log In</h6>
          <Button style="dark" round outline onClick={toggleRegisterModal}>
            Register
          </Button>
        </div>
        <LoginForm
          onSuccess={handleLoginSuccess}
          redirectUrl="/dashboard"
        />
      </Modal>

      <Modal isOpen={isRegisterModalOpen} onClose={toggleRegisterModal}>
        <h6>Create Your Account</h6>
        {registerSuccess && (
          <p className="successMessage">
            Registration successful! Please check your inbox to verify your email before logging in.
          </p>
        )}
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </Modal>
    </nav>
  );
}
