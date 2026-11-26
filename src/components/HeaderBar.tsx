import React from 'react';
import type { User } from 'firebase/auth';
import {
  Compass,
  ShoppingBag,
  User as UserIcon,
  Sun,
  Moon,
  Shield,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { PromoBanner } from '../types/domain';

interface HeaderBarProps {
  activeRoute: 'store' | 'admin';
  onNavigateRoute: (route: 'store' | 'admin') => void;
  banners: PromoBanner[];
  cartCount: number;
  onOpenCart: () => void;
  onOpenMyPage: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeRoute,
  onNavigateRoute,
  banners,
  cartCount,
  onOpenCart,
  onOpenMyPage,
  user,
  onOpenAuth,
  onSignOut,
  theme,
  onToggleTheme,
}) => {
  const activeBanner = banners[0];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="bg-slate-900 text-slate-100 text-[11px] py-1.5 px-4 text-center border-b border-white/10">
        <span className="font-bold text-teal-300 mr-1.5">[포트폴리오 시연용 · jibak-eun-travel]</span>
        <span>
          본 사이트는 실제 상용 서비스가 아닌 개인 포트폴리오·개발 시연용 프로젝트입니다. 주문·결제 및 데이터는 테스트/시연 목적으로 동작합니다.
        </span>
      </div>
      {activeBanner && activeRoute === 'store' && (
        <div className="bg-[var(--brand-primary)] text-white text-xs py-1 px-4 text-center truncate">
          <span className="font-semibold tracking-wide mr-2">[{activeBanner.badge}]</span>
          <span>{activeBanner.text}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => onNavigateRoute('store')}
            className="flex items-center gap-2.5 text-left cursor-pointer shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white">
              <Compass className="w-4 h-4" />
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-[var(--text-primary)]">
                집밖은여행
              </span>
              <span className="hidden sm:block text-[11px] text-[var(--text-muted)]">
                Jibak-eun Travel · AI 트래블 컨시어지
              </span>
            </div>
          </button>

          {activeRoute === 'store' && (
            <nav className="hidden md:flex items-center gap-5 ml-4 text-sm font-medium text-[var(--text-secondary)]">
              <a href="#ai-workspace" className="hover:text-[var(--text-primary)] transition">
                AI 챗봇 상담
              </a>
              <a href="#catalog-section" className="hover:text-[var(--text-primary)] transition">
                전체 상품
              </a>
              <a href="#inquiry-section" className="hover:text-[var(--text-primary)] transition">
                1:1 문의
              </a>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeRoute === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigateRoute('store')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">쇼핑몰로 돌아가기</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="테마 전환"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {activeRoute === 'store' && (
            <>
              <button
                type="button"
                onClick={onOpenMyPage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">마이페이지</span>
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  title={user.email || '로그아웃'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline max-w-[110px] truncate">
                    {user.displayName || user.email}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">로그인</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenCart}
                className="relative inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)] transition cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>장바구니</span>
                <span className="font-mono-num rounded bg-white/20 px-1.5 py-0.5 text-[11px] leading-none">
                  {cartCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateRoute('admin')}
                title="관리자 페이지로 이동 (#admin-console)"
                aria-label="관리자 페이지로 이동"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span className="hidden sm:inline">관리자</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
