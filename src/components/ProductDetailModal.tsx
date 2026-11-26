import React, { useMemo, useState } from 'react';
import {
  X,
  ShoppingBag,
  Zap,
  Gift,
  RefreshCw,
  MapPin,
  Minus,
  Plus,
} from 'lucide-react';
import type {
  CarrierPresetKey,
  CatalogProduct,
  FactCitation,
  LocalConversionNode,
  StrictestConstraints,
} from '../types/domain';
import { FactCitationFooter } from './FactCitationFooter';
import { evaluateProductUnified } from '../lib/localRagEngine';

interface ProductDetailModalProps {
  product: CatalogProduct | null;
  constraints: StrictestConstraints | null;
  carrierPreset?: CarrierPresetKey;
  citations: FactCitation[];
  localConversions: LocalConversionNode[];
  onClose: () => void;
  onAddToCart: (product: CatalogProduct, variantIdx: number, colorIdx: number, qty: number) => void;
  onBuyNow: (product: CatalogProduct, variantIdx: number, colorIdx: number, qty: number) => void;
  onConvertLocal: (node: LocalConversionNode, product: CatalogProduct) => void;
  onTrackSourceClick: (sourceName: string, url: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  constraints,
  carrierPreset = 'cabin20',
  citations,
  localConversions,
  onClose,
  onAddToCart,
  onBuyNow,
  onConvertLocal,
  onTrackSourceClick,
}) => {
  const [variantIdx, setVariantIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return product.variants[variantIdx] || product.variants[0];
  }, [product, variantIdx]);

  if (!product || !selectedVariant) return null;

  const unitPrice = product.basePrice + selectedVariant.priceDelta;
  const totalPrice = unitPrice * qty;
  const totalWeight = Number((selectedVariant.weightKg * qty).toFixed(2));
  const selectedColor = product.colors[colorIdx] || product.colors[0] || '기본';

  const unifiedEval = evaluateProductUnified(product, {
    constraints,
    carrierPreset,
    variantIdx,
  });

  const linkedLocal = product.localConversionId
    ? localConversions.find((l) => l.id === product.localConversionId)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto thin-scroll rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="text-xs font-semibold text-[var(--text-muted)]">
            {product.category} · 규정 검증 상세 스펙
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

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Compatibility Box */}
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-xs space-y-2">
              <div className="font-bold text-[var(--text-primary)]">
                선택 이동수단·가방 규정 판정 ({constraints?.headlineSummary})
              </div>
              <div className="flex items-start gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                    unifiedEval.status === 'exceeds'
                      ? 'bg-rose-500/10 text-[var(--status-danger)]'
                      : unifiedEval.status === 'caution'
                      ? 'bg-amber-500/10 text-[var(--status-warn)]'
                      : 'bg-teal-600/10 text-[var(--status-pass)]'
                  }`}
                >
                  {unifiedEval.badgeLabel}
                </span>
                <span
                  className={`font-semibold ${
                    unifiedEval.status === 'exceeds'
                      ? 'text-[var(--status-danger)]'
                      : unifiedEval.status === 'caution'
                      ? 'text-[var(--status-warn)]'
                      : 'text-[var(--status-pass)]'
                  }`}
                >
                  {unifiedEval.note}
                </span>
              </div>
              <div className="text-[var(--text-secondary)]">
                남은 재고: <strong className="font-mono-num">{product.stock}개</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {product.name}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="font-mono-num text-2xl font-bold text-[var(--text-primary)]">
                  {totalPrice.toLocaleString()}원
                </span>
                {product.originalPrice > unitPrice && (
                  <span className="font-mono-num text-sm text-[var(--text-muted)] line-through">
                    {(product.originalPrice * qty).toLocaleString()}원
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)] font-mono-num">
                  (총 {totalWeight}kg)
                </span>
              </div>

              {/* Variant Selector */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  규격 · 사이즈 선택
                </label>
                <div className="space-y-1.5">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantIdx(idx)}
                      className={`w-full text-left rounded-xl border p-2.5 text-xs transition cursor-pointer ${
                        variantIdx === idx
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-tint)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                        <span>{v.label}</span>
                        <span className="font-mono-num">
                          {(product.basePrice + v.priceDelta).toLocaleString()}원
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{v.specText}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  색상 선택
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((c, idx) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorIdx(idx)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        colorIdx === idx
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-[var(--text-primary)]">수량</span>
                <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono-num px-3 text-sm font-semibold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Gift & Exchange Info */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs space-y-1.5">
                <div className="flex items-start gap-2 text-[var(--text-primary)]">
                  <Gift className="w-4 h-4 text-[var(--brand-accent)] shrink-0 mt-0.5" />
                  <span>사은품: {product.freeGift}</span>
                </div>
                <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                  <RefreshCw className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <span>교환·반품: {product.exchangePolicy}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, variantIdx, colorIdx, qty);
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--brand-primary)] bg-[var(--bg-surface)] py-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-tint)] cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  장바구니 담기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onBuyNow(product, variantIdx, colorIdx, qty);
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  바로 주문 ({selectedColor})
                </button>
              </div>

              {linkedLocal && (
                <button
                  type="button"
                  onClick={() => {
                    onConvertLocal(linkedLocal, product);
                    onClose();
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-600/30 bg-teal-600/10 py-2 text-xs font-semibold text-[var(--brand-accent)] hover:bg-teal-600/20 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  짐 줄이기: {linkedLocal.actionLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5">
          <FactCitationFooter citations={citations} onSourceClick={onTrackSourceClick} />
        </div>
      </div>
    </div>
  );
};
