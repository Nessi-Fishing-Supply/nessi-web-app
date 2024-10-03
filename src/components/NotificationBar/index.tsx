import React from 'react';
import styles from './NotificationBar.module.scss';
import { HiChevronRight } from 'react-icons/hi';

export default function NotificationBar() {
  return (
    <div className={styles.container}>
      <p className={styles.text}>Maker’s Week | Shop Unique and Custom Baits</p>
      <a className={styles.link}>
        <span>Link Text</span>
        <HiChevronRight className={styles.icon}/>
      </a>
    </div>
  );
}
