/**
 * 평점 API 라우터
 */

const express = require('express');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const {
    createOrUpdateRating,
    getMovieRatings,
    deleteRating,
} = require('../controllers/ratingsController');

const router = express.Router();

// POST /ratings - JWT 필수
router.post('/', authMiddleware, createOrUpdateRating);

// GET /ratings/user/my - 내가 평가한 영화 목록 (JWT 필수) - :movie_id보다 먼저 와야 함
router.get('/user/my', authMiddleware, require('../controllers/ratingsController').getMyRatings);

// GET /ratings/:movie_id - JWT 선택 (있으면 user_rating 포함)
router.get('/:movie_id', optionalAuthMiddleware, getMovieRatings);

// DELETE /ratings/:movie_id - JWT 필수
router.delete('/:movie_id', authMiddleware, deleteRating);

module.exports = router;
