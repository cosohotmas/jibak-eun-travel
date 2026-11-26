import React, { useCallback, useEffect, useState } from 'react';
import {
  Lock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Package,
  ShoppingBag,
  Truck,
  MapPin,
  Search,
  MousePointerClick,
  Bot,
  Workflow,
  ScrollText,
  Network,
  LogOut,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  subscribeAllOrdersForAdmin,
  subscribeUserOrders,
  updateOrderShippingAsAdmin,
} from '../lib/firebase';
import { FALLBACK_CATALOG_PRODUCTS } from '../lib/localRagEngine';
import type {
  ActionCenterTask,
  AutomationRule,
  CatalogProduct,
  FiveLogCategory,
  HeroClickStat,
  HeroSlide,
  LocalConversionNode,
  LogEntry,
  OfficialSourceNode,
  PromoBanner,
  RegulationNode,
  StoreOrderRecord,
} from '../types/domain';
import { KnowledgeGraphMap } from './KnowledgeGraphMap';

const HERO_IMAGE_PRESETS = [
  { label: '열차·도보 출발', url: '/assets/aistudio/hero_train_travel_1795251607938_f1bdc1fd.jpg' },
  { label: '로드트립·여객선', url: '/assets/aistudio/hero_roadtrip_activity_1795251607655_56620ce6.jpg' },
  { label: '공항·기내 에디토리얼', url: '/assets/aistudio/hero_editorial_travel_store_1795249600525_5de0705c.jpg' },
  { label: '패킹·현지 조달', url: '/assets/aistudio/hero_journey_planner_1795251607276_20a23c47.jpg' },
  { label: '트래블 스토어 쇼케이스', url: '/assets/aistudio/hero_travel_shopping_1795073116053_908bc164.jpg' },
];

interface AdminDashboardData {
  kpis: {
    totalRevenue: number;
    operatingProfit: number;
    netProfit: number;
    totalOrders: number;
    avgOrderValue: number;
    comparisons: { vsYesterday: string; vsLastMonth: string; vsLastYear: string };
    hourlyRevenue: Array<{ label: string; value: number }>;
  };
  funnel: {
    sessions: number;
    diagnosticDone: number;
    rollCallDone: number;
    cartAdded: number;
    ordersCompleted: number;
  };
  cohorts: Array<{ cohort: string; m1: number; m2: number | null; m3: number | null; ltv: string }>;
  products: CatalogProduct[];
  banners: PromoBanner[];
  heroSlides: HeroSlide[];
  heroClickStats: Record<string, HeroClickStat>;
  automations: AutomationRule[];
  actionTasks: ActionCenterTask[];
  clickStats: Record<string, { views: number; cartAdds: number; localConverts: number; sourceClicks: number }>;
  logs: LogEntry[];
  knowledgeGraph: {
    sources: OfficialSourceNode[];
    regulations: RegulationNode[];
    localConversions: LocalConversionNode[];
    nodeHits: Record<string, number>;
    edges: Array<{ from: string; to: string; relation: string }>;
  };
}

interface AdminConsoleProps {
  user?: User | null;
  products?: CatalogProduct[];
  onOpenAuth?: () => void;
  onCatalogUpdated: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  user = null,
  products: propProducts,
  onOpenAuth,
  onCatalogUpdated,
}) => {
  // Strictly in-memory token (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [realOrders, setRealOrders] = useState<StoreOrderRecord[]>([]);
  const [ordersScopeNote, setOrdersScopeNote] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | '결제완료' | '상품준비중' | '배송중' | '배송완료'
  >('all');
  const [orderEditDrafts, setOrderEditDrafts] = useState<
    Record<string, { shippingStatus: StoreOrderRecord['shippingStatus']; courier: string; trackingNumber: string }>
  >({});
  const [orderSaveFeedback, setOrderSaveFeedback] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'catalog' | 'clicks' | 'automations' | 'logs' | 'graph' | 'copilot'
  >('overview');
  const [logFilter, setLogFilter] = useState<'all' | FiveLogCategory>('all');

  // New Product & Banner forms
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('39000');
  const [newProdStock, setNewProdStock] = useState('40');
  const [newBannerText, setNewBannerText] = useState('');

  // Hero Slide CRUD & Edit drafts
  const [newSlideTag, setNewSlideTag] = useState('');
  const [newSlideHeadline, setNewSlideHeadline] = useState('');
  const [newSlidePrompt, setNewSlidePrompt] = useState('');
  const [newSlideImage, setNewSlideImage] = useState(HERO_IMAGE_PRESETS[0].url);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    themeTag: string;
    headline: string;
    subtitle: string;
    imageUrl: string;
    linkedPrompt: string;
    specBadgesText: string;
  }>({
    themeTag: '',
    headline: '',
    subtitle: '',
    imageUrl: '',
    linkedPrompt: '',
    specBadgesText: '',
  });

  // Copilot
  const [copilotQ, setCopilotQ] = useState('');
  const [copilotA, setCopilotA] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Selected Graph Node inspection
  const [selectedNodeId, setSelectedNodeId] = useState<string>('reg-flight');

  const fetchDashboard = useCallback(async (authToken: string) => {
    const res = await fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.status === 401) {
      setToken(null);
      setData(null);
      return;
    }
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    if (token) {
      void fetchDashboard(token);
    }
  }, [token, fetchDashboard]);

  // Real-time Firestore Orders subscription for #admin-console
  useEffect(() => {
    if (!token || !user) {
      setRealOrders([]);
      setOrdersScopeNote(null);
      return;
    }

    let active = true;
    let fallbackUnsub: (() => void) | null = null;

    const adminUnsub = subscribeAllOrdersForAdmin(
      (orders) => {
        if (!active) return;
        setOrdersScopeNote(null);
        setRealOrders(orders);
      },
      () => {
        if (!active) return;
        setOrdersScopeNote(
          `현재 로그인 계정(${user.email || '사용자'}) 주문 내역만 표시 중입니다. 전체 고객 주문 조회는 관리자 계정(cosohotmas@gmail.com)으로 로그인 시 활성화됩니다.`
        );
        fallbackUnsub = subscribeUserOrders(
          user.uid,
          (ownOrders) => {
            if (!active) return;
            setRealOrders(ownOrders);
          },
          () => {}
        );
      }
    );

    return () => {
      active = false;
      adminUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [token, user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcode.trim() || '1234';
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: entered }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '입장 실패');
      setToken(json.token);
      setPasscode('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '인증 오류');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setToken(null);
    setData(null);
  };

  const handleToggleAction = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/actions/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    void fetchDashboard(token);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newProdName.trim()) return;
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newProdName.trim(),
        basePrice: Number(newProdPrice) || 29000,
        stock: Number(newProdStock) || 30,
      }),
    });
    setNewProdName('');
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleUpdateProduct = async (
    id: string,
    patch: { basePrice?: number; stock?: number; active?: boolean }
  ) => {
    if (!token) return;
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newBannerText.trim()) return;
    await fetch('/api/admin/banners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ badge: '운영 공지', text: newBannerText.trim() }),
    });
    setNewBannerText('');
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleToggleBanner = async (id: string, active: boolean) => {
    if (!token) return;
    await fetch(`/api/admin/banners/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !active }),
    });
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleCreateHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newSlideHeadline.trim() || !newSlidePrompt.trim()) return;
    await fetch('/api/admin/hero-slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        themeTag: newSlideTag.trim() || '시즌 여행 테마',
        headline: newSlideHeadline.trim(),
        imageUrl: newSlideImage.trim(),
        linkedPrompt: newSlidePrompt.trim(),
      }),
    });
    setNewSlideTag('');
    setNewSlideHeadline('');
    setNewSlidePrompt('');
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const startEditHeroSlide = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setEditDraft({
      themeTag: slide.themeTag,
      headline: slide.headline,
      subtitle: slide.subtitle,
      imageUrl: slide.imageUrl,
      linkedPrompt: slide.linkedPrompt,
      specBadgesText: slide.specBadges.join(', '),
    });
  };

  const handleSaveHeroSlide = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/hero-slides/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        themeTag: editDraft.themeTag,
        headline: editDraft.headline,
        subtitle: editDraft.subtitle,
        imageUrl: editDraft.imageUrl,
        linkedPrompt: editDraft.linkedPrompt,
        specBadges: editDraft.specBadgesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setEditingSlideId(null);
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleToggleHeroSlide = async (id: string, active: boolean) => {
    if (!token) return;
    await fetch(`/api/admin/hero-slides/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !active }),
    });
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/hero-slides/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onCatalogUpdated();
    void fetchDashboard(token);
  };

  const handleToggleAutomation = async (id: string, enabled: boolean) => {
    if (!token) return;
    await fetch(`/api/admin/automations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled: !enabled }),
    });
    void fetchDashboard(token);
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !copilotQ.trim()) return;
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const res = await fetch('/api/admin/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: copilotQ.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI 비서 호출 실패');
      setCopilotA(json.answer);
      void fetchDashboard(token);
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : '오류 발생');
    } finally {
      setCopilotLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)]">
                관리자 콘솔 간편 입장
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                비밀번호 저장 없이 아무 번호나 입력하면 즉시 입장할 수 있습니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3 mt-4">
            <input
              type="text"
              inputMode="numeric"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="아무 번호나 입력 (예: 1234)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm font-mono-num text-[var(--text-primary)]"
            />
            {authError && <p className="text-xs text-[var(--status-danger)]">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? '입장 중...' : '아무 번호로 콘솔 입장'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-[var(--text-muted)]">
        관리자 운영 데이터를 불러오는 중입니다...
      </div>
    );
  }

  const maxHourly = Math.max(...data.kpis.hourlyRevenue.map((h) => h.value), 1);
  const filteredLogs =
    logFilter === 'all' ? data.logs : data.logs.filter((l) => l.category === logFilter);

  const realOrdersRevenue = realOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const catalogPool = propProducts && propProducts.length > 0 ? propProducts : data.products.length > 0 ? data.products : FALLBACK_CATALOG_PRODUCTS;
  const filteredRealOrders = realOrders.filter((order) => {
    if (orderStatusFilter !== 'all' && order.shippingStatus !== orderStatusFilter) return false;
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      order.id.toLowerCase().includes(q) ||
      order.buyerName.toLowerCase().includes(q) ||
      order.buyerEmail.toLowerCase().includes(q) ||
      order.itemSummary.toLowerCase().includes(q) ||
      (order.shippingAddress || '').toLowerCase().includes(q)
    );
  });

  const handleSaveOrderShipping = async (order: StoreOrderRecord) => {
    const draft = orderEditDrafts[order.id] || {
      shippingStatus: order.shippingStatus,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
    };
    setOrderSaveFeedback(null);
    try {
      await updateOrderShippingAsAdmin(order.id, draft);
      setOrderSaveFeedback(`주문 #${order.id.slice(0, 8)} 배송 정보가 저장되었습니다.`);
    } catch (err) {
      setOrderSaveFeedback(
        err instanceof Error ? err.message : '배송 정보 저장 중 권한 또는 네트워크 오류가 발생했습니다.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Console Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            집밖은여행 통합 운영 대시보드 (#admin-console)
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            챗봇 RAG 조회 · 클릭 추적 · 실제 Firestore 주문·물류 · 지식 그래프 실시간 연동
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(token)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-rose-600 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            세션 종료
          </button>
        </div>
      </div>

      {/* Console Sub-Nav */}
      <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1">
        {[
          { id: 'overview', label: '재무 KPI·액션·퍼널', icon: TrendingUp },
          { id: 'orders', label: `실제 주문 내역 (${realOrders.length})`, icon: ShoppingBag },
          { id: 'catalog', label: '상품·쇼핑몰 배너 관리', icon: Package },
          { id: 'clicks', label: '클릭·전환 추적', icon: MousePointerClick },
          { id: 'automations', label: '마케팅·물류·반품 자동화', icon: Workflow },
          { id: 'logs', label: `5대 로그 (${data.logs.length})`, icon: ScrollText },
          { id: 'graph', label: '지식 그래프 지도', icon: Network },
          { id: 'copilot', label: 'AI 운영 비서', icon: Bot },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shrink-0 border cursor-pointer ${
              activeTab === id
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB: Financial KPIs + Hourly + Action Center + Funnel/Quadrant/Cohort */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">총 매출 (누적+실시간)</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-[var(--text-primary)]">
                {data.kpis.totalRevenue.toLocaleString()}원
              </div>
              <div className="mt-2 text-xs text-[var(--status-pass)]">
                전일 {data.kpis.comparisons.vsYesterday} · 전월 {data.kpis.comparisons.vsLastMonth} · 전년 {data.kpis.comparisons.vsLastYear}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">영업이익 (마진 31%)</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-[var(--text-primary)]">
                {data.kpis.operatingProfit.toLocaleString()}원
              </div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                평균 객단가 {data.kpis.avgOrderValue.toLocaleString()}원
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">순이익 (22%)</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-[var(--text-primary)]">
                {data.kpis.netProfit.toLocaleString()}원
              </div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                총 주문 건수 {data.kpis.totalOrders}건
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)] mb-2">시간별 매출 추이</div>
              <div className="flex items-end gap-1.5 h-16">
                {data.kpis.hourlyRevenue.map((h) => (
                  <div key={h.label} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      style={{ height: `${Math.max(12, Math.round((h.value / maxHourly) * 100))}%` }}
                      className="w-full rounded-t bg-[var(--brand-primary)]"
                      title={`${h.label}: ${h.value.toLocaleString()}원`}
                    />
                    <span className="text-[10px] text-[var(--text-muted)]">{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Center + Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">액션 센터 (즉시 조치)</h2>
              {data.actionTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      {task.status === 'open' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>[{task.category}] {task.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{task.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAction(task.id)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium shrink-0 cursor-pointer"
                  >
                    {task.status === 'open' ? '완료 처리' : '다시 열기'}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">대화 → 주문 전환 퍼널</h2>
              {[
                { label: '챗봇 방문 세션', count: data.funnel.sessions },
                { label: '4단계 여행 진단 완료', count: data.funnel.diagnosticDone },
                { label: '기본 8종 점호 완료', count: data.funnel.rollCallDone },
                { label: '장바구니 담기', count: data.funnel.cartAdded },
                { label: '최종 주문 완료', count: data.funnel.ordersCompleted },
              ].map((step) => {
                const pct = Math.min(100, Math.round((step.count / Math.max(1, data.funnel.sessions)) * 100));
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">{step.label}</span>
                      <span className="font-mono-num font-bold text-[var(--text-primary)]">
                        {step.count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-[var(--brand-primary)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cohort & Product Quadrant */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">코호트 리텐션 & LTV</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                    <th className="py-2">코호트</th>
                    <th className="py-2">M+0</th>
                    <th className="py-2">M+1</th>
                    <th className="py-2">M+2</th>
                    <th className="py-2 text-right">예상 LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((c) => (
                    <tr key={c.cohort} className="border-b border-[var(--border-subtle)] font-mono-num">
                      <td className="py-2 font-sans font-semibold text-[var(--text-primary)]">{c.cohort}</td>
                      <td className="py-2">{c.m1}%</td>
                      <td className="py-2">{c.m2 !== null ? `${c.m2}%` : '-'}</td>
                      <td className="py-2">{c.m3 !== null ? `${c.m3}%` : '-'}</td>
                      <td className="py-2 text-right font-bold">{c.ltv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">상품 수익·전환 사분면 요약</h2>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="font-bold text-[var(--status-pass)]">Star (고마진·고전환)</div>
                  <p className="mt-1 text-[var(--text-secondary)]">레일백 20인치 캐리어 · 10,000mAh 37Wh 보조배터리</p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="font-bold text-[var(--brand-primary)]">Cash Cow (안정 수요)</div>
                  <p className="mt-1 text-[var(--text-secondary)]">덴토 50ml 치약세트 · 압축 패킹 큐브 4종</p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="font-bold text-[var(--status-warn)]">Local Shield (현지 전환 방어)</div>
                  <p className="mt-1 text-[var(--text-secondary)]">24인치 초과 수하물 → 보관함 · 100ml 초과 → 드럭스토어</p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="font-bold text-[var(--text-muted)]">Growth Opportunity</div>
                  <p className="mt-1 text-[var(--text-secondary)]">어반 트랜짓 28L 백팩 · 디지털 수하물 저울</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Real Firestore Orders Summary on Overview */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>실시간 실제 주문 내역 (Firestore DB 연동)</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  실제 DB 주문 {realOrders.length}건 · 합계 {realOrdersRevenue.toLocaleString()}원
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:border-[var(--brand-primary)] cursor-pointer"
              >
                전체 주문 관리 열기 →
              </button>
            </div>

            {!user ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-secondary)]">
                  실제 Firestore 주문 내역을 조회하려면 Google 계정으로 로그인해 주세요.
                </span>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="rounded-lg bg-[var(--brand-primary)] px-3.5 py-1.5 font-semibold text-white cursor-pointer"
                  >
                    Google 로그인
                  </button>
                )}
              </div>
            ) : realOrders.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-3">
                아직 접수된 실제 주문 내역이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {realOrders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-num font-bold text-[var(--text-primary)]">
                        #{order.id.slice(0, 8)} · {order.buyerName}
                      </span>
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                        {order.shippingStatus}
                      </span>
                    </div>
                    <div className="text-[var(--text-secondary)] truncate">{order.itemSummary}</div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono-num">
                      <span>{order.createdAtText}</span>
                      <strong className="text-[var(--text-primary)]">{order.totalAmount.toLocaleString()}원</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1.5 REAL FIRESTORE ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">실제 접수 주문</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-[var(--text-primary)]">
                {realOrders.length}건
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">실제 주문 결제 합계</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-[var(--brand-primary)]">
                {realOrdersRevenue.toLocaleString()}원
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">결제완료 · 준비중</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-[var(--text-primary)]">
                {realOrders.filter((o) => o.shippingStatus === '결제완료' || o.shippingStatus === '상품준비중').length}건
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-muted)]">배송중 · 배송완료</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-[var(--status-pass)]">
                {realOrders.filter((o) => o.shippingStatus === '배송중' || o.shippingStatus === '배송완료').length}건
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  실제 주문 내역 (Firestore 실시간)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  고객이 주문서에서 결제 완료한 실제 Firestore 주문 문서와 배송 상태를 관리합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="주문번호·구매자·상품 검색"
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
                {(['all', '결제완료', '상품준비중', '배송중', '배송완료'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border cursor-pointer ${
                      orderStatusFilter === st
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {st === 'all' ? '전체' : st}
                  </button>
                ))}
              </div>
            </div>

            {ordersScopeNote && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2.5 text-xs text-[var(--status-warn)]">
                {ordersScopeNote}
              </div>
            )}

            {orderSaveFeedback && (
              <div className="rounded-xl bg-teal-600/10 border border-teal-600/25 px-3.5 py-2 text-xs font-medium text-[var(--status-pass)]">
                {orderSaveFeedback}
              </div>
            )}

            {!user ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-8 text-center space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  실제 Firestore 주문 데이터를 불러오려면 Google 계정으로 로그인해 주세요.
                </p>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Google 로그인하여 주문 불러오기
                  </button>
                )}
              </div>
            ) : filteredRealOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                조건에 맞는 실제 주문 내역이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredRealOrders.map((order) => {
                  const draft = orderEditDrafts[order.id] || {
                    shippingStatus: order.shippingStatus,
                    courier: order.courier,
                    trackingNumber: order.trackingNumber,
                  };
                  const formattedAddr =
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
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono-num font-bold text-[var(--text-primary)]">
                              주문 #{order.id}
                            </span>
                            <span className="font-semibold text-[var(--brand-primary)]">
                              {order.buyerName} ({order.buyerEmail})
                            </span>
                            <span className="text-[var(--text-muted)]">
                              · 출발일 {order.departureDate}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-num text-[var(--text-muted)]">
                            주문일시 {order.createdAtText} · 결제수단 {order.paymentMethod}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-[var(--text-muted)]">총 결제금액</div>
                          <div className="font-mono-num text-base font-bold text-[var(--brand-primary)]">
                            {order.totalAmount.toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      {/* Ordered Items List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.items.map((item, idx) => {
                          const matchedProd = catalogPool.find(
                            (p) =>
                              p.id === item.productId ||
                              p.name === item.name ||
                              item.name.includes(p.name)
                          );
                          const thumbUrl = item.imageUrl || matchedProd?.imageUrl || '';
                          return (
                            <div
                              key={`${order.id}-admin-item-${idx}`}
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 flex items-center gap-2.5 text-xs"
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={item.name}
                                  className="w-11 h-11 rounded-md object-cover shrink-0 border border-[var(--border-subtle)]"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-md shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-[var(--text-primary)] truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                                  {item.optionSize} · {item.optionColor}
                                </div>
                                <div className="font-mono-num text-[11px] text-[var(--text-muted)]">
                                  {Number(item.price || 0).toLocaleString()}원 × {item.qty}개 ={' '}
                                  <strong className="text-[var(--text-primary)]">
                                    {(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString()}원
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Shipping Address & Logistics Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                          <span className="truncate">{formattedAddr || '배송지 정보 없음'}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <input
                            type="text"
                            value={draft.courier}
                            onChange={(e) =>
                              setOrderEditDrafts((prev) => ({
                                ...prev,
                                [order.id]: { ...draft, courier: e.target.value },
                              }))
                            }
                            placeholder="택배사"
                            className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={draft.trackingNumber}
                            onChange={(e) =>
                              setOrderEditDrafts((prev) => ({
                                ...prev,
                                [order.id]: { ...draft, trackingNumber: e.target.value },
                              }))
                            }
                            placeholder="송장번호"
                            className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-mono-num"
                          />
                          <select
                            value={draft.shippingStatus}
                            onChange={(e) =>
                              setOrderEditDrafts((prev) => ({
                                ...prev,
                                [order.id]: {
                                  ...draft,
                                  shippingStatus: e.target.value as StoreOrderRecord['shippingStatus'],
                                },
                              }))
                            }
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-semibold"
                          >
                            <option value="결제완료">결제완료</option>
                            <option value="상품준비중">상품준비중</option>
                            <option value="배송중">배송중</option>
                            <option value="배송완료">배송완료</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleSaveOrderShipping(order)}
                            className="rounded-lg bg-[var(--brand-primary)] px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                          >
                            배송 저장
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CATALOG & BANNERS CRUD TAB */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">신규 상품 등록 (Gemini 실시간 카탈로그 반영)</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="신규 상품명"
                className="sm:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                placeholder="가격 (원)"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  placeholder="재고"
                  className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  등록
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                    <th className="py-2">상품명</th>
                    <th className="py-2">분류</th>
                    <th className="py-2">가격</th>
                    <th className="py-2">재고</th>
                    <th className="py-2">노출</th>
                    <th className="py-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border-subtle)]">
                      <td className="py-2.5 font-semibold text-[var(--text-primary)]">{p.name}</td>
                      <td className="py-2.5 text-[var(--text-secondary)]">{p.category}</td>
                      <td className="py-2.5 font-mono-num">{p.basePrice.toLocaleString()}원</td>
                      <td className="py-2.5 font-mono-num">{p.stock}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(p.id, { active: !p.active })}
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                            p.active ? 'bg-teal-600/15 text-[var(--status-pass)]' : 'bg-zinc-500/15 text-[var(--text-muted)]'
                          }`}
                        >
                          {p.active ? '판매중' : '숨김'}
                        </button>
                      </td>
                      <td className="py-2.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(p.id, { stock: p.stock + 10 })}
                          className="text-[var(--brand-primary)] hover:underline cursor-pointer"
                        >
                          +10재고
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-rose-600 hover:underline cursor-pointer inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hero Slides Management (Shopping Mall Banner Management) */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                쇼핑몰 배너 관리 (동적 히어로 슬라이드 & 챗봇 연결 질문)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                슬라이드 문구·이미지·연결 질문을 수정하면 스토어 최상단 히어로 섹션에 즉시 반영됩니다.
              </p>
            </div>

            <form onSubmit={handleCreateHeroSlide} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={newSlideTag}
                onChange={(e) => setNewSlideTag(e.target.value)}
                placeholder="테마명 (예: 05. 가을 단풍 철도)"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={newSlideHeadline}
                onChange={(e) => setNewSlideHeadline(e.target.value)}
                placeholder="배너 헤드라인 문구"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              />
              <select
                value={newSlideImage}
                onChange={(e) => setNewSlideImage(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                {HERO_IMAGE_PRESETS.map((img) => (
                  <option key={img.url} value={img.url}>
                    이미지: {img.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSlidePrompt}
                  onChange={(e) => setNewSlidePrompt(e.target.value)}
                  placeholder="챗봇 연결 질문 프롬프트"
                  className="flex-1 min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  추가
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {data.heroSlides.map((slide) => {
                const stat = data.heroClickStats[slide.id] || {
                  bannerClicks: 0,
                  hashtagClicks: 0,
                  lastClickedAt: '-',
                };
                const isEditing = editingSlideId === slide.id;

                return (
                  <div
                    key={slide.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={slide.imageUrl}
                          alt={slide.themeTag}
                          className="w-16 h-10 rounded-lg object-cover shrink-0 bg-[var(--bg-elevated)]"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate">
                            {slide.themeTag} · {slide.headline}
                          </div>
                          <div className="font-mono-num text-[11px] text-[var(--text-muted)]">
                            CTA 클릭 {stat.bannerClicks}회 · 해시태그 클릭 {stat.hashtagClicks}회 · 최근 {stat.lastClickedAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => (isEditing ? setEditingSlideId(null) : startEditHeroSlide(slide))}
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-medium cursor-pointer"
                        >
                          {isEditing ? '취소' : '문구·이미지 수정'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHeroSlide(slide.id, slide.active)}
                          className={`rounded-lg px-2.5 py-1 font-semibold cursor-pointer ${
                            slide.active
                              ? 'bg-teal-600/15 text-[var(--status-pass)]'
                              : 'bg-zinc-500/15 text-[var(--text-muted)]'
                          }`}
                        >
                          {slide.active ? '노출중' : '숨김'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeroSlide(slide.id)}
                          aria-label="슬라이드 삭제"
                          className="text-rose-600 hover:opacity-80 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="pt-2.5 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            테마명
                          </label>
                          <input
                            type="text"
                            value={editDraft.themeTag}
                            onChange={(e) => setEditDraft((d) => ({ ...d, themeTag: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            배경 이미지 경로 (또는 프리셋 선택)
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editDraft.imageUrl}
                              onChange={(e) => setEditDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                            />
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) setEditDraft((d) => ({ ...d, imageUrl: e.target.value }));
                              }}
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-[11px]"
                            >
                              <option value="">프리셋</option>
                              {HERO_IMAGE_PRESETS.map((img) => (
                                <option key={img.url} value={img.url}>
                                  {img.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            헤드라인
                          </label>
                          <input
                            type="text"
                            value={editDraft.headline}
                            onChange={(e) => setEditDraft((d) => ({ ...d, headline: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            서브 설명 문구
                          </label>
                          <input
                            type="text"
                            value={editDraft.subtitle}
                            onChange={(e) => setEditDraft((d) => ({ ...d, subtitle: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            챗봇 연결 질문 프롬프트
                          </label>
                          <input
                            type="text"
                            value={editDraft.linkedPrompt}
                            onChange={(e) => setEditDraft((d) => ({ ...d, linkedPrompt: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                            스펙 뱃지 (쉼표 구분)
                          </label>
                          <input
                            type="text"
                            value={editDraft.specBadgesText}
                            onChange={(e) => setEditDraft((d) => ({ ...d, specBadgesText: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveHeroSlide(slide.id)}
                            className="rounded-lg bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            수정 사항 즉시 반영
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">상단 공지 띠배너 관리</h2>
            <form onSubmit={handleCreateBanner} className="flex gap-2">
              <input
                type="text"
                value={newBannerText}
                onChange={(e) => setNewBannerText(e.target.value)}
                placeholder="새 상단 배너 공지 문구"
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                배너 추가
              </button>
            </form>
            <div className="space-y-2">
              {data.banners.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                >
                  <span>
                    <strong className="mr-2">[{b.badge}]</strong>
                    {b.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleBanner(b.id, b.active)}
                    className="rounded border border-[var(--border-subtle)] px-2.5 py-1 font-semibold cursor-pointer"
                  >
                    {b.active ? '활성' : '비활성'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. CLICK TRACKING TAB */}
      {activeTab === 'clicks' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
              히어로 배너 · 해시태그 클릭 및 챗봇 유입 추적
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                  <th className="py-2">슬라이드 테마</th>
                  <th className="py-2">배너 CTA 클릭</th>
                  <th className="py-2">해시태그 클릭</th>
                  <th className="py-2">연결 지식 노드</th>
                  <th className="py-2 text-right">최근 클릭 시각</th>
                </tr>
              </thead>
              <tbody>
                {data.heroSlides.map((slide) => {
                  const st = data.heroClickStats[slide.id] || {
                    bannerClicks: 0,
                    hashtagClicks: 0,
                    lastClickedAt: '-',
                  };
                  return (
                    <tr key={slide.id} className="border-b border-[var(--border-subtle)] font-mono-num">
                      <td className="py-2.5 font-sans font-semibold text-[var(--text-primary)]">
                        {slide.themeTag}
                      </td>
                      <td className="py-2.5">{st.bannerClicks}</td>
                      <td className="py-2.5">{st.hashtagClicks}</td>
                      <td className="py-2.5 text-[11px] text-[var(--brand-primary)]">
                        {slide.nodeIds.join(', ')}
                      </td>
                      <td className="py-2.5 text-right text-[var(--text-muted)]">
                        {st.lastClickedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
              상품별 조회 · 장바구니 전환 · 현지전환 · 공식출처 클릭 추적
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                  <th className="py-2">상품 ID</th>
                  <th className="py-2">상세 조회</th>
                  <th className="py-2">장바구니 담기</th>
                  <th className="py-2">현지 조달 전환</th>
                  <th className="py-2">출처 원문 클릭</th>
                  <th className="py-2 text-right">장바구니 전환율</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.clickStats).map(([id, st]) => {
                  const cvr = st.views > 0 ? Math.round((st.cartAdds / st.views) * 100) : 0;
                  return (
                    <tr key={id} className="border-b border-[var(--border-subtle)] font-mono-num">
                      <td className="py-2.5 font-sans font-semibold text-[var(--text-primary)]">{id}</td>
                      <td className="py-2.5">{st.views}</td>
                      <td className="py-2.5">{st.cartAdds}</td>
                      <td className="py-2.5">{st.localConverts}</td>
                      <td className="py-2.5">{st.sourceClicks}</td>
                      <td className="py-2.5 text-right font-bold text-[var(--brand-primary)]">{cvr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUTOMATIONS TAB */}
      {activeTab === 'automations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.automations.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="text-xs font-bold text-[var(--brand-primary)]">{rule.domain} 자동화</div>
                <h3 className="mt-1 text-sm font-bold text-[var(--text-primary)]">{rule.title}</h3>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">조건: {rule.condition}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">실행: {rule.action}</p>
              </div>
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="font-mono-num text-[var(--text-muted)]">
                  실행 {rule.executionsCount}회 · {rule.lastRunAt}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleAutomation(rule.id, rule.enabled)}
                  className={`rounded-lg px-3 py-1 font-semibold cursor-pointer ${
                    rule.enabled
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {rule.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. FIVE CORE LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">5대 통합 운영 로그</h2>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: '전체' },
                { id: 'ai_rag_regulation', label: 'AI·규정' },
                { id: 'product_click_conversion', label: '클릭·전환' },
                { id: 'order_logistics', label: '주문·물류' },
                { id: 'local_alert', label: '현지전환 경보' },
                { id: 'admin_audit', label: '관리자 감사' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLogFilter(f.id as typeof logFilter)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border cursor-pointer ${
                    logFilter === f.id
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto thin-scroll">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[var(--text-primary)]">
                    [{log.category}] {log.summary}
                  </span>
                  <span className="font-mono-num text-[var(--text-muted)]">
                    {log.timestamp} · {log.actor}
                  </span>
                </div>
                {log.detail && <div className="text-[var(--text-secondary)]">{log.detail}</div>}
                {log.nodeIds.length > 0 && (
                  <div className="font-mono-num text-[11px] text-[var(--brand-primary)]">
                    연결 노드: {log.nodeIds.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. KNOWLEDGE GRAPH TOPOLOGY TAB */}
      {activeTab === 'graph' && (() => {
        const reg = data.knowledgeGraph.regulations.find((r) => r.id === selectedNodeId);
        const src = data.knowledgeGraph.sources.find((s) => s.id === selectedNodeId);
        const slide = data.heroSlides.find((s) => s.id === selectedNodeId);
        const prod = data.products.find((p) => p.id === selectedNodeId);
        const loc = data.knowledgeGraph.localConversions.find((l) => l.id === selectedNodeId);

        const nodeMeta = reg
          ? { title: reg.modeLabel, badge: '규정 노드', desc: `${reg.summary}${reg.legalNote ? ` · ${reg.legalNote}` : ` · ${reg.title}`}` }
          : src
          ? { title: src.name, badge: '공식 출처 노드', desc: `${src.standardTitle} (갱신 ${src.verifiedDate})` }
          : slide
          ? { title: slide.themeTag, badge: '히어로 배너 노드', desc: slide.headline }
          : prod
          ? { title: prod.name, badge: '상품·옵션 노드', desc: `${prod.weightKg}kg · ${prod.dimensionsCm}cm (합 ${prod.sumCm}cm) · ${prod.basePrice.toLocaleString()}원` }
          : loc
          ? { title: loc.title, badge: '현지 전환 노드', desc: `${loc.channelType} · ${loc.triggerCondition} (-${loc.weightSavedKg}kg 절감)` }
          : { title: selectedNodeId, badge: '노드', desc: '' };

        const labelForId = (id: string) => {
          const r = data.knowledgeGraph.regulations.find((x) => x.id === id);
          if (r) return r.modeLabel;
          const s = data.knowledgeGraph.sources.find((x) => x.id === id);
          if (s) return s.name;
          const sl = data.heroSlides.find((x) => x.id === id);
          if (sl) return sl.themeTag;
          const p = data.products.find((x) => x.id === id);
          if (p) return p.name;
          const l = data.knowledgeGraph.localConversions.find((x) => x.id === id);
          if (l) return l.title;
          return id;
        };

        const heroEdges: Array<{ from: string; to: string; relation: string }> = [];
        data.heroSlides.forEach((sl) => {
          data.knowledgeGraph.regulations.forEach((r) => {
            if (sl.transportModes.includes(r.transportMode) || sl.nodeIds.includes(r.id)) {
              heroEdges.push({ from: r.sourceId, to: sl.id, relation: 'LINKS_BANNER' });
            }
          });
          data.knowledgeGraph.localConversions.forEach((l) => {
            if (sl.nodeIds.includes(l.id)) {
              heroEdges.push({ from: sl.id, to: l.id, relation: 'CONVERTS_TO_LOCAL' });
            }
          });
        });

        const allCombinedEdges = [...data.knowledgeGraph.edges, ...heroEdges];
        const relatedEdges = allCombinedEdges.filter(
          (e) => e.from === selectedNodeId || e.to === selectedNodeId
        );
        const slideStat = slide ? data.heroClickStats[slide.id] : undefined;
        const refCount = slide
          ? (slideStat?.bannerClicks || 0) + (slideStat?.hashtagClicks || 0)
          : data.knowledgeGraph.nodeHits[selectedNodeId] || 0;

        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-9 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    지식 그래프 실시간 연결 지도 (노드를 클릭하거나 올리면 연결 경로가 강조됩니다)
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    1. 이동 수단 최소규정 → 2. 공식 출처 원문 → 3. 배너·상품·옵션 → 4. 현지 구매·체험 전환
                  </p>
                </div>
              </div>

              <KnowledgeGraphMap
                regulations={data.knowledgeGraph.regulations}
                sources={data.knowledgeGraph.sources}
                heroSlides={data.heroSlides}
                heroClickStats={data.heroClickStats}
                products={data.products}
                localConversions={data.knowledgeGraph.localConversions}
                nodeHits={data.knowledgeGraph.nodeHits}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>

            <div className="xl:col-span-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3 h-fit">
              <div className="space-y-1">
                <span className="inline-block rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-[#0284c7]">
                  {nodeMeta.badge}
                </span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {nodeMeta.title}
                </h3>
                {nodeMeta.desc && (
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {nodeMeta.desc}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <span>{slide ? '배너·해시태그 클릭' : '누적 챗봇·스토어 참조'}</span>
                <strong className="font-mono-num text-[#0284c7]">
                  {refCount}회
                </strong>
              </div>

              {src?.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[11px] font-semibold text-[#0284c7] hover:bg-sky-500/10 truncate"
                >
                  공식 원문 열기 ↗
                </a>
              )}

              <div className="text-[11px] font-bold text-[var(--text-muted)] pt-1">
                연결된 노드 ({relatedEdges.length}개) · 클릭해 이동
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto thin-scroll">
                {relatedEdges.map((e, idx) => {
                  const otherId = e.from === selectedNodeId ? e.to : e.from;
                  const direction = e.from === selectedNodeId ? '→' : '←';
                  return (
                    <button
                      key={`${e.from}-${e.to}-${idx}`}
                      type="button"
                      onClick={() => setSelectedNodeId(otherId)}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[#0284c7] p-2.5 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num text-[#0284c7]">
                        <span>[{e.relation}]</span>
                        <span>{direction}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-[var(--text-primary)] truncate">
                        {labelForId(otherId)}
                      </div>
                      <div className="text-[10px] font-mono-num text-[var(--text-muted)] truncate">
                        {otherId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. AI OPERATIONS COPILOT TAB */}
      {activeTab === 'copilot' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Gemini AI 운영 비서 (실시간 재고·전환율·로그 분석)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              현재 관리자 대시보드 수치와 최근 5대 로그를 기반으로 운영 액션을 제안합니다.
            </p>
          </div>

          <form onSubmit={handleAskCopilot} className="flex gap-2">
            <input
              type="text"
              value={copilotQ}
              onChange={(e) => setCopilotQ(e.target.value)}
              placeholder="예: 재고 부족 위험 상품과 최근 현지전환 방어 현황을 요약해줘"
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={copilotLoading || !copilotQ.trim()}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {copilotLoading ? '분석 중...' : 'AI 분석 요청'}
            </button>
          </form>

          {copilotError && (
            <div className="rounded-xl bg-rose-600/10 p-3 text-xs text-[var(--status-danger)]">
              {copilotError}
            </div>
          )}

          {copilotA && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
              {copilotA}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
