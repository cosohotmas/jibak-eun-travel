import React, { useState } from 'react';
import {
  Footprints,
  Car,
  TrainFront,
  Bus,
  Plane,
  Ship,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Scale,
  Check,
} from 'lucide-react';
import { CARRIER_CAPACITY, detectCustomDestinationCourse } from '../lib/localRagEngine';
import type {
  CarrierPresetKey,
  DiagnosticPreset,
  PackingMetrics,
  StrictestConstraints,
  TransportModeId,
} from '../types/domain';

interface TripContextSummary {
  destination: string;
  duration: string;
  theme: string;
  companion: string;
}

interface TransportContextBarProps {
  selectedModes: TransportModeId[];
  onToggleMode: (mode: TransportModeId) => void;
  constraints: StrictestConstraints | null;
  packMetrics?: PackingMetrics;
  tripContext: TripContextSummary;
  presets: DiagnosticPreset | null;
  carrierPreset: CarrierPresetKey;
  onChangeCarrierPreset: (preset: CarrierPresetKey) => void;
  onUpdateTripContext: (patch: Partial<TripContextSummary>, applyModes?: TransportModeId[]) => void;
}

const MODE_META: Array<{
  id: TransportModeId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'walk', label: '도보', icon: Footprints },
  { id: 'car', label: '자가용', icon: Car },
  { id: 'subway', label: '지하철', icon: TrainFront },
  { id: 'bus', label: '버스', icon: Bus },
  { id: 'train', label: '철도', icon: TrainFront },
  { id: 'ship', label: '배', icon: Ship },
  { id: 'flight', label: '항공', icon: Plane },
];

const MODE_SHORT_LABEL: Record<TransportModeId, string> = {
  walk: '도보',
  car: '자가용',
  subway: '지하철',
  bus: '버스',
  train: '철도',
  ship: '배',
  flight: '항공',
};

export const TransportContextBar: React.FC<TransportContextBarProps> = ({
  selectedModes,
  onToggleMode,
  constraints,
  packMetrics,
  tripContext,
  presets,
  carrierPreset,
  onChangeCarrierPreset,
  onUpdateTripContext,
}) => {
  // Always collapsed by default so chat & recommendation cards draw immediate focus
  const [editorOpen, setEditorOpen] = useState(false);
  const [showRegulations, setShowRegulations] = useState(false);
  const [customDest, setCustomDest] = useState('');

  const modesSummary = selectedModes.map((m) => MODE_SHORT_LABEL[m]).join('+');
  const maxWeightLabel = constraints ? `최대 ${constraints.maxWeightKg}kg` : '규정 계산중';
  const carrierShort = packMetrics?.carrierShortLabel || CARRIER_CAPACITY[carrierPreset].shortLabel;

  const isBusinessTheme =
    tripContext.theme.includes('비즈니스') || tripContext.theme.includes('출장');
  const companionOptions = isBusinessTheme
    ? presets?.businessCompanions || [
        { id: 'biz-solo', label: '혼자 출장' },
        { id: 'biz-team', label: '동료·팀 출장' },
        { id: 'biz-client', label: '거래처·바이어·의전 동행' },
      ]
    : presets?.companions || [
        { id: 'solo', label: '혼자 떠나는 여행' },
        { id: 'couple', label: '친구·연인' },
        { id: 'family', label: '가족(부모님/아이)' },
      ];

  return (
    <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2">
        {/* Single-Line Summary Chip + [수정] On-Demand Trigger */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen((v) => !v)}
            aria-expanded={editorOpen}
            className="flex-1 min-w-0 flex items-center justify-between gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-left hover:border-[var(--brand-primary)] transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              <Scale className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                {tripContext.destination} · {tripContext.duration} · {tripContext.companion} · {carrierShort} · {modesSummary}
              </span>
              <span className="font-mono-num text-xs font-bold text-[var(--brand-primary)] shrink-0">
                ({maxWeightLabel})
              </span>
              {packMetrics && (
                <span
                  className={`hidden md:inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold font-mono-num shrink-0 ${
                    packMetrics.carrierEval.status === 'exceeds'
                      ? 'bg-rose-500/10 text-[var(--status-danger)]'
                      : packMetrics.carrierEval.status === 'caution'
                      ? 'bg-amber-500/10 text-[var(--status-warn)]'
                      : 'bg-teal-600/10 text-[var(--status-pass)]'
                  }`}
                >
                  {packMetrics.carrierEval.badgeLabel} · 적재 {packMetrics.loadPercent}% ({packMetrics.estimatedPackWeight}kg)
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] group-hover:border-[var(--brand-primary)] group-hover:text-[var(--brand-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] shrink-0">
              <SlidersHorizontal className="w-3 h-3" />
              <span>{editorOpen ? '닫기' : '수정'}</span>
              {editorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>

        {/* On-Demand Expanded Panel (Collapsed by Default) */}
        {editorOpen && (
          <div className="mt-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-4 shadow-sm">
            {/* 1. 7대 이동수단 토글 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  1. 이동 수단 선택 (복수 선택 시 가장 엄격한 최소규정 자동 적용)
                </span>
                {constraints && (
                  <button
                    type="button"
                    onClick={() => setShowRegulations((v) => !v)}
                    className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                  >
                    {showRegulations ? '공식 근거 접기' : '공식 규정 근거 보기'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {MODE_META.map(({ id, label, icon: Icon }) => {
                  const active = selectedModes.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onToggleMode(id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer border ${
                        active
                          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              {constraints && (
                <div className="text-[11px] font-mono-num text-[var(--text-secondary)] pt-0.5">
                  현재 최소규정: {constraints.headlineSummary}
                </div>
              )}
            </div>

            {showRegulations && constraints && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                {constraints.regulations.map((reg) => (
                  <div
                    key={reg.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs"
                  >
                    <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                      {reg.modeLabel} · {reg.title}
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed mb-1">{reg.summary}</p>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      출처: {reg.source.name} ({reg.source.verifiedDate})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. 일정 · 목적지 · 테마 · 인원(동행) 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                  2-1. 목적지
                </label>
                <select
                  value={
                    presets?.destinations.some((d) => d.label === tripContext.destination)
                      ? tripContext.destination
                      : '__custom__'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') return;
                    const found = presets?.destinations.find((d) => d.label === val);
                    onUpdateTripContext({ destination: val }, found?.defaultModes);
                  }}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  {(presets?.destinations || []).map((d) => (
                    <option key={d.id} value={d.label}>
                      {d.label} ({d.sub})
                    </option>
                  ))}
                  {!presets?.destinations.some((d) => d.label === tripContext.destination) && (
                    <option value="__custom__">{tripContext.destination} (직접 입력)</option>
                  )}
                </select>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDest.trim()) {
                        e.preventDefault();
                        const inferred = detectCustomDestinationCourse(customDest.trim());
                        onUpdateTripContext({ destination: customDest.trim() }, inferred.defaultModes);
                        setCustomDest('');
                      }
                    }}
                    placeholder="기타 지역 직접 입력"
                    className="flex-1 min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customDest.trim()) return;
                      const inferred = detectCustomDestinationCourse(customDest.trim());
                      onUpdateTripContext({ destination: customDest.trim() }, inferred.defaultModes);
                      setCustomDest('');
                    }}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer"
                  >
                    적용
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                  2-2. 여행 일정
                </label>
                <select
                  value={tripContext.duration}
                  onChange={(e) => onUpdateTripContext({ duration: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  {(presets?.durations || [
                    { id: 'day', label: '당일치기' },
                    { id: '1n2d', label: '1박 2일' },
                    { id: '2n3d', label: '2박 3일' },
                    { id: '3n4d', label: '3박 4일 이상' },
                  ]).map((dur) => (
                    <option key={dur.id} value={dur.label}>
                      {dur.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                  2-3. 여행 테마
                </label>
                <select
                  value={tripContext.theme}
                  onChange={(e) => {
                    const nextTheme = e.target.value;
                    const nextIsBiz = nextTheme.includes('비즈니스') || nextTheme.includes('출장');
                    const curIsBiz =
                      tripContext.companion.includes('출장') || tripContext.companion.includes('거래처');
                    if (nextIsBiz && !curIsBiz) {
                      onUpdateTripContext({ theme: nextTheme, companion: '혼자 출장' });
                    } else if (!nextIsBiz && curIsBiz) {
                      onUpdateTripContext({ theme: nextTheme, companion: '친구·연인' });
                    } else {
                      onUpdateTripContext({ theme: nextTheme });
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  {(presets?.themes || [
                    { id: 'cafe', label: '카페 & 맛집' },
                    { id: 'nature', label: '자연 & 바다 힐링' },
                    { id: 'photo', label: '감성 사진 & 인생샷' },
                    { id: 'history', label: '역사·문화' },
                    { id: 'business', label: '비즈니스·출장' },
                  ]).map((th) => (
                    <option key={th.id} value={th.label}>
                      {th.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                  2-4. 동행 인원 ({isBusinessTheme ? '출장 유형' : '일반 여행'})
                </label>
                <select
                  value={tripContext.companion}
                  onChange={(e) => onUpdateTripContext({ companion: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  {companionOptions.map((cp) => (
                    <option key={cp.id} value={cp.label}>
                      {cp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. 가방 규격 선택 */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-[var(--text-primary)]">
                  3. 가방 규격 선택 (적재율·규정 적합 여부 즉시 재계산)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CARRIER_CAPACITY) as CarrierPresetKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChangeCarrierPreset(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                        carrierPreset === key
                          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {CARRIER_CAPACITY[key].label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)] shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>적용 완료 · 접기</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
