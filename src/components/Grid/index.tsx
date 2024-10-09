import React, { ReactNode, CSSProperties } from 'react';
import styles from './Grid.module.scss';

interface GridProps {
  columns?: number;
  children: ReactNode;
}

const Grid: React.FC<GridProps> = ({ columns = 2, children }) => {
  return (
    <div className={styles.container} data-columns={columns}>
      {children}
    </div>
  );
};

export default Grid;
