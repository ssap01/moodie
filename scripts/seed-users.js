/**
 * 테스트용 임의 회원 20명 삽입
 * 실행: node scripts/seed-users.js
 * 공통 비밀번호: Test1234!
 */

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '..', 'moodie.db'));

const PASSWORD = 'Test1234!';
const hashedPassword = bcrypt.hashSync(PASSWORD, 10);

const insert = db.prepare(`
  INSERT INTO users (email, password, nickname, phone, role, status)
  VALUES (?, ?, ?, ?, 'USER', 'approved')
`);

const baseEmail = 'testuser';
const existing = db.prepare("SELECT email FROM users WHERE email LIKE ?").all(baseEmail + '%@test.com');
const existingSet = new Set(existing.map((r) => r.email));

let added = 0;
for (let i = 1; i <= 20; i++) {
  const email = `${baseEmail}${i}@test.com`;
  if (existingSet.has(email)) {
    console.log(`건너뜀 (이미 존재): ${email}`);
    continue;
  }
  const nickname = `테스트${i}`;
  try {
    insert.run(email, hashedPassword, nickname, null);
    console.log(`추가: ${email} (닉네임: ${nickname})`);
    added++;
  } catch (err) {
    console.error(`${email} 추가 실패:`, err.message);
  }
}

console.log(`\n완료: ${added}명 추가. 공통 비밀번호: ${PASSWORD}`);
