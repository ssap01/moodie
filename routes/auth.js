const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { sendPasswordResetEmail, sendFindEmailReminder } = require('../services/emailService');

const OTP_EXPIRY_MINUTES = 5;
function hashOtp(otp) {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}
function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    const local = email.slice(0, at);
    const domain = email.slice(at);
    if (local.length <= 2) return local[0] + '***' + domain;
    return local[0] + '***' + local[local.length - 1] + domain;
}

const router = express.Router();

// 이메일 유효성 검증 (RFC 5322 간소화)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 유효성: 8자 이상, 영문+숫자+특수문자 포함
const validatePassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (!/[a-zA-Z]/.test(password)) return false; // 영문자
    if (!/\d/.test(password)) return false; // 숫자
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false; // 특수문자
    return true;
};

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
};

// 닉네임 유효성 검증: 최대 50자
const validateNickname = (nickname) => {
    if (!nickname || nickname.trim() === '') return { valid: true, error: null }; // 선택 필드
    if (nickname.length > 50) return { valid: false, error: 'Nickname must be 50 characters or less.' };
    return { valid: true, error: null };
};

// 전화번호 유효성 검증: 선택 필드, 입력 시 형식 검증
const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') return { valid: true, error: null }; // 선택 필드
    // 전화번호 형식: 숫자, 하이픈, 공백, + 허용, 최소 10자
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(phone)) {
        return { valid: false, error: 'Invalid phone number format. Only numbers, hyphens, and spaces are allowed.' };
    }
    if (cleanedPhone.length < 10) {
        return { valid: false, error: 'Phone number must be at least 10 digits.' };
    }
    if (phone.length > 20) {
        return { valid: false, error: 'Phone number must be 20 characters or less.' };
    }
    return { valid: true, error: null };
};

/**
 * POST /auth/signup
 * 회원가입
 */
router.post('/signup', (req, res) => {
    try {
        const { email, password, passwordConfirm, nickname, phone } = req.body;

        // 이메일 검증
        if (!email || typeof email !== 'string' || email.trim() === '') {
            return res.status(400).json({ error: 'Please enter your email address.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format. Example: user@example.com' });
        }

        // 비밀번호 검증
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Please enter your password.' });
        }
        if (!validatePassword(password)) {
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            }
            if (!/[a-zA-Z]/.test(password)) {
                return res.status(400).json({ error: 'Password must include at least one letter.' });
            }
            if (!/\d/.test(password)) {
                return res.status(400).json({ error: 'Password must include at least one number.' });
            }
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
                return res.status(400).json({ error: 'Password must include at least one special character (!@#$%^&* etc.).' });
            }
            return res.status(400).json({ error: 'Password must be at least 8 characters long and include letters, numbers, and special characters.' });
        }
        if (password !== passwordConfirm) {
            return res.status(400).json({ error: 'Passwords do not match. Please check again.' });
        }

        // 닉네임 검증
        const nicknameValidation = validateNickname(nickname);
        if (!nicknameValidation.valid) {
            return res.status(400).json({ error: nicknameValidation.error });
        }

        // 전화번호 검증
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) {
            return res.status(400).json({ error: phoneValidation.error });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(trimmedEmail);
        if (existing) {
            return res.status(409).json({ error: 'This email is already in use.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const phoneVal = phone != null && String(phone).trim() !== '' ? String(phone).trim() : null;
        const stmt = db.prepare(`
            INSERT INTO users (email, password, nickname, phone, role, status, terms_privacy_agreed_at)
            VALUES (?, ?, ?, ?, 'USER', 'approved', CURRENT_TIMESTAMP)
        `);
        const result = stmt.run(trimmedEmail, hashedPassword, nickname?.trim() || null, phoneVal);

        const user = db.prepare('SELECT user_id, email, nickname, phone, role, status, created_at, terms_privacy_agreed_at FROM users WHERE user_id = ?').get(result.lastInsertRowid);

        // 회원가입 성공 로그
        try {
            db.prepare('INSERT INTO auth_log (user_id, event_type) VALUES (?, ?)').run(user.user_id, 'signup');
        } catch (_) { /* 로그 실패는 무시 */ }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        res.status(201).json({
            message: 'Sign up completed successfully.',
            token: jwt.sign(
                { user_id: user.user_id, email: user.email },
                secret,
                { expiresIn: '7d' }
            ),
            user: {
                user_id: user.user_id,
                email: user.email,
                nickname: user.nickname,
                phone: user.phone,
                role: user.role,
                status: user.status,
                created_at: user.created_at,
            },
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'An error occurred during sign up. Please try again.' });
    }
});

/**
 * POST /auth/login
 * 로그인 - JWT 발급
 */
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || typeof email !== 'string' || email.trim() === '') {
            return res.status(400).json({ error: 'Please enter your email address.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format. Example: user@example.com' });
        }
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Please enter your password.' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT user_id, email, password, nickname, role, status FROM users WHERE email = ?').get(trimmedEmail);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.status === 'withdrawn') {
            const valid = bcrypt.compareSync(password, user.password);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const deletedAt = db.prepare('SELECT deleted_at FROM users WHERE user_id = ?').get(user.user_id)?.deleted_at;
            const daysLeft = deletedAt
                ? Math.max(0, 30 - Math.floor((Date.now() - new Date(deletedAt + 'Z').getTime()) / 86400000))
                : 0;
            return res.status(403).json({
                error: '탈퇴한 계정입니다. 복구하시겠습니까?',
                withdrawn: true,
                daysLeft,
            });
        }
        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Your account has not been approved.' });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email },
            secret,
            { expiresIn: '7d' }
        );

        // 로그인 성공 로그
        try {
            db.prepare('INSERT INTO auth_log (user_id, event_type) VALUES (?, ?)').run(user.user_id, 'login');
        } catch (_) { /* 로그 실패는 무시 */ }

        res.json({
            message: 'Login successful.',
            token,
            expiresIn: '7d',
            user: {
                user_id: user.user_id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'An error occurred while logging in. Please try again.' });
    }
});

/**
 * POST /auth/forgot-password
 * 비밀번호 찾기: 이메일 입력 시 재설정 링크 발송. 계정 유무와 관계없이 동일 메시지 반환.
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ error: '이메일을 입력해 주세요.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
        }
        const trimmedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT user_id, email FROM users WHERE email = ? AND status = ?').get(trimmedEmail, 'approved');
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            db.prepare(
                'UPDATE users SET password_reset_token = ?, password_reset_expires_at = ? WHERE user_id = ?'
            ).run(token, expiresAt, user.user_id);
            const resetLink = `${frontendUrl}/login?reset=${token}`;
            try {
                await sendPasswordResetEmail(user.email, resetLink);
            } catch (emailErr) {
                console.error('[Forgot password] 이메일 발송 실패 (링크는 콘솔에 출력됨):', emailErr.message);
                if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
                    console.log('[Forgot password] 재설정 링크:', resetLink);
                }
            }
        }
        res.json({ message: '해당 이메일로 계정이 있으면 재설정 링크를 보냈습니다. 이메일을 확인해 주세요.' });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});

/**
 * GET /auth/reset-password/validate?token=xxx
 * 토큰 유효 여부 확인 (프론트에서 새 비밀번호 폼 노출 전 사용)
 */
router.get('/reset-password/validate', (req, res) => {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: '유효하지 않거나 만료된 링크입니다.' });
    }
    const row = db.prepare(
        'SELECT user_id FROM users WHERE password_reset_token = ? AND password_reset_expires_at > datetime(\'now\')'
    ).get(token.trim());
    if (!row) {
        return res.status(400).json({ error: '유효하지 않거나 만료된 링크입니다.' });
    }
    res.json({ valid: true });
});

/**
 * POST /auth/reset-password
 * 비밀번호 재설정: 토큰 + 새 비밀번호로 갱신 후 토큰 무효화
 */
router.post('/reset-password', (req, res) => {
    try {
        const { token, newPassword, newPasswordConfirm } = req.body || {};
        if (!token || typeof token !== 'string' || !token.trim()) {
            return res.status(400).json({ error: '유효하지 않거나 만료된 링크입니다.' });
        }
        if (!newPassword || typeof newPassword !== 'string') {
            return res.status(400).json({ error: '새 비밀번호를 입력해 주세요.' });
        }
        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                error: '비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.',
            });
        }
        const row = db.prepare(
            'SELECT user_id FROM users WHERE password_reset_token = ? AND password_reset_expires_at > datetime(\'now\')'
        ).get(token.trim());
        if (!row) {
            return res.status(400).json({ error: '유효하지 않거나 만료된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요.' });
        }
        const hashed = bcrypt.hashSync(newPassword, 10);
        db.prepare(
            'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run(hashed, row.user_id);
        res.json({ message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});

/**
 * POST /auth/find-email-by-email
 * 로그인 이메일 찾기 (이메일로): 해당 이메일로 가입된 계정이 있으면 그 주소로 "로그인 이메일은 xxx" 발송
 */
router.post('/find-email-by-email', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ error: '이메일을 입력해 주세요.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
        }
        const trimmedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT email FROM users WHERE email = ? AND status = ?').get(trimmedEmail, 'approved');
        if (user) {
            await sendFindEmailReminder(user.email, user.email);
        }
        res.json({ message: '해당 이메일로 계정이 있으면 로그인 이메일 안내를 보냈습니다. 이메일을 확인해 주세요.' });
    } catch (err) {
        console.error('Find email by email error:', err);
        res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
    }
});

/**
 * POST /auth/find-email-send-otp
 * 로그인 이메일 찾기 (전화번호): OTP 발송. 개발 시 응답에 devOtp 포함.
 */
router.post('/find-email-send-otp', (req, res) => {
    try {
        const { phone, nickname } = req.body || {};
        const phoneNorm = (phone != null ? String(phone) : '').replace(/\D/g, '').trim();
        if (!phoneNorm || phoneNorm.length < 10) {
            return res.status(400).json({ error: '휴대폰 번호를 입력해 주세요.' });
        }
        const normalize = (s) => (s == null ? '' : String(s).replace(/\D/g, ''));
        const nick = nickname != null ? String(nickname).trim() : '';
        const rows = db.prepare('SELECT user_id, email, phone, nickname FROM users WHERE status = ?').all('approved');
        const user = rows.find((r) => {
            if (normalize(r.phone) !== phoneNorm) return false;
            if (nick !== '' && r.nickname !== nick) return false;
            return true;
        });
        if (!user || !user.email) {
            return res.status(404).json({ error: '일치하는 계정을 찾을 수 없습니다.' });
        }
        const hasPassword = db.prepare('SELECT password FROM users WHERE user_id = ?').get(user.user_id);
        if (!hasPassword || !hasPassword.password || hasPassword.password.length < 10) {
            return res.status(403).json({ error: '이 기능은 이메일/비밀번호 가입자 전용입니다.' });
        }
        const otp = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const otpHash = hashOtp(otp);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
        db.prepare(
            'INSERT INTO find_email_otp (phone, otp_hash, email, expires_at) VALUES (?, ?, ?, ?)'
        ).run(phoneNorm, otpHash, user.email, expiresAt);
        const payload = { ok: true, message: '인증번호가 발송되었습니다.' };
        if (process.env.NODE_ENV !== 'production') {
            payload.devOtp = otp;
        }
        res.json(payload);
    } catch (err) {
        console.error('Find email send OTP error:', err);
        res.status(500).json({ error: '인증번호 발송에 실패했습니다.' });
    }
});

/**
 * POST /auth/find-email-verify-otp
 * 로그인 이메일 찾기 (전화번호): OTP 검증 후 마스킹된 이메일 반환
 */
router.post('/find-email-verify-otp', (req, res) => {
    try {
        const { phone, otp } = req.body || {};
        const phoneNorm = (phone != null ? String(phone) : '').replace(/\D/g, '').trim();
        if (!phoneNorm || !otp || typeof otp !== 'string' || !otp.trim()) {
            return res.status(400).json({ error: '휴대폰 번호와 인증번호를 입력해 주세요.' });
        }
        const otpHash = hashOtp(otp.trim());
        const row = db.prepare(
            'SELECT id, email FROM find_email_otp WHERE phone = ? AND otp_hash = ? AND expires_at > datetime(\'now\') ORDER BY id DESC LIMIT 1'
        ).get(phoneNorm, otpHash);
        if (!row) {
            return res.status(400).json({ error: '인증번호가 일치하지 않거나 만료되었습니다.' });
        }
        db.prepare('DELETE FROM find_email_otp WHERE phone = ?').run(phoneNorm);
        res.json({ ok: true, emailMasked: maskEmail(row.email) });
    } catch (err) {
        console.error('Find email verify OTP error:', err);
        res.status(500).json({ error: '인증 확인에 실패했습니다.' });
    }
});

/**
 * Google tokeninfo payload로 사용자 생성/조회 후 JWT 발급 (공통)
 */
function googlePayloadToUserAndToken(payload, clientId, secret) {
    if (!payload || payload.aud !== clientId) return null;

    const googleId = payload.sub;
    const email = payload.email;
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const name = payload.name;
    if (!googleId || !email || !emailVerified) return null;

    const trimmedEmail = email.trim().toLowerCase();

    let user = db.prepare(
        'SELECT user_id, email, nickname, phone, role, status, created_at, google_id, login_provider FROM users WHERE google_id = ?'
    ).get(googleId);
    let isNewUser = false;

    if (!user) {
        const existingByEmail = db.prepare(
            'SELECT user_id, email, nickname, phone, role, status, created_at, google_id, login_provider FROM users WHERE email = ?'
        ).get(trimmedEmail);

        if (existingByEmail) {
            db.prepare('UPDATE users SET google_id = ?, login_provider = ? WHERE user_id = ?').run(
                googleId, 'google', existingByEmail.user_id
            );
            user = Object.assign({}, existingByEmail, { google_id: googleId, login_provider: 'google' });
        } else {
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const hashedPassword = bcrypt.hashSync(randomPassword, 10);
            const nickname = (typeof name === 'string' && name.trim() !== '')
                ? name.trim().slice(0, 50)
                : trimmedEmail.split('@')[0].slice(0, 50);
            const insertResult = db.prepare(`
                INSERT INTO users (email, password, nickname, phone, role, status, terms_privacy_agreed_at, google_id, login_provider)
                VALUES (?, ?, ?, NULL, 'USER', 'approved', CURRENT_TIMESTAMP, ?, 'google')
            `).run(trimmedEmail, hashedPassword, nickname, googleId);
            user = db.prepare(
                'SELECT user_id, email, nickname, phone, role, status, created_at, google_id, login_provider FROM users WHERE user_id = ?'
            ).get(insertResult.lastInsertRowid);
            isNewUser = true;
        }
    }

    if (!user || user.status === 'withdrawn') return null;

    const token = jwt.sign(
        { user_id: user.user_id, email: user.email },
        secret,
        { expiresIn: '7d' }
    );
    try {
        db.prepare('INSERT INTO auth_log (user_id, event_type) VALUES (?, ?)').run(
            user.user_id, isNewUser ? 'signup_google' : 'login_google'
        );
    } catch (_) { /* ignore */ }

    return {
        token,
        user: {
            user_id: user.user_id,
            email: user.email,
            nickname: user.nickname,
            phone: user.phone,
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        },
    };
}

/**
 * GET /auth/google/start
 * Google OAuth 리다이렉트 방식: 브라우저를 Google 로그인 페이지로 보냄
 */
router.get('/google/start', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (!clientId) {
        return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/login?error=google_config');
    }
    const redirectUri = encodeURIComponent(backendUrl + '/auth/google/callback');
    const scope = encodeURIComponent('openid email profile');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    res.redirect(302, url);
});

/**
 * GET /auth/google/callback
 * Google가 code로 리다이렉트한 뒤, code를 id_token으로 교환하고 로그인 처리 후 프론트로 리다이렉트
 */
router.get('/google/callback', async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const loginUrl = frontendUrl + '/login';

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
        return res.redirect(loginUrl + '?error=google_no_code');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const secret = process.env.JWT_SECRET;

    if (!clientId || !clientSecret || !secret) {
        return res.redirect(loginUrl + '?error=google_config');
    }

    const redirectUri = backendUrl + '/auth/google/callback';
    let tokenResp;
    try {
        tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
    } catch (err) {
        console.error('Google token exchange error:', err);
        return res.redirect(loginUrl + '?error=google_exchange');
    }

    if (!tokenResp.ok) {
        const errBody = await tokenResp.text();
        console.error('Google token response:', tokenResp.status, errBody);
        return res.redirect(loginUrl + '?error=google_exchange');
    }

    const tokenData = await tokenResp.json();
    const idToken = tokenData.id_token;
    if (!idToken) {
        return res.redirect(loginUrl + '?error=google_no_id_token');
    }

    let payload;
    try {
        const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (!infoResp.ok) {
            return res.redirect(loginUrl + '?error=google_invalid_token');
        }
        payload = await infoResp.json();
    } catch (err) {
        console.error('Google tokeninfo error:', err);
        return res.redirect(loginUrl + '?error=google_invalid_token');
    }

    const result = googlePayloadToUserAndToken(payload, clientId, secret);
    if (!result) {
        return res.redirect(loginUrl + '?error=google_account');
    }

    res.redirect(302, loginUrl + '#token=' + encodeURIComponent(result.token));
});

/**
 * POST /auth/google
 * 구글 소셜 로그인/회원가입 (id_token 기반, One Tap 등에서 사용)
 */
router.post('/google', async (req, res) => {
    try {
        const { id_token } = req.body || {};

        if (!id_token || typeof id_token !== 'string') {
            return res.status(400).json({ error: 'Google id_token is required.' });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const secret = process.env.JWT_SECRET;
        if (!clientId) {
            return res.status(500).json({ error: 'Server Google client configuration error.' });
        }
        if (!secret) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        let payload;
        try {
            const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
            if (!resp.ok) {
                return res.status(401).json({ error: 'Invalid Google token.' });
            }
            payload = await resp.json();
        } catch (err) {
            console.error('Google token verification error:', err);
            return res.status(500).json({ error: 'Failed to verify Google token.' });
        }

        if (!payload || typeof payload !== 'object' || payload.aud !== clientId) {
            return res.status(401).json({ error: 'Invalid Google token payload.' });
        }

        const result = googlePayloadToUserAndToken(payload, clientId, secret);
        if (!result) {
            return res.status(401).json({ error: 'Google account is not verified.' });
        }
        if (result.user.status === 'withdrawn') {
            return res.status(403).json({ error: '탈퇴한 계정입니다.' });
        }

        res.json({
            message: 'Google login successful.',
            token: result.token,
            expiresIn: '7d',
            user: result.user,
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ error: 'An error occurred while processing Google login.' });
    }
});

/**
 * GET /auth/me
 * JWT 인증 필요 - 현재 로그인 사용자 정보
 */
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

/**
 * PUT /auth/profile
 * 프로필 수정 (닉네임, 전화번호)
 */
router.put('/profile', authMiddleware, (req, res) => {
    try {
        const userId = req.user.user_id;
        const { nickname, phone } = req.body;

        // 닉네임 검증
        const nicknameValidation = validateNickname(nickname);
        if (!nicknameValidation.valid) {
            return res.status(400).json({ error: nicknameValidation.error });
        }

        // 전화번호 검증
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) {
            return res.status(400).json({ error: phoneValidation.error });
        }

        const phoneVal = phone != null && String(phone).trim() !== '' ? String(phone).trim() : null;
        const nicknameVal = nickname != null && String(nickname).trim() !== '' ? String(nickname).trim() : null;

        db.prepare(`
            UPDATE users 
            SET nickname = ?, phone = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `).run(nicknameVal, phoneVal, userId);

        const updatedUser = db.prepare('SELECT user_id, email, nickname, phone, role, status, created_at FROM users WHERE user_id = ?').get(userId);

        res.json({
            message: 'Profile updated successfully.',
            user: updatedUser,
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'An error occurred while updating your profile.' });
    }
});

/**
 * PUT /auth/password
 * 비밀번호 변경
 */
router.put('/password', authMiddleware, (req, res) => {
    try {
        const userId = req.user.user_id;
        const { currentPassword, newPassword, newPasswordConfirm } = req.body;

        if (!currentPassword || typeof currentPassword !== 'string') {
            return res.status(400).json({ error: 'Please enter your current password.' });
        }
        if (!newPassword || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Please enter your new password.' });
        }
        if (!validatePassword(newPassword)) {
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            }
            if (!/[a-zA-Z]/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one letter.' });
            }
            if (!/\d/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one number.' });
            }
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one special character (!@#$%^&* etc.).' });
            }
            return res.status(400).json({ error: 'Password must be at least 8 characters long and include letters, numbers, and special characters.' });
        }
        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({ error: 'New passwords do not match. Please check again.' });
        }

        const user = db.prepare('SELECT password FROM users WHERE user_id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const valid = bcrypt.compareSync(currentPassword, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(hashedPassword, userId);

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'An error occurred while changing your password.' });
    }
});

/**
 * POST /auth/logout
 * 로그아웃 (서버 기록용)
 */
router.post('/logout', authMiddleware, (req, res) => {
    try {
        const userId = req.user.user_id;
        db.prepare('INSERT INTO auth_log (user_id, event_type) VALUES (?, ?)').run(userId, 'logout');
    } catch (err) {
        console.error('Logout log error:', err);
    }
    res.json({ message: 'Logged out' });
});

/**
 * POST /auth/restore-account
 * 탈퇴 계정 복구 (30일 이내, 비밀번호 확인)
 */
router.post('/restore-account', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT user_id, password, status, deleted_at FROM users WHERE email = ?').get(trimmedEmail);

        if (!user || user.status !== 'withdrawn') {
            return res.status(400).json({ error: '복구할 수 있는 계정이 없습니다.' });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.deleted_at) {
            const elapsed = Date.now() - new Date(user.deleted_at + 'Z').getTime();
            if (elapsed > 30 * 86400000) {
                return res.status(400).json({ error: '복구 가능 기간(30일)이 지났습니다.' });
            }
        }

        db.prepare(
            'UPDATE users SET status = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run('approved', user.user_id);

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        const restored = db.prepare('SELECT user_id, email, nickname, phone, role, status FROM users WHERE user_id = ?').get(user.user_id);
        const token = jwt.sign(
            { user_id: restored.user_id, email: restored.email },
            secret,
            { expiresIn: '7d' }
        );

        try {
            db.prepare('INSERT INTO auth_log (user_id, event_type) VALUES (?, ?)').run(restored.user_id, 'restore');
        } catch (_) {}

        res.json({
            message: '계정이 복구되었습니다.',
            token,
            user: {
                user_id: restored.user_id,
                email: restored.email,
                nickname: restored.nickname,
                phone: restored.phone,
                role: restored.role,
                status: restored.status,
            },
        });
    } catch (err) {
        console.error('Restore account error:', err);
        res.status(500).json({ error: '계정 복구 중 오류가 발생했습니다.' });
    }
});

/**
 * DELETE /auth/account
 * 계정 탈퇴 (소프트 삭제: status = withdrawn, deleted_at 기록)
 */
router.delete('/account', authMiddleware, (req, res) => {
    try {
        const userId = req.user.user_id;
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Please enter your password to confirm account deletion.' });
        }

        const user = db.prepare('SELECT password FROM users WHERE user_id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Password is incorrect.' });
        }

        // 소프트 삭제: status = withdrawn, deleted_at 기록 (user 행·평점·찜 등은 DB에 유지)
        db.prepare(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run('withdrawn', userId);

        res.json({ message: 'Account deleted successfully.' });
    } catch (err) {
        console.error('Account deletion error:', err);
        res.status(500).json({ error: 'An error occurred while deleting your account.' });
    }
});

module.exports = router;
