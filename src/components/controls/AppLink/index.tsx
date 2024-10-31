import React, { AnchorHTMLAttributes, ReactNode } from 'react';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import styles from './AppLink.module.scss';

// Props for external links
interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

// Props for internal Next.js links
interface InternalLinkProps extends NextLinkProps {
  href: string | { pathname: string; query?: Record<string, string | number | boolean | undefined> };
}

// Combine external and internal props along with additional custom props
type AppLinkProps = (InternalLinkProps | ExternalLinkProps) & {
  style?: 'primary' | 'secondary';
  underline?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  center?: boolean;
  icon?: ReactNode;
  children: ReactNode; 
};

const AppLink: React.FC<AppLinkProps> = ({
  href,
  children,
  style = 'primary',
  size = 'md',
  fullWidth = false,
  underline = false,
  center = false,
  icon = null,
  ...props
}) => {
  // Check if it's an external link
  const isExternal = typeof href === 'string' && (href.startsWith('http') || href.startsWith('//'));

  // Generate the class names dynamically
  const linkClassName = `
    ${styles.link}
    ${styles[style]}
    ${styles[size]}
    ${underline ? styles.underline : ''}
    ${center ? styles.center : ''}
    ${fullWidth ? styles.fullWidth : ''}
  `;

  if (isExternal) {
    // Handle external links
    return (
      <a href={href} className={linkClassName} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
        {icon && <span className={styles.icon}>{icon}</span>}
      </a>
    );
  }

  // Handle internal Next.js links
  return (
    <NextLink href={href} passHref className={linkClassName} {...props}>
      {children}
      {icon && <span className={styles.icon}>{icon}</span>}
    </NextLink>
  );
};

export default AppLink;
