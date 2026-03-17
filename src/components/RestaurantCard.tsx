import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import StarRating from './StarRating';

interface RestaurantCardProps {
  name: string;
  description: string;
  city: string;
  image?: string;
  onClick?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ name, description, city, image, onClick }: RestaurantCardProps) => {
  // Fallback image if none provided
  const placeholderImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800';
  
  return (
    <Card className="glass-card h-100 border-0 overflow-hidden" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ height: '200px', overflow: 'hidden' }}>
        <Card.Img 
          variant="top" 
          src={image || placeholderImage} 
          style={{ 
            objectFit: 'cover', 
            height: '100%', 
            transition: 'transform 0.5s ease' 
          }}
          className="card-image-hover"
        />
      </div>
      <Card.Body className="d-flex flex-column p-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Badge variant="primary" style={{ backgroundColor: 'var(--primary)', padding: '5px 12px', borderRadius: '6px' }}>
            {city}
          </Badge>
          <div className="d-flex align-items-center">
            <StarRating rating={4.5} readOnly size="0.9rem" />
            <span className="ms-1 fw-bold" style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginLeft: '4px' }}>4.5</span>
          </div>
        </div>
        <Card.Title style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem' }}>
          {name}
        </Card.Title>
        <Card.Text style={{ color: 'var(--text-muted)', fontSize: '0.95rem', flexGrow: 1 }}>
          {description}
        </Card.Text>
        <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--glass-border)' }}>
          <small className="text-muted">Verified Location</small>
          <small className="text-primary fw-bold" style={{ cursor: 'pointer' }}>View Details →</small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RestaurantCard;
