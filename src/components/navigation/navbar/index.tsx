'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

// Listings
import { LISTING_CATEGORIES } from '@/features/listings/constants/category';
import { useAutocomplete } from '@/features/listings/hooks/use-autocomplete';
import Autocomplete from '@/features/listings/components/autocomplete';
import SearchOverlay from '@/features/listings/components/search-overlay';
import type { AutocompleteSuggestion } from '@/features/listings/types/search';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSearchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const { data: searchSuggestions = [] } = useAutocomplete(searchQuery);
  const hasSearchSuggestions = searchSuggestions.length > 0 && searchQuery.length >= 3;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;

    if (searchActiveIndex >= 0 && searchSuggestions[searchActiveIndex]) {
      router.push(`/search?q=${encodeURIComponent(searchSuggestions[searchActiveIndex].term)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setShowAutocomplete(false);
    setSearchActiveIndex(-1);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasSearchSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchActiveIndex((prev) => (prev >= searchSuggestions.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchActiveIndex((prev) => (prev <= 0 ? searchSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setSearchActiveIndex(-1);
    }
  };

  const handleSearchSelect = (suggestion: AutocompleteSuggestion) => {
    router.push(`/search?q=${encodeURIComponent(suggestion.term)}`);
    setSearchQuery(suggestion.term);
    setShowAutocomplete(false);
    setSearchActiveIndex(-1);
  };

  // Detect query params and open appropriate modals/toasts
  useEffect(() => {
    const loginQuery = searchParams?.get('login');

    if (loginQuery === 'true') {
      requestAnimationFrame(() => setLoginModalOpen(true));
    }

    // Clean up query params after consuming
    if (loginQuery) {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

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
    if (isRegisterModalOpen) setRegisterModalOpen(false);
  };

  const toggleRegisterModal = () => {
    setRegisterModalOpen((prev) => !prev);
    if (isLoginModalOpen) setLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
  };

  const handleRegisterSuccess = () => {
    setRegisterModalOpen(false);
    showToast({
      type: 'success',
      message: 'Welcome to Nessi!',
      description: 'Your account is ready.',
    });
  };

  const handleRegisterToLogin = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
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

  const showOnboardingBanner = isAuthenticated && !!member && !member.onboarding_completed_at;

  // Filter shops available for switching (exclude current shop context)
  const switchableShops = shops?.filter((shop) => shop.id !== activeShopId) ?? [];
  const hasShops = (shops?.length ?? 0) > 0;

  return (
    <nav>
      <NotificationBar showOnboardingBanner={showOnboardingBanner} />
      <div className={styles.container}>
        <Link href="/" aria-label="Nessi — Home">
          <LogoFull className={styles.logo} aria-hidden="true" />
        </Link>
        <button
          className={styles.mobileSearchButton}
          type="button"
          onClick={() => setSearchOverlayOpen(true)}
          aria-label="Open search"
        >
          <HiSearch aria-hidden="true" />
        </button>
        <form
          className={styles.form}
          role="search"
          aria-label="Site search"
          onSubmit={handleSearchSubmit}
        >
          <label htmlFor="site-search" className="sr-only">
            Search fishing gear
          </label>
          <input
            ref={searchInputRef}
            id="site-search"
            type="search"
            placeholder="Search Fishing Gear"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchActiveIndex(-1);
              setShowAutocomplete(true);
            }}
            onFocus={() => setShowAutocomplete(true)}
            onBlur={() => {
              setTimeout(() => setShowAutocomplete(false), 200);
            }}
            onKeyDown={handleSearchKeyDown}
            aria-autocomplete="list"
            aria-controls={
              hasSearchSuggestions && showAutocomplete ? 'desktop-search-suggestions' : undefined
            }
            aria-activedescendant={
              searchActiveIndex >= 0
                ? `desktop-search-suggestions-option-${searchActiveIndex}`
                : undefined
            }
            autoComplete="off"
          />
          <button className={styles.searchButton} type="submit" aria-label="Submit search">
            <HiSearch aria-hidden="true" />
          </button>
          <Autocomplete
            suggestions={searchSuggestions}
            isOpen={hasSearchSuggestions && showAutocomplete}
            onSelect={handleSearchSelect}
            activeIndex={searchActiveIndex}
            listId="desktop-search-suggestions"
          />
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
                        showToast({
                          type: 'success',
                          message: `Now acting as ${firstName} ${lastName}`,
                          description: 'Your context has been switched.',
                        });
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
                        showToast({
                          type: 'success',
                          message: `Now acting as ${shop.shop_name}`,
                          description: 'Your context has been switched.',
                        });
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

        {mounted && !isShopContext && (
          <HiOutlineShoppingBag className={styles.icon} aria-hidden="true" />
        )}
      </div>

      <div className={styles.categories}>
        {LISTING_CATEGORIES.map((category) => (
          <Link
            key={category.value}
            href={`/category/${category.value}`}
            className={styles.categoryLink}
          >
            {category.label}
          </Link>
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
        <LoginForm onSuccess={handleLoginSuccess} onClose={toggleLoginModal} />
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

      <SearchOverlay isOpen={isSearchOverlayOpen} onClose={() => setSearchOverlayOpen(false)} />
    </nav>
  );
}
