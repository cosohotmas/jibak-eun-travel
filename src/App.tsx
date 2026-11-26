import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  saveChecklistInFirestore,
  signOutUser,
} from './lib/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeaderBar } from './components/HeaderBar';
import { TransportContextBar } from './components/TransportContextBar';
import { DynamicHeroSection } from './components/DynamicHeroSection';
import { ChatbotWorkspace } from './components/ChatbotWorkspace';
import { SummarySidePanel, type CarrierPresetKey } from './components/SummarySidePanel';
import { CatalogSection } from './components/CatalogSection';
import { InquirySection } from './components/InquirySection';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { MyPageModal } from './components/MyPageModal';
import { AdminConsole } from './components/AdminConsole';
import { ChecklistReceiptModal } from './components/ChecklistReceiptModal';
import {
  FALLBACK_CATALOG_PRODUCTS,
  LOCAL_CONVERSION_NODES,
  LOCAL_DIAGNOSTIC_PRESETS,
  LOCAL_HERO_SLIDES,
  LOCAL_ROLL_CALL_ITEMS,
  buildCourseChecklistPlan,
  buildLocalCitations,
  computePackingMetrics,
  computeStrictestTransitRule,
  evaluateProductUnified,
} from './lib/localRagEngine';
import type {
  CartItem,
  CatalogProduct,
  DiagnosticPreset,
  FactCitation,
  HeroHashtag,
  HeroSlide,
  LocalConversionNode,
  PromoBanner,
  RollCallItem,
  SavedChecklistRecord,
  StrictestConstraints,
  TransportModeId,
} from './types/domain';

function StorefrontApp() {
  const [route, setRoute] = useState<'store' | 'admin'>(() =>
    window.location.hash === '#admin-console' ? 'admin' : 'store'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<User | null>(null);

  // Store bootstrap & constraints state
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [pendingHeroAction, setPendingHeroAction] = useState<{
    id: number;
    kind: 'diagnostic' | 'prompt';
    prompt?: string;
    modes?: TransportModeId[];
  } | null>(null);
  const [presets, setPresets] = useState<DiagnosticPreset | null>(null);
  const [rollCallItems, setRollCallItems] = useState<RollCallItem[]>([]);
  const [localConversions, setLocalConversions] = useState<LocalConversionNode[]>([]);
  const [selectedModes, setSelectedModes] = useState<TransportModeId[]>(['train', 'walk']);
  const [constraints, setConstraints] = useState<StrictestConstraints | null>(null);
  const [citations, setCitations] = useState<FactCitation[]>([]);
  const [evaluations, setEvaluations] = useState<
    Record<string, { status: 'pass' | 'caution' | 'exceeds'; note: string }>
  >({});

  // Trip context + 3-Split Checklist Receipt + Cart
  const initialPlan = useMemo(
    () =>
      buildCourseChecklistPlan({
        destination: '부산',
        duration: '1박 2일',
        theme: '카페 & 맛집',
        companion: '친구·연인',
        modes: ['train', 'walk'],
        products: FALLBACK_CATALOG_PRODUCTS,
        localConversions: LOCAL_CONVERSION_NODES,
        extraProductIds: ['sling-messenger', 'hygiene-pouch'],
      }),
    []
  );

  const [tripContext, setTripContext] = useState({
    destination: '부산',
    duration: '1박 2일',
    theme: '카페 & 맛집',
    companion: '친구·연인',
    loadPercent: 0,
  });
  const [carrierPreset, setCarrierPreset] = useState<CarrierPresetKey>(initialPlan.suggestedCarrier);
  const [haveItems, setHaveItems] = useState<string[]>(initialPlan.haveItems);
  const [buyItems, setBuyItems] = useState<string[]>(initialPlan.buyItems);
  const [localItems, setLocalItems] = useState<string[]>(initialPlan.localItems);
  const [uncheckedKeys, setUncheckedKeys] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Modals / Drawers
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash === '#admin-console' ? 'admin' : 'store');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const applyLocalBootstrapFallback = useCallback(() => {
    const localConstraints = computeStrictestTransitRule(['train', 'walk']);
    const localCits = buildLocalCitations(localConstraints);
    setProducts(FALLBACK_CATALOG_PRODUCTS);
    setHeroSlides(LOCAL_HERO_SLIDES);
    setPresets(LOCAL_DIAGNOSTIC_PRESETS);
    setRollCallItems(LOCAL_ROLL_CALL_ITEMS);
    setLocalConversions(LOCAL_CONVERSION_NODES);
    setConstraints(localConstraints);
    setCitations(localCits);
  }, []);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/store/bootstrap', {
        headers: { Accept: 'application/json' },
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        applyLocalBootstrapFallback();
        return;
      }
      const data = await res.json();
      setProducts(data.products || FALLBACK_CATALOG_PRODUCTS);
      setBanners(data.banners || []);
      setHeroSlides(data.heroSlides || LOCAL_HERO_SLIDES);
      setPresets(data.presets || LOCAL_DIAGNOSTIC_PRESETS);
      setRollCallItems(data.rollCallItems || LOCAL_ROLL_CALL_ITEMS);
      setLocalConversions(data.localConversions || LOCAL_CONVERSION_NODES);
      setConstraints(data.constraints || computeStrictestTransitRule(['train', 'walk']));
      setCitations(data.citations || []);
    } catch {
      applyLocalBootstrapFallback();
    }
  }, [applyLocalBootstrapFallback]);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    let cancelled = false;
    const applyLocalConstraints = () => {
      if (cancelled) return;
      const localConstraints = computeStrictestTransitRule(selectedModes);
      const localCits = buildLocalCitations(localConstraints);
      setConstraints(localConstraints);
      setCitations(localCits);
    };

    fetch('/api/graph/constraints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ modes: selectedModes }),
    })
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) {
          applyLocalConstraints();
          return;
        }
        const data = await r.json();
        if (cancelled) return;
        if (data.constraints) setConstraints(data.constraints);
        if (data.citations) setCitations(data.citations);
      })
      .catch(() => {
        applyLocalConstraints();
      });

    return () => {
      cancelled = true;
    };
  }, [selectedModes]);

  // Single Source of Truth: synchronize product evaluations whenever constraints, carrierPreset, or catalog change
  useEffect(() => {
    const activeProducts = products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS;
    const activeConstraints = constraints || computeStrictestTransitRule(selectedModes);
    const nextEvals: Record<string, { status: 'pass' | 'caution' | 'exceeds'; note: string }> = {};
    activeProducts.forEach((p) => {
      const res = evaluateProductUnified(p, {
        constraints: activeConstraints,
        carrierPreset,
      });
      nextEvals[p.id] = { status: res.status, note: res.note };
    });
    setEvaluations(nextEvals);
  }, [products, constraints, selectedModes, carrierPreset]);

  const packMetrics = useMemo(
    () =>
      computePackingMetrics({
        carrierPreset,
        haveItems,
        buyItems,
        uncheckedKeys,
        cart,
        products: products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS,
        constraints,
      }),
    [carrierPreset, haveItems, buyItems, uncheckedKeys, cart, products, constraints]
  );

  const trackEvent = useCallback(
    (payload: {
      type: string;
      productId?: string;
      localId?: string;
      slideId?: string;
      nodeIds?: string[];
      amount?: number;
      detail?: string;
    }) => {
      fetch('/api/events/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    },
    []
  );

  const handleStartDiagnosticFromHero = (slide: HeroSlide) => {
    if (slide.transportModes.length > 0) {
      setSelectedModes(slide.transportModes);
    }
    trackEvent({
      type: 'hero_banner_click',
      slideId: slide.id,
      nodeIds: slide.nodeIds,
      detail: `${slide.themeTag} → 맞춤여행 진단 시작`,
    });
    setPendingHeroAction({
      id: Date.now(),
      kind: 'diagnostic',
      modes: slide.transportModes,
    });
    document.getElementById('ai-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTriggerChatPromptFromHero = (
    slide: HeroSlide,
    prompt: string,
    sourceType: 'banner' | 'hashtag',
    modes?: TransportModeId[],
    hashtag?: HeroHashtag
  ) => {
    const nextModes = modes && modes.length > 0 ? modes : slide.transportModes;
    if (nextModes.length > 0) {
      setSelectedModes(nextModes);
    }
    const nodeIds =
      sourceType === 'hashtag' && hashtag?.nodeId
        ? Array.from(new Set([hashtag.nodeId, ...slide.nodeIds]))
        : slide.nodeIds;

    trackEvent({
      type: sourceType === 'hashtag' ? 'hero_hashtag_click' : 'hero_banner_click',
      slideId: slide.id,
      nodeIds,
      detail: sourceType === 'hashtag' ? `${hashtag?.label || ''} → ${prompt.slice(0, 40)}` : `${slide.themeTag} → AI 상담`,
    });

    setPendingHeroAction({
      id: Date.now(),
      kind: 'prompt',
      prompt,
      modes: nextModes,
    });
    document.getElementById('ai-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleMode = (mode: TransportModeId) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        return prev.length > 1 ? prev.filter((m) => m !== mode) : prev;
      }
      return [...prev, mode];
    });
  };

  const handleAddToCart = (
    product: CatalogProduct,
    variantIdx = 0,
    colorIdx = 0,
    qty = 1
  ) => {
    const variant = product.variants[variantIdx] || product.variants[0];
    const color = product.colors[colorIdx] || product.colors[0] || '기본';
    const unitPrice = product.basePrice + (variant?.priceDelta || 0);
    const cartKey = `${product.id}__${variant.id}__${color}`;

    setCart((prev) => {
      const existing = prev.find((it) => it.cartKey === cartKey);
      if (existing) {
        return prev.map((it) =>
          it.cartKey === cartKey ? { ...it, qty: it.qty + qty } : it
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          optionSize: variant.label.split(' (')[0],
          optionColor: color,
          unitPrice,
          qty,
          weightKg: variant.weightKg,
          sumCm: variant.sumCm,
          volumeUnits: variant.volumeUnits,
          liquidMl: product.liquidMl,
          batteryWh: product.batteryWh,
          localConversionId: product.localConversionId,
        },
      ];
    });

    setBuyItems((prev) =>
      prev.includes(product.name) ? prev : [...prev, product.name]
    );
    setUncheckedKeys((prev) => prev.filter((k) => k !== `buy:${product.name}`));
    trackEvent({
      type: 'cart_add',
      productId: product.id,
      detail: `${product.name} (${variant.label}/${color})`,
    });
    showToast(`장바구니에 담았습니다: ${product.name}`);
  };

  const handleBuyNow = (
    product: CatalogProduct,
    variantIdx: number,
    colorIdx: number,
    qty: number
  ) => {
    handleAddToCart(product, variantIdx, colorIdx, qty);
    setCheckoutOpen(true);
  };

  const handleSelectProduct = (product: CatalogProduct) => {
    setDetailProduct(product);
    trackEvent({ type: 'product_view', productId: product.id });
  };

  const handleApplyLocalConversion = (
    node: LocalConversionNode,
    product?: CatalogProduct
  ) => {
    const label = `${node.title} (${node.estimatedLocalCost})`;
    setLocalItems((prev) => (prev.includes(label) ? prev : [...prev, label]));
    if (product) {
      setBuyItems((prev) => prev.filter((item) => item !== product.name));
    }
    trackEvent({
      type: 'local_convert',
      productId: product?.id,
      localId: node.id,
      detail: node.title,
    });
    showToast(`현지 조달 목록으로 전환했습니다 (-${node.weightSavedKg}kg 절감)`);
  };

  const handleRollCallResult = (
    item: RollCallItem,
    choice: 'have' | 'buy' | 'local'
  ) => {
    if (choice === 'have') {
      setHaveItems((prev) => (prev.includes(item.name) ? prev : [...prev, item.name]));
    } else if (choice === 'buy') {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        handleAddToCart(prod, 0, 0, 1);
      } else {
        setBuyItems((prev) => (prev.includes(item.name) ? prev : [...prev, item.name]));
      }
    } else {
      const loc = localConversions.find((l) => l.id === item.localConversionId);
      const text = loc ? `${item.name} → ${loc.channelType}` : `${item.name} (현지 조달)`;
      setLocalItems((prev) => (prev.includes(text) ? prev : [...prev, text]));
      trackEvent({
        type: 'local_convert',
        localId: item.localConversionId,
        detail: text,
      });
    }
  };

  const handleSaveChecklist = async (loadPercent: number, carrierLabel: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSavingChecklist(true);
    setSaveFeedback(null);
    try {
      await saveChecklistInFirestore({
        title: `${tripContext.destination} ${tripContext.duration} 체크리스트`,
        destination: tripContext.destination,
        duration: tripContext.duration,
        theme: tripContext.theme,
        companion: tripContext.companion,
        transportModes: selectedModes,
        haveItems: haveItems.filter((i) => !uncheckedKeys.includes(`have:${i}`)).slice(0, 30),
        buyItems: buyItems.filter((i) => !uncheckedKeys.includes(`buy:${i}`)).slice(0, 30),
        localItems: localItems.slice(0, 30),
        carrierType: carrierLabel,
        loadPercent,
      });
      setSaveFeedback('마이페이지에 안전하게 저장되었습니다.');
    } catch (err) {
      setSaveFeedback(
        err instanceof Error ? err.message : '체크리스트 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleToggleCheckItem = (bucket: 'have' | 'buy', itemName: string) => {
    const key = `${bucket}:${itemName}`;
    if (bucket === 'buy') {
      const existsInBuy = buyItems.some((item) => {
        const clean = item.split(' (')[0].trim();
        return item === itemName || clean === itemName || item.includes(itemName);
      });
      if (!existsInBuy) {
        setBuyItems((prev) => [itemName, ...prev]);
        setUncheckedKeys((prev) => prev.filter((k) => k !== key));
        return;
      }
    }
    setUncheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCompleteDiagnostic = (payload: {
    destination: string;
    duration: string;
    theme: string;
    companion: string;
    modes: TransportModeId[];
    extraProductIds: string[];
  }) => {
    const activeProducts = products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS;
    const activeLocals = localConversions.length > 0 ? localConversions : LOCAL_CONVERSION_NODES;
    const plan = buildCourseChecklistPlan({
      destination: payload.destination,
      duration: payload.duration,
      theme: payload.theme,
      companion: payload.companion,
      modes: payload.modes,
      products: activeProducts,
      localConversions: activeLocals,
      extraProductIds: payload.extraProductIds,
    });
    setHaveItems(plan.haveItems);
    setBuyItems(plan.buyItems);
    setLocalItems(plan.localItems);
    setCarrierPreset(plan.suggestedCarrier);
    setUncheckedKeys([]);
  };

  const handleSyncChatResults = (
    recs?: Array<{ product: CatalogProduct }>,
    locals?: LocalConversionNode[]
  ) => {
    if (recs && recs.length > 0) {
      const recNames = recs.slice(0, 3).map((r) => r.product.name);
      setBuyItems((prev) => {
        const merged = [...recNames, ...prev.filter((name) => !recNames.includes(name))];
        return merged.slice(0, 10);
      });
      setUncheckedKeys((prev) =>
        prev.filter((k) => !recNames.some((n) => k === `buy:${n}`))
      );
    }
    if (locals && locals.length > 0) {
      const localLabels = locals.map((l) => `${l.title} (${l.estimatedLocalCost})`);
      setLocalItems((prev) => {
        const merged = [...prev];
        localLabels.forEach((lbl) => {
          if (!merged.includes(lbl)) merged.push(lbl);
        });
        return merged.slice(0, 8);
      });
    }
  };

  const handleRestoreChecklist = (rec: SavedChecklistRecord) => {
    setTripContext({
      destination: rec.destination,
      duration: rec.duration,
      theme: rec.theme,
      companion: rec.companion,
      loadPercent: rec.loadPercent,
    });
    if (rec.transportModes.length > 0) {
      setSelectedModes(rec.transportModes);
    }
    setHaveItems(rec.haveItems);
    setBuyItems(rec.buyItems);
    setLocalItems(rec.localItems);
    setUncheckedKeys([]);
    showToast(`체크리스트 '${rec.title}'를 불러왔습니다.`);
  };

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty, 0),
    [cart]
  );

  const handleNavigateRoute = (next: 'store' | 'admin') => {
    setRoute(next);
    window.location.hash = next === 'admin' ? '#admin-console' : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <HeaderBar
        activeRoute={route}
        onNavigateRoute={handleNavigateRoute}
        banners={banners}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenMyPage={() => setMyPageOpen(true)}
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={() => void signOutUser()}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />

      {route === 'admin' ? (
        <AdminConsole
          user={user}
          products={products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS}
          onOpenAuth={() => setAuthOpen(true)}
          onCatalogUpdated={() => void fetchBootstrap()}
        />
      ) : (
        <main className="flex-1">
          <TransportContextBar
            selectedModes={selectedModes}
            onToggleMode={handleToggleMode}
            constraints={constraints}
            packMetrics={packMetrics}
            tripContext={tripContext}
            presets={presets}
            carrierPreset={carrierPreset}
            onChangeCarrierPreset={setCarrierPreset}
            onUpdateTripContext={(patch, applyModes) => {
              setTripContext((prev) => ({ ...prev, ...patch }));
              if (applyModes && applyModes.length > 0) {
                setSelectedModes(applyModes);
              }
            }}
          />

          <DynamicHeroSection
            slides={heroSlides}
            collapsed={heroCollapsed}
            onToggleCollapse={() => setHeroCollapsed((v) => !v)}
            onStartDiagnosticFromHero={handleStartDiagnosticFromHero}
            onTriggerChatPromptFromHero={handleTriggerChatPromptFromHero}
          />

          {/* Main Chatbot-Centric Split Workspace */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8">
                <ChatbotWorkspace
                  selectedModes={selectedModes}
                  constraints={constraints}
                  carrierPreset={carrierPreset}
                  packMetrics={packMetrics}
                  initialCitations={citations}
                  presets={presets}
                  rollCallItems={rollCallItems}
                  products={products}
                  tripContext={{ ...tripContext, loadPercent: packMetrics.loadPercent }}
                  onUpdateTripContext={(patch, applyModes) => {
                    setTripContext((prev) => ({ ...prev, ...patch }));
                    if (applyModes && applyModes.length > 0) {
                      setSelectedModes(applyModes);
                    }
                  }}
                  onStartRollCallResult={handleRollCallResult}
                  onQuickAddCart={(prod, vIdx, cIdx) =>
                    handleAddToCart(prod, vIdx ?? 0, cIdx ?? 0, 1)
                  }
                  onSelectProduct={handleSelectProduct}
                  onApplyLocalConversion={(node) => handleApplyLocalConversion(node)}
                  onOpenMyPage={() => setMyPageOpen(true)}
                  onOpenReceiptModal={() => setReceiptOpen(true)}
                  onTrackEvent={trackEvent}
                  externalAction={pendingHeroAction}
                  onChatStarted={() => setHeroCollapsed(true)}
                  onCompleteDiagnostic={handleCompleteDiagnostic}
                  onSyncChatResults={handleSyncChatResults}
                />
              </div>

              <div className="lg:col-span-4">
                <SummarySidePanel
                  carrierPreset={carrierPreset}
                  onChangeCarrierPreset={setCarrierPreset}
                  packMetrics={packMetrics}
                  haveItems={haveItems}
                  buyItems={buyItems}
                  localItems={localItems}
                  uncheckedKeys={uncheckedKeys}
                  onToggleCheckItem={handleToggleCheckItem}
                  cart={cart}
                  products={products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS}
                  localConversions={localConversions.length > 0 ? localConversions : LOCAL_CONVERSION_NODES}
                  constraints={constraints}
                  tripSummaryText={`${tripContext.destination} · ${tripContext.duration}`}
                  onAddCustomHaveItem={(text) =>
                    setHaveItems((prev) => (prev.includes(text) ? prev : [...prev, text]))
                  }
                  onRemoveItem={(bucket, idx) => {
                    if (bucket === 'have') {
                      const target = haveItems[idx];
                      setHaveItems((prev) => prev.filter((_, i) => i !== idx));
                      if (target) {
                        setUncheckedKeys((prev) => prev.filter((k) => k !== `have:${target}`));
                      }
                    } else if (bucket === 'buy') {
                      const target = buyItems[idx];
                      setBuyItems((prev) => prev.filter((_, i) => i !== idx));
                      if (target) {
                        setUncheckedKeys((prev) => prev.filter((k) => k !== `buy:${target}`));
                      }
                    } else {
                      setLocalItems((prev) => prev.filter((_, i) => i !== idx));
                    }
                  }}
                  onMoveItem={(from, _to, idx) => {
                    const sourceList = from === 'have' ? haveItems : buyItems;
                    const itemName = sourceList[idx];
                    if (!itemName) return;
                    if (from === 'have') {
                      setHaveItems((prev) => prev.filter((_, i) => i !== idx));
                    } else {
                      setBuyItems((prev) => prev.filter((_, i) => i !== idx));
                    }
                    setUncheckedKeys((prev) => prev.filter((k) => k !== `${from}:${itemName}`));
                    setLocalItems((prev) =>
                      prev.includes(`${itemName} (현지 조달)`) ? prev : [...prev, `${itemName} (현지 조달)`]
                    );
                    trackEvent({ type: 'local_convert', detail: itemName });
                  }}
                  onMoveCatalogProductToLocal={(prod) => {
                    const matchedLocal = (
                      localConversions.length > 0 ? localConversions : LOCAL_CONVERSION_NODES
                    ).find((l) => l.id === prod.localConversionId);
                    if (matchedLocal) {
                      handleApplyLocalConversion(matchedLocal, prod);
                    } else {
                      const label = `${prod.name} (현지 조달)`;
                      setLocalItems((prev) => (prev.includes(label) ? prev : [...prev, label]));
                      trackEvent({ type: 'local_convert', productId: prod.id, detail: prod.name });
                      showToast(`현지 조달 목록으로 전환했습니다: ${prod.name}`);
                    }
                  }}
                  onQuickAddCart={(prod, vIdx, cIdx) =>
                    handleAddToCart(prod, vIdx ?? 0, cIdx ?? 0, 1)
                  }
                  onSelectProduct={handleSelectProduct}
                  onSaveChecklist={handleSaveChecklist}
                  savingChecklist={savingChecklist}
                  saveFeedback={saveFeedback}
                  onOpenReceiptModal={() => setReceiptOpen(true)}
                />
              </div>
            </div>
          </section>

          <CatalogSection
            products={products}
            constraints={constraints}
            evaluations={evaluations}
            onSelectProduct={handleSelectProduct}
            onQuickAddCart={(p) => handleAddToCart(p, 0, 0, 1)}
          />

          <InquirySection
            user={user}
            onOpenAuth={() => setAuthOpen(true)}
            onOpenMyPage={() => setMyPageOpen(true)}
          />
        </main>
      )}

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 pb-20 lg:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-3 text-xs text-[var(--text-muted)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <strong className="text-[var(--text-primary)]">집밖은여행 (Jibak-eun Travel)</strong> ·
              지식 그래프·RAG 기반 AI 트래블 컨시어지
            </div>
            <div>
              모든 규정 정보는 국토교통부·코레일·도로교통법 등 공식 출처를 조회하며, 실제 탑승 전 운송사 원문 확인을 권장합니다.
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[11px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">[포트폴리오·개발 시연 안내 · jibak-eun-travel]</strong>{' '}
            본 사이트는 실제 상용 쇼핑몰·결제 서비스가 아닌 개인 포트폴리오·개발 역량 시연용 프로젝트입니다. 주문·결제 및 배송 데이터는 테스트/시연 목적으로 동작하며 실제 금전 결제나 실물 배송은 이루어지지 않습니다.
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] px-4 py-2.5 text-xs font-semibold shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={detailProduct}
        constraints={constraints}
        carrierPreset={carrierPreset}
        citations={citations}
        localConversions={localConversions}
        onClose={() => setDetailProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onConvertLocal={handleApplyLocalConversion}
        onTrackSourceClick={(sourceName, url) =>
          trackEvent({ type: 'source_click', detail: `${sourceName} (${url})` })
        }
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        constraints={constraints}
        onClose={() => setCartOpen(false)}
        onUpdateQty={(key, delta) => {
          setCart((prev) =>
            prev
              .map((it) => (it.cartKey === key ? { ...it, qty: it.qty + delta } : it))
              .filter((it) => it.qty > 0)
          );
        }}
        onRemoveItem={(key) => setCart((prev) => prev.filter((it) => it.cartKey !== key))}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        user={user}
        cart={cart}
        selectedModes={selectedModes}
        onClose={() => setCheckoutOpen(false)}
        onRequireAuth={() => setAuthOpen(true)}
        onOrderSuccess={(orderId, totalAmount, summary) => {
          setCheckoutOpen(false);
          setCart([]);
          trackEvent({ type: 'order_created', amount: totalAmount, detail: `${orderId}: ${summary}` });
          showToast('주문이 정상 접수되었습니다! 마이페이지에서 배송을 확인하세요.');
          setMyPageOpen(true);
        }}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <MyPageModal
        open={myPageOpen}
        user={user}
        products={products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS}
        onClose={() => setMyPageOpen(false)}
        onOpenAuth={() => setAuthOpen(true)}
        onRestoreChecklist={handleRestoreChecklist}
      />

      <ChecklistReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        tripContext={tripContext}
        selectedModes={selectedModes}
        constraints={constraints}
        carrierPreset={carrierPreset}
        packMetrics={packMetrics}
        haveItems={haveItems}
        buyItems={buyItems}
        localItems={localItems}
        uncheckedKeys={uncheckedKeys}
        onToggleCheckItem={handleToggleCheckItem}
        cart={cart}
        products={products.length > 0 ? products : FALLBACK_CATALOG_PRODUCTS}
        localConversions={localConversions.length > 0 ? localConversions : LOCAL_CONVERSION_NODES}
        onQuickAddCart={(prod, vIdx, cIdx) => handleAddToCart(prod, vIdx ?? 0, cIdx ?? 0, 1)}
        onSelectProduct={handleSelectProduct}
        onOpenCart={() => setCartOpen(true)}
        onSaveChecklist={handleSaveChecklist}
        savingChecklist={savingChecklist}
        saveFeedback={saveFeedback}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StorefrontApp />
    </ErrorBoundary>
  );
}
