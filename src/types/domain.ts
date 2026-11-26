export type TransportModeId =
  | 'walk'
  | 'car'
  | 'subway'
  | 'bus'
  | 'train'
  | 'ship'
  | 'flight';

export interface OfficialSourceNode {
  id: string;
  name: string;
  agency: string;
  standardTitle: string;
  verifiedDate: string;
  url: string;
}

export interface RegulationNode {
  id: string;
  transportMode: TransportModeId;
  modeLabel: string;
  title: string;
  summary: string;
  maxWeightKg: number | null;
  maxSumCm: number | null;
  maxDimensionsCm: string | null;
  maxLiquidMl: number | null;
  maxLiquidTotalMl: number | null;
  maxBatteryWh: number | null;
  legalNote: string | null;
  sourceId: string;
}

export interface StrictestConstraints {
  selectedModes: TransportModeId[];
  maxWeightKg: number;
  maxSumCm: number;
  maxLiquidMl: number | null;
  maxBatteryWh: number | null;
  legalNotices: string[];
  headlineSummary: string;
  regulations: Array<RegulationNode & { source: OfficialSourceNode }>;
  sources: OfficialSourceNode[];
  fetchedAt: string;
}

export interface ProductOptionVariant {
  id: string;
  label: string;
  specText: string;
  weightKg: number;
  dimensionsCm: string;
  sumCm: number;
  priceDelta: number;
  volumeUnits: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: '캐리어·가방' | '전자·배터리' | '세면·위생' | '의류·수면' | '야외·필수';
  shortTag: string;
  description: string;
  basePrice: number;
  originalPrice: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  weightKg: number;
  dimensionsCm: string;
  sumCm: number;
  liquidMl: number | null;
  batteryWh: number | null;
  volumeUnits: number;
  colors: string[];
  variants: ProductOptionVariant[];
  freeGift: string;
  exchangePolicy: string;
  regulationIds: string[];
  localConversionId: string | null;
  recommendedModes: TransportModeId[];
  active: boolean;
}

export interface LocalConversionNode {
  id: string;
  title: string;
  triggerCondition: string;
  reason: string;
  actionLabel: string;
  channelType: '현지 편의점·드럭스토어' | '역사·공항 수하물 보관·배송' | '숙소 어메니티·세탁' | '현지 렌탈·체험';
  estimatedLocalCost: string;
  weightSavedKg: number;
  volumeSavedUnits: number;
  relatedRegulationId: string;
}

export interface RollCallItem {
  id: string;
  name: string;
  question: string;
  category: string;
  productId: string;
  localConversionId: string;
}

export interface DiagnosticPreset {
  destinations: Array<{
    id: string;
    label: string;
    sub: string;
    tip: string;
    defaultModes: TransportModeId[];
    regionGroup?: 'domestic' | 'overseas';
  }>;
  durations: Array<{ id: string; label: string; factor: number; tip?: string }>;
  themes: Array<{ id: string; label: string; extraProductIds: string[]; tip?: string }>;
  companions: Array<{ id: string; label: string; tip?: string }>;
  businessCompanions?: Array<{ id: string; label: string; tip?: string }>;
}

export interface CartItem {
  cartKey: string;
  productId: string;
  name: string;
  imageUrl: string;
  optionSize: string;
  optionColor: string;
  unitPrice: number;
  qty: number;
  weightKg: number;
  sumCm: number;
  volumeUnits: number;
  liquidMl: number | null;
  batteryWh: number | null;
  localConversionId: string | null;
}

export interface FactCitation {
  sourceName: string;
  standardTitle: string;
  verifiedDate: string;
  fetchedAt: string;
  url: string;
  advisoryText: string;
}

export interface ChatRecommendationCard {
  product: CatalogProduct;
  compatibilityStatus: 'pass' | 'caution' | 'exceeds';
  compatibilityNote: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system-error';
  text: string;
  timestamp: string;
  recommendations?: ChatRecommendationCard[];
  localConversions?: LocalConversionNode[];
  citations?: FactCitation[];
  quickReplies?: string[];
  uncertaintyNotice?: boolean;
  diagnosticPrompt?: {
    step: 'destination' | 'duration' | 'theme' | 'companion';
    isBusiness?: boolean;
  };
  rollCallPrompt?: {
    index: number;
    total: number;
    item: RollCallItem;
  };
}

export interface StoreOrderRecord {
  id: string;
  userId: string;
  buyerName: string;
  buyerEmail: string;
  departureDate: string;
  paymentMethod: string;
  shippingAddress?: string;
  shippingZipCode?: string;
  shippingBaseAddress?: string;
  shippingDetailAddress?: string;
  selectedOptionsSummary?: string;
  transportModes?: TransportModeId[];
  itemSummary: string;
  items: Array<{
    productId: string;
    name: string;
    imageUrl?: string;
    optionSize: string;
    optionColor: string;
    price: number;
    qty: number;
    volume: number;
  }>;
  totalAmount: number;
  shippingStatus: '결제완료' | '상품준비중' | '배송중' | '배송완료';
  courier: string;
  trackingNumber: string;
  createdAtText: string;
}

export interface StoreInquiryRecord {
  id: string;
  userId: string;
  userEmail: string;
  orderId?: string;
  category: '상품 문의' | '배송 문의' | '교환·환불' | '기타';
  subject: string;
  message: string;
  status: '답변 대기' | '답변 완료';
  createdAtText: string;
}

export interface SavedChecklistRecord {
  id: string;
  userId: string;
  title: string;
  destination: string;
  duration: string;
  theme: string;
  companion: string;
  transportModes: TransportModeId[];
  haveItems: string[];
  buyItems: string[];
  localItems: string[];
  carrierType: string;
  loadPercent: number;
  createdAtText: string;
}

export type FiveLogCategory =
  | 'ai_rag_regulation'
  | 'product_click_conversion'
  | 'order_logistics'
  | 'local_alert'
  | 'admin_audit';

export interface LogEntry {
  id: string;
  category: FiveLogCategory;
  timestamp: string;
  actor: string;
  summary: string;
  detail: string;
  nodeIds: string[];
  severity: 'info' | 'warning' | 'success';
}

export interface PromoBanner {
  id: string;
  badge: string;
  text: string;
  active: boolean;
}

export interface AutomationRule {
  id: string;
  domain: '마케팅' | '물류' | '반품';
  title: string;
  condition: string;
  action: string;
  enabled: boolean;
  executionsCount: number;
  lastRunAt: string;
}

export interface ActionCenterTask {
  id: string;
  priority: 'high' | 'medium';
  category: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
}

export interface HeroHashtag {
  label: string;
  prompt: string;
  modes?: TransportModeId[];
  nodeId?: string;
}

export interface HeroSlide {
  id: string;
  themeTag: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  specBadges: string[];
  transportModes: TransportModeId[];
  linkedPrompt: string;
  hashtags: HeroHashtag[];
  nodeIds: string[];
  active: boolean;
}

export interface HeroClickStat {
  bannerClicks: number;
  hashtagClicks: number;
  lastClickedAt: string;
}

export type CarrierPresetKey = 'backpack28' | 'cabin20' | 'explorer24';

export type ComplianceStatus = 'pass' | 'caution' | 'exceeds';

export interface UnifiedEvaluationResult {
  status: ComplianceStatus;
  badgeLabel: '규정적합' | '규정주의' | '규격초과';
  note: string;
}

export interface PackingMetrics {
  carrierKey: CarrierPresetKey;
  carrierShortLabel: string;
  carrierLabel: string;
  carrierMaxUnits: number;
  carrierBaseWeightKg: number;
  carrierSumCm: number;
  haveUnits: number;
  haveWeightKg: number;
  cartUnits: number;
  cartWeightKg: number;
  buyPendingUnits: number;
  buyPendingWeightKg: number;
  totalUnits: number;
  loadPercent: number;
  estimatedPackWeight: number;
  maxAllowedWeight: number;
  weightOver: boolean;
  carrierExceedsMode: boolean;
  capacityWarn: boolean;
  carrierEval: UnifiedEvaluationResult;
}


