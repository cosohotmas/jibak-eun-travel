import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Square,
  ShoppingBag,
  MapPin,
  Copy,
  Check,
  Bookmark,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Search,
  MoreHorizontal,
  ReceiptText,
} from 'lucide-react';
import type {
  CarrierPresetKey,
  CartItem,
  CatalogProduct,
  LocalConversionNode,
  PackingMetrics,
  StrictestConstraints,
} from '../types/domain';
import {
  CARRIER_CAPACITY,
  computePackingMetrics,
  evaluateProductUnified,
} from '../lib/localRagEngine';

export type { CarrierPresetKey };

type BuyCategoryFilter =
  | '전체'
  | '캐리어'
  | '백팩/더플백'
  | '파우치/압축'
  | '충전/어댑터/eSIM'
  | '기내/위생/안전';

const BUY_CATEGORY_CHIPS: BuyCategoryFilter[] = [
  '전체',
  '캐리어',
  '백팩/더플백',
  '파우치/압축',
  '충전/어댑터/eSIM',
  '기내/위생/안전',
];

function matchesBuyCategory(product: CatalogProduct, filter: BuyCategoryFilter): boolean {
  if (filter === '전체') return true;
  if (filter === '캐리어') return product.name.includes('캐리어');
  if (filter === '백팩/더플백') return product.category === '캐리어·가방' && !product.name.includes('캐리어');
  if (filter === '파우치/압축') {
    return (
      product.category === '의류·수면' ||
      product.name.includes('파우치') ||
      product.name.includes('큐브') ||
      product.name.includes('오거나이저')
    );
  }
  if (filter === '충전/어댑터/eSIM') {
    return (
      product.category === '전자·배터리' ||
      /어댑터|충전|배터리|esim/i.test(`${product.name} ${product.description}`)
    );
  }
  if (filter === '기내/위생/안전') {
    return product.category === '세면·위생' || product.category === '야외·필수';
  }
  return true;
}

interface SummarySidePanelProps {
  carrierPreset: CarrierPresetKey;
  onChangeCarrierPreset: (preset: CarrierPresetKey) => void;
  packMetrics?: PackingMetrics;
  haveItems: string[];
  buyItems: string[];
  localItems: string[];
  uncheckedKeys: string[];
  onToggleCheckItem: (bucket: 'have' | 'buy', itemName: string) => void;
  cart: CartItem[];
  products: CatalogProduct[];
  localConversions: LocalConversionNode[];
  constraints: StrictestConstraints | null;
  tripSummaryText?: string;
  onAddCustomHaveItem: (text: string) => void;
  onRemoveItem: (bucket: 'have' | 'buy' | 'local', index: number) => void;
  onMoveItem: (from: 'have' | 'buy', to: 'local', index: number) => void;
  onMoveCatalogProductToLocal?: (product: CatalogProduct) => void;
  onQuickAddCart: (product: CatalogProduct, variantIdx?: number, colorIdx?: number) => void;
  onSelectProduct: (product: CatalogProduct) => void;
  onSaveChecklist: (loadPercent: number, carrierLabel: string) => Promise<void>;
  savingChecklist: boolean;
  saveFeedback: string | null;
  onOpenReceiptModal?: () => void;
}

export const SummarySidePanel: React.FC<SummarySidePanelProps> = ({
  carrierPreset,
  onChangeCarrierPreset,
  packMetrics: externalPackMetrics,
  haveItems,
  buyItems,
  localItems,
  uncheckedKeys,
  onToggleCheckItem,
  cart,
  products,
  localConversions,
  constraints,
  tripSummaryText,
  onAddCustomHaveItem,
  onRemoveItem,
  onMoveItem,
  onMoveCatalogProductToLocal,
  onQuickAddCart,
  onSelectProduct,
  onSaveChecklist,
  savingChecklist,
  saveFeedback,
  onOpenReceiptModal,
}) => {
  const [activeTab, setActiveTab] = useState<'have' | 'buy' | 'local'>('buy');
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [buyCategory, setBuyCategory] = useState<BuyCategoryFilter>('전체');
  const [buySearch, setBuySearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [carrierPickerOpen, setCarrierPickerOpen] = useState(false);

  const carrier = CARRIER_CAPACITY[carrierPreset];
  const activeCatalog = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const packMetrics = useMemo(
    () =>
      externalPackMetrics ||
      computePackingMetrics({
        carrierPreset,
        haveItems,
        buyItems,
        uncheckedKeys,
        cart,
        products: activeCatalog,
        constraints,
      }),
    [externalPackMetrics, carrierPreset, haveItems, buyItems, uncheckedKeys, cart, activeCatalog, constraints]
  );

  const matchProductForBuyItem = (itemLabel: string): CatalogProduct | undefined => {
    const clean = itemLabel.split(' (')[0].trim();
    return activeCatalog.find(
      (p) => p.name === itemLabel || p.name === clean || itemLabel.includes(p.name) || p.name.includes(clean)
    );
  };

  const matchLocalNode = (itemLabel: string): LocalConversionNode | undefined => {
    return localConversions.find(
      (l) => itemLabel.includes(l.title) || l.title.includes(itemLabel.split(' (')[0].trim())
    );
  };

  const isBuyProductRecommended = (prod: CatalogProduct): boolean =>
    buyItems.some((item) => {
      const clean = item.split(' (')[0].trim();
      return prod.name === item || prod.name === clean || item.includes(prod.name);
    }) || cart.some((c) => c.productId === prod.id);

  const isBuyProductChecked = (prod: CatalogProduct): boolean => {
    const inCart = cart.some((c) => c.productId === prod.id);
    if (inCart) return !uncheckedKeys.includes(`buy:${prod.name}`);
    const matchedLabel = buyItems.find((item) => {
      const clean = item.split(' (')[0].trim();
      return prod.name === item || prod.name === clean || item.includes(prod.name);
    });
    if (!matchedLabel) return false;
    return !uncheckedKeys.includes(`buy:${matchedLabel}`) && !uncheckedKeys.includes(`buy:${prod.name}`);
  };

  const activeHaveItems = haveItems.filter((item) => !uncheckedKeys.includes(`have:${item}`));
  const activeBuyItems = buyItems.filter((item) => !uncheckedKeys.includes(`buy:${item}`));

  const customBuyEntries = useMemo(
    () =>
      buyItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => !matchProductForBuyItem(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buyItems, activeCatalog]
  );

  const filteredCatalogProducts = useMemo(() => {
    const q = buySearch.trim().toLowerCase();
    const list = activeCatalog.filter((p) => {
      if (!showAllCatalog) {
        return isBuyProductRecommended(p);
      }
      if (!matchesBuyCategory(p, buyCategory)) return false;
      if (q) {
        const hay = `${p.name} ${p.category} ${p.shortTag} ${p.description} ${p.variants.map((v) => v.label).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const aChecked = isBuyProductChecked(a) ? 2 : isBuyProductRecommended(a) ? 1 : 0;
      const bChecked = isBuyProductChecked(b) ? 2 : isBuyProductRecommended(b) ? 1 : 0;
      return bChecked - aChecked;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCatalog, showAllCatalog, buyCategory, buySearch, buyItems, cart, uncheckedKeys]);

  const blocks = [
    { label: '집 보유 (챙길짐)', units: packMetrics.haveUnits, color: 'bg-sky-600' },
    { label: '살물건 · 장바구니', units: packMetrics.buyPendingUnits + packMetrics.cartUnits, color: 'bg-teal-600' },
  ];

  const handleCopy = async () => {
    const text = [
      `[집밖은여행 3분할 스마트 체크리스트]${tripSummaryText ? ` (${tripSummaryText})` : ''}`,
      `규격: ${carrier.label} (적재율 ${packMetrics.loadPercent}% · 예상 ${packMetrics.estimatedPackWeight}kg)`,
      `\n1. 집에서 챙길 물건 (${activeHaveItems.length}/${haveItems.length})`,
      ...haveItems.map((i) => `- [${uncheckedKeys.includes(`have:${i}`) ? ' ' : 'x'}] ${i}`),
      `\n2. 여기서 살 물건 (${activeBuyItems.length})`,
      ...buyItems.map((i) => `- [${uncheckedKeys.includes(`buy:${i}`) ? ' ' : 'x'}] ${i}`),
      `\n3. 현지 조달 전환 (${localItems.length})`,
      ...localItems.map((i) => `- ${i}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onAddCustomHaveItem(customText.trim());
    setCustomText('');
    setActiveTab('have');
  };

  const panelContent = (
    <div className="space-y-4">
      {/* Tetris Capacity Gauge */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                테트리스 용량 게이지
              </h3>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                  packMetrics.carrierEval.status === 'exceeds'
                    ? 'bg-rose-500/10 text-[var(--status-danger)]'
                    : packMetrics.carrierEval.status === 'caution'
                    ? 'bg-amber-500/10 text-[var(--status-warn)]'
                    : 'bg-teal-600/10 text-[var(--status-pass)]'
                }`}
              >
                {packMetrics.carrierEval.badgeLabel}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {tripSummaryText ? `${tripSummaryText} · ` : ''}체크·장바구니 실시간 적재율
            </p>
          </div>
          <span
            className={`font-mono-num text-lg font-bold shrink-0 ${
              packMetrics.capacityWarn ? 'text-[var(--status-danger)]' : 'text-[var(--brand-primary)]'
            }`}
          >
            {packMetrics.loadPercent}%
          </span>
        </div>

        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px]">
            <span className="text-[var(--text-secondary)] truncate">
              선택 가방: <strong className="text-[var(--text-primary)]">{carrier.label}</strong>
            </span>
            <button
              type="button"
              onClick={() => setCarrierPickerOpen((v) => !v)}
              className="font-semibold text-[var(--brand-primary)] hover:underline shrink-0 cursor-pointer"
            >
              {carrierPickerOpen ? '닫기' : '가방 변경'}
            </button>
          </div>
          {carrierPickerOpen && (
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CARRIER_CAPACITY) as CarrierPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChangeCarrierPreset(key);
                    setCarrierPickerOpen(false);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium border transition cursor-pointer ${
                    carrierPreset === key
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {CARRIER_CAPACITY[key].shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stacked Tetris Bar */}
        <div className="h-5 w-full rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden flex p-0.5 gap-0.5">
          {blocks.map((b) => {
            const widthPct = Math.min(100, Math.round((b.units / carrier.maxUnits) * 100));
            if (widthPct <= 0) return null;
            return (
              <div
                key={b.label}
                style={{ width: `${widthPct}%` }}
                className={`${b.color} h-full rounded transition-all duration-300`}
                title={`${b.label}: ${widthPct}%`}
              />
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">
            예상 총중량{' '}
            <strong className="font-mono-num text-[var(--text-primary)]">
              {packMetrics.estimatedPackWeight}kg
            </strong>
          </span>
          <span className="font-mono-num text-[var(--text-muted)]">
            최소규정 한도 {packMetrics.maxAllowedWeight}kg
          </span>
        </div>

        {packMetrics.capacityWarn && (
          <div className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-xs text-[var(--status-warn)] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {packMetrics.carrierExceedsMode
                ? packMetrics.carrierEval.note
                : packMetrics.weightOver
                ? `예상 중량(${packMetrics.estimatedPackWeight}kg)이 선택 이동수단 기준(${packMetrics.maxAllowedWeight}kg)을 넘습니다. 항목을 체크 해제하거나 '현지전환'해 무게를 줄여 보세요.`
                : '적재율 85% 이상입니다. 100ml 초과 액체류나 여벌 의류를 현지 조달로 전환하면 이동이 편해집니다.'}
            </span>
          </div>
        )}
      </div>

      {/* 3-Split Checklist Receipt */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
            3분할 체크리스트 영수증
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {onOpenReceiptModal && (
              <button
                type="button"
                onClick={onOpenReceiptModal}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--brand-primary)]/40 bg-[var(--brand-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition cursor-pointer"
                title="실제 영수증 형태로 한눈에 보기"
              >
                <ReceiptText className="w-3 h-3" />
                <span>영수증</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-teal-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '복사됨' : '복사'}</span>
            </button>
            <button
              type="button"
              disabled={savingChecklist}
              onClick={() => onSaveChecklist(packMetrics.loadPercent, carrier.label)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 cursor-pointer"
            >
              <Bookmark className="w-3 h-3" />
              <span>{savingChecklist ? '저장중' : '저장'}</span>
            </button>
          </div>
        </div>

        {saveFeedback && (
          <p className="mb-2.5 text-xs text-[var(--brand-accent)] font-medium">
            {saveFeedback}
          </p>
        )}

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('have')}
            className={`rounded-lg py-2 px-1 text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'have'
                ? 'bg-[var(--brand-tint)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span>챙길짐 ({activeHaveItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`rounded-lg py-2 px-1 text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'buy'
                ? 'bg-[var(--brand-tint)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>살물건 ({activeBuyItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`rounded-lg py-2 px-1 text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'local'
                ? 'bg-[var(--brand-tint)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>현지조달 ({localItems.length})</span>
          </button>
        </div>

        {/* 1. 챙길짐 Tab */}
        {activeTab === 'have' && (
          <>
            <form onSubmit={handleAddCustom} className="flex gap-1.5 mb-3">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="직접 준비물 추가 (예: 카메라 삼각대, 선글라스)"
                className="flex-1 min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>
            </form>

            <div className="max-h-96 overflow-y-auto thin-scroll space-y-2">
              {haveItems.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-5 text-center">
                  아직 챙길 물건이 없습니다. 직접 추가하거나 8종 점호를 진행해 보세요.
                </p>
              ) : (
                haveItems.map((item, idx) => {
                  const isChecked = !uncheckedKeys.includes(`have:${item}`);
                  return (
                    <div
                      key={`have-${item}-${idx}`}
                      className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs transition ${
                        isChecked ? '' : 'opacity-55'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleCheckItem('have', item)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        )}
                        <span
                          className={`text-[var(--text-primary)] truncate ${
                            isChecked ? '' : 'line-through'
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onMoveItem('have', 'local', idx)}
                          className="text-[11px] font-medium text-[var(--brand-accent)] hover:underline cursor-pointer"
                        >
                          현지전환
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem('have', idx)}
                          aria-label="삭제"
                          className="text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* 2. 살물건 Tab (Progressive Disclosure: Recommended First + Expandable Full Catalog) */}
        {activeTab === 'buy' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] px-0.5">
              <span>
                {showAllCatalog
                  ? `전체 ${activeCatalog.length}종 중 체크된 ${activeBuyItems.length}개 무게·적재율 반영`
                  : `AI 코스 추천 상품 · 체크된 ${activeBuyItems.length}개 실시간 합산`}
              </span>
            </div>

            {/* Product List */}
            <div className="max-h-[410px] overflow-y-auto thin-scroll space-y-2">
              {(!showAllCatalog || (buyCategory === '전체' && !buySearch.trim())) &&
                customBuyEntries.map(({ item, idx }) => {
                  const isChecked = !uncheckedKeys.includes(`buy:${item}`);
                  const menuKey = `custom-${idx}`;
                  const menuOpen = openMenuId === menuKey;
                  return (
                    <div
                      key={`buy-custom-${item}-${idx}`}
                      className={`relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs transition ${
                        isChecked ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleCheckItem('buy', item)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          )}
                          <span className={`font-semibold truncate ${isChecked ? '' : 'line-through'}`}>
                            {item}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(menuOpen ? null : menuKey)}
                          aria-label="더보기 메뉴"
                          className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {menuOpen && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onMoveItem('buy', 'local', idx);
                            }}
                            className="font-medium text-[var(--brand-accent)] hover:underline cursor-pointer"
                          >
                            현지전환
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onRemoveItem('buy', idx);
                            }}
                            className="font-medium text-rose-600 hover:underline cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {filteredCatalogProducts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                  {showAllCatalog
                    ? '조건에 맞는 상품이 없습니다. 검색어나 카테고리를 변경해 보세요.'
                    : '추천 상품이 아직 없습니다. 아래 전체 상품 보기를 눌러 직접 선택해 보세요.'}
                </p>
              ) : (
                filteredCatalogProducts.map((prod) => {
                  const isChecked = isBuyProductChecked(prod);
                  const cartMatch = cart.find((c) => c.productId === prod.id);
                  const evalInfo = evaluateProductUnified(prod, { constraints, carrierPreset });
                  const defaultVariant = prod.variants[0];
                  const displayPrice = prod.basePrice + (defaultVariant?.priceDelta || 0);
                  const matchedIdx = buyItems.findIndex((item) => {
                    const clean = item.split(' (')[0].trim();
                    return prod.name === item || prod.name === clean || item.includes(prod.name);
                  });
                  const menuOpen = openMenuId === prod.id;

                  return (
                    <div
                      key={`buy-prod-${prod.id}`}
                      className={`rounded-xl border p-2.5 text-xs transition ${
                        isChecked
                          ? 'border-[var(--brand-primary)]/45 bg-[var(--bg-canvas)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] opacity-85'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Action 1: Packing Gauge Checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleCheckItem('buy', prod.name)}
                          className="mt-0.5 shrink-0 cursor-pointer"
                          aria-label={`${prod.name} 용량 게이지 반영`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[var(--brand-primary)]" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          onClick={() => onSelectProduct(prod)}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectProduct(prod)}
                              className="text-left font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] line-clamp-1 cursor-pointer"
                            >
                              {prod.name}
                            </button>
                            <span className="font-mono-num font-bold text-[var(--text-primary)] shrink-0">
                              {displayPrice.toLocaleString()}원
                            </span>
                          </div>

                          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="font-mono-num">{prod.weightKg}kg</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">{prod.dimensionsCm}cm</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                evalInfo.status === 'exceeds'
                                  ? 'bg-rose-500/10 text-[var(--status-danger)]'
                                  : evalInfo.status === 'caution'
                                  ? 'bg-amber-500/10 text-[var(--status-warn)]'
                                  : 'bg-teal-600/10 text-[var(--status-pass)]'
                              }`}
                            >
                              {evalInfo.badgeLabel}
                            </span>
                          </div>

                          {/* Action 2: Primary [담기] + Compact Overflow '···' Menu */}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onQuickAddCart(prod, 0, 0)}
                              className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--brand-primary-hover)] cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              {cartMatch ? `담김 (${cartMatch.qty})` : '담기'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setOpenMenuId(menuOpen ? null : prod.id)}
                              aria-label={`${prod.name} 더보기 메뉴`}
                              className="inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-1 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {menuOpen && (
                            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onSelectProduct(prod);
                                }}
                                className="inline-flex items-center gap-0.5 font-medium text-[var(--text-primary)] hover:text-[var(--brand-primary)] cursor-pointer"
                              >
                                옵션보기
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (matchedIdx >= 0) {
                                    onMoveItem('buy', 'local', matchedIdx);
                                  } else {
                                    onMoveCatalogProductToLocal?.(prod);
                                  }
                                }}
                                className="font-medium text-[var(--brand-accent)] hover:underline cursor-pointer"
                              >
                                현지전환
                              </button>
                              {matchedIdx >= 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onRemoveItem('buy', matchedIdx);
                                  }}
                                  className="font-medium text-rose-600 hover:underline cursor-pointer"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Progressive Disclosure: Collapsible Full Catalog Section */}
            <div className="pt-1 border-t border-[var(--border-subtle)] space-y-2.5">
              <button
                type="button"
                onClick={() => setShowAllCatalog((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition cursor-pointer"
              >
                <span>
                  {showAllCatalog
                    ? '추천 상품만 깔끔하게 보기'
                    : `전체 상품 보기 (${activeCatalog.length}종)`}
                </span>
                {showAllCatalog ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </button>

              {showAllCatalog && (
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center gap-1 overflow-x-auto thin-scroll pb-1">
                    {BUY_CATEGORY_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBuyCategory(chip)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium border shrink-0 transition cursor-pointer ${
                          buyCategory === chip
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)] font-semibold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={buySearch}
                      onChange={(e) => setBuySearch(e.target.value)}
                      placeholder="상품명·규격 검색 (예: 20인치, 보조배터리, 선크림)"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-8 pr-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. 현지조달 Tab */}
        {activeTab === 'local' && (
          <div className="max-h-96 overflow-y-auto thin-scroll space-y-2">
            {localItems.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-5 text-center">
                현지 조달 전환 항목이 없습니다. 무거운 액체류나 짐을 '현지전환'해 보세요.
              </p>
            ) : (
              localItems.map((item, idx) => {
                const node = matchLocalNode(item);
                return (
                  <div
                    key={`local-${item}-${idx}`}
                    className="rounded-xl border border-teal-600/25 bg-teal-600/5 p-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] leading-snug">
                          {node ? node.title : item}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                          <span>{node ? node.channelType : '현지 조달·렌탈'}</span>
                          <span>·</span>
                          <span>{node ? node.estimatedLocalCost : '현지 시세 구매'}</span>
                          {node && (
                            <span className="font-mono-num font-bold text-[var(--brand-accent)]">
                              -{node.weightSavedKg}kg 절감
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem('local', idx)}
                        aria-label="삭제"
                        className="text-[var(--text-muted)] hover:text-rose-600 cursor-pointer shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-28">{panelContent}</aside>

      {/* Mobile Compact Bottom Trigger + Expandable Sheet */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg">
        <div className="w-full px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer py-1"
          >
            <span className="font-bold text-[var(--text-primary)] shrink-0">
              {packMetrics.loadPercent}% ({packMetrics.estimatedPackWeight}kg)
            </span>
            <span className="text-[var(--text-muted)] truncate">
              · 챙길 {activeHaveItems.length} · 살것 {activeBuyItems.length} · 현지 {localItems.length}
            </span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenReceiptModal && (
              <button
                type="button"
                onClick={onOpenReceiptModal}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--brand-primary)]/40 bg-[var(--brand-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary)] cursor-pointer"
              >
                <ReceiptText className="w-3 h-3" />
                <span>영수증</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 font-semibold text-[var(--brand-primary)] py-1 cursor-pointer"
            >
              <span>{mobileOpen ? '닫기' : '열기'}</span>
              {mobileOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="max-h-[75vh] overflow-y-auto p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            {panelContent}
          </div>
        )}
      </div>
    </>
  );
};
