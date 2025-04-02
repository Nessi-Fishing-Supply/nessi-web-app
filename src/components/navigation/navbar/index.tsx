"use client";

import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.scss';
import NotificationBar from '@components/navigation/notification-bar';
import LogoFull from '@logos/logo_full.svg';
import { HiBell, HiOutlineShoppingBag, HiUser, HiOutlineHome, HiOutlineUserCircle, HiSearch } from 'react-icons/hi';
import Link from 'next/link';
import Modal from '@components/layout/modal';
import LoginForm from '@components/forms/login';
import Button from '@components/controls/button';
import RegisterForm from '@components/forms/registration';
import { useAuth } from '@context/auth';
import { Dropdown, DropdownItem, DropdownTitle } from '@components/controls/dropdown';
import { logout, getUserProfile } from '@services/auth';
import AppLink from '@components/controls/app-link';
import { useSearchParams } from 'next/navigation';

export default function Navbar() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const { isAuthenticated, setAuthenticated, setToken } = useAuth();
  const searchParams = useSearchParams();
  const loginQuery = searchParams?.get('login');

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
          console.error('Failed to fetch user:', err);
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

        {isAuthenticated && <HiBell className={styles.icon} />}

        {isAuthenticated && user ? (
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
          <button onClick={toggleLoginModal} className={styles.link}>Sign Up / Log In</button>
        )}

        <HiOutlineShoppingBag className={styles.icon} />
      </div>

      <div className={styles.categories}>
        {['Rods', 'Reels', 'Combos', 'Baits', 'Lures', 'Tackle', 'Line', 'Storage', 'Apparel', 'Bargain Bin'].map(category => (
          <Link key={category} href="#">{category}</Link>
        ))}
      </div>

      {/* Login Modal */}
      <Modal isOpen={isLoginModalOpen} onClose={toggleLoginModal}>
        <div className={styles.modalHeader}>
          <h6>Log In</h6>
          <Button style="dark" round outline onClick={toggleRegisterModal}>Register</Button>
        </div>
        <LoginForm onSubmit={() => setLoginModalOpen(false)} onForgotPasswordClick={toggleLoginModal} />
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={toggleRegisterModal}>
        <h6>Create Your Account</h6>
        {registerSuccess && (
          <p className="successMessage">Registration successful! Please check your inbox to verify your email before logging in.</p>
        )}
        <RegisterForm onSubmit={() => setRegisterSuccess(true)} />
      </Modal>
    </nav>
  );
}
