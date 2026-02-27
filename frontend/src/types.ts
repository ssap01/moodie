export interface Movie {
  movie_id: number;
  title: string;
  title_en?: string;
  synopsis?: string;
  release_date?: string;
  runtime?: number;
  type_nm?: string;
  poster_url?: string;
  backdrop_url?: string;
  rank?: number;
  imdb_rating?: number;
  rated?: string;
  country?: string;
  language?: string;
  director?: string;
  metascore?: number;
  imdb_votes?: number;
  genres?: Genre[];
}

export interface Genre {
  genre_id: number;
  name: string;
}

export interface User {
  user_id: number;
  email: string;
  nickname?: string;
  phone?: string;
  role: string;
}

export interface Rating {
  movie_id: number;
  average_rating?: number;
  total_ratings: number;
  user_rating?: number;
}

export interface UserRating {
  rating_id: number;
  movie_id: number;
  rating: number;
  created_at: string;
  updated_at: string;
  title: string;
  title_en?: string;
  poster_url?: string;
  release_date?: string;
}

export interface WishlistItem {
  movie_id: number;
  title: string;
  title_en?: string;
  poster_url?: string;
  release_date?: string;
  created_at: string;
}

export interface Recommendation {
  movie: Movie;
  reason: string;
}

export type Page = 'HOME' | 'LOGIN' | 'SIGNUP' | 'MOVIE_DETAIL' | 'ADMIN' | 'MYPAGE' | 'ALL_MOVIES';

export type ListSort = 'rating' | 'release_date' | 'metascore' | 'imdb_votes';
