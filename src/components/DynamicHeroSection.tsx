import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Compass,
} from 'lucide-react';
import type { HeroHashtag, HeroSlide, TransportModeId } from '../types/domain';

interface DynamicHeroSectionProps {
  slides: HeroSlide[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onStartDiagnosticFromHero: (slide: HeroSlide) => void;
  onTriggerChatPromptFromHero?: (
    slide: HeroSlide,
    prompt: string,
    sourceType: 'banner' | 'hashtag',
    modes?: TransportModeId[],
    hashtag?: HeroHashtag
  ) => void;
}

export const DynamicHeroSection: React.FC<DynamicHeroSectionProps> = ({
  slides,
  collapsed,
  onToggleCollapse,
  onStartDiagnosticFromHero,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0;
  const activeSlide = slides[safeIndex];

  useEffect(() => {
    if (collapsed || paused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [collapsed, paused, slides.length]);

  if (!activeSlide) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.div
            key="hero-collapsed"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold text-[var(--brand-primary)] shrink-0">
                {activeSlide.themeTag}
              </span>
              <span className="text-xs text-[var(--text-secondary)] truncate">
                {activeSlide.headline}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onStartDiagnosticFromHero(activeSlide)}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer whitespace-nowrap"
              >
                내 일정·짐 AI 점검 시작
              </button>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
              >
                <span>배너 펼치기</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="hero-expanded"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-slate-900 text-white min-h-[320px] sm:h-[360px] flex flex-col justify-between"
          >
            {/* Background Media with Ken Burns Zoom & Gentle Parallax */}
            <AnimatePresence mode="sync">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65 }}
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950"
              >
                <motion.img
                  src={activeSlide.imageUrl}
                  alt={activeSlide.headline}
                  referrerPolicy="no-referrer"
                  initial={{ scale: 1.0, x: 0 }}
                  animate={{ scale: 1.07, x: -14 }}
                  transition={{ duration: 9, ease: 'easeOut' }}
                  className="w-full h-full object-cover object-center"
                />
                {/* Measured Contrast Scrim (>= 4.5:1 text legibility across all frames) */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/68 to-slate-950/35" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/35" />
              </motion.div>
            </AnimatePresence>

            {/* Top Row: Slide Theme Indicator & Collapse Control */}
            <div className="relative z-10 px-5 sm:px-8 pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                <span className="font-semibold text-teal-300">{activeSlide.themeTag}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-slate-300">
                  {safeIndex + 1} / {slides.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-black/35 backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/55 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>배너 접기</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Center Content Grid: Editorial Copy + Floating Regulation Readouts */}
            <div className="relative z-10 px-5 sm:px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-8 space-y-3.5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-2"
                  >
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-snug max-w-2xl text-balance">
                      {activeSlide.headline}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed line-clamp-1">
                      {activeSlide.subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Single Primary CTA connected directly to Chatbot */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onStartDiagnosticFromHero(activeSlide)}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shadow-md"
                  >
                    <Compass className="w-4 h-4" />
                    <span>내 일정·짐 AI 점검 시작</span>
                  </button>
                </div>
              </div>

              {/* Floating Regulation Spec Readouts (Desktop/Tablet) */}
              <div className="hidden lg:flex lg:col-span-4 flex-col items-end justify-center gap-2.5">
                {activeSlide.specBadges.slice(0, 3).map((spec, idx) => (
                  <motion.div
                    key={`${activeSlide.id}-${spec}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      y: [0, idx % 2 === 0 ? -4 : 4, 0],
                    }}
                    transition={{
                      opacity: { duration: 0.35, delay: idx * 0.08 },
                      x: { duration: 0.35, delay: idx * 0.08 },
                      y: { duration: 4.5 + idx * 0.7, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="rounded-xl border border-white/20 bg-slate-950/60 backdrop-blur-md px-3.5 py-2 text-right shadow-sm"
                  >
                    <div className="text-[10px] text-teal-300 font-semibold">
                      공식 규정 기준
                    </div>
                    <div className="font-mono-num text-sm font-bold text-white">
                      {spec}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom Controls: Theme Tabs & Prev/Next */}
            <div className="relative z-10 px-5 sm:px-8 pb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                      idx === safeIndex
                        ? 'bg-white text-slate-950 font-semibold'
                        : 'bg-black/35 text-slate-200 hover:bg-black/55'
                    }`}
                  >
                    {s.themeTag}
                  </button>
                ))}
              </div>

              {slides.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
                    }
                    aria-label="이전 슬라이드"
                    className="rounded-lg border border-white/20 bg-black/35 p-1.5 text-white hover:bg-black/60 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                    aria-label="다음 슬라이드"
                    className="rounded-lg border border-white/20 bg-black/35 p-1.5 text-white hover:bg-black/60 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
