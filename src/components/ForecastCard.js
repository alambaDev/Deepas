import React from 'react';
import './ForecastCard.css';

const ForecastCard = ({ forecastData, onClose }) => {
  if (!forecastData) return null;
  
  if (forecastData.loading) {
    return (
      <div className="forecast-card">
        <div className="forecast-card-header">
          <h4>Loading Forecast...</h4>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="forecast-card-body">
          <div className="loading-spinner"></div>
          <p>Fetching weather data for {forecastData.searchCity || 'your location'}...</p>
        </div>
      </div>
    );
  }
  
  if (forecastData.error) {
    return (
      <div className="forecast-card">
        <div className="forecast-card-header">
          <h4>⚠️ Error</h4>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="forecast-card-body">
          <p>{forecastData.error}</p>
          <p className="error-hint">Please try another city name.</p>
        </div>
      </div>
    );
  }
  
  if (!forecastData.data || !forecastData.data.daily) return null;
  
  const { data, location } = forecastData;
  const daily = data.daily;
  
  // Weather code mapping
  const weatherMap = {
    0: { icon: '☀️', desc: 'Clear sky' },
    1: { icon: '🌤️', desc: 'Mainly clear' },
    2: { icon: '⛅', desc: 'Partly cloudy' },
    3: { icon: '☁️', desc: 'Overcast' },
    45: { icon: '🌫️', desc: 'Fog' },
    51: { icon: '🌧️', desc: 'Light drizzle' },
    53: { icon: '🌧️', desc: 'Moderate drizzle' },
    55: { icon: '🌧️', desc: 'Dense drizzle' },
    61: { icon: '🌧️', desc: 'Light rain' },
    63: { icon: '🌧️', desc: 'Moderate rain' },
    65: { icon: '🌧️', desc: 'Heavy rain' },
    71: { icon: '🌨️', desc: 'Light snow' },
    73: { icon: '🌨️', desc: 'Moderate snow' },
    75: { icon: '🌨️', desc: 'Heavy snow' },
    80: { icon: '🌦️', desc: 'Rain showers' },
    81: { icon: '🌦️', desc: 'Heavy showers' },
    82: { icon: '🌧️', desc: 'Violent showers' },
    95: { icon: '⛈️', desc: 'Thunderstorm' },
    96: { icon: '⛈️', desc: 'Thunderstorm with hail' },
    99: { icon: '⛈️', desc: 'Heavy thunderstorm' }
  };
  
  const getWeatherInfo = (code) => {
    return weatherMap[code] || { icon: '🌡️', desc: 'Variable' };
  };
  
  /*const getWindDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };*/
  
  return (
    <div className="forecast-card">
      <div className="forecast-card-header">
        <div>
          <h4>📍 {location.name}, South Africa</h4>
          <small>{location.lat.toFixed(2)}°S, {location.lon.toFixed(2)}°E</small>
        </div>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>
      
      <div className="forecast-card-body">
        <div className="forecast-summary">
          <span className="update-time">7-Day Forecast</span>
        </div>
        
        <div className="forecast-days">
          {daily.time.map((date, index) => {
            const weather = getWeatherInfo(daily.weather_code[index]);
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-ZA', { weekday: 'short' });
            const formattedDate = dateObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
            
            return (
              <div key={index} className="forecast-day">
                <div className="forecast-day-header">
                  <strong>{dayName}</strong>
                  <small>{formattedDate}</small>
                </div>
                <div className="forecast-day-icon">
                  <span style={{ fontSize: '2rem' }}>{weather.icon}</span>
                  <div className="weather-desc">{weather.desc}</div>
                </div>
                <div className="forecast-day-temp">
                  <span className="temp-max">{Math.round(daily.temperature_2m_max[index])}°</span>
                  <span className="temp-min">{Math.round(daily.temperature_2m_min[index])}°</span>
                </div>
                <div className="forecast-day-details">
                  <div>🌧️ {daily.precipitation_sum[index]} mm</div>
                  <div>💧 {daily.precipitation_probability_max[index] || 0}%</div>
                  <div>💨 {Math.round(daily.wind_speed_10m_max[index])} km/h</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="forecast-footer">
          <small>Data from Open-Meteo API</small>
        </div>
      </div>
    </div>
  );
};

export default ForecastCard;
