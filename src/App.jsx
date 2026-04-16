/* eslint-disable */
// @ts-nocheck
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
import React, { useEffect, useReducer, useState } from 'react';
import { Button, Col, Container, Form, Row, Modal, Badge } from 'react-bootstrap';

import './App.css';
import awsConfig from './aws-exports.js';
import { createRestaurant } from './graphql/mutations';
import { listRestaurants } from './graphql/queries';
import { onCreateRestaurant } from './graphql/subscriptions';

import Header from './components/Header';
import RestaurantCard from './components/RestaurantCard';
import StarRating from './components/StarRating';
import ReviewList from './components/ReviewList';
import LocationMap from './components/LocationMap';

const finalConfig = {
  ...awsConfig,
  aws_project_region: process.env.REACT_APP_REGION || awsConfig.aws_project_region || 'eu-north-1',
  aws_cognito_region: process.env.REACT_APP_REGION || awsConfig.aws_cognito_region || 'eu-north-1',
  aws_user_pools_id: process.env.REACT_APP_USER_POOL_ID || awsConfig.aws_user_pools_id,
  aws_user_pools_web_client_id: process.env.REACT_APP_USER_CLIENT_ID || awsConfig.aws_user_pools_web_client_id,
  aws_appsync_graphqlEndpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT || awsConfig.aws_appsync_graphqlEndpoint,
  aws_appsync_region: process.env.REACT_APP_REGION || awsConfig.aws_appsync_region || 'eu-north-1',
  aws_appsync_authenticationType: process.env.REACT_APP_AUTH_TYPE || awsConfig.aws_appsync_authenticationType || 'AMAZON_COGNITO_USER_POOLS',
};

Amplify.configure(finalConfig);

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
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'QUERY':
      return { ...state, restaurants: action.payload.items, nextToken: action.payload.nextToken, loading: false };
    case 'APPEND_PAGE':
      return { ...state, restaurants: [...state.restaurants, ...action.payload.items], nextToken: action.payload.nextToken, loading: false };
    case 'SUBSCRIPTION':
      return { ...state, restaurants: [action.payload, ...state.restaurants] };
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

    const subscription = API.graphql(
      graphqlOperation(onCreateRestaurant)
    ).subscribe({
      next: (eventData) => {
        const payload = eventData.value.data.onCreateRestaurant;
        dispatch({ type: 'SUBSCRIPTION', payload });
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getRestaurantList(state.searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [state.searchTerm]);

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

      const response = await API.graphql(
        graphqlOperation(listRestaurants, {
          filter: Object.keys(filter).length > 0 ? filter : null,
          limit: 12,
          nextToken,
        })
      );

      const { items, nextToken: newNextToken } = response.data.listRestaurants;

      if (nextToken) {
        dispatch({ type: 'APPEND_PAGE', payload: { items, nextToken: newNextToken } });
      } else {
        dispatch({ type: 'QUERY', payload: { items, nextToken: newNextToken } });
      }
    } catch (e) {
      console.error('Error fetching restaurants:', e);
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
      await API.graphql(
        graphqlOperation(createRestaurant, { input: { name, description, city } })
      );
      setShowModal(false);
      dispatch({ type: 'SET_CREATING', payload: false });
    } catch (err) {
      console.error('Error creating restaurant:', err);
      dispatch({ type: 'SET_CREATING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: err.errors ? err.errors[0].message : err.message || 'Failed to create restaurant' });
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

          <ReviewList reviews={[
            { id: '1', rating: 5, content: 'Absolutely phenomenal experience! The atmosphere was electric and the food was divine.', author: 'Alex Johnson', createdAt: new Date().toISOString() },
            { id: '2', rating: 4, content: 'Great service and wonderful food. A must-visit for anyone in the city.', author: 'Sarah Miller', createdAt: new Date(Date.now() - 86400000).toISOString() },
          ]} />

          <div className="d-grid mt-4">
            <Button className="premium-btn">Write a Review</Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default withAuthenticator(App);
