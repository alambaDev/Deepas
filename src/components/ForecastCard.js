import React, { useState, useEffect } from 'react';
import './ForecastCard.css';

const ForecastCard = ({ forecastData, onClose, onLocationFound, isTimeSeriesVisible, lat, lon, cityName }) => {
  const [maxHeight, setMaxHeight] = useState('calc(100vh - 70px)');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [flippedCard, setFlippedCard] = useState(null);
  const [hourlyDataForDay, setHourlyDataForDay] = useState({});
  const [loadingHourly, setLoadingHourly] = useState({});
  const [localForecastData, setLocalForecastData] = useState(null);

  // Fetch data using the SAME URL pattern as your working JavaScript
  const fetchForecastData = async (latitude, longitude, city) => {
    try {
      setLocalForecastData({ loading: true, searchCity: city });
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
      
      console.log('🌤️ Fetching forecast from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('API Response received');
      console.log('Has hourly data?', !!data.hourly);
      console.log('Hourly entries:', data.hourly?.time?.length || 0);
      
      if (data && data.daily) {
        setLocalForecastData({
          data: data,
          location: {
            name: city,
            lat: latitude,
            lon: longitude,
            country: 'South Africa'
          },
          loading: false,
          error: null
        });
      } else {
        throw new Error('No data received');
      }
    } catch (error) {
      console.error('❌ Error fetching forecast:', error);
      setLocalForecastData({
        loading: false,
        error: 'Failed to fetch weather data. Please try again.',
        data: null
      });
    }
  };

  // Fetch data when coordinates are provided
  useEffect(() => {
    if (lat && lon && cityName && !forecastData) {
      fetchForecastData(lat, lon, cityName);
    }
  }, [lat, lon, cityName]);

  // Use either prop data or local data
  const currentForecastData = forecastData || localForecastData;

  // Adjust max-height when time-series control visibility changes
  useEffect(() => {
    if (isTimeSeriesVisible) {
      setMaxHeight('calc(100vh - 250px)');
    } else {
      setMaxHeight('calc(100vh - 70px)');
    }
  }, [isTimeSeriesVisible]);

  // Notify parent component that a location was found
  useEffect(() => {
    if (currentForecastData && currentForecastData.location && currentForecastData.location.lat && currentForecastData.location.lon && onLocationFound) {
      onLocationFound({
        name: currentForecastData.location.name,
        lat: currentForecastData.location.lat,
        lon: currentForecastData.location.lon,
        country: currentForecastData.location.country
      });
    }
  }, [currentForecastData, onLocationFound]);

  // Process hourly data when a card is flipped
  useEffect(() => {
    if (flippedCard !== null && currentForecastData && currentForecastData.data && currentForecastData.data.hourly) {
      if (!hourlyDataForDay[flippedCard]) {
        loadHourlyDataForDay(flippedCard);
      }
    }
  }, [flippedCard, currentForecastData]);

  const loadHourlyDataForDay = (dayIndex) => {
    setLoadingHourly(prev => ({ ...prev, [dayIndex]: true }));
    
    const hourly = currentForecastData.data.hourly;
    const selectedDate = new Date(currentForecastData.data.daily.time[dayIndex]);
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    // Filter hourly data for the selected day
    const hourlyForDay = {
      time: [],
      temperature_2m: [],
      relative_humidity_2m: [],
      precipitation: [],
      wind_speed_10m: [],
      wind_direction_10m: [],
      cloud_cover: []
    };
    
    for (let i = 0; i < hourly.time.length; i++) {
      const hourDate = new Date(hourly.time[i]);
      const hourDateStr = hourDate.toISOString().split('T')[0];
      
      if (hourDateStr === selectedDateStr) {
        hourlyForDay.time.push(hourly.time[i]);
        hourlyForDay.temperature_2m.push(hourly.temperature_2m[i]);
        if (hourly.relative_humidity_2m) hourlyForDay.relative_humidity_2m.push(hourly.relative_humidity_2m[i]);
        if (hourly.precipitation) hourlyForDay.precipitation.push(hourly.precipitation[i]);
        if (hourly.wind_speed_10m) hourlyForDay.wind_speed_10m.push(hourly.wind_speed_10m[i]);
        if (hourly.wind_direction_10m) hourlyForDay.wind_direction_10m.push(hourly.wind_direction_10m[i]);
        if (hourly.cloud_cover) hourlyForDay.cloud_cover.push(hourly.cloud_cover[i]);
      }
    }
    
    console.log(`📊 Loaded ${hourlyForDay.time.length} hourly entries for day ${dayIndex}`);
    
    setHourlyDataForDay(prev => ({ ...prev, [dayIndex]: hourlyForDay.time.length > 0 ? hourlyForDay : null }));
    setLoadingHourly(prev => ({ ...prev, [dayIndex]: false }));
  };

  const handleCardClick = (index) => {
    setFlippedCard(flippedCard === index ? null : index);
    setSelectedDayIndex(index);
  };

  // Don't render anything if no forecastData
  if (!currentForecastData) return null;
  
  // Loading state
  if (currentForecastData.loading) {
    return (
      <div className="forecast-card" style={{ maxHeight }}>
        <div className="forecast-card-header">
          <h4>Loading Forecast...</h4>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="forecast-card-body">
          <div className="loading-spinner"></div>
          <p>Fetching weather data for {currentForecastData.searchCity || 'your location'}...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (currentForecastData.error) {
    return (
      <div className="forecast-card" style={{ maxHeight }}>
        <div className="forecast-card-header">
          <h4>⚠️ Error</h4>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="forecast-card-body">
          <p>{currentForecastData.error}</p>
          <p className="error-hint">Please try another city name.</p>
        </div>
      </div>
    );
  }
  
  // No data state
  if (!currentForecastData.data || !currentForecastData.data.daily) return null;
  
  const { data, location } = currentForecastData;
  const daily = data.daily;
  const hasHourlyData = data.hourly && data.hourly.time && data.hourly.time.length > 0;
  
  // Weather code mapping
  const weatherMap = {
    0: { icon: '☀️', desc: 'Clear sky', advice: 'Perfect weather for outdoor activities' },
    1: { icon: '🌤️', desc: 'Mainly clear', advice: 'Good weather, enjoy the day' },
    2: { icon: '⛅', desc: 'Partly cloudy', advice: 'Pleasant conditions' },
    3: { icon: '☁️', desc: 'Overcast', advice: 'Cloudy conditions, carry a jacket' },
    45: { icon: '🌫️', desc: 'Fog', advice: 'Poor visibility, drive carefully' },
    48: { icon: '🌫️', desc: 'Rime fog', advice: 'Cold and foggy conditions' },
    51: { icon: '🌧️', desc: 'Light drizzle', advice: 'Light rain expected' },
    53: { icon: '🌧️', desc: 'Moderate drizzle', advice: 'Take an umbrella' },
    55: { icon: '🌧️', desc: 'Dense drizzle', advice: 'Wet conditions' },
    61: { icon: '🌧️', desc: 'Light rain', advice: 'Light rain showers' },
    63: { icon: '🌧️', desc: 'Moderate rain', advice: 'Rain expected' },
    65: { icon: '🌧️', desc: 'Heavy rain', advice: 'Heavy rainfall, possible flooding' },
    71: { icon: '🌨️', desc: 'Light snow', advice: 'Snow possible in high-lying areas' },
    73: { icon: '🌨️', desc: 'Moderate snow', advice: 'Snow expected' },
    75: { icon: '🌨️', desc: 'Heavy snow', advice: 'Heavy snowfall, travel with caution' },
    80: { icon: '🌦️', desc: 'Rain showers', advice: 'Scattered showers' },
    81: { icon: '🌦️', desc: 'Heavy showers', advice: 'Heavy rain expected' },
    82: { icon: '🌧️', desc: 'Violent showers', advice: 'Severe weather conditions' },
    95: { icon: '⛈️', desc: 'Thunderstorm', advice: 'Lightning risk, stay indoors' },
    96: { icon: '⛈️', desc: 'Thunderstorm with hail', advice: 'Severe storm, seek shelter' },
    99: { icon: '⛈️', desc: 'Heavy thunderstorm', advice: 'Dangerous conditions expected' }
  };
  
  const getWeatherInfo = (code) => {
    return weatherMap[code] || { icon: '🌡️', desc: 'Variable', advice: 'Check local conditions' };
  };
  
  const formatHour = (dateString) => {
    const date = new Date(dateString);
    return `${date.getHours()}:00`;
  };
  
  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getWindDirection = (degrees) => {
    if (!degrees) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Render hourly forecast in TABLE format
  const renderHourlyForecast = (dayIndex) => {
    const hourlyData = hourlyDataForDay[dayIndex];
    const isLoading = loadingHourly[dayIndex];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDateStr = now.toISOString().split('T')[0];
    const selectedDateStr = new Date(currentForecastData.data.daily.time[dayIndex]).toISOString().split('T')[0];
    
    if (!hasHourlyData) {
      return (
        <div className="no-hourly-data">
          <p>⚠️ Hourly forecast not available</p>
          <small>API missing hourly parameters</small>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="hourly-loading">
          <div className="small-spinner"></div>
          <p>Loading hourly data...</p>
        </div>
      );
    }
    
    if (!hourlyData || hourlyData.time.length === 0) {
      return (
        <div className="no-hourly-data">
          <p>⚠️ No hourly data for this day</p>
          <small>No hourly entries found</small>
        </div>
      );
    }
    
    return (
      <div className="hourly-table-container">
        <div className="table-responsive">
          <table className="hourly-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Temp</th>
                <th>Rain</th>
                <th>Wind</th>
                <th>Clouds</th>
              </tr>
            </thead>
            <tbody>
              {hourlyData.time.map((time, idx) => {
                const temp = hourlyData.temperature_2m[idx];
                const humidity = hourlyData.relative_humidity_2m?.[idx];
                const precip = hourlyData.precipitation?.[idx];
                const windSpeed = hourlyData.wind_speed_10m?.[idx];
                const windDir = getWindDirection(hourlyData.wind_direction_10m?.[idx]);
                const cloudCover = hourlyData.cloud_cover?.[idx];
                const hour = new Date(time).getHours();
                const dateStr = new Date(time).toISOString().split('T')[0];
                const isCurrentHour = (hour === currentHour && dateStr === currentDateStr && dateStr === selectedDateStr);
                
                return (
                  <tr key={idx} className={isCurrentHour ? 'current-hour-row' : ''}>
                    <td className="hour-time">
                      <strong>{formatHour(time)}</strong>
                      {isCurrentHour && <span className="now-badge">NOW</span>}
                    </td>
                    <td className="temp-cell">{Math.round(temp)}°C</td>
                    <td className="rain-cell">{precip !== undefined ? `${precip.toFixed(1)} mm` : '0 mm'}</td>
                    <td>{windSpeed !== undefined ? `${Math.round(windSpeed)} km/h` : 'N/A'}</td>
                    <td>
                      <div className="cloud-cover">
                        <span>{cloudCover !== undefined ? `${Math.round(cloudCover)}%` : 'N/A'}</span>
                        <div className="cloud-bar">
                          <div className="cloud-fill" style={{ width: `${cloudCover || 0}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="forecast-card" style={{ maxHeight }}>
      <div className="forecast-card-header">
        <div>
          <h4>📍 {location.name}, {location.country || 'South Africa'}</h4>
          <small>{Math.abs(location.lat).toFixed(2)}°{location.lat >= 0 ? 'S' : 'N'}, {Math.abs(location.lon).toFixed(2)}°{location.lon >= 0 ? 'E' : 'W'}</small>
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
            const isActive = selectedDayIndex === index;
            const isCurrentDay = isToday(date);
            const isFlipped = flippedCard === index;
            
            return (
              <div 
                key={index} 
                className={`forecast-card-container ${isFlipped ? 'flipped' : ''}`}
                onClick={() => handleCardClick(index)}
              >
                <div className="forecast-card-flipper">
                  {/* Front of card - Daily Forecast */}
                  <div className={`forecast-card-front ${isActive ? 'active-day' : ''} ${isCurrentDay ? 'current-day' : ''}`}>
                    <div className="forecast-day-header">
                      <strong>{dayName}</strong>
                      <small>{formattedDate}</small>
                      {isCurrentDay && <span className="today-badge">Today</span>}
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
                    <div className="flip-hint">↻ Click to see hourly</div>
                  </div>
                  
                  {/* Back of card - Hourly Forecast Table */}
                  <div className="forecast-card-back">
                    <div className="back-header">
                      <span>{dayName}, {formattedDate} - Hourly Forecast</span>
                      <span className="back-close" onClick={(e) => {
                        e.stopPropagation();
                        setFlippedCard(null);
                      }}>✕</span>
                    </div>
                    {renderHourlyForecast(index)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="forecast-footer">
          <small>Data from Open-Meteo API • Click any card to flip for hourly forecast</small>
        </div>
      </div>
    </div>
  );
};

export default ForecastCard;
