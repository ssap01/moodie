/**
 * 추천 로직
 * 1. 4~5점 준 영화 장르 수집
 * 2. 해당 장르에서 미평가 영화 선택
 * 3. 최신 개봉순 정렬
 * 4. 상위 5개 반환
 */

const db = require('../db');

const MOVIE_FIELDS = 'movie_id, title, title_en, synopsis, release_date, runtime, type_nm, poster_url, backdrop_url, rank, imdb_rating';

/**
 * 영화 객체로 변환
 */
function toMovie(row) {
    if (!row) return null;
    return {
        movie_id: row.movie_id,
        title: row.title,
        title_en: row.title_en,
        synopsis: row.synopsis,
        release_date: row.release_date,
        runtime: row.runtime,
        type_nm: row.type_nm,
        poster_url: row.poster_url,
        backdrop_url: row.backdrop_url,
        rank: row.rank,
    };
}

/**
 * 유저가 4~5점 준 영화의 장르 ID 목록 수집
 */
function getHighRatedGenres(userId) {
    const rows = db.prepare(`
        SELECT DISTINCT mg.genre_id
        FROM rating r
        JOIN movie_genres mg ON r.movie_id = mg.movie_id
        WHERE r.user_id = ? AND r.rating >= 4
    `).all(userId);
    return rows.map((r) => r.genre_id);
}

/**
 * 추천 영화 목록 계산 (장르 기반, 최신 개봉순)
 * 장르가 없으면 미평가 영화 중 최신순
 * @param {number} userId
 * @param {number} [limit=5] - 반환 개수
 */
function getRecommendedMovies(userId, limit = 5) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 5));
    const genreIds = getHighRatedGenres(userId);
    const userRatedIds = db.prepare('SELECT movie_id FROM rating WHERE user_id = ?').all(userId).map((r) => r.movie_id);

    let rows;

    if (genreIds.length > 0) {
        const placeholders = genreIds.map(() => '?').join(',');
        if (userRatedIds.length > 0) {
            const ratedPh = userRatedIds.map(() => '?').join(',');
            rows = db.prepare(`
                SELECT m.movie_id, m.title, m.title_en, m.synopsis, m.release_date, m.runtime, m.type_nm, m.poster_url, m.backdrop_url, m.rank
                FROM movies m
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                WHERE mg.genre_id IN (${placeholders})
                AND m.movie_id NOT IN (${ratedPh})
                GROUP BY m.movie_id
                ORDER BY m.release_date DESC, m.movie_id DESC
                LIMIT ?
            `).all(...genreIds, ...userRatedIds, safeLimit);
        } else {
            rows = db.prepare(`
                SELECT m.movie_id, m.title, m.title_en, m.synopsis, m.release_date, m.runtime, m.type_nm, m.poster_url, m.backdrop_url, m.rank
                FROM movies m
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                WHERE mg.genre_id IN (${placeholders})
                GROUP BY m.movie_id
                ORDER BY m.release_date DESC, m.movie_id DESC
                LIMIT ?
            `).all(...genreIds, safeLimit);
        }
    } else {
        if (userRatedIds.length > 0) {
            const ratedPh = userRatedIds.map(() => '?').join(',');
            rows = db.prepare(`
                SELECT ${MOVIE_FIELDS} FROM movies
                WHERE movie_id NOT IN (${ratedPh})
                ORDER BY release_date DESC, movie_id DESC
                LIMIT ?
            `).all(...userRatedIds, safeLimit);
        } else {
            rows = db.prepare(`
                SELECT ${MOVIE_FIELDS} FROM movies
                ORDER BY release_date DESC, movie_id DESC
                LIMIT ?
            `).all(safeLimit);
        }
    }

    return rows.map(toMovie);
}

/**
 * GPT로 추천 이유 1문장 생성
 */
async function generateRecommendationReason(genreNames, movieTitle) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return '높은 평점 유사 장르 기반 추천';
    }

    try {
        const genreList = genreNames.length > 0 ? genreNames.join(', ') : '다양한';
        const prompt = `이 사용자가 높은 평점을 준 [${genreList}] 영화들을 기반으로, [${movieTitle}]을 좋아할 수 있는 이유를 한 문장으로 작성해주세요.`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        return text || '높은 평점 유사 장르 기반 추천';
    } catch (err) {
        console.warn('[Recommendations] GPT 호출 실패:', err.message);
        return '높은 평점 유사 장르 기반 추천';
    }
}

/**
 * 추천 결과 생성 (영화 목록 + GPT 이유)
 * @param {number} [limit=5] - 추천 개수
 */
async function buildRecommendations(userId, limit = 5) {
    const movies = getRecommendedMovies(userId, limit);
    const genreIds = getHighRatedGenres(userId);
    const genreNames = genreIds.length > 0
        ? db.prepare('SELECT name FROM genres WHERE genre_id IN (' + genreIds.map(() => '?').join(',') + ')').all(...genreIds).map((g) => g.name)
        : [];

    const result = [];

    for (const movie of movies) {
        const reason = await generateRecommendationReason(genreNames, movie.title);
        result.push({ movie, reason });
    }

    return result;
}

module.exports = {
    getRecommendedMovies,
    buildRecommendations,
};
