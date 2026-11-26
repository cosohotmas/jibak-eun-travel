import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CatalogProduct,
  HeroClickStat,
  HeroSlide,
  LocalConversionNode,
  OfficialSourceNode,
  RegulationNode,
} from '../types/domain';

interface KnowledgeGraphMapProps {
  regulations: RegulationNode[];
  sources: OfficialSourceNode[];
  heroSlides: HeroSlide[];
  heroClickStats: Record<string, HeroClickStat>;
  products: CatalogProduct[];
  localConversions: LocalConversionNode[];
  nodeHits: Record<string, number>;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
}

interface AnchorRect {
  xLeft: number;
  xRight: number;
  yMid: number;
}

interface VisualEdge {
  id: string;
  from: string;
  to: string;
  relation: 'VERIFIED_BY' | 'LINKS_BANNER' | 'CONSTRAINS' | 'CONVERTS_TO_LOCAL';
}

export const KnowledgeGraphMap: React.FC<KnowledgeGraphMapProps> = ({
  regulations,
  sources,
  heroSlides,
  heroClickStats,
  products,
  localConversions,
  nodeHits,
  selectedNodeId,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [onlyActiveLines, setOnlyActiveLines] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, AnchorRect>>({});
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 960,
    height: 680,
  });

  const focusId = hoveredNodeId || selectedNodeId;

  // Determine which products to show in Column 3 (always include connected products first)
  const displayedHeroSlides = useMemo(
    () => heroSlides.filter((s) => s.active !== false).slice(0, 4),
    [heroSlides]
  );

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const displayedProducts = useMemo(() => {
    if (showAllProducts) return activeProducts;
    // Prioritize products directly tied to focusId so every active connection has an endpoint
    const prioritized = [...activeProducts].sort((a, b) => {
      const aDirect =
        a.id === focusId ||
        a.regulationIds.includes(focusId) ||
        a.localConversionId === focusId
          ? 1
          : 0;
      const bDirect =
        b.id === focusId ||
        b.regulationIds.includes(focusId) ||
        b.localConversionId === focusId
          ? 1
          : 0;
      return bDirect - aDirect;
    });
    return prioritized.slice(0, 7);
  }, [activeProducts, focusId, showAllProducts]);

  // Compute active highlight sets across the 4 columns
  const { activeSet, visualEdges } = useMemo(() => {
    const col1 = new Set<string>();
    const col2 = new Set<string>();
    const col3 = new Set<string>();
    const col4 = new Set<string>();

    const regMap = new Map(regulations.map((r) => [r.id, r]));
    const srcMap = new Map(sources.map((s) => [s.id, s]));
    const slideMap = new Map(displayedHeroSlides.map((s) => [s.id, s]));
    const prodMap = new Map(displayedProducts.map((p) => [p.id, p]));
    const localMap = new Map(localConversions.map((l) => [l.id, l]));

    const slideMatchesReg = (slide: HeroSlide, reg: RegulationNode) =>
      slide.transportModes.includes(reg.transportMode) || slide.nodeIds.includes(reg.id);

    if (regMap.has(focusId)) {
      const reg = regMap.get(focusId)!;
      col1.add(reg.id);
      col2.add(reg.sourceId);
      displayedHeroSlides.forEach((sl) => {
        if (slideMatchesReg(sl, reg)) col3.add(sl.id);
      });
      displayedProducts.forEach((p) => {
        if (p.regulationIds.includes(reg.id)) {
          col3.add(p.id);
          if (p.localConversionId) col4.add(p.localConversionId);
        }
      });
      localConversions.forEach((l) => {
        if (l.relatedRegulationId === reg.id) col4.add(l.id);
      });
    } else if (srcMap.has(focusId)) {
      col2.add(focusId);
      const matchedRegs = regulations.filter((r) => r.sourceId === focusId);
      matchedRegs.forEach((r) => {
        col1.add(r.id);
        displayedHeroSlides.forEach((sl) => {
          if (slideMatchesReg(sl, r)) col3.add(sl.id);
        });
        displayedProducts.forEach((p) => {
          if (p.regulationIds.includes(r.id)) {
            col3.add(p.id);
            if (p.localConversionId) col4.add(p.localConversionId);
          }
        });
        localConversions.forEach((l) => {
          if (l.relatedRegulationId === r.id) col4.add(l.id);
        });
      });
    } else if (slideMap.has(focusId)) {
      const sl = slideMap.get(focusId)!;
      col3.add(sl.id);
      regulations.forEach((r) => {
        if (slideMatchesReg(sl, r)) {
          col1.add(r.id);
          col2.add(r.sourceId);
        }
      });
      localConversions.forEach((l) => {
        if (sl.nodeIds.includes(l.id) || sl.id.includes('local')) col4.add(l.id);
      });
    } else if (prodMap.has(focusId)) {
      const p = prodMap.get(focusId)!;
      col3.add(p.id);
      p.regulationIds.forEach((rId) => {
        const reg = regMap.get(rId);
        if (reg) {
          col1.add(reg.id);
          col2.add(reg.sourceId);
        }
      });
      if (p.localConversionId) col4.add(p.localConversionId);
    } else if (localMap.has(focusId)) {
      const loc = localMap.get(focusId)!;
      col4.add(loc.id);
      const relReg = regMap.get(loc.relatedRegulationId);
      if (relReg) {
        col1.add(relReg.id);
        col2.add(relReg.sourceId);
      }
      displayedProducts.forEach((p) => {
        if (p.localConversionId === loc.id) {
          col3.add(p.id);
          p.regulationIds.forEach((rId) => {
            const reg = regMap.get(rId);
            if (reg) {
              col1.add(reg.id);
              col2.add(reg.sourceId);
            }
          });
        }
      });
    }

    const active = new Set<string>([...col1, ...col2, ...col3, ...col4]);

    // Build visual adjacent-column edges across all displayed nodes
    const edges: VisualEdge[] = [];
    const seen = new Set<string>();
    const pushEdge = (from: string, to: string, relation: VisualEdge['relation']) => {
      const key = `${from}->${to}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ id: key, from, to, relation });
    };

    // Col 1 -> Col 2
    regulations.forEach((r) => {
      if (srcMap.has(r.sourceId)) {
        pushEdge(r.id, r.sourceId, 'VERIFIED_BY');
      }
    });

    // Col 2 -> Col 3 (hero slides)
    displayedHeroSlides.forEach((sl) => {
      regulations.forEach((r) => {
        if (slideMatchesReg(sl, r) && srcMap.has(r.sourceId)) {
          pushEdge(r.sourceId, sl.id, 'LINKS_BANNER');
        }
      });
    });

    // Col 2 -> Col 3 (products via their regulations' sources)
    displayedProducts.forEach((p) => {
      p.regulationIds.forEach((rId) => {
        const reg = regMap.get(rId);
        if (reg && srcMap.has(reg.sourceId)) {
          pushEdge(reg.sourceId, p.id, 'CONSTRAINS');
        }
      });
      if (p.localConversionId && localMap.has(p.localConversionId)) {
        pushEdge(p.id, p.localConversionId, 'CONVERTS_TO_LOCAL');
      }
    });

    // Col 3 hero slides -> Col 4 local conversions
    displayedHeroSlides.forEach((sl) => {
      localConversions.forEach((l) => {
        if (sl.nodeIds.includes(l.id)) {
          pushEdge(sl.id, l.id, 'CONVERTS_TO_LOCAL');
        }
      });
    });

    return { activeSet: active, visualEdges: edges };
  }, [regulations, sources, displayedHeroSlides, displayedProducts, localConversions, focusId]);

  const measureAnchors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next: Record<string, AnchorRect> = {};
    Object.entries(nodeRefs.current).forEach(([id, el]) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      next[id] = {
        xLeft: r.left - cRect.left,
        xRight: r.right - cRect.left,
        yMid: r.top - cRect.top + r.height / 2,
      };
    });
    setAnchors(next);
    setCanvasSize({
      width: Math.max(container.clientWidth, 880),
      height: Math.max(container.clientHeight, 560),
    });
  }, []);

  useLayoutEffect(() => {
    measureAnchors();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => measureAnchors());
    obs.observe(container);
    window.addEventListener('resize', measureAnchors);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measureAnchors);
    };
  }, [measureAnchors, regulations.length, sources.length, displayedHeroSlides.length, displayedProducts.length, localConversions.length, showAllProducts]);

  const setNodeRef = (id: string) => (el: HTMLButtonElement | null) => {
    nodeRefs.current[id] = el;
  };

  const renderNodeCardClass = (id: string) => {
    const isSelected = selectedNodeId === id;
    const isConnected = activeSet.has(id);
    if (isSelected) {
      return 'border-[#0284c7] bg-[#0284c7] text-white shadow-md ring-2 ring-[#0284c7]/25';
    }
    if (isConnected) {
      return 'border-[#0284c7] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs hover:bg-sky-50/50 dark:hover:bg-sky-950/30';
    }
    return 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/75 text-[var(--text-muted)] opacity-45 hover:opacity-85 hover:border-[var(--border-strong)]';
  };

  return (
    <div className="space-y-3">
      {/* Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#0284c7] rounded-full" />
            활성 연결 경로
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-slate-400/50 rounded-full" />
            전체 관계망
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyActiveLines((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
              onlyActiveLines
                ? 'border-[#0284c7] bg-sky-500/10 text-[#0284c7] font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
            }`}
          >
            {onlyActiveLines ? '선택 연결선만 표시중' : '선택 연결선만 보기'}
          </button>
          <button
            type="button"
            onClick={() => setShowAllProducts((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
              showAllProducts
                ? 'border-[#0284c7] bg-sky-500/10 text-[#0284c7] font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
            }`}
          >
            {showAllProducts ? `핵심 상품만 보기` : `전체 상품 노드 펼치기 (${activeProducts.length})`}
          </button>
        </div>
      </div>

      {/* Interactive 4-Column SVG Topology Canvas */}
      <div className="overflow-x-auto thin-scroll rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-50/70 to-[var(--bg-surface)] dark:from-slate-900/60 dark:to-[var(--bg-surface)] p-4 sm:p-5">
        <div ref={containerRef} className="relative min-w-[880px]">
          {/* SVG Connecting Lines Layer */}
          <svg
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            className="absolute inset-0 pointer-events-none z-0 overflow-visible"
            aria-hidden="true"
          >
            {/* Inactive background lines first */}
            {!onlyActiveLines &&
              visualEdges.map((edge) => {
                const isActive = activeSet.has(edge.from) && activeSet.has(edge.to);
                if (isActive) return null;
                const a = anchors[edge.from];
                const b = anchors[edge.to];
                if (!a || !b) return null;
                const x1 = a.xRight;
                const y1 = a.yMid;
                const x2 = b.xLeft;
                const y2 = b.yMid;
                const dx = Math.max(32, (x2 - x1) * 0.52);
                const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                return (
                  <path
                    key={`bg-${edge.id}`}
                    d={d}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={1.1}
                    strokeOpacity={0.22}
                  />
                );
              })}

            {/* Highlighted active S-curve lines on top */}
            {visualEdges.map((edge) => {
              const isActive = activeSet.has(edge.from) && activeSet.has(edge.to);
              if (!isActive) return null;
              const a = anchors[edge.from];
              const b = anchors[edge.to];
              if (!a || !b) return null;
              const x1 = a.xRight;
              const y1 = a.yMid;
              const x2 = b.xLeft;
              const y2 = b.yMid;
              const dx = Math.max(34, (x2 - x1) * 0.54);
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const strokeColor =
                edge.relation === 'CONVERTS_TO_LOCAL' ? '#0d9488' : '#0284c7';
              return (
                <g key={`fg-${edge.id}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2.2}
                    strokeOpacity={0.9}
                  />
                  <circle cx={x1} cy={y1} r={3} fill={strokeColor} />
                  <circle cx={x2} cy={y2} r={3} fill={strokeColor} />
                </g>
              );
            })}
          </svg>

          {/* 4-Column Nodes Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-8 items-start">
            {/* Column 1: 이동 수단 · 최소규정 */}
            <div className="space-y-2.5">
              <div className="pb-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  1. 이동 수단 · 최소규정
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  7대 수단 기준
                </div>
              </div>
              {regulations.map((r) => {
                const isSelected = selectedNodeId === r.id;
                return (
                  <button
                    key={r.id}
                    ref={setNodeRef(r.id)}
                    type="button"
                    onClick={() => onSelectNode(r.id)}
                    onMouseEnter={() => setHoveredNodeId(r.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${renderNodeCardClass(r.id)}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{r.modeLabel}</span>
                      <span
                        className={`font-mono-num text-[10px] shrink-0 ${
                          isSelected ? 'text-sky-100' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        조회 {nodeHits[r.id] || 0}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] line-clamp-1 ${
                        isSelected ? 'text-sky-50' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {r.summary}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Column 2: API 출처 · 공식 원문 */}
            <div className="space-y-2.5">
              <div className="pb-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  2. API 출처 · 공식 원문
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  법령·운송약관
                </div>
              </div>
              {sources.map((s) => {
                const isSelected = selectedNodeId === s.id;
                return (
                  <button
                    key={s.id}
                    ref={setNodeRef(s.id)}
                    type="button"
                    onClick={() => onSelectNode(s.id)}
                    onMouseEnter={() => setHoveredNodeId(s.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${renderNodeCardClass(s.id)}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{s.name}</span>
                      <span
                        className={`font-mono-num text-[10px] shrink-0 ${
                          isSelected ? 'text-sky-100' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        검증 {nodeHits[s.id] || 0}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] line-clamp-1 ${
                        isSelected ? 'text-sky-50' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {s.verifiedDate} · {s.standardTitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Column 3: 배너 · 상품 · 옵션 */}
            <div className="space-y-2">
              <div className="pb-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  3. 배너 · 상품 · 옵션
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  규격·중량·클릭 연동
                </div>
              </div>
              {displayedHeroSlides.map((sl) => {
                const isSelected = selectedNodeId === sl.id;
                const stat = heroClickStats[sl.id];
                const clicks = (stat?.bannerClicks || 0) + (stat?.hashtagClicks || 0);
                return (
                  <button
                    key={sl.id}
                    ref={setNodeRef(sl.id)}
                    type="button"
                    onClick={() => onSelectNode(sl.id)}
                    onMouseEnter={() => setHoveredNodeId(sl.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition cursor-pointer ${renderNodeCardClass(sl.id)}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{sl.themeTag}</span>
                      <span
                        className={`font-mono-num text-[10px] shrink-0 ${
                          isSelected ? 'text-sky-100' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        클릭 {clicks}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] truncate ${
                        isSelected ? 'text-sky-50' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {sl.specBadges.slice(0, 2).join(' · ')}
                    </div>
                  </button>
                );
              })}

              {displayedProducts.map((p) => {
                const isSelected = selectedNodeId === p.id;
                return (
                  <button
                    key={p.id}
                    ref={setNodeRef(p.id)}
                    type="button"
                    onClick={() => onSelectNode(p.id)}
                    onMouseEnter={() => setHoveredNodeId(p.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition cursor-pointer ${renderNodeCardClass(p.id)}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{p.name}</span>
                      <span
                        className={`font-mono-num text-[10px] shrink-0 ${
                          isSelected ? 'text-sky-100' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {p.weightKg}kg
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] truncate ${
                        isSelected ? 'text-sky-50' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {p.dimensionsCm}cm (합 {p.sumCm}cm) · {p.basePrice.toLocaleString()}원
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Column 4: 현지 구매 · 체험 전환 */}
            <div className="space-y-3">
              <div className="pb-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  4. 현지 구매 · 체험 전환
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  초과·미비 대체
                </div>
              </div>
              {localConversions.map((l) => {
                const isSelected = selectedNodeId === l.id;
                return (
                  <button
                    key={l.id}
                    ref={setNodeRef(l.id)}
                    type="button"
                    onClick={() => onSelectNode(l.id)}
                    onMouseEnter={() => setHoveredNodeId(l.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${renderNodeCardClass(l.id)}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{l.title}</span>
                      <span
                        className={`font-mono-num text-[10px] shrink-0 ${
                          isSelected ? 'text-sky-100' : 'text-[var(--brand-accent)]'
                        }`}
                      >
                        전환 {nodeHits[l.id] || 0}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] line-clamp-1 ${
                        isSelected ? 'text-sky-50' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {l.triggerCondition} · -{l.weightSavedKg}kg 절감
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
