import React, { ReactNode } from 'react';
import styles from './grid.module.scss';

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
