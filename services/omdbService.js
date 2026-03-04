/**
 * OMDb API 서비스
 * - 검색(s), 영화 상세(i=imdbID)
 * - 포스터·줄거리(Plot) 제공 (백드롭은 무료 API에 없어 포스터로 대체)
 */

const OMDB_BASE = 'https://www.omdbapi.com/';

function getApiKey() {
    const key = process.env.OMDB_API_KEY;
    if (!key) throw new Error('OMDB_API_KEY가 설정되지 않았습니다.');
    return key;
}

/**
 * GET 요청
 */
async function get(params) {
    const q = new URLSearchParams({ apikey: getApiKey(), ...params });
    const url = `${OMDB_BASE}?${q}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OMDb API 오류: ${res.status}`);
    const data = await res.json();
    if (data.Response === 'False') throw new Error(data.Error || 'OMDb 오류');
    return data;
}

/**
 * 영화 검색 (페이지당 최대 10개)
 * @param {string} query - 검색어
 * @param {number} page - 페이지
 * @param {number} [year] - 연도 (예: 2023)
 * @returns {Promise<{ Search: Array<{ imdbID, Title, Year, Poster }> }>}
 */
async function search(query, page = 1, year) {
    const params = { s: query, type: 'movie', page };
    if (typeof year === 'number' && Number.isInteger(year)) {
        params.y = String(year);
    }
    return get(params);
}

/**
 * imdbID로 영화 상세 조회 (Plot, Poster, Runtime, Genre 등)
 * @param {string} imdbID - 예: tt1375666
 */
async function getByImdbId(imdbID) {
    return get({ i: imdbID });
}

module.exports = {
    search,
    getByImdbId,
};
