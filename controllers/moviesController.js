/**
 * 영화 API 컨트롤러
 */

const db = require('../db');

const MOVIE_LIST_FIELDS = 'movie_id, title, synopsis, release_date, runtime, type_nm, poster_url, imdb_rating, rated, country, language, director, metascore, imdb_votes';

/**
 * WHERE 절과 바인드 파라미터 생성 (필터: rated, country, language, director, genre)
 */
function buildFilterWhereAndParams(query) {
    const conditions = [];
    const params = [];
    if (query.rated && String(query.rated).trim()) {
        conditions.push('rated = ?');
        params.push(String(query.rated).trim());
    }
    if (query.country && String(query.country).trim()) {
        conditions.push("(country LIKE '%' || ? || '%')");
        params.push(String(query.country).trim());
    }
    if (query.language && String(query.language).trim()) {
        conditions.push("(language LIKE '%' || ? || '%')");
        params.push(String(query.language).trim());
    }
    if (query.director && String(query.director).trim()) {
        conditions.push("(director LIKE '%' || ? || '%')");
        params.push(String(query.director).trim());
    }
    if (query.genre && String(query.genre).trim()) {
        conditions.push(`movie_id IN (SELECT mg.movie_id FROM movie_genres mg JOIN genres g ON g.genre_id = mg.genre_id WHERE g.name = ?)`);
        params.push(String(query.genre).trim());
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
}

/**
 * GET /movies?page=1&limit=20&sort=...&rated=&country=&language=&director=&genre=
 * 필터: rated(등급), country(국가), language(언어), director(감독), genre(장르)
 */
function getMovies(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const offset = (page - 1) * limit;
        const sortParam = req.query.sort;
        const sort = ['release_date', 'metascore', 'imdb_votes'].includes(sortParam) ? sortParam : 'rating';

        const { whereClause, params: filterParams } = buildFilterWhereAndParams(req.query);

        const countSql = `SELECT COUNT(*) as count FROM movies ${whereClause}`;
        const total = db.prepare(countSql).get(...filterParams).count;

        let orderBy;
        if (sort === 'release_date') {
            orderBy = ' (CASE WHEN release_date IS NULL THEN 1 ELSE 0 END), release_date DESC, movie_id DESC';
        } else if (sort === 'metascore') {
            orderBy = ' (CASE WHEN metascore IS NULL THEN 1 ELSE 0 END), metascore DESC, movie_id DESC';
        } else if (sort === 'imdb_votes') {
            orderBy = ' (CASE WHEN imdb_votes IS NULL THEN 1 ELSE 0 END), imdb_votes DESC, movie_id DESC';
        } else {
            orderBy = ' (CASE WHEN imdb_rating IS NULL THEN 1 ELSE 0 END), imdb_rating DESC, release_date DESC, movie_id DESC';
        }

        const listParams = [...filterParams, limit, offset];
        const movies = db.prepare(`
            SELECT ${MOVIE_LIST_FIELDS}
            FROM movies
            ${whereClause}
            ORDER BY${orderBy}
            LIMIT ? OFFSET ?
        `).all(...listParams);

        res.json({
            movies,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('getMovies error:', err);
        res.status(500).json({ error: 'An error occurred while fetching the movie list.' });
    }
}

/**
 * GET /movies/filter-options
 * 필터 드롭다운용 옵션: rated, country, language, director, genre (각각 유일값 배열)
 */
function getFilterOptions(req, res) {
    try {
        const ratedRows = db.prepare("SELECT DISTINCT rated FROM movies WHERE rated IS NOT NULL AND rated != '' ORDER BY rated").all();
        const rated = ratedRows.map((r) => r.rated);

        const countryRows = db.prepare("SELECT country FROM movies WHERE country IS NOT NULL AND country != ''").all();
        const countrySet = new Set();
        countryRows.forEach((r) => String(r.country).split(',').map((s) => s.trim()).filter(Boolean).forEach((c) => countrySet.add(c)));
        const country = Array.from(countrySet).sort();

        const languageRows = db.prepare("SELECT language FROM movies WHERE language IS NOT NULL AND language != ''").all();
        const languageSet = new Set();
        languageRows.forEach((r) => String(r.language).split(',').map((s) => s.trim()).filter(Boolean).forEach((c) => languageSet.add(c)));
        const language = Array.from(languageSet).sort();

        const directorRows = db.prepare("SELECT director FROM movies WHERE director IS NOT NULL AND director != ''").all();
        const directorSet = new Set();
        directorRows.forEach((r) => String(r.director).split(',').map((s) => s.trim()).filter(Boolean).forEach((c) => directorSet.add(c)));
        const director = Array.from(directorSet).sort();

        const genreRows = db.prepare('SELECT name FROM genres ORDER BY name').all();
        const genre = genreRows.map((r) => r.name);

        res.json({ rated, country, language, director, genre });
    } catch (err) {
        console.error('getFilterOptions error:', err);
        res.status(500).json({ error: 'An error occurred while fetching filter options.' });
    }
}

/**
 * GET /movies/new?limit=10
 * 개봉일 최신순(신작) 영화만 반환 (New Arrivals 전용)
 */
function getNewArrivals(req, res) {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

        const movies = db.prepare(`
            SELECT ${MOVIE_LIST_FIELDS}
            FROM movies
            WHERE release_date IS NOT NULL AND release_date != ''
            ORDER BY release_date DESC, movie_id DESC
            LIMIT ?
        `).all(limit);

        res.json({ movies });
    } catch (err) {
        console.error('getNewArrivals error:', err);
        res.status(500).json({ error: 'An error occurred while fetching new arrivals.' });
    }
}

/**
 * GET /movies/search?q=검색어&limit=20
 * 제목(title), 감독(director) 기준 LIKE 검색 (DB 영화만)
 */
function getSearch(req, res) {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        if (!q) {
            return res.json({ movies: [], query: q });
        }

        const pattern = `%${q}%`;
        const movies = db.prepare(`
            SELECT ${MOVIE_LIST_FIELDS}
            FROM movies
            WHERE title LIKE ? OR (director IS NOT NULL AND director LIKE ?)
            ORDER BY (CASE WHEN imdb_rating IS NULL THEN 1 ELSE 0 END), imdb_rating DESC, release_date DESC, movie_id DESC
            LIMIT ?
        `).all(pattern, pattern, limit);

        try {
            const recent = db.prepare(
                "SELECT 1 FROM search_log WHERE query = ? AND datetime(created_at) > datetime('now', '-2 seconds')"
            ).get(q);
            if (!recent) {
                db.prepare('INSERT INTO search_log (query) VALUES (?)').run(q);
            }
        } catch (_) {}

        res.json({ movies, query: q });
    } catch (err) {
        console.error('getSearch error:', err);
        res.status(500).json({ error: 'An error occurred while searching movies.' });
    }
}

/**
 * GET /movies/:id
 * 영화 상세 정보 반환.
 * :id가 숫자가 아니면 검색어로 간주하고 검색 결과 반환 (GET /movies/life → life 검색)
 */
function getMovieById(req, res) {
    try {
        const movieId = parseInt(req.params.id, 10);
        if (isNaN(movieId)) {
            const q = String(req.params.id || '').trim();
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
            if (!q) {
                return res.status(400).json({ error: 'Invalid movie_id.' });
            }
            const pattern = `%${q}%`;
            const movies = db.prepare(`
                SELECT ${MOVIE_LIST_FIELDS}
                FROM movies
                WHERE title LIKE ? OR (director IS NOT NULL AND director LIKE ?)
                ORDER BY (CASE WHEN imdb_rating IS NULL THEN 1 ELSE 0 END), imdb_rating DESC, release_date DESC, movie_id DESC
                LIMIT ?
            `).all(pattern, pattern, limit);
            return res.json({ movies, query: q });
        }

        const movie = db.prepare(`
            SELECT movie_id, title, synopsis, release_date, runtime, type_nm, poster_url, imdb_rating, rated, country, language, director, metascore, imdb_votes, created_at
            FROM movies WHERE movie_id = ?
        `).get(movieId);

        if (!movie) {
            return res.status(404).json({ error: 'Movie not found.' });
        }

        // 영화 조회 로그 (행동 로그·인기 영화용). 같은 사용자·같은 영화는 1분 내 중복 저장 방지
        try {
            const userId = req.user?.user_id ?? null;
            const recent = userId != null
                ? db.prepare(`
                    SELECT 1 FROM movie_view_log
                    WHERE movie_id = ? AND user_id = ? AND created_at > datetime('now', '-1 minute')
                    LIMIT 1
                  `).get(movieId, userId)
                : null;
            if (!recent) {
                db.prepare('INSERT INTO movie_view_log (movie_id, user_id) VALUES (?, ?)').run(movieId, userId);
            }
        } catch (_) { /* 로그 실패해도 상세 응답은 그대로 */ }

        // 장르 정보 포함
        const genres = db.prepare(`
            SELECT g.genre_id, g.name
            FROM genres g
            JOIN movie_genres mg ON g.genre_id = mg.genre_id
            WHERE mg.movie_id = ?
        `).all(movieId);

        res.json({ ...movie, genres });
    } catch (err) {
        console.error('getMovieById error:', err);
        res.status(500).json({ error: 'An error occurred while fetching movie details.' });
    }
}

module.exports = {
    getMovies,
    getNewArrivals,
    getMovieById,
    getFilterOptions,
    getSearch,
};
