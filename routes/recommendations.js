/**
 * 추천 API 라우터
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getRecommendations } = require('../controllers/recommendationsController');

const router = express.Router();

// GET /recommendations - JWT 필수
router.get('/', authMiddleware, getRecommendations);

module.exports = router;
