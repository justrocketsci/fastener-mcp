'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Fastener } from '@/lib/types';

interface FastenerSearchResult {
  count: number;
  results: Fastener[];
}

function OnshapePanelContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Fastener[]>([]);
  const [selectedFastener, setSelectedFastener] = useState<Fastener | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placementData, setPlacementData] = useState<any>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const keepAliveTimer = useRef<NodeJS.Timeout | null>(null);

  // Onshape query params
  const documentId = searchParams.get('documentId');
  const workspaceOrVersionId = searchParams.get('workspaceOrVersionId');
  const elementId = searchParams.get('elementId');
  const server = searchParams.get('server');

  // Initialize Onshape messaging
  useEffect(() => {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      return;
    }

    const serverOrigin = server ? `https://${server}` : 'https://cad.onshape.com';

    // Send applicationInit message
    const initMessage = {
      messageName: 'applicationInit',
      documentId: documentId || '',
      workspaceId: workspaceOrVersionId || '',
      elementId: elementId || '',
    };
    
    window.parent.postMessage(initMessage, serverOrigin);

    // Setup keepAlive
    const sendKeepAlive = () => {
      window.parent.postMessage(
        { messageName: 'keepAlive' },
        serverOrigin
      );
    };

    // Send initial keepAlive and setup interval
    sendKeepAlive();
    keepAliveTimer.current = setInterval(sendKeepAlive, 30000);

    // Listen for messages from Onshape
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== serverOrigin) {
        console.warn('Message from unexpected origin:', event.origin);
        return;
      }
      // Handle any messages from Onshape if needed
    };

    window.addEventListener('message', handleMessage);

    return () => {
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [documentId, workspaceOrVersionId, elementId, server]);

  // Load popular fasteners on mount
  useEffect(() => {
    const loadPopular = async () => {
      try {
        const response = await fetch('/api/fasteners?limit=5');
        const data: FastenerSearchResult = await response.json();
        setResults(data.results);
      } catch (err) {
        console.error('Failed to load popular fasteners:', err);
      }
    };
    loadPopular();
  }, []);

  // Search with debounce
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      const response = await fetch('/api/fasteners?limit=5');
      const data: FastenerSearchResult = await response.json();
      setResults(data.results);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/fasteners?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data: FastenerSearchResult = await response.json();
      setResults(data.results);
    } catch (err) {
      setError('Catalog unreachable — retry');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, 250);
  };

  const handleClearSearch = () => {
    setQuery('');
    performSearch('');
  };

  const handleSelectFastener = async (fastener: Fastener) => {
    setSelectedFastener(fastener);
    
    // Load placement data
    try {
      const response = await fetch(`/api/fasteners/${fastener.id}/placement`);
      if (response.ok) {
        const data = await response.json();
        setPlacementData(data);
      } else {
        setPlacementData(null);
      }
    } catch (err) {
      console.error('Failed to load placement data:', err);
      setPlacementData(null);
    }
  };

  const getSourceLabel = (sourceKind?: string) => {
    switch (sourceKind) {
      case 'open_library':
        return 'Open Library';
      case 'gov_spec':
        return 'Gov Spec';
      case 'purchased_std':
        return 'Purchased Std';
      default:
        return 'Sample';
    }
  };

  const hasModel = (fastener: Fastener) => {
    return fastener.length_mm > 0;
  };

  const handleDownloadSTEP = () => {
    if (placementData?.model?.url) {
      window.open(placementData.model.url, '_blank');
    }
  };

  const handleCopyModelURL = () => {
    if (placementData?.model?.url) {
      navigator.clipboard.writeText(placementData.model.url);
    }
  };

  const handleCopyPlacement = () => {
    if (placementData) {
      navigator.clipboard.writeText(JSON.stringify(placementData, null, 2));
    }
  };

  const [showPlacementJSON, setShowPlacementJSON] = useState(false);

  const formatDiameter = (fastener: Fastener) => {
    const unit = fastener.diameter > 1 ? 'mm' : 'in';
    return `Ø ${fastener.diameter} ${unit}`;
  };

  const formatLength = (fastener: Fastener) => {
    if (fastener.length_mm > 0) {
      return `L ${fastener.length_mm} mm`;
    }
    return '';
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900" style={{ width: '340px', maxWidth: '340px' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-3.5 h-12 border-b border-slate-200 flex-shrink-0">
        <div>
          <strong className="text-sm font-semibold">Fastener MCP</strong>
          <div className="text-[11px] text-slate-500">Catalog · STEP · Placement</div>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-slate-200 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search NAS 1352, AN3, ISO 4017…"
            className="w-full h-9 px-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => performSearch(query)}
            className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="flex-[0_0_42%] overflow-auto border-b border-slate-200">
        {loading && results.length === 0 ? (
          <div className="space-y-px">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-2.5 border-b border-slate-200 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-2.5 bg-slate-100 rounded w-48"></div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            No matches.
          </div>
        ) : (
          <div>
            {results.map((fastener) => (
              <div
                key={fastener.id}
                onClick={() => handleSelectFastener(fastener)}
                className={`px-3 py-2.5 border-b border-slate-200 cursor-pointer hover:bg-slate-50 ${
                  selectedFastener?.id === fastener.id ? 'bg-slate-50 shadow-[inset_2px_0_0_#4F46E5]' : ''
                }`}
              >
                <div className="font-mono text-xs font-semibold">{fastener.designation}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {fastener.standard && `${fastener.standard} · `}
                  {formatDiameter(fastener)}
                  {formatLength(fastener) && ` · ${formatLength(fastener)}`}
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500">
                    {getSourceLabel(fastener.source_kind)}
                  </span>
                  {fastener.length_mm > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-200 text-indigo-600">
                      STEP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View */}
      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        {selectedFastener ? (
          <>
            {/* Identity */}
            <div>
              <div className="font-mono text-[15px] font-bold">{selectedFastener.designation}</div>
              <div className="flex gap-1.5 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 font-semibold">
                  {getSourceLabel(selectedFastener.source_kind)}
                </span>
              </div>
              {selectedFastener.source_ref && (
                <p className="text-[11px] text-slate-500 mt-1.5 truncate" title={selectedFastener.source_ref}>
                  {selectedFastener.source_ref}
                </p>
              )}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-xs">
              <dt className="text-slate-500">Diameter</dt>
              <dd className="font-mono text-[11px]">{formatDiameter(selectedFastener)}</dd>
              
              {selectedFastener.length_mm > 0 && (
                <>
                  <dt className="text-slate-500">Length</dt>
                  <dd className="font-mono text-[11px]">{selectedFastener.length_mm} mm</dd>
                </>
              )}
              
              <dt className="text-slate-500">Thread</dt>
              <dd className="font-mono text-[11px]">{selectedFastener.thread || '—'}</dd>
              
              <dt className="text-slate-500">Material</dt>
              <dd className="font-mono text-[11px]">{selectedFastener.material || '—'}</dd>
            </div>

            {/* Model Card */}
            {placementData?.model ? (
              <div className="border border-slate-200 rounded-[10px] p-3 bg-white">
                <h3 className="text-[13px] font-semibold mb-1.5 flex items-center gap-2">
                  Simplified 3D model
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    placementData.model.available 
                      ? 'border-indigo-200 text-indigo-600' 
                      : 'border-slate-200 text-slate-500'
                  }`}>
                    {placementData.model.available ? 'STEP Available' : 'STEP Unavailable'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 leading-snug mb-2.5">
                  Approximate BREP from catalog dims. Not for certification.
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleDownloadSTEP}
                    disabled={!placementData.model.available}
                    className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download STEP
                  </button>
                  <button
                    onClick={handleCopyModelURL}
                    disabled={!placementData.model.available}
                    className="h-8 px-3 bg-transparent border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy model URL
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2.5">CadQuery / OpenCascade</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-[10px] p-3 bg-white">
                <h3 className="text-[13px] font-semibold mb-1.5">Simplified 3D model</h3>
                <p className="text-xs text-slate-500">Loading model data...</p>
              </div>
            )}

            {/* Placement Card */}
            <div className="border border-slate-200 rounded-[10px] p-3 bg-white">
              <h3 className="text-[13px] font-semibold mb-1.5 flex items-center gap-2">
                Placement
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500">
                  L1 · CAD-agnostic
                </span>
              </h3>
              <p className="text-xs text-slate-500 leading-snug mb-2.5">
                Axis, origin, and grip for AI CAD agents — not auto-mates.
              </p>
              
              {placementData ? (
                <>
                  <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-xs mb-2.5">
                    <dt className="text-slate-500">Axis</dt>
                    <dd className="font-mono text-[11px]">{placementData.frame?.axis || '—'}</dd>
                    
                    <dt className="text-slate-500">Origin</dt>
                    <dd className="font-mono text-[11px]">{placementData.frame?.origin || '—'}</dd>
                    
                    <dt className="text-slate-500">Grip</dt>
                    <dd className="font-mono text-[11px]">
                      {placementData.frame?.grip_length_mm ? `${placementData.frame.grip_length_mm} mm` : '—'}
                    </dd>
                    
                    <dt className="text-slate-500">Head side</dt>
                    <dd className="font-mono text-[11px]">{placementData.frame?.head_side || '—'}</dd>
                  </dl>
                  
                  <div className="flex gap-1.5 mb-2.5">
                    <button
                      onClick={handleCopyPlacement}
                      className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                    >
                      Copy placement packet
                    </button>
                    <button
                      onClick={() => setShowPlacementJSON(!showPlacementJSON)}
                      className="h-8 px-3 bg-transparent border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      {showPlacementJSON ? 'Hide JSON' : 'Open JSON'}
                    </button>
                  </div>
                  
                  {showPlacementJSON && (
                    <pre className="text-[10px] bg-slate-50 p-2 rounded overflow-x-auto font-mono">
                      {JSON.stringify(placementData, null, 2)}
                    </pre>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Loading placement data...</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Select a fastener to view details
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="h-9 flex items-center justify-center border-t border-slate-200 text-[11px] text-slate-500 flex-shrink-0">
        <a
          href="https://fastener-mcp.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          fastener-mcp.vercel.app
        </a>
      </footer>
    </div>
  );
}

export default function OnshapePanelPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-white" style={{ width: '340px' }}>
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    }>
      <OnshapePanelContent />
    </Suspense>
  );
}
