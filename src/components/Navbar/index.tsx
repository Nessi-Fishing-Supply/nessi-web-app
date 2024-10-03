"use client"; // Add this at the top of your component

import React from 'react';
import styles from './Navbar.module.scss';
import NotificationBar from '@components/NotificationBar';
import LogoFull from '@logos/logo_full.svg';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import { HiSearch } from 'react-icons/hi';
import Link from 'next/link';
import { useState } from 'react';
import Modal from '@components/Modal';

export default function Navbar() {
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const toggleModal = () => setModalOpen((prev) => !prev);

  return (
    <nav>
      <NotificationBar />
      <div className={styles.container}>
        <LogoFull className={styles.logo} />
        <form className={styles.form}>
          <input type="search" placeholder="Search Fishing Gear"></input>
          <button className={styles.form__button} type="submit">
            <HiSearch/>
          </button>
        </form>
        <button className={styles.button}>Sell Your Gear</button>
        <button onClick={toggleModal}  className={styles.link}>Sign Up / Log In</button>
        <Modal isOpen={isModalOpen} onClose={toggleModal} >
          <h2>Hello, I am a Modal!</h2>
          <p>Here is some content inside the modal</p>
        </Modal>
        <HiOutlineShoppingBag className={styles.icon}/>
      </div>
      <div className={styles.categories}>
        <Link href="#">Rods</Link>
        <Link href="#">Reels</Link>
        <Link href="#">Combos</Link>
        <Link href="#">Baits</Link>
        <Link href="#">Lures</Link>
        <Link href="#">Tackle</Link>
        <Link href="#">Line</Link>
        <Link href="#">Storage</Link>
        <Link href="#">Apparel</Link>
        <Link href="#">Bargain Bin</Link>
      </div> 
    </nav>
  );
}
