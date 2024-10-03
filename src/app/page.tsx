// import styles from './page.module.scss';
import Navbar from '@components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <main>
        <Navbar />
        <Link href="/marketplace">
          Go to Marketplace
        </Link>
      </main>
    </div>
  );
}
