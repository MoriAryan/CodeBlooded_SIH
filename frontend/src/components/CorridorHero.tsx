import React from 'react';
import type { Well, DrillingEvent } from '../types';
import { ShieldAlertIcon, AlertTriangleIcon, CheckCircleIcon, LayersIcon } from './icons';

interface CorridorHeroProps {
  activeWell: Well | null;
  events: DrillingEvent[];
  lookaheadM: number;
  theme: 'light' | 'dark';
  onNavigateToHazards?: () => void;
}

export const CorridorHero: React.FC<CorridorHeroProps> = ({
  activeWell,
  events,
  lookaheadM,
  theme,
  onNavigateToHazards,
}) => {
  if (!activeWell) return null;

  const currentBitDepth = activeWell.current_depth_md || 2650;
  const horizonDepth = currentBitDepth + lookaheadM;

  // Filter events in current lookahead window
  const upcomingEvents = events.filter(
    (e) => e.start_depth_md >= currentBitDepth && e.start_depth_md <= horizonDepth
  );

  // Sort by depth (nearest first)
  const sortedUpcoming = [...upcomingEvents].sort((a, b) => a.start_depth_md - b.start_depth_md);
  const nearestEvent = sortedUpcoming.length > 0 ? sortedUpcoming[0] : null;
  const nearestDelta = nearestEvent ? (nearestEvent.start_depth_md - currentBitDepth).toFixed(0) : null;

  const hasHazards = sortedUpcoming.length > 0;
  const hasCritical = sortedUpcoming.some((e) => e.severity === 'critical' || e.severity === 'severe');

  return (
    <section className={`corridor-hero-section ${theme}`}>
      <div className="hero-container">
        {/* Top Operational Status Bar */}
        <div className={`hero-status-strip ${hasCritical ? 'status-critical' : hasHazards ? 'status-warning' : 'status-clear'}`}>
          <div className="status-strip-left">
            <div className="status-badge-icon">
              {hasCritical ? (
                <ShieldAlertIcon size={20} color="#b91c1c" />
              ) : hasHazards ? (
                <AlertTriangleIcon size={20} color="#d97706" />
              ) : (
                <CheckCircleIcon size={20} color="#15803d" />
              )}
            </div>

            <div className="status-main-narrative">
              <span className="narrative-headline">
                {hasHazards ? (
                  <>
                    <strong className="hazard-count-highlight">{sortedUpcoming.length} VERIFIED HISTORICAL HAZARDS</strong> DETECTED IN LOOK-AHEAD CORRIDOR
                  </>
                ) : (
                  <>CLEAR LOOK-AHEAD CORRIDOR &bull; NO HISTORICAL HAZARDS DETECTED</>
                )}
              </span>

              <span className="narrative-subtext">
                {nearestEvent ? (
                  <>
                    Nearest Risk: <strong>{nearestEvent.event_type.replace(/_/g, ' ').toUpperCase()}</strong> at{' '}
                    <strong>{nearestEvent.start_depth_md.toLocaleString()} m MD</strong> (+{nearestDelta}m ahead in offset {nearestEvent.well_ref})
                  </>
                ) : (
                  <>
                    Offset history indicates stable penetration across the <strong>{activeWell.current_formation || 'Hod Fm'}</strong> interval.
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="status-strip-right">
            <div className="formation-indicator-chip">
              <LayersIcon size={14} color={theme === 'dark' ? '#2dd4bf' : '#0f766e'} />
              <span>{activeWell.current_formation || 'Hod Fm'} Horizon</span>
            </div>

            {hasHazards && onNavigateToHazards && (
              <button className="view-hazards-cta-btn" onClick={onNavigateToHazards}>
                Inspect Hazards ({sortedUpcoming.length}) &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Integrated Precision Depth Corridor Ruler */}
        <div className="hero-depth-ruler-card">
          <div className="ruler-meta-row">
            <div className="ruler-depth-point start-point">
              <span className="point-pulse active-bit-pulse"></span>
              <span className="point-label">CURRENT BIT DEPTH</span>
              <span className="point-value">{currentBitDepth.toLocaleString()} m MD</span>
            </div>

            <div className="ruler-corridor-span">
              <span className="corridor-tag">
                +{lookaheadM}m Look-Ahead Window &bull; {currentBitDepth}m &rarr; {horizonDepth}m MD
              </span>
            </div>

            <div className="ruler-depth-point end-point">
              <span className="point-pulse horizon-pulse"></span>
              <span className="point-label">PREDICTIVE HORIZON</span>
              <span className="point-value">{horizonDepth.toLocaleString()} m MD</span>
            </div>
          </div>

          {/* Interactive Depth Track Bar */}
          <div className="ruler-visual-track">
            <div className="ruler-bar-background">
              {/* Active penetration gradient fill */}
              <div className="ruler-corridor-fill"></div>

              {/* Event Pins along the track */}
              {sortedUpcoming.map((evt) => {
                const pct = Math.min(
                  96,
                  Math.max(4, ((evt.start_depth_md - currentBitDepth) / lookaheadM) * 100)
                );
                const isCrit = evt.severity === 'critical' || evt.severity === 'severe';

                return (
                  <div
                    key={evt.id}
                    className={`ruler-hazard-pin ${isCrit ? 'pin-critical' : 'pin-severe'}`}
                    style={{ left: `${pct}%` }}
                    title={`${evt.event_type.toUpperCase()} at ${evt.start_depth_md}m MD in ${evt.well_ref}`}
                    onClick={onNavigateToHazards}
                  >
                    <span className="pin-pip"></span>
                    <span className="pin-bubble">
                      <span className="pin-depth">{evt.start_depth_md}m</span>
                      <span className="pin-type">{evt.event_type.replace(/_/g, ' ')}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
