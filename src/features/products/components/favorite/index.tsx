import React from 'react';
import styles from './favorite.module.scss';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

interface FavoriteProps {
  initialFavorite?: boolean;
  className?: string;
}

const Favorite: React.FC<FavoriteProps> = ({ initialFavorite = false, className }) => {
  const [isFavorite, setIsFavorite] = React.useState(initialFavorite);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <button className={`${styles.favorite} ${className}`} onClick={toggleFavorite}>
      {isFavorite ? <FaHeart className={`${styles.filled}`} /> : <FaRegHeart />}
    </button>
  );
};

export default Favorite;
