// TimeSeriesControl.js - Update to show current layer info
import React, { useState, useEffect, useRef } from 'react';
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
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [isDragging, setIsDragging] = useState(false);
  
  const intervalRef = useRef(null);
  const timeValuesRef = useRef(timeValues);
  const onTimeChangeRef = useRef(onTimeChange);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);

  // Update refs when props change
  useEffect(() => {
    timeValuesRef.current = timeValues;
  }, [timeValues]);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  useEffect(() => {
    onPlayStateChangeRef.current = onPlayStateChange;
  }, [onPlayStateChange]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Reset when timeValues change (new layer selected)
  useEffect(() => {
    if (timeValues && timeValues.length > 0) {
      // Reset index to 0 for new layer
      setCurrentIndex(0);
      if (onTimeChangeRef.current) {
        onTimeChangeRef.current(0, timeValues[0]);
      }
      // Stop animation when switching layers
      if (isPlayingRef.current) {
        setIsPlaying(false);
        if (onPlayStateChangeRef.current) {
          onPlayStateChangeRef.current(false);
        }
      }
    }
  }, [timeValues]);

  // Handle animation with setInterval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying && timeValuesRef.current && timeValuesRef.current.length > 0) {
      intervalRef.current = setInterval(() => {
        const currentIdx = currentIndexRef.current;
        const timeVals = timeValuesRef.current;
        
        if (!timeVals || timeVals.length === 0) {
          return;
        }
        
        let nextIndex = currentIdx + 1;
        
        if (nextIndex >= timeVals.length) {
          // Stop animation at the end
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          if (onPlayStateChangeRef.current) {
            onPlayStateChangeRef.current(false);
          }
          return;
        }
        
        setCurrentIndex(nextIndex);
        if (onTimeChangeRef.current && !isDragging) {
          onTimeChangeRef.current(nextIndex, timeVals[nextIndex]);
        }
      }, animationSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, animationSpeed, isDragging]);

  const handlePlay = () => {
    const timeVals = timeValuesRef.current;
    if (!timeVals || timeVals.length === 0) return;
    
    if (currentIndexRef.current >= timeVals.length - 1) {
      setCurrentIndex(0);
      if (onTimeChangeRef.current) {
        onTimeChangeRef.current(0, timeVals[0]);
      }
    }
    
    setIsPlaying(true);
    if (onPlayStateChangeRef.current) {
      onPlayStateChangeRef.current(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (onPlayStateChangeRef.current) {
      onPlayStateChangeRef.current(false);
    }
  };

  const handleStop = () => {
    const timeVals = timeValuesRef.current;
    if (!timeVals || timeVals.length === 0) return;
    
    setIsPlaying(false);
    if (onPlayStateChangeRef.current) {
      onPlayStateChangeRef.current(false);
    }
    
    setCurrentIndex(0);
    if (onTimeChangeRef.current) {
      onTimeChangeRef.current(0, timeVals[0]);
    }
  };

  const handleSliderChange = (e) => {
    const timeVals = timeValuesRef.current;
    if (!timeVals || timeVals.length === 0) return;
    
    const index = parseInt(e.target.value);
    setCurrentIndex(index);
    if (onTimeChangeRef.current) {
      onTimeChangeRef.current(index, timeVals[index]);
    }
    
    if (isPlayingRef.current) {
      setIsPlaying(false);
      if (onPlayStateChangeRef.current) {
        onPlayStateChangeRef.current(false);
      }
    }
  };

  const handleSpeedChange = (e) => {
    setAnimationSpeed(parseInt(e.target.value));
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'No date';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return isoString;
      }
      return date.toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        hour12: false
      });
    } catch (error) {
      return isoString;
    }
  };

  // Don't render if not visible or no time values
  if (!isVisible || !timeValues || timeValues.length === 0) {
    return null;
  }

  return (
    <div className="time-series-control">  

      <div className="controls-row">
        <div className="control-buttons">
          <button 
            onClick={handlePlay} 
            disabled={isPlaying} 
            className="control-btn play-btn"
            title="Play animation"
          >
            ▶ Play
          </button>
          <button 
            onClick={handlePause} 
            disabled={!isPlaying} 
            className="control-btn pause-btn"
            title="Pause animation"
          >
            ⏸ Pause
          </button>
          <button 
            onClick={handleStop} 
            className="control-btn stop-btn"
            title="Stop and reset to beginning"
          >
            ⏹ Stop
          </button>
        </div>
        
        <div className="speed-control">
          <span className="speed-label">Animation Speed:</span>
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
      
      <div className="time-value-counter">
        <span className="current-time">Current: {formatDate(timeValues[currentIndex])}</span>
      </div>
    </div>
  );
};

export default TimeSeriesControl;
