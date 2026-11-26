import React, { useMemo, useState } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import type { CatalogProduct, StrictestConstraints } from '../types/domain';

interface CatalogSectionProps {
  products: CatalogProduct[];
  constraints: StrictestConstraints | null;
  evaluations: Record<string, { status: 'pass' | 'caution' | 'exceeds'; note: string }>;
  onSelectProduct: (product: CatalogProduct) => void;
  onQuickAddCart: (product: CatalogProduct) => void;
}

const CATEGORIES = ['전체', '캐리어·가방', '전자·배터리', '세면·위생', '의류·수면', '야외·필수'] as const;

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  products,
  constraints,
  evaluations,
  onSelectProduct,
  onQuickAddCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== '전체' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return `${p.name} ${p.shortTag} ${p.description}`.toLowerCase().includes(q);
    });
  }, [products, selectedCategory, searchTerm]);

  return (
    <section id="catalog-section" className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            규정 검증 트래블 스토어 전체 상품
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            선택된 이동 수단 기준({constraints?.headlineSummary || '표준 기준'}) 적합 여부를 실시간으로 표시합니다.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="상품명 또는 키워드 검색"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 border transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((product) => {
          const evalInfo = evaluations[product.id];
          const discountPct =
            product.originalPrice > product.basePrice
              ? Math.round(((product.originalPrice - product.basePrice) / product.originalPrice) * 100)
              : 0;

          return (
            <article
              key={product.id}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden flex flex-col hover:border-[var(--border-strong)] transition"
            >
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-elevated)] cursor-pointer text-left"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                />
              </button>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {product.category} · {product.weightKg}kg · {product.dimensionsCm}cm
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="mt-1 text-left text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition line-clamp-2 cursor-pointer"
                  >
                    {product.name}
                  </button>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2">
                    {product.shortTag}
                  </p>

                  {evalInfo && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px]">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                          evalInfo.status === 'exceeds'
                            ? 'bg-rose-500/10 text-[var(--status-danger)]'
                            : evalInfo.status === 'caution'
                            ? 'bg-amber-500/10 text-[var(--status-warn)]'
                            : 'bg-teal-600/10 text-[var(--status-pass)]'
                        }`}
                      >
                        {evalInfo.status === 'exceeds'
                          ? '규격초과'
                          : evalInfo.status === 'caution'
                          ? '규정주의'
                          : '규정적합'}
                      </span>
                      <span className="text-[var(--text-secondary)] line-clamp-2">{evalInfo.note}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div>
                    {discountPct > 0 && (
                      <div className="text-[11px] text-[var(--text-muted)] line-through font-mono-num">
                        {product.originalPrice.toLocaleString()}원
                      </div>
                    )}
                    <div className="text-base font-bold text-[var(--text-primary)] font-mono-num">
                      {product.basePrice.toLocaleString()}원
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onQuickAddCart(product)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)] cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    담기
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
