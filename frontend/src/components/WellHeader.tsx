import React from 'react';
import type { Well } from '../types';
import { RigIcon, LayersIcon, SunIcon, MoonIcon } from './icons';

interface WellHeaderProps {
  activeWell: Well | null;
  allWells: Well[];
  onSelectWell: (wellId: string) => void;
  radiusMeters: number;
  onChangeRadius: (radius: number) => void;
  lookaheadM: number;
  onChangeLookahead: (lookahead: number) => void;
  dbHealthy: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const WellHeader: React.FC<WellHeaderProps> = ({
  activeWell,
  allWells,
  onSelectWell,
  radiusMeters,
  onChangeRadius,
  lookaheadM,
  onChangeLookahead,
  dbHealthy,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className={`nwis-header-bar ${theme}`}>
      <div className="header-inner">
        {/* 1. Brand Identity */}
        <div className="header-brand-block">
          <div className="brand-logo-mark">
            <RigIcon size={20} color={theme === 'dark' ? '#f59e0b' : '#b45309'} />
          </div>
          <div className="brand-copy">
            <div className="brand-title">
              eRTMAC <span className="brand-badge">NWIS</span>
            </div>
            <div className="brand-sub">VOLVE FIELD &bull; NORTH SEA 15/9</div>
          </div>
        </div>

        {/* 2. Well Selector (Precision Dropdown) */}
        <div className="header-well-selector">
          <label htmlFor="well-select" className="visually-hidden">
            Active Wellbore
          </label>
          <div className="selector-wrapper">
            <RigIcon size={14} color={theme === 'dark' ? '#f59e0b' : '#b45309'} />
            <select
              id="well-select"
              className="well-select-element"
              value={activeWell?.well_id || ''}
              onChange={(e) => onSelectWell(e.target.value)}
            >
              {allWells.map((w) => (
                <option key={w.well_id} value={w.well_id}>
                  {w.well_id} &mdash; {w.name} ({w.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Live Core Telemetry */}
        {activeWell && (
          <div className="header-telemetry-cluster">
            <div className="telemetry-item bit-depth-item">
              <span className="telemetry-lbl">BIT DEPTH</span>
              <span className="telemetry-num">
                {activeWell.current_depth_md ? `${activeWell.current_depth_md.toLocaleString()} m` : '2,650 m'}
              </span>
            </div>

            <div className="telemetry-divider"></div>

            <div className="telemetry-item formation-item">
              <span className="telemetry-lbl">FORMATION</span>
              <span className="telemetry-tag">
                <LayersIcon size={12} color={theme === 'dark' ? '#2dd4bf' : '#0f766e'} />
                {activeWell.current_formation || 'Hod Fm'}
              </span>
            </div>

            <div className="telemetry-divider hide-mobile"></div>

            <div className="telemetry-item operator-item hide-mobile">
              <span className="telemetry-lbl">OPERATOR</span>
              <span className="telemetry-text">Statoil (Equinor)</span>
            </div>
          </div>
        )}

        {/* 4. Streamlined Utility Controls */}
        <div className="header-utilities-cluster">
          {/* Corridor Horizon Selector */}
          <div className="compact-dropdown-control">
            <span className="control-prefix">Corridor:</span>
            <select
              className="control-select"
              value={lookaheadM}
              onChange={(e) => onChangeLookahead(Number(e.target.value))}
              title="Look-Ahead Depth Horizon"
            >
              <option value={50}>+50 m</option>
              <option value={100}>+100 m</option>
              <option value={150}>+150 m</option>
              <option value={200}>+200 m</option>
              <option value={250}>+250 m</option>
            </select>
          </div>

          {/* Search Radius Selector */}
          <div className="compact-dropdown-control">
            <span className="control-prefix">Radius:</span>
            <select
              className="control-select"
              value={radiusMeters}
              onChange={(e) => onChangeRadius(Number(e.target.value))}
              title="Offset Correlation Radius"
            >
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={15000}>15 km</option>
              <option value={20000}>20 km</option>
            </select>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="header-theme-toggle"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light (Nordic)' : 'Dark (Basalt)'} Mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? <SunIcon size={16} color="#f59e0b" /> : <MoonIcon size={16} color="#57534e" />}
          </button>

          {/* Database Connectivity Indicator */}
          <div
            className={`header-status-dot ${dbHealthy ? 'status-online' : 'status-offline'}`}
            title={dbHealthy ? 'PostGIS 3.5 Spatial Engine Online' : 'Database Offline'}
          >
            <span className="status-ping"></span>
            <span className="status-label">PostGIS</span>
          </div>
        </div>
      </div>
    </header>
  );
};
