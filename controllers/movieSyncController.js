/**
 * 영화 데이터 동기화 컨트롤러
 * - 서버 시작 시 OMDb API 호출
 * - DB에 데이터 없을 때만 수집 (포스터, 줄거리 포함)
 */

const db = require('../db');
const { search, getByImdbId } = require('../services/omdbService');

/**
 * 영화 데이터가 DB에 존재하는지 확인
 */
function hasMovies() {
    const row = db.prepare('SELECT 1 FROM movies LIMIT 1').get();
    return !!row;
}

/**
 * imdbID(tt1375666) -> 정수 movie_id (1375666)
 */
function imdbIdToMovieId(imdbID) {
    if (!imdbID || typeof imdbID !== 'string') return null;
    const num = parseInt(imdbID.replace(/^tt/i, ''), 10);
    return Number.isNaN(num) ? null : num;
}

/**
 * OMDb "Released" (24 Jul 2010) -> YYYY-MM-DD
 */
function parseReleased(released, year) {
    if (!released || typeof released !== 'string') {
        return year ? `${year}-01-01` : null;
    }
    const d = new Date(released.trim());
    if (Number.isNaN(d.getTime())) return year ? `${year}-01-01` : null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * OMDb 상세 응답을 movies 테이블 행으로 변환
 */
function toMovieRow(detail, rank = null) {
    const movieId = imdbIdToMovieId(detail.imdbID);
    if (!movieId || !detail.Title) return null;

    const year = detail.Year ? parseInt(String(detail.Year).slice(0, 4), 10) : null;
    const releaseDate = parseReleased(detail.Released, year);
    const runtime = detail.Runtime ? parseInt(String(detail.Runtime).replace(/\D/g, ''), 10) : null;
    const posterUrl = detail.Poster && detail.Poster !== 'N/A' ? detail.Poster.trim() : null;
    const synopsis = detail.Plot && detail.Plot.trim() && detail.Plot !== 'N/A' ? detail.Plot.trim() : null;
    const typeNm = detail.Type && detail.Type !== 'N/A' ? String(detail.Type).trim() : null;
    const imdbRating = detail.imdbRating && detail.imdbRating !== 'N/A'
        ? parseFloat(String(detail.imdbRating).replace(/,/g, ''))
        : null;
    const rated = detail.Rated && detail.Rated !== 'N/A' ? String(detail.Rated).trim() : null;
    const country = detail.Country && detail.Country !== 'N/A' ? String(detail.Country).trim() : null;
    const language = detail.Language && detail.Language !== 'N/A' ? String(detail.Language).trim() : null;
    const director = detail.Director && detail.Director !== 'N/A' ? String(detail.Director).trim() : null;
    const metascoreRaw = detail.Metascore && detail.Metascore !== 'N/A' ? String(detail.Metascore).trim() : null;
    const metascore = metascoreRaw ? parseInt(metascoreRaw, 10) : null;
    const imdbVotesRaw = detail.imdbVotes && detail.imdbVotes !== 'N/A' ? String(detail.imdbVotes).replace(/,/g, '') : null;
    const imdbVotes = imdbVotesRaw ? parseInt(imdbVotesRaw, 10) : null;

    return {
        movie_id: movieId,
        title: detail.Title.trim(),
        title_en: null,
        synopsis,
        release_date: releaseDate,
        runtime: runtime || null,
        type_nm: typeNm,
        poster_url: posterUrl,
        backdrop_url: posterUrl,
        rank,
        imdb_rating: Number.isNaN(imdbRating) ? null : imdbRating,
        rated,
        country,
        language,
        director,
        metascore: Number.isNaN(metascore) ? null : metascore,
        imdb_votes: Number.isNaN(imdbVotes) ? null : imdbVotes,
    };
}

/**
 * 해당 영화의 장르 링크 삭제 후 OMDb Genre 문자열로 다시 저장
 */
function saveGenresFromString(movieId, genreStr) {
    db.prepare('DELETE FROM movie_genres WHERE movie_id = ?').run(movieId);
    if (!genreStr || typeof genreStr !== 'string') return;
    const names = genreStr.split(',').map((s) => s.trim()).filter(Boolean);
    for (const name of names) {
        let genreRow = db.prepare('SELECT genre_id FROM genres WHERE name = ?').get(name);
        if (!genreRow) {
            db.prepare('INSERT INTO genres (name) VALUES (?)').run(name);
            genreRow = db.prepare('SELECT genre_id FROM genres WHERE name = ?').get(name);
        }
        if (genreRow) {
            try {
                db.prepare('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)').run(movieId, genreRow.genre_id);
            } catch (_) {}
        }
    }
}

/**
 * 영화 저장 (INSERT OR REPLACE)
 */
function saveMovie(row) {
    db.prepare(`
        INSERT INTO movies (movie_id, title, title_en, synopsis, release_date, runtime, type_nm, poster_url, backdrop_url, rank, imdb_rating, rated, country, language, director, metascore, imdb_votes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(movie_id) DO UPDATE SET
            title = excluded.title,
            title_en = excluded.title_en,
            synopsis = excluded.synopsis,
            release_date = excluded.release_date,
            runtime = excluded.runtime,
            type_nm = excluded.type_nm,
            poster_url = excluded.poster_url,
            backdrop_url = excluded.backdrop_url,
            rank = excluded.rank,
            imdb_rating = excluded.imdb_rating,
            rated = excluded.rated,
            country = excluded.country,
            language = excluded.language,
            director = excluded.director,
            metascore = excluded.metascore,
            imdb_votes = excluded.imdb_votes,
            updated_at = CURRENT_TIMESTAMP
    `).run(
        row.movie_id,
        row.title,
        row.title_en,
        row.synopsis,
        row.release_date,
        row.runtime,
        row.type_nm,
        row.poster_url,
        row.backdrop_url,
        row.rank,
        row.imdb_rating ?? null,
        row.rated ?? null,
        row.country ?? null,
        row.language ?? null,
        row.director ?? null,
        row.metascore ?? null,
        row.imdb_votes ?? null
    );
}

/**
 * 추천 캐시만 무효화 (동기화 후 추천 재계산용). 유저 평점·찜은 유지.
 */
function invalidateRecommendationCache() {
    db.prepare('DELETE FROM recommendation_cache').run();
    console.log('[MovieSync] 추천 캐시 무효화.');
}

/**
 * 영화 관련 데이터만 삭제 (평점·찜·장르·영화). DB에 영화가 아예 없을 때만 사용.
 * FK 제약 때문에 movies를 참조하는 테이블부터 삭제해야 함.
 * 주의: 유저의 My Ratings·Wishlist가 모두 삭제되므로, 일반 동기화에는 사용하지 말 것.
 */
function clearMoviesForResync() {
    db.prepare('DELETE FROM rating').run();
    db.prepare('DELETE FROM user_movie_wishlist').run();
    db.prepare('DELETE FROM recommendation_cache').run();
    db.prepare('DELETE FROM movie_genres').run();
    db.prepare('DELETE FROM movies').run();
    console.log('[MovieSync] 기존 영화 데이터 삭제 완료.');
}

/**
 * 영화 데이터 동기화 실행
 * - DB에 영화가 있으면 스킵 (단, options.force 또는 FORCE_MOVIE_SYNC=1 이면 삭제 후 재수집)
 * - OMDb 검색으로 영화 목록 수집 후 상세 조회해 포스터·줄거리 저장
 * @param {Object} [options]
 * @param {boolean} [options.force] - true면 기존 데이터 삭제 후 재수집 (Admin 수동/스케줄용)
 */
async function syncMovies(options = {}) {
    const force = options.force || process.env.FORCE_MOVIE_SYNC === '1' || process.env.FORCE_MOVIE_SYNC === 'true';
    if (force) {
        console.log('[MovieSync] 동기화: OMDb에서 영화 추가/갱신합니다. (유저 평점·찜은 유지)');
        invalidateRecommendationCache();
    } else if (hasMovies()) {
        console.log('[MovieSync] 영화 데이터가 이미 존재합니다. OMDb API 호출을 건너뜁니다.');
        return { skipped: true, count: 0 };
    }

    if (!process.env.OMDB_API_KEY) {
        console.warn('[MovieSync] OMDB_API_KEY가 없어 영화 수집을 건너뜁니다.');
        return { skipped: true, error: 'OMDB_API_KEY 없음' };
    }

    console.log('[MovieSync] OMDb API에서 영화 데이터 수집 중...');

    try {
        const searchTerms = ['the', 'love', 'action', 'life'];
        const seen = new Set();
        const items = [];

        for (const term of searchTerms) {
            for (let page = 1; page <= 2; page++) {
                try {
                    const data = await search(term, page);
                    const list = data.Search || [];
                    for (const m of list) {
                        if (m.imdbID && !seen.has(m.imdbID)) {
                            seen.add(m.imdbID);
                            items.push(m.imdbID);
                        }
                    }
                } catch (err) {
                    console.warn(`[MovieSync] 검색 실패 (${term} p${page}):`, err.message);
                }
                await new Promise((r) => setTimeout(r, 300));
            }
        }

        let saved = 0;
        let rank = 0;
        for (const imdbID of items.slice(0, 50)) {
            try {
                const detail = await getByImdbId(imdbID);
                rank++;
                const row = toMovieRow(detail, rank);
                if (!row || !row.title) continue;

                saveGenresFromString(row.movie_id, detail.Genre);
                saveMovie(row);
                saved++;
            } catch (err) {
                console.warn(`[MovieSync] 영화 ${imdbID} 상세 조회 실패:`, err.message);
            }
            await new Promise((r) => setTimeout(r, 200));
        }

        console.log(`[MovieSync] 완료: ${saved}개 영화 저장 (OMDb, 포스터·줄거리 포함)`);
        const now = new Date().toISOString();
        const triggeredBy = options.triggeredBy === 'system' || typeof options.triggeredBy !== 'number'
            ? 'system'
            : String(options.triggeredBy);
        db.prepare(
            "INSERT INTO settings (key, value) VALUES ('last_movie_sync_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(now);
        db.prepare(
            "INSERT INTO settings (key, value) VALUES ('last_sync_triggered_by', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(triggeredBy);
        return { skipped: false, count: saved };
    } catch (err) {
        console.error('[MovieSync] 오류:', err.message);
        return { skipped: false, error: err.message };
    }
}

module.exports = {
    syncMovies,
    hasMovies,
};
