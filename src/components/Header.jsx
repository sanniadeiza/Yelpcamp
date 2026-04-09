/* eslint-disable */
import React from 'react';
import { Button, Container, Navbar, Form, InputGroup } from 'react-bootstrap';

const Header = ({ onAddClick, onSearchChange }) => {
  return (
    <Navbar expand="lg" className="py-3 sticky-top" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
      <Container>
        <Navbar.Brand 
          href="#home" 
          style={{ 
            fontWeight: 800, 
            fontSize: '1.5rem', 
            letterSpacing: '-0.02em',
            color: 'var(--text-main)'
          }}
        >
          Yelp<span style={{ color: 'var(--primary)' }}>Camp</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Form className="mx-lg-auto my-3 my-lg-0" style={{ maxWidth: '400px', width: '100%' }}>
            <InputGroup className="glass-card overflow-hidden" style={{ borderRadius: '12px' }}>
              <InputGroup.Prepend>
                <InputGroup.Text className="bg-transparent border-0 pr-0">
                  <span role="img" aria-label="search">🔍</span>
                </InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                type="search"
                placeholder="Search restaurants or cities..."
                className="bg-transparent border-0 py-2 pl-2 shadow-none"
                style={{ fontSize: '0.95rem' }}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </InputGroup>
          </Form>
          
          <div className="d-flex align-items-center">
            <Button 
              className="premium-btn"
              onClick={onAddClick}
            >
              Add Restaurant
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
