import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Movie, Recommendation, Page, ListSort } from '../types';
import { moviesAPI, recommendationsAPI } from '../services/api';

interface HomeProps {
  isLoggedIn: boolean;
  onSelectMovie: (movie: Movie) => void;
  onNavigate?: (page: Page, options?: { signUp?: boolean; initialSort?: ListSort }) => void;
}

// 타이핑 효과를 위한 텍스트 배열 (줄바꿈 방지를 위해 짧게 조정)
const loggedInTexts = [
  "Today's Selection",
  "Personalized for You",
  "Curated Selection",
  "Your Daily Movie",
  "Just for You"
];

const guestTexts = [
  "New Releases",
  "Discover Cinema",
  "Latest Arrivals",
  "Curated Selection",
  "Explore Films"
];

const Home: React.FC<HomeProps> = ({ isLoggedIn, onSelectMovie, onNavigate }) => {
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [newArrivalsMovies, setNewArrivalsMovies] = useState<Movie[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(isLoggedIn ? loggedInTexts[0] : guestTexts[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMovies();
  }, [isLoggedIn]);

  useEffect(() => {
    const currentTexts = isLoggedIn ? loggedInTexts : guestTexts;
    const currentText = currentTexts[currentTextIndex];
    
    if (!isDeleting && displayedText.length < currentText.length) {
      // 타이핑 중
      const timeout = setTimeout(() => {
        setDisplayedText(currentText.slice(0, displayedText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && displayedText === currentText) {
      // 타이핑 완료, 잠시 대기 후 삭제 시작
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length > 0) {
      // 삭제 중
      const timeout = setTimeout(() => {
        setDisplayedText(displayedText.slice(0, -1));
      }, 50);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length === 0) {
      // 삭제 완료, 다음 텍스트로
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % currentTexts.length);
    }
  }, [displayedText, currentTextIndex, isDeleting, isLoggedIn]);

  // 로그인 상태 변경 시 텍스트 초기화
  useEffect(() => {
    const currentTexts = isLoggedIn ? loggedInTexts : guestTexts;
    setDisplayedText(currentTexts[0]);
    setCurrentTextIndex(0);
    setIsDeleting(false);
  }, [isLoggedIn]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const [topRatedRes, newArrivalsRes] = await Promise.all([
        moviesAPI.list(1, 10, 'rating'),
        moviesAPI.newArrivals(10),
      ]);
      setTopRatedMovies(topRatedRes.movies);
      setNewArrivalsMovies(newArrivalsRes.movies);
      if (isLoggedIn) {
        try {
          const recs = await recommendationsAPI.get();
          setRecommendedMovies(recs);
        } catch {
          /**/
        }
      }
    } catch (err) {
      console.error('Failed to load movies:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn overflow-x-hidden">
      {/* Hero Banner - moodie01 동일 */}
      <section className="relative min-h-[70vh] md:h-[80vh] w-full flex items-center px-6 sm:px-8 md:px-20 py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://picsum.photos/seed/sculpturehero/1920/1080"
            className="w-full h-full object-cover opacity-40"
            style={{ filter: 'saturate(0.2)' }}
            alt="Hero Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#D8D5CF] via-[#D8D5CF]/40 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
          <h1 className="serif text-4xl sm:text-6xl md:text-6xl lg:text-7xl leading-tight mb-6 md:whitespace-nowrap">
            {displayedText}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-60 mb-10 max-w-md leading-relaxed">
            Curated through the lens of timeless aesthetics and modern AI perception.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('ALL_MOVIES')}
            className="border border-black px-8 md:px-10 py-4 uppercase text-[9px] md:text-[10px] tracking-[0.4em] hover:bg-black hover:text-[#D8D5CF] transition-all"
          >
            Discover Selection
          </button>
          </div>
        </div>
      </section>

      {/* Top Rated - imdb_rating 상위 10 */}
      <section className="py-16 md:py-24 px-6 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 md:mb-12 gap-4">
            <h2 className="serif text-3xl md:text-4xl">Top Rated Movies</h2>
            <button
              type="button"
              onClick={() => onNavigate?.('ALL_MOVIES', { initialSort: 'rating' })}
              className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
            >
              View All Selection
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 opacity-60">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {topRatedMovies.map((movie, idx) => (
                <MovieCard
                  key={movie.movie_id}
                  movie={movie}
                  rank={idx + 1}
                  onClick={() => onSelectMovie(movie)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals / Personalized - moodie01 스타일 */}
      <section className="py-16 md:py-24 px-6 sm:px-8 md:px-20 bg-black/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 md:mb-12 gap-4">
            <h2 className="serif text-3xl md:text-4xl">
              {isLoggedIn && recommendedMovies.length > 0 ? 'Personalized Just for You' : 'New Arrivals'}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate?.('ALL_MOVIES', { initialSort: 'release_date' })}
              className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
            >
              View All Selection
            </button>
          </div>
          {isLoggedIn && recommendedMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {recommendedMovies.map((rec) => (
                <MovieCard key={rec.movie.movie_id} movie={rec.movie} onClick={() => onSelectMovie(rec.movie)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {newArrivalsMovies.map((movie) => (
                <MovieCard key={movie.movie_id} movie={movie} onClick={() => onSelectMovie(movie)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
