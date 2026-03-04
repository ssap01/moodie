import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CursorFollower from './components/CursorFollower';
import ChatBot from './components/ChatBot';
import Home from './pages/Home';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import MovieModal from './components/MovieModal';
import TermsModal from './components/TermsModal';
import ContactModal from './components/ContactModal';
import Admin from './pages/Admin';
import AllMovies from './pages/AllMovies';
import Curations from './pages/Curations';
import { Page, Movie, User, ListSort } from './types';
import { authAPI } from './services/api';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [allMoviesInitialSort, setAllMoviesInitialSort] = useState<ListSort | undefined>(undefined);
  const [allMoviesSearchQuery, setAllMoviesSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showTermsModal, setShowTermsModal] = useState<'terms' | 'privacy' | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loginErrorFromUrl, setLoginErrorFromUrl] = useState<string | null>(null);
  const [loginNavKey, setLoginNavKey] = useState(0);

  const handleNavigate = (page: Page, options?: { signUp?: boolean; initialSort?: ListSort; searchQuery?: string }) => {
    if (page === 'LOGIN') {
      setLoginNavKey((k) => k + 1);
      navigate('/login');
      return;
    }
    if (page === 'SIGNUP') {
      setLoginNavKey((k) => k + 1);
      navigate('/signup');
      return;
    }
    if (page === 'ALL_MOVIES') {
      if (options?.initialSort !== undefined) setAllMoviesInitialSort(options.initialSort);
      setAllMoviesSearchQuery(options?.searchQuery ?? '');
      navigate('/movies');
      return;
    }
    if (page === 'HOME') {
      navigate('/');
      return;
    }
    if (page === 'MYPAGE') {
      navigate('/mypage');
      return;
    }
    if (page === 'ADMIN') {
      navigate('/admin');
      return;
    }
    if (page === 'CURATIONS') {
      navigate('/curations');
      return;
    }
    navigate('/');
  };

  // URL과 동기화: /login, /signup 진입, Google 콜백 #token 처리
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    if (hash) {
      const m = hash.match(/#token=([^&]+)/);
      if (m) {
        const token = decodeURIComponent(m[1].replace(/\+/g, ' '));
        localStorage.setItem('token', token);
        authAPI
          .me()
          .then((user) => {
            setIsLoggedIn(true);
            setCurrentUser(user);
            window.history.replaceState('', '', '/');
            navigate('/');
          })
          .catch(() => localStorage.removeItem('token'));
        return;
      }
    }
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === '/login') {
      const err = params.get('error');
      setLoginErrorFromUrl(err || null);
    } else {
      setLoginErrorFromUrl(null);
    }
  }, [location]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = await authAPI.me();
        setIsLoggedIn(true);
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('token');
      }
    }
  };

  const handleLogin = (token: string, user: User) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    navigate('/');
  };

  const handleLogout = () => {
    authAPI.logout().catch(() => {
      // 서버 로그 실패는 무시
    });
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigate('/');
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  return (
    <div className="min-h-screen bg-[#D8D5CF] selection:bg-black selection:text-[#D8D5CF]">
      <CursorFollower />
      <div className="marble-overlay" aria-hidden="true" />
      <Navbar
        onNavigate={handleNavigate}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="pt-20">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                isLoggedIn={isLoggedIn}
                onSelectMovie={handleSelectMovie}
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/login"
            element={
              <Login
                key={loginNavKey}
                initialSignUp={false}
                onLogin={handleLogin}
                initialErrorFromUrl={loginErrorFromUrl}
                onClearUrlError={() => setLoginErrorFromUrl(null)}
              />
            }
          />
          <Route
            path="/signup"
            element={
              <Login
                key={loginNavKey}
                initialSignUp={true}
                onLogin={handleLogin}
              />
            }
          />
          <Route
            path="/curations"
            element={
              <Curations
                isLoggedIn={isLoggedIn}
                onSelectMovie={handleSelectMovie}
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/movies"
            element={
              <AllMovies
                onNavigate={handleNavigate}
                onSelectMovie={handleSelectMovie}
                initialSort={allMoviesInitialSort}
                initialSearchQuery={allMoviesSearchQuery}
              />
            }
          />
          <Route
            path="/mypage"
            element={
              isLoggedIn ? (
                <MyPage onSelectMovie={handleSelectMovie} onLogout={handleLogout} onNavigate={handleNavigate} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAdmin ? (
                <Admin currentUser={currentUser!} onNavigate={handleNavigate} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          isLoggedIn={isLoggedIn}
        />
      )}

      <ChatBot isLoggedIn={isLoggedIn} onSelectMovie={handleSelectMovie} />

      <footer className="py-24 px-8 border-t border-black/5 text-[10px] tracking-[0.3em] uppercase opacity-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>© 2026 Moodie Cinema. All Rights Reserved.</div>
          <div className="flex gap-12">
            <button 
              onClick={() => setShowContactModal(true)}
              className="hover:opacity-100 transition-opacity"
            >
              Contact
            </button>
            <button 
              onClick={() => setShowTermsModal('privacy')}
              className="hover:opacity-100 transition-opacity"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => setShowTermsModal('terms')}
              className="hover:opacity-100 transition-opacity"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {showTermsModal && (
        <TermsModal
          type={showTermsModal}
          onClose={() => setShowTermsModal(null)}
        />
      )}

      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
};

export default App;
