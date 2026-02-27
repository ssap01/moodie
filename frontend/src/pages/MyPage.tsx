import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authAPI, ratingsAPI, moviesAPI, wishlistAPI } from '../services/api';
import { User, UserRating, WishlistItem, Movie } from '../types';
import PosterPlaceholder from '../components/PosterPlaceholder';

interface MyPageProps {
  onSelectMovie: (movie: Movie) => void;
  onLogout: () => void;
  onNavigate?: (page: 'HOME') => void;
}

const MyPage: React.FC<MyPageProps> = ({ onSelectMovie, onLogout, onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [myRatings, setMyRatings] = useState<UserRating[]>([]);
  const [myWishlist, setMyWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 프로필 수정
  const [editingProfile, setEditingProfile] = useState(false);
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // 비밀번호 변경
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 계정 삭제
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, ratingsData, wishlistData] = await Promise.all([
        authAPI.me(),
        ratingsAPI.getMyRatings(),
        wishlistAPI.getMyWishlist().catch(() => ({ wishlist: [] })),
      ]);
      setUser(userData);
      setMyRatings(ratingsData.ratings);
      setMyWishlist(wishlistData.wishlist);
      setNickname(userData.nickname || '');
      setPhone(userData.phone || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      const result = await authAPI.updateProfile({ nickname, phone });
      setUser(result.user);
      setEditingProfile(false);
      setProfileSuccess('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== newPasswordConfirm) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      await authAPI.changePassword({ currentPassword, newPassword, newPasswordConfirm });
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setPasswordSuccess('Password changed successfully.');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (!deleteConfirmChecked) {
      setDeleteError('Please confirm that you want to delete your account.');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Please enter your password.');
      return;
    }

    // 최종 확인
    const finalConfirm = window.confirm(
      'Are you absolutely sure you want to permanently delete your account?\n\n' +
      'This action cannot be undone. All your data will be permanently lost.\n\n' +
      'Click OK to proceed with account deletion.'
    );

    if (!finalConfirm) {
      return;
    }

    try {
      await authAPI.deleteAccount(deletePassword);
      setShowDeleteModal(false);
      onLogout();
      if (onNavigate) {
        onNavigate('HOME');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    }
  };

  const handleMovieClick = async (movieId: number) => {
    try {
      const movieDetail = await moviesAPI.detail(movieId);
      onSelectMovie(movieDetail);
    } catch (err) {
      console.error('Failed to load movie:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#2D2A26]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-24 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="serif text-4xl md:text-5xl text-[#2D2A26] mb-2">My Page</h1>
          <p className="text-sm text-[#2D2A26]/60">Manage your profile and view your ratings</p>
        </div>

        {/* User Information */}
        <section className="border border-black/10 p-6 md:p-8 bg-[#D8D5CF]/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="serif text-2xl text-[#2D2A26]">Profile Information</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
              >
                Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 bg-[#D8D5CF] border border-black/20 text-[#2D2A26] text-sm"
                />
                <p className="text-[10px] text-[#2D2A26]/40 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={50}
                  placeholder="Enter your nickname"
                  className="w-full px-4 py-2 bg-white border border-black/20 text-[#2D2A26] text-sm focus:outline-none focus:border-black/40"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-2 bg-white border border-black/20 text-[#2D2A26] text-sm focus:outline-none focus:border-black/40"
                />
              </div>

              {profileError && (
                <div className="text-red-600 text-sm">{profileError}</div>
              )}
              {profileSuccess && (
                <div className="text-green-600 text-sm">{profileSuccess}</div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-6 py-2 bg-black text-[#D8D5CF] hover:bg-black/90 transition-all"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setNickname(user.nickname || '');
                    setPhone(user.phone || '');
                    setProfileError('');
                    setProfileSuccess('');
                  }}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-6 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-1">
                  Email
                </label>
                <p className="text-[#2D2A26]">{user.email}</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-1">
                  Nickname
                </label>
                <p className="text-[#2D2A26]">{user.nickname || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-1">
                  Phone Number
                </label>
                <p className="text-[#2D2A26]">{user.phone || 'Not set'}</p>
              </div>
            </div>
          )}
        </section>

        {/* Change Password */}
        <section className="border border-black/10 p-6 md:p-8 bg-[#D8D5CF]/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="serif text-2xl text-[#2D2A26]">Change Password</h2>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
              >
                Change
              </button>
            )}
          </div>

          {changingPassword && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-black/20 text-[#2D2A26] text-sm focus:outline-none focus:border-black/40 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60 transition-opacity"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  New Password (8+ chars, letters, numbers, symbols)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white border border-black/20 text-[#2D2A26] text-sm focus:outline-none focus:border-black/40 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60 transition-opacity"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPasswordConfirm ? 'text' : 'password'}
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white border border-black/20 text-[#2D2A26] text-sm focus:outline-none focus:border-black/40 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60 transition-opacity"
                    aria-label={showNewPasswordConfirm ? "Hide password" : "Show password"}
                  >
                    {showNewPasswordConfirm ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="text-red-600 text-sm">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="text-green-600 text-sm">{passwordSuccess}</div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-6 py-2 bg-black text-[#D8D5CF] hover:bg-black/90 transition-all"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setNewPasswordConfirm('');
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-6 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* My Ratings */}
        <section className="border border-black/10 p-6 md:p-8 bg-[#D8D5CF]/30">
          <h2 className="serif text-2xl text-[#2D2A26] mb-6">My Ratings</h2>
          {myRatings.length === 0 ? (
            <p className="text-[#2D2A26]/60">You haven't rated any movies yet.</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {myRatings.map((rating) => (
                  <button
                    key={rating.rating_id}
                    onClick={() => handleMovieClick(rating.movie_id)}
                    className="text-left group"
                  >
                    {rating.poster_url ? (
                      <img
                        src={rating.poster_url}
                        alt={rating.title}
                        className="w-full aspect-[2/3] object-cover mb-2 group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] mb-2 overflow-hidden">
                        <PosterPlaceholder showLabel />
                      </div>
                    )}
                    <h3 className="text-sm text-[#2D2A26] mb-1 truncate">{rating.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#2D2A26]/60">Rating:</span>
                      <span className="text-xs font-semibold text-[#2D2A26]">{rating.rating}/5</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Wishlist */}
        <section className="border border-black/10 p-6 md:p-8 bg-[#D8D5CF]/30">
          <h2 className="serif text-2xl text-[#2D2A26] mb-6">Wishlist</h2>
          {myWishlist.length === 0 ? (
            <p className="text-[#2D2A26]/60">You haven't added any movies to your wishlist yet.</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {myWishlist.map((item) => (
                  <button
                    key={item.movie_id}
                    onClick={() => handleMovieClick(item.movie_id)}
                    className="text-left group relative"
                  >
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full aspect-[2/3] object-cover mb-2 group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] mb-2 overflow-hidden">
                        <PosterPlaceholder showLabel />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 text-red-400" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                    </span>
                    <h3 className="text-sm text-[#2D2A26] mb-1 truncate">{item.title}</h3>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Delete Account */}
        <section className="border border-red-200 p-6 md:p-8 bg-red-50/30">
          <h2 className="serif text-xl text-red-900 mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <p className="text-sm text-[#2D2A26]/80 font-medium">
              Permanently delete your account and all associated data.
            </p>
            <p className="text-xs text-[#2D2A26]/60">
              This action cannot be undone. All your ratings, recommendations, and account information will be permanently deleted.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="mt-6 text-[10px] uppercase tracking-wider border border-red-300 px-6 py-2 text-red-700 hover:bg-red-700 hover:text-white transition-all"
          >
            Delete Account
          </button>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fadeIn">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword('');
              setDeleteConfirmChecked(false);
              setDeleteError('');
            }}
            aria-label="Close modal"
          />

          <div
            className="relative w-full max-w-md h-auto bg-[#D8D5CF] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
                setDeleteConfirmChecked(false);
                setDeleteError('');
              }}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] p-2 bg-[#D8D5CF]/50 rounded-full md:bg-transparent hover:rotate-90 transition-transform duration-300"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-red-200">
              <h2 className="serif text-2xl md:text-3xl text-red-900">Delete Account</h2>
            </div>

            {/* Content */}
            <form onSubmit={handleDeleteAccount} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-sm text-[#2D2A26] font-medium">
                  Are you absolutely sure you want to delete your account?
                </p>
                <div className="bg-red-50/50 border border-red-200 p-4 space-y-2">
                  <p className="text-xs text-red-900 font-semibold">This will permanently:</p>
                  <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                    <li>Delete your account and profile information</li>
                    <li>Remove all your movie ratings</li>
                    <li>Delete your recommendation history</li>
                    <li>Remove all associated data</li>
                  </ul>
                  <p className="text-xs text-red-900 font-semibold mt-3">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#2D2A26]/60 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 bg-white border border-red-300 text-[#2D2A26] text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-start gap-3 group cursor-pointer">
                <input
                  type="checkbox"
                  id="deleteConfirm"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 border border-red-300 text-red-700 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="deleteConfirm" className="text-sm text-[#2D2A26] cursor-pointer">
                  I understand that this action is permanent and cannot be undone. I want to delete my account.
                </label>
              </div>

              {deleteError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 border border-red-200">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={!deleteConfirmChecked || !deletePassword}
                  className="flex-1 text-[10px] uppercase tracking-wider border border-red-700 px-6 py-3 bg-red-700 text-white hover:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account Permanently
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmChecked(false);
                    setDeleteError('');
                  }}
                  className="flex-1 text-[10px] uppercase tracking-wider border border-black/20 px-6 py-3 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyPage;
