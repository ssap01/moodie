/**
 * 감정 기반 추천 라우트
 */

const express = require('express');
const { getMoodRecommendations } = require('../controllers/moodRecommendationController');
const { optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /mood-recommendations - 로그인 선택적
router.post('/', optionalAuthMiddleware, getMoodRecommendations);

module.exports = router;
