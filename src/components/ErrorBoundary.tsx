import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error);
    let readable = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        readable = `데이터 권한 또는 연결 확인 필요: ${parsed.error} (${parsed.operationType || ''} ${parsed.path || ''})`;
      }
    } catch {
      // plain text error
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6">
          <div className="max-w-lg w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">화면 처리 중 문제가 발생했습니다</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words mb-5">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              다시 불러오기
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
