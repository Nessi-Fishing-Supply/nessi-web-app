import Link from 'next/link';
import Image from 'next/image';
import styles from './category-tile.module.scss';

interface CategoryTileProps {
  name: string;
  image: string;
  href: string;
  className?: string;
}

export default function CategoryTile({ name, image, href, className }: CategoryTileProps) {
  return (
    <Link href={href} className={`${styles.tile} ${className ?? ''}`}>
      <Image
        src={image}
        alt={name}
        fill
        sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 200px"
        style={{ objectFit: 'cover' }}
      />
      <div className={styles.overlay} aria-hidden="true" />
      <span className={styles.label}>{name}</span>
    </Link>
  );
}
