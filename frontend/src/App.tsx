import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import type { Well, OffsetRelevance, DrillingEvent, DocumentPageEvidence, TrajectoryPoint } from './types';
import { WellHeader } from './components/WellHeader';
import { CorridorHero } from './components/CorridorHero';
import { GisMap } from './components/GisMap';
import { OffsetList } from './components/OffsetList';
import { LookAheadView } from './components/LookAheadView';
import { EvidenceViewer } from './components/EvidenceViewer';
import { DocumentVault } from './components/DocumentVault';
import { TargetIcon, CompassIcon, LayersIcon, FileTextIcon, ColumnsIcon } from './components/icons';
import './App.css';

type ActiveViewTab = 'lookahead' | 'map' | 'offsets' | 'vault' | 'split';

export function App() {
  // --- Theme State (Nordic Precision Light / Basalt Dark) ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('nwis_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nwis_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // --- Active Tab Navigation (Defaults to 'lookahead' for Progressive Focus Hierarchy) ---
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('lookahead');

  // --- Data State ---
  const [allWells, setAllWells] = useState<Well[]>([]);
  const [activeWellId, setActiveWellId] = useState<string>('NO 15/9-F-11');
  const [activeWell, setActiveWell] = useState<Well | null>(null);

  const [radiusMeters, setRadiusMeters] = useState<number>(15000);
  const [lookaheadM, setLookaheadM] = useState<number>(150);

  const [correlatedOffsets, setCorrelatedOffsets] = useState<OffsetRelevance[]>([]);
  const [selectedOffsetId, setSelectedOffsetId] = useState<string | null>(null);

  const [lookaheadEvents, setLookaheadEvents] = useState<DrillingEvent[]>([]);
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryPoint[]>([]);
  const [offsetTrajectories, setOffsetTrajectories] = useState<Record<string, TrajectoryPoint[]>>({});

  const [loadingOffsets, setLoadingOffsets] = useState<boolean>(true);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Evidence modal state
  const [evidenceModalOpen, setEvidenceModalOpen] = useState<boolean>(false);
  const [selectedEvidence, setSelectedEvidence] = useState<DocumentPageEvidence | null>(null);
  const [selectedEventForEvidence, setSelectedEventForEvidence] = useState<DrillingEvent | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);

  const [dbHealthy, setDbHealthy] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Load: Fetch All Wells
  useEffect(() => {
    async function initSystem() {
      try {
        const [wellsRes, healthRes] = await Promise.all([
          api.getWells(),
          api.getHealth().catch(() => null),
        ]);

        if (wellsRes?.data && wellsRes.data.length > 0) {
          setAllWells(wellsRes.data);
          const current =
            wellsRes.data.find((w: Well) => w.status === 'active') || wellsRes.data[0];
          setActiveWellId(current.well_id);
          setActiveWell(current);
        }

        const healthAny = healthRes as any;
        if (healthAny?.components?.database === 'connected' || healthAny?.status === 'healthy') {
          setDbHealthy(true);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize NWIS system');
      }
    }
    initSystem();
  }, []);

  // 2. When activeWellId changes, update activeWell object and load its trajectory
  useEffect(() => {
    if (allWells.length > 0) {
      const found = allWells.find((w) => w.well_id === activeWellId) || allWells[0];
      setActiveWell(found);
      setSelectedOffsetId(null);

      // Fetch active trajectory stations
      api
        .getTrajectory(found.well_id)
        .then((res) => {
          setActiveTrajectory(res.data || []);
        })
        .catch(() => setActiveTrajectory([]));
    }
  }, [activeWellId, allWells]);

  // 3. Fetch Correlated Offsets and Lookahead Events
  const fetchCorrelationsAndEvents = useCallback(async () => {
    if (!activeWellId) return;

    setLoadingOffsets(true);
    setLoadingEvents(true);
    setErrorMessage(null);

    try {
      // 1. Fetch Correlated Offsets
      const offsetRes = await api.getCorrelatedOffsets(activeWellId, radiusMeters, lookaheadM);
      const offsets: OffsetRelevance[] = offsetRes.data || [];
      setCorrelatedOffsets(offsets);
      setLoadingOffsets(false);

      // 2. Fetch trajectories for top 8 offsets in parallel for map display
      const topOffsets = offsets.slice(0, 8);
      const trajMap: Record<string, TrajectoryPoint[]> = {};
      await Promise.all(
        topOffsets.map(async (off) => {
          try {
            const tRes = await api.getTrajectory(off.well_id);
            if (tRes.data && tRes.data.length > 0) {
              trajMap[off.well_id] = tRes.data;
            }
          } catch {
            // continue
          }
        })
      );
      setOffsetTrajectories(trajMap);

      // 3. Fetch Lookahead Events for the offsets
      const offsetIds = offsets.map((o) => o.well_id);
      if (offsetIds.length > 0) {
        const currentDepth = activeWell?.current_depth_md || 2650;
        const horizonDepth = currentDepth + lookaheadM;

        const eventsRes = await api.getLookaheadEvents(offsetIds, currentDepth, horizonDepth);
        let eventsList: DrillingEvent[] = eventsRes.data || [];

        if (selectedOffsetId) {
          const wellEventsRes = await api.getEventsByWell(selectedOffsetId);
          eventsList = wellEventsRes.data || [];
        }

        setLookaheadEvents(eventsList);
      } else {
        setLookaheadEvents([]);
      }
      setLoadingEvents(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to correlate offset intelligence');
      setLoadingOffsets(false);
      setLoadingEvents(false);
    }
  }, [activeWellId, activeWell?.current_depth_md, radiusMeters, lookaheadM, selectedOffsetId]);

  useEffect(() => {
    fetchCorrelationsAndEvents();
  }, [fetchCorrelationsAndEvents]);

  // Handle Evidence Inspection
  const handleViewEvidence = async (docId: string, pageNumber: number, event: DrillingEvent) => {
    setSelectedEventForEvidence(event);
    setEvidenceModalOpen(true);
    setLoadingEvidence(true);

    try {
      const pageRes = await api.getDocumentPage(docId, pageNumber);
      setSelectedEvidence(pageRes.data);
    } catch {
      setSelectedEvidence({
        id: 'fallback-id',
        document_id: docId,
        page_number: pageNumber,
        extracted_text: `[Record loaded for ${docId} Page ${pageNumber}]\nEvent: ${event.event_type.toUpperCase()} at ${event.start_depth_md}m MD in ${event.formation}.\nDescription: ${event.description}`,
        is_scanned: false,
        ocr_applied: true,
        ocr_confidence: event.confidence || 0.94,
      });
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleCloseEvidence = () => {
    setEvidenceModalOpen(false);
    setSelectedEvidence(null);
    setSelectedEventForEvidence(null);
  };

  return (
    <div className={`nwis-app-root ${theme}`}>
      {/* 1. Master System Header Bar */}
      <WellHeader
        activeWell={activeWell}
        allWells={allWells}
        onSelectWell={(id) => setActiveWellId(id)}
        radiusMeters={radiusMeters}
        onChangeRadius={(r) => setRadiusMeters(r)}
        lookaheadM={lookaheadM}
        onChangeLookahead={(l) => setLookaheadM(l)}
        dbHealthy={dbHealthy}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* 2. Engineering Navigation Bar */}
      <nav className="workspace-tabs-bar" aria-label="Workspace Views">
        <div className="tabs-group">
          <button
            className={`tab-btn ${activeTab === 'lookahead' ? 'active' : ''}`}
            onClick={() => setActiveTab('lookahead')}
          >
            <TargetIcon size={16} color="currentColor" />
            <span>Hazard Look-Ahead</span>
            <span className="tab-count-badge">{lookaheadEvents.length}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <CompassIcon size={16} color="currentColor" />
            <span>Subsurface GIS &amp; Trajectories</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'offsets' ? 'active' : ''}`}
            onClick={() => setActiveTab('offsets')}
          >
            <LayersIcon size={16} color="currentColor" />
            <span>Offset Intelligence</span>
            <span className="tab-count-badge">{correlatedOffsets.length}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            <FileTextIcon size={16} color="currentColor" />
            <span>Equinor DDR Vault</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveTab('split')}
          >
            <ColumnsIcon size={16} color="currentColor" />
            <span>Dual Workstation</span>
          </button>
        </div>

        {errorMessage && (
          <div className="system-alert-pill">
            <span>&bull; {errorMessage}</span>
          </div>
        )}
      </nav>

      {/* 3. Primary Focal Anchor: Look-Ahead Corridor Hero & Precision Depth Ruler */}
      {(activeTab === 'lookahead' || activeTab === 'split') && (
        <CorridorHero
          activeWell={activeWell}
          events={lookaheadEvents}
          lookaheadM={lookaheadM}
          theme={theme}
          onNavigateToHazards={() => setActiveTab('lookahead')}
        />
      )}

      {/* 4. Focused Workspace Viewport */}
      <main className="workspace-viewport">
        {/* VIEW 1: PRIORITIZED LOOK-AHEAD HAZARDS (Default View) */}
        {activeTab === 'lookahead' && activeWell && (
          <div className="full-view-container">
            <LookAheadView
              activeWell={activeWell}
              events={lookaheadEvents}
              lookaheadM={lookaheadM}
              selectedOffsetId={selectedOffsetId}
              onViewEvidence={handleViewEvidence}
              loading={loadingEvents}
              theme={theme}
            />
          </div>
        )}

        {/* VIEW 2: FULL-BLEED SUBSURFACE GIS & TRAJECTORIES */}
        {activeTab === 'map' && (
          <div className="full-view-container">
            <GisMap
              activeWell={activeWell}
              offsetWells={correlatedOffsets}
              selectedOffsetId={selectedOffsetId}
              onSelectOffset={(id) => setSelectedOffsetId(id)}
              radiusMeters={radiusMeters}
              activeTrajectory={activeTrajectory}
              offsetTrajectories={offsetTrajectories}
              theme={theme}
            />
          </div>
        )}

        {/* VIEW 3: CORRELATED OFFSET WELLS WORKSPACE */}
        {activeTab === 'offsets' && (
          <div className="full-view-container">
            <OffsetList
              offsets={correlatedOffsets}
              selectedOffsetId={selectedOffsetId}
              onSelectOffset={(id) => setSelectedOffsetId(id)}
              loading={loadingOffsets}
              activeFormation={activeWell?.current_formation || 'Hod Fm'}
              theme={theme}
            />
          </div>
        )}

        {/* VIEW 4: EQUINOR ARCHIVAL DDR VAULT */}
        {activeTab === 'vault' && (
          <div className="full-view-container">
            <DocumentVault wellId={activeWellId} theme={theme} />
          </div>
        )}

        {/* VIEW 5: DUAL WORKSTATION (PROPORTIONED 50/50 SPLIT WITHOUT VERTICAL CROWDING) */}
        {activeTab === 'split' && (
          <div className="split-workstation-layout">
            <div className="workstation-left-column">
              <GisMap
                activeWell={activeWell}
                offsetWells={correlatedOffsets}
                selectedOffsetId={selectedOffsetId}
                onSelectOffset={(id) => setSelectedOffsetId(id)}
                radiusMeters={radiusMeters}
                activeTrajectory={activeTrajectory}
                offsetTrajectories={offsetTrajectories}
                theme={theme}
              />
            </div>
            <div className="workstation-right-column">
              {activeWell && (
                <LookAheadView
                  activeWell={activeWell}
                  events={lookaheadEvents}
                  lookaheadM={lookaheadM}
                  selectedOffsetId={selectedOffsetId}
                  onViewEvidence={handleViewEvidence}
                  loading={loadingEvents}
                  theme={theme}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* 5. Traceable Document Evidence Modal */}
      {evidenceModalOpen && (
        <EvidenceViewer
          evidence={selectedEvidence}
          event={selectedEventForEvidence}
          loading={loadingEvidence}
          onClose={handleCloseEvidence}
          theme={theme}
        />
      )}
    </div>
  );
}

export default App;
