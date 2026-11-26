import React, { useEffect, useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  ShoppingBag,
  Copy,
  Check,
  Bookmark,
  ReceiptText,
  Printer,
} from 'lucide-react';
import type {
  CarrierPresetKey,
  CartItem,
  CatalogProduct,
  LocalConversionNode,
  PackingMetrics,
  StrictestConstraints,
  TransportModeId,
} from '../types/domain';
import { evaluateProductUnified } from '../lib/localRagEngine';

interface ChecklistReceiptModalProps {
  open: boolean;
  onClose: () => void;
  tripContext: {
    destination: string;
    duration: string;
    theme: string;
    companion: string;
  };
  selectedModes: TransportModeId[];
  constraints: StrictestConstraints | null;
  carrierPreset: CarrierPresetKey;
  packMetrics: PackingMetrics;
  haveItems: string[];
  buyItems: string[];
  localItems: string[];
  uncheckedKeys: string[];
  onToggleCheckItem: (bucket: 'have' | 'buy', itemName: string) => void;
  cart: CartItem[];
  products: CatalogProduct[];
  localConversions: LocalConversionNode[];
  onQuickAddCart: (product: CatalogProduct, variantIdx?: number, colorIdx?: number) => void;
  onSelectProduct: (product: CatalogProduct) => void;
  onOpenCart: () => void;
  onSaveChecklist: (loadPercent: number, carrierLabel: string) => Promise<void>;
  savingChecklist: boolean;
  saveFeedback: string | null;
}

const MODE_LABELS: Record<TransportModeId, string> = {
  walk: '도보',
  car: '자가용',
  subway: '지하철',
  bus: '버스',
  train: '철도(KTX·SRT)',
  ship: '배(여객선)',
  flight: '항공(기내)',
};

const SawtoothEdge: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => {
  const teeth = Array.from({ length: 28 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 280 10"
      preserveAspectRatio="none"
      className={`w-full h-2.5 block shrink-0 ${position === 'bottom' ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polygon
        fill="#fcfbf7"
        points={`0,10 ${teeth
          .map((i) => `${i * 10 + 5},0 ${(i + 1) * 10},10`)
          .join(' ')}`}
      />
    </svg>
  );
};

export const ChecklistReceiptModal: React.FC<ChecklistReceiptModalProps> = ({
  open,
  onClose,
  tripContext,
  selectedModes,
  constraints,
  carrierPreset,
  packMetrics,
  haveItems,
  buyItems,
  localItems,
  uncheckedKeys,
  onToggleCheckItem,
  cart,
  products,
  localConversions,
  onQuickAddCart,
  onSelectProduct,
  onOpenCart,
  onSaveChecklist,
  savingChecklist,
  saveFeedback,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeCatalog = products.filter((p) => p.active !== false);

  const matchProductForBuyItem = (itemLabel: string): CatalogProduct | undefined => {
    const clean = itemLabel.split(' (')[0].trim();
    return activeCatalog.find(
      (p) =>
        p.name === itemLabel ||
        p.name === clean ||
        itemLabel.includes(p.name) ||
        p.name.includes(clean)
    );
  };

  const matchLocalNode = (itemLabel: string): LocalConversionNode | undefined => {
    return localConversions.find(
      (l) => itemLabel.includes(l.title) || l.title.includes(itemLabel.split(' (')[0].trim())
    );
  };

  const activeHaveItems = haveItems.filter((item) => !uncheckedKeys.includes(`have:${item}`));
  const activeBuyItems = buyItems.filter((item) => !uncheckedKeys.includes(`buy:${item}`));

  let estimatedBuyTotalKRW = 0;
  const buyRows = buyItems.map((item, idx) => {
    const prod = matchProductForBuyItem(item);
    const isChecked = prod
      ? !uncheckedKeys.includes(`buy:${item}`) && !uncheckedKeys.includes(`buy:${prod.name}`)
      : !uncheckedKeys.includes(`buy:${item}`);
    const price = prod ? prod.basePrice + (prod.variants[0]?.priceDelta || 0) : 0;
    if (isChecked && prod) {
      estimatedBuyTotalKRW += price;
    }
    const cartMatch = prod ? cart.find((c) => c.productId === prod.id) : undefined;
    const evalInfo = prod
      ? evaluateProductUnified(prod, { constraints, carrierPreset })
      : null;

    return {
      key: `rcpt-buy-${idx}-${item}`,
      item,
      prod,
      isChecked,
      price,
      cartMatch,
      evalInfo,
    };
  });

  const localSavedKg = localItems.reduce((sum, item) => {
    const node = matchLocalNode(item);
    return sum + (node ? node.weightSavedKg : 0.5);
  }, 0);

  const uncheckedCartPendingProducts = buyRows
    .filter((r) => r.isChecked && r.prod && !r.cartMatch)
    .map((r) => r.prod!);

  const issuedAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const handleCopyReceipt = async () => {
    const text = [
      '====================================',
      '   집밖은여행 3분할 스마트 체크리스트 영수증',
      '====================================',
      `여정: ${tripContext.destination} · ${tripContext.duration}`,
      `테마/동행: ${tripContext.theme} · ${tripContext.companion}`,
      `이동수단: ${selectedModes.map((m) => MODE_LABELS[m]).join(' + ')}`,
      `최소규정: ${constraints?.headlineSummary || '표준 기준'}`,
      `가방규격: ${packMetrics.carrierLabel} (${packMetrics.carrierEval.badgeLabel})`,
      '------------------------------------',
      `[01. 챙길짐] (${activeHaveItems.length}/${haveItems.length})`,
      ...haveItems.map((i) => `  ${uncheckedKeys.includes(`have:${i}`) ? '[ ]' : '[✓]'} ${i}`),
      '------------------------------------',
      `[02. 살물건] (${activeBuyItems.length}/${buyItems.length})`,
      ...buyRows.map(
        (r) =>
          `  ${r.isChecked ? '[✓]' : '[ ]'} ${r.prod ? r.prod.name : r.item}${
            r.prod ? ` (${r.price.toLocaleString()}원 / ${r.prod.weightKg}kg / ${r.evalInfo?.badgeLabel})` : ''
          }`
      ),
      '------------------------------------',
      `[03. 현지조달] (${localItems.length}건 · -${localSavedKg.toFixed(1)}kg 절감)`,
      ...localItems.map((i) => `  • ${i}`),
      '====================================',
      `적재율: ${packMetrics.loadPercent}% | 예상 총중량: ${packMetrics.estimatedPackWeight}kg / 한도 ${packMetrics.maxAllowedWeight}kg`,
      `살물건 예상 합계: ${estimatedBuyTotalKRW.toLocaleString()}원`,
      `발행시각: ${issuedAt}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="3분할 스마트 체크리스트 영수증"
    >
      <div
        className="relative w-full max-w-md max-h-[92vh] flex flex-col drop-shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Serrated Receipt Edge */}
        <SawtoothEdge position="top" />

        {/* Receipt Paper Body */}
        <div className="bg-[#fcfbf7] text-zinc-900 overflow-y-auto thin-scroll px-5 sm:px-6 pt-3 pb-5">
          {/* Close & Print Controls */}
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-wider text-zinc-500">
              <ReceiptText className="w-3.5 h-3.5 text-sky-700" />
              TRAVEL PACKING RECEIPT
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => window.print()}
                aria-label="인쇄"
                title="인쇄 / PDF 저장"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="영수증 닫기"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Storefront Receipt Header */}
          <div className="text-center py-3 border-y border-dashed border-zinc-300 space-y-1">
            <div className="text-base font-bold tracking-tight text-zinc-900">
              집밖은여행 · JIBAK-EUN TRAVEL
            </div>
            <div className="text-xs text-zinc-600">
              {tripContext.destination} · {tripContext.duration} · {tripContext.theme} · {tripContext.companion}
            </div>
            <div className="font-mono-num text-[11px] text-zinc-500">
              발행 {issuedAt}
            </div>
          </div>

          {/* Transit & Carrier Rule Stamp */}
          <div className="py-3 border-b border-dashed border-zinc-300 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500">선택 이동수단</span>
              <span className="font-semibold text-zinc-900 text-right">
                {selectedModes.map((m) => MODE_LABELS[m]).join(' + ')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500">최소단위 규정</span>
              <span className="font-mono-num font-semibold text-zinc-900 text-right">
                {constraints?.headlineSummary || '표준 기준'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500">선택 가방 규격</span>
              <span className="font-mono-num font-semibold text-zinc-900 text-right">
                {packMetrics.carrierLabel} ·{' '}
                <span
                  className={
                    packMetrics.carrierEval.status === 'exceeds'
                      ? 'text-rose-700'
                      : packMetrics.carrierEval.status === 'caution'
                      ? 'text-amber-700'
                      : 'text-teal-700'
                  }
                >
                  {packMetrics.carrierEval.badgeLabel}
                </span>
              </span>
            </div>
          </div>

          {/* SECTION 01: 챙길짐 */}
          <div className="py-3.5 border-b border-dashed border-zinc-300">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-2">
              <span>01. 집에서 챙길 짐 (챙길짐)</span>
              <span className="font-mono-num text-zinc-600">
                {activeHaveItems.length}/{haveItems.length}점 · {packMetrics.haveWeightKg.toFixed(1)}kg
              </span>
            </div>
            {haveItems.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-1">등록된 챙길 짐이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {haveItems.map((item, idx) => {
                  const isChecked = !uncheckedKeys.includes(`have:${item}`);
                  return (
                    <li key={`rcpt-have-${idx}-${item}`}>
                      <button
                        type="button"
                        onClick={() => onToggleCheckItem('have', item)}
                        className={`w-full flex items-center justify-between gap-2 text-left text-xs py-0.5 cursor-pointer ${
                          isChecked ? 'text-zinc-900' : 'text-zinc-400 line-through'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span className="truncate">{item}</span>
                        </span>
                        <span className="font-mono-num text-[11px] text-zinc-500 shrink-0">
                          0.25kg
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* SECTION 02: 살물건 */}
          <div className="py-3.5 border-b border-dashed border-zinc-300">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-2">
              <span>02. 여기서 살 물건 (살물건)</span>
              <span className="font-mono-num text-zinc-600">
                {activeBuyItems.length}점 · {estimatedBuyTotalKRW.toLocaleString()}원
              </span>
            </div>
            {buyRows.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-1">선택된 구매 추천 품목이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {buyRows.map((row) => (
                  <li key={row.key} className="text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleCheckItem('buy', row.prod ? row.prod.name : row.item)}
                        className={`flex items-start gap-2 min-w-0 flex-1 text-left cursor-pointer ${
                          row.isChecked ? 'text-zinc-900' : 'text-zinc-400 line-through'
                        }`}
                      >
                        {row.isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-sky-700 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium leading-snug">
                          {row.prod ? row.prod.name : row.item}
                        </span>
                      </button>

                      <span className="font-mono-num font-semibold text-zinc-900 shrink-0">
                        {row.prod ? `${row.price.toLocaleString()}원` : '-'}
                      </span>
                    </div>

                    {row.prod && (
                      <div className="pl-5.5 mt-0.5 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono-num text-zinc-500">
                          <span>{row.prod.weightKg}kg</span>
                          <span aria-hidden="true">·</span>
                          <span>{row.prod.dimensionsCm}cm</span>
                          {row.evalInfo && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-sans font-bold ${
                                  row.evalInfo.status === 'exceeds'
                                    ? 'text-rose-700'
                                    : row.evalInfo.status === 'caution'
                                    ? 'text-amber-700'
                                    : 'text-teal-700'
                                }`}
                              >
                                {row.evalInfo.badgeLabel}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectProduct(row.prod!);
                            }}
                            className="text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                          >
                            상세
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickAddCart(row.prod!, 0, 0)}
                            className="font-semibold text-sky-700 hover:underline cursor-pointer"
                          >
                            {row.cartMatch ? `담김(${row.cartMatch.qty})` : '+담기'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SECTION 03: 현지조달 */}
          <div className="py-3.5 border-b border-dashed border-zinc-300">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-2">
              <span>03. 현지 조달 전환 (무게 절감)</span>
              <span className="font-mono-num text-teal-700">
                {localItems.length}건 · -{localSavedKg.toFixed(1)}kg
              </span>
            </div>
            {localItems.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-1">현지 조달 전환 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {localItems.map((item, idx) => {
                  const node = matchLocalNode(item);
                  return (
                    <li
                      key={`rcpt-local-${idx}-${item}`}
                      className="flex items-start justify-between gap-2 text-xs text-zinc-800"
                    >
                      <span className="leading-snug">• {node ? node.title : item}</span>
                      <span className="font-mono-num text-[11px] font-semibold text-teal-700 shrink-0">
                        {node ? `-${node.weightSavedKg}kg` : '-0.5kg'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* RECEIPT TOTALS */}
          <div className="py-3.5 border-b border-dashed border-zinc-300 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-600">
              <span>가방 빈 무게 ({packMetrics.carrierShortLabel})</span>
              <span className="font-mono-num">{packMetrics.carrierBaseWeightKg}kg</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>테트리스 용량 적재율</span>
              <span
                className={`font-mono-num font-bold ${
                  packMetrics.capacityWarn ? 'text-rose-700' : 'text-sky-700'
                }`}
              >
                {packMetrics.loadPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-zinc-900 pt-1">
              <span>예상 총중량 / 규정 한도</span>
              <span
                className={`font-mono-num ${
                  packMetrics.weightOver ? 'text-rose-700' : 'text-zinc-900'
                }`}
              >
                {packMetrics.estimatedPackWeight}kg / {packMetrics.maxAllowedWeight}kg
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-zinc-900">
              <span>체크된 살물건 합계</span>
              <span className="font-mono-num text-sky-700">
                {estimatedBuyTotalKRW.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Receipt Action Buttons */}
          <div className="pt-4 space-y-2">
            {saveFeedback && (
              <p className="text-[11px] font-semibold text-teal-700 text-center">
                {saveFeedback}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '영수증 복사됨' : '영수증 복사'}</span>
              </button>
              <button
                type="button"
                disabled={savingChecklist}
                onClick={() => onSaveChecklist(packMetrics.loadPercent, packMetrics.carrierLabel)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savingChecklist ? '저장 중...' : '마이페이지 저장'}</span>
              </button>
            </div>

            {uncheckedCartPendingProducts.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  uncheckedCartPendingProducts.forEach((p) => onQuickAddCart(p, 0, 0));
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                체크한 살물건 {uncheckedCartPendingProducts.length}개 한 번에 담기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCart();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                장바구니 열기 ({cart.reduce((a, c) => a + c.qty, 0)})
              </button>
            )}
          </div>

          {/* Crisp Barcode & Fact-First Footnote */}
          <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-[2px] h-7 opacity-80" aria-hidden="true">
              {[2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2].map(
                (w, idx) => (
                  <span
                    key={idx}
                    style={{ width: `${w}px` }}
                    className="h-full bg-zinc-900 inline-block"
                  />
                )
              )}
            </div>
            <p className="text-[10px] text-zinc-500">
              국토교통부·코레일·도로교통법 공식 기준 조회 · 출발 전 운송사 원문 확인 권장
            </p>
          </div>
        </div>

        {/* Bottom Serrated Receipt Edge */}
        <SawtoothEdge position="bottom" />
      </div>
    </div>
  );
};
