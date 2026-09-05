// Sidebar.js - With proper toggle logic and dynamic layer configuration
import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ activeLayer, setActiveLayer, forecastData, setForecastData, setShowForecast, onToggleLayerCard, showLayerCard }) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [selectedDataLayer, setSelectedDataLayer] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [isRegionSelected, setIsRegionSelected] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [dataLayers, setDataLayers] = useState([]);
  const [loadingLayers, setLoadingLayers] = useState(true);

  // South Africa provinces
  const southAfricaProvinces = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape'
  ];

  // Fetch available layers from GeoServer
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const wmsUrl = 'https://10.150.16.184/geoserver/geonode/wms';
        const capabilitiesUrl = `${wmsUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
        
        const response = await fetch(capabilitiesUrl);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const layers = [];
        const allLayers = xmlDoc.querySelectorAll('Layer');
        
        // Layer configurations with their metadata
        const targetLayers = ['depth_max', 'time_of_max_depth', 'water_depth', 'exposed_infrastructure'];
        
        for (const layer of allLayers) {
          const nameEl = layer.querySelector('Name');
          const name = nameEl?.textContent?.split(':')[1] || nameEl?.textContent;
          
          if (targetLayers.includes(name)) {
            const title = layer.querySelector('Title')?.textContent || name;
            const abstract = layer.querySelector('Abstract')?.textContent || 'No description available';
            
            // Get style information
            const style = layer.querySelector('Style Name');
            const styleName = style?.textContent || null;
            
            layers.push({
              id: name,
              name: title,
              description: abstract,
              layerName: name,
              style: styleName
            });
          }
        }
        
        // If GeoServer is unreachable, use fallback data
        if (layers.length === 0) {
          console.warn('No layers found from GeoServer, using fallback data');
          setDataLayers([
            { 
              id: 'depth_max', 
              name: 'Maximum Flood Depth', 
              description: 'Maximum flood depth data showing the highest water levels during flood events',
              layerName: 'depth_max'
            },
            { 
              id: 'time_of_max_depth', 
              name: 'Time of Maximum Flood Depth', 
              description: 'Temporal analysis showing when maximum flood depths occurred',
              layerName: 'time_of_max_depth'
            },
            { 
              id: 'water_depth', 
              name: 'Water Depth', 
              description: 'Real-time water depth monitoring across flood-prone areas',
              layerName: 'water_depth'
            },
            { 
              id: 'exposed_infrastructure', 
              name: 'Exposed Infrastructure', 
              description: 'Infrastructure at risk during flood events including buildings and critical facilities',
              layerName: 'exposed_infrastructure'
            }
          ]);
        } else {
          setDataLayers(layers);
        }
      } catch (error) {
        console.error('Error fetching layers from GeoServer:', error);
        // Fallback data
        setDataLayers([
          { 
            id: 'depth_max', 
            name: 'Maximum Flood Depth', 
            description: 'Maximum flood depth data showing the highest water levels during flood events',
            layerName: 'depth_max'
          },
          { 
            id: 'time_of_max_depth', 
            name: 'Time of Maximum Flood Depth', 
            description: 'Temporal analysis showing when maximum flood depths occurred',
            layerName: 'time_of_max_depth'
          },
          { 
            id: 'water_depth', 
            name: 'Water Depth', 
            description: 'Real-time water depth monitoring across flood-prone areas',
            layerName: 'water_depth'
          },
          { 
            id: 'exposed_infrastructure', 
            name: 'Exposed Infrastructure', 
            description: 'Infrastructure at risk during flood events including buildings and critical facilities',
            layerName: 'exposed_infrastructure'
          }
        ]);
      } finally {
        setLoadingLayers(false);
      }
    };
    
    fetchLayers();
  }, []);

  const toggleAccordion = (accordionName) => {
    if (openAccordion === accordionName) {
      setOpenAccordion(null);
    } else {
      setOpenAccordion(accordionName);
    }
  };

  const handleDataLayerSelect = (layer) => {
    console.log("Layer clicked: " + layer);
    console.log("Current active layer: " + activeLayer);
    
    // Toggle logic: if clicking the same layer, deactivate it
    if (selectedDataLayer === layer && activeLayer === layer) {
      // Deactivate the layer
      setSelectedDataLayer(null);
      setActiveLayer(null);
      if (onToggleLayerCard) {
        onToggleLayerCard(false);
      }
      console.log("Layer deactivated: " + layer);
    } else {
      // Activate the new layer
      setSelectedDataLayer(layer);
      setActiveLayer(layer);
      if (onToggleLayerCard) {
        onToggleLayerCard(true);
      }
      console.log("Layer activated: " + layer);
    }
  };

  const handleForecastSelect = (forecast) => {
    setSelectedForecast(forecast);
    if (forecast === 'weather') {
      setShowForecast(true);
      // Trigger forecast fetch if city is already entered
      if (citySearch.trim()) {
        fetchForecastData(citySearch);
      }
    }
  };

  // In Sidebar.js, update the fetchForecastData function to include location info
  const fetchForecastData = async (cityName) => {
      if (!cityName.trim()) return;
      
      setForecastData({ loading: true });
      
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName + ', South Africa')}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
          throw new Error(`Could not find location: ${cityName}`);
        }
        
        const location = geoData.results[0];
        
        const forecastUrl =`https://api.open-meteo.com/v1/forecast?` + `latitude=${location.latitude}` + `&longitude=${location.longitude}` + `&current=temperature_2m` +  `&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code` + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` + `&timezone=auto` + `&forecast_days=7`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        
        console.log('FULL WEATHER RESPONSE:', forecastData);
        console.log('HOURLY DATA:', forecastData.hourly);
        console.log('DAILY DATA:', forecastData.daily);
        
        setForecastData({
          loading: false,
          data: {
            ...forecastData
          },
          location: {
            name: location.name,
            lat: location.latitude,
            lon: location.longitude,
            country: location.country
          },
          searchCity: cityName
        });
        
      } catch (error) {
        setForecastData({
          loading: false,
          error: error.message,
          searchCity: cityName
        });
      }
  };

  const handleSearch = () => {
    if (citySearch.trim()) {
      fetchForecastData(citySearch);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const forecasts = [
    { id: 'weather', name: 'Weather Forecast', description: '7-day weather prediction' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Flood Monitoring</h2>
      </div>
      
      <div className="sidebar-content">
        <div className="region-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px' }}>
              <input
                type="checkbox"
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                  position: 'absolute'
                }}
                checked={isRegionSelected}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setIsRegionSelected(newValue);
                  if (!newValue) {
                    setSelectedProvince(''); // Reset province when unchecked
                  }
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isRegionSelected ? 'green' : '#ccc',
                  borderRadius: '34px',
                  transition: '0.3s'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    height: '24px',
                    width: '24px',
                    left: '2px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s',
                    transform: isRegionSelected ? 'translateX(24px)' : 'translateX(0)'
                  }}
                />
              </span>
            </label>
            <span 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const newValue = !isRegionSelected;
                setIsRegionSelected(newValue);
                if (!newValue) {
                  setSelectedProvince(''); // Reset province when unchecked
                }
              }}
            >
              Select region of interest
            </span>
          </div>
          {isRegionSelected && (
            <div className="region-result">
              <select 
                className="province-select"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                <option value="">Select a province...</option>
                {southAfricaProvinces.map(province => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              {selectedProvince && (
                <div className="selected-province-info">
                  Selected: {selectedProvince}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Data Layer Accordion */}
        <div className="accordion">
          <div 
            className="accordion-header" 
            onClick={() => toggleAccordion('dataLayer')}
          >
            <h3>Data Layer</h3>
            <span className="accordion-icon">
              {openAccordion === 'dataLayer' ? '▼' : '▶'}
            </span>
          </div>
          
          {openAccordion === 'dataLayer' && (
            <div className="accordion-content">
              {loadingLayers ? (
                <div className="loading-layers">Loading layers from GeoServer...</div>
              ) : (
                dataLayers.map(layer => (
                  <div 
                    key={layer.id}
                    className={`data-item ${selectedDataLayer === layer.id && activeLayer === layer.id ? 'active' : ''}`}
                    onClick={() => handleDataLayerSelect(layer.id)}
                  >
                    <div className="data-item-header">
                      <strong>{layer.name}</strong>
                    </div>
                    <div className="data-item-description">
                      {layer.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Forecast Accordion */}
        <div className="accordion">
          <div 
            className="accordion-header" 
            onClick={() => toggleAccordion('forecast')}
          >
            <h3>Forecast</h3>
            <span className="accordion-icon">
              {openAccordion === 'forecast' ? '▼' : '▶'}
            </span>
          </div>
          
          {openAccordion === 'forecast' && (
            <div className="accordion-content">
              {forecasts.map(forecast => (
                <div 
                  key={forecast.id}
                  className={`data-item ${selectedForecast === forecast.id ? 'active' : ''}`}
                  onClick={() => handleForecastSelect(forecast.id)}
                >
                  <div className="data-item-header">
                    <strong>{forecast.name}</strong>
                  </div>
                  <div className="data-item-description">
                    {forecast.description}
                  </div>
                </div>
              ))}
              
              {selectedForecast === 'weather' && (
                <div className="forecast-search">
                  <h4>Search Location</h4>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Enter city/town name..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="city-search-input"
                    />
                    <button onClick={handleSearch} className="search-btn">
                      🔍 Search
                    </button>
                  </div>
                  <small className="search-hint">e.g., Pretoria, Cape Town, Durban</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
          {activeLayer ? (
            <button 
              className="layer-button active-layer-button"
              onClick={() => {
                if (onToggleLayerCard) {
                  onToggleLayerCard(!showLayerCard);
                } 
              }}
            >
              📍 {dataLayers.find(layer => layer.id === activeLayer)?.name || activeLayer}
            </button>
          ) : (
            <span className="inactive-layer-span">
              🔘 No Layer Selected
            </span>
          )}
        </div>
    </div>
  );
};

export default Sidebar;
