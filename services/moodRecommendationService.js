/**
 * 감정 기반 영화 추천 서비스
 * 키워드 매칭 + 규칙 기반 (장르/분위기 매핑)
 */

const db = require('../db');

/**
 * 감정/상황 키워드 → 장르 매핑
 * OMDb 장르명 기준 (영어)
 */
const MOOD_TO_GENRES = {
    // 감정 키워드
    '우울': ['Drama', 'Romance', 'Music'],
    '우울해': ['Drama', 'Romance', 'Music'],
    '우울한': ['Drama', 'Romance', 'Music'],
    '슬퍼': ['Drama', 'Romance'],
    '슬픈': ['Drama', 'Romance'],
    '기쁨': ['Comedy', 'Musical', 'Romance'],
    '행복': ['Comedy', 'Musical', 'Romance'],
    '신나': ['Comedy', 'Action', 'Adventure'],
    '신남': ['Comedy', 'Action', 'Adventure'],
    '스트레스': ['Action', 'Thriller', 'Comedy'],
    '짜증': ['Action', 'Thriller', 'Comedy'],
    '피곤': ['Comedy', 'Drama', 'Romance'],
    '지루': ['Action', 'Thriller', 'Adventure'],
    '심심': ['Comedy', 'Action', 'Adventure'],
    '설렘': ['Romance', 'Comedy', 'Drama'],
    '불안': ['Drama', 'Thriller', 'Mystery'],
    '힐링': ['Drama', 'Comedy', 'Romance'],
    '기분전환': ['Comedy', 'Action', 'Adventure'],
    '웃고싶': ['Comedy', 'Musical'],
    '울고싶': ['Drama', 'Romance'],
    '무서운': ['Horror', 'Thriller', 'Mystery'],
    '공포': ['Horror', 'Thriller', 'Mystery'],

    // 상황 키워드
    '친구': ['Comedy', 'Action', 'Adventure', 'Thriller'],
    '친구들': ['Comedy', 'Action', 'Adventure', 'Thriller'],
    '함께': ['Comedy', 'Action', 'Adventure'],
    '모임': ['Comedy', 'Action'],
    '혼자': ['Drama', 'Thriller', 'Horror', 'Mystery'],
    '혼밥': ['Drama', 'Thriller'],
    '데이트': ['Romance', 'Comedy', 'Drama'],
    '연인': ['Romance', 'Comedy', 'Drama'],
    '가족': ['Family', 'Comedy', 'Drama', 'Animation'],
    '여행': ['Adventure', 'Comedy', 'Drama'],
    '휴가': ['Comedy', 'Adventure', 'Family'],
    '운동': ['Action', 'Adventure', 'Sports'],

    // 시간 키워드
    '밤': ['Thriller', 'Horror', 'Mystery', 'Crime'],
    '야간': ['Thriller', 'Horror', 'Mystery'],
    '아침': ['Comedy', 'Drama', 'Family'],
    '오전': ['Comedy', 'Drama'],
    '주말': ['Action', 'Comedy', 'Adventure', 'Fantasy'],
    '휴일': ['Comedy', 'Adventure', 'Family'],
};

/**
 * 텍스트에서 감정/상황 키워드 추출
 */
function extractMoodKeywords(text) {
    const t = text.toLowerCase();
    const keywords = [];
    
    for (const [keyword, genres] of Object.entries(MOOD_TO_GENRES)) {
        if (t.includes(keyword.toLowerCase())) {
            keywords.push({ keyword, genres });
        }
    }
    
    return keywords;
}

/**
 * 감정 기반 영화 추천
 * @param {string} moodText - 사용자 입력 텍스트
 * @param {number} limit - 추천 영화 개수 (기본 5개)
 * @param {number|null} userId - 사용자 ID (선택적, 로그인한 경우 본 영화 제외)
 */
function getMoodBasedMovies(moodText, limit = 5, userId = null) {
    if (!moodText || typeof moodText !== 'string') {
        // 키워드 없으면 인기 영화 반환
        return getPopularMovies(limit, userId);
    }
    
    const moodKeywords = extractMoodKeywords(moodText);
    
    if (moodKeywords.length === 0) {
        // 매칭되는 키워드 없으면 인기 영화 반환
        return getPopularMovies(limit, userId);
    }
    
    // 모든 키워드의 장르를 합침
    const allGenres = new Set();
    moodKeywords.forEach(({ genres }) => {
        genres.forEach((g) => allGenres.add(g));
    });
    
    const genreList = Array.from(allGenres);
    
    // 사용자가 본 영화 목록 (로그인한 경우)
    const userRatedIds = userId
        ? db.prepare('SELECT movie_id FROM rating WHERE user_id = ?').all(userId).map((r) => r.movie_id)
        : [];
    
    // 장르 기반 영화 조회
    let rows;
    
    if (genreList.length > 0) {
        // 장르명으로 genre_id 찾기
        const placeholders = genreList.map(() => '?').join(',');
        const genreRows = db.prepare(`
            SELECT genre_id FROM genres WHERE name IN (${placeholders})
        `).all(...genreList);
        
        if (genreRows.length > 0) {
            const genreIds = genreRows.map((r) => r.genre_id);
            const genreIdPh = genreIds.map(() => '?').join(',');
            
            if (userRatedIds.length > 0) {
                const ratedPh = userRatedIds.map(() => '?').join(',');
                rows = db.prepare(`
                    SELECT DISTINCT m.movie_id, m.title, m.synopsis, m.release_date, 
                           m.runtime, m.type_nm, m.poster_url, m.imdb_rating
                    FROM movies m
                    JOIN movie_genres mg ON m.movie_id = mg.movie_id
                    WHERE mg.genre_id IN (${genreIdPh})
                    AND m.movie_id NOT IN (${ratedPh})
                    GROUP BY m.movie_id
                    ORDER BY m.imdb_rating DESC, m.release_date DESC
                    LIMIT ?
                `).all(...genreIds, ...userRatedIds, limit);
            } else {
                rows = db.prepare(`
                    SELECT DISTINCT m.movie_id, m.title, m.synopsis, m.release_date, 
                           m.runtime, m.type_nm, m.poster_url, m.imdb_rating
                    FROM movies m
                    JOIN movie_genres mg ON m.movie_id = mg.movie_id
                    WHERE mg.genre_id IN (${genreIdPh})
                    GROUP BY m.movie_id
                    ORDER BY m.imdb_rating DESC, m.release_date DESC
                    LIMIT ?
                `).all(...genreIds, limit);
            }
        } else {
            // 장르 ID를 찾지 못한 경우 인기 영화 반환
            return getPopularMovies(limit, userId);
        }
    } else {
        return getPopularMovies(limit, userId);
    }
    
    return rows.map((row) => ({
        movie_id: row.movie_id,
        title: row.title,
        synopsis: row.synopsis,
        release_date: row.release_date,
        runtime: row.runtime,
        type_nm: row.type_nm,
        poster_url: row.poster_url,
        imdb_rating: row.imdb_rating,
    }));
}

/**
 * 인기 영화 조회 (키워드 매칭 실패 시 fallback)
 */
function getPopularMovies(limit, userId = null) {
    const userRatedIds = userId
        ? db.prepare('SELECT movie_id FROM rating WHERE user_id = ?').all(userId).map((r) => r.movie_id)
        : [];
    
    let rows;
    
    if (userRatedIds.length > 0) {
        const ratedPh = userRatedIds.map(() => '?').join(',');
        rows = db.prepare(`
            SELECT movie_id, title, synopsis, release_date, runtime, type_nm, 
                   poster_url, imdb_rating
            FROM movies
            WHERE movie_id NOT IN (${ratedPh})
            ORDER BY imdb_rating DESC, release_date DESC
            LIMIT ?
        `).all(...userRatedIds, limit);
    } else {
        rows = db.prepare(`
            SELECT movie_id, title, synopsis, release_date, runtime, type_nm, 
                   poster_url, imdb_rating
            FROM movies
            ORDER BY imdb_rating DESC, release_date DESC
            LIMIT ?
        `).all(limit);
    }
    
    return rows.map((row) => ({
        movie_id: row.movie_id,
        title: row.title,
        synopsis: row.synopsis,
        release_date: row.release_date,
        runtime: row.runtime,
        type_nm: row.type_nm,
        poster_url: row.poster_url,
        imdb_rating: row.imdb_rating,
    }));
}

/**
 * 추천 이유 생성 (감정 기반)
 */
function generateMoodReason(moodText, movieCount) {
    const moodKeywords = extractMoodKeywords(moodText);
    
    if (moodKeywords.length === 0) {
        return `인기 영화 ${movieCount}편을 추천해드려요.`;
    }
    
    const keywords = moodKeywords.map(({ keyword }) => keyword).slice(0, 2);
    return `${keywords.join(', ')}한 기분에 맞는 영화 ${movieCount}편을 추천해드려요.`;
}

module.exports = {
    getMoodBasedMovies,
    extractMoodKeywords,
    generateMoodReason,
};
