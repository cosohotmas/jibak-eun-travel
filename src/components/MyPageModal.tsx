import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  X,
  Package,
  MessageSquare,
  ListChecks,
  Trash2,
  Truck,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import {
  advanceOrderStatusInFirestore,
  deleteChecklistInFirestore,
  subscribeUserChecklists,
  subscribeUserInquiries,
  subscribeUserOrders,
} from '../lib/firebase';
import { FALLBACK_CATALOG_PRODUCTS } from '../lib/localRagEngine';
import type {
  CatalogProduct,
  SavedChecklistRecord,
  StoreInquiryRecord,
  StoreOrderRecord,
} from '../types/domain';

interface MyPageModalProps {
  open: boolean;
  user: User | null;
  products?: CatalogProduct[];
  onClose: () => void;
  onOpenAuth: () => void;
  onRestoreChecklist: (record: SavedChecklistRecord) => void;
}

const ORDER_STEPS: Array<'결제완료' | '상품준비중' | '배송중' | '배송완료'> = [
  '결제완료',
  '상품준비중',
  '배송중',
  '배송완료',
];

function buildFallbackItemsFromSummary(
  order: StoreOrderRecord,
  catalog: CatalogProduct[]
): StoreOrderRecord['items'] {
  const parts = order.itemSummary
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];

  return parts.map((part, idx) => {
    const qtyMatch = part.match(/[×x*]\s*(\d+)\s*$/);
    const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;
    const withoutQty = part.replace(/[×x*]\s*\d+\s*$/, '').trim();
    const optionMatch = withoutQty.match(/\(([^)]+)\)\s*$/);
    const optionRaw = optionMatch ? optionMatch[1] : '';
    const [optionSize = '기본 규격', optionColor = '기본 컬러'] = optionRaw
      .split('/')
      .map((t) => t.trim());
    const cleanName = withoutQty.replace(/\([^)]+\)\s*$/, '').trim() || part;

    const matched = catalog.find(
      (p) =>
        p.name === cleanName ||
        cleanName.includes(p.name) ||
        p.name.includes(cleanName)
    );

    const estUnitPrice =
      matched?.basePrice ??
      (parts.length === 1 ? Math.round(order.totalAmount / qty) : 0);

    return {
      productId: matched?.id || `legacy-${idx}`,
      name: cleanName,
      imageUrl: matched?.imageUrl,
      optionSize: optionSize || '기본 규격',
      optionColor: optionColor || '기본 컬러',
      price: estUnitPrice,
      qty,
      volume: matched?.volumeUnits || 2,
    };
  });
}

export const MyPageModal: React.FC<MyPageModalProps> = ({
  open,
  user,
  products,
  onClose,
  onOpenAuth,
  onRestoreChecklist,
}) => {
  const [tab, setTab] = useState<'orders' | 'inquiries' | 'checklists'>('orders');
  const [orders, setOrders] = useState<StoreOrderRecord[]>([]);
  const [inquiries, setInquiries] = useState<StoreInquiryRecord[]>([]);
  const [checklists, setChecklists] = useState<SavedChecklistRecord[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const catalogPool = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    FALLBACK_CATALOG_PRODUCTS.forEach((p) => map.set(p.id, p));
    (products || []).forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [products]);

  useEffect(() => {
    if (!open || !user) return;
    setErrorText(null);
    const unsubOrders = subscribeUserOrders(
      user.uid,
      (list) => setOrders(list),
      (err) => setErrorText(err.message)
    );
    const unsubInquiries = subscribeUserInquiries(
      user.uid,
      (list) => setInquiries(list),
      (err) => setErrorText(err.message)
    );
    const unsubChecklists = subscribeUserChecklists(
      user.uid,
      (list) => setChecklists(list),
      (err) => setErrorText(err.message)
    );
    return () => {
      unsubOrders();
      unsubInquiries();
      unsubChecklists();
    };
  }, [open, user]);

  if (!open) return null;

  const handleAdvanceStep = async (order: StoreOrderRecord) => {
    const idx = ORDER_STEPS.indexOf(order.shippingStatus);
    if (idx === -1 || idx >= ORDER_STEPS.length - 1) return;
    try {
      await advanceOrderStatusInFirestore(order.id, ORDER_STEPS[idx + 1]);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">마이페이지</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {user ? `${user.displayName || ''} (${user.email})` : '로그인이 필요합니다'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="p-10 text-center space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              주문·배송 현황, 1:1 문의 내역, 저장된 맞춤 체크리스트를 확인하려면 로그인해 주세요.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              Google 계정 로그인
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-3 border-b border-[var(--border-subtle)] flex gap-2 bg-[var(--bg-elevated)]">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer ${
                  tab === 'orders'
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Package className="w-4 h-4" />
                주문·배송 ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('inquiries')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer ${
                  tab === 'inquiries'
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                1:1 문의 ({inquiries.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('checklists')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer ${
                  tab === 'checklists'
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                저장 체크리스트 ({checklists.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll p-5 space-y-4">
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3.5 py-2 text-[11px] text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">[포트폴리오 시연 안내]</strong>{' '}
                표시되는 주문·결제·송장번호 및 배송 단계는 테스트/시연용 데이터이며, 실제 금전 결제나 실물 배송은 진행되지 않습니다.
              </div>

              {errorText && (
                <div className="rounded-xl bg-rose-600/10 p-3 text-xs text-[var(--status-danger)] break-words">
                  {errorText}
                </div>
              )}

              {tab === 'orders' && (
                <>
                  {orders.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                      주문 내역이 없습니다.
                    </p>
                  ) : (
                    orders.map((order) => {
                      const currentStepIdx = ORDER_STEPS.indexOf(order.shippingStatus);
                      const displayItems =
                        order.items && order.items.length > 0
                          ? order.items
                          : buildFallbackItemsFromSummary(order, catalogPool);
                      const formattedAddress =
                        order.shippingAddress ||
                        [
                          order.shippingZipCode ? `[${order.shippingZipCode}]` : '',
                          order.shippingBaseAddress || '',
                          order.shippingDetailAddress || '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                      return (
                        <div
                          key={order.id}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-3.5"
                        >
                          {/* Order Metadata Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono-num text-xs font-bold text-[var(--text-primary)]">
                                  주문 #{order.id.slice(0, 8)}
                                </span>
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  · 출발 예정일 {order.departureDate}
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono-num">
                                주문일시 {order.createdAtText} · {order.paymentMethod}
                              </div>
                            </div>
                            <span className="rounded-lg bg-[var(--brand-tint)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                              {order.shippingStatus}
                            </span>
                          </div>

                          {/* Itemized Visual Product Cards */}
                          <div className="space-y-2">
                            {displayItems.map((item, idx) => {
                              const matchedProd = catalogPool.find(
                                (p) =>
                                  p.id === item.productId ||
                                  p.name === item.name ||
                                  item.name.includes(p.name)
                              );
                              const thumbUrl = item.imageUrl || matchedProd?.imageUrl || '';
                              const unitPrice = Number(item.price || matchedProd?.basePrice || 0);
                              const qty = Math.max(1, Number(item.qty || 1));
                              const lineSubtotal = unitPrice * qty;

                              return (
                                <div
                                  key={`${order.id}-item-${item.productId}-${idx}`}
                                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 flex items-center gap-3"
                                >
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={item.name}
                                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-lg shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                                      옵션: {item.optionSize || '기본'} · {item.optionColor || '기본'}
                                    </div>
                                    <div className="text-[11px] font-mono-num text-[var(--text-muted)]">
                                      {unitPrice.toLocaleString()}원 × {qty}개
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-[10px] text-[var(--text-muted)]">소계</div>
                                    <div className="font-mono-num text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                                      {lineSubtotal.toLocaleString()}원
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Shipping Address + Order Total Payment */}
                          <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                              <span className="truncate">
                                {formattedAddress || '배송지 정보 없음'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[var(--text-muted)]">총 결제금액</span>
                              <span className="font-mono-num text-sm sm:text-base font-bold text-[var(--brand-primary)]">
                                {order.totalAmount.toLocaleString()}원
                              </span>
                            </div>
                          </div>

                          {/* 4-Step Delivery Progress */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {ORDER_STEPS.map((stepName, sIdx) => (
                              <div
                                key={stepName}
                                className={`rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold ${
                                  sIdx <= currentStepIdx
                                    ? 'bg-[var(--brand-primary)] text-white'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                                }`}
                              >
                                {stepName}
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="inline-flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              {order.courier} · 송장번호{' '}
                              <strong className="font-mono-num text-[var(--text-primary)]">
                                {order.trackingNumber}
                              </strong>
                            </span>

                            {order.shippingStatus !== '배송완료' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStep(order)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                              >
                                다음 배송 단계 확인
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {tab === 'inquiries' && (
                <>
                  {inquiries.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                      등록된 1:1 문의가 없습니다.
                    </p>
                  ) : (
                    inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--brand-primary)]">
                            {inq.category} · {inq.status}
                          </span>
                          <span className="font-mono-num text-[var(--text-muted)]">
                            {inq.createdAtText}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">{inq.subject}</div>
                        <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line">
                          {inq.message}
                        </p>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === 'checklists' && (
                <>
                  {checklists.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                      저장된 맞춤 체크리스트가 없습니다.
                    </p>
                  ) : (
                    checklists.map((chk) => (
                      <div
                        key={chk.id}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{chk.title}</div>
                          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {chk.destination} · {chk.duration} · {chk.carrierType} (적재율 {chk.loadPercent}%)
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-1">
                            챙길짐 {chk.haveItems.length} · 살물건 {chk.buyItems.length} · 현지 {chk.localItems.length}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreChecklist(chk);
                              onClose();
                            }}
                            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            불러오기
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChecklistInFirestore(chk.id)}
                            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
