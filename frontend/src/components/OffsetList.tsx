import React, { useState } from 'react';
import type { OffsetRelevance } from '../types';
import { RigIcon, CheckCircleIcon, AlertTriangleIcon } from './icons';

interface OffsetListProps {
  offsets: OffsetRelevance[];
  selectedOffsetId: string | null;
  onSelectOffset: (wellId: string | null) => void;
  loading: boolean;
  activeFormation?: string;
  theme: 'light' | 'dark';
}

export const OffsetList: React.FC<OffsetListProps> = ({
  offsets,
  selectedOffsetId,
  onSelectOffset,
  loading,
  activeFormation = 'Hod Fm',
  theme,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'hazards'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOffsets = offsets.filter((offset) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        offset.well_id.toLowerCase().includes(q) ||
        offset.name.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filterMode === 'high') {
      return offset.overall_score >= 80;
    }
    if (filterMode === 'hazards') {
      return offset.lookahead_events_count > 0;
    }
    return true;
  });

  return (
    <div className={`offset-panel ${theme}`}>
      {/* Panel Header */}
      <div className="offset-panel-header">
        <div className="title-row">
          <div className="title-left">
            <RigIcon size={18} color={theme === 'dark' ? '#38bdf8' : '#0284c7'} />
            <span className="panel-title-text">CORRELATED OFFSET WELLS</span>
            <span className="count-badge">{filteredOffsets.length} of {offsets.length}</span>
          </div>

          {selectedOffsetId && (
            <button
              className="clear-selection-btn"
              onClick={() => onSelectOffset(null)}
            >
              Reset Selection
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="filter-controls-row">
          <div className="filter-pills">
            <button
              className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Wells ({offsets.length})
            </button>
            <button
              className={`filter-pill ${filterMode === 'high' ? 'active' : ''}`}
              onClick={() => setFilterMode('high')}
            >
              High Match ({offsets.filter((o) => o.overall_score >= 80).length})
            </button>
            <button
              className={`filter-pill ${filterMode === 'hazards' ? 'active' : ''}`}
              onClick={() => setFilterMode('hazards')}
            >
              With Hazards ({offsets.filter((o) => o.lookahead_events_count > 0).length})
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Filter by well (e.g. F-12, 19 A)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="panel-loading-state">
          <div className="loading-spinner"></div>
          <span className="loading-text">Computing PostGIS 3D spatial distances & stratigraphic alignment...</span>
        </div>
      ) : filteredOffsets.length === 0 ? (
        <div className="panel-empty-state">
          <AlertTriangleIcon size={24} color="#64748b" />
          <p>No offset wells match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="offset-cards-container">
          {filteredOffsets.map((offset) => {
            const isSelected = offset.well_id === selectedOffsetId;
            const isHighMatch = offset.overall_score >= 80;

            return (
              <div
                key={offset.well_id}
                className={`offset-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectOffset(isSelected ? null : offset.well_id)}
              >
                {/* Card Top Header */}
                <div className="item-header">
                  <div className="well-identity">
                    <span className="well-id-primary">{offset.well_id}</span>
                    <span className="well-alias">{offset.name}</span>
                  </div>

                  <div className="score-container">
                    <span
                      className={`score-chip ${
                        isHighMatch ? 'score-high' : offset.overall_score >= 70 ? 'score-med' : 'score-low'
                      }`}
                    >
                      {offset.overall_score}% RELEVANCE
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="item-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-title">SURFACE SEPARATION</span>
                    <span className="metric-value">
                      {offset.distance_m < 1000
                        ? `${offset.distance_m.toFixed(1)} m`
                        : `${(offset.distance_m / 1000).toFixed(2)} km`}
                    </span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-title">TOTAL DEPTH</span>
                    <span className="metric-value">{offset.total_depth_md?.toLocaleString()} m MD</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-title">LOOK-AHEAD HAZARDS</span>
                    <span className={`metric-value ${offset.lookahead_events_count > 0 ? 'hazard-alert-text' : ''}`}>
                      {offset.lookahead_events_count > 0 ? `${offset.lookahead_events_count} Incident(s)` : 'Clear'}
                    </span>
                  </div>
                </div>

                {/* Stratigraphic Badges */}
                <div className="compatibility-badges">
                  {offset.formation_match.target_formation_present ? (
                    <span className="compat-tag success">
                      <CheckCircleIcon size={12} color="#059669" />
                      <span>{activeFormation} Penetrated</span>
                    </span>
                  ) : (
                    <span className="compat-tag neutral">
                      <span>{offset.formation_match.shared_formations.length} Shared Tops</span>
                    </span>
                  )}

                  {offset.depth_overlap.covers_lookahead && (
                    <span className="compat-tag success">
                      <CheckCircleIcon size={12} color="#059669" />
                      <span>Covers Look-Ahead Interval</span>
                    </span>
                  )}

                  {offset.lookahead_events_count > 0 && (
                    <span className="compat-tag warning">
                      <AlertTriangleIcon size={12} color="#d97706" />
                      <span>Documented Offset Hazards</span>
                    </span>
                  )}
                </div>

                {/* Engineering Rationale */}
                {offset.relevance_reasons.length > 0 && (
                  <div className="rationale-section">
                    <div className="rationale-header">ENGINEERING CORRELATION RATIONALE</div>
                    <ul className="rationale-list">
                      {offset.relevance_reasons.slice(0, 3).map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
