import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { signInWithGooglePopup } from '../lib/firebase';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGooglePopup();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              집밖은여행 계정 로그인
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
          Google 계정으로 간편하게 로그인하면 주문·배송 조회, 1:1 문의 내역, 저장한 3분할 맞춤 체크리스트가 기기 간 안전하게 동기화됩니다.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-600/10 p-3 text-xs text-[var(--status-danger)]">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 cursor-pointer"
        >
          {loading ? '연결 중...' : 'Google 계정으로 계속하기'}
        </button>
      </div>
    </div>
  );
};
