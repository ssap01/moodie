const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * JWT 인증 미들웨어
 * Authorization: Bearer <token> 헤더에서 토큰 추출 후 검증
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.slice(7);

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: '서버 설정 오류입니다.' });
        }

        const decoded = jwt.verify(token, secret);

        const user = db.prepare('SELECT user_id, email, nickname, phone, role, status FROM users WHERE user_id = ?').get(decoded.user_id);
        if (!user) {
            return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
        }
        if (user.status === 'withdrawn') {
            return res.status(401).json({ error: '탈퇴한 계정입니다.' });
        }
        if (user.status !== 'approved') {
            return res.status(403).json({ error: '승인되지 않은 계정입니다.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '토큰이 만료되었습니다. 다시 로그인해주세요.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
        }
        return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
    }
};

/**
 * 선택적 JWT 인증 - 토큰이 없거나 유효하지 않아도 next() 호출 (req.user는 undefined)
 */
const optionalAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.slice(7);
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) return next();

        const decoded = jwt.verify(token, secret);
        const user = db.prepare('SELECT user_id, email, nickname, phone, role, status FROM users WHERE user_id = ?').get(decoded.user_id);
        if (user && user.status === 'approved') {
            req.user = user;
        }
    } catch {
        // 무시하고 진행
    }
    next();
};

/**
 * 역할 기반 권한 미들웨어 (authMiddleware 이후 사용)
 * req.user.role이 allowedRoles 중 하나여야 함
 * @param {...string} allowedRoles - 허용할 role 값 ('USER', 'ADMIN', 'SUPER_ADMIN' 등)
 */
const requireRole = (...allowedRoles) => {
    const set = new Set(allowedRoles.map((r) => String(r).toUpperCase()));
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '인증이 필요합니다.' });
        }
        const role = (req.user.role || '').toUpperCase();
        if (!set.has(role)) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        next();
    };
};

module.exports = { authMiddleware, optionalAuthMiddleware, requireRole };
