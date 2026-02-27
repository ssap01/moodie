import type { User, Movie, Rating, Recommendation, UserRating, WishlistItem } from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth API
export const authAPI = {
  signup: (data: { email: string; password: string; passwordConfirm: string; nickname?: string; phone?: string }) =>
    request<{ user_id: number; token: string; user?: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  googleLogin: (idToken: string) =>
    request<{ token: string; user: User; expiresIn?: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => request<{ user: User }>('/auth/me').then(res => res.user as User),

  updateProfile: (data: { nickname?: string; phone?: string }) =>
    request<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAccount: (password: string) =>
    request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  validateResetToken: (token: string) =>
    request<{ valid: boolean }>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`),

  resetPassword: (data: { token: string; newPassword: string; newPasswordConfirm: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  findEmailByEmail: (email: string) =>
    request<{ message: string }>('/auth/find-email-by-email', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }),

  findEmailSendOtp: (data: { phone: string; nickname?: string }) =>
    request<{ ok: boolean; message: string; devOtp?: string }>('/auth/find-email-send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: data.phone.replace(/\D/g, ''), nickname: data.nickname?.trim() || undefined }),
    }),

  findEmailVerifyOtp: (data: { phone: string; otp: string }) =>
    request<{ ok: boolean; emailMasked: string }>('/auth/find-email-verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: data.phone.replace(/\D/g, ''), otp: data.otp.trim() }),
    }),
};

// Admin API (관리자 전용)
export interface AdminUser {
  user_id: number;
  email: string;
  nickname?: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
}

export const adminAPI = {
  getUsers: () =>
    request<{ users: AdminUser[] }>('/admin/users'),

  updateUserRole: (userId: number, role: string) =>
    request<{ message: string; user: AdminUser }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  getSyncSettings: () =>
    request<{ auto_sync_enabled: boolean; last_movie_sync_at: string | null; last_sync_triggered_by_label: string | null; movie_count: number }>('/admin/sync/settings'),

  updateSyncSettings: (data: { auto_sync_enabled: boolean }) =>
    request<{ auto_sync_enabled: boolean }>('/admin/sync/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  syncMovies: () =>
    request<{ message: string; skipped: boolean; count: number }>('/admin/sync/movies', {
      method: 'POST',
    }),

  getSearchLogs: (limit?: number) =>
    request<{ recent: { log_id: number; query: string; created_at: string }[]; popular: { query: string; count: number }[] }>(
      limit != null ? `/admin/logs/search?limit=${limit}` : '/admin/logs/search'
    ),

  getMovieViewLogs: () =>
    request<{ popular: { movie_id: number; title: string; poster_url?: string; view_count: number }[] }>('/admin/logs/movie-views'),

  getAuthLogs: (limit?: number) =>
    request<{ recent: { log_id: number; event_type: string; email: string; created_at: string }[] }>(
      limit != null ? `/admin/logs/auth?limit=${limit}` : '/admin/logs/auth'
    ),
};

export interface MovieFilters {
  rated?: string;
  country?: string;
  language?: string;
  director?: string;
  genre?: string;
}

// Movies API
export const moviesAPI = {
  list: (page = 1, limit = 20, sort?: 'rating' | 'release_date' | 'metascore' | 'imdb_votes', filters?: MovieFilters) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (sort) params.set('sort', sort);
    if (filters?.rated) params.set('rated', filters.rated);
    if (filters?.country) params.set('country', filters.country);
    if (filters?.language) params.set('language', filters.language);
    if (filters?.director) params.set('director', filters.director);
    if (filters?.genre) params.set('genre', filters.genre);
    return request<{ movies: Movie[]; pagination: any }>(`/movies?${params}`);
  },

  /** 필터 드롭다운용 옵션 */
  filterOptions: () =>
    request<{ rated: string[]; country: string[]; language: string[]; director: string[]; genre: string[] }>('/movies/filter-options'),

  /** 신작 영화 (개봉일 최신순), limit 기본 10 */
  newArrivals: (limit = 10) =>
    request<{ movies: Movie[] }>(`/movies/new?limit=${limit}`),

  /** 검색 (제목·영문제목·감독) */
  search: (query: string, limit = 20) =>
    request<{ movies: Movie[]; query: string }>(`/movies/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`),

  detail: (id: number) => request<Movie>(`/movies/${id}`),
};

// Ratings API
export const ratingsAPI = {
  create: (data: { movie_id: number; rating: number }) =>
    request<{ message: string; movie_id: number; rating: number }>('/ratings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (movieId: number) => request<Rating>(`/ratings/${movieId}`),

  delete: (movieId: number) =>
    request<{ message: string }>(`/ratings/${movieId}`, {
      method: 'DELETE',
    }),

  getMyRatings: () => request<{ ratings: UserRating[] }>('/ratings/user/my'),
};

// Wishlist API (찜하기)
export const wishlistAPI = {
  getStatus: (movieId: number) =>
    request<{ movie_id: number; in_wishlist: boolean }>(`/wishlist/${movieId}`),

  add: (movieId: number) =>
    request<{ message: string; in_wishlist: boolean; movie_id: number }>(`/wishlist/${movieId}`, {
      method: 'POST',
    }),

  remove: (movieId: number) =>
    request<{ message: string; in_wishlist: boolean; movie_id: number }>(`/wishlist/${movieId}`, {
      method: 'DELETE',
    }),

  getMyWishlist: () => request<{ wishlist: WishlistItem[] }>('/wishlist/user/my'),
};

// Recommendations API
export const recommendationsAPI = {
  get: (limit?: number) =>
    request<Recommendation[]>(limit != null ? `/recommendations?limit=${Math.min(50, Math.max(1, limit))}` : '/recommendations'),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (message: string) =>
    request<{ reply: string; movies?: Movie[]; isMoodRecommendation?: boolean }>('/chatbot', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// Mood Recommendations API
export const moodRecommendationsAPI = {
  get: (mood: string, limit = 5) =>
    request<{ movies: Movie[]; reason: string; mood: string }>('/mood-recommendations', {
      method: 'POST',
      body: JSON.stringify({ mood, limit }),
    }),
};
