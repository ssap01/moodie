import React, { useEffect, useState } from 'react';
import { Movie, Rating } from '../types';
import { moviesAPI, ratingsAPI } from '../services/api';
import PosterPlaceholder from '../components/PosterPlaceholder';

interface MovieDetailProps {
  movieId: number;
  onBack: () => void;
  isLoggedIn: boolean;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movieId, onBack, isLoggedIn }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovie();
  }, [movieId]);

  const loadMovie = async () => {
    try {
      setLoading(true);
      const [movieData, ratingData] = await Promise.all([
        moviesAPI.detail(movieId),
        ratingsAPI.get(movieId).catch(() => null),
      ]);
      setMovie(movieData);
      setRating(ratingData);
      if (ratingData?.user_rating) {
        setUserRating(ratingData.user_rating);
      }
    } catch (err) {
      console.error('Failed to load movie:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (value: number) => {
    if (!isLoggedIn) return;
    try {
      setUserRating(value);
      await ratingsAPI.create({ movie_id: movieId, rating: value });
      await loadMovie();
    } catch (err) {
      console.error('Failed to rate:', err);
    }
  };

  const handleDeleteRating = async () => {
    try {
      await ratingsAPI.delete(movieId);
      setUserRating(0);
      await loadMovie();
    } catch (err) {
      console.error('Failed to delete rating:', err);
    }
  };

  if (loading || !movie) {
    return (
      <div className="min-h-screen bg-[#D8D5CF] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D8D5CF]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button onClick={onBack} className="mb-4 hover:opacity-50">
          ← Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1">
            <div className="aspect-[2/3] bg-black/10 rounded overflow-hidden">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PosterPlaceholder showLabel />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{movie.title}</h1>
            {movie.genres && movie.genres.length > 0 && (
              <p className="text-sm mb-4">
                {movie.genres.map((g) => g.name).join(' / ')}
              </p>
            )}
            {rating?.average_rating && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">
                  {rating.average_rating} ({rating.total_ratings} ratings)
                </span>
              </div>
            )}

            {/* 포스터 */}
            {movie.poster_url && (
            <section className="mt-8">
              <h2 className="text-xl font-bold mb-4">포스터</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                <div className="flex-shrink-0 w-32 h-48 bg-black/10 rounded overflow-hidden">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>
            )}

            {/* Movie Info */}
            <section className="mt-8">
              <h2 className="text-xl font-bold mb-4">Movie Info</h2>
              <div className="space-y-2 text-sm">
                {movie.type_nm && (
                  <div>
                    <span className="font-medium">Type: </span>
                    {movie.type_nm}
                  </div>
                )}
                {movie.release_date && (
                  <div>
                    <span className="font-medium">Release Date: </span>
                    {movie.release_date}
                  </div>
                )}
                {movie.runtime && (
                  <div>
                    <span className="font-medium">Runtime: </span>
                    {movie.runtime} minutes
                  </div>
                )}
              </div>
            </section>

            {/* Booking Button */}
            <div className="mt-6">
              <button className="w-full md:w-auto bg-white border border-black/20 px-8 py-3 rounded hover:bg-black/5 transition-all">
                예매하기 (CGV, 롯데, 메가박스)
              </button>
            </div>

            {/* Rate & Review */}
            {isLoggedIn && (
              <section className="mt-8">
                <h2 className="text-xl font-bold mb-4">Rate & Review</h2>
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`text-2xl ${
                        star <= userRating ? 'text-yellow-500' : 'text-black/20'
                      } hover:text-yellow-500 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {userRating > 0 && (
                  <button
                    onClick={handleDeleteRating}
                    className="text-sm text-black/60 hover:text-black"
                  >
                    Remove rating
                  </button>
                )}
              </section>
            )}
          </div>
        </div>

        {/* 줄거리 한줄평 */}
        <section className="mt-8 max-w-4xl">
          <h2 className="text-xl font-bold mb-4">줄거리</h2>
          {movie.synopsis ? (
            <p className="text-black/80 leading-relaxed">{movie.synopsis}</p>
          ) : (
            <p className="text-black/40">줄거리 정보가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default MovieDetail;
