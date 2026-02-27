/**
 * 비밀번호 재설정 링크 이메일 발송.
 * SMTP 미설정 시 링크를 콘솔에만 출력 (nodemailer 불필요).
 * SMTP 설정 시에만 nodemailer를 사용합니다.
 * @param {string} to - 수신 이메일
 * @param {string} resetLink - 재설정 URL
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, resetLink) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('[Email] SMTP 미설정 - 비밀번호 재설정 링크:', resetLink);
        return;
    }
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === '1',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const subject = '[Moodie] 비밀번호 재설정';
        const html = `
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 링크를 클릭하여 새 비밀번호를 설정해 주세요. (1시간 내 유효)</p>
        <p><a href="${resetLink}">비밀번호 재설정하기</a></p>
        <p>요청하지 않으셨다면 이 메일을 무시해 주세요.</p>
    `;
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        });
    } catch (err) {
        console.error('[Email] 발송 실패 (링크는 아래 참고):', err.message);
        console.log('[Email] 재설정 링크:', resetLink);
    }
}

/**
 * 로그인 이메일 찾기: 해당 주소로 "로그인에 사용하는 이메일은 xxx입니다" 안내 메일 발송.
 * SMTP 미설정 시 콘솔에만 출력.
 */
async function sendFindEmailReminder(to, loginEmail) {
    const subject = '[Moodie] 로그인 이메일 안내';
    const html = `
        <p>로그인에 사용하는 이메일은 <strong>${loginEmail}</strong> 입니다.</p>
        <p>요청하지 않으셨다면 이 메일을 무시해 주세요.</p>
    `;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('[Email] SMTP 미설정 - 로그인 이메일 안내:', loginEmail, '(수신:', to, ')');
        return;
    }
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === '1',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        });
    } catch (err) {
        console.error('[Email] 로그인 이메일 안내 발송 실패:', err.message);
        console.log('[Email] 로그인 이메일:', loginEmail);
    }
}

module.exports = { sendPasswordResetEmail, sendFindEmailReminder };
