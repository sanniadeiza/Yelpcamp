/* eslint-disable */
import React from 'react';
import { Card } from 'react-bootstrap';
import StarRating from './StarRating';

const ReviewList = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        No reviews yet. Be the first to share your experience!
      </div>
    );
  }

  return (
    <div className="review-list mt-4">
      <h5 className="mb-3" style={{ fontWeight: 700 }}>Community Reviews</h5>
      {reviews.map((review) => (
        <Card key={review.id} className="glass-card mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <Card.Title className="mb-0" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {review.author}
                </Card.Title>
                <StarRating rating={review.rating} readOnly size="0.9rem" />
              </div>
              <small className="text-muted">
                {new Date(review.createdAt).toLocaleDateString()}
              </small>
            </div>
            <Card.Text style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {review.content}
            </Card.Text>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default ReviewList;
