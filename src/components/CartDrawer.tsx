import React from 'react';
import { X, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import type { CartItem, StrictestConstraints } from '../types/domain';

interface CartDrawerProps {
  open: boolean;
  cart: CartItem[];
  constraints: StrictestConstraints | null;
  onClose: () => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  cart,
  constraints,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}) => {
  if (!open) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
  const totalWeight = Number(cart.reduce((acc, item) => acc + item.weightKg * item.qty, 0).toFixed(2));
  const maxAllowed = constraints?.maxWeightKg ?? 10;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              장바구니 ({cart.reduce((a, b) => a + b.qty, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--text-muted)]">
              장바구니에 담긴 여행 준비물이 없습니다.
              <br />
              AI 컨시어지 추천 카드나 전체 상품에서 담아보세요.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartKey}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 flex gap-3"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 bg-[var(--bg-elevated)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-bold text-[var(--text-primary)] line-clamp-2">
                      {item.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.cartKey)}
                      className="text-[var(--text-muted)] hover:text-rose-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {item.optionSize} · {item.optionColor} · {item.weightKg}kg
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartKey, -1)}
                        className="px-2 py-1 text-[var(--text-secondary)] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono-num px-2 text-xs font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartKey, 1)}
                        className="px-2 py-1 text-[var(--text-secondary)] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-[var(--text-primary)]">
                      {(item.unitPrice * item.qty).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>담긴 총 중량</span>
            <span
              className={`font-mono-num font-bold ${
                totalWeight > maxAllowed ? 'text-[var(--status-danger)]' : 'text-[var(--status-pass)]'
              }`}
            >
              {totalWeight}kg / 최소규정 {maxAllowed}kg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">총 결제 예정 금액</span>
            <span className="font-mono-num text-xl font-bold text-[var(--text-primary)]">
              {subtotal.toLocaleString()}원
            </span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 cursor-pointer"
          >
            <span>주문서 작성하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
