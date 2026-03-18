import React from 'react';
import styles from './side-nav.module.scss';
import { HiOutlineHome, HiOutlineUserCircle, HiOutlineShoppingBag } from 'react-icons/hi'; // Import the product icon
import AppLink from '@/components/controls/app-link';

const SideNav = () => {
  return (
    <nav className={styles.sideNav}>
      <ul>
        <li>
          <AppLink href="/dashboard" icon={<HiOutlineHome />}>
            Dashboard
          </AppLink>
        </li>
        <li>
          <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>
            Account
          </AppLink>
        </li>
        <li>
          <AppLink href="/dashboard/products" icon={<HiOutlineShoppingBag />}>
            Products
          </AppLink>{' '}
          {/* Update icon here */}
        </li>
      </ul>
    </nav>
  );
};

export default SideNav;
