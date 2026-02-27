/**
 * 감정 기반 추천 API 컨트롤러
 */

const { getMoodBasedMovies, generateMoodReason } = require('../services/moodRecommendationService');
const { optionalAuthMiddleware } = require('../middleware/auth');

/**
 * POST /mood-recommendations
 * 감정/상황 기반 영화 추천 (로그인 선택적)
 */
function getMoodRecommendations(req, res) {
    try {
        const { mood, limit = 5 } = req.body;
        
        if (!mood || typeof mood !== 'string') {
            return res.status(400).json({ error: 'Please enter a mood or situation.' });
        }
        
        // 로그인한 경우 userId 사용, 아니면 null
        const userId = req.user?.user_id || null;
        
        const movies = getMoodBasedMovies(mood, limit, userId);
        const reason = generateMoodReason(mood, movies.length);
        
        res.json({
            movies,
            reason,
            mood,
        });
    } catch (err) {
        console.error('getMoodRecommendations error:', err);
        res.status(500).json({ error: 'An error occurred while fetching recommendations.' });
    }
}

module.exports = {
    getMoodRecommendations,
};
