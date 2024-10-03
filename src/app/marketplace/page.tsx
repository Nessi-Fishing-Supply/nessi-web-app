import React from 'react';
import styles from './marketplace.module.css';
import Navbar from '@components/Navbar';

export default function Marketplace() {
  return (
    <div>
      <Navbar />
      <h1 className={styles.title}>This is a marketplace page</h1>
    </div>
  );
}
