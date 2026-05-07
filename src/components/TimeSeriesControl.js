import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimeSeriesControl.css';

const TimeSeriesControl = ({ 
  isVisible, 
  timeValues, 
  onTimeChange, 
  onPlayStateChange,
  layerName 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const animationRef = useRef(null);
  const isUpdatingFromProps = useRef(false);
  const previousTimeValuesRef = useRef(timeValues);

  const handleTimeChangeCallback = useCallback((index, timeValue) => {
    if (onTimeChange) onTimeChange(index, timeValue);
  }, [onTimeChange]);

  const handlePlayStateChangeCallback = useCallback((playing) => {
    if (onPlayStateChange) onPlayStateChange(playing);
  }, [onPlayStateChange]);

  // Sync play state
  useEffect(() => {
    if (!isUpdatingFromProps.current) {
      handlePlayStateChangeCallback(isPlaying);
    }
  }, [isPlaying, handlePlayStateChangeCallback]);

  // Update when timeValues change
  useEffect(() => {
    if (timeValues && timeValues.length > 0 && timeValues !== previousTimeValuesRef.current) {
      previousTimeValuesRef.current = timeValues;
      isUpdatingFromProps.current = true;
      setCurrentIndex(0);
      handleTimeChangeCallback(0, timeValues[0]);
      isUpdatingFromProps.current = false;
    }
  }, [timeValues, handleTimeChangeCallback]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !timeValues || timeValues.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    let lastUpdate = 0;
    
    const animate = (timestamp) => {
      if (!lastUpdate) {
        lastUpdate = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const elapsed = timestamp - lastUpdate;
      
      if (elapsed >= animationSpeed) {
        setCurrentIndex(prevIndex => {
          if (prevIndex >= timeValues.length - 1) {
            // End of animation
            setIsPlaying(false);
            handlePlayStateChangeCallback(false);
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            return prevIndex;
          }
          
          const nextIndex = prevIndex + 1;
          const newTime = timeValues[nextIndex];
          
          if (!isDragging && !isUpdatingFromProps.current) {
            handleTimeChangeCallback(nextIndex, newTime);
          }
          
          lastUpdate = timestamp;
          return nextIndex;
        });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, timeValues, animationSpeed, handleTimeChangeCallback, handlePlayStateChangeCallback, isDragging]);

  const handlePlay = () => {
    if (currentIndex >= timeValues.length - 1) {
      isUpdatingFromProps.current = true;
      setCurrentIndex(0);
      handleTimeChangeCallback(0, timeValues[0]);
      isUpdatingFromProps.current = false;
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    isUpdatingFromProps.current = true;
    setCurrentIndex(0);
    handleTimeChangeCallback(0, timeValues[0]);
    isUpdatingFromProps.current = false;
  };

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    isUpdatingFromProps.current = true;
    setCurrentIndex(index);
    handleTimeChangeCallback(index, timeValues[index]);
    isUpdatingFromProps.current = false;
    
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (e) => {
    setAnimationSpeed(parseInt(e.target.value));
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'No date';
    const date = new Date(isoString);
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      hour12: false
    });
  };

  const getProgressPercentage = () => {
    if (!timeValues || timeValues.length === 0) return 0;
    return (currentIndex / (timeValues.length - 1)) * 100;
  };

  if (!isVisible || !timeValues || timeValues.length === 0) {
    return null;
  }

  return (
    <div className="time-series-control">
      <div className="control-header">
        <div className="layer-info">
          <strong>{layerName || 'Time Series Layer'}</strong>
        </div>
        <div className="time-info">
          <div className="current-time">
            <strong>Current:</strong> {formatDate(timeValues[currentIndex])}
          </div>
          <div className="time-range">
            <strong>Range:</strong> {formatDate(timeValues[0])} → {formatDate(timeValues[timeValues.length - 1])}
          </div>
        </div>
      </div>
      
      <div className="control-buttons">
        <button onClick={handlePlay} disabled={isPlaying} className="control-btn play-btn">
          ▶ Play
        </button>
        <button onClick={handlePause} disabled={!isPlaying} className="control-btn pause-btn">
          ⏸ Pause
        </button>
        <button onClick={handleStop} className="control-btn stop-btn">
          ⏹ Stop
        </button>
      </div>
      
      <div className="slider-container">
        <input 
          type="range" 
          min="0"
          max={timeValues.length - 1} 
          value={currentIndex} 
          onChange={handleSliderChange} 
          onMouseDown={() => setIsDragging(true)} 
          onMouseUp={() => setIsDragging(false)} 
          className="time-slider" 
          step="1"
        />
        <div className="slider-labels">
          <span>{formatDate(timeValues[0])}</span>
          <span>{formatDate(timeValues[Math.floor(timeValues.length / 2)])}</span>
          <span>{formatDate(timeValues[timeValues.length - 1])}</span>
        </div>
      </div>
      
      <div className="control-footer">
        <div className="speed-control">
          <span>Animation Speed:</span>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={animationSpeed}
            onChange={handleSpeedChange}
            className="speed-slider"
          />
          <span className="speed-value">{animationSpeed}ms</span>
        </div>
        <div className="time-value-counter">
          {currentIndex + 1} / {timeValues.length} timesteps
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesControl;
