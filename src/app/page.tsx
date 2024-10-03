// import styles from './page.module.scss';
import Navbar from '@components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <main>
<<<<<<< HEAD
        <h1 className={styles.title}>The start of Nessi Fishing Supply&#39;s staging environment. I should be Yellow!</h1>
=======
        <Navbar />
        <Link href="/marketplace">
          Go to Marketplace
        </Link>
>>>>>>> dev
      </main>
    </div>
  );
}
