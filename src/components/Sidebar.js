import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ activeLayer, setActiveLayer, forecastData, setForecastData, setShowForecast }) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [selectedDataLayer, setSelectedDataLayer] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [citySearch, setCitySearch] = useState('');

  const toggleAccordion = (accordionName) => {
    if (openAccordion === accordionName) {
      setOpenAccordion(null);
    } else {
      setOpenAccordion(accordionName);
    }
  };

  const handleDataLayerSelect = (layer) => {
    setSelectedDataLayer(layer);
    setActiveLayer(layer);
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

  const fetchForecastData = async (cityName) => {
    if (!cityName.trim()) return;
    
    setForecastData({ loading: true });
    
    try {
      // Geocode city to get coordinates
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName + ', South Africa')}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`Could not find location: ${cityName}`);
      }
      
      const location = geoData.results[0];
      
      // Fetch 7-day forecast
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover&timezone=auto&forecast_days=7`;
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();
      
      setForecastData({
        loading: false,
        data: forecastData,
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

  const dataLayers = [
    { id: 'population', name: 'Other Datasets', description: 'Other dataset distributed across South Africa' },
    { id: 'floods', name: 'Flood Products', description: 'Flood analyses products' },
    { id: 'cities', name: 'Flood Risk Data', description: 'Flood Risk Data' },
    { id: 'climate', name: 'Climate Zones', description: 'Different climate regions' },
    { id: 'water_depth', name: 'Temp Dataset', description: 'Temp Dataset' }
  ];

  const forecasts = [
    { id: 'weather', name: 'Weather Forecast', description: '7-day weather prediction' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Flood Monitoring</h2>
      </div>
    
       Select region of interest
    
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
            {dataLayers.map(layer => (
              <div 
                key={layer.id}
                className={`data-item ${selectedDataLayer === layer.id ? 'active' : ''}`}
                onClick={() => handleDataLayerSelect(layer.id)}
              >
                <div className="data-item-header">
                  <strong>{layer.name}</strong>
                </div>
                <div className="data-item-description">
                  {layer.description}
                </div>
              </div>
            ))}
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

      <div className="sidebar-footer">
        <p>Selected Layer: {activeLayer || 'None'}</p>
        <small>Click on items to activate</small>
      </div>
    </div>
  );
};

export default Sidebar;
