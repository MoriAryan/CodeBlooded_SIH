import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileTextIcon } from './icons';

interface DocumentVaultProps {
  wellId: string;
  theme: 'light' | 'dark';
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({ wellId, theme }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [pageText, setPageText] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingPage, setLoadingPage] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    async function loadDocs() {
      if (!wellId) return;
      setLoadingDocs(true);
      try {
        const res = await api.getDocumentsByWell(wellId);
        const docs = res.data || [];
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDoc(docs[0]);
          setSelectedPageNum(1);
        } else {
          setSelectedDoc(null);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDocs();
  }, [wellId]);

  useEffect(() => {
    async function loadPage() {
      if (!selectedDoc) return;
      setLoadingPage(true);
      try {
        const res = await api.getDocumentPage(selectedDoc.document_id, selectedPageNum);
        setPageText(res.data?.extracted_text || 'No text extracted for this page.');
      } catch (err) {
        setPageText('Failed to load document page.');
      } finally {
        setLoadingPage(false);
      }
    }
    loadPage();
  }, [selectedDoc, selectedPageNum]);

  const filteredDocs = documents.filter((d) =>
    searchTerm.trim() ? d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.document_id.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  return (
    <div className={`doc-vault-container ${theme}`}>
      {/* Vault Header Bar */}
      <div className="vault-header">
        <div className="vault-title-wrap">
          <FileTextIcon size={20} color={theme === 'dark' ? '#38bdf8' : '#0284c7'} />
          <span className="vault-title">OFFICIAL EQUINOR DRILLING ARCHIVE & DDR VAULT</span>
          <span className="vault-well-tag">{wellId}</span>
          <span className="vault-doc-count">{documents.length} Reports Ingested</span>
        </div>

        <div className="vault-search">
          <input
            type="text"
            placeholder="Search reports by date or report #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="vault-search-input"
          />
        </div>
      </div>

      {/* Split Pane View */}
      <div className="vault-split-view">
        {/* Left List of Documents */}
        <div className="vault-docs-list">
          {loadingDocs ? (
            <div className="vault-loading">Loading archival records...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="vault-empty">No reports found for this well.</div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`vault-doc-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setSelectedPageNum(1);
                  }}
                >
                  <div className="doc-item-title">{doc.title}</div>
                  <div className="doc-item-meta">
                    <span className="doc-meta-tag">{doc.document_type}</span>
                    <span className="doc-pages-tag">{doc.total_pages} Page(s)</span>
                    <span className="doc-source-tag">PyMuPDF Verified</span>
                  </div>
                  <div className="doc-path-sub">{doc.file_path?.split('/').pop()}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Page Content Viewer */}
        <div className="vault-page-viewer">
          {selectedDoc ? (
            <div className="page-viewer-card">
              <div className="viewer-card-top">
                <div className="viewer-doc-info">
                  <div className="viewer-title">{selectedDoc.title}</div>
                  <div className="viewer-file-path">{selectedDoc.file_path}</div>
                </div>

                {/* Page Selector Tabs */}
                <div className="viewer-page-tabs">
                  {Array.from({ length: selectedDoc.total_pages || 1 }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`page-tab-btn ${selectedPageNum === p ? 'active' : ''}`}
                      onClick={() => setSelectedPageNum(p)}
                    >
                      Page {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Extracted Text */}
              <div className="viewer-text-box">
                {loadingPage ? (
                  <div className="viewer-loading">Extracting PDF text...</div>
                ) : (
                  <pre className="extracted-text-pre">{pageText}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="viewer-placeholder">Select a document report from the list to view its verbatim content.</div>
          )}
        </div>
      </div>
    </div>
  );
};
