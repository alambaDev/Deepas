import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import Navbar from './components/Navbar';
import ForecastCard from './components/ForecastCard';
import TimeSeriesControl from './components/TimeSeriesControl';
import { useAuth } from './contexts/AuthContext';
import { TimeSeriesService } from './services/TimeSeriesService';
import './App.css';

function App() {
  const { authenticated } = useAuth();

  const [activeLayer, setActiveLayer] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [showForecast, setShowForecast] = useState(false);
  const [locationPin, setLocationPin] = useState(null);
  
  const [showLayerCard, setShowLayerCard] = useState(false);

  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');

  const [timeSeriesConfig, setTimeSeriesConfig] = useState({
    isVisible: false,
    timeValues: [],
    currentIndex: 0,
    isLoading: false,
    layerName: '',
    isPlaying: false,
    activeLayerTimeSeries: null
  });

  const progressIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Prevent duplicate requests
  const loadingLayerRef = useRef(false);

  // Prevent stale async responses
  const requestIdRef = useRef(0);

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

  // Derive if time-series is visible for forecast card adjustment
  const isTimeSeriesVisible = timeSeriesConfig.isVisible && timeSeriesConfig.activeLayerTimeSeries === activeLayer;

  /*
  ==========================================
  LOADING SCREEN
  ==========================================
  */

  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setLoadingProgress(
        Math.min(Math.floor((elapsed / 20000) * 100), 100)
      );
    }, 50);

    let messageIndex = 0;

    messageIntervalRef.current = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[messageIndex]);
    }, 2000);

    const timer = setTimeout(() => {
      clearInterval(progressIntervalRef.current);
      clearInterval(messageIntervalRef.current);
      setLoadingProgress(100);
      setShowLoading(false);
    }, 20000);

    return () => {
      clearInterval(progressIntervalRef.current);
      clearInterval(messageIntervalRef.current);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  /*
  ==========================================
  HANDLE Preview Card Toggle
  ==========================================
  */

  const handleToggleLayerCard = (show) => {
    setShowLayerCard(show);
  };

  const handleCloseCard = () => {
    setShowLayerCard(false);
  };

  /*
  ==========================================
  HANDLE LOCATION FOUND (FORECAST PIN)
  ==========================================
  */

  const handleLocationFound = useCallback((location) => {
    console.log('📍 Location found callback:', location);
    setLocationPin(location);
  }, []);

  /*
  ==========================================
  HANDLE LAYER SELECTION
  ==========================================
  */

  const handleLayerSelect = useCallback(async (layer) => {
    console.log(`📌 Layer selected: ${layer}`);

    // Prevent duplicate loading
    if (loadingLayerRef.current) {
      console.log('Layer already loading...');
      return;
    }

    setActiveLayer(layer);
    
    // Automatically show the info card when a layer is selected
    setShowLayerCard(true);

    // Fetch time series for the selected layer
    loadingLayerRef.current = true;

    const currentRequestId = ++requestIdRef.current;

    setTimeSeriesConfig(prev => ({
      ...prev,
      isVisible: false,
      timeValues: [],
      currentIndex: 0,
      isLoading: true,
      layerName: `Loading ${layer} time series...`,
      isPlaying: false,
      activeLayerTimeSeries: layer
    }));

    try {
      console.log(`🔄 Fetching time dimension values for ${layer}...`);

      const timeValues = await TimeSeriesService.checkLayerTimeDimension(
        layer,
        'geonode',
        '/geoserver'
      );

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) {
        console.log('Ignoring stale response');
        return;
      }

      if (Array.isArray(timeValues) && timeValues.length > 0) {
        console.log(`✅ Loaded ${timeValues.length} timesteps for ${layer}`);

        const displayNames = {
          'water_depth': 'Water Depth',
          'depth_max': 'Maximum Flood Depth',
          'time_of_max_depth': 'Time of Maximum Flood Depth',
          'exposed_infrastructure': 'Exposed Infrastructure'
        };

        setTimeSeriesConfig({
          isVisible: true,
          timeValues: timeValues,
          currentIndex: 0,
          isLoading: false,
          layerName: `${displayNames[layer] || layer} (${timeValues.length} timesteps)`,
          isPlaying: false,
          activeLayerTimeSeries: layer
        });
      } else {
        console.log(`ℹ️ No time dimension found for ${layer}`);

        setTimeSeriesConfig({
          isVisible: false,
          timeValues: [],
          currentIndex: 0,
          isLoading: false,
          layerName: '',
          isPlaying: false,
          activeLayerTimeSeries: null
        });
      }
    } catch (error) {
      console.error(`❌ Failed to load time series for ${layer}:`, error);

      setTimeSeriesConfig({
        isVisible: false,
        timeValues: [],
        currentIndex: 0,
        isLoading: false,
        layerName: '',
        isPlaying: false,
        activeLayerTimeSeries: null
      });
    } finally {
      loadingLayerRef.current = false;
    }
  }, []);

  /*
  ==========================================
  TIME SERIES EVENTS
  ==========================================
  */

  const handleTimeChange = useCallback((index, timeValue) => {
    if (index % 10 === 0) {
      console.log(`⏱ Time index changed: ${index}`, timeValue);
    }

    setTimeSeriesConfig((prev) => ({
      ...prev,
      currentIndex: index
    }));
  }, []);

  const handlePlayStateChange = useCallback((isPlaying) => {
    setTimeSeriesConfig((prev) => {
      if (prev.isPlaying === isPlaying) {
        return prev;
      }

      console.log(`🎬 Animation ${isPlaying ? 'started' : 'paused'}`);

      return {
        ...prev,
        isPlaying
      };
    });
  }, []);

  /*
  ==========================================
  FORECAST
  ==========================================
  */

  const handleCloseForecast = () => {
    setForecastData(null);
    setShowForecast(false);
    setLocationPin(null);
  };

  /*
  ==========================================
  LOADING SCREEN
  ==========================================
  */

  if (showLoading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <h2>Flood Monitoring</h2>

          <div className="loading-progress-container">
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{
                  width: `${loadingProgress}%`
                }}
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
            <small>
              Please wait while we securely connect you...
            </small>
          </div>
        </div>
      </div>
    );
  }

  /*
  ==========================================
  LOGIN SCREEN
  ==========================================
  */

  if (!authenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <i className="bi bi-shield-lock-fill login-icon"></i>

          <h1>Flood Monitoring</h1>

          <p>Please log in to access the application</p>

          <button
            onClick={() => window.location.reload()}
            className="login-button"
          >
            <i className="bi bi-box-arrow-in-right"></i>
            Login with Keycloak
          </button>
        </div>
      </div>
    );
  }

  /*
  ==========================================
  MAIN APP
  ==========================================
  */

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
          onToggleLayerCard={handleToggleLayerCard}
          showLayerCard={showLayerCard}
        />

        <Map
          activeLayer={activeLayer}
          timeSeriesConfig={timeSeriesConfig}
          locationPin={locationPin}
          showLayerCard={showLayerCard}
          onCloseCard={handleCloseCard}
        />
      </div>

      {showForecast && forecastData && (
        <ForecastCard
          forecastData={forecastData}
          onClose={handleCloseForecast}
          onLocationFound={handleLocationFound}
          isTimeSeriesVisible={isTimeSeriesVisible}
        />
      )}

      <TimeSeriesControl
        isVisible={timeSeriesConfig.isVisible && timeSeriesConfig.activeLayerTimeSeries === activeLayer}
        timeValues={timeSeriesConfig.timeValues}
        onTimeChange={handleTimeChange}
        onPlayStateChange={handlePlayStateChange}
        layerName={timeSeriesConfig.layerName}
      />
    </div>
  );
}

export default App;
