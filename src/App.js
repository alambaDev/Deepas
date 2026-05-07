import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import Navbar from './components/Navbar';
import ForecastCard from './components/ForecastCard';
import TimeSeriesControl from './components/TimeSeriesControl';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Import the TimeSeriesService
import { TimeSeriesService } from './services/TimeSeriesService';

function App() {
  const { authenticated, loading: authLoading } = useAuth();
  const [activeLayer, setActiveLayer] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [showForecast, setShowForecast] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');
  const progressIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const [timeSeriesConfig, setTimeSeriesConfig] = useState({
    isVisible: false,
    timeValues: [],
    currentIndex: 0,
    isLoading: false,
    layerName: ''
  });

  const loadingMessages = [
    'Initializing...',
    'Connecting to Keycloak...',
    'Authenticating credentials...',
    'Verifying user permissions...',
    'Loading user profile...',
    'Fetching roles and access...',
    'Establishing secure session...',
    'Loading application resources...',
    'Preparing map interface...',
    'Almost ready...'
  ];

  useEffect(() => {
    // Clear any existing intervals
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);

    // Start progress counter
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min((elapsed / 20000) * 100, 100);
        return Math.floor(progress);
      });
    }, 50);

    // Start message rotator
    let messageIndex = 0;
    messageIntervalRef.current = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[messageIndex]);
    }, 2000);

    // Force minimum 20 seconds loading
    const minimumLoadTimer = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      setShowLoading(false);
      setLoadingProgress(100);
    }, 20000);

    // Cleanup on unmount
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      clearTimeout(minimumLoadTimer);
    };
  }, []);

  if (showLoading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <h2>Flood Monitoring</h2>
          
          <div className="loading-progress-container">
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-fill" 
                style={{ width: `${loadingProgress}%` }}
              >
                <div className="progress-shimmer"></div>
              </div>
            </div>
            <div className="loading-progress-text">
              {loadingProgress}%
            </div>
          </div>
          
          <div className="loading-message">
            <i className="bi bi-arrow-repeat loading-spinner-small"></i>
            <span>{currentMessage}</span>
          </div>
          
          <div className="loading-tips">
            <small>Please wait while we securely connect you...</small>
          </div>
          
          <div className="loading-steps">
            {loadingMessages.slice(0, 5).map((_, idx) => (
              <div 
                key={idx}
                className={`loading-step ${idx === Math.floor(loadingProgress / 20) ? 'active' : ''} ${idx < Math.floor(loadingProgress / 20) ? 'completed' : ''}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <i className="bi bi-shield-lock-fill login-icon"></i>
          <h1>Flood Monitoring</h1>
          <p>Please log in to access the application</p>
          <button onClick={() => window.location.reload()} className="login-button">
            <i className="bi bi-box-arrow-in-right"></i>
            Login with Keycloak
          </button>
        </div>
      </div>
    );
  }

  // Updated handleLayerSelect to fetch real time values from GeoServer
  const handleLayerSelect = async (layer) => {
    setActiveLayer(layer);
    
    if (layer === 'water_depth') {
      // Show loading state
      setTimeSeriesConfig(prev => ({ 
        ...prev, 
        isLoading: true, 
        isVisible: true,
        layerName: 'Loading time series data from GeoServer...'
      }));
      
      try {
        // Fetch REAL time values from GeoServer (no hardcoded values)
        console.log('🔄 Fetching time values from GeoServer...');
        
        const realTimeValues = await TimeSeriesService.checkLayerTimeDimension(
          'geonode:water_depth',  // Layer name
          'geonode',               // Workspace
          'http://10.150.16.184/geoserver'  // GeoServer URL (using HTTP to avoid CORS)
        );
        
        if (realTimeValues && realTimeValues.length > 0) {
          console.log(`✅ Successfully loaded ${realTimeValues.length} real time values from GeoServer`);
          console.log(`📅 Time range: ${realTimeValues[0]} to ${realTimeValues[realTimeValues.length - 1]}`);
          
          // Set the real time values
          setTimeSeriesConfig({
            isVisible: true,
            timeValues: realTimeValues,
            currentIndex: 0,
            isLoading: false,
            layerName: `Water Depth (${realTimeValues.length} timesteps)`
          });
        } else {
          // No time values found
          console.error('❌ No time values found for water_depth layer');
          setTimeSeriesConfig({
            isVisible: false,
            timeValues: [],
            currentIndex: 0,
            isLoading: false,
            layerName: ''
          });
          
          // Optional: Show user-friendly message
          alert('No time series data available for Water Depth layer. Please check GeoServer configuration.');
        }
      } catch (error) {
        console.error('❌ Error loading time series data:', error);
        setTimeSeriesConfig({
          isVisible: false,
          timeValues: [],
          currentIndex: 0,
          isLoading: false,
          layerName: ''
        });
        
        // Optional: Show error message to user
        alert('Failed to load time series data. Please check if GeoServer is accessible.');
      }
    } else {
      // Hide time series control for other layers
      setTimeSeriesConfig(prev => ({ ...prev, isVisible: false }));
    }
  };

  const handleTimeChange = (index, timeValue) => {
    console.log(`Time changed to index ${index}: ${timeValue}`);
    setTimeSeriesConfig(prev => ({
      ...prev,
      currentIndex: index
    }));
  };

  const handlePlayStateChange = (isPlaying) => {
    console.log(`Animation is ${isPlaying ? 'playing' : 'paused'}`);
  };

  const handleCloseForecast = () => {
    setShowForecast(false);
    setForecastData(null);
  };

  return (
    <div className="app">
      <Navbar />
      <div className="main-container">
        <Sidebar 
          activeLayer={activeLayer}
          setActiveLayer={handleLayerSelect}
          forecastData={forecastData}
          setForecastData={setForecastData}
          setShowForecast={setShowForecast}
        />
        <Map 
          activeLayer={activeLayer} 
          timeSeriesConfig={timeSeriesConfig}
        />
      </div>
      {showForecast && forecastData && (
        <ForecastCard 
          forecastData={forecastData} 
          onClose={handleCloseForecast}
        />
      )}
      <TimeSeriesControl 
        isVisible={timeSeriesConfig.isVisible}
        timeValues={timeSeriesConfig.timeValues}
        onTimeChange={handleTimeChange}
        onPlayStateChange={handlePlayStateChange}
        layerName={timeSeriesConfig.layerName}
      />
    </div>
  );
}

export default App;
