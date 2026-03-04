/**
 * 평점 API 컨트롤러
 */

const db = require('../db');

/**
 * 평점 변경 시 추천 캐시 무효화
 */
function invalidateRecommendationCache(userId) {
    try {
        db.prepare('DELETE FROM recommendation_cache WHERE user_id = ?').run(userId);
    } catch {
        // 테이블 없으면 무시
    }
}

/**
 * POST /ratings - 평점 등록/수정
 * JWT 필수, body: { movie_id, rating }
 * 한 유저 한 영화 1회, 중복 시 update
 */
function createOrUpdateRating(req, res) {
    try {
        const userId = req.user.user_id;
        const { movie_id, rating } = req.body;

        if (!movie_id || rating === undefined) {
            return res.status(400).json({ error: 'movie_id and rating are required.' });
        }

        const movieId = parseInt(movie_id, 10);
        const ratingVal = parseInt(rating, 10);

        if (isNaN(movieId) || isNaN(ratingVal)) {
            return res.status(400).json({ error: 'movie_id and rating must be numbers.' });
        }
        if (ratingVal < 1 || ratingVal > 5) {
            return res.status(400).json({ error: 'rating must be between 1 and 5.' });
        }

        const movie = db.prepare('SELECT movie_id FROM movies WHERE movie_id = ?').get(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found.' });
        }

        const existing = db.prepare('SELECT rating_id FROM rating WHERE user_id = ? AND movie_id = ?').get(userId, movieId);

        if (existing) {
            db.prepare('UPDATE rating SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND movie_id = ?').run(ratingVal, userId, movieId);
            invalidateRecommendationCache(userId);
            return res.json({ message: 'Rating updated successfully.', movie_id: movieId, rating: ratingVal });
        }

        db.prepare('INSERT INTO rating (user_id, movie_id, rating) VALUES (?, ?, ?)').run(userId, movieId, ratingVal);
        invalidateRecommendationCache(userId);
        return res.status(201).json({ message: 'Rating added successfully.', movie_id: movieId, rating: ratingVal });
    } catch (err) {
        console.error('createOrUpdateRating error:', err);
        res.status(500).json({ error: 'An error occurred while processing your rating.' });
    }
}

/**
 * GET /ratings/:movie_id - 영화별 평균 평점 + 로그인 유저 평점
 * JWT 선택 (있으면 user_rating 포함)
 */
function getMovieRatings(req, res) {
    try {
        const movieId = parseInt(req.params.movie_id, 10);
        if (isNaN(movieId)) {
            return res.status(400).json({ error: 'Invalid movie_id.' });
        }

        const movie = db.prepare('SELECT movie_id, title FROM movies WHERE movie_id = ?').get(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found.' });
        }

        const avgRow = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM rating WHERE movie_id = ?').get(movieId);
        const avgRating = avgRow.avg_rating != null ? Math.round(avgRow.avg_rating * 10) / 10 : null;

        const result = {
            movie_id: movieId,
            average_rating: avgRating,
            total_ratings: avgRow.count || 0,
        };

        if (req.user) {
            const userRating = db.prepare('SELECT rating FROM rating WHERE user_id = ? AND movie_id = ?').get(req.user.user_id, movieId);
            result.user_rating = userRating ? userRating.rating : null;
        }

        res.json(result);
    } catch (err) {
        console.error('getMovieRatings error:', err);
        res.status(500).json({ error: 'An error occurred while retrieving ratings.' });
    }
}

/**
 * DELETE /ratings/:movie_id - 로그인 유저 평점 삭제
 * JWT 필수
 */
function deleteRating(req, res) {
    try {
        const userId = req.user.user_id;
        const movieId = parseInt(req.params.movie_id, 10);

        if (isNaN(movieId)) {
            return res.status(400).json({ error: 'Invalid movie_id.' });
        }

        const result = db.prepare('DELETE FROM rating WHERE user_id = ? AND movie_id = ?').run(userId, movieId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'No rating found to delete.' });
        }

        invalidateRecommendationCache(userId);
        res.json({ message: 'Rating deleted successfully.', movie_id: movieId });
    } catch (err) {
        console.error('deleteRating error:', err);
        res.status(500).json({ error: 'An error occurred while deleting the rating.' });
    }
}

/**
 * GET /ratings/user/my - 내가 평가한 영화 목록
 * JWT 필수
 */
function getMyRatings(req, res) {
    try {
        const userId = req.user.user_id;

        const ratings = db.prepare(`
            SELECT 
                r.rating_id,
                r.movie_id,
                r.rating,
                r.created_at,
                r.updated_at,
                m.title,
                m.poster_url,
                m.release_date
            FROM rating r
            INNER JOIN movies m ON r.movie_id = m.movie_id
            WHERE r.user_id = ?
            ORDER BY r.updated_at DESC, r.created_at DESC
        `).all(userId);

        res.json({ ratings });
    } catch (err) {
        console.error('getMyRatings error:', err);
        res.status(500).json({ error: 'Failed to retrieve your ratings.' });
    }
}

module.exports = {
    createOrUpdateRating,
    getMovieRatings,
    deleteRating,
    getMyRatings,
    invalidateRecommendationCache,
};
