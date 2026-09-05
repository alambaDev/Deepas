// services/TimeSeriesService.js
export class TimeSeriesService {
  static cache = new Map();
  
  static async checkLayerTimeDimension(layerName, workspace = 'geonode', baseUrl = '') {
    const cleanLayerName = layerName.includes(':') ? layerName.split(':')[1] : layerName;
    const cacheKey = `${workspace}:${cleanLayerName}`;
  
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Using cached time values for ${cleanLayerName}`);
      return this.cache.get(cacheKey);
    }
  
    try {
      // Use proxy URL to avoid CORS issues
      const url = `/geoserver/${workspace}/wms?service=WMS&version=1.1.1&request=GetCapabilities`;
      
      console.log(`Fetching capabilities from proxy: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");
      
      const parserError = xml.querySelector('parsererror');
      if (parserError) throw new Error('XML parsing error');
      
      const allLayers = xml.getElementsByTagName("Layer");
      let timeValues = [];
      
      function findLayer(layers, targetName) {
        for (let i = 0; i < layers.length; i++) {
          const nameElement = layers[i].getElementsByTagName("Name")[0];
          if (nameElement) {
            const layerFullName = nameElement.textContent;
            if (layerFullName === targetName || 
                layerFullName === `${workspace}:${targetName}` ||
                layerFullName === targetName.split(':')[1]) {
              return layers[i];
            }
          }
          const nestedLayers = layers[i].getElementsByTagName("Layer");
          if (nestedLayers.length > 0) {
            const found = findLayer(nestedLayers, targetName);
            if (found) return found;
          }
        }
        return null;
      }
      
      let targetLayer = findLayer(allLayers, cleanLayerName);
      
      if (!targetLayer) {
        targetLayer = findLayer(allLayers, `${workspace}:${cleanLayerName}`);
      }
      
      if (targetLayer) {
        console.log(`✅ Found layer: ${cleanLayerName}`);
        
        // Check for Dimension tag
        const dimensions = targetLayer.getElementsByTagName("Dimension");
        for (let j = 0; j < dimensions.length; j++) {
          const dimension = dimensions[j];
          if (dimension.getAttribute("name") === "time") {
            const timeExtentText = dimension.textContent.trim();
            if (timeExtentText) {
              console.log(`Found Dimension with time values`);
              timeValues = this.parseTimeExtent(timeExtentText);
              break;
            }
          }
        }
        
        // If not found in Dimension, check for Extent tag
        if (timeValues.length === 0) {
          const extents = targetLayer.getElementsByTagName("Extent");
          for (let j = 0; j < extents.length; j++) {
            const extent = extents[j];
            if (extent.getAttribute("name") === "time") {
              const timeExtentText = extent.textContent.trim();
              if (timeExtentText) {
                console.log(`Found Extent with time values`);
                timeValues = this.parseTimeExtent(timeExtentText);
                break;
              }
            }
          }
        }
        
        if (timeValues.length > 0) {
          timeValues.sort();
          console.log(`✅ Layer ${cleanLayerName} has ${timeValues.length} time values`);
          console.log(`📅 Time range: ${timeValues[0]} to ${timeValues[timeValues.length - 1]}`);
          
          // Cache for 5 minutes
          this.cache.set(cacheKey, timeValues);
          setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
          
          return timeValues;
        } else {
          console.log(`⚠️ Layer ${cleanLayerName} found but no time values available`);
          return [];
        }
      } else {
        console.log(`❌ Layer ${cleanLayerName} not found in capabilities`);
        return [];
      }
      
    } catch (error) {
      console.error(`❌ Error checking time dimension for ${layerName}:`, error);
      return [];
    }
  }
  
  static parseTimeExtent(timeExtent) {
    if (!timeExtent) return [];
    
    // Handle comma-separated list of time values
    if (timeExtent.includes(",") && !timeExtent.includes("/")) {
      const values = timeExtent.split(",").map(date => date.trim());
      return values;
    }
    
    // Handle time range with interval (e.g., "2024-01-01T00:00:00Z/2024-01-31T00:00:00Z/PT1H")
    if (timeExtent.includes("/")) {
      const parts = timeExtent.split("/");
      if (parts.length === 3) {
        const start = new Date(parts[0]);
        const end = new Date(parts[1]);
        const interval = parts[2];
        const intervalMs = this.parseInterval(interval);
        
        if (intervalMs > 0 && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const timeValues = [];
          let current = start;
          while (current <= end) {
            timeValues.push(current.toISOString());
            current = new Date(current.getTime() + intervalMs);
          }
          return timeValues;
        }
      }
      return parts;
    }
    
    // Single time value
    return [timeExtent];
  }
  
  static parseInterval(interval) {
    // Parse ISO 8601 duration format
    // Examples: PT1H (1 hour), PT30M (30 minutes), P1D (1 day)
    
    const hoursMatch = interval.match(/PT(\d+)H/);
    if (hoursMatch) return parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    
    const minutesMatch = interval.match(/PT(\d+)M/);
    if (minutesMatch) return parseInt(minutesMatch[1]) * 60 * 1000;
    
    const secondsMatch = interval.match(/PT(\d+)S/);
    if (secondsMatch) return parseInt(secondsMatch[1]) * 1000;
    
    const daysMatch = interval.match(/P(\d+)D/);
    if (daysMatch) return parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
    
    // Default to 1 hour if interval not recognized
    console.log(`⚠️ Unknown interval format: ${interval}, defaulting to 1 hour`);
    return 60 * 60 * 1000;
  }
}
