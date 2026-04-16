/* eslint-disable */
// @ts-nocheck
import Amplify, { API, Auth, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
import React, { useEffect, useReducer, useState } from 'react';
import { Button, Col, Container, Form, Row, Modal, Badge } from 'react-bootstrap';

import './App.css';
import awsConfig from './aws-exports.js';
import { createRestaurant, deleteRestaurant, createReview } from './graphql/mutations';
import { listRestaurants, reviewsByRestaurantID } from './graphql/queries';
import { onCreateRestaurant, onDeleteRestaurant } from './graphql/subscriptions';

import Header from './components/Header';
import RestaurantCard from './components/RestaurantCard';
import StarRating from './components/StarRating';
import ReviewList from './components/ReviewList';
import LocationMap from './components/LocationMap';

Amplify.configure(awsConfig);

const initialState = {
  restaurants: [],
  formData: { name: '', city: '', description: '' },
  searchTerm: '',
  nextToken: null,
  loading: false,
  selectedRestaurant: null,
  isMapView: false,
  creating: false,
  error: null,
  fetchError: null,
  reviews: [],
  reviewLoading: false,
  showReviewModal: false,
  reviewFormData: { rating: 5, content: '' },
  reviewCreating: false,
  reviewError: null,
  listFetchError: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'QUERY':
      return { ...state, restaurants: action.payload.items, nextToken: action.payload.nextToken, loading: false };
    case 'APPEND_PAGE':
      return { ...state, restaurants: [...state.restaurants, ...action.payload.items], nextToken: action.payload.nextToken, loading: false };
    case 'SUBSCRIPTION':
      return { ...state, restaurants: [action.payload, ...state.restaurants] };
    case 'DELETE_SUBSCRIPTION':
      return { ...state, restaurants: state.restaurants.filter(r => r.id !== action.payload.id) };
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SELECTED_RESTAURANT':
      return { ...state, selectedRestaurant: action.payload };
    case 'TOGGLE_MAP_VIEW':
      return { ...state, isMapView: !state.isMapView };
    case 'SET_CREATING':
      return { ...state, creating: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FETCH_ERROR':
      return { ...state, fetchError: action.payload };
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload, reviewLoading: false };
    case 'SET_REVIEW_LOADING':
      return { ...state, reviewLoading: action.payload };
    case 'SET_SHOW_REVIEW_MODAL':
      return { ...state, showReviewModal: action.payload, reviewError: null };
    case 'SET_REVIEW_FORM_DATA':
      return { ...state, reviewFormData: { ...state.reviewFormData, ...action.payload } };
    case 'SET_REVIEW_CREATING':
      return { ...state, reviewCreating: action.payload };
    case 'SET_REVIEW_ERROR':
      return { ...state, reviewError: action.payload };
    case 'SET_LIST_FETCH_ERROR':
      return { ...state, listFetchError: action.payload };
    default:
      return state;
  }
};

const restaurantImages = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&q=80&w=800',
];

const getRestaurantImage = (index) => restaurantImages[index % restaurantImages.length];

const App = () => {
  const [showModal, setShowModal] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getRestaurantList();

    const subscription = API.graphql({
      query: onCreateRestaurant,
      authMode: 'API_KEY'
    }).subscribe({
      next: (eventData) => {
        const payload = eventData.value.data.onCreateRestaurant;
        dispatch({ type: 'SUBSCRIPTION', payload });
      },
    });

    const deleteSub = API.graphql({
      query: onDeleteRestaurant,
      authMode: 'API_KEY'
    }).subscribe({
      next: (eventData) => {
        const payload = eventData.value.data.onDeleteRestaurant;
        dispatch({ type: 'DELETE_SUBSCRIPTION', payload });
      },
    });

    return () => {
      subscription.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getRestaurantList(state.searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [state.searchTerm]);

  useEffect(() => {
    if (state.selectedRestaurant) {
      getReviewList(state.selectedRestaurant.id);
    } else {
      dispatch({ type: 'SET_REVIEWS', payload: [] });
    }
  }, [state.selectedRestaurant]);

  const getReviewList = async (restaurantID) => {
    dispatch({ type: 'SET_REVIEW_LOADING', payload: true });
    try {
      const response = await API.graphql({
        query: reviewsByRestaurantID,
        variables: {
          restaurantID,
          sortDirection: 'DESC',
          limit: 10,
        },
        authMode: 'API_KEY'
      });
      dispatch({ type: 'SET_REVIEWS', payload: response.data.reviewsByRestaurantID.items });
      dispatch({ type: 'SET_LIST_FETCH_ERROR', payload: null });
    } catch (err) {
      console.error('Error fetching reviews:', err);
      dispatch({ type: 'SET_LIST_FETCH_ERROR', payload: err.errors ? err.errors[0].message : err.message || 'Failed to fetch reviews' });
      dispatch({ type: 'SET_REVIEW_LOADING', payload: false });
    }
  };

  const getRestaurantList = async (search = '', nextToken = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let filter = {};
      if (search) {
        filter = {
          or: [
            { name: { contains: search } },
            { city: { contains: search } },
          ],
        };
      }

      const response = await API.graphql({
        query: listRestaurants,
        variables: {
          filter: Object.keys(filter).length > 0 ? filter : null,
          limit: 12,
          nextToken,
        },
        authMode: 'API_KEY'
      });

      if (response.errors && response.errors.length > 0) {
        dispatch({ type: 'SET_FETCH_ERROR', payload: response.errors[0].message });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const { items, nextToken: newNextToken } = response.data.listRestaurants;
      dispatch({ type: 'SET_FETCH_ERROR', payload: null });

      if (nextToken) {
        dispatch({ type: 'APPEND_PAGE', payload: { items, nextToken: newNextToken } });
      } else {
        dispatch({ type: 'QUERY', payload: { items, nextToken: newNextToken } });
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      dispatch({ type: 'SET_FETCH_ERROR', payload: err.errors ? err.errors[0].message : err.message || 'Failed to fetch restaurants' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSearchChange = (term) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  };

  const loadMore = () => {
    if (state.nextToken) {
      getRestaurantList(state.searchTerm, state.nextToken);
    }
  };

  const createNewRestaurant = async (e) => {
    e.preventDefault();
    const { name, description, city } = state.formData;
    dispatch({ type: 'SET_CREATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await API.graphql({
        query: createRestaurant,
        variables: { input: { name, description, city } },
        authMode: 'API_KEY'
      });
      setShowModal(false);
      dispatch({ type: 'SET_CREATING', payload: false });
      // Manual refresh to ensure data appears immediately
      getRestaurantList();
    } catch (err) {
      console.error('Error creating restaurant:', err);
      dispatch({ type: 'SET_CREATING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: err.errors ? err.errors[0].message : err.message || 'Failed to create restaurant' });
    }
  };

  const deleteExistingRestaurant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;
    
    dispatch({ type: 'SET_CREATING', payload: true });
    try {
      await API.graphql({
        query: deleteRestaurant,
        variables: { input: { id } },
        authMode: 'API_KEY'
      });
      dispatch({ type: 'SET_SELECTED_RESTAURANT', payload: null });
      dispatch({ type: 'SET_CREATING', payload: false });
      // The subscription will update the list, but we can also refresh manually
      getRestaurantList();
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      dispatch({ type: 'SET_CREATING', payload: false });
      alert(err.errors ? err.errors[0].message : err.message || 'Failed to delete restaurant');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!state.selectedRestaurant) return;
    
    dispatch({ type: 'SET_REVIEW_CREATING', payload: true });
    try {
      const { rating, content } = state.reviewFormData;
      // Get current user for author name
      const user = await Auth.currentAuthenticatedUser();
      const author = user.username || (user.attributes && user.attributes.email) || 'Anonymous User';
      
      await API.graphql({
        query: createReview,
        variables: {
          input: {
            restaurantID: state.selectedRestaurant.id,
            rating,
            content,
            author
          }
        },
        authMode: 'API_KEY'
      });
      
      dispatch({ type: 'SET_SHOW_REVIEW_MODAL', payload: false });
      dispatch({ type: 'SET_REVIEW_FORM_DATA', payload: { rating: 5, content: '' } });
      dispatch({ type: 'SET_REVIEW_CREATING', payload: false });
      // Refresh reviews
      getReviewList(state.selectedRestaurant.id);
    } catch (err) {
      console.error('Error creating review:', err);
      dispatch({ type: 'SET_REVIEW_CREATING', payload: false });
      dispatch({ type: 'SET_REVIEW_ERROR', payload: err.errors ? err.errors[0].message : err.message || 'Failed to submit review' });
    }
  };

  const handleChange = (e) =>
    dispatch({ type: 'SET_FORM_DATA', payload: { [e.target.name]: e.target.value } });

  return (
    <div className="App">
      <Header
        onAddClick={() => setShowModal(true)}
        onSearchChange={handleSearchChange}
      />

      <Container>
        <div className="hero-section">
          <h1 className="hero-title">Discover Premium Dining</h1>
          <p className="hero-subtitle">
            Explore the best restaurants in your city, curated by our community.
          </p>
          <div className="mt-4">
            <Button
              variant={state.isMapView ? 'primary' : 'outline-primary'}
              className="premium-btn"
              onClick={() => dispatch({ type: 'TOGGLE_MAP_VIEW' })}
              style={{ padding: '10px 25px', borderRadius: '12px' }}
            >
              {state.isMapView ? '▦ Show Grid View' : '🗺 Show Map View'}
            </Button>
          </div>
        </div>

        {state.fetchError && (
          <div className="alert alert-danger mx-auto mb-5 text-center" style={{ maxWidth: '600px', borderRadius: '15px', border: 'none', backgroundColor: '#fff5f5' }}>
            <h5 className="mb-2" style={{ fontWeight: 700, color: '#e53e3e' }}>Fetch Error</h5>
            <p className="mb-0" style={{ color: '#c53030' }}>{state.fetchError}</p>
            <Button variant="link" onClick={() => getRestaurantList()} className="mt-2" style={{ color: '#e53e3e', textDecoration: 'none', fontWeight: 600 }}>
              ↻ Try Again
            </Button>
          </div>
        )}

        {/* Skeleton loader */}
        {state.loading && state.restaurants.length === 0 && (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-image" />
                <div className="skeleton-body">
                  <div className="skeleton skeleton-text short" />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text medium" />
                </div>
              </div>
            ))}
          </div>
        )}

        {(!state.loading || state.restaurants.length > 0) && (
          state.isMapView ? (
            <div className="py-4">
              <LocationMap
                locations={state.restaurants.map(r => ({ name: r.name, city: r.city }))}
                height="600px"
              />
            </div>
          ) : (
            <Row className="gy-4 py-3">
              {state.restaurants.length > 0 ? (
                state.restaurants.map((restaurant, index) => (
                  <Col key={'restaurant-' + index} xs={12} md={6} lg={4}>
                    <RestaurantCard
                      name={restaurant.name}
                      description={restaurant.description}
                      city={restaurant.city}
                      image={getRestaurantImage(index)}
                      onClick={() => dispatch({ type: 'SET_SELECTED_RESTAURANT', payload: restaurant })}
                    />
                  </Col>
                ))
              ) : (
                <Col className="text-center py-5">
                  <div className="empty-state">
                    <div className="empty-icon">🍽️</div>
                    <h3>No restaurants found</h3>
                    <p className="text-muted">Try a different search or be the first to add a place!</p>
                    <Button className="premium-btn mt-3" onClick={() => setShowModal(true)}>
                      Add a Restaurant
                    </Button>
                  </div>
                </Col>
              )}
            </Row>
          )
        )}

        {state.nextToken && (
          <Row className="py-5">
            <Col className="text-center">
              <Button
                onClick={loadMore}
                className="premium-btn px-5"
                disabled={state.loading}
              >
                {state.loading ? (
                  <span><span className="spinner" />Loading...</span>
                ) : (
                  'Load More Restaurants'
                )}
              </Button>
            </Col>
          </Row>
        )}
      </Container>

      {/* Add Restaurant Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title style={{ fontWeight: 700 }}>Add New Restaurant</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={createNewRestaurant}>
            {state.error && <div className="alert alert-danger py-2 px-3 mb-4" style={{ fontSize: '0.9rem', borderRadius: '10px' }}>{state.error}</div>}
            <Form.Group className="mb-3" controlId="formDataName">
              <Form.Label>Restaurant Name</Form.Label>
              <Form.Control
                onChange={handleChange}
                type="text"
                name="name"
                placeholder="e.g. The Grand Bistro"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDataCity">
              <Form.Label>City</Form.Label>
              <Form.Control
                onChange={handleChange}
                type="text"
                name="city"
                placeholder="e.g. New York"
                required
              />
            </Form.Group>
            <Form.Group className="mb-4" controlId="formDataDescription">
              <Form.Label>Description</Form.Label>
              <Form.Control
                onChange={handleChange}
                as="textarea"
                rows={3}
                name="description"
                placeholder="Tell us what makes this place special..."
                required
              />
            </Form.Group>
            <div className="d-grid">
              <Button type="submit" className="premium-btn" disabled={state.creating}>
                {state.creating ? 'Creating...' : 'Create Restaurant'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Restaurant Detail Modal */}
      <Modal
        show={!!state.selectedRestaurant}
        onHide={() => dispatch({ type: 'SET_SELECTED_RESTAURANT', payload: null })}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title style={{ fontWeight: 800, fontSize: '1.75rem' }}>
            {state.selectedRestaurant && state.selectedRestaurant.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 pt-0">
          <div className="d-flex align-items-center mb-4">
            <Badge
              variant="primary"
              style={{ backgroundColor: 'var(--primary)', padding: '6px 15px', borderRadius: '8px', marginRight: '12px' }}
            >
              {state.selectedRestaurant && state.selectedRestaurant.city}
            </Badge>
            <StarRating rating={4.5} readOnly size="1.2rem" />
            <span style={{ marginLeft: '8px', fontWeight: 700 }}>4.5</span>
            <span style={{ marginLeft: '4px', color: 'var(--text-muted)' }}>(24 reviews)</span>
          </div>

          <div style={{ height: '300px', borderRadius: '20px', overflow: 'hidden', marginBottom: '2rem' }}>
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200"
              alt="Restaurant interior"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200'; }}
            />
          </div>

          <h5 style={{ fontWeight: 700, marginBottom: '1rem' }}>Location</h5>
          <div className="mb-4">
            {state.selectedRestaurant && (
              <LocationMap
                locations={[{ name: state.selectedRestaurant.name, city: state.selectedRestaurant.city }]}
                height="250px"
              />
            )}
          </div>

          <h5 style={{ fontWeight: 700, marginBottom: '1rem' }}>About this place</h5>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.8' }}>
            {state.selectedRestaurant && state.selectedRestaurant.description}
          </p>

          <hr className="my-4" style={{ borderColor: 'var(--glass-border)' }} />

          {state.reviewLoading ? (
            <div className="text-center py-4">
              <span className="spinner" />
            </div>
          ) : state.listFetchError ? (
            <div className="alert alert-warning p-3 text-center" style={{ borderRadius: '12px', fontSize: '0.9rem' }}>
              <p className="mb-1" style={{ fontWeight: 600 }}>Could not load reviews</p>
              <p className="mb-1">{state.listFetchError}</p>
              <Button variant="link" size="sm" onClick={() => getReviewList(state.selectedRestaurant.id)} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                ↻ Try again
              </Button>
            </div>
          ) : (
            <ReviewList reviews={state.reviews} />
          )}

          <div className="d-grid gap-2 mt-4">
            <Button 
              className="premium-btn" 
              onClick={() => dispatch({ type: 'SET_SHOW_REVIEW_MODAL', payload: true })}
            >
              Write a Review
            </Button>
            <Button 
              variant="outline-danger" 
              className="premium-btn py-2" 
              style={{ borderColor: '#ff4d4d', color: '#ff4d4d' }}
              onClick={() => deleteExistingRestaurant(state.selectedRestaurant.id)}
              disabled={state.creating}
            >
              {state.creating ? 'Removing...' : '🗑 Remove Restaurant'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Write Review Modal */}
      <Modal 
        show={state.showReviewModal} 
        onHide={() => dispatch({ type: 'SET_SHOW_REVIEW_MODAL', payload: false })}
        centered
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title style={{ fontWeight: 700 }}>Write a Review</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleReviewSubmit}>
            {state.reviewError && <div className="alert alert-danger mb-4">{state.reviewError}</div>}
            <div className="text-center mb-4">
              <div className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>Overall Rating</div>
              <StarRating 
                rating={state.reviewFormData.rating} 
                size="2.5rem" 
                onRatingChange={(rating) => dispatch({ type: 'SET_REVIEW_FORM_DATA', payload: { rating } })}
              />
            </div>
            <Form.Group className="mb-4">
              <Form.Label>Your Experience</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="What was the food like? How was the service?"
                value={state.reviewFormData.content}
                onChange={(e) => dispatch({ type: 'SET_REVIEW_FORM_DATA', payload: { content: e.target.value } })}
                required
              />
            </Form.Group>
            <div className="d-grid">
              <Button type="submit" className="premium-btn" disabled={state.reviewCreating}>
                {state.reviewCreating ? 'Submitting...' : 'Post Review'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default withAuthenticator(App);
