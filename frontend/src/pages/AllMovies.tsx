import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Movie, ListSort } from '../types';
import { moviesAPI, type MovieFilters } from '../services/api';

const PER_PAGE = 10;

interface AllMoviesProps {
  onNavigate: (page: 'HOME' | 'ALL_MOVIES', options?: { searchQuery?: string }) => void;
  onSelectMovie: (movie: Movie) => void;
  initialSort?: ListSort;
  initialSearchQuery?: string;
}

const AllMovies: React.FC<AllMoviesProps> = ({ onNavigate, onSelectMovie, initialSort, initialSearchQuery }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<ListSort>(initialSort ?? 'rating');
  const [filters, setFilters] = useState<MovieFilters>({});
  const [filterOptions, setFilterOptions] = useState<{ rated: string[]; country: string[]; language: string[]; director: string[]; genre: string[] }>({ rated: [], country: [], language: [], director: [], genre: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSearchMode = !!initialSearchQuery?.trim();

  useEffect(() => {
    moviesAPI.filterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  // 진입 시 initialSort가 있으면 그 정렬로 맞춤 (예: View All Selection → Newest)
  React.useEffect(() => {
    if (initialSort) {
      setSort(initialSort);
      setCurrentPage(1);
    }
  }, [initialSort]);

  // 검색 모드: 검색 API로 결과만 표시
  useEffect(() => {
    if (!isSearchMode) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    moviesAPI
      .search(initialSearchQuery!.trim(), 40)
      .then((res) => {
        if (!cancelled) setMovies(res.movies);
      })
      .catch((e) => { if (!cancelled) setError(e.message || '검색 중 오류가 발생했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isSearchMode, initialSearchQuery]);

  // 전체 목록 모드: list API (페이지네이션, 정렬, 필터)
  useEffect(() => {
    if (isSearchMode) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const activeFilters: MovieFilters = {};
    if (filters.rated) activeFilters.rated = filters.rated;
    if (filters.country) activeFilters.country = filters.country;
    if (filters.language) activeFilters.language = filters.language;
    if (filters.director) activeFilters.director = filters.director;
    if (filters.genre) activeFilters.genre = filters.genre;
    moviesAPI
      .list(currentPage, PER_PAGE, sort, Object.keys(activeFilters).length ? activeFilters : undefined)
      .then((res) => {
        if (cancelled) return;
        setMovies(res.movies);
        setTotalPages(res.pagination?.total_pages ?? 1);
      })
      .catch((e) => { if (!cancelled) setError(e.message || '목록을 불러올 수 없습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [isSearchMode, currentPage, sort, filters.rated, filters.country, filters.language, filters.director, filters.genre]);

  const handleFilterChange = (key: keyof MovieFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <div className="min-h-screen animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-20 py-12 md:py-16">
        <div className="flex flex-row justify-between items-end gap-4 mb-6">
          <h1 className="serif text-3xl md:text-4xl text-[#2D2A26]">
            {isSearchMode ? (
              <>Search: &ldquo;{initialSearchQuery}&rdquo;</>
            ) : (
              'All Movies'
            )}
          </h1>
          <div className="flex items-center gap-3 flex-shrink-0">
            {isSearchMode && (
              <button
                type="button"
                onClick={() => onNavigate('ALL_MOVIES', { searchQuery: '' })}
                className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-60 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
              >
                Clear search
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('HOME')}
              className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-60 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {!isSearchMode && (
        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 py-3 border-b border-black/10">
          <span className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-50">Filter</span>
          <select
            value={filters.rated ?? ''}
            onChange={(e) => handleFilterChange('rated', e.target.value)}
            className="text-[10px] md:text-xs uppercase tracking-wider bg-transparent border border-black/20 rounded px-2 py-1.5 text-[#2D2A26] min-w-[80px]"
          >
            <option value="">등급</option>
            {filterOptions.rated.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.country ?? ''}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className="text-[10px] md:text-xs uppercase tracking-wider bg-transparent border border-black/20 rounded px-2 py-1.5 text-[#2D2A26] min-w-[100px]"
          >
            <option value="">국가</option>
            {filterOptions.country.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.language ?? ''}
            onChange={(e) => handleFilterChange('language', e.target.value)}
            className="text-[10px] md:text-xs uppercase tracking-wider bg-transparent border border-black/20 rounded px-2 py-1.5 text-[#2D2A26] min-w-[100px]"
          >
            <option value="">언어</option>
            {filterOptions.language.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.director ?? ''}
            onChange={(e) => handleFilterChange('director', e.target.value)}
            className="text-[10px] md:text-xs uppercase tracking-wider bg-transparent border border-black/20 rounded px-2 py-1.5 text-[#2D2A26] min-w-[120px] max-w-[180px]"
          >
            <option value="">감독</option>
            {filterOptions.director.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.genre ?? ''}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="text-[10px] md:text-xs uppercase tracking-wider bg-transparent border border-black/20 rounded px-2 py-1.5 text-[#2D2A26] min-w-[100px]"
          >
            <option value="">장르</option>
            {(filterOptions.genre ?? []).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {(filters.rated || filters.country || filters.language || filters.director || filters.genre) && (
            <button
              type="button"
              onClick={() => { setFilters({}); setCurrentPage(1); }}
              className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100"
            >
              필터 초기화
            </button>
          )}
          <span className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-50 ml-4 md:ml-6">Sort</span>
          <button
            type="button"
            onClick={() => { setSort('rating'); setCurrentPage(1); }}
            className={`text-[9px] md:text-[10px] tracking-wider uppercase border-b pb-1 transition-opacity ${sort === 'rating' ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            Rating
          </button>
          <button
            type="button"
            onClick={() => { setSort('release_date'); setCurrentPage(1); }}
            className={`text-[9px] md:text-[10px] tracking-wider uppercase border-b pb-1 transition-opacity ${sort === 'release_date' ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            Newest
          </button>
          <button
            type="button"
            onClick={() => { setSort('metascore'); setCurrentPage(1); }}
            className={`text-[9px] md:text-[10px] tracking-wider uppercase border-b pb-1 transition-opacity ${sort === 'metascore' ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            Metascore
          </button>
          <button
            type="button"
            onClick={() => { setSort('imdb_votes'); setCurrentPage(1); }}
            className={`text-[9px] md:text-[10px] tracking-wider uppercase border-b pb-1 transition-opacity ${sort === 'imdb_votes' ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            Popularity
          </button>
        </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading ? (
          <div className="text-center py-16 opacity-60">{isSearchMode ? '검색 중...' : 'Loading...'}</div>
        ) : movies.length === 0 ? (
          <div className="text-center py-16 text-black/50">{isSearchMode ? '검색 결과가 없습니다.' : '표시할 영화가 없습니다.'}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.movie_id}
                  movie={movie}
                  onClick={() => onSelectMovie(movie)}
                />
              ))}
            </div>

            {!isSearchMode && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 md:gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 md:px-3 md:py-1.5 text-[10px] md:text-xs uppercase tracking-wider border border-black/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 min-w-[80px] md:min-w-0"
              >
                ← Prev
              </button>
              <div className="hidden md:flex items-center gap-0.5">
                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 text-xs border transition-colors ${
                      currentPage === num ? 'bg-black text-[#D8D5CF] border-black' : 'border-black/20 hover:bg-black/5'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllMovies;
