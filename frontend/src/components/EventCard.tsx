import React from 'react';
import type { DrillingEvent } from '../types';
import { AlertTriangleIcon, FileTextIcon, CheckCircleIcon, ShieldAlertIcon } from './icons';

interface EventCardProps {
  event: DrillingEvent;
  currentBitDepth: number;
  onViewEvidence: (docId: string, pageNumber: number, event: DrillingEvent) => void;
  theme?: 'light' | 'dark';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentBitDepth,
  onViewEvidence,
  theme = 'light',
}) => {
  const deltaDepth = event.start_depth_md - currentBitDepth;
  const isAhead = deltaDepth >= 0;

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'severity-critical';
      case 'severe': return 'severity-severe';
      case 'moderate': return 'severity-moderate';
      default: return 'severity-info';
    }
  };

  const getEventTypeTitle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'losses': return 'LOST CIRCULATION / SEEPAGE';
      case 'stuck_pipe': return 'STUCK PIPE / PACK-OFF';
      case 'kick': return 'WELL CONTROL / INFLUX';
      case 'torque': return 'EXCESSIVE DRAG / TIGHT HOLE';
      case 'bha_failure': return 'BHA / BIT COMPONENT FAILURE';
      default: return type.replace(/_/g, ' ').toUpperCase();
    }
  };

  return (
    <div className={`incident-card-box ${event.severity?.toLowerCase() || ''} ${theme}`}>
      {/* Header Strip */}
      <div className="incident-card-top">
        <div className="incident-type-group">
          {event.severity === 'critical' || event.severity === 'severe' ? (
            <ShieldAlertIcon size={18} color="#dc2626" />
          ) : (
            <AlertTriangleIcon size={18} color="#d97706" />
          )}
          <span className="incident-title-text">{getEventTypeTitle(event.event_type)}</span>
          <span className={`severity-chip ${getSeverityBadgeClass(event.severity)}`}>
            {event.severity?.toUpperCase()}
          </span>
        </div>

        <div className="incident-depth-pill">
          <span className="depth-value">{event.start_depth_md.toLocaleString()} m MD</span>
          <span className="delta-value">
            {isAhead ? `+${deltaDepth.toFixed(0)}m ahead` : `${deltaDepth.toFixed(0)}m behind`}
          </span>
        </div>
      </div>

      {/* Engineering Metadata Grid */}
      <div className="incident-meta-grid">
        <div className="meta-cell">
          <span className="cell-lbl">OFFSET WELLBORE</span>
          <span className="cell-val bold">{event.well_ref || event.well_id}</span>
        </div>

        <div className="meta-cell">
          <span className="cell-lbl">GEOLOGICAL TOP</span>
          <span className="cell-val formation-chip">{event.formation || 'Hod Fm'}</span>
        </div>

        {event.event_date && (
          <div className="meta-cell">
            <span className="cell-lbl">REPORT DATE</span>
            <span className="cell-val">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {event.npt_hours !== null && event.npt_hours !== undefined && (
          <div className="meta-cell">
            <span className="cell-lbl">RECORDED NPT</span>
            <span className="cell-val npt-val">{event.npt_hours} hrs</span>
          </div>
        )}
      </div>

      {/* Verbatim Equinor Operational Remarks */}
      <div className="incident-remarks-quote">
        <div className="remarks-label">VERBATIM RIG LOG ENTRY (EQUINOR DDR)</div>
        <div className="remarks-content">{event.description}</div>
      </div>

      {/* Rig Crew Mitigation Actions */}
      {event.actions && event.actions.length > 0 && (
        <div className="mitigation-box">
          <div className="mitigation-header">
            <CheckCircleIcon size={13} color="#059669" />
            <span>HISTORICAL MITIGATION PROTOCOL EXECUTED</span>
          </div>
          <div className="mitigation-steps">
            {event.actions.map((act) => (
              <div key={act.id} className="mitigation-step-item">
                <span className="step-badge">Action #{act.sequence_number}</span>
                <span className="step-text">{act.action_description}</span>
                {act.outcome && <span className="outcome-tag">&bull; {act.outcome}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Citation & Audit Button */}
      <div className="incident-card-footer">
        <div className="citation-text">
          <FileTextIcon size={14} color="#64748b" />
          <span>Source: {event.source_document_ref || 'Equinor DDR Report'} (Page {event.source_page || 1})</span>
          {event.confidence && <span className="conf-pill">{(event.confidence * 100).toFixed(0)}% OCR Conf</span>}
        </div>

        {event.source_document_ref && (
          <button
            className="audit-evidence-btn"
            onClick={() => onViewEvidence(event.source_document_ref!, event.source_page || 1, event)}
          >
            Audit Source Evidence
          </button>
        )}
      </div>
    </div>
  );
};
