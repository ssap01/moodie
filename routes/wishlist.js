/**
 * 찜하기(위시리스트) API 라우터
 */

const express = require('express');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { addToWishlist, removeFromWishlist, getWishlistStatus, getMyWishlist } = require('../controllers/wishlistController');

const router = express.Router();

// GET /wishlist/user/my - 내 찜 목록 (JWT 필수, :movie_id보다 먼저)
router.get('/user/my', authMiddleware, getMyWishlist);

// GET /wishlist/:movie_id - 해당 영화 찜 여부 (JWT 선택)
router.get('/:movie_id', optionalAuthMiddleware, getWishlistStatus);

// POST /wishlist/:movie_id - 찜하기 추가 (JWT 필수)
router.post('/:movie_id', authMiddleware, addToWishlist);

// DELETE /wishlist/:movie_id - 찜 해제 (JWT 필수)
router.delete('/:movie_id', authMiddleware, removeFromWishlist);

module.exports = router;
