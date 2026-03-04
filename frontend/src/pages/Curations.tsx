import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Movie, Recommendation, Page, ListSort } from '../types';
import { moviesAPI, recommendationsAPI } from '../services/api';

interface CurationsProps {
  isLoggedIn: boolean;
  onSelectMovie: (movie: Movie) => void;
  onNavigate?: (page: Page, options?: { initialSort?: ListSort }) => void;
}

const Curations: React.FC<CurationsProps> = ({ isLoggedIn, onSelectMovie, onNavigate }) => {
  const [recommendedMovies, setRecommendedMovies] = useState<Recommendation[]>([]);
  const [newArrivalsMovies, setNewArrivalsMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (isLoggedIn) {
          const recs = await recommendationsAPI.get(25);
          setRecommendedMovies(recs);
          setNewArrivalsMovies([]);
        } else {
          const res = await moviesAPI.newArrivals(25);
          setNewArrivalsMovies(res.movies);
          setRecommendedMovies([]);
        }
      } catch {
        const res = await moviesAPI.newArrivals(25);
        setNewArrivalsMovies(res.movies);
        setRecommendedMovies([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isLoggedIn]);

  const movies = isLoggedIn && recommendedMovies.length > 0
    ? recommendedMovies.map((r) => r.movie)
    : newArrivalsMovies;

  return (
    <div className="animate-fadeIn min-h-[60vh] py-16 md:py-24 px-6 sm:px-8 md:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 md:mb-12 gap-4">
          <h2 className="serif text-3xl md:text-4xl">
            {isLoggedIn && recommendedMovies.length > 0
              ? 'Personalized Just for You'
              : 'Curated Picks'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate?.('ALL_MOVIES', { initialSort: (isLoggedIn && recommendedMovies.length > 0) ? undefined : 'release_date' })}
            className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 pb-1 transition-opacity border-b border-black/10"
          >
            View All Selection
          </button>
        </div>

        {!isLoggedIn && (
          <p className="text-[10px] md:text-xs tracking-wider opacity-60 mb-8">
            Log in to see your personalized curated picks based on your taste.
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 opacity-60">Loading...</div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12 opacity-60">No curated movies available.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {isLoggedIn && recommendedMovies.length > 0
              ? recommendedMovies.map((rec) => (
                  <MovieCard
                    key={rec.movie.movie_id}
                    movie={rec.movie}
                    onClick={() => onSelectMovie(rec.movie)}
                  />
                ))
              : newArrivalsMovies.map((movie) => (
                  <MovieCard
                    key={movie.movie_id}
                    movie={movie}
                    onClick={() => onSelectMovie(movie)}
                  />
                ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Curations;
