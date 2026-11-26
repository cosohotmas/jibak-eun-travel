import React from 'react';
import { ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import type { FactCitation } from '../types/domain';

interface FactCitationFooterProps {
  citations: FactCitation[];
  uncertaintyNotice?: boolean;
  onSourceClick?: (sourceName: string, url: string) => void;
}

export const FactCitationFooter: React.FC<FactCitationFooterProps> = ({
  citations,
  uncertaintyNotice,
  onSourceClick,
}) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">
      {uncertaintyNotice && (
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[var(--status-warn)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            지식 그래프에 등록되지 않은 개별 항공사·특수 운송 조건은 임의로 추측하지 않으며, 등록된 공식 기준 범위만 안내했습니다. 탑승 전 운송사 원문을 반드시 확인해 주세요.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
          <span>Fact-First 공식 출처 검증</span>
        </div>
        <span className="font-mono-num text-[11px] text-[var(--text-muted)]">
          API 조회: {citations[0].fetchedAt}
        </span>
      </div>

      <div className="space-y-1">
        {citations.map((c) => (
          <div key={c.sourceName} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] leading-snug">
              {c.sourceName} · 기준일 {c.verifiedDate}
            </span>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSourceClick?.(c.sourceName, c.url)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand-primary)] hover:underline"
            >
              공식 원문 확인
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>

      <p className="mt-2 pt-1.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
        {citations[0].advisoryText}
      </p>
    </div>
  );
};
