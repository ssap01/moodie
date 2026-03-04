/**
 * DB 내용 확인 스크립트 (회원·영화)
 * 사용: node scripts/check-db.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'moodie.db');
const db = new Database(dbPath);

console.log('=== users (회원 가입 정보) ===');
const users = db.prepare('SELECT user_id, email, nickname, role, created_at FROM users ORDER BY user_id').all();
if (users.length === 0) {
  console.log('  (비어 있음)');
} else {
  users.forEach((u) => console.log(`  ${u.user_id} | ${u.email} | ${u.nickname || '-'} | ${u.role} | ${u.created_at}`));
}

console.log('\n=== movies (영화 개수 및 샘플) ===');
const count = db.prepare('SELECT COUNT(*) as n FROM movies').get();
console.log(`  총 ${count.n}개 영화`);
const movies = db.prepare('SELECT movie_id, title, release_date FROM movies ORDER BY imdb_rating DESC LIMIT 5').all();
movies.forEach((m) => console.log(`  ${m.movie_id} | ${m.title} | ${m.release_date || '-'}`));

db.close();
console.log('\n끝.');
