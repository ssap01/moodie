/**
 * 추천 API 컨트롤러
 * - 캐시 확인 후 없으면 buildRecommendations 호출
 * - GPT 추천 이유 포함
 */

const db = require('../db');
const { buildRecommendations } = require('../services/recommendations');

/**
 * GET /recommendations - JWT 필수
 * 추천 영화 목록 + GPT 추천 이유
 * 캐시 있으면 GPT 호출 최소화
 */
async function getRecommendations(req, res) {
    try {
        const userId = req.user.user_id;
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

        // 캐시는 기본 5개일 때만 사용 (전체 보기 등 limit > 5 요청은 매번 새로 계산)
        const cached = limit === 5
            ? db.prepare('SELECT result_json FROM recommendation_cache WHERE user_id = ?').get(userId)
            : null;
        if (cached) {
            const result = JSON.parse(cached.result_json);
            return res.json(result);
        }

        // 추천 계산 + GPT 이유 생성
        const result = await buildRecommendations(userId, limit);

        // 캐시 저장 (5개 결과만 저장)
        if (limit === 5) {
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

        res.json(result);
    } catch (err) {
        console.error('getRecommendations error:', err);
        res.status(500).json({ error: 'An error occurred while fetching recommendations.' });
    }
}

module.exports = {
    getRecommendations,
};
