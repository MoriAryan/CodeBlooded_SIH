import React, { useState } from 'react';
import type { DrillingEvent, Well } from '../types';
import { EventCard } from './EventCard';
import { ShieldAlertIcon, CheckCircleIcon } from './icons';

interface LookAheadViewProps {
  activeWell: Well;
  events: DrillingEvent[];
  lookaheadM: number;
  selectedOffsetId: string | null;
  onViewEvidence: (docId: string, pageNumber: number, event: DrillingEvent) => void;
  loading: boolean;
  theme: 'light' | 'dark';
}

export const LookAheadView: React.FC<LookAheadViewProps> = ({
  activeWell,
  events,
  lookaheadM,
  selectedOffsetId,
  onViewEvidence,
  loading,
  theme,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'severe' | 'moderate'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const currentBitDepth = activeWell.current_depth_md || 2650;
  const horizonDepth = currentBitDepth + lookaheadM;

  // Filter events within depth corridor, and optionally by selected offset
  const corridorEvents = events.filter((e) => {
    const matchesWell = !selectedOffsetId || e.well_ref === selectedOffsetId || e.well_id === selectedOffsetId;
    return matchesWell;
  });

  const upcomingEvents = corridorEvents.filter(
    (e) => e.start_depth_md >= currentBitDepth && e.start_depth_md <= horizonDepth
  );

  const filteredUpcoming = upcomingEvents.filter((e) => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (eventTypeFilter !== 'all' && e.event_type !== eventTypeFilter) return false;
    return true;
  });

  // Sort by depth (nearest hazard first)
  const sortedEvents = [...filteredUpcoming].sort((a, b) => a.start_depth_md - b.start_depth_md);

  return (
    <div className={`lookahead-view-root ${theme}`}>
      {/* Control Filter Bar */}
      <div className="hazards-filter-bar">
        <div className="filter-bar-left">
          <div className="filter-bar-title">
            <ShieldAlertIcon size={18} color={theme === 'dark' ? '#f59e0b' : '#b45309'} />
            <span className="hazards-count-heading">
              PRIORITIZED HAZARDS DIRECTLY AHEAD ({sortedEvents.length})
            </span>
          </div>

          {selectedOffsetId && (
            <span className="active-offset-filter-tag">
              Filtered to: <strong>{selectedOffsetId}</strong>
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="filter-bar-right">
          <div className="filter-button-group">
            <span className="filter-group-lbl">Type:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'losses', label: 'Losses' },
              { id: 'stuck_pipe', label: 'Stuck Pipe' },
              { id: 'torque', label: 'Tight Hole' },
            ].map((f) => (
              <button
                key={f.id}
                className={`filter-chip ${eventTypeFilter === f.id ? 'active' : ''}`}
                onClick={() => setEventTypeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="filter-divider"></div>

          <div className="filter-button-group">
            <span className="filter-group-lbl">Severity:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'critical', label: 'Critical' },
              { id: 'severe', label: 'Severe' },
            ].map((s) => (
              <button
                key={s.id}
                className={`filter-chip ${severityFilter === s.id ? 'active' : ''}`}
                onClick={() => setSeverityFilter(s.id as any)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents Card List */}
      {loading ? (
        <div className="hazards-loading-card">
          <div className="loading-spinner"></div>
          <span>Correlating historical incident reports across lookahead corridor...</span>
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="hazards-clear-card">
          <div className="clear-icon-wrapper">
            <CheckCircleIcon size={32} color="#15803d" />
          </div>
          <div className="clear-title">Zero Operational Hazards Detected in this Window</div>
          <div className="clear-description">
            No historical kicks, severe mud losses, or stuck-pipe pack-offs were logged in offset wells through the{' '}
            <strong>{activeWell.current_formation || 'Hod Fm'}</strong> interval ({currentBitDepth}m &rarr; {horizonDepth}m MD).
          </div>
        </div>
      ) : (
        <div className="hazards-cards-stack">
          {sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currentBitDepth={currentBitDepth}
              onViewEvidence={onViewEvidence}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
};
