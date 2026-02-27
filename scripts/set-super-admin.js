/**
 * 한 계정을 SUPER_ADMIN으로 설정하는 스크립트
 * 사용법:
 *   node scripts/set-super-admin.js super-admin@moodie.com
 *   또는 환경변수: SUPER_ADMIN_EMAIL=super-admin@moodie.com node scripts/set-super-admin.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'moodie.db');
const email = process.env.SUPER_ADMIN_EMAIL || process.argv[2];

if (!email || typeof email !== 'string' || email.trim() === '') {
    console.error('사용법: node scripts/set-super-admin.js <이메일>');
    console.error('   또는: SUPER_ADMIN_EMAIL=super-admin@moodie.com node scripts/set-super-admin.js');
    process.exit(1);
}

const trimmedEmail = email.trim().toLowerCase();

try {
    const db = new Database(dbPath);
    const user = db.prepare('SELECT user_id, email, role FROM users WHERE email = ?').get(trimmedEmail);

    if (!user) {
        console.error(`해당 이메일로 등록된 사용자가 없습니다: ${trimmedEmail}`);
        console.error('먼저 회원가입으로 계정을 만든 뒤 다시 실행해주세요.');
        process.exit(1);
    }

    if (user.role === 'SUPER_ADMIN') {
        console.log(`이미 SUPER_ADMIN입니다: ${user.email}`);
        process.exit(0);
    }

    db.prepare("UPDATE users SET role = 'SUPER_ADMIN', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(user.user_id);
    console.log(`SUPER_ADMIN으로 설정되었습니다: ${user.email} (user_id: ${user.user_id})`);
    db.close();
} catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
}
