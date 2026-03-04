/**
 * 찜하기(위시리스트) API 컨트롤러
 */

const db = require('../db');

/**
 * POST /wishlist/:movie_id - 찜하기 추가
 * JWT 필수
 */
function addToWishlist(req, res) {
    try {
        const userId = req.user.user_id;
        const movieId = parseInt(req.params.movie_id, 10);

        if (Number.isNaN(movieId)) {
            return res.status(400).json({ error: 'Invalid movie_id.' });
        }

        const movie = db.prepare('SELECT movie_id FROM movies WHERE movie_id = ?').get(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found.' });
        }

        try {
            db.prepare('INSERT INTO user_movie_wishlist (user_id, movie_id) VALUES (?, ?)').run(userId, movieId);
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                return res.json({ message: 'Already in wishlist.', in_wishlist: true, movie_id: movieId });
            }
            throw err;
        }

        return res.status(201).json({ message: 'Added to wishlist.', in_wishlist: true, movie_id: movieId });
    } catch (err) {
        console.error('addToWishlist error:', err);
        return res.status(500).json({ error: 'An error occurred while adding to wishlist.' });
    }
}

/**
 * DELETE /wishlist/:movie_id - 찜하기 해제
 * JWT 필수
 */
function removeFromWishlist(req, res) {
    try {
        const userId = req.user.user_id;
        const movieId = parseInt(req.params.movie_id, 10);

        if (Number.isNaN(movieId)) {
            return res.status(400).json({ error: 'Invalid movie_id.' });
        }

        const result = db.prepare('DELETE FROM user_movie_wishlist WHERE user_id = ? AND movie_id = ?').run(userId, movieId);

        if (result.changes === 0) {
            return res.json({ message: 'Not in wishlist.', in_wishlist: false, movie_id: movieId });
        }

        return res.json({ message: 'Removed from wishlist.', in_wishlist: false, movie_id: movieId });
    } catch (err) {
        console.error('removeFromWishlist error:', err);
        return res.status(500).json({ error: 'An error occurred while removing from wishlist.' });
    }
}

/**
 * GET /wishlist/:movie_id - 해당 영화 찜 여부
 * JWT 선택 (있으면 해당 유저 기준, 없으면 in_wishlist: false)
 */
function getWishlistStatus(req, res) {
    try {
        const movieId = parseInt(req.params.movie_id, 10);

        if (Number.isNaN(movieId)) {
            return res.status(400).json({ error: 'Invalid movie_id.' });
        }

        const movie = db.prepare('SELECT movie_id FROM movies WHERE movie_id = ?').get(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found.' });
        }

        let in_wishlist = false;
        if (req.user) {
            const row = db.prepare('SELECT 1 FROM user_movie_wishlist WHERE user_id = ? AND movie_id = ?').get(req.user.user_id, movieId);
            in_wishlist = !!row;
        }

        return res.json({ movie_id: movieId, in_wishlist });
    } catch (err) {
        console.error('getWishlistStatus error:', err);
        return res.status(500).json({ error: 'An error occurred while checking wishlist status.' });
    }
}

/**
 * GET /wishlist/user/my - 내 찜 목록
 * JWT 필수
 */
function getMyWishlist(req, res) {
    try {
        const userId = req.user.user_id;

        const items = db.prepare(`
            SELECT
                m.movie_id,
                m.title,
                m.poster_url,
                m.release_date,
                w.created_at
            FROM user_movie_wishlist w
            INNER JOIN movies m ON w.movie_id = m.movie_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `).all(userId);

        return res.json({ wishlist: items });
    } catch (err) {
        console.error('getMyWishlist error:', err);
        return res.status(500).json({ error: 'Failed to retrieve your wishlist.' });
    }
}

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlistStatus,
    getMyWishlist,
};
