'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './maker-story-block.module.scss';

interface MakerStoryBlockProps {
  quote: string;
  author: string;
  shopName: string;
  image: string;
  imageCaption?: string;
  narrative: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export default function MakerStoryBlock({
  quote,
  author,
  shopName,
  image,
  imageCaption,
  narrative,
  ctaLabel,
  ctaHref,
  className,
}: MakerStoryBlockProps) {
  return (
    <div className={`${styles.block}${className ? ` ${className}` : ''}`}>
      <figure className={styles.figure}>
        <div className={styles.imageWrap}>
          <Image
            src={image}
            alt={`${author} from ${shopName}`}
            fill
            sizes="(max-width: 768px) 100vw, 200px"
            style={{ objectFit: 'cover' }}
          />
        </div>
        {imageCaption && <figcaption className={styles.caption}>{imageCaption}</figcaption>}
      </figure>
      <div className={styles.content}>
        <blockquote className={styles.pullQuote}>
          <p className={styles.quoteText}>{quote}</p>
          <cite className={styles.cite}>
            {author} &mdash; <span className={styles.shopName}>{shopName}</span>
          </cite>
        </blockquote>
        <p className={styles.narrative}>{narrative}</p>
        <Link href={ctaHref} className={styles.cta}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
