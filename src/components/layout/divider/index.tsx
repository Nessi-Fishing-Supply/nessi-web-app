import React from 'react';
import styles from './Divider.module.scss';

interface DividerProps {
  text: string;
}

const Divider: React.FC<DividerProps> = ({ text }) => {
  return (
    <div className={`${styles.container}`}>
      <hr />
      <p>{text}</p>
      <hr />
    </div>
  );
};

export default Divider;
