/**
 * 추천 API 컨트롤러
 * - 캐시 확인 후 없으면 buildRecommendations 호출
 * - GPT 추천 이유 포함
 */

const db = require('../db');
const { buildRecommendations } = require('../services/recommendations');

const CACHE_SIZE = 25;

/**
 * GET /recommendations - JWT 필수
 * 추천 영화 목록 + GPT 추천 이유
 * 캐시 있으면 GPT 호출 최소화 (최대 25개까지 캐시 활용)
 */
async function getRecommendations(req, res) {
    try {
        const userId = req.user.user_id;
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

        // 캐시: limit 이하 요청 시 캐시에서 slice 반환
        const cached = db.prepare('SELECT result_json FROM recommendation_cache WHERE user_id = ?').get(userId);
        if (cached && limit <= CACHE_SIZE) {
            const full = JSON.parse(cached.result_json);
            if (full.length >= limit) {
                return res.json(full.slice(0, limit));
            }
        }

        // limit 25 이하 요청: 25개 빌드 후 캐시. limit 초과 요청: 요청 수만큼만 빌드
        const buildLimit = limit <= CACHE_SIZE ? CACHE_SIZE : limit;
        const result = await buildRecommendations(userId, buildLimit);

        // 25개 이하 결과는 캐시 저장
        if (result.length <= CACHE_SIZE) {
            try {
                db.prepare(`
                    INSERT INTO recommendation_cache (user_id, result_json)
                    VALUES (?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET result_json = excluded.result_json, created_at = CURRENT_TIMESTAMP
                `).run(userId, JSON.stringify(result));
            } catch (err) {
                console.warn('[Recommendations] 캐시 저장 실패:', err.message);
            }
        }

        res.json(result.slice(0, limit));
    } catch (err) {
        console.error('getRecommendations error:', err);
        res.status(500).json({ error: 'An error occurred while fetching recommendations.' });
    }
}

module.exports = {
    getRecommendations,
};
