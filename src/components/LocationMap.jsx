/* eslint-disable */
import React, { useEffect, useRef } from 'react';

const LocationMap = ({ 
  locations, 
  center = [37.7749, -122.4194], // Default to SF if none
  zoom = 10,
  height = '400px'
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Initialize map if not already initialized
    if (!mapInstance.current) {
        // @ts-ignore
      mapInstance.current = window.L.map(mapRef.current).setView(center, zoom);

      // @ts-ignore
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView(center, zoom);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
        // @ts-ignore
      if (layer instanceof window.L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Add markers
    locations.forEach(loc => {
      const lat = loc.lat || center[0] + (Math.random() - 0.5) * 0.1;
      const lng = loc.lng || center[1] + (Math.random() - 0.5) * 0.1;
      
      // @ts-ignore
      window.L.marker([lat, lng])
        .addTo(mapInstance.current)
        .bindPopup(`<b>${loc.name}</b><br>${loc.city}`);
    });

    // Invalidate size to fix rendering issues in modals/tabs
    setTimeout(() => {
      mapInstance.current.invalidateSize();
    }, 200);

    return () => {
    };
  }, [locations, center, zoom]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: height, 
        width: '100%', 
        borderRadius: '20px', 
        overflow: 'hidden',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.18)'
      }} 
    />
  );
};

export default LocationMap;
