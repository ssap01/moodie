const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'moodie.db'));

// users
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
)
`).run();

// movies
db.prepare(`
CREATE TABLE IF NOT EXISTS movies (
    movie_id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    synopsis TEXT,
    release_date DATE,
    runtime INT,
    type_nm VARCHAR(50),
    poster_url VARCHAR(512),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
)
`).run();

try {
    const cols = db.prepare("PRAGMA table_info(movies)").all();
    if (cols.some((c) => c.name === 'backdrop_url')) {
        db.prepare('ALTER TABLE movies DROP COLUMN backdrop_url').run();
    }
    if (cols.some((c) => c.name === 'rank')) {
        db.prepare('ALTER TABLE movies DROP COLUMN rank').run();
    }
    const hasImdbRating = cols.some((c) => c.name === 'imdb_rating');
    if (!hasImdbRating) {
        db.prepare('ALTER TABLE movies ADD COLUMN imdb_rating REAL').run();
    }
    const addIfMissing = (name, sql) => { if (!cols.some((c) => c.name === name)) db.prepare(sql).run(); };
    addIfMissing('rated', 'ALTER TABLE movies ADD COLUMN rated VARCHAR(20)');
    addIfMissing('country', 'ALTER TABLE movies ADD COLUMN country VARCHAR(255)');
    addIfMissing('language', 'ALTER TABLE movies ADD COLUMN language VARCHAR(255)');
    addIfMissing('director', 'ALTER TABLE movies ADD COLUMN director VARCHAR(255)');
    addIfMissing('metascore', 'ALTER TABLE movies ADD COLUMN metascore INT');
    addIfMissing('imdb_votes', 'ALTER TABLE movies ADD COLUMN imdb_votes INT');
} catch (_) {}

// users 테이블에 추가 컬럼(약관 동의, 삭제일시, 소셜 로그인용 필드) 없으면 추가
try {
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    const hasTermsAgreed = userCols.some((c) => c.name === 'terms_privacy_agreed_at');
    if (!hasTermsAgreed) {
        db.prepare('ALTER TABLE users ADD COLUMN terms_privacy_agreed_at DATETIME').run();
    }
    const hasDeletedAt = userCols.some((c) => c.name === 'deleted_at');
    if (!hasDeletedAt) {
        db.prepare('ALTER TABLE users ADD COLUMN deleted_at DATETIME').run();
    }
    const hasGoogleId = userCols.some((c) => c.name === 'google_id');
    if (!hasGoogleId) {
        db.prepare('ALTER TABLE users ADD COLUMN google_id TEXT').run();
    }
    const hasLoginProvider = userCols.some((c) => c.name === 'login_provider');
    if (!hasLoginProvider) {
        db.prepare("ALTER TABLE users ADD COLUMN login_provider TEXT NOT NULL DEFAULT 'local'").run();
    }
    if (!userCols.some((c) => c.name === 'password_reset_token')) {
        db.prepare('ALTER TABLE users ADD COLUMN password_reset_token TEXT').run();
    }
    if (!userCols.some((c) => c.name === 'password_reset_expires_at')) {
        db.prepare('ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME').run();
    }
} catch (_) {}

// rating
db.prepare(`
CREATE TABLE IF NOT EXISTS rating (
    rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    UNIQUE(user_id, movie_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(movie_id) REFERENCES movies(movie_id)
)
`).run();

// genres
db.prepare(`
CREATE TABLE IF NOT EXISTS genres (
    genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
)
`).run();

// movie_genres
db.prepare(`
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    PRIMARY KEY(movie_id, genre_id),
    FOREIGN KEY(movie_id) REFERENCES movies(movie_id),
    FOREIGN KEY(genre_id) REFERENCES genres(genre_id)
)
`).run();

// recommendation_cache - 추천 결과 캐싱 (평점 변경 시 무효화)
db.prepare(`
CREATE TABLE IF NOT EXISTS recommendation_cache (
    user_id INTEGER PRIMARY KEY,
    result_json TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
)
`).run();

// user_movie_wishlist - 찜하기(위시리스트)
db.prepare(`
CREATE TABLE IF NOT EXISTS user_movie_wishlist (
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, movie_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(movie_id) REFERENCES movies(movie_id)
)
`).run();
// 기존 user_movie_likes 테이블이 있으면 데이터 이전 후 삭제
try {
    const hasOld = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_movie_likes'").get();
    if (hasOld) {
        db.prepare('INSERT OR IGNORE INTO user_movie_wishlist (user_id, movie_id, created_at) SELECT user_id, movie_id, created_at FROM user_movie_likes').run();
        db.prepare('DROP TABLE user_movie_likes').run();
    }
} catch (_) {}

// settings - 자동 동기화 ON/OFF 등 (key-value)
db.prepare(`
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
)
`).run();
// 자동 동기화 기본값 OFF
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_sync_enabled', '0')`).run();

// search_log - 검색어 로그 (행동 로그용)
db.prepare(`
CREATE TABLE IF NOT EXISTS search_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`).run();

// movie_view_log - 영화 조회 로그 (인기 영화·많이 본 영화용)
db.prepare(`
CREATE TABLE IF NOT EXISTS movie_view_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    user_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(movie_id) REFERENCES movies(movie_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
)
`).run();

// auth_log - 로그인/회원가입/로그아웃 로그
db.prepare(`
CREATE TABLE IF NOT EXISTS auth_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
)
`).run();

// find_email_otp - 로그인 이메일 찾기용 OTP (전화번호 인증)
db.prepare(`
CREATE TABLE IF NOT EXISTS find_email_otp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`).run();

// title_en 컬럼 제거 (이미 없으면 무시)
try {
    const cols = db.prepare("PRAGMA table_info(movies)").all();
    if (cols.some(c => c.name === 'title_en')) {
        db.prepare("ALTER TABLE movies DROP COLUMN title_en").run();
    }
} catch (_) {}

console.log('SQLite DB 및 테이블 생성 완료!');

module.exports = db;