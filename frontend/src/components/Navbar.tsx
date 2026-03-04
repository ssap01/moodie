import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import type { User } from '../types';

interface NavbarProps {
  onNavigate: (page: Page, options?: { signUp?: boolean; searchQuery?: string }) => void;
  isLoggedIn: boolean;
  currentUser: User | null;
  onLogout: () => void;
}

const CINEMA_URL = typeof navigator !== 'undefined' && navigator.language.startsWith('ko')
  ? 'https://www.cgv.co.kr/'
  : 'https://www.fandango.com/';

const Navbar: React.FC<NavbarProps> = ({ onNavigate, isLoggedIn, currentUser, onLogout }) => {
  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const submitSearch = () => {
    const q = searchInput.trim();
    if (q) {
      onNavigate('ALL_MOVIES', { searchQuery: q });
      setSearchInput('');
      setMobileMenuOpen(false);
    }
  };

  const inputUnderlineClass = 'bg-transparent border-0 border-b border-black/10 py-1.5 text-[9px] lg:text-[10px] tracking-wider text-[#2D2A26] placeholder:opacity-50 focus:outline-none focus:border-black transition-colors';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMobileNav = (page: Page) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 ${
          scrolled ? 'bg-[#D8D5CF]/90 backdrop-blur-sm border-b border-black/5 py-4 shadow-sm' : 'bg-transparent py-6 md:py-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={() => handleMobileNav('HOME')}
            className="serif cursor-pointer select-none group flex items-baseline text-[#2D2A26] shrink-0"
          >
            <span className="logo-m font-bold tracking-tighter">M</span>
            <span className="logo-rest tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">oodie</span>
          </button>

          {/* 모바일: 로고 오른쪽 ~ 햄버거 왼쪽에 검색 (항상 표시, 아래선만) */}
          <div className="flex-1 min-w-0 md:hidden flex items-center justify-end gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
              placeholder="Search..."
              className={`flex-1 min-w-0 max-w-[140px] sm:max-w-[180px] ${inputUnderlineClass}`}
              aria-label="영화 검색"
            />
            <button type="button" onClick={submitSearch} className="h-[30px] w-[30px] flex-shrink-0 flex items-center justify-center opacity-80 hover:opacity-100" aria-label="검색">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>

          <div className="hidden md:flex md:gap-4 lg:gap-8 items-center uppercase text-[9px] lg:text-[10px] tracking-[0.2em] font-light text-[#2D2A26] whitespace-nowrap shrink-0">
            {/* 데스크톱: 검색 입력(아래선만) + 돋보기, 항상 표시 */}
            <div className="flex items-center gap-2 md:ml-2">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                placeholder="Search movies..."
                className={`w-40 lg:w-52 ${inputUnderlineClass}`}
                aria-label="영화 검색"
              />
              <button type="button" onClick={submitSearch} className="h-[30px] w-[30px] flex-shrink-0 flex items-center justify-center hover:opacity-70 transition-opacity" aria-label="검색">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ALL_MOVIES', { searchQuery: '' })}
              className="hover:opacity-50 transition-opacity py-1"
            >
              All Movies
            </button>
            <a
              href={CINEMA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="normal-case hover:opacity-50 transition-opacity py-1"
            >
              Cinema
            </a>
            <button
              type="button"
              onClick={() => onNavigate('CURATIONS')}
              className="hover:opacity-50 transition-opacity py-1"
            >
              Curations
            </button>
            <div className="w-[1px] h-4 bg-black/10 md:mx-1 lg:mx-2 shrink-0" aria-hidden />
            {isLoggedIn ? (
              <>
                <button type="button" onClick={() => onNavigate('MYPAGE')} className="hover:opacity-50 transition-opacity py-1">My Page</button>
                {isAdmin && (
                  <button type="button" onClick={() => onNavigate('ADMIN')} className="hover:opacity-50 transition-opacity py-1">Admin</button>
                )}
                <button type="button" onClick={onLogout} className="border border-black/20 px-4 lg:px-6 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all shrink-0">Sign Out</button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('LOGIN', { signUp: false })}
                  className="hover:opacity-50 transition-opacity py-1"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('SIGNUP')}
                  className="border border-black/20 px-4 lg:px-6 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all shrink-0"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden p-2 flex flex-col gap-1.5 shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="메뉴"
          >
            <div className={`w-6 h-[1px] bg-black transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-[1px] bg-black transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-[1px] bg-black transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[45] bg-[#D8D5CF] transition-transform duration-500 md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8 uppercase text-[12px] tracking-[0.3em] font-light text-[#2D2A26] px-6">
          <button type="button" onClick={() => handleMobileNav('ALL_MOVIES')} className="py-2">All Movies</button>
          <a
            href={CINEMA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="normal-case py-2"
          >
            Cinema
          </a>
          <button type="button" onClick={() => handleMobileNav('CURATIONS')} className="py-2">Curations</button>
          <div className="w-12 h-[1px] bg-black/10 my-4" />
          {isLoggedIn ? (
            <>
              <button type="button" onClick={() => handleMobileNav('MYPAGE')} className="py-2">My Page</button>
              {isAdmin && (
                <button type="button" onClick={() => handleMobileNav('ADMIN')} className="py-2">Admin</button>
              )}
              <button type="button" onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="mt-4 border border-black/20 px-10 py-3 hover:bg-black hover:text-[#D8D5CF]">Sign Out</button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { onNavigate('LOGIN', { signUp: false }); setMobileMenuOpen(false); }}
                className="py-2"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { onNavigate('SIGNUP'); setMobileMenuOpen(false); }}
                className="mt-4 border border-black/20 px-10 py-3 hover:bg-black hover:text-[#D8D5CF]"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
