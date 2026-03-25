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
  HiCheckCircle,
  HiOutlineX,
} from 'react-icons/hi';

// Components
import NotificationBar from '@/components/navigation/notification-bar';
import Modal from '@/components/layout/modal';
import LoginForm from '@/features/auth/components/login-form';
import RegisterForm from '@/features/auth/components/registration-form';
import { Button, AppLink, Dropdown, DropdownItem, DropdownTitle } from '@/components/controls';

// Assets
import LogoFull from '@/assets/logos/logo_full.svg';

// Listings
import { LISTING_CATEGORIES } from '@/features/listings/constants/category';
import { useAutocomplete } from '@/features/listings/hooks/use-autocomplete';
import DesktopSearchDropdown from '@/features/listings/components/desktop-search-dropdown';
import SearchOverlay from '@/features/listings/components/search-overlay';
import { useRecentSearches } from '@/features/listings/hooks/use-recent-searches';
import type { AutocompleteSuggestion } from '@/features/listings/types/search';
import type { ListingCategory } from '@/features/listings/types/listing';

// Cart
import CartIcon from '@/features/cart/components/cart-icon';
import { useCartMerge } from '@/features/cart/hooks/use-cart-merge';
import { useRecentlyViewedMerge } from '@/features/recently-viewed/hooks/use-recently-viewed-merge';

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
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteAcceptedShopName, setInviteAcceptedShopName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useRecentSearches();

  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: member } = useMember(user?.id ?? '', !!user);
  const activeContext = useContextStore.use.activeContext();
  const switchToMember = useContextStore.use.switchToMember();
  const switchToShop = useContextStore.use.switchToShop();
  useCartMerge();
  useRecentlyViewedMerge();
  const { data: shops } = useShopsByMember(user?.id ?? '', !!user);
  const activeShopId = activeContext.type === 'shop' ? activeContext.shopId : '';
  const { data: activeShop } = useShop(activeShopId, activeContext.type === 'shop');
  const searchParams = useSearchParams();

  const { data: searchSuggestions = [] } = useAutocomplete(searchQuery);
  const hasSearchSuggestions = searchSuggestions.length > 0 && searchQuery.length >= 2;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;

    const term =
      searchActiveIndex >= 0 && searchSuggestions[searchActiveIndex]
        ? searchSuggestions[searchActiveIndex].term
        : searchQuery.trim();

    addRecentSearch(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setShowDropdown(false);
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
      setShowDropdown(false);
      setSearchActiveIndex(-1);
    }
  };

  const handleSearchSelect = (suggestion: AutocompleteSuggestion) => {
    addRecentSearch(suggestion.term);
    router.push(`/search?q=${encodeURIComponent(suggestion.term)}`);
    setSearchQuery(suggestion.term);
    setShowDropdown(false);
    setSearchActiveIndex(-1);
  };

  const handleCategorySelect = (category: ListingCategory) => {
    router.push(`/search?category=${category}`);
    setShowDropdown(false);
    searchInputRef.current?.blur();
  };

  const handleRecentSearchSelect = (term: string) => {
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setSearchQuery(term);
    setShowDropdown(false);
    searchInputRef.current?.blur();
  };

  // Detect query params and open appropriate modals/toasts
  useEffect(() => {
    const loginQuery = searchParams?.get('login');
    const registerQuery = searchParams?.get('register');
    const inviteQuery = searchParams?.get('invite');

    if (registerQuery === 'true') {
      requestAnimationFrame(() => {
        if (inviteQuery) {
          setInviteToken(inviteQuery);
        }
        setRegisterModalOpen(true);
      });
    } else if (loginQuery === 'true') {
      requestAnimationFrame(() => setLoginModalOpen(true));
    }

    // Clean up query params after consuming
    if (loginQuery || registerQuery || inviteQuery) {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('register');
      url.searchParams.delete('invite');
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
    setRegisterModalOpen((prev) => {
      // Clear invite token when closing register modal
      if (prev) {
        setInviteToken(null);
        setInviteAcceptedShopName(null);
      }
      return !prev;
    });
    if (isLoginModalOpen) setLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
  };

  const handleInviteAccepted = (data: { shopName: string }) => {
    setInviteAcceptedShopName(data.shopName);
  };

  const handleRegisterSuccess = () => {
    setRegisterModalOpen(false);

    if (inviteAcceptedShopName) {
      showToast({
        type: 'success',
        message: `You've joined ${inviteAcceptedShopName}!`,
        description: 'You now have access to this shop.',
      });
      setInviteAcceptedShopName(null);
      setInviteToken(null);
      router.push('/dashboard');
    } else if (inviteToken) {
      // Invite was present but auto-accept failed
      showToast({
        type: 'error',
        message: "We couldn't auto-join the shop.",
        description: 'Try accepting the invite from your dashboard.',
      });
      setInviteToken(null);
    } else {
      showToast({
        type: 'success',
        message: 'Welcome to Nessi!',
        description: 'Your account is ready.',
      });
    }
  };

  const handleRegisterToLogin = () => {
    setRegisterModalOpen(false);
    setInviteToken(null);
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
          <div className={styles.searchPill}>
            <span className={styles.searchPillIcon}>
              <HiSearch aria-hidden="true" />
            </span>
            <input
              ref={searchInputRef}
              id="site-search"
              type="search"
              role="combobox"
              placeholder="Search fishing gear..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchActiveIndex(-1);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 200);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={showDropdown ? 'desktop-search-suggestions' : undefined}
              aria-activedescendant={
                searchActiveIndex >= 0
                  ? `desktop-search-suggestions-option-${searchActiveIndex}`
                  : undefined
              }
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  setSearchQuery('');
                  setSearchActiveIndex(-1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <HiOutlineX aria-hidden="true" />
              </button>
            )}
            <button className={styles.searchSubmit} type="submit" aria-label="Submit search">
              <HiSearch aria-hidden="true" />
            </button>
          </div>
          <DesktopSearchDropdown
            isOpen={showDropdown}
            query={searchQuery}
            suggestions={searchSuggestions}
            showSuggestions={hasSearchSuggestions}
            activeIndex={searchActiveIndex}
            listId="desktop-search-suggestions"
            recentSearches={recentSearches}
            onSelectSuggestion={handleSearchSelect}
            onSelectRecentSearch={handleRecentSearchSelect}
            onRemoveRecentSearch={removeRecentSearch}
            onClearRecentSearches={clearRecentSearches}
            onSelectCategory={handleCategorySelect}
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
            {member?.is_seller && (
              <DropdownItem>
                <AppLink href="/dashboard/listings" icon={<HiOutlineShoppingBag />}>
                  Listings
                </AppLink>
              </DropdownItem>
            )}
            <DropdownItem>
              <Button onClick={handleLogout} fullWidth>
                Log Out
              </Button>
            </DropdownItem>
            {mounted && hasShops && (
              <>
                <DropdownTitle>
                  <p>Profiles</p>
                </DropdownTitle>
                <div className={styles.profilesList}>
                  <DropdownItem>
                    <button
                      type="button"
                      className={styles.switchItem}
                      onClick={() => {
                        if (isShopContext) {
                          switchToMember();
                          showToast({
                            type: 'success',
                            message: `Now acting as ${firstName} ${lastName}`,
                            description: 'Your context has been switched.',
                          });
                        }
                      }}
                      aria-current={!isShopContext ? 'true' : undefined}
                    >
                      {member?.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className={styles.switchAvatarImage}
                        />
                      ) : (
                        <span className={styles.switchAvatar} aria-hidden="true">
                          {(firstName?.[0] ?? '').toUpperCase()}
                          {(lastName?.[0] ?? '').toUpperCase()}
                        </span>
                      )}
                      <span>
                        {firstName} {lastName}
                      </span>
                      {!isShopContext ? (
                        <HiCheckCircle className={styles.activeIcon} aria-label="Active profile" />
                      ) : (
                        <HiSwitchHorizontal className={styles.switchIcon} aria-hidden="true" />
                      )}
                    </button>
                  </DropdownItem>
                  {shops?.map((shop) => {
                    const isActive = activeShopId === shop.id;
                    return (
                      <DropdownItem key={shop.id}>
                        <button
                          type="button"
                          className={styles.switchItem}
                          onClick={() => {
                            if (!isActive) {
                              switchToShop(shop.id, shop.shop_name ?? undefined);
                              showToast({
                                type: 'success',
                                message: `Now acting as ${shop.shop_name}`,
                                description: 'Your context has been switched.',
                              });
                            }
                          }}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          {shop.avatar_url ? (
                            <Image
                              src={shop.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              className={styles.switchAvatarImage}
                            />
                          ) : (
                            <span className={styles.switchAvatar} aria-hidden="true">
                              {(shop.shop_name?.[0] ?? '').toUpperCase()}
                            </span>
                          )}
                          <span>{shop.shop_name}</span>
                          {isActive ? (
                            <HiCheckCircle
                              className={styles.activeIcon}
                              aria-label="Active profile"
                            />
                          ) : (
                            <HiSwitchHorizontal className={styles.switchIcon} aria-hidden="true" />
                          )}
                        </button>
                      </DropdownItem>
                    );
                  })}
                </div>
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

        {mounted && <CartIcon />}
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
        <RegisterForm
          onSuccess={handleRegisterSuccess}
          onSwitchToLogin={handleRegisterToLogin}
          inviteToken={inviteToken ?? undefined}
          onInviteAccepted={handleInviteAccepted}
        />
      </Modal>

      <SearchOverlay isOpen={isSearchOverlayOpen} onClose={() => setSearchOverlayOpen(false)} />
    </nav>
  );
}
