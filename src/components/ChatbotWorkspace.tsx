import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Sparkles,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  PackageSearch,
  ListChecks,
  Compass,
  RotateCcw,
  ReceiptText,
} from 'lucide-react';
import type {
  CarrierPresetKey,
  CatalogProduct,
  ChatMessage,
  DiagnosticPreset,
  FactCitation,
  LocalConversionNode,
  PackingMetrics,
  RollCallItem,
  StrictestConstraints,
  TransportModeId,
} from '../types/domain';
import { FactCitationFooter } from './FactCitationFooter';
import {
  LOCAL_CONVERSION_NODES,
  buildLocalCitations,
  computeStrictestTransitRule,
  detectCustomDestinationCourse,
  evaluateProductUnified,
  queryLocalKnowledgeGraphRag,
} from '../lib/localRagEngine';

interface RecommendedQuickPrompt {
  id: string;
  label: string;
  prompt: string;
  modes: TransportModeId[];
  contextPatch?: { destination?: string; duration?: string };
}

const RECOMMENDED_QUICK_PROMPTS: RecommendedQuickPrompt[] = [
  {
    id: 'qp-busan-ktx',
    label: '부산 KTX·도보 1박2일 최소규정 짐 추천',
    prompt: '도보+지하철+KTX로 부산 1박 2일 가는데 최소규정 기준 짐 추천해줘',
    modes: ['walk', 'subway', 'train'],
    contextPatch: { destination: '부산', duration: '1박 2일' },
  },
  {
    id: 'qp-jeju-car-ship',
    label: '제주 자가용·배 도로교통법 적재 규정',
    prompt: '자가용+배 타고 제주 2박 3일 가는데 도로교통법 적재·고정 규정 확인해줘',
    modes: ['car', 'ship'],
    contextPatch: { destination: '제주', duration: '2박 3일' },
  },
  {
    id: 'qp-bus-flight',
    label: '고속버스+항공 기내(100ml·100Wh) 통과템',
    prompt: '고속버스+항공 기내 반입(100ml·100Wh·100cm) 통과하는 준비물 골라줘',
    modes: ['bus', 'flight'],
  },
  {
    id: 'qp-liquid-local',
    label: '액체 100ml 초과 → 현지 조달로 무게 절감',
    prompt: '항공 액체류 100ml 초과 화장품은 현지 구매로 빼고 필수품만 추천해줘',
    modes: ['flight', 'walk'],
  },
  {
    id: 'qp-daytrip-light',
    label: '주말 근교 당일치기 초경량 가방·기본품',
    prompt: '주말 근교 당일치기 나들이용 초경량 가방이랑 기본 품목 추천해줘',
    modes: ['walk', 'subway'],
    contextPatch: { duration: '당일~1박 2일' },
  },
];

interface TripContextState {
  destination: string;
  duration: string;
  theme: string;
  companion: string;
  loadPercent: number;
}

interface ChatbotWorkspaceProps {
  selectedModes: TransportModeId[];
  constraints: StrictestConstraints | null;
  carrierPreset: CarrierPresetKey;
  packMetrics?: PackingMetrics;
  initialCitations: FactCitation[];
  presets: DiagnosticPreset | null;
  rollCallItems: RollCallItem[];
  products: CatalogProduct[];
  tripContext: TripContextState;
  onUpdateTripContext: (patch: Partial<TripContextState>, applyModes?: TransportModeId[]) => void;
  onStartRollCallResult: (
    item: RollCallItem,
    choice: 'have' | 'buy' | 'local'
  ) => void;
  onQuickAddCart: (product: CatalogProduct, variantIdx?: number, colorIdx?: number) => void;
  onSelectProduct: (product: CatalogProduct) => void;
  onApplyLocalConversion: (node: LocalConversionNode) => void;
  onOpenMyPage: () => void;
  onOpenReceiptModal?: () => void;
  onTrackEvent: (payload: {
    type: string;
    productId?: string;
    localId?: string;
    detail?: string;
  }) => void;
  externalAction?: {
    id: number;
    kind: 'diagnostic' | 'prompt';
    prompt?: string;
    modes?: TransportModeId[];
  } | null;
  onChatStarted?: () => void;
  onCompleteDiagnostic?: (payload: {
    destination: string;
    duration: string;
    theme: string;
    companion: string;
    modes: TransportModeId[];
    extraProductIds: string[];
  }) => void;
  onSyncChatResults?: (
    recs: ChatMessage['recommendations'],
    locals: ChatMessage['localConversions']
  ) => void;
}

export const ChatbotWorkspace: React.FC<ChatbotWorkspaceProps> = ({
  selectedModes,
  constraints,
  carrierPreset,
  packMetrics,
  initialCitations,
  presets,
  rollCallItems,
  products,
  tripContext,
  onUpdateTripContext,
  onStartRollCallResult,
  onQuickAddCart,
  onSelectProduct,
  onApplyLocalConversion,
  onOpenMyPage,
  onOpenReceiptModal,
  onTrackEvent,
  externalAction,
  onChatStarted,
  onCompleteDiagnostic,
  onSyncChatResults,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [customDestInput, setCustomDestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCardVariants, setSelectedCardVariants] = useState<Record<string, number>>({});
  const [diagCompleted, setDiagCompleted] = useState(false);
  const [rollCallActive, setRollCallActive] = useState(false);
  const [rollCallIndex, setRollCallIndex] = useState(0);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);
  const lastExternalIdRef = useRef<number>(0);

  useEffect(() => {
    if (initializedRef.current || !constraints || initialCitations.length === 0) return;
    initializedRef.current = true;
    const starterProducts = products.slice(0, 2).map((p) => {
      const ev = evaluateProductUnified(p, { constraints, carrierPreset });
      return {
        product: p,
        compatibilityStatus: ev.status,
        compatibilityNote: ev.note,
      };
    });

    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: `안녕하세요! 집밖은여행 AI 쇼핑 컨시어지입니다.\n현재 이동 수단 기준(${constraints.headlineSummary})에 맞춰 규정 위반이나 과잉 짐 없이 딱 필요한 여행 준비물만 골라드릴게요. 상단의 '4단계 여행진단·기본 8종 점호' 버튼이나 입력창 위 추천 질문 5개로 바로 시작해 보세요.`,
        recommendations: starterProducts,
        citations: initialCitations,
        quickReplies: [
          '항공 기내 보조배터리·액체 규정 알려줘',
          '3분할 영수증 팝업 보기',
          '내 주문·배송 조회하기',
        ],
      },
    ]);
  }, [constraints, initialCitations, products]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const startDiagnosticFlow = () => {
    onChatStarted?.();
    setDiagCompleted(false);
    appendMessage({
      id: `user-diag-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: '맞춤여행 4단계 진단 시작할래요',
    });
    appendMessage({
      id: `bot-diag-1-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: '1/4단계: 어디로 떠나시나요? 목적지를 선택하면 주요 이동 수단과 최소 규정을 자동 설정해 드립니다.',
      diagnosticPrompt: { step: 'destination' },
      citations: initialCitations,
    });
  };

  const startRollCallFlow = () => {
    if (rollCallItems.length === 0) return;
    onChatStarted?.();
    setRollCallActive(true);
    setRollCallIndex(0);
    appendMessage({
      id: `user-rc-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: '기본 8종 점호 체크 시작할게요',
    });
    const first = rollCallItems[0];
    const prod = products.find((p) => p.id === first.productId);
    const firstEval = prod ? evaluateProductUnified(prod, { constraints, carrierPreset }) : null;
    appendMessage({
      id: `bot-rc-0-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: `[기본 8종 점호 1/${rollCallItems.length}] ${first.name}\n${first.question}`,
      rollCallPrompt: { index: 0, total: rollCallItems.length, item: first },
      recommendations: prod && firstEval
        ? [
            {
              product: prod,
              compatibilityStatus: firstEval.status,
              compatibilityNote: firstEval.note,
            },
          ]
        : undefined,
      citations: initialCitations,
    });
  };

  const MODE_KR_LABELS: Record<TransportModeId, string> = {
    walk: '도보',
    car: '자가용',
    subway: '지하철',
    bus: '버스',
    train: '철도(KTX·SRT)',
    ship: '배(여객선)',
    flight: '항공(기내)',
  };

  const handleDiagnosticChoice = (
    step: 'destination' | 'duration' | 'theme' | 'companion',
    value: string,
    defaultModes?: TransportModeId[]
  ) => {
    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    appendMessage({
      id: `u-d-${Date.now()}`,
      role: 'user',
      timestamp: nowTime,
      text: value,
    });

    if (step === 'destination') {
      const matchedDest = presets?.destinations.find((d) => d.label === value);
      const inferred = matchedDest
        ? { defaultModes: matchedDest.defaultModes, tip: matchedDest.tip }
        : detectCustomDestinationCourse(value);
      const nextModes = defaultModes && defaultModes.length > 0 ? defaultModes : inferred.defaultModes;
      const stepConstraints = computeStrictestTransitRule(nextModes);
      const stepCitations = buildLocalCitations(stepConstraints);
      onUpdateTripContext({ destination: value }, nextModes);
      appendMessage({
        id: `b-d2-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: `[1/4 완료 · ${value}] 주요 이동 수단(${nextModes.map((m) => MODE_KR_LABELS[m]).join(' + ')})과 최소단위 규정(${stepConstraints.headlineSummary})이 반영되었습니다.\nFact 팁: ${inferred.tip}\n\n2/4단계: 여행 일정은 어느 정도인가요?`,
        diagnosticPrompt: { step: 'duration' },
        citations: stepCitations,
      });
    } else if (step === 'duration') {
      const matchedDur = presets?.durations.find((d) => d.label === value);
      onUpdateTripContext({ duration: value });
      appendMessage({
        id: `b-d3-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: `[2/4 완료 · ${value}] ${matchedDur?.tip || '일정에 맞춰 적재 부피와 여벌 의류 기준을 조정했습니다.'}\n\n3/4단계: 이번 여행의 핵심 테마를 골라주세요.`,
        diagnosticPrompt: { step: 'theme' },
        citations: initialCitations,
      });
    } else if (step === 'theme') {
      const matchedTheme = presets?.themes.find((t) => t.label === value);
      const isBiz = value.includes('비즈니스') || value.includes('출장');
      const nextDefaultCompanion = isBiz ? '혼자 출장' : '친구·연인';
      const needsCompanionSwitch =
        (isBiz && !tripContext.companion.includes('출장') && !tripContext.companion.includes('거래처')) ||
        (!isBiz && (tripContext.companion.includes('출장') || tripContext.companion.includes('거래처')));
      onUpdateTripContext(
        needsCompanionSwitch ? { theme: value, companion: nextDefaultCompanion } : { theme: value }
      );
      appendMessage({
        id: `b-d4-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: isBiz
          ? `[3/4 완료 · ${value}] ${matchedTheme?.tip || '비즈니스·출장 동선에 맞춘 초경량 수납과 고속 충전 구성을 연결합니다.'}\n\n마지막 4/4단계: 출장 동행 형태를 선택해 주세요.`
          : `[3/4 완료 · ${value}] ${matchedTheme?.tip || '테마에 맞춘 전용 소품과 규정 적합 준비물을 연결합니다.'}\n\n마지막 4/4단계: 누구와 함께 떠나시나요?`,
        diagnosticPrompt: { step: 'companion', isBusiness: isBiz },
        citations: initialCitations,
      });
    } else {
      const matchedComp =
        presets?.businessCompanions?.find((c) => c.label === value) ||
        presets?.companions.find((c) => c.label === value);
      const isBizFlow =
        tripContext.theme.includes('비즈니스') ||
        tripContext.theme.includes('출장') ||
        value.includes('출장') ||
        value.includes('거래처');
      onUpdateTripContext({ companion: value });
      setDiagCompleted(true);
      onTrackEvent({ type: 'diagnostic_complete', detail: `${tripContext.destination} / ${value}` });

      const activeConstraints = constraints || computeStrictestTransitRule(selectedModes);
      const activeCitations = buildLocalCitations(activeConstraints);
      const themePreset = presets?.themes.find((t) => t.label === tripContext.theme);

      let extraIds = themePreset?.extraProductIds || ['railbag-carrier', 'power-bank-10k'];
      if (isBizFlow) {
        if (value.includes('거래처') || value.includes('바이어') || value.includes('의전')) {
          extraIds = ['railbag-carrier', 'sling-messenger', 'apparel-cubes', 'passport-wallet', 'fast-charger'];
        } else if (value.includes('동료') || value.includes('팀')) {
          extraIds = ['travel-backpack', 'fast-charger', 'adapter-scale', 'power-bank-10k'];
        } else {
          extraIds = ['railbag-carrier', 'fast-charger', 'power-bank-10k', 'passport-wallet'];
        }
      }

      const baseCandidateIds = Array.from(
        new Set([...extraIds, 'railbag-carrier', 'apparel-cubes', 'power-bank-10k', 'toothbrush-kit'])
      );
      const recs = baseCandidateIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is CatalogProduct => Boolean(p))
        .slice(0, 3)
        .map((p) => {
          const ev = evaluateProductUnified(p, { constraints: activeConstraints, carrierPreset });
          return {
            product: p,
            compatibilityStatus: ev.status,
            compatibilityNote: ev.note,
          };
        });

      const localSuggs: LocalConversionNode[] = [];
      if (isBizFlow) {
        localSuggs.push(LOCAL_CONVERSION_NODES[1]);
        if (selectedModes.includes('flight') || tripContext.duration.includes('3박') || tripContext.duration.includes('장거리')) {
          localSuggs.push(LOCAL_CONVERSION_NODES[0]);
        }
      } else {
        if (selectedModes.includes('flight') || tripContext.duration.includes('3박') || tripContext.duration.includes('장거리')) {
          localSuggs.push(LOCAL_CONVERSION_NODES[0]);
        }
        if (tripContext.duration.includes('3박') || tripContext.duration.includes('장거리')) {
          localSuggs.push(LOCAL_CONVERSION_NODES[2]);
        } else if (selectedModes.includes('walk') || selectedModes.includes('train')) {
          localSuggs.push(LOCAL_CONVERSION_NODES[3]);
        }
      }

      onCompleteDiagnostic?.({
        destination: tripContext.destination,
        duration: tripContext.duration,
        theme: tripContext.theme,
        companion: value,
        modes: selectedModes,
        extraProductIds: extraIds,
      });

      appendMessage({
        id: `b-done-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: `${isBizFlow ? '맞춤 비즈니스·출장 진단' : '맞춤 여행 진단'}이 완료되었습니다! (${tripContext.destination} · ${tripContext.duration} · ${tripContext.theme} · ${value})\n• 적용 최소규정: ${activeConstraints.headlineSummary}\n• 동행 팁: ${matchedComp?.tip || '동행 인원에 맞춰 공용 소품을 분리 수납하세요.'}\n\n오른쪽(모바일은 하단) '테트리스 용량 게이지'와 '3분할 체크리스트(챙길짐·살물건·현지조달)'가 이 코스 기준으로 즉시 갱신되었습니다.`,
        recommendations: recs,
        localConversions: localSuggs.slice(0, 2),
        citations: activeCitations,
        quickReplies: [
          '3분할 영수증 팝업 보기',
          '기본 8종 점호 바로 시작',
          '현지 조달로 무게 줄이는 법 알려줘',
        ],
      });
    }
  };

  const handleRollCallAnswer = (item: RollCallItem, idx: number, choice: 'have' | 'buy' | 'local') => {
    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const choiceLabel =
      choice === 'have'
        ? '집에 있어요 (챙길 목록)'
        : choice === 'buy'
        ? '여기서 살래요 (추천 상품)'
        : '현지에서 살게요 (현지 전환)';

    appendMessage({
      id: `u-rc-${Date.now()}`,
      role: 'user',
      timestamp: nowTime,
      text: `${item.name}: ${choiceLabel}`,
    });

    onStartRollCallResult(item, choice);

    const nextIdx = idx + 1;
    if (nextIdx < rollCallItems.length) {
      setRollCallIndex(nextIdx);
      const nextItem = rollCallItems[nextIdx];
      const nextProd = products.find((p) => p.id === nextItem.productId);
      const nextEval = nextProd ? evaluateProductUnified(nextProd, { constraints, carrierPreset }) : null;
      appendMessage({
        id: `b-rc-${nextIdx}-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: `[기본 8종 점호 ${nextIdx + 1}/${rollCallItems.length}] ${nextItem.name}\n${nextItem.question}`,
        rollCallPrompt: { index: nextIdx, total: rollCallItems.length, item: nextItem },
        recommendations: nextProd && nextEval
          ? [
              {
                product: nextProd,
                compatibilityStatus: nextEval.status,
                compatibilityNote: nextEval.note,
              },
            ]
          : undefined,
        citations: initialCitations,
      });
    } else {
      setRollCallActive(false);
      onTrackEvent({ type: 'rollcall_complete', detail: '8종 점호 완료' });
      appendMessage({
        id: `b-rc-end-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        text: `기본 8종 점호가 모두 완료되었습니다! 오른쪽(모바일은 하단) 테트리스 용량 게이지와 3분할 체크리스트 영수증에 실시간 반영되었어요. 장바구니 결제나 추가 규정 질문을 이어가 보세요.`,
        citations: initialCitations,
        quickReplies: [
          '3분할 영수증 팝업 보기',
          '내 장바구니 무게 적당한지 봐줘',
          '기내 액체류 100ml 규정 자세히',
        ],
      });
    }
  };

  const sendChatQuery = async (textToSend: string, overrideModes?: TransportModeId[]) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    onChatStarted?.();

    if (trimmed === '맞춤여행 4단계 진단 시작') {
      startDiagnosticFlow();
      return;
    }
    if (trimmed === '기본 8종 점호 바로 시작') {
      startRollCallFlow();
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const effectiveModes =
      overrideModes && overrideModes.length > 0 ? overrideModes : selectedModes;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 13000);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          modes: effectiveModes,
          context: tripContext,
          history: historyPayload,
        }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();
      let data: {
        answer?: string;
        recommendations?: ChatMessage['recommendations'];
        localConversions?: ChatMessage['localConversions'];
        citations?: ChatMessage['citations'];
        quickReplies?: string[];
        uncertaintyNotice?: boolean;
        suggestOpenMyPage?: boolean;
        error?: string;
      } | null = null;

      if (contentType.includes('application/json') && rawText.trim().startsWith('{')) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data || !data.answer) {
        const localResult = queryLocalKnowledgeGraphRag(trimmed, effectiveModes, products, tripContext);
        const quickReplies = [...localResult.quickReplies];
        if (localResult.suggestOpenMyPage && !quickReplies.some((q) => q.includes('마이페이지'))) {
          quickReplies.unshift('마이페이지(주문·배송) 바로 열기');
        }
        onSyncChatResults?.(localResult.recommendations, localResult.localConversions);
        appendMessage({
          id: `b-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          text: localResult.answer,
          recommendations: localResult.recommendations,
          localConversions: localResult.localConversions,
          citations: localResult.citations,
          quickReplies: quickReplies.slice(0, 3),
          uncertaintyNotice: localResult.uncertaintyNotice,
        });
        return;
      }

      const quickReplies: string[] = Array.isArray(data.quickReplies) ? [...data.quickReplies] : [];
      if (data.suggestOpenMyPage) {
        quickReplies.unshift('마이페이지(주문·배송) 바로 열기');
      }

      onSyncChatResults?.(data.recommendations || [], data.localConversions || []);
      appendMessage({
        id: `b-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: data.answer,
        recommendations: data.recommendations || [],
        localConversions: data.localConversions || [],
        citations: data.citations || initialCitations,
        quickReplies: quickReplies.slice(0, 3),
        uncertaintyNotice: Boolean(data.uncertaintyNotice),
      });
    } catch {
      const localResult = queryLocalKnowledgeGraphRag(trimmed, effectiveModes, products, tripContext);
      const quickReplies = [...localResult.quickReplies];
      if (localResult.suggestOpenMyPage && !quickReplies.some((q) => q.includes('마이페이지'))) {
        quickReplies.unshift('마이페이지(주문·배송) 바로 열기');
      }
      onSyncChatResults?.(localResult.recommendations, localResult.localConversions);
      appendMessage({
        id: `b-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: localResult.answer,
        recommendations: localResult.recommendations,
        localConversions: localResult.localConversions,
        citations: localResult.citations,
        quickReplies: quickReplies.slice(0, 3),
        uncertaintyNotice: localResult.uncertaintyNotice,
      });
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!externalAction || externalAction.id === lastExternalIdRef.current) return;
    lastExternalIdRef.current = externalAction.id;
    window.setTimeout(() => {
      chatInputRef.current?.focus({ preventScroll: true });
    }, 180);
    if (externalAction.kind === 'diagnostic') {
      startDiagnosticFlow();
    } else if (externalAction.kind === 'prompt' && externalAction.prompt) {
      void sendChatQuery(externalAction.prompt, externalAction.modes);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendChatQuery(input);
  };

  return (
    <div
      id="ai-workspace"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden"
    >
      {/* Top Chat Action Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              집밖은여행 Gemini AI 스마트 컨시어지
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              지식 그래프 공식 규정 · 실시간 카탈로그 기반 팩트 검증 응답
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startDiagnosticFlow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>{diagCompleted ? '진단 다시하기' : '4단계 여행진단'}</span>
          </button>
          <button
            type="button"
            onClick={startRollCallFlow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <ListChecks className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
            <span>{rollCallActive ? `점호 ${rollCallIndex + 1}/8` : '기본 8종 점호'}</span>
          </button>
        </div>
      </div>

      {/* Trip Context Strip */}
      <div className="px-4 sm:px-5 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>
            현재 플랜: <strong className="text-[var(--text-primary)]">{tripContext.destination}</strong> ·{' '}
            {tripContext.duration} · {tripContext.theme} · {tripContext.companion}
          </span>
          {packMetrics && (
            <span className="font-mono-num text-[11px] text-[var(--brand-primary)] font-semibold">
              · {packMetrics.carrierShortLabel} 적재율 {packMetrics.loadPercent}% ({packMetrics.estimatedPackWeight}kg)
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            initializedRef.current = false;
            setMessages([]);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          대화 초기화
        </button>
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 p-4 sm:p-5 space-y-5 max-h-[68vh] min-h-[420px] overflow-y-auto thin-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[94%] sm:max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                  : msg.role === 'system-error'
                  ? 'bg-rose-500/10 border border-rose-500/30 text-[var(--text-primary)] rounded-bl-sm'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-bl-sm'
              }`}
            >
              {msg.role === 'system-error' && (
                <div className="flex items-center gap-1.5 font-semibold text-rose-600 mb-1 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>AI 응답 연결 오류</span>
                </div>
              )}
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Inline 4-Step Diagnostic Interactive Chips */}
              {msg.diagnosticPrompt && presets && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  {/* 4-Step Progress Bar */}
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    {[
                      { id: 'destination', label: '01 목적지' },
                      { id: 'duration', label: '02 일정' },
                      { id: 'theme', label: '03 테마' },
                      { id: 'companion', label: '04 동행' },
                    ].map((st) => {
                      const active = msg.diagnosticPrompt?.step === st.id;
                      return (
                        <div
                          key={st.id}
                          className={`rounded-lg px-2 py-1 text-center font-semibold border ${
                            active
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                          }`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>

                  {msg.diagnosticPrompt.step === 'destination' && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                          국내 주요 권역
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {presets.destinations
                            .filter((d) => d.regionGroup !== 'overseas')
                            .map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => handleDiagnosticChoice('destination', d.label, d.defaultModes)}
                                className="text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 hover:border-[var(--brand-primary)] transition cursor-pointer"
                              >
                                <div className="text-xs font-bold text-[var(--text-primary)]">{d.label}</div>
                                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{d.sub}</div>
                              </button>
                            ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                          해외 권역
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {presets.destinations
                            .filter((d) => d.regionGroup === 'overseas')
                            .map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => handleDiagnosticChoice('destination', d.label, d.defaultModes)}
                                className="text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 hover:border-[var(--brand-primary)] transition cursor-pointer"
                              >
                                <div className="text-xs font-bold text-[var(--text-primary)]">{d.label}</div>
                                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{d.sub}</div>
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customDestInput}
                          onChange={(e) => setCustomDestInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customDestInput.trim()) {
                              e.preventDefault();
                              handleDiagnosticChoice('destination', customDestInput.trim());
                              setCustomDestInput('');
                            }
                          }}
                          placeholder="기타 지역 직접 입력 (예: 포항, 오사카, 파리, 다낭)"
                          className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customDestInput.trim()) return;
                            handleDiagnosticChoice('destination', customDestInput.trim());
                            setCustomDestInput('');
                          }}
                          className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.diagnosticPrompt.step === 'duration' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {presets.durations.map((dur) => (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => handleDiagnosticChoice('duration', dur.label)}
                          className="text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--brand-primary)] transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">{dur.label}</div>
                          {dur.tip && (
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{dur.tip}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.diagnosticPrompt.step === 'theme' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {presets.themes.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => handleDiagnosticChoice('theme', th.label)}
                          className="text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--brand-primary)] transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">{th.label}</div>
                          {th.tip && (
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{th.tip}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.diagnosticPrompt.step === 'companion' && (() => {
                    const useBizCompanions =
                      msg.diagnosticPrompt?.isBusiness ??
                      (tripContext.theme.includes('비즈니스') || tripContext.theme.includes('출장'));
                    const companionOptions = useBizCompanions
                      ? presets.businessCompanions || [
                          {
                            id: 'biz-solo',
                            label: '혼자 출장',
                            tip: '단독 이동·환승·물품보관함 중심 초경량 1인 비즈니스 패킹을 추천합니다.',
                          },
                          {
                            id: 'biz-team',
                            label: '동료·팀 출장',
                            tip: '충전·어댑터·업무/공용 장비를 분담해 짐 무게를 줄여 보세요.',
                          },
                          {
                            id: 'biz-client',
                            label: '거래처·바이어·의전 동행',
                            tip: '구김 방지 복장·비즈니스/회의 필수품 및 단정한 수납을 추천합니다.',
                          },
                        ]
                      : presets.companions;

                    return (
                      <div className="space-y-2">
                        {useBizCompanions && (
                          <div className="text-[11px] font-semibold text-[var(--brand-primary)]">
                            비즈니스·출장 전용 동행 유형
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {companionOptions.map((cp) => (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => handleDiagnosticChoice('companion', cp.label)}
                              className="text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--brand-primary)] transition cursor-pointer"
                            >
                              <div className="text-xs font-bold text-[var(--text-primary)]">{cp.label}</div>
                              {cp.tip && (
                                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{cp.tip}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Inline 8-Item Roll Call Action Buttons */}
              {msg.rollCallPrompt && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleRollCallAnswer(msg.rollCallPrompt!.item, msg.rollCallPrompt!.index, 'have')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                    집에 있어요
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleRollCallAnswer(msg.rollCallPrompt!.item, msg.rollCallPrompt!.index, 'buy')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)] cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    여기서 살래요 (추천 담기)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleRollCallAnswer(msg.rollCallPrompt!.item, msg.rollCallPrompt!.index, 'local')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600/40 bg-teal-600/10 px-3 py-1.5 text-xs font-semibold text-[var(--brand-accent)] hover:bg-teal-600/20 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    현지에서 살게요 (짐 줄이기)
                  </button>
                </div>
              )}

              {/* Embedded Grounded Product Recommendation Mini-Cards */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 space-y-2.5">
                  {msg.recommendations.map(({ product }) => {
                    const variantIdx = selectedCardVariants[product.id] ?? 0;
                    const variant = product.variants[variantIdx] || product.variants[0];
                    const finalPrice = product.basePrice + (variant?.priceDelta || 0);
                    const liveEval = evaluateProductUnified(product, {
                      constraints,
                      carrierPreset,
                      variantIdx,
                    });

                    return (
                      <div
                        key={`${msg.id}-${product.id}`}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 flex flex-col sm:flex-row gap-3"
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          onClick={() => onSelectProduct(product)}
                          className="w-full sm:w-20 h-32 sm:h-20 rounded-lg object-cover shrink-0 cursor-pointer bg-[var(--bg-elevated)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectProduct(product)}
                              className="text-left text-xs sm:text-sm font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition cursor-pointer"
                            >
                              {product.name}
                            </button>
                            <span className="font-mono-num text-xs sm:text-sm font-bold text-[var(--text-primary)] shrink-0">
                              {finalPrice.toLocaleString()}원
                            </span>
                          </div>

                          <div className="mt-1 text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                                liveEval.status === 'exceeds'
                                  ? 'bg-rose-500/10 text-[var(--status-danger)]'
                                  : liveEval.status === 'caution'
                                  ? 'bg-amber-500/10 text-[var(--status-warn)]'
                                  : 'bg-teal-600/10 text-[var(--status-pass)]'
                              }`}
                            >
                              {liveEval.badgeLabel}
                            </span>
                            <span>· {liveEval.note}</span>
                          </div>

                          {product.variants.length > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {product.variants.map((v, vIdx) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedCardVariants((prev) => ({
                                      ...prev,
                                      [product.id]: vIdx,
                                    }))
                                  }
                                  className={`rounded-md px-2 py-1 text-[11px] border cursor-pointer ${
                                    variantIdx === vIdx
                                      ? 'border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)] font-semibold'
                                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {v.label.split(' (')[0]}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onQuickAddCart(product, variantIdx, 0)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--brand-primary-hover)] cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              장바구니 담기
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectProduct(product)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                            >
                              상세·옵션 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Local Procurement Conversion Cards */}
              {msg.localConversions && msg.localConversions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.localConversions.map((loc) => (
                    <div
                      key={`${msg.id}-${loc.id}`}
                      className="rounded-xl border border-teal-600/30 bg-teal-600/5 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[var(--brand-accent)] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {loc.title}
                        </span>
                        <span className="font-mono-num text-[11px] font-semibold text-[var(--text-secondary)]">
                          -{loc.weightSavedKg}kg 절감
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] mb-2">{loc.reason}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {loc.channelType} · {loc.estimatedLocalCost}
                        </span>
                        <button
                          type="button"
                          onClick={() => onApplyLocalConversion(loc)}
                          className="rounded-lg bg-[var(--brand-accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer"
                        >
                          {loc.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Follow-Up Chips */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.quickReplies.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => {
                        if (qr.includes('영수증')) {
                          onOpenReceiptModal?.();
                        } else if (qr.includes('마이페이지') || qr.includes('주문·배송 조회')) {
                          onOpenMyPage();
                        } else {
                          void sendChatQuery(qr);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--brand-primary)] hover:bg-[var(--brand-tint)] transition cursor-pointer"
                    >
                      {qr.includes('영수증') && <ReceiptText className="w-3.5 h-3.5" />}
                      {qr.includes('마이페이지') && <PackageSearch className="w-3.5 h-3.5" />}
                      <span>{qr}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Portfolio Demo Notice on Welcome Bubble */}
              {msg.id === 'welcome-1' && (
                <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  안내 (jibak-eun-travel): 본 사이트는 실제 상용 서비스가 아닌 개인 포트폴리오·개발 시연용 프로젝트입니다. 주문·결제 및 데이터는 테스트/시연 목적으로 동작합니다.
                </div>
              )}

              {/* Fixed Fact-First Citation Footer on Every AI Answer */}
              {msg.role !== 'user' && msg.citations && (
                <FactCitationFooter
                  citations={msg.citations}
                  uncertaintyNotice={msg.uncertaintyNotice}
                  onSourceClick={(sourceName, url) =>
                    onTrackEvent({ type: 'source_click', detail: `${sourceName} (${url})` })
                  }
                />
              )}
            </div>
            <span className="mt-1 px-1 text-[10px] text-[var(--text-muted)] font-mono-num">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-xs text-[var(--text-secondary)]">
              지식 그래프 규정과 실시간 상품 카탈로그를 대조해 답변을 구성하고 있습니다...
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* 5 Recommended Scenario Pills Above Input */}
      <div className="px-3 sm:px-4 pt-2.5 pb-2 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            추천 질문 5 (클릭 시 즉시 RAG 규정·상품 조회)
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap thin-scroll pb-1 sm:pb-0">
          {RECOMMENDED_QUICK_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={loading}
              onClick={() => {
                setInput(item.prompt);
                if (item.contextPatch || item.modes.length > 0) {
                  onUpdateTripContext(item.contextPatch || {}, item.modes);
                }
                window.requestAnimationFrame(() => {
                  void sendChatQuery(item.prompt, item.modes);
                });
              }}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary)] transition cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal text-left disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center gap-2"
      >
        <input
          ref={chatInputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 항공+도보 제주 2박3일인데 보조배터리와 세면용품 규정 맞춰 추천해줘"
          className="flex-1 min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">전송</span>
        </button>
      </form>
    </div>
  );
};
