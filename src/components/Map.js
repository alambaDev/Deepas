// Map.js - Fixed version without layer flashing/flickering

import React, { useEffect, useRef, useState } from 'react';

import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';

import {
  Style,
  Icon,
  Fill,
  Stroke,
  Text
} from 'ol/style';

import 'ol/ol.css';
import './MapCard.css';

// ======================================================
// Metadata Cache
// ======================================================

const metadataCache = {};

// ======================================================
// Fetch Layer Metadata including Legend URL
// ======================================================

async function fetchLayerMetadata(layerName) {

  const baseUrl = '/geoserver/geonode/wms';
  const workspace = 'geonode';

  if (metadataCache[layerName]) {
    return metadataCache[layerName];
  }

  try {

    const capabilitiesUrl =
      `${baseUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;

    const response = await fetch(capabilitiesUrl);

    const xmlText = await response.text();

    const parser = new DOMParser();

    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const fullLayerName = `${workspace}:${layerName}`;

    let layer = null;

    const allLayers = xmlDoc.querySelectorAll('Layer');

    for (const l of allLayers) {

      const nameEl = l.querySelector('Name');

      if (
        nameEl?.textContent === fullLayerName ||
        nameEl?.textContent === layerName
      ) {
        layer = l;
        break;
      }
    }

    if (layer) {

      const title =
        layer.querySelector('Title')?.textContent || layerName;

      const abstract =
        layer.querySelector('Abstract')?.textContent ||
        'No description provided';

      const keywords = Array.from(
        layer.querySelectorAll('Keyword')
      ).map(k => k.textContent);

      const bbox4326 =
        layer.querySelector('BoundingBox[SRS="EPSG:4326"]');

      // Fetch legend URL from GeoServer
      let legendUrl = null;
      const legendURL = layer.querySelector('LegendURL OnlineResource');
      if (legendURL) {
        legendUrl = legendURL.getAttribute('xlink:href');
      }
      
      // If no legend URL found, construct it
      if (!legendUrl) {
        legendUrl = `/geoserver/geonode/wms?request=GetLegendGraphic&version=1.1.1&format=image/png&width=30&height=30&layer=${workspace}:${layerName}`;
      }

      const metadata = {
        name: layerName,
        title,
        description: abstract,
        keywords,
        legendUrl,
        bounds: bbox4326
          ? {
              minx: parseFloat(bbox4326.getAttribute('minx')),
              miny: parseFloat(bbox4326.getAttribute('miny')),
              maxx: parseFloat(bbox4326.getAttribute('maxx')),
              maxy: parseFloat(bbox4326.getAttribute('maxy'))
            }
          : null
      };

      metadataCache[layerName] = metadata;

      return metadata;
    }

    throw new Error(`Layer ${layerName} not found`);

  } catch (error) {

    console.error(error);

    return getDefaultMetadata(layerName);
  }
}

// ======================================================
// Default Metadata
// ======================================================

function getDefaultMetadata(layerName) {

  const defaultMetadata = {

    depth_max: {
      title: 'Maximum Flood Depth',
      description:
        'Maximum flood depth data showing the highest water levels.',
      keywords: ['flood', 'depth'],
      legendUrl: `/geoserver/geonode/wms?request=GetLegendGraphic&version=1.1.1&format=image/png&width=30&height=30&layer=geonode:depth_max`
    },

    time_of_max_depth: {
      title: 'Time of Maximum Flood Depth',
      description:
        'Temporal analysis showing when maximum flood depth occurred.',
      keywords: ['time', 'flood'],
      legendUrl: `/geoserver/geonode/wms?request=GetLegendGraphic&version=1.1.1&format=image/png&width=30&height=30&layer=geonode:time_of_max_depth`
    },

    water_depth: {
      title: 'Water Depth',
      description:
        'Real-time water depth monitoring.',
      keywords: ['water', 'depth'],
      legendUrl: `/geoserver/geonode/wms?request=GetLegendGraphic&version=1.1.1&format=image/png&width=30&height=30&layer=geonode:water_depth`
    },

    exposed_infrastructure: {
      title: 'Exposed Infrastructure',
      description:
        'Infrastructure at risk during flood events.',
      keywords: ['risk', 'infrastructure'],
      legendUrl: `/geoserver/geonode/wms?request=GetLegendGraphic&version=1.1.1&format=image/png&width=30&height=30&layer=geonode:exposed_infrastructure`
    }
  };

  const meta =
    defaultMetadata[layerName] || {

      title: layerName.replace(/_/g, ' ').toUpperCase(),

      description:
        'Layer information from GeoServer WMS.',

      keywords: ['GIS'],
      
      legendUrl: null
    };

  return {
    name: layerName,
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    legendUrl: meta.legendUrl,
    bounds: null
  };
}

// ======================================================
// Parse Legend from GeoServer Legend URL
// ======================================================

async function fetchLegendData(legendUrl) {
  if (!legendUrl) return null;
  
  try {
    // Fetch the legend image as a blob
    const response = await fetch(legendUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    
    // For text-based legends, we could parse the image, but since GeoServer returns an image,
    // we'll just display the image. For the text version, we'll use a predefined mapping.
    return { imageUrl, type: 'image' };
  } catch (error) {
    console.error('Error fetching legend:', error);
    return null;
  }
}

// ======================================================
// Main Component
// ======================================================

const MapComponent = ({
  activeLayer,
  timeSeriesConfig,
  locationPin,
  showLayerCard,
  onCloseCard
}) => {

  const mapRef = useRef(null);

  const mapInstanceRef = useRef(null);

  const wmsLayerRef = useRef(null);

  const currentTimeRef = useRef(null);

  const markerLayerRef = useRef(null);

  const markerFeatureRef = useRef(null);

  const cardContainerRef = useRef(null);

  const [layerMetadata, setLayerMetadata] = useState({});

  const [metadataLoading, setMetadataLoading] = useState(false);
  
  const [legendImageUrl, setLegendImageUrl] = useState(null);
  
  const [legendLoading, setLegendLoading] = useState(false);

  // ======================================================
  // Fetch Metadata
  // ======================================================

  useEffect(() => {

    const loadMetadata = async () => {

      if (activeLayer && !layerMetadata[activeLayer]) {

        setMetadataLoading(true);

        try {

          const metadata =
            await fetchLayerMetadata(activeLayer);

          setLayerMetadata(prev => ({
            ...prev,
            [activeLayer]: metadata
          }));

        } catch (error) {

          console.error(error);

        } finally {

          setMetadataLoading(false);
        }
      }
    };

    loadMetadata();

  }, [activeLayer]);

  // ======================================================
  // Fetch Legend Image when metadata is available
  // ======================================================

  useEffect(() => {
    
    const loadLegend = async () => {
      const metadata = layerMetadata[activeLayer];
      
      if (metadata && metadata.legendUrl) {
        setLegendLoading(true);
        try {
          const legendData = await fetchLegendData(metadata.legendUrl);
          if (legendData && legendData.imageUrl) {
            setLegendImageUrl(legendData.imageUrl);
          } else {
            setLegendImageUrl(null);
          }
        } catch (error) {
          console.error('Error loading legend:', error);
          setLegendImageUrl(null);
        } finally {
          setLegendLoading(false);
        }
      } else {
        setLegendImageUrl(null);
      }
    };
    
    loadLegend();
    
    // Cleanup object URL
    return () => {
      if (legendImageUrl) {
        URL.revokeObjectURL(legendImageUrl);
      }
    };
    
  }, [layerMetadata, activeLayer]);

  // ======================================================
  // Get Layer Info
  // ======================================================

  const getLayerInfo = (layerId) => {

    const metadata = layerMetadata[layerId];

    if (metadata) {

      const stats = [
        metadata.bounds
          ? 'Full South Africa coverage'
          : 'Geographic data available'
      ];

      return {
        name: metadata.title || layerId,
        description: metadata.description,
        metadata: `Source: GeoServer WMS`,
        legendUrl: metadata.legendUrl,
        legendImageUrl: legendImageUrl,
        legendLoading: legendLoading,
        stats
      };
    }

    return {
      name: layerId,
      description: metadataLoading
        ? 'Loading metadata...'
        : 'Layer information',
      metadata: 'GeoServer',
      legendUrl: null,
      legendImageUrl: null,
      legendLoading: false,
      stats: []
    };
  };

  // ======================================================
  // Initialize Map ONCE
  // ======================================================

  useEffect(() => {

    if (mapInstanceRef.current) return;

    console.log('🗺️ Initializing map');

    const osmLayer = new TileLayer({
      source: new OSM()
    });

    const markerLayer = new VectorLayer({
      source: new VectorSource()
    });

    markerLayerRef.current = markerLayer;

    const map = new Map({

      target: mapRef.current,

      layers: [
        osmLayer,
        markerLayer
      ],

      view: new View({
        center: fromLonLat([26.4542, -29.5734]),
        zoom: 6
      })
    });

    mapInstanceRef.current = map;

    return () => {

      if (mapInstanceRef.current) {

        mapInstanceRef.current.setTarget(undefined);

        mapInstanceRef.current = null;
      }
    };

  }, []);

  // ======================================================
  // Create WMS Layer ONLY when activeLayer changes
  // ======================================================

  useEffect(() => {

    const map = mapInstanceRef.current;

    if (!map) return;

    console.log(`🔄 Active layer: ${activeLayer}`);

    // Remove old layer
    if (wmsLayerRef.current) {

      map.removeLayer(wmsLayerRef.current);

      wmsLayerRef.current = null;

      currentTimeRef.current = null;
    }

    if (!activeLayer) return;

    console.log(`🌊 Adding ${activeLayer}`);

    const wmsSource = new TileWMS({

      url: '/geoserver/geonode/wms',

      params: {

        LAYERS: `geonode:${activeLayer}`,

        TILED: true,

        FORMAT: 'image/png',

        TRANSPARENT: true,

        VERSION: '1.1.1'
      },

      serverType: 'geoserver',

      transition: 0
    });

    // Set initial time
    if (
      timeSeriesConfig?.isVisible &&
      timeSeriesConfig?.activeLayerTimeSeries === activeLayer &&
      timeSeriesConfig?.timeValues?.length > 0
    ) {

      const currentTime =
        timeSeriesConfig.timeValues[
          timeSeriesConfig.currentIndex
        ];

      if (currentTime) {

        wmsSource.updateParams({
          TIME: currentTime
        });

        currentTimeRef.current = currentTime;
      }
    }

    const wmsLayer = new TileLayer({

      source: wmsSource,

      opacity: 0.8,

      visible: true
    });

    wmsLayerRef.current = wmsLayer;

    map.addLayer(wmsLayer);

    console.log(`✅ ${activeLayer} added`);

  }, [activeLayer]);

  // ======================================================
  // Update TIME ONLY
  // ======================================================

  useEffect(() => {

    if (!wmsLayerRef.current) return;

    if (!activeLayer) return;

    if (
      !timeSeriesConfig?.isVisible ||
      timeSeriesConfig?.activeLayerTimeSeries !== activeLayer ||
      !timeSeriesConfig?.timeValues?.length
    ) {
      return;
    }

    const currentTime =
      timeSeriesConfig.timeValues[
        timeSeriesConfig.currentIndex
      ];

    if (!currentTime) return;

    // Prevent duplicate refresh
    if (currentTimeRef.current === currentTime) {
      return;
    }

    currentTimeRef.current = currentTime;

    console.log(`⏰ Updating TIME: ${currentTime}`);

    const source =
      wmsLayerRef.current.getSource();

    if (source) {

      source.updateParams({
        TIME: currentTime
      });

      source.refresh();
    }

  }, [
    timeSeriesConfig?.currentIndex,
    timeSeriesConfig?.isVisible,
    activeLayer
  ]);

  // ======================================================
  // Handle Location Marker
  // ======================================================

  useEffect(() => {

    if (
      !mapInstanceRef.current ||
      !markerLayerRef.current
    ) return;

    const source =
      markerLayerRef.current.getSource();

    source.clear();

    if (
      locationPin &&
      locationPin.lat &&
      locationPin.lon
    ) {

      const markerFeature = new Feature({

        geometry: new Point(
          fromLonLat([
            locationPin.lon,
            locationPin.lat
          ])
        )
      });

      markerFeature.setStyle(
        new Style({

          image: new Icon({

            anchor: [0.5, 1],

            src:
              'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',

            scale: 1.2,

            crossOrigin: 'anonymous'
          }),

          text: new Text({

            text:
              locationPin.name || 'Location',

            font: 'bold 12px Arial',

            fill: new Fill({
              color: '#fff'
            }),

            stroke: new Stroke({
              color: '#000',
              width: 2
            }),

            offsetY: -30
          })
        })
      );

      source.addFeature(markerFeature);

      mapInstanceRef.current.getView().animate({

        center: fromLonLat([
          locationPin.lon,
          locationPin.lat
        ]),

        zoom: 7,

        duration: 1000
      });

      markerFeatureRef.current =
        markerFeature;
    }

  }, [locationPin]);

  // ======================================================
  // Layer Card
  // ======================================================

  useEffect(() => {

    if (!cardContainerRef.current) return;

    const cardElement =
      cardContainerRef.current;

    if (showLayerCard && activeLayer) {

      const layerInfo =
        getLayerInfo(activeLayer);

      const cardTitle =
        cardElement.querySelector(
          '.card-header h3'
        );

      if (cardTitle) {

        cardTitle.textContent =
          `${layerInfo.name} Information`;
      }

      const layerDetailsDiv =
        cardElement.querySelector(
          '.layer-details'
        );

      if (layerDetailsDiv) {

        let legendHtml = '';
        
        if (layerInfo.legendLoading) {
          legendHtml = `
            <div class="legend-section">
              <div class="legend-loading">Loading legend from GeoServer...</div>
            </div>
          `;
        } else if (layerInfo.legendImageUrl) {
          legendHtml = `
            <div class="legend-section">
              <h4 class="legend-title">Legend</h4>
              <img 
                src="${layerInfo.legendImageUrl}" 
                alt="Layer Legend"
                class="legend-image"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
              />
              <div class="legend-error" style="display:none;">
                Legend not available
              </div>
            </div>
          `;
        } else if (layerInfo.legendUrl) {
          legendHtml = `
            <div class="legend-section">
              <h4 class="legend-title">Legend</h4>
              <div class="legend-error">Unable to load legend</div>
            </div>
          `;
        }

        layerDetailsDiv.innerHTML = `
          <div class="layer-content-wrapper">
            <div class="layer-info-section">
              <p class="layer-description">
                ${layerInfo.description}
              </p>
              <div class="layer-metadata">
                ${layerInfo.metadata}
              </div>
            </div>
            ${legendHtml}
          </div>
        `;
      }

      cardElement.classList.remove('hidden');

      cardElement.classList.add('visible');

    } else {

      cardElement.classList.add('hidden');

      cardElement.classList.remove('visible');
    }

  }, [
    showLayerCard,
    activeLayer,
    layerMetadata,
    legendImageUrl,
    legendLoading
  ]);

  // ======================================================
  // Render
  // ======================================================

  return (
    <>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative'
        }}
      />

      <div
        ref={cardContainerRef}
        className="map-info-card hidden"
      >

        <div className="card-header">

          <h3>Layer Information</h3>

          <button
            className="close-card-btn"
            onClick={() => {
              if (onCloseCard) {
                onCloseCard();
              }
            }}
          >
            &times;
          </button>

        </div>

        <div className="card-content">

          <div className="layer-details"></div>

        </div>

      </div>
    </>
  );
};

export default MapComponent;
