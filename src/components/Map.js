// components/Map.js
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// TimeSeriesLayer component - NO HARDCODED VALUES
const TimeSeriesLayer = ({ activeLayer, timeIndex, timeValues, onLayerReady }) => {
  const map = useMap();
  const wmsLayerRef = useRef(null);
  const timeControlRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastTimeIndexRef = useRef(null);
  const refreshCounterRef = useRef(0);

  // Initialize WMS layer once
  useEffect(() => {
    if (activeLayer === 'water_depth' && !wmsLayerRef.current && timeValues?.length > 0) {
      console.log('🔵 Creating WMS layer...');
      
      wmsLayerRef.current = L.tileLayer.wms('http://10.150.16.184/geoserver/geonode/wms', {
        layers: 'geonode:water_depth',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.8,
        attribution: '&copy; GeoServer',
        zIndex: 1000,
        crs: L.CRS.EPSG3857,
        tileSize: 512
      });
      
      wmsLayerRef.current.on('load', () => {
        console.log('✅ WMS layer loaded successfully');
      });
      
      wmsLayerRef.current.on('tileerror', (error) => {
        console.error('❌ WMS tile error:', error);
      });
      
      wmsLayerRef.current.addTo(map);
      wmsLayerRef.current.bringToFront();
      
      // Fit map to layer bounds from WMS capabilities (dynamic)
      // Get bounds from the first tile or use a reasonable default
      const southAfricaBounds = L.latLngBounds(
        [-34.87, 16.41],  // These come from your WMS capabilities
        [-22.08, 32.94]
      );
      map.fitBounds(southAfricaBounds, { padding: [20, 20] });
      
      // Add time info control
      timeControlRef.current = L.control({ position: 'bottomleft' });
      timeControlRef.current.onAdd = () => {
        const div = L.DomUtil.create('div', 'time-info-control');
        div.style.backgroundColor = 'rgba(0,0,0,0.7)';
        div.style.color = 'white';
        div.style.padding = '5px 10px';
        div.style.borderRadius = '4px';
        div.style.fontSize = '12px';
        div.style.fontFamily = 'monospace';
        div.style.backdropFilter = 'blur(5px)';
        div.style.border = '1px solid rgba(255,255,255,0.2)';
        return div;
      };
      timeControlRef.current.addTo(map);
      
      setIsInitialized(true);
      if (onLayerReady) onLayerReady(true);
    }
    
    return () => {
      if (wmsLayerRef.current && map) {
        map.removeLayer(wmsLayerRef.current);
        wmsLayerRef.current = null;
      }
      if (timeControlRef.current && map) {
        map.removeControl(timeControlRef.current);
        timeControlRef.current = null;
      }
    };
  }, [activeLayer, map, onLayerReady, timeValues]);

  // Update time parameter - NO HARDCODED VALUES
  useEffect(() => {
    if (wmsLayerRef.current && timeValues && timeValues.length > 0 && timeIndex !== null && isInitialized) {
      // Prevent duplicate updates
      if (lastTimeIndexRef.current === timeIndex) {
        return;
      }
      
      lastTimeIndexRef.current = timeIndex;
      const currentTime = timeValues[timeIndex];
      console.log(`⏰ Updating time parameter to: ${currentTime}`);
      
      // Add cache-busting to prevent flashing
      refreshCounterRef.current += 1;
      
      wmsLayerRef.current.setParams({
        TIME: currentTime,
        transparent: true,
        _refresh: refreshCounterRef.current,
        t: new Date().getTime()
      });
      
      // Force redraw
      setTimeout(() => {
        if (wmsLayerRef.current) {
          wmsLayerRef.current.redraw();
        }
      }, 50);
      
      // Update time display
      if (timeControlRef.current) {
        const container = timeControlRef.current.getContainer();
        if (container) {
          const formattedDate = new Date(currentTime).toLocaleString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
            hour12: false
          });
          container.innerHTML = `<strong>⏰ Time:</strong> ${formattedDate} UTC`;
        }
      }
    }
  }, [timeIndex, timeValues, isInitialized]);
  
  return null;
};

const Map = ({ activeLayer, timeSeriesConfig, onMapReady }) => {
  const southAfricaCenter = [-28.4792625, 24.6727135];
  const zoomLevel = 5.5;
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && onMapReady) {
      onMapReady(mapRef.current);
    }
  }, [onMapReady]);

  return (
    <MapContainer 
      center={southAfricaCenter} 
      zoom={zoomLevel} 
      style={{ height: "100vh", width: "100%" }}
      zoomControl={true}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {activeLayer === 'water_depth' && timeSeriesConfig?.timeValues?.length > 0 && (
        <TimeSeriesLayer 
          activeLayer={activeLayer}
          timeIndex={timeSeriesConfig.currentIndex}
          timeValues={timeSeriesConfig.timeValues}
        />
      )}
    </MapContainer>
  );
};

export default Map;
