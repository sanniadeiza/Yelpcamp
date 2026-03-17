import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
import React, { useEffect, useReducer, useState } from 'react';
import { Button, Col, Container, Form, Row, Modal, Badge } from 'react-bootstrap';

import './App.css';
// @ts-ignore
import awsConfig from './aws-exports.js';
import { createRestaurant } from './graphql/mutations';
import { listRestaurants } from './graphql/queries';
import { onCreateRestaurant } from './graphql/subscriptions';

import Header from './components/Header';
import RestaurantCard from './components/RestaurantCard';
import StarRating from './components/StarRating';
import ReviewList from './components/ReviewList';
import LocationMap from './components/LocationMap';

Amplify.configure(awsConfig);

type SubscriptionEvent<D> = {
  value: {
    data: D;
  };
};

type Restaurant = {
  name: string;
  description: string;
  city: string;
};

type AppState = {
  restaurants: Restaurant[];
  formData: Restaurant;
  searchTerm: string;
  nextToken: string | null;
  loading: boolean;
  selectedRestaurant: Restaurant | null;
  isMapView: boolean;
};

type Action =
  | {
      type: 'QUERY';
      payload: { items: Restaurant[]; nextToken: string | null };
    }
  | {
      type: 'APPEND_PAGE';
      payload: { items: Restaurant[]; nextToken: string | null };
    }
  | {
      type: 'SUBSCRIPTION';
      payload: Restaurant;
    }
  | {
      type: 'SET_FORM_DATA';
      payload: { [field: string]: string };
    }
  | {
      type: 'SET_SEARCH_TERM';
      payload: string;
    }
  | {
      type: 'SET_LOADING';
      payload: boolean;
    }
  | {
      type: 'SET_SELECTED_RESTAURANT';
      payload: Restaurant | null;
    }
  | {
      type: 'TOGGLE_MAP_VIEW';
    };

const initialState: AppState = {
  restaurants: [],
  formData: {
    name: '',
    city: '',
    description: '',
  },
  searchTerm: '',
  nextToken: null,
  loading: false,
  selectedRestaurant: null,
  isMapView: false,
};

const reducer = (state: AppState, action: Action) => {
  switch (action.type) {
    case 'QUERY':
      return { 
        ...state, 
        restaurants: action.payload.items, 
        nextToken: action.payload.nextToken,
        loading: false 
      };
    case 'APPEND_PAGE':
      return { 
        ...state, 
        restaurants: [...state.restaurants, ...action.payload.items], 
        nextToken: action.payload.nextToken,
        loading: false 
      };
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
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getRestaurantList();

    const subscription = API.graphql(
      graphqlOperation(onCreateRestaurant),
    ).subscribe({
      next: (
        eventData: SubscriptionEvent<{ onCreateRestaurant: Restaurant }>,
      ) => {
        const payload = eventData.value.data.onCreateRestaurant;
        dispatch({ type: 'SUBSCRIPTION', payload });
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use a debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getRestaurantList(state.searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [state.searchTerm]);

  const getRestaurantList = async (search: string = '', nextToken: string | null = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let filter = {};
      if (search) {
        filter = {
          or: [
            { name: { contains: search } },
            { city: { contains: search } }
          ]
        };
      }

      const response = await API.graphql(
        graphqlOperation(listRestaurants, {
          filter: Object.keys(filter).length > 0 ? filter : null,
          limit: 12,
          nextToken: nextToken
        }),
      );

      const { items, nextToken: newNextToken } = (response as any).data.listRestaurants;
      
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

  const handleSearchChange = (term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  };

  const loadMore = () => {
    if (state.nextToken) {
      getRestaurantList(state.searchTerm, state.nextToken);
    }
  };

  const createNewRestaurant = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const { name, description, city } = state.formData;
    const restaurant = {
      name,
      description,
      city,
    };
    try {
      await API.graphql(
        graphqlOperation(createRestaurant, { input: restaurant }),
      );
      setShowModal(false);
    } catch (e) {
      console.error('Error creating restaurant:', e);
    }
  };

  const handleChange = (e: any) =>
    dispatch({
      type: 'SET_FORM_DATA',
      payload: { [e.target.name]: e.target.value },
    });

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
            Explore {state.restaurants.length === 1000 ? 'over 1000' : 'the best'} restaurants in your city, curated by our community.
          </p>
          <div className="mt-4">
            <Button 
              variant={state.isMapView ? "primary" : "outline-primary"} 
              className="premium-btn me-2"
              onClick={() => dispatch({ type: 'TOGGLE_MAP_VIEW' })}
              style={{ padding: '10px 25px', borderRadius: '12px' }}
            >
              {state.isMapView ? '🗉 Show Grid View' : '🗺 Show Map View'}
            </Button>
          </div>
        </div>

        {state.isMapView ? (
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
                <Col key={`restaurant-${index}`} xs={12} md={6} lg={4}>
                  <RestaurantCard 
                    name={restaurant.name}
                    description={restaurant.description}
                    city={restaurant.city}
                    onClick={() => dispatch({ type: 'SET_SELECTED_RESTAURANT', payload: restaurant })}
                  />
                </Col>
              ))
            ) : (
              <Col className="text-center py-5">
                {!state.loading ? (
                  <>
                    <h3 className="text-muted">No restaurants found.</h3>
                    <p>Try refining your search or add a new place!</p>
                  </>
                ) : (
                  <div className="text-muted">Searching for culinary gems...</div>
                )}
              </Col>
            )}
          </Row>
        )}

        {state.nextToken && (
          <Row className="py-5">
            <Col className="text-center">
              <Button 
                onClick={loadMore} 
                className="premium-btn px-5"
                disabled={state.loading}
              >
                {state.loading ? 'Loading...' : 'Load More Restaurants'}
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
              <Button type="submit" className="premium-btn">
                Create Restaurant
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
            <Badge variant="primary" className="me-2" style={{ backgroundColor: 'var(--primary)', padding: '6px 15px', borderRadius: '8px' }}>
              {state.selectedRestaurant && state.selectedRestaurant.city}
            </Badge>
            <StarRating rating={4.5} readOnly size="1.2rem" />
            <span className="ms-2 fw-bold" style={{ marginLeft: '8px' }}>4.5 (24 reviews)</span>
          </div>
          
          <div style={{ height: '300px', borderRadius: '20px', overflow: 'hidden', marginBottom: '2rem' }}>
            <img 
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200" 
              alt="Restaurant"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {state.selectedRestaurant && state.selectedRestaurant.description}
          </p>

          <hr className="my-5" style={{ borderColor: 'var(--glass-border)' }} />

          <ReviewList reviews={[
            { id: '1', rating: 5, content: 'Absolutely phenomenal experience! The atmosphere was electric and the food was divine.', author: 'Alex Johnson', createdAt: new Date().toISOString() },
            { id: '2', rating: 4, content: 'Great service and wonderful food. The city views were a major plus.', author: 'Sarah Miller', createdAt: new Date(Date.now() - 86400000).toISOString() }
          ]} />
          
          <div className="d-grid mt-4">
            <Button className="premium-btn">
              Write a Review
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default withAuthenticator(App);
