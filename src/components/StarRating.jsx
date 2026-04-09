/* eslint-disable */
import React, { useState } from 'react';

const StarRating = ({ 
  rating, 
  maxStars = 5, 
  onRatingChange, 
  readOnly = false,
  size = '1.2rem'
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating d-inline-flex align-items-center">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= (hover || rating);
        
        return (
          <span
            key={index}
            style={{ 
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: size,
              color: isActive ? 'var(--warning, #ffc107)' : 'var(--glass-border, #ccc)',
              transition: 'all 0.2s ease',
              marginRight: '2px'
            }}
            onMouseEnter={() => !readOnly && setHover(starValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onRatingChange && onRatingChange(starValue)}
          >
            {isActive ? '★' : '☆'}
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
