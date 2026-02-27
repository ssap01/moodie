/**
 * OMDb API 키 테스트
 * 사용: node scripts/test-omdb-key.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const key = process.env.OMDB_API_KEY;
if (!key) {
  console.log('❌ .env에 OMDB_API_KEY가 없습니다.');
  process.exit(1);
}

console.log('OMDB_API_KEY 길이:', key.length);
console.log('OMDb 검색 테스트 중...');

(async () => {
  try {
    const url = `https://www.omdbapi.com/?apikey=${key}&s=inception&type=movie&page=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.log('❌ HTTP', res.status, res.statusText);
      process.exit(1);
    }
    if (data.Response === 'False') {
      console.log('❌ 실패:', data.Error || '알 수 없는 오류');
      process.exit(1);
    }
    console.log('✅ 성공! 검색 결과 수:', data.Search?.length || 0);
    if (data.Search?.[0]) {
      console.log('   첫 영화:', data.Search[0].Title, data.Search[0].Year, data.Search[0].Poster ? '(포스터 있음)' : '(포스터 없음)');
    }
  } catch (err) {
    console.log('❌ 요청 실패:', err.message);
    process.exit(1);
  }
})();
