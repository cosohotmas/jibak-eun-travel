import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, MapPin, CheckCircle2, Globe } from 'lucide-react';

export interface SelectedAddressResult {
  zipCode: string;
  baseAddress: string;
  buildingName?: string;
}

interface AddressSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAddress: (result: SelectedAddressResult) => void;
}

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
  bname?: string;
  address: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode?: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string | number;
        height?: string | number;
      }) => {
        embed: (el: HTMLElement) => void;
      };
    };
  }
}

interface KoreanAddressEntry {
  zipCode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  keywords: string;
}

const BUILTIN_KOREAN_ADDRESSES: KoreanAddressEntry[] = [
  {
    zipCode: '06234',
    roadAddress: '서울특별시 강남구 테헤란로 152',
    jibunAddress: '서울특별시 강남구 역삼동 737',
    buildingName: '강남파이낸스센터(GFC)',
    keywords: '서울 강남 역삼 테헤란로 강남역 gfc',
  },
  {
    zipCode: '06164',
    roadAddress: '서울특별시 강남구 영동대로 513',
    jibunAddress: '서울특별시 강남구 삼성동 159',
    buildingName: '코엑스(COEX)',
    keywords: '서울 강남 삼성동 영동대로 코엑스 삼성역',
  },
  {
    zipCode: '06611',
    roadAddress: '서울특별시 서초구 사평대로 205',
    jibunAddress: '서울특별시 서초구 반포동 118-3',
    buildingName: '센트럴시티 파미에스테이션',
    keywords: '서울 서초 반포 고속터미널 센트럴시티 사평대로',
  },
  {
    zipCode: '04037',
    roadAddress: '서울특별시 마포구 양화로 160',
    jibunAddress: '서울특별시 마포구 동교동 165',
    buildingName: '홍대입구역 복합역사',
    keywords: '서울 마포 동교동 양화로 홍대 홍대입구',
  },
  {
    zipCode: '04320',
    roadAddress: '서울특별시 용산구 한강대로 405',
    jibunAddress: '서울특별시 용산구 동자동 43-205',
    buildingName: '서울역(KTX)',
    keywords: '서울 용산 중구 한강대로 서울역 ktx',
  },
  {
    zipCode: '03172',
    roadAddress: '서울특별시 종로구 세종대로 175',
    jibunAddress: '서울특별시 종로구 세종로 81-3',
    buildingName: '세종문화회관',
    keywords: '서울 종로 광화문 세종대로 세종로',
  },
  {
    zipCode: '04524',
    roadAddress: '서울특별시 중구 세종대로 110',
    jibunAddress: '서울특별시 중구 태평로1가 31',
    buildingName: '서울특별시청',
    keywords: '서울 중구 시청 태평로 세종대로 을지로',
  },
  {
    zipCode: '05551',
    roadAddress: '서울특별시 송파구 올림픽로 300',
    jibunAddress: '서울특별시 송파구 신천동 29',
    buildingName: '롯데월드타워',
    keywords: '서울 송파 잠실 신천동 올림픽로 롯데타워',
  },
  {
    zipCode: '07325',
    roadAddress: '서울특별시 영등포구 여의대로 108',
    jibunAddress: '서울특별시 영등포구 여의도동 22',
    buildingName: '파크원(더현대 서울)',
    keywords: '서울 영등포 여의도 여의대로 더현대',
  },
  {
    zipCode: '04782',
    roadAddress: '서울특별시 성동구 아차산로 100',
    jibunAddress: '서울특별시 성동구 성수동2가 315-71',
    buildingName: '성수역 3번출구',
    keywords: '서울 성동 성수동 아차산로 성수역',
  },
  {
    zipCode: '13529',
    roadAddress: '경기도 성남시 분당구 판교역로 166',
    jibunAddress: '경기도 성남시 분당구 백현동 532',
    buildingName: '카카오 판교 아지트',
    keywords: '경기 성남 분당 판교 판교역로 백현동',
  },
  {
    zipCode: '16499',
    roadAddress: '경기도 수원시 팔달구 덕영대로 924',
    jibunAddress: '경기도 수원시 팔달구 매산로1가 18',
    buildingName: '수원역',
    keywords: '경기 수원 팔달 덕영대로 수원역',
  },
  {
    zipCode: '22382',
    roadAddress: '인천광역시 중구 공항로 272',
    jibunAddress: '인천광역시 중구 운서동 2851',
    buildingName: '인천국제공항 제1여객터미널',
    keywords: '인천 중구 운서동 공항로 인천공항 터미널',
  },
  {
    zipCode: '21998',
    roadAddress: '인천광역시 연수구 컨벤시아대로 123',
    jibunAddress: '인천광역시 연수구 송도동 6-1',
    buildingName: '송도 컨벤시아',
    keywords: '인천 연수 송도 컨벤시아대로',
  },
  {
    zipCode: '48251',
    roadAddress: '부산광역시 동구 중앙대로 206',
    jibunAddress: '부산광역시 동구 초량동 1187-1',
    buildingName: '부산역(KTX)',
    keywords: '부산 동구 초량동 중앙대로 부산역 ktx',
  },
  {
    zipCode: '48094',
    roadAddress: '부산광역시 해운대구 해운대해변로 266',
    jibunAddress: '부산광역시 해운대구 우동 634-1',
    buildingName: '해운대 해수욕장',
    keywords: '부산 해운대 우동 해운대해변로',
  },
  {
    zipCode: '48303',
    roadAddress: '부산광역시 수영구 광안해변로 219',
    jibunAddress: '부산광역시 수영구 광안동 192-20',
    buildingName: '광안리 해수욕장',
    keywords: '부산 수영구 광안리 광안해변로',
  },
  {
    zipCode: '63115',
    roadAddress: '제주특별자치도 제주시 공항로 2',
    jibunAddress: '제주특별자치도 제주시 용담이동 2002',
    buildingName: '제주국제공항',
    keywords: '제주 제주시 용담동 공항로 제주공항',
  },
  {
    zipCode: '63535',
    roadAddress: '제주특별자치도 서귀포시 중문관광로 72',
    jibunAddress: '제주특별자치도 서귀포시 색달동 2864-36',
    buildingName: '중문관광단지',
    keywords: '제주 서귀포 중문 색달동 중문관광로',
  },
  {
    zipCode: '25551',
    roadAddress: '강원특별자치도 강릉시 용지로 176',
    jibunAddress: '강원특별자치도 강릉시 교동 118-5',
    buildingName: '강릉역(KTX)',
    keywords: '강원 강릉 교동 용지로 강릉역 경포',
  },
  {
    zipCode: '25465',
    roadAddress: '강원특별자치도 강릉시 창해로 514',
    jibunAddress: '강원특별자치도 강릉시 안현동 산1-9',
    buildingName: '경포 해변',
    keywords: '강원 강릉 경포대 창해로 안현동',
  },
  {
    zipCode: '59723',
    roadAddress: '전라남도 여수시 망마로 11',
    jibunAddress: '전라남도 여수시 덕충동 61-1',
    buildingName: '여수엑스포역(KTX)',
    keywords: '전남 여수 덕충동 망마로 여수엑스포역 오동도',
  },
  {
    zipCode: '38117',
    roadAddress: '경상북도 경주시 태종로 732',
    jibunAddress: '경상북도 경주시 황남동 276-2',
    buildingName: '황리단길·대릉원',
    keywords: '경북 경주 황남동 태종로 포석로 황리단길',
  },
  {
    zipCode: '55041',
    roadAddress: '전북특별자치도 전주시 완산구 태조로 44',
    jibunAddress: '전북특별자치도 전주시 완산구 풍남동3가 64-1',
    buildingName: '전주 한옥마을·경기전',
    keywords: '전북 전주 완산구 풍남동 태조로 한옥마을',
  },
  {
    zipCode: '41229',
    roadAddress: '대구광역시 동구 동대구로 550',
    jibunAddress: '대구광역시 동구 신암동 294',
    buildingName: '동대구역(KTX)',
    keywords: '대구 동구 신암동 동대구로 동대구역',
  },
  {
    zipCode: '34618',
    roadAddress: '대전광역시 동구 중앙로 215',
    jibunAddress: '대전광역시 동구 정동 1-1',
    buildingName: '대전역(KTX)',
    keywords: '대전 동구 정동 중앙로 대전역 성심당',
  },
  {
    zipCode: '24405',
    roadAddress: '춘천시 공지로 591',
    jibunAddress: '강원특별자치도 춘천시 근화동 190',
    buildingName: '춘천역',
    keywords: '강원 춘천 근화동 공지로 춘천역 남이섬',
  },
  {
    zipCode: '36685',
    roadAddress: '경상북도 안동시 경동로 122-16',
    jibunAddress: '경상북도 안동시 송현동 710',
    buildingName: '안동역(KTX)',
    keywords: '경북 안동 송현동 경동로 안동역 하회마을',
  },
];

const DAUM_POSTCODE_SCRIPT_URL =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

export const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  open,
  onClose,
  onSelectAddress,
}) => {
  const [mode, setMode] = useState<'daum' | 'builtin'>('daum');
  const [daumStatus, setDaumStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [keyword, setKeyword] = useState('');
  const embedContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || mode !== 'daum') return;

    let cancelled = false;
    setDaumStatus('loading');

    const mountDaumEmbed = () => {
      if (cancelled || !embedContainerRef.current) return;
      const PostcodeCtor = window.daum?.Postcode;
      if (!PostcodeCtor) {
        setDaumStatus('fallback');
        setMode('builtin');
        return;
      }
      try {
        embedContainerRef.current.innerHTML = '';
        new PostcodeCtor({
          width: '100%',
          height: '360px',
          oncomplete: (data: DaumPostcodeData) => {
            const roadOrJibun = data.roadAddress || data.jibunAddress || data.address;
            const bld = data.buildingName ? ` (${data.buildingName})` : '';
            onSelectAddress({
              zipCode: data.zonecode || '00000',
              baseAddress: `${roadOrJibun}${bld}`.trim(),
              buildingName: data.buildingName,
            });
            onClose();
          },
        }).embed(embedContainerRef.current);
        setDaumStatus('ready');
      } catch {
        setDaumStatus('fallback');
        setMode('builtin');
      }
    };

    if (window.daum?.Postcode) {
      mountDaumEmbed();
      return () => {
        cancelled = true;
      };
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && !window.daum?.Postcode) {
        setDaumStatus('fallback');
        setMode('builtin');
      }
    }, 1800);

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener('load', mountDaumEmbed, { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          if (!cancelled) {
            setDaumStatus('fallback');
            setMode('builtin');
          }
        },
        { once: true }
      );
    } else {
      const script = document.createElement('script');
      script.src = DAUM_POSTCODE_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        window.clearTimeout(fallbackTimer);
        mountDaumEmbed();
      };
      script.onerror = () => {
        window.clearTimeout(fallbackTimer);
        if (!cancelled) {
          setDaumStatus('fallback');
          setMode('builtin');
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [open, mode, onSelectAddress, onClose]);

  const filteredAddresses = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return BUILTIN_KOREAN_ADDRESSES.slice(0, 10);
    const tokens = q.split(/\s+/).filter(Boolean);
    return BUILTIN_KOREAN_ADDRESSES.filter((entry) => {
      const target = `${entry.zipCode} ${entry.roadAddress} ${entry.jibunAddress} ${entry.buildingName} ${entry.keywords}`.toLowerCase();
      return tokens.every((t) => target.includes(t));
    });
  }, [keyword]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              배송지 우편번호·도로명 주소 검색
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="주소 검색 닫기"
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Source Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode('builtin')}
              className={`rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer ${
                mode === 'builtin'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              빠른 도로명·지번 검색
            </button>
            <button
              type="button"
              onClick={() => setMode('daum')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer ${
                mode === 'daum'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              다음(Kakao) 우편번호
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto thin-scroll flex-1">
          {mode === 'daum' ? (
            <div className="space-y-3">
              {daumStatus === 'loading' && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 text-center text-xs text-[var(--text-secondary)]">
                  다음(Kakao) 우편번호 검색 모듈을 불러오는 중입니다... (차단 시 내장 주소 검색으로 자동 전환됩니다)
                </div>
              )}
              <div
                ref={embedContainerRef}
                className="w-full min-h-[360px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-white"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {daumStatus === 'fallback' && (
                <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                  미리보기 환경 보안 정책으로 외부 우편번호 스크립트가 제한되어 내장 주소 검색으로 자동 전환되었습니다.
                </div>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="도로명, 동(읍/면), 건물명 또는 지역 검색 (예: 테헤란로, 부산역, 제주)"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['강남 테헤란로', '홍대입구', '부산역', '해운대', '제주공항', '강릉', '판교'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setKeyword(chip)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto thin-scroll pr-0.5">
                {filteredAddresses.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-center space-y-2.5">
                    <p className="text-xs text-[var(--text-secondary)]">
                      일치하는 추천 도로명 주소가 없습니다. 입력하신 주소를 바로 적용할 수 있습니다.
                    </p>
                    {keyword.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAddress({
                            zipCode: '06234',
                            baseAddress: keyword.trim(),
                          });
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        &ldquo;{keyword.trim()}&rdquo; 주소로 적용하기
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAddresses.map((item) => (
                    <button
                      key={`${item.zipCode}-${item.roadAddress}`}
                      type="button"
                      onClick={() => {
                        onSelectAddress({
                          zipCode: item.zipCode,
                          baseAddress: `${item.roadAddress} (${item.buildingName})`,
                          buildingName: item.buildingName,
                        });
                        onClose();
                      }}
                      className="w-full text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 hover:border-[var(--brand-primary)] hover:bg-[var(--brand-tint)] transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num text-xs font-bold text-[var(--brand-primary)]">
                          [{item.zipCode}]
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                          {item.buildingName}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-1">
                        {item.roadAddress}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        지번: {item.jibunAddress}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
