/**
 * 영화 API 라우터
 */

const express = require('express');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { getMovies, getNewArrivals, getMovieById, getFilterOptions, getSearch } = require('../controllers/moviesController');

const router = express.Router();

// GET /movies/filter-options — :id보다 먼저 정의
router.get('/filter-options', getFilterOptions);

// GET /movies/search?q=... — :id보다 먼저 정의
router.get('/search', getSearch);

// GET /movies?page=1&limit=20&sort=...&rated=&country=&language=&director=
router.get('/', getMovies);

// GET /movies/new?limit=10 — 신작(개봉일 최신순), :id보다 먼저 정의
router.get('/new', getNewArrivals);

// GET /movies/:id (optionalAuth: 조회 로그에 user_id 남기기 위함)
router.get('/:id', optionalAuthMiddleware, getMovieById);

module.exports = router;
