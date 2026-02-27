// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json()); // JSON body 파싱

// 라우트
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const moviesRoutes = require('./routes/movies');
const ratingsRoutes = require('./routes/ratings');
const recommendationsRoutes = require('./routes/recommendations');
const chatbotRoutes = require('./routes/chatbot');
const moodRecommendationsRoutes = require('./routes/moodRecommendations');
const wishlistRoutes = require('./routes/wishlist');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/movies', moviesRoutes);
app.use('/ratings', ratingsRoutes);
app.use('/recommendations', recommendationsRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/mood-recommendations', moodRecommendationsRoutes);
app.use('/wishlist', wishlistRoutes);

// 기본 라우트
app.get('/', (req, res) => {
    res.send('Moodie 영화 추천 서버가 정상 실행 중입니다!');
});

// 서버 시작
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // 서버 시작 시 영화 데이터 동기화 (DB에 없을 때만)
    const { syncMovies } = require('./controllers/movieSyncController');
    syncMovies().catch((err) => console.error('[MovieSync]', err));

    // 자동 동기화 스케줄: 매일 새벽 2시, auto_sync_enabled일 때만 실행
    const cron = require('node-cron');
    const db = require('./db');

    /** 검색 로그 정리: 30일 지난 건 삭제 + 전체 2만 건 초과 시 오래된 것부터 삭제 */
    function cleanupSearchLog() {
        try {
            const del30 = db.prepare("DELETE FROM search_log WHERE created_at < datetime('now', '-30 days')").run();
            const count = db.prepare('SELECT COUNT(*) AS c FROM search_log').get().c;
            let delCap = 0;
            if (count > 20000) {
                const row = db.prepare('SELECT log_id FROM search_log ORDER BY log_id DESC LIMIT 1 OFFSET 19999').get();
                if (row) {
                    delCap = db.prepare('DELETE FROM search_log WHERE log_id < ?').run(row.log_id).changes;
                }
            }
            if (del30.changes > 0 || delCap > 0) {
                console.log('[SearchLog] 정리:', del30.changes, '건(30일 초과),', delCap, '건(2만 건 초과)');
            }
        } catch (err) {
            console.error('[SearchLog] 정리 오류:', err);
        }
    }

    /** 영화 조회 로그 정리: 30일 + 최대 2만 건 */
    function cleanupMovieViewLog() {
        try {
            const del30 = db.prepare("DELETE FROM movie_view_log WHERE created_at < datetime('now', '-30 days')").run();
            const count = db.prepare('SELECT COUNT(*) AS c FROM movie_view_log').get().c;
            let delCap = 0;
            if (count > 20000) {
                const row = db.prepare('SELECT log_id FROM movie_view_log ORDER BY log_id DESC LIMIT 1 OFFSET 19999').get();
                if (row) {
                    delCap = db.prepare('DELETE FROM movie_view_log WHERE log_id < ?').run(row.log_id).changes;
                }
            }
            if (del30.changes > 0 || delCap > 0) {
                console.log('[MovieViewLog] 정리:', del30.changes, '건(30일 초과),', delCap, '건(2만 건 초과)');
            }
        } catch (err) {
            console.error('[MovieViewLog] 정리 오류:', err);
        }
    }

    cron.schedule('0 2 * * *', async () => {
        try {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_sync_enabled'").get();
            if (!row || row.value !== '1') return;
            console.log('[MovieSync] 스케줄: 자동 동기화 실행');
            await syncMovies({ force: true, triggeredBy: 'system' });
        } catch (err) {
            console.error('[MovieSync] 스케줄 실행 오류:', err);
        }
    });

    // 검색 로그 정리: 매일 새벽 2시 3분 (30일 초과 + 최대 2만 건)
    cron.schedule('3 2 * * *', () => cleanupSearchLog());
    // 영화 조회 로그 정리: 매일 새벽 2시 4분
    cron.schedule('4 2 * * *', () => cleanupMovieViewLog());

    // 서버 기동 시에도 한 번 실행 (선택)
    cleanupSearchLog();
    cleanupMovieViewLog();
});