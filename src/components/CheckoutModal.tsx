import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { X, CheckCircle2, CreditCard, Search, MapPin } from 'lucide-react';
import { createOrderInFirestore } from '../lib/firebase';
import type { CartItem, TransportModeId } from '../types/domain';
import { AddressSearchModal } from './AddressSearchModal';

interface CheckoutModalProps {
  open: boolean;
  user: User | null;
  cart: CartItem[];
  selectedModes: TransportModeId[];
  onClose: () => void;
  onRequireAuth: () => void;
  onOrderSuccess: (orderId: string, totalAmount: number, summary: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  user,
  cart,
  selectedModes,
  onClose,
  onRequireAuth,
  onOrderSuccess,
}) => {
  const [buyerName, setBuyerName] = useState(user?.displayName || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [departureDate, setDepartureDate] = useState('2026-12-05');
  const [zipCode, setZipCode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('신용·체크카드');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const detailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setBuyerName((prev) => prev || user.displayName || '');
      setBuyerEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  if (!open) return null;

  const totalAmount = cart.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
  const combinedShippingAddress = [
    zipCode.trim() ? `[${zipCode.trim()}]` : '',
    baseAddress.trim(),
    detailAddress.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!buyerName.trim() || !baseAddress.trim()) {
      setErrorMsg('수령인 성함과 배송지 기본주소를 입력해 주세요.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('주문할 상품이 없습니다.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const orderId = await createOrderInFirestore({
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim() || user.email || 'traveler@example.com',
        departureDate,
        paymentMethod,
        shippingAddress: combinedShippingAddress,
        shippingZipCode: zipCode.trim(),
        shippingBaseAddress: baseAddress.trim(),
        shippingDetailAddress: detailAddress.trim(),
        transportModes: selectedModes,
        items: cart,
        totalAmount,
      });
      const summary = cart.map((c) => `${c.name}(${c.optionSize})×${c.qty}`).join(', ');
      onOrderSuccess(orderId, totalAmount, summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '주문 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto thin-scroll rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--brand-primary)]" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                여행 준비물 주문서 작성
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3.5 py-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">[시연용 주문서 안내]</strong>{' '}
              본 주문·결제 화면은 개인 포트폴리오 시연용으로, 실제 금전 결제나 실물 배송은 이루어지지 않습니다.
            </div>

            {!user && (
              <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-[var(--status-warn)] flex items-center justify-between gap-2">
                <span>주문 내역 저장 및 배송 조회를 위해 Google 로그인이 필요합니다.</span>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white shrink-0 cursor-pointer"
                >
                  로그인하기
                </button>
              </div>
            )}

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-xs space-y-2">
              <div className="font-bold text-[var(--text-primary)]">주문 상품 ({cart.length}종)</div>
              {cart.map((c) => (
                <div key={c.cartKey} className="flex items-center justify-between gap-2.5 text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-9 h-9 rounded-md object-cover shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {c.optionSize} / {c.optionColor} · {c.unitPrice.toLocaleString()}원 × {c.qty}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-num font-bold text-[var(--text-primary)] shrink-0">
                    {(c.unitPrice * c.qty).toLocaleString()}원
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between font-bold text-sm text-[var(--text-primary)]">
                <span>최종 결제 금액</span>
                <span className="font-mono-num">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  수령인 성함
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  이메일 (송장 알림)
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  여행 출발 예정일 (우선 출고 기준)
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  결제 수단
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="신용·체크카드">신용·체크카드</option>
                  <option value="카카오페이">카카오페이</option>
                  <option value="네이버페이">네이버페이</option>
                  <option value="계좌이체">계좌이체</option>
                </select>
              </div>
            </div>

            {/* Structured Shipping Address + Address Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>배송지 주소</span>
                </label>
                {combinedShippingAddress && (
                  <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[65%]">
                    {combinedShippingAddress}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="우편번호"
                  maxLength={10}
                  className="w-32 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm font-mono-num text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setAddressSearchOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand-primary)] bg-[var(--brand-tint)] px-3.5 py-2 text-xs font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>주소 검색</span>
                </button>
              </div>

              <input
                type="text"
                value={baseAddress}
                onChange={(e) => setBaseAddress(e.target.value)}
                placeholder="기본주소 (주소 검색 버튼을 누르거나 도로명 주소를 입력하세요)"
                maxLength={150}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />

              <input
                ref={detailInputRef}
                type="text"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                placeholder="상세주소 (동·호수, 층, 공동현관 비밀번호 등)"
                maxLength={100}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-600/10 px-3 py-2 text-xs text-[var(--status-danger)]">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? '시연 주문 저장 중...' : `${totalAmount.toLocaleString()}원 시연용 주문 접수 (실제 결제 없음)`}</span>
            </button>
          </form>
        </div>
      </div>

      <AddressSearchModal
        open={addressSearchOpen}
        onClose={() => setAddressSearchOpen(false)}
        onSelectAddress={(result) => {
          setZipCode(result.zipCode);
          setBaseAddress(result.baseAddress);
          setErrorMsg(null);
          window.setTimeout(() => {
            detailInputRef.current?.focus();
          }, 80);
        }}
      />
    </>
  );
};
