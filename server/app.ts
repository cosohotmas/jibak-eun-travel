import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  DIAGNOSTIC_PRESETS,
  LOCAL_CONVERSION_NODES,
  OFFICIAL_SOURCES,
  REGULATION_NODES,
  ROLL_CALL_ITEMS,
  TRANSPORT_MODE_LABELS,
  buildCitationsFromConstraints,
  computeStrictestConstraints,
  evaluateProductAgainstConstraints,
  getLiveCatalogForGemini,
  retrieveGroundedContext,
  storeRuntime,
} from './knowledgeGraph.js';
import type {
  CatalogProduct,
  ChatRecommendationCard,
  HeroSlide,
  LocalConversionNode,
  TransportModeId,
} from '../src/types/domain.js';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY가 서버 환경 변수에 설정되지 않았습니다. 환경 변수 설정을 확인해 주세요.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- Stateless HMAC-signed Admin Session (Vercel serverless & single-process compatible) ---
const fallbackSessionSecret = crypto.randomBytes(32);
const revokedTokens = new Set<string>();
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function getSessionSecret(): Buffer {
  const envSecret = process.env.SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }
  return fallbackSessionSecret;
}

function issueAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      jti: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + ADMIN_SESSION_TTL_MS,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function validateAdminToken(authHeader?: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  if (!token || revokedTokens.has(token)) return false;

  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return false;

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number; role?: string };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && Date.now() <= parsed.exp;
  } catch {
    return false;
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!validateAdminToken(req.headers.authorization)) {
    res.status(401).json({ error: '관리자 인증 세션이 만료되었거나 유효하지 않습니다.' });
    return;
  }
  next();
}

function sanitizeModes(input: unknown): TransportModeId[] {
  const allowed: TransportModeId[] = ['walk', 'car', 'subway', 'bus', 'train', 'ship', 'flight'];
  if (!Array.isArray(input)) return ['train', 'walk'];
  const filtered = input.filter((m): m is TransportModeId => typeof m === 'string' && allowed.includes(m as TransportModeId));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['train', 'walk'];
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'jibak-eun-travel', timestamp: new Date().toISOString() });
  });

  // --- Storefront Bootstrap ---
  app.get('/api/store/bootstrap', (_req, res) => {
    const defaultModes: TransportModeId[] = ['train', 'walk'];
    const constraints = computeStrictestConstraints(defaultModes);
    const citations = buildCitationsFromConstraints(constraints);
    const products = getLiveCatalogForGemini();

    res.json({
      products,
      banners: storeRuntime.banners.filter((b) => b.active),
      heroSlides: storeRuntime.heroSlides.filter((s) => s.active),
      presets: DIAGNOSTIC_PRESETS,
      rollCallItems: ROLL_CALL_ITEMS,
      officialSources: OFFICIAL_SOURCES,
      localConversions: LOCAL_CONVERSION_NODES,
      transportLabels: TRANSPORT_MODE_LABELS,
      constraints,
      citations,
    });
  });

  // --- Knowledge Graph Regulation Engine ---
  app.post('/api/graph/constraints', (req, res) => {
    const modes = sanitizeModes(req.body?.modes);
    const constraints = computeStrictestConstraints(modes);
    const citations = buildCitationsFromConstraints(constraints);
    const catalog = getLiveCatalogForGemini();
    const evaluations: Record<string, { status: 'pass' | 'caution' | 'exceeds'; note: string }> = {};
    catalog.forEach((p) => {
      evaluations[p.id] = evaluateProductAgainstConstraints(p, constraints);
    });

    storeRuntime.addLog(
      'ai_rag_regulation',
      'Knowledge Graph Engine',
      `이동 수단(${modes.map((m) => TRANSPORT_MODE_LABELS[m]).join('+')}) 최소규정 재계산`,
      constraints.headlineSummary,
      constraints.regulations.map((r) => r.id),
      'info'
    );

    res.json({ constraints, citations, evaluations });
  });

  // --- Knowledge Graph + RAG Gemini Chatbot ---
  app.post('/api/chat', async (req, res) => {
    try {
      const userMessage = String(req.body?.message ?? '').trim();
      if (!userMessage) {
        res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
        return;
      }

      const modes = sanitizeModes(req.body?.modes);
      const context = req.body?.context ?? {};
      const historyInput = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];

      const { constraints, candidateProducts, relevantLocals } = retrieveGroundedContext(userMessage, modes);
      const citations = buildCitationsFromConstraints(constraints);
      const liveCatalog = getLiveCatalogForGemini();

      const catalogJson = candidateProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        basePriceKRW: p.basePrice,
        stock: p.stock,
        weightKg: p.weightKg,
        dimensionsCm: p.dimensionsCm,
        sumCm: p.sumCm,
        liquidMl: p.liquidMl,
        batteryWh: p.batteryWh,
        variants: p.variants.map((v) => ({ id: v.id, label: v.label, price: p.basePrice + v.priceDelta, spec: v.specText })),
        compatibility: evaluateProductAgainstConstraints(p, constraints),
        localConversionId: p.localConversionId,
      }));

      const localJson = relevantLocals.map((l) => ({
        id: l.id,
        title: l.title,
        triggerCondition: l.triggerCondition,
        reason: l.reason,
        channelType: l.channelType,
        estimatedLocalCost: l.estimatedLocalCost,
        weightSavedKg: l.weightSavedKg,
      }));

      const regsJson = constraints.regulations.map((r) => ({
        id: r.id,
        modeLabel: r.modeLabel,
        title: r.title,
        summary: r.summary,
        maxWeightKg: r.maxWeightKg,
        maxSumCm: r.maxSumCm,
        maxLiquidMl: r.maxLiquidMl,
        maxBatteryWh: r.maxBatteryWh,
        legalNote: r.legalNote,
        sourceName: r.source.name,
        verifiedDate: r.source.verifiedDate,
      }));

      const systemInstruction = `당신은 '집밖은여행'의 지식 그래프·RAG 기반 스마트 여행 준비물 전문 어시스턴트입니다.
[할루시네이션 절대 금지 원칙]
1. 이동 수단별 규정 수치(kg, cm, ml, Wh, 도로교통법 제39조 등)는 반드시 아래 [지식 그래프 최소단위 규정]에 있는 값만 인용하세요. 없는 항공사 세부 수수료나 특이 운송 조건을 지어내지 마세요.
2. 지식 그래프에 없는 항공사/특수 수하물/해외 세관 질문이 나오면 registered range(등록된 공식 기준)만 말하고 uncertaintyNotice=true로 설정해 공식 원문 확인을 안내하세요.
3. 추천 상품 ID(recommendedProductIds)는 반드시 [실시간 카탈로그 후보]의 'id' 중에서만 1~3개 고르세요. 카탈로그에 없는 상품명이나 임의 가격을 만들지 마세요.
4. 현지 구매·체험 전환 ID(localConversionIds)는 반드시 [현지 전환 노드]의 'id' 중에서만 0~2개 고르세요.
5. 사용자가 '주문 조회', '배송', '운송장', '내 체크리스트'를 물으면 suggestOpenMyPage=true로 설정하고 마이페이지에서 실시간 배송·문의 확인 가능함을 안내하세요.
6. 한국어로 친절하고 간결하게 핵심 근거를 들어 설명하세요.`;

      const promptPayload = `
[사용자 현재 여행 컨텍스트]
- 선택 이동수단: ${modes.map((m) => TRANSPORT_MODE_LABELS[m]).join(', ')}
- 가장 엄격한 최소규정 요약: ${constraints.headlineSummary}
- 여행 정보: 목적지=${context.destination || '미정'}, 일정=${context.duration || '미정'}, 테마=${context.theme || '미정'}, 동행=${context.companion || '미정'}, 현재 적재율=${context.loadPercent ?? 0}%

[지식 그래프 최소단위 규정]
${JSON.stringify(regsJson, null, 2)}

[실시간 카탈로그 후보 (검증된 판매 상품)]
${JSON.stringify(catalogJson, null, 2)}

[현지 전환 노드]
${JSON.stringify(localJson, null, 2)}

[최근 대화]
${historyInput.map((h: { role?: string; text?: string }) => `${h.role === 'user' ? '사용자' : 'AI'}: ${String(h.text || '').slice(0, 220)}`).join('\n')}

[사용자 질문]
${userMessage}
`;

      const ai = createGeminiClient();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini AI 응답 시간이 초과되었습니다.')), 12000)
      );
      const response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: promptPayload,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: {
                  type: Type.STRING,
                  description: '지식 그래프 수치와 실시간 카탈로그 사실에만 근거한 한국어 답변',
                },
                recommendedProductIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '실시간 카탈로그 후보에서 고른 상품 ID 목록 (최대 3개)',
                },
                localConversionIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '현지 전환 노드에서 고른 ID 목록 (최대 2개)',
                },
                quickReplies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '사용자가 이어서 누를 수 있는 짧은 후속 질문 칩 (2~3개)',
                },
                uncertaintyNotice: {
                  type: Type.BOOLEAN,
                  description: '지식 그래프 범위 밖의 항공사별·특수 조건 질문인 경우 true',
                },
                suggestOpenMyPage: {
                  type: Type.BOOLEAN,
                  description: '주문/배송/문의 조회 요청이면 true',
                },
              },
              required: ['answer', 'recommendedProductIds', 'localConversionIds', 'quickReplies', 'uncertaintyNotice'],
            },
          },
        }),
        timeoutPromise,
      ]);

      const rawText = (response.text ?? '').trim();
      let parsed: {
        answer?: string;
        recommendedProductIds?: string[];
        localConversionIds?: string[];
        quickReplies?: string[];
        uncertaintyNotice?: boolean;
        suggestOpenMyPage?: boolean;
      };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          answer: rawText || '조회된 지식 그래프 규정을 확인해 주세요.',
          recommendedProductIds: candidateProducts.slice(0, 2).map((p) => p.id),
          localConversionIds: [],
          quickReplies: ['20인치 캐리어 규격 확인', '100ml 이하 위생 키트 보기'],
          uncertaintyNotice: false,
          suggestOpenMyPage: false,
        };
      }

      // Strict Server-Side Anti-Hallucination Binding: ONLY allow IDs present in live catalog & graph
      const validProductsMap = new Map<string, CatalogProduct>(liveCatalog.map((p) => [p.id, p]));
      const verifiedRecs: ChatRecommendationCard[] = [];
      for (const id of parsed.recommendedProductIds || []) {
        const prod = validProductsMap.get(id);
        if (prod && !verifiedRecs.some((r) => r.product.id === prod.id)) {
          const evalResult = evaluateProductAgainstConstraints(prod, constraints);
          verifiedRecs.push({
            product: prod,
            compatibilityStatus: evalResult.status,
            compatibilityNote: evalResult.note,
          });
        }
        if (verifiedRecs.length >= 3) break;
      }

      const validLocalsMap = new Map<string, LocalConversionNode>(LOCAL_CONVERSION_NODES.map((l) => [l.id, l]));
      const verifiedLocals: LocalConversionNode[] = [];
      for (const id of parsed.localConversionIds || []) {
        const loc = validLocalsMap.get(id);
        if (loc && !verifiedLocals.some((l) => l.id === loc.id)) {
          verifiedLocals.push(loc);
        }
        if (verifiedLocals.length >= 2) break;
      }

      const nodeIdsLogged = [
        ...constraints.regulations.map((r) => r.id),
        ...constraints.sources.map((s) => s.id),
        ...verifiedRecs.map((r) => r.product.id),
        ...verifiedLocals.map((l) => l.id),
      ];

      storeRuntime.addLog(
        'ai_rag_regulation',
        'Gemini RAG Chatbot',
        `AI 질의 "${userMessage.slice(0, 32)}" → 추천 ${verifiedRecs.length}건 · 현지전환 ${verifiedLocals.length}건`,
        `최소규정: ${constraints.headlineSummary}`,
        nodeIdsLogged,
        parsed.uncertaintyNotice ? 'warning' : 'info'
      );

      if (verifiedLocals.length > 0) {
        storeRuntime.addLog(
          'local_alert',
          'Gemini RAG Chatbot',
          `현지 조달 전환 제안: ${verifiedLocals.map((l) => l.title).join(', ')}`,
          `질문: ${userMessage.slice(0, 40)}`,
          verifiedLocals.map((l) => l.id),
          'warning'
        );
      }

      res.json({
        answer: parsed.answer || '등록된 규정과 실시간 상품 정보를 기준으로 안내드립니다.',
        recommendations: verifiedRecs,
        localConversions: verifiedLocals,
        citations,
        quickReplies: (parsed.quickReplies || []).slice(0, 3),
        uncertaintyNotice: Boolean(parsed.uncertaintyNotice),
        suggestOpenMyPage: Boolean(parsed.suggestOpenMyPage),
        constraints,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gemini AI 응답 생성 중 오류가 발생했습니다.';
      console.error('[POST /api/chat error]', err);
      res.status(502).json({ error: msg });
    }
  });

  // --- Storefront Event / Funnel / Click Tracking ---
  app.post('/api/events/track', (req, res) => {
    const type = String(req.body?.type ?? '');
    const productId = req.body?.productId ? String(req.body.productId) : undefined;
    const localId = req.body?.localId ? String(req.body.localId) : undefined;
    const slideId = req.body?.slideId ? String(req.body.slideId) : undefined;
    const nodeIds: string[] = Array.isArray(req.body?.nodeIds)
      ? req.body.nodeIds.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
      : [];
    const amount = Number(req.body?.amount ?? 0);
    const detail = String(req.body?.detail ?? '');

    if (productId) {
      if (!storeRuntime.clickStats[productId]) {
        storeRuntime.clickStats[productId] = { views: 0, cartAdds: 0, localConverts: 0, sourceClicks: 0 };
      }
      if (type === 'product_view') storeRuntime.clickStats[productId].views += 1;
      if (type === 'cart_add') storeRuntime.clickStats[productId].cartAdds += 1;
      if (type === 'local_convert') storeRuntime.clickStats[productId].localConverts += 1;
      if (type === 'source_click') storeRuntime.clickStats[productId].sourceClicks += 1;
    }

    if (slideId && (type === 'hero_banner_click' || type === 'hero_hashtag_click')) {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      if (!storeRuntime.heroClickStats[slideId]) {
        storeRuntime.heroClickStats[slideId] = { bannerClicks: 0, hashtagClicks: 0, lastClickedAt: nowStr };
      }
      if (type === 'hero_banner_click') {
        storeRuntime.heroClickStats[slideId].bannerClicks += 1;
      } else {
        storeRuntime.heroClickStats[slideId].hashtagClicks += 1;
      }
      storeRuntime.heroClickStats[slideId].lastClickedAt = nowStr;
    }

    if (type === 'diagnostic_complete') storeRuntime.funnelCounters.diagnosticDone += 1;
    if (type === 'rollcall_complete') storeRuntime.funnelCounters.rollCallDone += 1;
    if (type === 'cart_add') {
      storeRuntime.funnelCounters.cartAdded += 1;
      storeRuntime.addLog('product_click_conversion', 'Storefront', `장바구니 담기: ${productId || '상품'}`, detail, productId ? [productId] : [], 'success');
    } else if (type === 'local_convert') {
      storeRuntime.addLog('local_alert', 'Storefront', `현지 조달 전환 선택: ${localId || detail}`, detail, [productId, localId].filter((v): v is string => Boolean(v)), 'warning');
    } else if (type === 'order_created') {
      storeRuntime.funnelCounters.ordersCompleted += 1;
      storeRuntime.extraOrders += 1;
      if (Number.isFinite(amount) && amount > 0) storeRuntime.extraRevenue += amount;
      storeRuntime.addLog('order_logistics', 'Firebase Checkout', `신규 주문 접수 (${amount.toLocaleString()}원)`, detail, [], 'success');
    } else if (type === 'source_click') {
      storeRuntime.addLog('ai_rag_regulation', 'Fact-First Badge', `공식 출처 원문 확인 클릭`, detail, [], 'info');
    } else if (type === 'hero_banner_click') {
      storeRuntime.addLog(
        'product_click_conversion',
        'Hero Banner CTA',
        `히어로 배너 CTA 클릭 (${slideId || 'banner'})`,
        detail,
        nodeIds,
        'info'
      );
    } else if (type === 'hero_hashtag_click') {
      storeRuntime.addLog(
        'ai_rag_regulation',
        'Hero Hashtag Chip',
        `히어로 해시태그 챗봇 연동 (${slideId || 'banner'})`,
        detail,
        nodeIds,
        'info'
      );
    }

    res.json({ ok: true });
  });

  // --- Admin Auth Endpoints (Mock-style: any number/code grants entry without storing password) ---
  app.get('/api/admin/auth/status', (_req, res) => {
    res.json({ envConfigured: false, needsSetup: false, mockAuth: true });
  });

  app.post('/api/admin/auth/setup', (req, res) => {
    const passcode = String(req.body?.passcode ?? '').trim();
    if (!passcode) {
      res.status(400).json({ error: '아무 번호나 입력해 주세요.' });
      return;
    }
    const token = issueAdminToken();
    storeRuntime.addLog('admin_audit', 'Admin Console', '관리자 콘솔 데모 입장', '간편 번호 인증 통과', [], 'info');
    res.json({ token });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const passcode = String(req.body?.passcode ?? '').trim();
    if (!passcode) {
      res.status(400).json({ error: '아무 번호나 입력해 주세요.' });
      return;
    }
    const token = issueAdminToken();
    storeRuntime.addLog('admin_audit', 'Admin Console', '관리자 콘솔 간편 입장 성공', '데모 세션 토큰 발급', [], 'info');
    res.json({ token });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      revokedTokens.add(header.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // --- Protected Admin Console APIs ---
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const baseRevenue = 48620000 + storeRuntime.extraRevenue;
    const baseOrders = 412 + storeRuntime.extraOrders;
    const operatingMarginRate = 0.31;
    const netMarginRate = 0.22;
    const operatingProfit = Math.round(baseRevenue * operatingMarginRate);
    const netProfit = Math.round(baseRevenue * netMarginRate);

    const hourlyRevenue = [
      { label: '00시', value: 420000 },
      { label: '04시', value: 210000 },
      { label: '08시', value: 1480000 },
      { label: '12시', value: 3890000 },
      { label: '16시', value: 5210000 },
      { label: '20시', value: 6420000 + storeRuntime.extraRevenue },
    ];

    const cohorts = [
      { cohort: '2026-08 신규', m1: 100, m2: 38, m3: 29, ltv: '142,000원' },
      { cohort: '2026-09 신규', m1: 100, m2: 42, m3: 33, ltv: '158,000원' },
      { cohort: '2026-10 신규', m1: 100, m2: 47, m3: null, ltv: '169,000원' },
      { cohort: '2026-11 AI유입', m1: 100, m2: null, m3: null, ltv: '184,000원' },
    ];

    const kgEdges = [
      ...REGULATION_NODES.map((r) => ({ from: r.id, to: r.sourceId, relation: 'VERIFIED_BY' })),
      ...storeRuntime.products.flatMap((p) =>
        p.regulationIds.map((regId) => ({ from: regId, to: p.id, relation: 'CONSTRAINS' }))
      ),
      ...storeRuntime.products
        .filter((p) => p.localConversionId)
        .map((p) => ({ from: p.id, to: p.localConversionId!, relation: 'CONVERTS_TO_LOCAL' })),
    ];

    res.json({
      kpis: {
        totalRevenue: baseRevenue,
        operatingProfit,
        netProfit,
        totalOrders: baseOrders,
        avgOrderValue: Math.round(baseRevenue / baseOrders),
        comparisons: {
          vsYesterday: '+14.2%',
          vsLastMonth: '+23.8%',
          vsLastYear: '+61.4%',
        },
        hourlyRevenue,
      },
      funnel: storeRuntime.funnelCounters,
      cohorts,
      products: storeRuntime.products,
      banners: storeRuntime.banners,
      heroSlides: storeRuntime.heroSlides,
      heroClickStats: storeRuntime.heroClickStats,
      automations: storeRuntime.automations,
      actionTasks: storeRuntime.actionTasks,
      clickStats: storeRuntime.clickStats,
      logs: storeRuntime.logs,
      knowledgeGraph: {
        sources: OFFICIAL_SOURCES,
        regulations: REGULATION_NODES,
        localConversions: LOCAL_CONVERSION_NODES,
        nodeHits: storeRuntime.nodeHits,
        edges: kgEdges,
      },
    });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body || {};
    const name = String(body.name ?? '').trim();
    const basePrice = Number(body.basePrice ?? 0);
    if (!name || !Number.isFinite(basePrice) || basePrice <= 0) {
      res.status(400).json({ error: '상품명과 올바른 판매가격을 입력해 주세요.' });
      return;
    }
    const id = `custom-${Date.now().toString(36)}`;
    const newProd: CatalogProduct = {
      id,
      name,
      category: body.category || '야외·필수',
      shortTag: String(body.shortTag || '규정 검증 신규 상품'),
      description: String(body.description || '관리자 콘솔에서 등록된 검증 여행 용품입니다.'),
      basePrice,
      originalPrice: Number(body.originalPrice) || Math.round(basePrice * 1.25),
      costPrice: Number(body.costPrice) || Math.round(basePrice * 0.45),
      stock: Number(body.stock) || 30,
      imageUrl: String(body.imageUrl || '/assets/aistudio/product_passport_wallet_1795351234025_cb90e7f2.jpg'),
      weightKg: Number(body.weightKg) || 0.3,
      dimensionsCm: String(body.dimensionsCm || '20×12×6'),
      sumCm: Number(body.sumCm) || 38,
      liquidMl: body.liquidMl ? Number(body.liquidMl) : null,
      batteryWh: body.batteryWh ? Number(body.batteryWh) : null,
      volumeUnits: Number(body.volumeUnits) || 6,
      colors: Array.isArray(body.colors) && body.colors.length ? body.colors : ['스탠다드 블랙'],
      variants: [
        {
          id: 'std',
          label: '기본 규격 옵션',
          specText: `${String(body.dimensionsCm || '20×12×6')}cm · ${Number(body.weightKg) || 0.3}kg`,
          weightKg: Number(body.weightKg) || 0.3,
          dimensionsCm: String(body.dimensionsCm || '20×12×6'),
          sumCm: Number(body.sumCm) || 38,
          priceDelta: 0,
          volumeUnits: Number(body.volumeUnits) || 6,
        },
      ],
      freeGift: String(body.freeGift || '전용 보관 파우치 증정'),
      exchangePolicy: '수령 후 7일 이내 미개봉 무료 교환·반품',
      regulationIds: ['reg-flight', 'reg-train'],
      localConversionId: null,
      recommendedModes: ['flight', 'train', 'walk', 'car'],
      active: true,
    };
    storeRuntime.products.unshift(newProd);
    storeRuntime.addLog('admin_audit', 'Admin Console', `신규 상품 등록: ${newProd.name}`, `${newProd.basePrice.toLocaleString()}원 · 재고 ${newProd.stock}`, [id], 'success');
    res.json({ product: newProd });
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const prod = storeRuntime.products.find((p) => p.id === req.params.id);
    if (!prod) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }
    const { basePrice, stock, active, shortTag, name } = req.body || {};
    if (typeof basePrice === 'number' && basePrice > 0) prod.basePrice = basePrice;
    if (typeof stock === 'number' && stock >= 0) prod.stock = stock;
    if (typeof active === 'boolean') prod.active = active;
    if (typeof shortTag === 'string' && shortTag.trim()) prod.shortTag = shortTag.trim();
    if (typeof name === 'string' && name.trim()) prod.name = name.trim();

    storeRuntime.addLog('admin_audit', 'Admin Console', `상품 정보 수정: ${prod.name}`, `가격 ${prod.basePrice.toLocaleString()}원 · 재고 ${prod.stock} · 활성=${prod.active}`, [prod.id], 'info');
    res.json({ product: prod });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const idx = storeRuntime.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }
    const [removed] = storeRuntime.products.splice(idx, 1);
    storeRuntime.addLog('admin_audit', 'Admin Console', `상품 삭제: ${removed.name}`, removed.id, [], 'warning');
    res.json({ ok: true });
  });

  app.post('/api/admin/banners', requireAdmin, (req, res) => {
    const badge = String(req.body?.badge ?? '공지').trim();
    const text = String(req.body?.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: '배너 문구를 입력해 주세요.' });
      return;
    }
    const banner = { id: `banner-${Date.now().toString(36)}`, badge, text, active: true };
    storeRuntime.banners.unshift(banner);
    storeRuntime.addLog('admin_audit', 'Admin Console', `배너 등록: [${badge}] ${text.slice(0, 30)}`, '', [], 'info');
    res.json({ banner });
  });

  app.patch('/api/admin/banners/:id', requireAdmin, (req, res) => {
    const banner = storeRuntime.banners.find((b) => b.id === req.params.id);
    if (!banner) {
      res.status(404).json({ error: '배너를 찾을 수 없습니다.' });
      return;
    }
    if (typeof req.body?.active === 'boolean') banner.active = req.body.active;
    res.json({ banner });
  });

  app.post('/api/admin/hero-slides', requireAdmin, (req, res) => {
    const body = req.body || {};
    const themeTag = String(body.themeTag ?? '').trim();
    const headline = String(body.headline ?? '').trim();
    const linkedPrompt = String(body.linkedPrompt ?? '').trim();
    if (!headline || !linkedPrompt) {
      res.status(400).json({ error: '슬라이드 헤드라인과 연결 질문 프롬프트를 입력해 주세요.' });
      return;
    }
    const id = `hero-${Date.now().toString(36)}`;
    const newSlide: HeroSlide = {
      id,
      themeTag: themeTag || '신규 여행 테마',
      headline,
      subtitle: String(body.subtitle || '지식 그래프 공식 규정으로 딱 필요한 준비물만 안내합니다.').trim(),
      imageUrl: String(body.imageUrl || '/assets/aistudio/hero_travel_shopping_1795073116053_908bc164.jpg').trim(),
      specBadges: Array.isArray(body.specBadges) && body.specBadges.length
        ? body.specBadges
        : ['115cm 규격', '100ml 액체', '맞춤 진단'],
      transportModes: sanitizeModes(body.transportModes),
      linkedPrompt,
      hashtags: Array.isArray(body.hashtags) && body.hashtags.length
        ? body.hashtags
        : [{ label: '#맞춤규정추천', prompt: linkedPrompt, nodeId: 'reg-flight' }],
      nodeIds: Array.isArray(body.nodeIds) && body.nodeIds.length ? body.nodeIds : ['reg-flight'],
      active: true,
    };
    storeRuntime.heroSlides.unshift(newSlide);
    storeRuntime.heroClickStats[id] = {
      bannerClicks: 0,
      hashtagClicks: 0,
      lastClickedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    storeRuntime.addLog('admin_audit', 'Admin Console', `히어로 슬라이드 등록: ${newSlide.headline.slice(0, 30)}`, newSlide.linkedPrompt, newSlide.nodeIds, 'success');
    res.json({ slide: newSlide });
  });

  app.patch('/api/admin/hero-slides/:id', requireAdmin, (req, res) => {
    const slide = storeRuntime.heroSlides.find((s) => s.id === req.params.id);
    if (!slide) {
      res.status(404).json({ error: '히어로 슬라이드를 찾을 수 없습니다.' });
      return;
    }
    const body = req.body || {};
    if (typeof body.themeTag === 'string' && body.themeTag.trim()) slide.themeTag = body.themeTag.trim();
    if (typeof body.headline === 'string' && body.headline.trim()) slide.headline = body.headline.trim();
    if (typeof body.subtitle === 'string' && body.subtitle.trim()) slide.subtitle = body.subtitle.trim();
    if (typeof body.imageUrl === 'string' && body.imageUrl.trim()) slide.imageUrl = body.imageUrl.trim();
    if (typeof body.linkedPrompt === 'string' && body.linkedPrompt.trim()) slide.linkedPrompt = body.linkedPrompt.trim();
    if (typeof body.active === 'boolean') slide.active = body.active;
    if (Array.isArray(body.specBadges)) {
      slide.specBadges = body.specBadges.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 4);
    }
    if (Array.isArray(body.hashtags)) {
      slide.hashtags = body.hashtags;
    }
    storeRuntime.addLog('admin_audit', 'Admin Console', `히어로 슬라이드 수정: ${slide.themeTag}`, slide.headline.slice(0, 40), slide.nodeIds, 'info');
    res.json({ slide });
  });

  app.delete('/api/admin/hero-slides/:id', requireAdmin, (req, res) => {
    const idx = storeRuntime.heroSlides.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '히어로 슬라이드를 찾을 수 없습니다.' });
      return;
    }
    const [removed] = storeRuntime.heroSlides.splice(idx, 1);
    storeRuntime.addLog('admin_audit', 'Admin Console', `히어로 슬라이드 삭제: ${removed.themeTag}`, removed.id, [], 'warning');
    res.json({ ok: true });
  });

  app.patch('/api/admin/automations/:id', requireAdmin, (req, res) => {
    const rule = storeRuntime.automations.find((a) => a.id === req.params.id);
    if (!rule) {
      res.status(404).json({ error: '자동화 규칙을 찾을 수 없습니다.' });
      return;
    }
    if (typeof req.body?.enabled === 'boolean') rule.enabled = req.body.enabled;
    rule.executionsCount += 1;
    rule.lastRunAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    storeRuntime.addLog('admin_audit', 'Automation Engine', `자동화 규칙 토글: ${rule.title} (${rule.enabled ? 'ON' : 'OFF'})`, rule.action, [], 'info');
    res.json({ rule });
  });

  app.patch('/api/admin/actions/:id', requireAdmin, (req, res) => {
    const task = storeRuntime.actionTasks.find((t) => t.id === req.params.id);
    if (!task) {
      res.status(404).json({ error: '작업을 찾을 수 없습니다.' });
      return;
    }
    task.status = task.status === 'open' ? 'resolved' : 'open';
    storeRuntime.addLog('admin_audit', 'Action Center', `액션 상태 변경: ${task.title} → ${task.status}`, '', [], 'success');
    res.json({ task });
  });

  app.post('/api/admin/copilot', requireAdmin, async (req, res) => {
    try {
      const question = String(req.body?.question ?? '').trim();
      if (!question) {
        res.status(400).json({ error: '운영 질문 내용을 입력해 주세요.' });
        return;
      }
      const ai = createGeminiClient();
      const snapshot = {
        revenue: 48620000 + storeRuntime.extraRevenue,
        orders: 412 + storeRuntime.extraOrders,
        funnel: storeRuntime.funnelCounters,
        topClicks: Object.entries(storeRuntime.clickStats).slice(0, 6),
        lowStockProducts: storeRuntime.products.filter((p) => p.stock < 45).map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
        recentLogs: storeRuntime.logs.slice(0, 8).map((l) => `${l.category}: ${l.summary}`),
        nodeHits: storeRuntime.nodeHits,
      };
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `실시간 스토어 운영 스냅샷:\n${JSON.stringify(snapshot, null, 2)}\n\n관리자 질문: ${question}`,
        config: {
          systemInstruction:
            "당신은 '집밖은여행' 이커머스 AI 운영 비서입니다. 제공된 실시간 스냅샷 수치만을 근거로 재고, 전환율, 규정 이탈 방어, 마케팅 액션을 한국어로 간결하게 조언하세요. 없는 수치를 지어내지 마세요.",
        },
      });
      const text = (response.text ?? '').trim();
      storeRuntime.addLog('admin_audit', 'AI Operations Copilot', `운영 비서 질의: ${question.slice(0, 32)}`, text.slice(0, 120), [], 'info');
      res.json({ answer: text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 운영 비서 응답 중 오류가 발생했습니다.';
      res.status(502).json({ error: msg });
    }
  });

  // Ensure unmatched /api/* routes and Express errors ALWAYS return valid JSON (never HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: '요청하신 API 엔드포인트를 찾을 수 없습니다.' });
  });

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      const message = err instanceof Error ? err.message : '서버 요청 처리 중 오류가 발생했습니다.';
      res.status(500).json({ error: message });
      return;
    }
    next(err);
  });

  return app;
}
