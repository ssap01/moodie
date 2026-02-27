/**
 * 챗봇 서비스
 * 규칙 기반 답변 생성. 규칙 정의는 chatbotRules.js 참조.
 */

const db = require('../db');
const { rules, getDefaultResponse } = require('./chatbotRules');

/**
 * 사용자 평점 통계 조회
 */
function getUserRatingStats(userId) {
    const stats = db.prepare(`
        SELECT 
            COUNT(*) as total_ratings,
            AVG(rating) as avg_rating,
            COUNT(CASE WHEN rating >= 4 THEN 1 END) as high_ratings
        FROM rating
        WHERE user_id = ?
    `).get(userId);

    return {
        totalRatings: stats?.total_ratings || 0,
        avgRating: stats?.avg_rating || 0,
        highRatings: stats?.high_ratings || 0,
    };
}

/**
 * 사용자 선호 장르 조회 (4점 이상 평점 기준)
 */
function getUserFavoriteGenres(userId) {
    const genres = db.prepare(`
        SELECT g.name, COUNT(*) as count
        FROM rating r
        JOIN movie_genres mg ON r.movie_id = mg.movie_id
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE r.user_id = ? AND r.rating >= 4
        GROUP BY g.genre_id, g.name
        ORDER BY count DESC
        LIMIT 5
    `).all(userId);

    return genres.map((g) => g.name);
}

/**
 * 사용자 최근 평점 영화 조회
 */
function getUserRecentRatings(userId, limit = 3) {
    const movies = db.prepare(`
        SELECT m.title, r.rating, r.created_at
        FROM rating r
        JOIN movies m ON r.movie_id = m.movie_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ?
    `).all(userId, limit);

    return movies;
}

/**
 * 챗봇 답변 생성
 * @param {string} userText - 사용자 입력
 * @param {number|null} userId - 로그인 시 user_id, 아니면 null
 * @returns {string}
 */
function generateChatbotReply(userText, userId = null) {
    const t = userText.trim().toLowerCase();
    if (!t) return '궁금한 걸 입력해 주세요.';

    const userStats = userId ? getUserRatingStats(userId) : null;
    const favoriteGenres = userId ? getUserFavoriteGenres(userId) : [];
    const recentRatings = userId ? getUserRecentRatings(userId) : [];

    const ctx = {
        userId,
        userStats,
        favoriteGenres,
        recentRatings,
    };

    for (const rule of rules) {
        if (rule.pattern.test(t)) {
            const res = rule.response;
            let reply = typeof res === 'function' ? res(ctx) : res;
            if (Array.isArray(reply)) reply = reply[Math.floor(Math.random() * reply.length)];
            return reply;
        }
    }

    let defaultReply = getDefaultResponse(ctx);
    if (Array.isArray(defaultReply)) defaultReply = defaultReply[Math.floor(Math.random() * defaultReply.length)];
    return defaultReply;
}

module.exports = {
    generateChatbotReply,
    getUserRatingStats,
    getUserFavoriteGenres,
    getUserRecentRatings,
};
