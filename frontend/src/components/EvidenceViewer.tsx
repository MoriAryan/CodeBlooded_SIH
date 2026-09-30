import React, { useEffect, useState } from 'react';
import type { DocumentPageEvidence, DrillingEvent } from '../types';
import { FileTextIcon, CloseIcon, CheckCircleIcon, ShieldAlertIcon } from './icons';

interface EvidenceViewerProps {
  evidence: DocumentPageEvidence | null;
  event: DrillingEvent | null;
  loading: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence,
  event,
  loading,
  onClose,
  theme = 'light',
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!evidence && !loading) return null;

  const handleCopyText = () => {
    if (evidence?.extracted_text) {
      navigator.clipboard.writeText(evidence.extracted_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`evidence-modal-backdrop ${theme}`} onClick={onClose}>
      <div className="evidence-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="evidence-modal-header">
          <div className="header-left-meta">
            <div className="evidence-icon-badge">
              <FileTextIcon size={20} color={theme === 'dark' ? '#38bdf8' : '#0284c7'} />
            </div>
            <div>
              <div className="evidence-doc-title">
                {evidence?.document_title || evidence?.document_id || 'Archival Daily Drilling Report'}
              </div>
              <div className="evidence-sub-meta">
                <span className="meta-tag">WELL: <strong>{evidence?.well_ref || event?.well_ref || 'OFFSET WELL'}</strong></span>
                <span className="meta-tag">DOC ID: <strong>{evidence?.document_id}</strong></span>
                <span className="meta-tag">PAGE: <strong>{evidence?.page_number || 1}</strong></span>
                <span className="meta-tag">SOURCE: <strong>Equinor Volve Public Archive</strong></span>
              </div>
            </div>
          </div>

          <div className="header-right-actions">
            {evidence?.ocr_confidence && (
              <div className="confidence-indicator">
                <CheckCircleIcon size={14} color="#059669" />
                <span>{(evidence.ocr_confidence * 100).toFixed(0)}% OCR VERIFIED</span>
              </div>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close Evidence Modal">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="evidence-modal-body">
          {loading ? (
            <div className="evidence-loading">
              <div className="spinner"></div>
              <span>Retrieving source document page from database repository...</span>
            </div>
          ) : (
            <div className="evidence-content-layout">
              {/* Left Column: Context Card */}
              <div className="evidence-context-card">
                <div className="context-card-title">
                  <ShieldAlertIcon size={16} color="#d97706" />
                  <span>REFERENCED DRILLING EVENT</span>
                </div>

                {event && (
                  <div className="context-details">
                    <div className="ctx-row">
                      <span className="ctx-lbl">Incident Type:</span>
                      <span className="ctx-val text-bold">{event.event_type.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    <div className="ctx-row">
                      <span className="ctx-lbl">Depth Recorded:</span>
                      <span className="ctx-val highlight-val">{event.start_depth_md.toLocaleString()} m MD</span>
                    </div>
                    <div className="ctx-row">
                      <span className="ctx-lbl">Formation:</span>
                      <span className="ctx-val formation-text">{event.formation || 'Hod Fm'}</span>
                    </div>
                    <div className="ctx-row">
                      <span className="ctx-lbl">Severity:</span>
                      <span className={`ctx-val badge-${event.severity?.toLowerCase()}`}>{event.severity?.toUpperCase()}</span>
                    </div>
                    <div className="ctx-row">
                      <span className="ctx-lbl">Event Date:</span>
                      <span className="ctx-val">{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {event.npt_hours !== null && event.npt_hours !== undefined && (
                      <div className="ctx-row">
                        <span className="ctx-lbl">NPT Impact:</span>
                        <span className="ctx-val text-red">{event.npt_hours} hrs</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="event-excerpt-box">
                  <div className="excerpt-label">OPERATOR REPORT EXCERPT</div>
                  <div className="excerpt-text">{event?.description}</div>
                </div>

                {event?.actions && event.actions.length > 0 && (
                  <div className="event-actions-box">
                    <div className="excerpt-label">MITIGATION TAKEN</div>
                    <div className="excerpt-text">{event.actions[0].action_description}</div>
                  </div>
                )}
              </div>

              {/* Right Column: Verbatim Page Text */}
              <div className="evidence-page-reader">
                <div className="reader-toolbar">
                  <div className="page-indicator">
                    <FileTextIcon size={14} color="#64748b" />
                    <span>PAGE {evidence?.page_number || 1} &bull; VERBATIM PYMUPDF EXTRACT</span>
                  </div>
                  <button className="copy-text-btn" onClick={handleCopyText}>
                    {copied ? 'Copied!' : 'Copy Page Text'}
                  </button>
                </div>

                <div className="raw-text-container">
                  <pre className="extracted-text-body">
                    {evidence?.extracted_text || 'No text content available for this report page.'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
