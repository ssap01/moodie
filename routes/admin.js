const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { syncMovies } = require('../controllers/movieSyncController');

const router = express.Router();

// 모든 관리자 라우트: JWT 인증 + ADMIN 또는 SUPER_ADMIN
router.use(authMiddleware);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

const ALLOWED_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

/**
 * GET /admin/users
 * 사용자 목록 (관리자용)
 */
router.get('/users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT user_id, email, nickname, phone, role, status, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();
        res.json({ users });
    } catch (err) {
        console.error('Admin list users error:', err);
        res.status(500).json({ error: '사용자 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * PATCH /admin/users/:id/role
 * 사용자 역할 변경 (SUPER_ADMIN 전용)
 * body: { role: 'ADMIN' | 'USER' }
 */
router.patch('/users/:id/role', requireRole('SUPER_ADMIN'), (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id, 10);
        const { role } = req.body;

        if (Number.isNaN(targetUserId)) {
            return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
        }
        if (!role || typeof role !== 'string') {
            return res.status(400).json({ error: '변경할 역할(role)을 입력해주세요.' });
        }

        const newRole = role.trim().toUpperCase();
        if (!ALLOWED_ROLES.includes(newRole)) {
            return res.status(400).json({ error: `역할은 ${ALLOWED_ROLES.join(', ')} 중 하나여야 합니다.` });
        }

        const target = db.prepare('SELECT user_id, role, status FROM users WHERE user_id = ?').get(targetUserId);
        if (!target) {
            return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
        }
        if (target.status === 'withdrawn') {
            return res.status(403).json({ error: '탈퇴한 계정의 역할은 변경할 수 없습니다.' });
        }

        // 마지막 SUPER_ADMIN은 강등/삭제 불가
        if (target.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
            const superAdminCount = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'SUPER_ADMIN'").get();
            if (superAdminCount.cnt <= 1) {
                return res.status(403).json({ error: '마지막 최고관리자는 강등할 수 없습니다.' });
            }
        }

        db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(newRole, targetUserId);

        const updated = db.prepare('SELECT user_id, email, nickname, role, status, created_at FROM users WHERE user_id = ?').get(targetUserId);
        res.json({ message: '역할이 변경되었습니다.', user: updated });
    } catch (err) {
        console.error('Admin update role error:', err);
        res.status(500).json({ error: '역할 변경 중 오류가 발생했습니다.' });
    }
});

/**
 * PATCH /admin/users/:id/restore
 * 탈퇴 회원 복구 (관리자용)
 */
router.patch('/users/:id/restore', (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id, 10);
        if (Number.isNaN(targetUserId)) {
            return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
        }

        const target = db.prepare('SELECT user_id, email, status FROM users WHERE user_id = ?').get(targetUserId);
        if (!target) {
            return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
        }
        if (target.status !== 'withdrawn') {
            return res.status(400).json({ error: '탈퇴 상태가 아닌 계정입니다.' });
        }

        db.prepare(
            'UPDATE users SET status = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run('approved', targetUserId);

        const updated = db.prepare('SELECT user_id, email, nickname, role, status, created_at FROM users WHERE user_id = ?').get(targetUserId);
        res.json({ message: '계정이 복구되었습니다.', user: updated });
    } catch (err) {
        console.error('Admin restore user error:', err);
        res.status(500).json({ error: '계정 복구 중 오류가 발생했습니다.' });
    }
});

/**
 * GET /admin/sync/settings
 * 자동 동기화 ON/OFF 등 동기화 설정 조회
 */
router.get('/sync/settings', (req, res) => {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_sync_enabled'").get();
        const auto_sync_enabled = row && row.value === '1';
        const lastRow = db.prepare("SELECT value FROM settings WHERE key = 'last_movie_sync_at'").get();
        const last_movie_sync_at = lastRow ? lastRow.value : null;
        const triggeredRow = db.prepare("SELECT value FROM settings WHERE key = 'last_sync_triggered_by'").get();
        const last_sync_triggered_by = triggeredRow ? triggeredRow.value : null;
        let last_sync_triggered_by_label = null;
        if (last_sync_triggered_by === 'system') {
            last_sync_triggered_by_label = '시스템';
        } else if (last_sync_triggered_by) {
            const user = db.prepare('SELECT email FROM users WHERE user_id = ?').get(parseInt(last_sync_triggered_by, 10));
            last_sync_triggered_by_label = user ? user.email : '알 수 없음';
        }
        const movieCount = db.prepare('SELECT COUNT(*) AS count FROM movies').get().count;
        res.json({ auto_sync_enabled, last_movie_sync_at, last_sync_triggered_by_label, movie_count: movieCount });
    } catch (err) {
        console.error('Admin get sync settings error:', err);
        res.status(500).json({ error: '설정을 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * PATCH /admin/sync/settings
 * 자동 동기화 ON/OFF 설정 변경
 * body: { auto_sync_enabled: boolean }
 */
router.patch('/sync/settings', (req, res) => {
    try {
        const { auto_sync_enabled } = req.body;
        if (typeof auto_sync_enabled !== 'boolean') {
            return res.status(400).json({ error: 'auto_sync_enabled는 true/false 여야 합니다.' });
        }
        db.prepare(
            "INSERT INTO settings (key, value) VALUES ('auto_sync_enabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(auto_sync_enabled ? '1' : '0');
        res.json({ auto_sync_enabled });
    } catch (err) {
        console.error('Admin update sync settings error:', err);
        res.status(500).json({ error: '설정 저장 중 오류가 발생했습니다.' });
    }
});

/**
 * POST /admin/sync/movies
 * 지금 동기화 - OMDb에서 영화 데이터 수집 (기존 데이터 삭제 후 재수집)
 */
router.post('/sync/movies', async (req, res) => {
    try {
        const triggeredBy = req.user && req.user.user_id ? req.user.user_id : 'system';
        const result = await syncMovies({ force: true, triggeredBy });
        if (result.skipped && result.error) {
            return res.status(400).json({
                error: result.error,
                skipped: true,
                count: 0,
            });
        }
        res.json({
            message: result.skipped ? '이미 동기화되었거나 스킵되었습니다.' : `${result.count}개 영화 동기화 완료.`,
            skipped: result.skipped || false,
            count: result.count || 0,
        });
    } catch (err) {
        console.error('Admin sync movies error:', err);
        res.status(500).json({
            error: err.message || '영화 동기화 중 오류가 발생했습니다.',
        });
    }
});

/**
 * GET /admin/logs/search
 * 검색 로그 (최근 목록 + 인기 검색어)
 */
router.get('/logs/search', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const recent = db.prepare(`
            SELECT log_id, query, created_at
            FROM search_log
            ORDER BY log_id DESC
            LIMIT ?
        `).all(limit);
        const popular = db.prepare(`
            SELECT query, COUNT(*) AS count
            FROM search_log
            GROUP BY query
            ORDER BY count DESC
            LIMIT 20
        `).all();
        res.json({ recent, popular });
    } catch (err) {
        console.error('Admin get search logs error:', err);
        res.status(500).json({ error: '검색 로그를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * GET /admin/logs/movie-views
 * 영화 조회 로그 (많이 본 영화)
 */
router.get('/logs/movie-views', (req, res) => {
    try {
        const popular = db.prepare(`
            SELECT m.movie_id, m.title, m.poster_url, COUNT(*) AS view_count
            FROM movie_view_log v
            JOIN movies m ON m.movie_id = v.movie_id
            GROUP BY v.movie_id
            ORDER BY view_count DESC
            LIMIT 20
        `).all();
        res.json({ popular });
    } catch (err) {
        console.error('Admin get movie view logs error:', err);
        res.status(500).json({ error: '영화 조회 로그를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * GET /admin/logs/auth
 * 로그인/회원가입/로그아웃 로그 (최근 N건)
 */
router.get('/logs/auth', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const recent = db.prepare(`
            SELECT l.log_id, l.event_type, l.created_at, u.email
            FROM auth_log l
            JOIN users u ON u.user_id = l.user_id
            ORDER BY l.created_at DESC, l.log_id DESC
            LIMIT ?
        `).all(limit);
        res.json({ recent });
    } catch (err) {
        console.error('Admin get auth logs error:', err);
        res.status(500).json({ error: '인증 로그를 불러오는 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
