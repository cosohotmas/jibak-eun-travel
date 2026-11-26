import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { createInquiryInFirestore } from '../lib/firebase';

interface InquirySectionProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenMyPage: () => void;
}

export const InquirySection: React.FC<InquirySectionProps> = ({
  user,
  onOpenAuth,
  onOpenMyPage,
}) => {
  const [category, setCategory] = useState<'상품 문의' | '배송 문의' | '교환·환불' | '기타'>('상품 문의');
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (subject.trim().length < 2 || message.trim().length < 5) {
      setFeedback({ type: 'err', text: '제목(2자 이상)과 문의 내용(5자 이상)을 입력해 주세요.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await createInquiryInFirestore({
        category,
        subject: subject.trim(),
        message: message.trim(),
        orderId: orderId.trim() || undefined,
      });
      setSubject('');
      setMessage('');
      setOrderId('');
      setFeedback({
        type: 'ok',
        text: '1:1 문의가 접수되었습니다. 마이페이지에서 답변 상태를 확인할 수 있습니다.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : '문의 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="inquiry-section" className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)]">
            <MessageSquarePlus className="w-4 h-4" />
            <span>1:1 고객센터 · 사은품/교환 문의</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            규정 적합 여부·배송·교환 문의
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            출발일 임박 출고 요청, 단체 주문, 수령 후 7일 이내 교환·반품 문의를 남기시면 담당자가 확인 후 마이페이지에 답변을 등록해 드립니다.
          </p>
          <button
            type="button"
            onClick={onOpenMyPage}
            className="text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
          >
            내 문의 내역 확인하기 →
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                문의 분류
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="상품 문의">상품 문의</option>
                <option value="배송 문의">배송 문의</option>
                <option value="교환·환불">교환·환불</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                주문번호 (선택)
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="관련 주문 ID 입력"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              제목
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예: KTX 선반 수납 가능 사이즈 및 당일 출고 문의"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              문의 내용
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="구체적인 문의 내용을 입력해 주세요."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-teal-600/10 text-[var(--status-pass)]'
                  : 'bg-rose-600/10 text-[var(--status-danger)]'
              }`}
            >
              {feedback.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 cursor-pointer"
            >
              {user ? (submitting ? '접수 중...' : '1:1 문의 접수하기') : '로그인 후 문의 접수'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
