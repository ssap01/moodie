import React, { useEffect, useState } from 'react';
import { Movie, Rating } from '../types';
import { moviesAPI, ratingsAPI, wishlistAPI } from '../services/api';
import PosterPlaceholder from './PosterPlaceholder';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
  isLoggedIn: boolean;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie: initialMovie, onClose, isLoggedIn }) => {
  const [movie, setMovie] = useState<Movie | null>(initialMovie);
  const [rating, setRating] = useState<Rating | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [loading, setLoading] = useState(!initialMovie.poster_url);
  const [currentStill, setCurrentStill] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);

  const stills = [initialMovie.backdrop_url, initialMovie.poster_url].filter(Boolean) as string[];
  if (stills.length === 0 && initialMovie.poster_url) stills.push(initialMovie.poster_url);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const load = async () => {
      try {
        const [detail, ratingData, wishlistRes] = await Promise.all([
          moviesAPI.detail(initialMovie.movie_id),
          ratingsAPI.get(initialMovie.movie_id).catch(() => null),
          wishlistAPI.getStatus(initialMovie.movie_id).catch(() => ({ in_wishlist: false })),
        ]);
        setMovie(detail);
        setRating(ratingData);
        if (ratingData?.user_rating) setUserRating(ratingData.user_rating);
        setIsInWishlist(wishlistRes.in_wishlist);
      } catch (e) {
        setMovie(initialMovie);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialMovie.movie_id]);

  useEffect(() => {
    if (stills.length <= 1) return;
    const t = setInterval(() => setCurrentStill((p) => (p + 1) % stills.length), 4000);
    return () => clearInterval(t);
  }, [stills.length]);

  const handleRating = async (value: number) => {
    if (!isLoggedIn) return;
    try {
      setUserRating(value);
      await ratingsAPI.create({ movie_id: initialMovie.movie_id, rating: value });
      const ratingData = await ratingsAPI.get(initialMovie.movie_id).catch(() => null);
      setRating(ratingData ?? null);
    } catch {
      /**/
    }
  };

  const handleDeleteRating = async () => {
    try {
      await ratingsAPI.delete(initialMovie.movie_id);
      setUserRating(0);
      setRating((r) => (r ? { ...r, user_rating: undefined, total_ratings: Math.max(0, (r.total_ratings ?? 1) - 1) } : null));
    } catch {
      /**/
    }
  };

  const handleWishlistToggle = async () => {
    if (!isLoggedIn) return;
    try {
      if (isInWishlist) {
        await wishlistAPI.remove(initialMovie.movie_id);
        setIsInWishlist(false);
      } else {
        await wishlistAPI.add(initialMovie.movie_id);
        setIsInWishlist(true);
      }
    } catch {
      /**/
    }
  };

  if (loading && !movie) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
        <div className="text-[#D8D5CF]">Loading...</div>
      </div>
    );
  }

  const m = movie ?? initialMovie;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="닫기"
      />

      <div
        className="relative w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] bg-[#D8D5CF] shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] p-2 bg-[#D8D5CF]/50 rounded-full md:bg-transparent hover:rotate-90 transition-transform duration-300"
          aria-label="닫기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Left: 포스터 + 스틸 (moodie01 스타일) */}
        <div className="w-full md:w-5/12 h-[40vh] md:h-auto min-h-[280px] relative bg-gray-300 flex-shrink-0">
          {m.poster_url ? (
            <img
              src={stills[currentStill] || m.poster_url}
              alt={m.title}
              className="w-full h-full object-cover opacity-90"
              style={{ filter: 'saturate(0.3)' }}
            />
          ) : (
            <PosterPlaceholder showLabel />
          )}
          {stills.length > 1 && (
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/50 to-transparent">
              <button
                type="button"
                onClick={() => setCurrentStill((p) => (p + 1) % stills.length)}
                className="relative h-16 md:h-24 w-full overflow-hidden border border-white/20 block"
              >
                {stills.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none ${idx === currentStill ? 'opacity-100' : 'opacity-0'}`}
                  />
                ))}
              </button>
            </div>
          )}
        </div>

        {/* Right: 정보 */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto flex flex-col bg-[#D8D5CF]">
          <div className="mb-6 md:mb-8 mt-4 md:mt-0">
            <h2 className="serif text-3xl md:text-5xl mb-2">{m.title}</h2>
            <p className="serif text-lg md:text-xl italic opacity-50">{m.title_en || '\u00A0'}</p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8 text-[9px] md:text-[10px] tracking-widest uppercase opacity-70">
            {m.genres && m.genres.length > 0 && (
              <div>
                Genre: <span className="text-base md:text-lg serif normal-case text-black ml-1">{m.genres.map((g) => g.name).join(', ')}</span>
              </div>
            )}
            {m.release_date && (
              <div>
                Year: <span className="text-base md:text-lg serif normal-case text-black ml-1">{m.release_date.slice(0, 4)}</span>
              </div>
            )}
            {rating?.average_rating != null && (
              <div>
                Rating: <span className="text-base md:text-lg serif normal-case text-black ml-1">{rating.average_rating}</span>
                <span className="ml-1">({rating.total_ratings})</span>
              </div>
            )}
          </div>

          <div className="mb-8 space-y-6">
            <section>
              <h4 className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold mb-3 opacity-40">Synopsis</h4>
              <p className="leading-relaxed text-sm text-gray-700 italic">
                {m.synopsis || '줄거리 정보가 없습니다.'}
              </p>
            </section>
          </div>

          {isLoggedIn && (
            <section className="mb-8 bg-white/30 p-5 md:p-6 border-l-2 border-black/10 animate-fadeIn">
              <h4 className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold mb-3 opacity-40">AI Curation</h4>
              <p className="serif text-base md:text-lg leading-snug text-[#2D2A26]">This film aligns with your taste profile and recent viewing history.</p>
            </section>
          )}

          <div className="mt-auto pt-8 border-t border-black/5">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button
                type="button"
                className="flex-1 bg-black text-[#D8D5CF] py-4 uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-black/80 transition-colors"
              >
                Book Tickets
              </button>
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={!isLoggedIn}
                className="w-full sm:w-16 h-14 border border-black/10 flex items-center justify-center hover:bg-red-50 transition-colors text-red-400 disabled:opacity-50 disabled:cursor-default"
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={isInWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Your Impression - moodie01처럼 항상 표시 */}
          <div className="mt-10 p-5 md:p-6 bg-black/5 rounded-sm">
            <h4 className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold mb-4 opacity-40">Your Impression</h4>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => isLoggedIn && handleRating(star)}
                  disabled={!isLoggedIn}
                  className={`text-2xl serif transition-all ${
                    userRating && userRating >= star ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-100'
                  } ${!isLoggedIn ? 'cursor-default' : ''}`}
                >
                  ◈
                </button>
              ))}
              {isLoggedIn && userRating > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteRating}
                  className="text-[9px] uppercase opacity-50 hover:opacity-100 ml-2"
                >
                  Remove
                </button>
              )}
            </div>
            {userRating > 0 && <p className="mt-2 text-[8px] md:text-[9px] uppercase opacity-40">Impressions Recorded</p>}
            {!isLoggedIn && <p className="mt-2 text-[8px] md:text-[9px] uppercase opacity-40">Log in to record your impression.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;
