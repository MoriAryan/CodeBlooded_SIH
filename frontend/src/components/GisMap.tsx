import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Well, OffsetRelevance, TrajectoryPoint } from '../types';

interface GisMapProps {
  activeWell: Well | null;
  offsetWells: OffsetRelevance[];
  selectedOffsetId: string | null;
  onSelectOffset: (wellId: string) => void;
  radiusMeters: number;
  activeTrajectory?: TrajectoryPoint[];
  offsetTrajectories?: Record<string, TrajectoryPoint[]>;
  theme: 'light' | 'dark';
}

type BasemapType = 'ocean' | 'satellite' | 'street';

export const GisMap: React.FC<GisMapProps> = ({
  activeWell,
  offsetWells,
  selectedOffsetId,
  onSelectOffset,
  radiusMeters,
  activeTrajectory = [],
  offsetTrajectories = {},
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoriesLayerRef = useRef<L.LayerGroup | null>(null);

  const [basemap, setBasemap] = useState<BasemapType>('ocean');
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);

  // Basemap URLs (100% free, zero watermarks, high availability)
  const basemapUrls: Record<BasemapType, { url: string; attribution: string; maxZoom: number }> = {
    ocean: {
      url: 'https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, GEBCO, NOAA, National Geographic',
      maxZoom: 16,
    },
    satellite: {
      url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, Maxar, Earthstar Geographics',
      maxZoom: 18,
    },
    street: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = activeWell?.latitude || 58.44104;
    const initialLng = activeWell?.longitude || 1.88587;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Tile Layer
    const selectedConfig = basemapUrls[basemap];
    const tileLayer = L.tileLayer(selectedConfig.url, {
      attribution: selectedConfig.attribution,
      maxZoom: selectedConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const trajGroup = L.layerGroup().addTo(map);
    trajectoriesLayerRef.current = trajGroup;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Bulletproof ResizeObserver: ensures map resizes whenever tab/container changes
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    // Immediate and delayed invalidations
    map.invalidateSize();
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate map size when activeWell or container changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      if (activeWell?.latitude && activeWell?.longitude) {
        map.setView([activeWell.latitude, activeWell.longitude], 13.5);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [activeWell]);

  // Update Basemap Layer when changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const cfg = basemapUrls[basemap];
    const newLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [basemap]);

  // Update Trajectory Polylines & Bottom Hole Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajGroup = trajectoriesLayerRef.current;
    if (!map || !trajGroup) return;

    trajGroup.clearLayers();

    if (!showTrajectories) return;

    // 1. Draw Offset Trajectories
    Object.entries(offsetTrajectories).forEach(([wellId, points]) => {
      if (!points || points.length < 2) return;

      const isSelected = wellId === selectedOffsetId;
      const offsetInfo = offsetWells.find((o) => o.well_id === wellId);
      const isHighMatch = (offsetInfo?.overall_score ?? 0) >= 80;

      const polyColor = isSelected
        ? (theme === 'dark' ? '#f59e0b' : '#b45309')
        : isHighMatch
        ? (theme === 'dark' ? '#2dd4bf' : '#0f766e')
        : (theme === 'dark' ? '#78716c' : '#a8a29e');
      const polyWeight = isSelected ? 3.5 : 2.0;
      const polyOpacity = isSelected ? 1 : 0.8;

      const latlngs: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
      const polyline = L.polyline(latlngs, {
        color: polyColor,
        weight: polyWeight,
        opacity: polyOpacity,
        dashArray: isSelected ? undefined : '5, 5',
      }).addTo(trajGroup);

      polyline.on('click', () => onSelectOffset(wellId));

      // Bottom Hole Target Marker at TD
      const targetPoint = points[points.length - 1];
      const targetIconHtml = `
        <div class="target-marker ${isSelected ? 'selected' : ''}" style="border-color: ${polyColor}">
          <span class="target-label">${wellId.replace('NO 15/9-', '')}</span>
        </div>
      `;
      const targetIcon = L.divIcon({
        className: 'subsurface-target-icon',
        html: targetIconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const targetMarker = L.marker([targetPoint.latitude, targetPoint.longitude], {
        icon: targetIcon,
      }).addTo(trajGroup);

      targetMarker.on('click', () => onSelectOffset(wellId));

      targetMarker.bindPopup(`
        <div class="gis-popup ${theme}">
          <div class="popup-badge ${isHighMatch ? 'high-badge' : 'mod-badge'}">
            OFFSET RESERVOIR TARGET
          </div>
          <div class="popup-title">${wellId} (${offsetInfo?.name || ''})</div>
          <div class="popup-row"><span>Total Depth:</span> <strong>${targetPoint.measured_depth} m MD</strong></div>
          <div class="popup-row"><span>Score:</span> <strong>${offsetInfo?.overall_score || 70}% Match</strong></div>
        </div>
      `);
    });

    // 2. Draw Active Well Trajectory (Thick Vivid Petroleum Line)
    if (activeTrajectory && activeTrajectory.length > 1) {
      const activeColor = theme === 'dark' ? '#f59e0b' : '#b45309';
      const activeLatlngs: [number, number][] = activeTrajectory.map((p) => [p.latitude, p.longitude]);

      L.polyline(activeLatlngs, {
        color: activeColor,
        weight: 4.0,
        opacity: 0.95,
      }).addTo(trajGroup);

      // Active Bit Position Marker
      const bitPoint = activeTrajectory[activeTrajectory.length - 1];
      const bitIcon = L.divIcon({
        className: 'active-bit-icon',
        html: `<div class="bit-dot-pulse"><div class="pulse-wave"></div><div class="core-dot"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([bitPoint.latitude, bitPoint.longitude], { icon: bitIcon }).addTo(trajGroup);
    }
  }, [showTrajectories, activeTrajectory, offsetTrajectories, selectedOffsetId, offsetWells, theme, onSelectOffset]);

  // Update Surface Markers & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || !activeWell) return;

    markersGroup.clearLayers();

    const activeLat = activeWell.latitude || 58.44104;
    const activeLng = activeWell.longitude || 1.88587;

    // Update Radius Circle
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
    }
    const circle = L.circle([activeLat, activeLng], {
      radius: radiusMeters,
      color: theme === 'dark' ? '#38bdf8' : '#0284c7',
      weight: 1.5,
      dashArray: '5, 8',
      fillColor: theme === 'dark' ? '#38bdf8' : '#0284c7',
      fillOpacity: 0.04,
    }).addTo(map);
    circleLayerRef.current = circle;

    // Platform Template Marker (Production Facility / Template Slot)
    const platformIconHtml = `
      <div class="platform-facility-marker ${theme}">
        <div class="platform-hull">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2v20M5 22l7-18 7 18M7.5 15h9M9 10h6" />
          </svg>
        </div>
        <div class="facility-label">
          <span class="facility-name">VOLVE PLATFORM TEMPLATE</span>
          <span class="facility-sub">24 WELL SLOTS • 58°26'N 1°53'E</span>
        </div>
      </div>
    `;

    const platformIcon = L.divIcon({
      className: 'platform-div-icon',
      html: platformIconHtml,
      iconSize: [180, 48],
      iconAnchor: [90, 24],
    });

    const platformMarker = L.marker([activeLat, activeLng], { icon: platformIcon, zIndexOffset: 1000 }).addTo(markersGroup);

    platformMarker.bindPopup(`
      <div class="gis-popup ${theme}">
        <div class="popup-badge active-badge">SURFACE FACILITY</div>
        <div class="popup-title">Volve Field Platform (Mærsk Inspirer / Statoil)</div>
        <div class="popup-row"><span>Coordinates:</span> <strong>58.4410° N, 1.8859° E</strong></div>
        <div class="popup-row"><span>Water Depth:</span> <strong>84.0 m MSL</strong></div>
        <div class="popup-row"><span>Active Drilling Well:</span> <strong>${activeWell.well_id} (${activeWell.name})</strong></div>
        <div class="popup-row"><span>Current Bit MD:</span> <strong>${activeWell.current_depth_md?.toLocaleString()} m</strong></div>
      </div>
    `);

    // Individual Offset Slot Markers (displayed with slight radial distribution around platform)
    offsetWells.forEach((offset, idx) => {
      if (!offset.latitude || !offset.longitude) return;

      const isSelected = offset.well_id === selectedOffsetId;
      const isHighRel = offset.overall_score >= 80;

      // Small jitter around platform coordinates so overlapping platform wellheads are individually inspectable
      const angle = (idx / offsetWells.length) * 2 * Math.PI;
      const jitterDist = 0.0004 + (idx % 3) * 0.0002;
      const slotLat = activeLat + Math.cos(angle) * jitterDist;
      const slotLng = activeLng + Math.sin(angle) * jitterDist * 1.8;

      const slotColor = isSelected ? '#f59e0b' : isHighRel ? '#059669' : '#64748b';

      const slotIconHtml = `
        <div class="well-slot-marker ${isSelected ? 'selected' : ''}" style="border-color: ${slotColor}; color: ${slotColor}">
          <span class="slot-dot" style="background-color: ${slotColor}"></span>
        </div>
      `;

      const slotIcon = L.divIcon({
        className: 'well-slot-div-icon',
        html: slotIconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const slotMarker = L.marker([slotLat, slotLng], { icon: slotIcon }).addTo(markersGroup);

      slotMarker.on('click', () => onSelectOffset(offset.well_id));

      slotMarker.bindPopup(`
        <div class="gis-popup ${theme}">
          <div class="popup-badge ${isHighRel ? 'high-badge' : 'mod-badge'}">
            ${offset.overall_score}% CORRELATION MATCH
          </div>
          <div class="popup-title">${offset.well_id} — ${offset.name}</div>
          <div class="popup-row"><span>Surface Separation:</span> <strong>${offset.distance_m.toFixed(1)} m</strong></div>
          <div class="popup-row"><span>Total Depth:</span> <strong>${offset.total_depth_md?.toLocaleString()} m MD</strong></div>
          <div class="popup-row"><span>Historical Incidents:</span> <strong>${offset.historical_events_count}</strong></div>
          <div class="popup-row"><span>Incidents Ahead:</span> <strong>${offset.lookahead_events_count}</strong></div>
        </div>
      `);
    });
  }, [activeWell, offsetWells, selectedOffsetId, radiusMeters, theme, onSelectOffset]);

  const handleFitField = () => {
    const map = mapInstanceRef.current;
    if (!map || !activeWell) return;
    map.setView([activeWell.latitude || 58.44104, activeWell.longitude || 1.88587], 13);
  };

  return (
    <div className={`gis-map-card ${theme}`}>
      {/* Map Header Toolbar */}
      <div className="gis-toolbar">
        <div className="toolbar-left">
          <span className="live-pulse-dot"></span>
          <span className="toolbar-title">FIELD SPATIAL GEOMETRY (VOLVE BLOCK 15/9)</span>
          <span className="well-count-chip">{offsetWells.length + 1} WELLS MAPPED</span>
        </div>

        <div className="toolbar-controls">
          {/* Trajectory Toggle */}
          <button
            className={`tool-btn ${showTrajectories ? 'active' : ''}`}
            onClick={() => setShowTrajectories(!showTrajectories)}
            title="Toggle Subsurface 2D Trajectories"
          >
            Subsurface Trajectories
          </button>

          {/* Basemap Switcher */}
          <div className="basemap-group">
            <button
              className={`basemap-btn ${basemap === 'ocean' ? 'active' : ''}`}
              onClick={() => setBasemap('ocean')}
            >
              Nautical
            </button>
            <button
              className={`basemap-btn ${basemap === 'satellite' ? 'active' : ''}`}
              onClick={() => setBasemap('satellite')}
            >
              Satellite
            </button>
            <button
              className={`basemap-btn ${basemap === 'street' ? 'active' : ''}`}
              onClick={() => setBasemap('street')}
            >
              Topo
            </button>
          </div>

          <button className="tool-btn icon-only" onClick={handleFitField} title="Fit Field Extent">
            ⛶
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="gis-canvas" />

      {/* Map Footer Bar */}
      <div className="gis-footer-bar">
        <div className="legend-items">
          <span className="legend-entry">
            <span className="dot active-cyan"></span> Active Bit: {activeWell?.well_id} ({activeWell?.current_depth_md}m)
          </span>
          <span className="legend-entry">
            <span className="dot match-green"></span> High Relevance (&ge;80%)
          </span>
          <span className="legend-entry">
            <span className="dot moderate-gray"></span> Moderate Relevance
          </span>
          <span className="legend-entry">
            <span className="dot selected-amber"></span> Selected Offset
          </span>
        </div>

        <div className="coord-readout">
          ED50 UTM 31N &bull; 58°26'27" N, 1°53'09" E &bull; Water Depth: 84m
        </div>
      </div>
    </div>
  );
};
