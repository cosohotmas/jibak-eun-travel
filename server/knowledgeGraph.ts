import type {
  ActionCenterTask,
  AutomationRule,
  CatalogProduct,
  DiagnosticPreset,
  FactCitation,
  FiveLogCategory,
  HeroClickStat,
  HeroSlide,
  LocalConversionNode,
  LogEntry,
  OfficialSourceNode,
  PromoBanner,
  RegulationNode,
  RollCallItem,
  StrictestConstraints,
  TransportModeId,
} from '../src/types/domain.ts';

export const TRANSPORT_MODE_LABELS: Record<TransportModeId, string> = {
  walk: '도보',
  car: '자가용',
  subway: '지하철',
  bus: '버스',
  train: '철도(KTX·SRT)',
  ship: '배(여객선)',
  flight: '항공(기내)',
};

export const OFFICIAL_SOURCES: OfficialSourceNode[] = [
  {
    id: 'src-molit-flight',
    name: '국토교통부 항공보안법 · 항공위험물 운송기준',
    agency: '국토교통부',
    standardTitle: '기내 휴대 수하물·액체류(100ml)·리튬배터리(100Wh) 운송 기준',
    verifiedDate: '2025-10-15',
    url: 'https://www.molit.go.kr',
  },
  {
    id: 'src-korail-train',
    name: '코레일 여객운송약관 제14조 · SR 운송약관',
    agency: '한국철도공사(KORAIL)',
    standardTitle: 'KTX·SRT 상단 선반(깊이 38cm) 및 휴대품 20kg 기준',
    verifiedDate: '2025-10-01',
    url: 'https://info.korail.com',
  },
  {
    id: 'src-law-road39',
    name: '법제처 국가법령정보센터 도로교통법 제39조',
    agency: '경찰청 · 법제처',
    standardTitle: '도로교통법 제39조 제1항·제4항 적재중량·용량 및 시야·추락 방지 기준',
    verifiedDate: '2025-10-01',
    url: 'https://www.law.go.kr/법령/도로교통법',
  },
  {
    id: 'src-metro-subway',
    name: '서울교통공사 여객운송약관 제14조',
    agency: '서울교통공사',
    standardTitle: '도시철도 휴대품 중량 32kg 미만 · 세 변 합 158cm 이내 기준',
    verifiedDate: '2025-08-20',
    url: 'https://www.seoulmetro.co.kr',
  },
  {
    id: 'src-kobus-bus',
    name: '전국고속버스운송사업조합 여객운송약관 제15조',
    agency: '전국고속버스운송사업조합',
    standardTitle: '차내 휴대 10kg(세 변 합 100cm) · 화물칸 무료 20kg 기준',
    verifiedDate: '2025-09-10',
    url: 'https://www.kobus.co.kr',
  },
  {
    id: 'src-mof-ship',
    name: '해양수산부 연안여객선 운송약관',
    agency: '해양수산부',
    standardTitle: '여객선 무료 휴대 수하물 20kg · 세 변 합 158cm 및 방수 적재 기준',
    verifiedDate: '2025-07-15',
    url: 'https://www.mof.go.kr',
  },
  {
    id: 'src-kspo-walk',
    name: '국민체육진흥공단 도보여행 안전 가이드',
    agency: '국민체육진흥공단',
    standardTitle: '장거리 도보·트레킹 배낭 권장 한계(체중 10% 내외, 6kg 권장)',
    verifiedDate: '2025-09-01',
    url: 'https://www.kspo.or.kr',
  },
];

export const REGULATION_NODES: RegulationNode[] = [
  {
    id: 'reg-walk',
    transportMode: 'walk',
    modeLabel: '도보',
    title: '장시간 도보 적정 하중 6kg · 양손 프리 기준',
    summary: '도보 구간이 포함되면 총 휴대 하중 6kg 이하, 양손이 자유로운 백팩·슬링 구성을 권장합니다.',
    maxWeightKg: 6,
    maxSumCm: 105,
    maxDimensionsCm: '48×32×22',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: null,
    legalNote: '경사로·계단 이동 시 한 손 캐리어보다 배낭 분산 착용 권장',
    sourceId: 'src-kspo-walk',
  },
  {
    id: 'reg-car',
    transportMode: 'car',
    modeLabel: '자가용',
    title: '도로교통법 제39조 적재물 고정 및 후방 시야 확보',
    summary: '트렁크 공간 내 적재 시 운전자의 후방 시야를 가리지 않아야 하며 급제동 시 이탈 방지 고정이 필요합니다.',
    maxWeightKg: 35,
    maxSumCm: 180,
    maxDimensionsCm: '80×55×45',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: null,
    legalNote: '도로교통법 제39조 제1항·제4항(적재물 추락 방지 및 시야 확보 의무)',
    sourceId: 'src-law-road39',
  },
  {
    id: 'reg-subway',
    transportMode: 'subway',
    modeLabel: '지하철',
    title: '도시철도 휴대품 세 변 합 158cm · 32kg 미만',
    summary: '출퇴근·환승 통행 방해를 막기 위해 세 변 합 158cm 이하, 32kg 미만 규격을 준수해야 합니다.',
    maxWeightKg: 32,
    maxSumCm: 158,
    maxDimensionsCm: '65×48×45',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: null,
    legalNote: '개찰구·에스컬레이터 이동 시 20인치(115cm) 이하가 안전',
    sourceId: 'src-metro-subway',
  },
  {
    id: 'reg-bus',
    transportMode: 'bus',
    modeLabel: '버스',
    title: '고속·시외버스 차내 10kg(100cm) · 화물칸 20kg',
    summary: '차내 선반·무릎 휴대는 10kg(세 변 합 100cm) 이내이며, 20인치 이상 캐리어는 하부 화물칸(20kg 이하) 적재 대상입니다.',
    maxWeightKg: 10,
    maxSumCm: 100,
    maxDimensionsCm: '50×30×20 (차내)',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: null,
    legalNote: '화물칸 적재 시 파손·액체 누수 방지 파우치 분리 권장',
    sourceId: 'src-kobus-bus',
  },
  {
    id: 'reg-train',
    transportMode: 'train',
    modeLabel: '철도(KTX·SRT)',
    title: '열차 상단 선반 깊이 38cm · 휴대품 20kg 이하',
    summary: 'KTX·SRT 상단 선반 깊이 38cm 기준으로 20인치 캐리어(55×38×22cm, 합 115cm)까지 안전하게 수납됩니다.',
    maxWeightKg: 20,
    maxSumCm: 115,
    maxDimensionsCm: '55×38×22',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: null,
    legalNote: '24인치 이상은 객실 연결부 대형 수하물 보관대 이용 필요',
    sourceId: 'src-korail-train',
  },
  {
    id: 'reg-ship',
    transportMode: 'ship',
    modeLabel: '배(여객선)',
    title: '여객선 무료 수하물 20kg · 합 158cm · 방수 포장',
    summary: '1인 20kg·158cm 이내 무료 휴대 가능하며, 해풍·염분·선내 적재 대비 방수 파우치 및 배터리 단자 보호가 필수입니다.',
    maxWeightKg: 20,
    maxSumCm: 158,
    maxDimensionsCm: '65×48×45',
    maxLiquidMl: null,
    maxLiquidTotalMl: null,
    maxBatteryWh: 100,
    legalNote: '선실 내 통로 적재 금지, 선박 지정 수하물 구역 확인 필요',
    sourceId: 'src-mof-ship',
  },
  {
    id: 'reg-flight',
    transportMode: 'flight',
    modeLabel: '항공(기내)',
    title: '기내 10kg · 합 115cm · 액체 100ml · 배터리 100Wh',
    summary: '기내 반입은 세 변 합 115cm·10kg 이하, 액체류 용기당 100ml(총 1L 지퍼백), 리튬 보조배터리 100Wh 이하 기내 휴대 필수입니다.',
    maxWeightKg: 10,
    maxSumCm: 115,
    maxDimensionsCm: '55×40×20',
    maxLiquidMl: 100,
    maxLiquidTotalMl: 1000,
    maxBatteryWh: 100,
    legalNote: '보조배터리 위탁 수하물 금지 · 단자 절연 파우치 보관 필수 (항공사별 세부 수치 상이 가능)',
    sourceId: 'src-molit-flight',
  },
];

export const LOCAL_CONVERSION_NODES: LocalConversionNode[] = [
  {
    id: 'local-liquids-store',
    title: '대용량 액체류(100ml 초과) 현지 편의점·드럭스토어 조달',
    triggerCondition: '항공 기내 100ml 규정 초과 또는 도보 하중 절감 필요 시',
    reason: '대용량 샴푸·클렌저·선크림을 집에서 챙기면 항공 액체류(100ml) 규정 위반 및 누수 위험이 큽니다.',
    actionLabel: '현지 편의점·드럭스토어 구매로 전환',
    channelType: '현지 편의점·드럭스토어',
    estimatedLocalCost: '현지 약 5,000~12,000원',
    weightSavedKg: 0.7,
    volumeSavedUnits: 12,
    relatedRegulationId: 'reg-flight',
  },
  {
    id: 'local-luggage-locker',
    title: '대형 수하물(24인치 초과) 현지 물품보관함·당일 배송 전환',
    triggerCondition: '세 변 합 115cm 또는 도보 6kg·버스 100cm 초과 시',
    reason: '도보·버스·KTX 환승 동선에서 큰 캐리어를 끌면 이동 피로와 선반 미수납 문제가 발생합니다.',
    actionLabel: '역사·공항 짐보관·숙소 배송으로 전환',
    channelType: '역사·공항 수하물 보관·배송',
    estimatedLocalCost: '보관함/배송 약 6,000~15,000원',
    weightSavedKg: 3.4,
    volumeSavedUnits: 45,
    relatedRegulationId: 'reg-train',
  },
  {
    id: 'local-laundry-amenity',
    title: '여벌 의류·타월 축소 → 숙소 어메니티·현지 코인세탁 전환',
    triggerCondition: '3박 이상 일정에서 의류·수건 부피 85% 초과 시',
    reason: '4일 이상 의류를 모두 패킹하면 20인치 기내용 용량을 넘기 쉽습니다. 현지 세탁과 숙소 어메니티로 부피를 절반 줄이세요.',
    actionLabel: '숙소 어메니티·현지 세탁 체험 전환',
    channelType: '숙소 어메니티·세탁',
    estimatedLocalCost: '코인세탁 약 4,000~6,000원',
    weightSavedKg: 1.5,
    volumeSavedUnits: 25,
    relatedRegulationId: 'reg-walk',
  },
  {
    id: 'local-weather-gear',
    title: '우산·스틱·여벌 신발 현지 대여·편의점 구매 전환',
    triggerCondition: '도보 6kg 한계 초과 또는 우천 불확실 일정 시',
    reason: '비 예보가 불확실할 때 무거운 우산·신발을 미리 넣기보다 현지 투명우산/레저 대여를 활용하면 짐이 가벼워집니다.',
    actionLabel: '현지 우산 구매·장비 대여 전환',
    channelType: '현지 렌탈·체험',
    estimatedLocalCost: '현지 약 5,000~10,000원',
    weightSavedKg: 0.8,
    volumeSavedUnits: 14,
    relatedRegulationId: 'reg-walk',
  },
];

const INITIAL_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'railbag-carrier',
    name: '레일백 · 브라노 라이트 캐리어 (3 SIZE)',
    category: '캐리어·가방',
    shortTag: '기내·KTX 선반 규격 통과',
    description:
      'KTX·SRT 상단 선반(38cm)과 국내·국제선 기내(115cm) 규격을 동시에 통과하는 초경량 하드캐리어입니다.',
    basePrice: 89000,
    originalPrice: 149000,
    costPrice: 46000,
    stock: 42,
    imageUrl: '/assets/aistudio/product_carryon_suitcase_1795249599937_26285327.jpg',
    weightKg: 2.7,
    dimensionsCm: '35×23×54',
    sumCm: 112,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 25,
    colors: ['레일웨이 네이비', '딥그린', '스노우 화이트', '스테이션 블랙'],
    variants: [
      {
        id: '18inch',
        label: '18인치 위켄더 콤팩트 (당일~1박)',
        specText: '32×21×48cm · 2.3kg · 버스 차내/일반석 발밑 수납',
        weightKg: 2.3,
        dimensionsCm: '32×21×48',
        sumCm: 101,
        priceDelta: -10000,
        volumeUnits: 18,
      },
      {
        id: '20inch',
        label: '20인치 캐빈핏 (1~3박 표준)',
        specText: '35×23×54cm · 2.7kg · KTX 선반 & 기내 반입 통과',
        weightKg: 2.7,
        dimensionsCm: '35×23×54',
        sumCm: 112,
        priceDelta: 0,
        volumeUnits: 25,
      },
      {
        id: '24inch',
        label: '24인치 익스플로러 (4박+ 화물/자가용)',
        specText: '41×27×64cm · 3.4kg · 위탁 수하물 / KTX 대형 보관대',
        weightKg: 3.4,
        dimensionsCm: '41×27×64',
        sumCm: 132,
        priceDelta: 20000,
        volumeUnits: 38,
      },
    ],
    freeGift: '방수 압축 파우치 3종 + 선반 보호 네임택 100% 증정',
    exchangePolicy: '수령 후 7일 이내 미사용 시 무료 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-train', 'reg-subway'],
    localConversionId: 'local-luggage-locker',
    recommendedModes: ['train', 'flight', 'subway', 'car'],
    active: true,
  },
  {
    id: 'travel-backpack',
    name: '어반 트랜짓 28L 도보·기내 백팩',
    category: '캐리어·가방',
    shortTag: '도보 6kg 분산 · 버스 차내 수납',
    description:
      '양손이 자유로워 도보 환승과 계단이 많은 여행에 최적화된 28L 발수 트래블 백팩입니다.',
    basePrice: 74000,
    originalPrice: 98000,
    costPrice: 36000,
    stock: 35,
    imageUrl: '/assets/aistudio/product_travel_backpack_1795251607424_8a685b8a.jpg',
    weightKg: 0.95,
    dimensionsCm: '48×31×18',
    sumCm: 97,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 14,
    colors: ['차콜 샌드', '올리브 블랙'],
    variants: [
      {
        id: '28l-std',
        label: '28L 표준 백팩 (버스 차내 100cm 이내)',
        specText: '48×31×18cm · 0.95kg · 버스 선반·도보 최적',
        weightKg: 0.95,
        dimensionsCm: '48×31×18',
        sumCm: 97,
        priceDelta: 0,
        volumeUnits: 14,
      },
      {
        id: '28l-duffel',
        label: '28L 백팩 + 위켄드 더플 세트',
        specText: '48×31×18cm + 더플 · 1.55kg · 자가용/장거리용',
        weightKg: 1.55,
        dimensionsCm: '48×31×18',
        sumCm: 97,
        priceDelta: 25000,
        volumeUnits: 22,
      },
    ],
    freeGift: '레인커버 파우치 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-walk', 'reg-bus', 'reg-flight'],
    localConversionId: 'local-luggage-locker',
    recommendedModes: ['walk', 'bus', 'subway', 'flight'],
    active: true,
  },
  {
    id: 'sling-messenger',
    name: '컴팩트 도보 슬링백 & 서류 토트',
    category: '캐리어·가방',
    shortTag: '도보 초경량 0.38kg',
    description:
      '여권, 보조배터리, 지갑을 몸 앞에 안전하게 보관할 수 있는 초경량 도보 데일리 가방입니다.',
    basePrice: 42000,
    originalPrice: 56000,
    costPrice: 19000,
    stock: 54,
    imageUrl: '/assets/aistudio/product_sling_messenger_1795251607110_2af1945b.jpg',
    weightKg: 0.38,
    dimensionsCm: '30×18×9',
    sumCm: 57,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 5,
    colors: ['스톤 그레이', '샌드 베이지'],
    variants: [
      {
        id: 'sling-only',
        label: '크로스 슬링백 단품',
        specText: '30×18×9cm · 0.38kg',
        weightKg: 0.38,
        dimensionsCm: '30×18×9',
        sumCm: 57,
        priceDelta: 0,
        volumeUnits: 5,
      },
      {
        id: 'tote-set',
        label: '슬링백 + 에디토리얼 토트 세트',
        specText: '세 변 합 82cm · 0.68kg',
        weightKg: 0.68,
        dimensionsCm: '36×28×12',
        sumCm: 76,
        priceDelta: 18000,
        volumeUnits: 9,
      },
    ],
    freeGift: '카라비너 키링 1개 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-walk', 'reg-subway', 'reg-bus'],
    localConversionId: null,
    recommendedModes: ['walk', 'subway', 'bus', 'train'],
    active: true,
  },
  {
    id: 'power-bank-10k',
    name: '기내 반입 10,000mAh 초슬림 보조배터리 (37Wh)',
    category: '전자·배터리',
    shortTag: '항공 100Wh 이하 인증 · 절연 파우치',
    description:
      '항공 기내 반입 기준(100Wh 이하)을 여유 있게 충족하는 37Wh 초슬림 알루미늄 보조배터리입니다.',
    basePrice: 29000,
    originalPrice: 39000,
    costPrice: 13500,
    stock: 80,
    imageUrl: '/assets/aistudio/product_power_bank_1795249600092_3873d664.jpg',
    weightKg: 0.21,
    dimensionsCm: '14×7×1.4',
    sumCm: 22.4,
    liquidMl: null,
    batteryWh: 37,
    volumeUnits: 6,
    colors: ['실버 알루미늄', '슬레이트 그레이'],
    variants: [
      {
        id: '10000mah',
        label: '10,000mAh (37Wh) 기내 안전형',
        specText: '37Wh · 0.21kg · 단자 절연 파우치 + C-to-C 케이블',
        weightKg: 0.21,
        dimensionsCm: '14×7×1.4',
        sumCm: 22.4,
        priceDelta: 0,
        volumeUnits: 6,
      },
      {
        id: '20000mah',
        label: '20,000mAh (74Wh) 장기 여행형',
        specText: '74Wh · 0.36kg · 기내 100Wh 이하 통과 (1인 휴대)',
        weightKg: 0.36,
        dimensionsCm: '15×7.5×2.5',
        sumCm: 25,
        priceDelta: 15000,
        volumeUnits: 9,
      },
    ],
    freeGift: '단자 쇼트 방지 실리콘 캡 + 절연 파우치 포함',
    exchangePolicy: '1년 무상 A/S · 초기 불량 100% 교환',
    regulationIds: ['reg-flight', 'reg-ship'],
    localConversionId: null,
    recommendedModes: ['flight', 'train', 'bus', 'walk', 'ship'],
    active: true,
  },
  {
    id: 'fast-charger',
    name: 'Voltus GaN 35W 듀얼 고속충전기 & 케이블',
    category: '전자·배터리',
    shortTag: '초소형 140g 듀얼 C포트',
    description:
      '스마트폰과 보조배터리를 동시에 고속 충전하는 35W GaN 듀얼 포트 충전기입니다.',
    basePrice: 34000,
    originalPrice: 45000,
    costPrice: 16000,
    stock: 64,
    imageUrl: '/assets/aistudio/product_fast_charger_1795351234042_afd22ee0.jpg',
    weightKg: 0.14,
    dimensionsCm: '5×5×3',
    sumCm: 13,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 4,
    colors: ['매트 블랙'],
    variants: [
      {
        id: 'kr-35w',
        label: '35W GaN 국내 220V + 1.5m 케이블',
        specText: '5×5×3cm · 0.14kg',
        weightKg: 0.14,
        dimensionsCm: '5×5×3',
        sumCm: 13,
        priceDelta: 0,
        volumeUnits: 4,
      },
    ],
    freeGift: '케이블 정리 벨크로 스트랩 포함',
    exchangePolicy: '1년 무상 교환 보증',
    regulationIds: ['reg-flight', 'reg-train'],
    localConversionId: null,
    recommendedModes: ['flight', 'train', 'bus', 'car', 'walk'],
    active: true,
  },
  {
    id: 'adapter-scale',
    name: '글로벌 멀티 어댑터 & 디지털 수하물 저울 세트',
    category: '전자·배터리',
    shortTag: '출발 전 중량 측정 · 150개국 호환',
    description:
      '10kg 기내 중량 제한을 출발 전에 직접 계량할 수 있는 디지털 저울과 45W 멀티 어댑터 세트입니다.',
    basePrice: 32000,
    originalPrice: 42000,
    costPrice: 15000,
    stock: 48,
    imageUrl: '/assets/aistudio/product_adapter_scale_1795251607527_1849faf7.jpg',
    weightKg: 0.28,
    dimensionsCm: '15×10×5',
    sumCm: 30,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 5,
    colors: ['매트 블랙'],
    variants: [
      {
        id: 'set-full',
        label: '멀티 어댑터 + 디지털 수하물 저울',
        specText: '최대 50kg 계량 · 0.28kg',
        weightKg: 0.28,
        dimensionsCm: '15×10×5',
        sumCm: 30,
        priceDelta: 0,
        volumeUnits: 5,
      },
    ],
    freeGift: '위치추적기 가죽 키링(코랄) 샘플 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-bus', 'reg-walk'],
    localConversionId: null,
    recommendedModes: ['flight', 'bus', 'train', 'ship'],
    active: true,
  },
  {
    id: 'toothbrush-kit',
    name: '덴토 기내 규격 치약(50ml)·칫솔 케이스',
    category: '세면·위생',
    shortTag: '50ml 기내 액체류 통과',
    description:
      '항공 기내 액체류 기준(100ml 이하)을 통과하는 50ml 치약과 통풍 항균 칫솔 케이스 세트입니다.',
    basePrice: 8500,
    originalPrice: 12000,
    costPrice: 3200,
    stock: 150,
    imageUrl: '/assets/aistudio/product_toothbrush_kit_1795351234044_7019c9d1.jpg',
    weightKg: 0.12,
    dimensionsCm: '20×6×3',
    sumCm: 29,
    liquidMl: 50,
    batteryWh: null,
    volumeUnits: 4,
    colors: ['스모크 클리어', '소프트 화이트'],
    variants: [
      {
        id: 'single-kit',
        label: '1인 세트 (치약 50ml + 칫솔 + 케이스)',
        specText: '50ml 액체류 통과 · 0.12kg',
        weightKg: 0.12,
        dimensionsCm: '20×6×3',
        sumCm: 29,
        priceDelta: 0,
        volumeUnits: 4,
      },
      {
        id: 'couple-kit',
        label: '2인 커플·동행 세트 (2세트)',
        specText: '50ml × 2개 · 0.24kg',
        weightKg: 0.24,
        dimensionsCm: '20×12×3',
        sumCm: 35,
        priceDelta: 7500,
        volumeUnits: 7,
      },
    ],
    freeGift: '휴대용 가글 스틱 2포 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight'],
    localConversionId: 'local-liquids-store',
    recommendedModes: ['flight', 'train', 'bus', 'walk', 'ship', 'car'],
    active: true,
  },
  {
    id: 'hygiene-pouch',
    name: '방수 위생 파우치 & 물티슈·치약 올인원',
    category: '세면·위생',
    shortTag: '선박·열차 방수 · 15ml 소분',
    description:
      '생활 방수 지퍼 파우치에 15ml 치약, 케이스 칫솔, 캡형 여행 물티슈를 담은 위생 올인원 키트입니다.',
    basePrice: 14900,
    originalPrice: 19900,
    costPrice: 6200,
    stock: 96,
    imageUrl: '/assets/aistudio/product_hygiene_pouch_1795249600381_7df8f71e.jpg',
    weightKg: 0.24,
    dimensionsCm: '21×13×8',
    sumCm: 42,
    liquidMl: 15,
    batteryWh: null,
    volumeUnits: 6,
    colors: ['스카이 블루', '샌드 아이보리'],
    variants: [
      {
        id: 'all-in-one',
        label: '파우치 + 치약 15ml + 칫솔 + 물티슈',
        specText: '방수 원단 · 0.24kg · 기내 통과',
        weightKg: 0.24,
        dimensionsCm: '21×13×8',
        sumCm: 42,
        priceDelta: 0,
        volumeUnits: 6,
      },
    ],
    freeGift: '리필 물티슈 1팩 추가 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-ship'],
    localConversionId: 'local-liquids-store',
    recommendedModes: ['flight', 'ship', 'train', 'bus', 'walk'],
    active: true,
  },
  {
    id: 'bath-set',
    name: '투명 지퍼백 80ml×3 리필 세면 세트',
    category: '세면·위생',
    shortTag: '국제선 100ml·1L 규격 완벽 대응',
    description:
      '국제선 보안검색대를 바로 통과하는 투명 지퍼백과 실리콘 80ml 용기 3종(샴푸·린스·바디로션)입니다.',
    basePrice: 16500,
    originalPrice: 22000,
    costPrice: 6800,
    stock: 82,
    imageUrl: '/assets/aistudio/product_bath_set_1795351275341_191ea2df.jpg',
    weightKg: 0.3,
    dimensionsCm: '20×16×5',
    sumCm: 41,
    liquidMl: 80,
    batteryWh: null,
    volumeUnits: 7,
    colors: ['세이지·아이보리·슬레이트'],
    variants: [
      {
        id: '80ml-3',
        label: '80ml × 3종 + 1L 투명 지퍼백',
        specText: '용기당 80ml (합 240ml ≤ 1L) · 0.30kg',
        weightKg: 0.3,
        dimensionsCm: '20×16×5',
        sumCm: 41,
        priceDelta: 0,
        volumeUnits: 7,
      },
    ],
    freeGift: '방수 네임 스티커 1매 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight'],
    localConversionId: 'local-liquids-store',
    recommendedModes: ['flight', 'train', 'ship', 'car'],
    active: true,
  },
  {
    id: 'skincare-kit',
    name: '기초 스킨케어 50ml×3 트래블 트리오',
    category: '세면·위생',
    shortTag: '50ml 기내 반입 · 보습 트리오',
    description:
      '토너·세럼·모이스처라이저 각 50ml 구성으로 건조한 기내와 열차 객실에서도 피부를 지켜줍니다.',
    basePrice: 28000,
    originalPrice: 36000,
    costPrice: 12000,
    stock: 60,
    imageUrl: '/assets/aistudio/product_skincare_kit_1795351234723_07f5b512.jpg',
    weightKg: 0.26,
    dimensionsCm: '16×12×5',
    sumCm: 33,
    liquidMl: 50,
    batteryWh: null,
    volumeUnits: 6,
    colors: ['앰버 글라스'],
    variants: [
      {
        id: '50ml-trio',
        label: '50ml × 3종 (토너·세럼·크림)',
        specText: '용기당 50ml · 0.26kg · 기내 통과',
        weightKg: 0.26,
        dimensionsCm: '16×12×5',
        sumCm: 33,
        priceDelta: 0,
        volumeUnits: 6,
      },
    ],
    freeGift: '순면 화장솜 20매 파우치 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight'],
    localConversionId: 'local-liquids-store',
    recommendedModes: ['flight', 'train', 'car'],
    active: true,
  },
  {
    id: 'sunscreen-tube',
    name: '마레 미네랄 선크림 50ml (SPF50+)',
    category: '세면·위생',
    shortTag: '50ml 기내 통과 · 무기자차',
    description:
      '야외·해변·도보 여행 필수품인 50ml 컴팩트 무기자차 선크림입니다.',
    basePrice: 19000,
    originalPrice: 25000,
    costPrice: 8000,
    stock: 110,
    imageUrl: '/assets/aistudio/product_sunscreen_tube_1795351234415_629a6308.jpg',
    weightKg: 0.08,
    dimensionsCm: '12×5×3',
    sumCm: 20,
    liquidMl: 50,
    batteryWh: null,
    volumeUnits: 3,
    colors: ['내추럴 화이트'],
    variants: [
      {
        id: '50ml-tube',
        label: '50ml 기내용 튜브',
        specText: '50ml · 0.08kg',
        weightKg: 0.08,
        dimensionsCm: '12×5×3',
        sumCm: 20,
        priceDelta: 0,
        volumeUnits: 3,
      },
    ],
    freeGift: '진정 알로에 시트마스크 1매 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-walk'],
    localConversionId: 'local-liquids-store',
    recommendedModes: ['walk', 'flight', 'ship', 'car', 'train'],
    active: true,
  },
  {
    id: 'apparel-cubes',
    name: '메쉬 압축 패킹 큐브 4종 + 속옷·양말 정리함',
    category: '의류·수면',
    shortTag: '부피 40% 압축 · 테트리스 최적화',
    description:
      '상의·하의·속옷·양말을 크기별로 분류하고 이중 지퍼로 부피를 압축해 20인치 캐리어 적재율을 높여줍니다.',
    basePrice: 26000,
    originalPrice: 35000,
    costPrice: 11000,
    stock: 74,
    imageUrl: '/assets/aistudio/product_apparel_cubes_1795249600179_30f47d93.jpg',
    weightKg: 0.32,
    dimensionsCm: '34×24×10',
    sumCm: 68,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 12,
    colors: ['스카이·그레이 믹스', '모노 차콜'],
    variants: [
      {
        id: '4pack',
        label: '압축 패킹 큐브 4종 세트',
        specText: '의류+속옷+양말 분리 · 0.32kg',
        weightKg: 0.32,
        dimensionsCm: '34×24×10',
        sumCm: 68,
        priceDelta: 0,
        volumeUnits: 12,
      },
      {
        id: '4pack-underwear',
        label: '큐브 4종 + 일회용 여행 속옷 4일분 세트',
        specText: '즉시 착용 속옷 포함 · 0.48kg',
        weightKg: 0.48,
        dimensionsCm: '34×24×12',
        sumCm: 70,
        priceDelta: 14000,
        volumeUnits: 16,
      },
    ],
    freeGift: '세탁물 분리 스트링 백 1개 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-train', 'reg-walk'],
    localConversionId: 'local-laundry-amenity',
    recommendedModes: ['flight', 'train', 'bus', 'car', 'walk'],
    active: true,
  },
  {
    id: 'loungewear',
    name: '오가닉 코튼 여행용 이지웨어 & 파우치',
    category: '의류·수면',
    shortTag: '구김 최소 · 숙소·기내 겸용',
    description:
      '구김이 적고 통기성이 뛰어난 오가닉 코튼 소재의 여행용 상·하의 세트와 전용 파우치입니다.',
    basePrice: 44000,
    originalPrice: 58000,
    costPrice: 20500,
    stock: 50,
    imageUrl: '/assets/aistudio/product_travel_loungewear_1795351234140_ab36cff4.jpg',
    weightKg: 0.42,
    dimensionsCm: '26×20×7',
    sumCm: 53,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 15,
    colors: ['헤더 차콜', '웜 오트밀'],
    variants: [
      {
        id: 'size-m',
        label: 'M (95~100 공용)',
        specText: '0.42kg · 파우치 포함',
        weightKg: 0.42,
        dimensionsCm: '26×20×7',
        sumCm: 53,
        priceDelta: 0,
        volumeUnits: 15,
      },
      {
        id: 'size-l',
        label: 'L (100~105 공용)',
        specText: '0.45kg · 파우치 포함',
        weightKg: 0.45,
        dimensionsCm: '26×20×7',
        sumCm: 53,
        priceDelta: 0,
        volumeUnits: 15,
      },
    ],
    freeGift: '여행용 압박 수면 양말 1켤레 증정',
    exchangePolicy: '미세탁 시 7일 이내 사이즈 교환 가능',
    regulationIds: ['reg-flight', 'reg-train'],
    localConversionId: 'local-laundry-amenity',
    recommendedModes: ['flight', 'train', 'bus', 'car'],
    active: true,
  },
  {
    id: 'neckpillow-sleep',
    name: '에르고 메모리폼 목베개·3D 수면안대·귀마개 키트',
    category: '의류·수면',
    shortTag: '기내·야간버스·KTX 숙면',
    description:
      '장거리 항공·고속버스·열차 이동 시 목 꺾임을 막아주는 고밀도 메모리폼 목베개와 3D 안대 세트입니다.',
    basePrice: 27000,
    originalPrice: 36000,
    costPrice: 12000,
    stock: 68,
    imageUrl: '/assets/aistudio/product_neckpillow_sleep_1795251607186_4378b51a.jpg',
    weightKg: 0.35,
    dimensionsCm: '26×24×12',
    sumCm: 62,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 10,
    colors: ['포레스트 그린', '차콜 블랙'],
    variants: [
      {
        id: 'sleep-kit',
        label: '목베개 + 3D 수면안대 + 귀마개',
        specText: '0.35kg · 가방 외측 스트랩 결속 가능',
        weightKg: 0.35,
        dimensionsCm: '26×24×12',
        sumCm: 62,
        priceDelta: 0,
        volumeUnits: 10,
      },
    ],
    freeGift: '분실 방지 스트랩 증정',
    exchangePolicy: '미개봉 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-bus', 'reg-train'],
    localConversionId: null,
    recommendedModes: ['flight', 'bus', 'train', 'ship'],
    active: true,
  },
  {
    id: 'folding-umbrella',
    name: '초경량 UV 차단 접이식 우양산 (220g)',
    category: '야외·필수',
    shortTag: '220g 초경량 · 맑음/비 겸용',
    description:
      '자외선 차단과 돌발 소나기에 모두 대응하는 220g 카본 프레임 접이식 우양산입니다.',
    basePrice: 18500,
    originalPrice: 26000,
    costPrice: 7800,
    stock: 92,
    imageUrl: '/assets/aistudio/product_folding_umbrella_1795351233998_d5238a25.jpg',
    weightKg: 0.22,
    dimensionsCm: '25×5×5',
    sumCm: 35,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 5,
    colors: ['더스티 블루', '스톤 블랙'],
    variants: [
      {
        id: 'manual-220g',
        label: '초경량 수동 220g',
        specText: '25cm 접이식 · 0.22kg',
        weightKg: 0.22,
        dimensionsCm: '25×5×5',
        sumCm: 35,
        priceDelta: 0,
        volumeUnits: 5,
      },
      {
        id: 'auto-290g',
        label: '원터치 자동 290g',
        specText: '28cm 접이식 · 0.29kg',
        weightKg: 0.29,
        dimensionsCm: '28×5.5×5.5',
        sumCm: 39,
        priceDelta: 4500,
        volumeUnits: 6,
      },
    ],
    freeGift: '물기 흡수 마이크로화이버 커버 포함',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-walk', 'reg-flight'],
    localConversionId: 'local-weather-gear',
    recommendedModes: ['walk', 'subway', 'train', 'bus', 'car'],
    active: true,
  },
  {
    id: 'passport-wallet',
    name: 'RFID 차단 가죽 여권·승차권 오거나이저',
    category: '야외·필수',
    shortTag: 'RFID 스키밍 차단 · 신분증 수납',
    description:
      '여권, 탑승권, 신분증, 유심핀과 카드를 한눈에 정리하는 RFID 차단 가죽 여권 지갑입니다.',
    basePrice: 31000,
    originalPrice: 42000,
    costPrice: 13500,
    stock: 65,
    imageUrl: '/assets/aistudio/product_passport_wallet_1795351234025_cb90e7f2.jpg',
    weightKg: 0.15,
    dimensionsCm: '15×11×2',
    sumCm: 28,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 3,
    colors: ['네이비 페블', '에스프레소 브라운'],
    variants: [
      {
        id: 'std-rfid',
        label: 'RFID 여권·티켓 지갑',
        specText: '여권 2권 + 카드 4매 · 0.15kg',
        weightKg: 0.15,
        dimensionsCm: '15×11×2',
        sumCm: 28,
        priceDelta: 0,
        volumeUnits: 3,
      },
    ],
    freeGift: '유심 트레이 핀 + 미니 볼펜 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-flight', 'reg-train', 'reg-ship'],
    localConversionId: null,
    recommendedModes: ['flight', 'train', 'ship', 'bus', 'subway', 'walk', 'car'],
    active: true,
  },
  {
    id: 'cap-sunglasses',
    name: '하드케이스 볼캡 & 편광 선글라스 세트',
    category: '야외·필수',
    shortTag: '구김 방지 하드케이스',
    description:
      '캐리어 안에서도 모자 형태가 망가지지 않는 전용 하드케이스와 편광 선글라스 세트입니다.',
    basePrice: 36000,
    originalPrice: 49000,
    costPrice: 16500,
    stock: 44,
    imageUrl: '/assets/aistudio/product_cap_sunglasses_1795351233929_0771e3ea.jpg',
    weightKg: 0.29,
    dimensionsCm: '24×20×11',
    sumCm: 55,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 9,
    colors: ['올리브 워시드 + 토터스'],
    variants: [
      {
        id: 'cap-glass-case',
        label: '볼캡 + 편광 선글라스 + 하드케이스',
        specText: '0.29kg · 자외선 UV400 차단',
        weightKg: 0.29,
        dimensionsCm: '24×20×11',
        sumCm: 55,
        priceDelta: 0,
        volumeUnits: 9,
      },
    ],
    freeGift: '안경 극세사 클리너 증정',
    exchangePolicy: '수령 후 7일 이내 교환·반품 가능',
    regulationIds: ['reg-car', 'reg-walk'],
    localConversionId: null,
    recommendedModes: ['car', 'walk', 'ship', 'train'],
    active: true,
  },
  {
    id: 'walking-sneakers',
    name: '초경량 트래블 워킹 스니커즈 + 슈즈 파우치',
    category: '의류·수면',
    shortTag: '280g 초경량 니트 · 파우치 포함',
    description:
      '하루 2만 보 도보 여행에도 발이 편안한 초경량 니트 스니커즈와 린넨 슈즈 파우치 세트입니다.',
    basePrice: 78000,
    originalPrice: 99000,
    costPrice: 38000,
    stock: 38,
    imageUrl: '/assets/aistudio/product_walking_sneakers_1795351235282_ba0257f6.jpg',
    weightKg: 0.56,
    dimensionsCm: '30×20×12',
    sumCm: 62,
    liquidMl: null,
    batteryWh: null,
    volumeUnits: 14,
    colors: ['오트밀 베이지'],
    variants: [
      {
        id: '240mm',
        label: '240mm + 슈즈 파우치',
        specText: '0.52kg · 통기성 니트',
        weightKg: 0.52,
        dimensionsCm: '29×19×11',
        sumCm: 59,
        priceDelta: 0,
        volumeUnits: 13,
      },
      {
        id: '265mm',
        label: '265mm + 슈즈 파우치',
        specText: '0.56kg · 통기성 니트',
        weightKg: 0.56,
        dimensionsCm: '30×20×12',
        sumCm: 62,
        priceDelta: 0,
        volumeUnits: 14,
      },
    ],
    freeGift: '아치 서포트 여분 인솔 증정',
    exchangePolicy: '실내 착화 시 7일 이내 무료 사이즈 교환',
    regulationIds: ['reg-walk'],
    localConversionId: 'local-weather-gear',
    recommendedModes: ['walk', 'car', 'train'],
    active: true,
  },
];

export const ROLL_CALL_ITEMS: RollCallItem[] = [
  {
    id: 'rc-carrier',
    name: '캐리어 · 여행가방',
    question: '선택하신 이동 수단 규격(세 변 합 115cm/100cm)에 맞는 캐리어나 백팩이 집에 있나요?',
    category: '캐리어·가방',
    productId: 'railbag-carrier',
    localConversionId: 'local-luggage-locker',
  },
  {
    id: 'rc-clothes',
    name: '패션 의류 · 압축 큐브',
    question: '일정에 맞는 구김 적은 외출복·이지웨어와 압축 패킹 큐브가 준비되어 있나요?',
    category: '의류·수면',
    productId: 'apparel-cubes',
    localConversionId: 'local-laundry-amenity',
  },
  {
    id: 'rc-underwear',
    name: '여유분 속옷 · 양말',
    question: '여행 일수(+여유 1일)에 맞는 속옷·양말 세트는 챙기셨나요?',
    category: '의류·수면',
    productId: 'loungewear',
    localConversionId: 'local-laundry-amenity',
  },
  {
    id: 'rc-battery',
    name: '기내 반입 보조배터리(100Wh 이하)',
    question: '100Wh 이하 기준을 통과하고 단자 절연이 가능한 보조배터리가 있나요?',
    category: '전자·배터리',
    productId: 'power-bank-10k',
    localConversionId: 'local-luggage-locker',
  },
  {
    id: 'rc-toothpaste',
    name: '휴대용 치약(100ml 이하)',
    question: '기내·객실 반입 가능한 100ml 이하 휴대용 치약은 챙기셨나요?',
    category: '세면·위생',
    productId: 'toothbrush-kit',
    localConversionId: 'local-liquids-store',
  },
  {
    id: 'rc-toothbrush',
    name: '위생 케이스 칫솔 · 세면 세트',
    question: '통풍 케이스가 있는 칫솔과 80ml 이하 소분 세면용품은 준비되셨나요?',
    category: '세면·위생',
    productId: 'bath-set',
    localConversionId: 'local-liquids-store',
  },
  {
    id: 'rc-wipes',
    name: '휴대용 물티슈 · 위생 파우치',
    question: '이동 중·식당에서 바로 쓸 휴대용 물티슈와 방수 위생 파우치가 있나요?',
    category: '세면·위생',
    productId: 'hygiene-pouch',
    localConversionId: 'local-liquids-store',
  },
  {
    id: 'rc-docs',
    name: '여권 · 신분증 · 우양산',
    question: '신분증/여권을 넣을 RFID 오거나이저와 돌발 비 대비 초경량 우양산은 챙기셨나요?',
    category: '야외·필수',
    productId: 'passport-wallet',
    localConversionId: 'local-weather-gear',
  },
];

export const DIAGNOSTIC_PRESETS: DiagnosticPreset = {
  destinations: [
    // 국내 주요 권역 (9)
    { id: 'busan', regionGroup: 'domestic', label: '부산', sub: '해양·KTX·지하철·도보', tip: 'KTX 상단 선반(깊이 38cm)과 해변·지하철 환승이 많아 20인치 캐빈핏 또는 28L 백팩이 가장 유리합니다.', defaultModes: ['train', 'subway', 'walk'] },
    { id: 'gangneung', regionGroup: 'domestic', label: '강릉', sub: '동해안·KTX·고속버스·카페', tip: 'KTX 선반(38cm)과 고속버스 차내 선반(100cm)을 동시 충족하는 컴팩트 규격을 권장합니다.', defaultModes: ['train', 'bus', 'walk'] },
    { id: 'yeosu', regionGroup: 'domestic', label: '여수', sub: '섬·여객선·열차·야경', tip: '연안여객선 20kg·방수 기준과 돌산·오동도 도보 산책에 맞춰 방수 위생 파우치를 챙기세요.', defaultModes: ['train', 'ship', 'walk'] },
    { id: 'gyeongju', regionGroup: 'domestic', label: '경주', sub: '도보·역사·자전거·KTX', tip: '신경주역 KTX 하차 후 유적지 도보·자전거 이동이 많아 양손 자유로운 28L 백팩·슬링백이 좋습니다.', defaultModes: ['train', 'walk', 'bus'] },
    { id: 'jeonju', regionGroup: 'domestic', label: '전주', sub: '한옥마을·미식·도보·고속버스', tip: '한옥마을 골목은 계단·자갈길이 많아 캐리어보다 도보 6kg 이하 백팩·슬링백 구성이 편합니다.', defaultModes: ['bus', 'walk'] },
    { id: 'chuncheon', regionGroup: 'domestic', label: '춘천', sub: '근교·ITX·드라이브·호수', tip: 'ITX-청춘 열차·자가용 근교 코스로, 도로교통법 제39조 트렁크 고정 및 경량 패킹이 적합합니다.', defaultModes: ['train', 'car', 'walk'] },
    { id: 'daegu', regionGroup: 'domestic', label: '대구', sub: '도심·지하철·카페·야시장', tip: '대구 도시철도·KTX 연계 도심 코스로 개찰구 통과가 쉬운 20인치 이하 규격을 추천합니다.', defaultModes: ['train', 'subway', 'walk'] },
    { id: 'andong', regionGroup: 'domestic', label: '안동', sub: '하회마을·전통·버스·자가용', tip: '안동·하회마을 셔틀버스·자가용 이동이 많아 100cm 차내 가방과 자외선 차단 소품이 유용합니다.', defaultModes: ['car', 'bus', 'walk'] },
    { id: 'jeju', regionGroup: 'domestic', label: '제주', sub: '항공·렌터카·배·올레길', tip: '기내 10kg·액체 100ml·배터리 100Wh 규정과 렌터카 도로교통법 제39조 안전 적재를 동시 확인해야 합니다.', defaultModes: ['flight', 'car', 'walk'] },
    // 해외 권역 (8)
    { id: 'japan', regionGroup: 'overseas', label: '일본', sub: '국제선·전철·도보 2만보', tip: '국제선 액체 100ml(1L 지퍼백)·100Wh 보조배터리 기준과 도심 전철 코인락커·도보 환승에 맞춘 초경량이 핵심입니다.', defaultModes: ['flight', 'subway', 'walk'] },
    { id: 'southeast-asia', regionGroup: 'overseas', label: '동남아', sub: '항공·리조트·우기·드럭스토어', tip: '무거운 선크림·샤워용품은 현지 편의점·드럭스토어 조달로 전환하고, 방수 파우치와 초경량 우양산을 챙기세요.', defaultModes: ['flight', 'walk'] },
    { id: 'europe', regionGroup: 'overseas', label: '유럽', sub: '국제선·철도(유레일)·돌길', tip: '유럽 돌길·지하철 계단과 유레일 선반을 고려해 20인치 이하 캐빈핏 + RFID 지갑 + 코인세탁 전환을 권장합니다.', defaultModes: ['flight', 'train', 'walk'] },
    { id: 'taiwan-hk', regionGroup: 'overseas', label: '대만/홍콩/마카오', sub: '단거리 항공·MRT·야시장 도보', tip: '습한 날씨와 야시장 도보 동선이 길어 100ml 소분 키트, 휴대용 물티슈, 접이식 우양산이 필수입니다.', defaultModes: ['flight', 'subway', 'walk'] },
    { id: 'china-mongolia', regionGroup: 'overseas', label: '중국/몽골', sub: '항공·고속철·보조배터리 엄격', tip: '중국 내 고속철·공항은 보조배터리 Wh 표기 확인이 엄격하므로 37Wh(10,000mAh) 정품 표기 모델이 안전합니다.', defaultModes: ['flight', 'train', 'bus'] },
    { id: 'americas', regionGroup: 'overseas', label: '미주/캐나다/하와이', sub: '장거리 항공·렌터카·110V', tip: '장거리 기내 숙면(목베개·안대)과 110V 멀티 어댑터, 디지털 수하물 저울 및 도로교통법·렌터카 적재 확인이 필수입니다.', defaultModes: ['flight', 'car'] },
    { id: 'guam-saipan', regionGroup: 'overseas', label: '괌/사이판', sub: '휴양 항공·렌터카·해양액티비티', tip: '수상 액티비티 대비 방수 파우치·선크림 50ml와 렌터카 트렁크 고정·시야 확보 기준을 권장합니다.', defaultModes: ['flight', 'car', 'ship'] },
    { id: 'oceania', regionGroup: 'overseas', label: '호주/뉴질랜드', sub: '장거리 항공·캠퍼밴·트레킹', tip: '강한 자외선 대비 선글라스·선크림(50ml), 장거리 기내 숙면 키트 및 멀티 어댑터 구성을 추천합니다.', defaultModes: ['flight', 'car', 'walk'] },
  ],
  durations: [
    { id: 'day', label: '당일치기', factor: 0.55, tip: '28L 백팩이나 슬링백(6kg 이하)으로 두 손 가볍게 이동하는 초경량 동선을 추천합니다.' },
    { id: '1n2d', label: '1박 2일', factor: 0.75, tip: '18~20인치 캐빈핏 또는 28L 백팩에 1일분 여벌 의류·소분 세면 키트만 담으면 충분합니다.' },
    { id: '2n3d', label: '2박 3일', factor: 1.0, tip: '20인치 캐리어(115cm)와 압축 패킹 큐브 4종으로 테트리스 적재율 75% 이하를 유지하세요.' },
    { id: '3n4d', label: '3박 4일 이상', factor: 1.25, tip: '의류·타월 부피가 85%를 넘기기 쉬우므로 숙소 어메니티·현지 세탁 전환을 병행하세요.' },
    { id: 'long', label: '장거리/해외 일정', factor: 1.45, tip: '장거리 비행·시차 대비 목베개·멀티 어댑터·수하물 저울과 100ml/100Wh 기내 규정 점검이 필수입니다.' },
  ],
  themes: [
    { id: 'cafe', label: '카페 & 맛집', extraProductIds: ['sling-messenger', 'walking-sneakers', 'hygiene-pouch'], tip: '도보·대중교통 골목 이동이 잦아 초경량 슬링백과 휴대용 물티슈·워킹화가 유리합니다.' },
    { id: 'nature', label: '자연 & 바다 힐링', extraProductIds: ['sunscreen-tube', 'cap-sunglasses', 'hygiene-pouch'], tip: '자외선·바닷바람·습기에 대비한 50ml 선크림·편광 선글라스·방수 파우치가 핵심입니다.' },
    { id: 'photo', label: '감성 사진 & 인생샷', extraProductIds: ['power-bank-10k', 'cap-sunglasses', 'folding-umbrella'], tip: '촬영으로 배터리 소모가 커서 기내 100Wh 통과 37Wh 보조배터리와 돌발 비 대비 우양산이 필수입니다.' },
    { id: 'history', label: '역사·문화', extraProductIds: ['travel-backpack', 'walking-sneakers', 'passport-wallet'], tip: '유적지·박물관 관람 동선이 길어 28L 도보 백팩과 티켓·신분증 오거나이저가 편리합니다.' },
    { id: 'business', label: '비즈니스·출장', extraProductIds: ['fast-charger', 'power-bank-10k', 'railbag-carrier'], tip: 'KTX·기내 빠른 출입을 위한 35W GaN 고속충전기, RFID 여권지갑, 20인치 캐빈핏 조합을 추천합니다.' },
  ],
  companions: [
    { id: 'solo', label: '혼자 떠나는 여행', tip: '역사 물품보관함·대중교통 환승에 최적화된 6kg 이하 1인 초경량 패킹을 추천합니다.' },
    { id: 'friend', label: '친구·연인', tip: '충전기·세면 튜브·여분 파우치 등 공용 물품을 분담하면 인당 짐 무게를 30% 이상 줄일 수 있습니다.' },
    { id: 'family', label: '가족(부모님/아이)', tip: '상비약·물티슈·자외선 차단제·목베개 등 이동 중 돌봄 용품을 손 닿는 슬링·보조가방에 분리 수납하세요.' },
  ],
  businessCompanions: [
    { id: 'biz-solo', label: '혼자 출장', tip: '단독 이동·환승·물품보관함 중심 초경량 1인 비즈니스 패킹(18~20인치 캐빈핏·35W GaN 고속충전기)을 추천합니다.' },
    { id: 'biz-team', label: '동료·팀 출장', tip: '충전기·멀티 어댑터·업무/공용 장비를 팀원 간 분담해 인당 짐 무게를 30% 이상 절감하세요.' },
    { id: 'biz-client', label: '거래처·바이어·의전 동행', tip: '구김 방지 복장 수납(압축 큐브)과 비즈니스·회의 필수품(서류 토트·RFID 오거나이저) 중심 단정한 수납을 추천합니다.' },
  ],
};

// Mutable runtime store for Admin Console CRUD, Banners, Click Tracking, 5 Core Logs, Automations
class StoreRuntimeState {
  products: CatalogProduct[] = INITIAL_CATALOG_PRODUCTS.map((p) => ({
    ...p,
    colors: [...p.colors],
    variants: p.variants.map((v) => ({ ...v })),
    regulationIds: [...p.regulationIds],
    recommendedModes: [...p.recommendedModes],
  }));

  banners: PromoBanner[] = [
    {
      id: 'banner-1',
      badge: 'FACT-FIRST',
      text: '이불 밖을 나서는 순간부터 도보·KTX·항공 최소규정을 챗봇이 실시간 검증합니다',
      active: true,
    },
    {
      id: 'banner-2',
      badge: '현지 전환',
      text: '100ml 초과 액체류·24인치 초과 수하물은 현지 편의점·보관함 전환으로 가볍게 떠나세요',
      active: true,
    },
    {
      id: 'banner-3',
      badge: '사은품',
      text: '레일백 캐리어 주문 시 방수 압축 파우치 3종 + 선반 보호 네임택 100% 무료 증정',
      active: true,
    },
  ];

  heroSlides: HeroSlide[] = [
    {
      id: 'hero-walk-train',
      themeTag: '01. 도보 · 철도(KTX·SRT) 국내 출발',
      headline: 'KTX 선반 38cm와 도보 6kg까지, 딱 맞는 짐만 챙기세요',
      subtitle:
        '집 밖을 나서는 첫 걸음부터 열차 상단 선반 규격까지, 지식 그래프 공식 기준으로 불필요한 무게를 덜어드립니다.',
      imageUrl: '/assets/aistudio/hero_train_travel_1795251607938_f1bdc1fd.jpg',
      specBadges: ['세 변 합 115cm', '선반 깊이 38cm', '도보 권장 6kg'],
      transportModes: ['walk', 'train'],
      linkedPrompt:
        '도보와 KTX·SRT 열차를 함께 이용하는 1박 2일 국내 여행인데 선반 38cm와 도보 6kg 기준에 맞는 캐리어와 필수 준비물을 추천해줘',
      hashtags: [
        {
          label: '#KTX선반38cm',
          prompt: 'KTX·SRT 상단 선반(38cm)에 바로 들어가는 20인치 이하 가방을 추천해줘',
          modes: ['train', 'walk'],
          nodeId: 'reg-train',
        },
        {
          label: '#도보6kg경량',
          prompt: '도보 환승이 많은데 총 무게 6kg 이하로 꾸릴 수 있는 백팩과 필수템 알려줘',
          modes: ['walk'],
          nodeId: 'reg-walk',
        },
        {
          label: '#부산1박2일',
          prompt: '부산 KTX + 도보 1박 2일 일정 기준으로 챙길 짐과 살 물건을 정리해줘',
          modes: ['train', 'subway', 'walk'],
          nodeId: 'railbag-carrier',
        },
      ],
      nodeIds: ['reg-train', 'reg-walk', 'src-korail-train', 'railbag-carrier'],
      active: true,
    },
    {
      id: 'hero-car-ship',
      themeTag: '02. 자가용 · 여객선 로드트립',
      headline: '도로교통법 제39조 시야 확보와 여객선 방수 적재를 한 번에',
      subtitle:
        '트렁크 적재 안전 기준과 섬·연안여객선 20kg·방수 규정에 맞춘 드라이브·해양 여행 세트를 확인하세요.',
      imageUrl: '/assets/aistudio/hero_roadtrip_activity_1795251607655_56620ce6.jpg',
      specBadges: ['도로교통법 제39조', '여객선 20kg', '방수·단자보호'],
      transportModes: ['car', 'ship'],
      linkedPrompt:
        '자가용과 여객선을 타는 제주·남해 로드트립 여행인데 도로교통법 제39조 적재 기준과 여객선 방수·배터리 규정을 알려줘',
      hashtags: [
        {
          label: '#도로교통법제39조',
          prompt: '자가용 트렁크 적재 시 도로교통법 제39조 안전 기준과 추천 정리 용품을 알려줘',
          modes: ['car'],
          nodeId: 'reg-car',
        },
        {
          label: '#여객선20kg방수',
          prompt: '여객선 수하물 20kg 기준과 해풍 대비 방수 위생 파우치 구성을 보여줘',
          modes: ['ship'],
          nodeId: 'reg-ship',
        },
        {
          label: '#야외자외선대비',
          prompt: '해변 로드트립용 선크림 50ml와 모자·선글라스 하드케이스를 추천해줘',
          modes: ['car', 'ship', 'walk'],
          nodeId: 'src-mof-ship',
        },
      ],
      nodeIds: ['reg-car', 'reg-ship', 'src-law-road39', 'src-mof-ship'],
      active: true,
    },
    {
      id: 'hero-bus-flight',
      themeTag: '03. 버스 · 공항 · 해외 기내 규정',
      headline: '기내 액체 100ml · 배터리 100Wh · 버스 100cm 기준 즉시 통과',
      subtitle:
        '공항 보안검색대와 고속버스 차내 수납 규정을 동시에 충족하는 검증된 스펙만 골라 담으세요.',
      imageUrl: '/assets/aistudio/hero_editorial_travel_store_1795249600525_5de0705c.jpg',
      specBadges: ['기내 10kg · 115cm', '액체류 100ml', '배터리 100Wh'],
      transportModes: ['bus', 'flight'],
      linkedPrompt:
        '고속버스와 항공 기내 반입을 함께 이용하는데 액체 100ml, 리튬배터리 100Wh, 버스 차내 100cm 기준에 통과하는 준비물을 추천해줘',
      hashtags: [
        {
          label: '#기내액체100ml',
          prompt: '항공 기내 액체류 100ml·1L 투명 지퍼백 규정을 통과하는 세면 세트를 추천해줘',
          modes: ['flight'],
          nodeId: 'reg-flight',
        },
        {
          label: '#배터리100Wh',
          prompt: '기내 반입 가능한 100Wh 이하 보조배터리와 단자 절연 기준이 궁금해',
          modes: ['flight', 'bus'],
          nodeId: 'power-bank-10k',
        },
        {
          label: '#고속버스100cm',
          prompt: '고속버스 차내 선반(10kg · 세 변 합 100cm)에 들어가는 가방을 추천해줘',
          modes: ['bus'],
          nodeId: 'reg-bus',
        },
      ],
      nodeIds: ['reg-flight', 'reg-bus', 'src-molit-flight', 'power-bank-10k'],
      active: true,
    },
    {
      id: 'hero-pack-local',
      themeTag: '04. 압축 패킹 & 현지 조달 전환',
      headline: '무거운 액체·대형 짐은 현지 조달로 전환해 두 손 가볍게',
      subtitle:
        '적재율 85%를 넘기 전에 압축 패킹과 현지 편의점·물품보관함 전환으로 가장 가벼운 동선을 설계합니다.',
      imageUrl: '/assets/aistudio/hero_journey_planner_1795251607276_20a23c47.jpg',
      specBadges: ['적재율 85% 방어', '부피 40% 압축', '현지 조달 전환'],
      transportModes: ['flight', 'walk'],
      linkedPrompt:
        '짐 적재율과 무게를 줄이기 위해 압축 패킹 큐브와 현지 편의점·수하물 보관함으로 전환할 수 있는 항목을 추천해줘',
      hashtags: [
        {
          label: '#압축패킹40%',
          prompt: '20인치 캐리어 적재율을 높여주는 압축 패킹 큐브와 이지웨어를 추천해줘',
          modes: ['flight', 'train'],
          nodeId: 'apparel-cubes',
        },
        {
          label: '#현지편의점전환',
          prompt: '100ml가 넘는 샴푸·클렌저를 현지 편의점에서 조달하면 무게가 얼마나 줄어드나요?',
          modes: ['flight', 'walk'],
          nodeId: 'local-liquids-store',
        },
        {
          label: '#역사짐보관전환',
          prompt: '24인치 이상 큰 수하물을 역·공항 물품보관함이나 배송으로 전환하는 기준을 알려줘',
          modes: ['train', 'walk'],
          nodeId: 'local-luggage-locker',
        },
      ],
      nodeIds: ['local-liquids-store', 'local-luggage-locker', 'local-laundry-amenity', 'apparel-cubes'],
      active: true,
    },
  ];

  heroClickStats: Record<string, HeroClickStat> = {
    'hero-walk-train': { bannerClicks: 148, hashtagClicks: 219, lastClickedAt: '2026-11-22 05:30' },
    'hero-car-ship': { bannerClicks: 84, hashtagClicks: 112, lastClickedAt: '2026-11-22 05:18' },
    'hero-bus-flight': { bannerClicks: 192, hashtagClicks: 274, lastClickedAt: '2026-11-22 05:35' },
    'hero-pack-local': { bannerClicks: 109, hashtagClicks: 163, lastClickedAt: '2026-11-22 05:22' },
  };

  automations: AutomationRule[] = [
    {
      id: 'auto-mkt-1',
      domain: '마케팅',
      title: '장바구니 규정 통과 상품 리마인드',
      condition: '장바구니 적재 후 24시간 미결제 고객',
      action: '선택 이동수단 규정 적합 확인 알림 및 5% 웰컴 쿠폰 발행',
      enabled: true,
      executionsCount: 142,
      lastRunAt: '2026-11-22 05:10',
    },
    {
      id: 'auto-log-1',
      domain: '물류',
      title: '출발일 D-2 긴급 출고 자동 우선배정',
      condition: '주문서 departureDate가 48시간 이내인 결제완료 주문',
      action: '당일 15시 이전 택배사(CJ대한통운) 특송 라벨 자동 발급',
      enabled: true,
      executionsCount: 38,
      lastRunAt: '2026-11-22 04:45',
    },
    {
      id: 'auto-ret-1',
      domain: '반품',
      title: '규격 미달·미개봉 교환 자동 승인',
      condition: '1:1 문의 분류가 교환·환불이며 수령 후 7일 이내',
      action: '회수 송장 자동 생성 및 사이즈 교환 재고 선점',
      enabled: false,
      executionsCount: 19,
      lastRunAt: '2026-11-21 19:20',
    },
  ];

  actionTasks: ActionCenterTask[] = [
    {
      id: 'act-1',
      priority: 'high',
      category: '규정 경보',
      title: '항공+도보 복합 고객의 24인치 캐리어 선택 이탈 감지',
      description: '챗봇 세션에서 24인치 선택 후 현지 보관함 전환 카드로 68% 방어됨. 20인치 우선 노출 권장.',
      status: 'open',
    },
    {
      id: 'act-2',
      priority: 'medium',
      category: '재고 알림',
      title: '어반 트랜짓 28L 백팩 재고 35개 미만 주의',
      description: '도보·버스 수요 증가로 최근 48시간 클릭률 +24% 상승. 발주 확인 필요.',
      status: 'open',
    },
    {
      id: 'act-3',
      priority: 'medium',
      category: '문의 처리',
      title: '1:1 문의(배송 문의) 응답 SLA 점검',
      description: '미답변 문의 건 확인 및 자동 송장 안내 연계.',
      status: 'open',
    },
  ];

  clickStats: Record<string, { views: number; cartAdds: number; localConverts: number; sourceClicks: number }> = {
    'railbag-carrier': { views: 412, cartAdds: 118, localConverts: 27, sourceClicks: 64 },
    'power-bank-10k': { views: 356, cartAdds: 142, localConverts: 4, sourceClicks: 89 },
    'toothbrush-kit': { views: 289, cartAdds: 131, localConverts: 38, sourceClicks: 42 },
    'apparel-cubes': { views: 274, cartAdds: 96, localConverts: 19, sourceClicks: 21 },
    'travel-backpack': { views: 245, cartAdds: 84, localConverts: 11, sourceClicks: 33 },
    'bath-set': { views: 218, cartAdds: 79, localConverts: 44, sourceClicks: 51 },
  };

  nodeHits: Record<string, number> = {
    'reg-flight': 312,
    'reg-train': 248,
    'reg-walk': 194,
    'reg-car': 87,
    'reg-bus': 115,
    'reg-subway': 142,
    'reg-ship': 53,
    'src-molit-flight': 184,
    'src-korail-train': 129,
    'src-law-road39': 46,
    'local-liquids-store': 91,
    'local-luggage-locker': 67,
    'local-laundry-amenity': 44,
    'local-weather-gear': 29,
  };

  funnelCounters = {
    sessions: 1240,
    diagnosticDone: 890,
    rollCallDone: 642,
    cartAdded: 418,
    ordersCompleted: 186,
  };

  extraRevenue = 0;
  extraOrders = 0;

  logs: LogEntry[] = [
    {
      id: 'log-seed-1',
      category: 'ai_rag_regulation',
      timestamp: '2026-11-22 05:28:12',
      actor: 'Gemini RAG Engine',
      summary: '항공+철도+도보 복합 규정 조회 (최소 하중 6kg · 합 115cm · 액체 100ml)',
      detail: '출처: 국토교통부 항공보안법, 코레일 제14조, KSPO 도보 가이드',
      nodeIds: ['reg-flight', 'reg-train', 'reg-walk', 'src-molit-flight'],
      severity: 'info',
    },
    {
      id: 'log-seed-2',
      category: 'product_click_conversion',
      timestamp: '2026-11-22 05:24:40',
      actor: 'Storefront Click Tracker',
      summary: '레일백 20인치 캐빈핏 상세 조회 → 장바구니 전환',
      detail: '옵션: 20인치 캐빈핏 / 레일웨이 네이비 (89,000원)',
      nodeIds: ['railbag-carrier', 'reg-train'],
      severity: 'success',
    },
    {
      id: 'log-seed-3',
      category: 'local_alert',
      timestamp: '2026-11-22 05:19:05',
      actor: 'Rule Guardrail',
      summary: '대용량 샴푸·클렌저 100ml 초과 감지 → 현지 편의점 구매 전환',
      detail: 'weightSaved: 0.7kg, volumeSaved: 12 units',
      nodeIds: ['local-liquids-store', 'reg-flight'],
      severity: 'warning',
    },
    {
      id: 'log-seed-4',
      category: 'order_logistics',
      timestamp: '2026-11-22 05:12:33',
      actor: 'Firebase Order Sync',
      summary: '주문 #ORD-261122-408 결제완료 (CJ대한통운 배정)',
      detail: '레일백 20인치 + 보조배터리 37Wh · 118,000원',
      nodeIds: ['railbag-carrier', 'power-bank-10k'],
      severity: 'success',
    },
    {
      id: 'log-seed-5',
      category: 'admin_audit',
      timestamp: '2026-11-22 04:55:00',
      actor: 'System Boot',
      summary: '지식 그래프 v2.4 & 카탈로그 18종 동기화 완료',
      detail: '공식 출처 7개 · 규정 7개 · 현지 전환 4개 노드 검증됨',
      nodeIds: ['src-molit-flight', 'src-korail-train', 'src-law-road39'],
      severity: 'info',
    },
  ];

  addLog(
    category: FiveLogCategory,
    actor: string,
    summary: string,
    detail: string,
    nodeIds: string[] = [],
    severity: 'info' | 'warning' | 'success' = 'info'
  ) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      timestamp: now,
      actor,
      summary,
      detail,
      nodeIds,
      severity,
    });
    if (this.logs.length > 150) {
      this.logs.length = 150;
    }
    nodeIds.forEach((nId) => {
      this.nodeHits[nId] = (this.nodeHits[nId] || 0) + 1;
    });
  }
}

export const storeRuntime = new StoreRuntimeState();

export function getLiveCatalogForGemini(): CatalogProduct[] {
  return storeRuntime.products.filter((p) => p.active);
}

export function computeStrictestConstraints(modesInput: TransportModeId[]): StrictestConstraints {
  const validModes: TransportModeId[] =
    modesInput.length > 0
      ? modesInput.filter((m): m is TransportModeId =>
          ['walk', 'car', 'subway', 'bus', 'train', 'ship', 'flight'].includes(m)
        )
      : ['train', 'walk'];

  const regs = REGULATION_NODES.filter((r) => validModes.includes(r.transportMode));
  const sourceMap = new Map<string, OfficialSourceNode>();
  const regWithSources = regs.map((reg) => {
    const src = OFFICIAL_SOURCES.find((s) => s.id === reg.sourceId) || OFFICIAL_SOURCES[0];
    sourceMap.set(src.id, src);
    return { ...reg, source: src };
  });

  const weightLimits = regs.map((r) => r.maxWeightKg).filter((v): v is number => v !== null);
  const sumLimits = regs.map((r) => r.maxSumCm).filter((v): v is number => v !== null);
  const liquidLimits = regs.map((r) => r.maxLiquidMl).filter((v): v is number => v !== null);
  const batteryLimits = regs.map((r) => r.maxBatteryWh).filter((v): v is number => v !== null);
  const legalNotices = regs
    .map((r) => r.legalNote)
    .filter((v): v is string => Boolean(v));

  const maxWeightKg = weightLimits.length ? Math.min(...weightLimits) : 20;
  const maxSumCm = sumLimits.length ? Math.min(...sumLimits) : 115;
  const maxLiquidMl = liquidLimits.length ? Math.min(...liquidLimits) : null;
  const maxBatteryWh = batteryLimits.length ? Math.min(...batteryLimits) : null;

  const summaryParts = [
    `최대 중량 ${maxWeightKg}kg`,
    `세 변 합 ${maxSumCm}cm`,
    maxLiquidMl !== null ? `액체 ${maxLiquidMl}ml` : null,
    maxBatteryWh !== null ? `배터리 ${maxBatteryWh}Wh` : null,
    validModes.includes('car') ? '도로교통법 제39조' : null,
  ].filter(Boolean);

  return {
    selectedModes: validModes,
    maxWeightKg,
    maxSumCm,
    maxLiquidMl,
    maxBatteryWh,
    legalNotices,
    headlineSummary: summaryParts.join(' · '),
    regulations: regWithSources,
    sources: Array.from(sourceMap.values()),
    fetchedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }),
  };
}

export function buildCitationsFromConstraints(constraints: StrictestConstraints): FactCitation[] {
  return constraints.sources.map((src) => ({
    sourceName: src.name,
    standardTitle: src.standardTitle,
    verifiedDate: src.verifiedDate,
    fetchedAt: constraints.fetchedAt,
    url: src.url,
    advisoryText: '지식 그래프·실시간 카탈로그 조회 기준이며, 실제 탑승·출발 전 공식 운송사 원문을 최종 확인하시기 바랍니다.',
  }));
}

export function evaluateProductAgainstConstraints(
  product: CatalogProduct,
  constraints: StrictestConstraints
): { status: 'pass' | 'caution' | 'exceeds'; note: string } {
  const exceedsReasons: string[] = [];
  const cautionReasons: string[] = [];
  if (product.sumCm > constraints.maxSumCm) {
    exceedsReasons.push(`세 변 합 ${product.sumCm}cm > 이동수단 한도 ${constraints.maxSumCm}cm`);
  }
  if (product.weightKg > constraints.maxWeightKg) {
    exceedsReasons.push(`단품 ${product.weightKg}kg > 한도 ${constraints.maxWeightKg}kg`);
  }
  if (constraints.maxLiquidMl !== null && product.liquidMl !== null && product.liquidMl > constraints.maxLiquidMl) {
    exceedsReasons.push(`액체 ${product.liquidMl}ml > 기내 ${constraints.maxLiquidMl}ml`);
  }
  if (constraints.maxBatteryWh !== null && product.batteryWh !== null && product.batteryWh > constraints.maxBatteryWh) {
    exceedsReasons.push(`배터리 ${product.batteryWh}Wh > ${constraints.maxBatteryWh}Wh`);
  }

  if (exceedsReasons.length > 0) {
    return {
      status: 'exceeds',
      note: `규격초과 (${exceedsReasons.join(', ')}) — 현지 조달 또는 규격 조정 권장`,
    };
  }
  if (product.sumCm > constraints.maxSumCm - 10 && product.category === '캐리어·가방') {
    cautionReasons.push(`이동수단 최대(${constraints.maxSumCm}cm) 근접`);
  }
  if (constraints.maxWeightKg <= 6 && product.weightKg >= 2.0) {
    cautionReasons.push(`도보 권장 6kg 중 ${product.weightKg}kg 차지`);
  }
  if (cautionReasons.length > 0) {
    return {
      status: 'caution',
      note: `규정주의 (${cautionReasons.join(', ')}) · ${product.dimensionsCm}cm`,
    };
  }
  return {
    status: 'pass',
    note: `이동수단 기준 통과 (${product.weightKg}kg · 합 ${product.sumCm}cm)`,
  };
}

export function retrieveGroundedContext(userMessage: string, modes: TransportModeId[]) {
  const constraints = computeStrictestConstraints(modes);
  const catalog = getLiveCatalogForGemini();
  const q = userMessage.toLowerCase();

  // Score products by keyword relevance + transport compatibility
  const scoredProducts = catalog
    .map((p) => {
      let score = 0;
      const hay = `${p.name} ${p.category} ${p.shortTag} ${p.description}`.toLowerCase();
      const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
      tokens.forEach((t) => {
        if (hay.includes(t)) score += 4;
      });
      if (q.includes('캐리어') || q.includes('가방') || q.includes('배낭') || q.includes('짐')) {
        if (p.category === '캐리어·가방') score += 5;
      }
      if (q.includes('배터리') || q.includes('충전') || q.includes('어댑터') || q.includes('저울')) {
        if (p.category === '전자·배터리') score += 5;
      }
      if (q.includes('치약') || q.includes('칫솔') || q.includes('물티슈') || q.includes('액체') || q.includes('세면') || q.includes('선크림') || q.includes('스킨')) {
        if (p.category === '세면·위생') score += 5;
      }
      if (q.includes('옷') || q.includes('의류') || q.includes('속옷') || q.includes('파우치') || q.includes('잠') || q.includes('목베개') || q.includes('신발')) {
        if (p.category === '의류·수면') score += 5;
      }
      if (q.includes('우산') || q.includes('여권') || q.includes('모자') || q.includes('선글라스')) {
        if (p.category === '야외·필수') score += 5;
      }
      if (p.recommendedModes.some((m) => modes.includes(m))) {
        score += 2;
      }
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score);

  const candidateProducts = scoredProducts.slice(0, 8).map((s) => s.product);

  const relevantLocals = LOCAL_CONVERSION_NODES.filter((node) => {
    if (modes.includes('flight') && node.id === 'local-liquids-store') return true;
    if ((modes.includes('walk') || modes.includes('bus') || modes.includes('train')) && node.id === 'local-luggage-locker') return true;
    if (q.includes('초과') || q.includes('무거') || q.includes('큰') || q.includes('24인치') || q.includes('샴푸') || q.includes('현지')) {
      return true;
    }
    return false;
  });

  return {
    constraints,
    candidateProducts,
    relevantLocals: relevantLocals.length > 0 ? relevantLocals : LOCAL_CONVERSION_NODES.slice(0, 2),
  };
}
