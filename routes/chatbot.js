/**
 * 챗봇 라우트
 */

const express = require('express');
const { handleChatbotMessage } = require('../controllers/chatbotController');
const { optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /chatbot - 로그인 선택적 (optionalAuthMiddleware 사용)
router.post('/', optionalAuthMiddleware, handleChatbotMessage);

module.exports = router;
