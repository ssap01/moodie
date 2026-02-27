import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import type { User } from '../types';
import { adminAPI, type AdminUser } from '../services/api';

interface AdminProps {
  currentUser: User;
  onNavigate: (page: Page) => void;
}

const Admin: React.FC<AdminProps> = ({ currentUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('movies');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<string>('');
  const [userFilterStatus, setUserFilterStatus] = useState<string>('');

  const [syncSettings, setSyncSettings] = useState<{ auto_sync_enabled: boolean; last_movie_sync_at?: string | null; last_sync_triggered_by_label?: string | null; movie_count?: number } | null>(null);
  const [syncSettingsLoading, setSyncSettingsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  const [searchLogs, setSearchLogs] = useState<{ recent: { log_id: number; query: string; created_at: string }[]; popular: { query: string; count: number }[] } | null>(null);
  const [searchLogsLoading, setSearchLogsLoading] = useState(false);
  const [searchLogsError, setSearchLogsError] = useState('');
  const [showAllPopular, setShowAllPopular] = useState(false);
  const [movieViewLogs, setMovieViewLogs] = useState<{ popular: { movie_id: number; title: string; poster_url?: string; view_count: number }[] } | null>(null);
  const [authLogs, setAuthLogs] = useState<{ log_id: number; event_type: string; email: string; created_at: string }[] | null>(null);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (activeTab === 'movies') {
      setSyncSettingsLoading(true);
      setSyncError('');
      setSyncMessage('');
      adminAPI
        .getSyncSettings()
        .then((res) => setSyncSettings({ auto_sync_enabled: res.auto_sync_enabled, last_movie_sync_at: res.last_movie_sync_at, last_sync_triggered_by_label: res.last_sync_triggered_by_label ?? null, movie_count: res.movie_count }))
        .catch(() => setSyncSettings({ auto_sync_enabled: false, last_movie_sync_at: null }))
        .finally(() => setSyncSettingsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersLoading(true);
      setUsersError('');
      adminAPI
        .getUsers()
        .then((res) => setUsers(res.users))
        .catch((err) => setUsersError(err.message || '사용자 목록을 불러올 수 없습니다.'))
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      setSearchLogsLoading(true);
      setSearchLogsError('');
      setMovieViewLogs(null);
      setAuthLogs(null);
      Promise.all([adminAPI.getSearchLogs(100), adminAPI.getMovieViewLogs(), adminAPI.getAuthLogs(100)])
        .then(([search, views, auth]) => {
          setSearchLogs(search);
          setMovieViewLogs(views);
          setAuthLogs(auth.recent);
        })
        .catch((err) => setSearchLogsError(err.message || '로그를 불러올 수 없습니다.'))
        .finally(() => setSearchLogsLoading(false));
    }
  }, [activeTab]);

  const handleGrantAdmin = async (targetUser: AdminUser) => {
    if (!isSuperAdmin || targetUser.role !== 'USER') return;
    setUpdatingId(targetUser.user_id);
    try {
      await adminAPI.updateUserRole(targetUser.user_id, 'ADMIN');
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, role: 'ADMIN' } : u))
      );
    } catch (err: any) {
      setUsersError(err.message || '역할 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevokeAdmin = async (targetUser: AdminUser) => {
    if (!isSuperAdmin || targetUser.role !== 'ADMIN') return;
    setUpdatingId(targetUser.user_id);
    try {
      await adminAPI.updateUserRole(targetUser.user_id, 'USER');
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, role: 'USER' } : u))
      );
    } catch (err: any) {
      setUsersError(err.message || '역할 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRestoreUser = async (targetUser: AdminUser) => {
    if (targetUser.status !== 'withdrawn') return;
    setUpdatingId(targetUser.user_id);
    try {
      await adminAPI.restoreUser(targetUser.user_id);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, status: 'approved' } : u))
      );
    } catch (err: any) {
      setUsersError(err.message || '계정 복구에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const roleLabel: Record<string, string> = {
    USER: '일반',
    ADMIN: '관리자',
    SUPER_ADMIN: '최고관리자',
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (q) {
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchNick = u.nickname?.toLowerCase().includes(q);
      if (!matchEmail && !matchNick) return false;
    }
    if (userFilterRole && u.role !== userFilterRole) return false;
    if (userFilterStatus && u.status !== userFilterStatus) return false;
    return true;
  });

  const handleAutoSyncToggle = async (enabled: boolean) => {
    try {
      await adminAPI.updateSyncSettings({ auto_sync_enabled: enabled });
      setSyncSettings((prev) => (prev ? { ...prev, auto_sync_enabled: enabled } : { auto_sync_enabled: enabled }));
    } catch {
      setSyncError('설정 저장에 실패했습니다.');
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const res = await adminAPI.syncMovies();
      setSyncMessage(res.message || `${res.count}개 영화 동기화 완료.`);
      if (!res.skipped) {
        adminAPI.getSyncSettings().then((s) => setSyncSettings((prev) => prev ? { ...prev, last_movie_sync_at: s.last_movie_sync_at, last_sync_triggered_by_label: s.last_sync_triggered_by_label ?? null, movie_count: s.movie_count } : prev));
      }
    } catch (err: any) {
      setSyncError(err.message || '동기화에 실패했습니다.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D8D5CF]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#2D2A26]">관리자</h1>
          <button
            type="button"
            onClick={() => onNavigate('HOME')}
            className="text-[10px] tracking-[0.2em] uppercase opacity-60 hover:opacity-100 transition-opacity"
          >
            메인으로
          </button>
        </div>

        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <div className="bg-black/5 rounded-lg p-4 space-y-2">
              <button
                onClick={() => setActiveTab('movies')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'movies' ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                영화 관리
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'users' ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'analytics' ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                행동 로그 분석
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'data' ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                데이터 수집 상태
              </button>
            </div>
          </aside>

          <main className="flex-1">
            {activeTab === 'movies' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#2D2A26]">영화 관리</h2>
                {typeof syncSettings?.movie_count === 'number' && (
                  <p className="text-sm text-[#2D2A26]/70 mb-3">현재 영화 개수: {syncSettings.movie_count}편</p>
                )}
                <div className="bg-black/5 rounded-lg p-4 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#2D2A26]">자동 동기화</span>
                      {syncSettingsLoading ? (
                        <span className="text-xs text-black/40">불러오는 중...</span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={syncSettings?.auto_sync_enabled ?? false}
                          onClick={() => handleAutoSyncToggle(!(syncSettings?.auto_sync_enabled ?? false))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            syncSettings?.auto_sync_enabled ? 'bg-black' : 'bg-black/20'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#D8D5CF] transition-transform ${
                              syncSettings?.auto_sync_enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                      <span className="text-[10px] text-black/50">
                        {syncSettings?.auto_sync_enabled ? 'ON (매일 새벽 2시 실행)' : 'OFF'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={handleSyncNow}
                      className="px-4 py-2 text-[10px] uppercase tracking-wider bg-black text-[#D8D5CF] rounded hover:opacity-80 disabled:opacity-50"
                    >
                      {syncLoading ? '동기화 중...' : '지금 동기화'}
                    </button>
                  </div>
                  {syncMessage && <p className="text-sm text-green-700">{syncMessage}</p>}
                  {syncError && <p className="text-sm text-red-600">{syncError}</p>}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#2D2A26]">사용자 관리</h2>
                {!usersLoading && users.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="이메일 또는 닉네임 검색"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="px-3 py-2 text-sm border border-black/20 rounded bg-white text-[#2D2A26] min-w-[180px] placeholder:text-black/40"
                    />
                    <select
                      value={userFilterRole}
                      onChange={(e) => setUserFilterRole(e.target.value)}
                      className="px-3 py-2 text-sm border border-black/20 rounded bg-white text-[#2D2A26]"
                    >
                      <option value="">역할: 전체</option>
                      <option value="USER">일반</option>
                      <option value="ADMIN">관리자</option>
                      <option value="SUPER_ADMIN">최고관리자</option>
                    </select>
                    <select
                      value={userFilterStatus}
                      onChange={(e) => setUserFilterStatus(e.target.value)}
                      className="px-3 py-2 text-sm border border-black/20 rounded bg-white text-[#2D2A26]"
                    >
                      <option value="">상태: 전체</option>
                      <option value="approved">활성</option>
                      <option value="withdrawn">탈퇴</option>
                    </select>
                  </div>
                )}
                {usersError && (
                  <p className="text-sm text-red-600 mb-4">{usersError}</p>
                )}
                {usersLoading ? (
                  <p className="text-sm text-black/50">목록 불러오는 중...</p>
                ) : (
                  <div className="bg-black/5 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="p-3 font-medium text-[#2D2A26]">이메일</th>
                          <th className="p-3 font-medium text-[#2D2A26]">닉네임</th>
                          <th className="p-3 font-medium text-[#2D2A26]">역할</th>
                          <th className="p-3 font-medium text-[#2D2A26]">상태</th>
                          {isSuperAdmin && (
                            <th className="p-3 font-medium text-[#2D2A26]">동작</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.user_id} className="border-b border-black/5">
                            <td className="p-3 text-[#2D2A26]">{u.email}</td>
                            <td className="p-3 text-[#2D2A26]">{u.nickname || '-'}</td>
                            <td className="p-3 text-[#2D2A26]">
                              {roleLabel[u.role] ?? u.role}
                            </td>
                            <td className="p-3 text-[#2D2A26]">
                              {u.status === 'withdrawn' ? '탈퇴' : '활성'}
                            </td>
                            {isSuperAdmin && (
                              <td className="p-3 flex flex-wrap gap-2">
                                {u.status !== 'withdrawn' && u.role === 'USER' && (
                                  <button
                                    type="button"
                                    disabled={updatingId === u.user_id}
                                    onClick={() => handleGrantAdmin(u)}
                                    className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-black text-[#D8D5CF] rounded hover:opacity-80 disabled:opacity-50"
                                  >
                                    {updatingId === u.user_id ? '처리 중...' : '관리자로 지정'}
                                  </button>
                                )}
                                {u.status !== 'withdrawn' && u.role === 'ADMIN' && (
                                  <button
                                    type="button"
                                    disabled={updatingId === u.user_id}
                                    onClick={() => handleRevokeAdmin(u)}
                                    className="px-3 py-1.5 text-[10px] uppercase tracking-wider border border-black/30 text-[#2D2A26] rounded hover:bg-black/5 disabled:opacity-50"
                                  >
                                    {updatingId === u.user_id ? '처리 중...' : '관리자 해지'}
                                  </button>
                                )}
                                {u.status === 'withdrawn' && (
                                  <button
                                    type="button"
                                    disabled={updatingId === u.user_id}
                                    onClick={() => handleRestoreUser(u)}
                                    className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-green-700 text-white rounded hover:opacity-80 disabled:opacity-50"
                                  >
                                    {updatingId === u.user_id ? '처리 중...' : '계정 복구'}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#2D2A26]">행동 로그 분석</h2>
                {searchLogsError && <p className="text-sm text-red-600 mb-4">{searchLogsError}</p>}
                {searchLogsLoading ? (
                  <p className="text-sm text-black/50">불러오는 중...</p>
                ) : searchLogs ? (
                  <div className="space-y-6">
                    <div className="bg-black/5 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-[#2D2A26] mb-3">많이 조회한 영화</h3>
                      {!movieViewLogs ? (
                        <p className="text-sm text-black/50">불러오는 중...</p>
                      ) : movieViewLogs.popular.length === 0 ? (
                        <p className="text-sm text-black/50">조회 로그가 없습니다.</p>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 max-h-[280px] overflow-y-auto">
                          {movieViewLogs.popular.map((p) => (
                            <div key={p.movie_id} className="text-center">
                              <div className="aspect-[2/3] overflow-hidden rounded bg-black/10">
                                {p.poster_url ? (
                                  <img src={p.poster_url} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-[#D8D5CF]/80 text-[#2D2A26]/40 text-xs">No Poster</div>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[#2D2A26] truncate" title={p.title}>{p.title}</p>
                              <p className="text-[10px] text-black/50">{p.view_count}회</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-black/5 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-[#2D2A26] mb-3">인기 검색어</h3>
                      {searchLogs.popular.length === 0 ? (
                        <p className="text-sm text-black/50">검색 로그가 없습니다.</p>
                      ) : (
                        <>
                          <div className={showAllPopular ? 'max-h-[200px] overflow-y-auto' : undefined}>
                            <ul className="flex flex-wrap gap-2">
                              {(showAllPopular ? searchLogs.popular : searchLogs.popular.slice(0, 8)).map((p, i) => (
                                <li key={i} className="px-3 py-1.5 bg-white/60 rounded text-sm text-[#2D2A26]">
                                  {p.query} <span className="text-black/50">({p.count})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {searchLogs.popular.length > 8 && (
                            <div className="mt-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setShowAllPopular((v) => !v)}
                                className="text-sm text-[#2D2A26] underline hover:no-underline"
                              >
                                {showAllPopular ? '접기' : '인기 검색어 더보기'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="bg-black/5 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                      <h3 className="text-sm font-semibold text-[#2D2A26] p-4 pb-2">최근 검색</h3>
                      {searchLogs.recent.length === 0 ? (
                        <p className="text-sm text-black/50 px-4 pb-4">검색 로그가 없습니다.</p>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-black/10">
                              <th className="p-3 font-medium text-[#2D2A26]">검색어</th>
                              <th className="p-3 font-medium text-[#2D2A26]">시각</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchLogs.recent.map((row) => (
                              <tr key={row.log_id} className="border-b border-black/5">
                                <td className="p-3 text-[#2D2A26]">{row.query}</td>
                                <td className="p-3 text-black/60">
                                  {new Date(row.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="bg-black/5 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                      <h3 className="text-sm font-semibold text-[#2D2A26] p-4 pb-2">최근 로그인/가입/로그아웃</h3>
                      {!authLogs || authLogs.length === 0 ? (
                        <p className="text-sm text-black/50 px-4 pb-4">
                          {authLogs ? '로그가 없습니다.' : '불러오는 중...'}
                        </p>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-black/10">
                              <th className="p-3 font-medium text-[#2D2A26]">이벤트</th>
                              <th className="p-3 font-medium text-[#2D2A26]">이메일</th>
                              <th className="p-3 font-medium text-[#2D2A26]">시각</th>
                            </tr>
                          </thead>
                          <tbody>
                            {authLogs.map((row) => (
                              <tr key={row.log_id} className="border-b border-black/5">
                                <td className="p-3 text-[#2D2A26]">
                                  {row.event_type === 'login'
                                    ? '로그인'
                                    : row.event_type === 'signup'
                                      ? '회원가입'
                                      : row.event_type === 'logout'
                                        ? '로그아웃'
                                        : row.event_type}
                                </td>
                                <td className="p-3 text-[#2D2A26]">{row.email}</td>
                                <td className="p-3 text-black/60">
                                  {new Date(row.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#2D2A26]">데이터 수집 상태</h2>
                <div className="bg-black/5 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>영화 데이터: OMDb API</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-black/60 block">
                      최근 동기화: {syncSettings?.last_movie_sync_at
                        ? new Date(syncSettings.last_movie_sync_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
                        : '-'}
                    </span>
                    {syncSettings?.last_sync_triggered_by_label != null && (
                      <span className="text-sm text-black/50 block">
                        실행: {syncSettings.last_sync_triggered_by_label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Admin;
