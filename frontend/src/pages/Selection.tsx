import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Movie, Recommendation, SelectionView } from '../types';
import { moviesAPI, recommendationsAPI } from '../services/api';

const PER_PAGE = 10;

interface SelectionProps {
  selectionView: SelectionView;
  onNavigate: (page: 'HOME') => void;
  onSelectMovie: (movie: Movie) => void;
}

const Selection: React.FC<SelectionProps> = ({ selectionView, onNavigate, onSelectMovie }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setCurrentPage(1);
    if (selectionView === 'new_arrivals') {
      moviesAPI
        .newArrivals(50)
        .then((res) => { if (!cancelled) setMovies(res.movies); })
        .catch((e) => { if (!cancelled) setError(e.message || '목록을 불러올 수 없습니다.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      recommendationsAPI
        .get(30)
        .then((res) => { if (!cancelled) setRecommendations(Array.isArray(res) ? res : []); })
        .catch((e) => { if (!cancelled) setError(e.message || '추천 목록을 불러올 수 없습니다.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [selectionView]);

  const title = selectionView === 'new_arrivals' ? 'New Arrivals' : 'Personalized Just for You';
  const list = selectionView === 'new_arrivals' ? movies : recommendations.map((r) => r.movie);
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageList = list.slice(start, start + PER_PAGE);

  // 데스크: 번호 최대 5개 표시 (현재 주변)
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <div className="min-h-screen animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-20 py-12 md:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <h1 className="serif text-3xl md:text-4xl text-[#2D2A26]">{title}</h1>
          <button
            type="button"
            onClick={() => onNavigate('HOME')}
            className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-60 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
          >
            ← Back to Home
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading ? (
          <div className="text-center py-16 opacity-60">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-black/50">표시할 영화가 없습니다.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {pageList.map((movie) => (
                <MovieCard
                  key={movie.movie_id}
                  movie={movie}
                  onClick={() => onSelectMovie(movie)}
                />
              ))}
            </div>

            {/* 페이지네이션: 모바일은 이전/다음 위주, 데스크는 번호 포함 */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 md:gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 md:px-3 md:py-1.5 text-[10px] md:text-xs uppercase tracking-wider border border-black/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 min-w-[80px] md:min-w-0"
              >
                ← Prev
              </button>

              {/* 데스크: 페이지 번호 (숨김: 모바일) */}
              <div className="hidden md:flex items-center gap-0.5">
                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 text-xs border transition-colors ${
                      currentPage === num
                        ? 'bg-black text-[#D8D5CF] border-black'
                        : 'border-black/20 hover:bg-black/5'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 모바일: 현재 페이지 / 전체 */}
              <span className="md:hidden text-[10px] uppercase tracking-wider text-black/60 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 md:px-3 md:py-1.5 text-[10px] md:text-xs uppercase tracking-wider border border-black/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 min-w-[80px] md:min-w-0"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Selection;
