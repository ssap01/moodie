import React from 'react';
import { Movie } from '../types';
import PosterPlaceholder from './PosterPlaceholder';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
  index?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, index }) => {
  const genreText = movie.genres?.map((g) => g.name).join(' / ') ?? '';

  return (
    <div
      onClick={onClick}
      className="interactive group cursor-pointer relative aspect-[2/3] overflow-hidden bg-gray-200"
    >
      {movie.poster_url ? (
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 group-hover:saturate-100"
          style={{ filter: 'saturate(0.5)' }}
        />
      ) : (
        <PosterPlaceholder showLabel />
      )}

      {index !== undefined && (
        <div className="absolute top-4 left-4 serif text-4xl md:text-5xl lg:text-6xl italic opacity-50 group-hover:opacity-100 transition-opacity text-white mix-blend-difference">
          {index}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4 md:p-5 lg:p-6 text-white">
        <p className="text-[9px] md:text-[10px] tracking-widest uppercase mb-1 opacity-70">{genreText || '—'}</p>
        <h3 className="serif text-lg md:text-xl lg:text-2xl leading-tight">{movie.title}</h3>
      </div>
    </div>
  );
};

export default MovieCard;
