import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import TermsModal from '../components/TermsModal';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_config: 'Google 로그인 설정이 완료되지 않았습니다.',
  google_no_code: 'Google 로그인이 취소되었거나 만료되었습니다.',
  google_exchange: 'Google 로그인 처리 중 오류가 발생했습니다.',
  google_no_id_token: 'Google에서 인증 정보를 받지 못했습니다.',
  google_invalid_token: 'Google 인증이 유효하지 않습니다.',
  google_account: '해당 Google 계정으로 로그인할 수 없습니다.',
};

interface LoginProps {
  onLogin: (token: string, user: any) => void;
  initialSignUp?: boolean;
  initialErrorFromUrl?: string | null;
  onClearUrlError?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, initialSignUp, initialErrorFromUrl, onClearUrlError }) => {
  const [isSignUp, setIsSignUp] = useState(initialSignUp ?? false);
  useEffect(() => {
    if (initialSignUp !== undefined) {
      setIsSignUp(initialSignUp);
      setShowForgotPassword(false);
      setShowFindEmail(false);
    }
  }, [initialSignUp]);

  useEffect(() => {
    if (initialErrorFromUrl) {
      setError(GOOGLE_ERROR_MESSAGES[initialErrorFromUrl] || 'Google 로그인 중 오류가 발생했습니다.');
      onClearUrlError?.();
    }
  }, [initialErrorFromUrl, onClearUrlError]);
  
  // 로그인/회원가입 전환 시 비밀번호 확인 필드 초기화
  useEffect(() => {
    if (!isSignUp) {
      setPasswordConfirm('');
    }
  }, [isSignUp]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreeTermsAndPrivacy, setAgreeTermsAndPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<'terms' | 'privacy' | null>(null);

  // 탈퇴 계정 복구
  const [withdrawnPrompt, setWithdrawnPrompt] = useState<{ daysLeft: number } | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 비밀번호 찾기
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // 아이디(로그인 이메일) 찾기
  const [showFindEmail, setShowFindEmail] = useState(false);
  const [findByPhone, setFindByPhone] = useState('');
  const [findOtpSent, setFindOtpSent] = useState(false);
  const [findDevOtp, setFindDevOtp] = useState('');
  const [findOtpInput, setFindOtpInput] = useState('');
  const [findEmailResult, setFindEmailResult] = useState('');
  const [findByPhoneError, setFindByPhoneError] = useState('');
  const [findVerifyError, setFindVerifyError] = useState('');

  // 비밀번호 재설정 (?reset=토큰)
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetTokenValid, setResetTokenValid] = useState<boolean | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      setResetToken(token);
      authAPI.validateResetToken(token).then(() => setResetTokenValid(true)).catch(() => setResetTokenValid(false));
    }
  }, []);

  // 비밀번호 요구사항 체크
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  // 전화번호 형식 검증 (선택 필드)
  const validatePhoneFormat = (phone: string): string | null => {
    if (!phone || phone.trim() === '') return null; // 선택 필드
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(phone)) {
      return 'Invalid phone number format. Only numbers, hyphens, and spaces are allowed.';
    }
    if (cleanedPhone.length < 10) {
      return 'Phone number must be at least 10 digits.';
    }
    if (phone.length > 20) {
      return 'Phone number must be 20 characters or less.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 회원가입 시 검증
    if (isSignUp) {
      // 약관 동의 검증
      if (!agreeTermsAndPrivacy) {
        setError('Please agree to the Terms of Service and Privacy Policy.');
        return;
      }
      
      // 비밀번호 요구사항 검증
      if (!isPasswordValid) {
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
        } else if (!/[a-zA-Z]/.test(password)) {
          setError('Password must include at least one letter.');
        } else if (!/\d/.test(password)) {
          setError('Password must include at least one number.');
        } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          setError('Password must include at least one special character (!@#$%^&* etc.).');
        } else {
          setError('Password must be at least 8 characters long and include letters, numbers, and special characters.');
        }
        return;
      }
      
      // 비밀번호 확인 검증
      if (password !== passwordConfirm) {
        setError('Passwords do not match. Please check again.');
        return;
      }
      
      // 닉네임 길이 검증
      if (nickname && nickname.length > 50) {
        setError('Nickname must be 50 characters or less.');
        return;
      }
      
      // 전화번호 형식 검증
      const phoneError = validatePhoneFormat(phone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }
    
    try {
      if (isSignUp) {
        const data = await authAPI.signup({ email, password, passwordConfirm, nickname, phone });
        localStorage.setItem('token', data.token);
        const userData = await authAPI.me();
        onLogin(data.token, userData);
      } else {
        const data = await authAPI.login({ email, password });
        localStorage.setItem('token', data.token);
        onLogin(data.token, data.user ?? (await authAPI.me()));
      }
    } catch (err: any) {
      if (err.data?.withdrawn) {
        setWithdrawnPrompt({ daysLeft: err.data.daysLeft ?? 0 });
        setError('');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    }
  };

  const handleRestoreAccount = async () => {
    setRestoreLoading(true);
    setError('');
    try {
      const data = await authAPI.restoreAccount({ email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || '계정 복구에 실패했습니다.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    window.location.href = '/api/auth/google/start';
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const trim = forgotEmail.trim().toLowerCase();
    if (!trim) {
      setForgotError('이메일을 입력해 주세요.');
      return;
    }
    try {
      await authAPI.forgotPassword(trim);
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message || '요청 처리에 실패했습니다.');
    }
  };

  const handleFindEmailSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindByPhoneError('');
    const phoneOnly = (findByPhone || '').replace(/\D/g, '').trim();
    if (phoneOnly.length < 10) {
      setFindByPhoneError('휴대폰 번호를 입력해 주세요.');
      return;
    }
    try {
      const res = await authAPI.findEmailSendOtp({
        phone: phoneOnly,
      });
      setFindOtpSent(true);
      if (res.devOtp) {
        setFindDevOtp(res.devOtp);
        setFindOtpInput(res.devOtp);
      }
    } catch (err: any) {
      setFindByPhoneError(err.message || '인증번호 발송에 실패했습니다.');
    }
  };

  const handleFindEmailVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindVerifyError('');
    const phoneOnly = (findByPhone || '').replace(/\D/g, '').trim();
    if (!findOtpInput.trim()) {
      setFindVerifyError('인증번호를 입력해 주세요.');
      return;
    }
    try {
      const res = await authAPI.findEmailVerifyOtp({ phone: phoneOnly, otp: findOtpInput.trim() });
      setFindEmailResult(res.emailMasked || '');
    } catch (err: any) {
      setFindVerifyError(err.message || '인증 확인에 실패했습니다.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetToken) return;
    if (resetNewPassword.length < 8 || !/[a-zA-Z]/.test(resetNewPassword) || !/\d/.test(resetNewPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(resetNewPassword)) {
      setResetError('비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.');
      return;
    }
    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      await authAPI.resetPassword({
        token: resetToken,
        newPassword: resetNewPassword,
        newPasswordConfirm: resetNewPasswordConfirm,
      });
      setResetSuccess(true);
      window.history.replaceState('', '', '/login');
    } catch (err: any) {
      setResetError(err.message || '처리에 실패했습니다.');
    }
  };

  if (resetToken !== null && resetTokenValid !== null) {
    if (!resetTokenValid) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <h2 className="serif text-2xl mb-4 text-[#2D2A26]">유효하지 않은 링크</h2>
            <p className="text-sm text-red-600 mb-6">링크가 만료되었거나 잘못되었습니다. 비밀번호 찾기를 다시 시도해 주세요.</p>
            <button type="button" onClick={() => { setResetToken(null); setResetTokenValid(null); window.history.replaceState('', '', '/login'); }} className="text-[10px] tracking-[0.2em] uppercase underline">
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      );
    }
    if (resetSuccess) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <h2 className="serif text-2xl mb-4 text-[#2D2A26]">비밀번호가 변경되었습니다</h2>
            <p className="text-sm text-[#2D2A26]/80 mb-6">새 비밀번호로 로그인해 주세요.</p>
            <button type="button" onClick={() => { setResetSuccess(false); setResetToken(null); setResetTokenValid(null); }} className="text-[10px] tracking-[0.2em] uppercase underline">
              로그인하기
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fadeIn">
        <div className="w-full max-w-md">
          <h2 className="serif text-3xl mb-2 text-[#2D2A26] text-center">새 비밀번호 설정</h2>
          <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 text-center mb-8">Enter the world of editorial cinema.</p>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">New Password (8+ chars, letters, numbers, symbols)</label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-black/10 py-3 pr-8 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60" aria-label="Toggle password visibility">
                  {showResetPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Confirm Password</label>
              <input
                type="password"
                required
                value={resetNewPasswordConfirm}
                onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
                className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                placeholder="••••••••"
              />
            </div>
            {resetError && <p className="text-sm text-red-600">{resetError}</p>}
            <button type="submit" className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors">
              비밀번호 변경
            </button>
          </form>
          <button type="button" onClick={() => { setResetToken(null); setResetTokenValid(null); window.history.replaceState('', '', '/login'); }} className="w-full mt-6 text-[9px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100">
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fadeIn">
        <div className="w-full max-w-md">
          <h2 className="serif text-3xl mb-2 text-[#2D2A26] text-center">비밀번호 찾기</h2>
          <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 text-center mb-8">가입 시 사용한 이메일을 입력하세요.</p>
          {forgotSent ? (
            <>
              <p className="text-sm text-[#2D2A26]/80 text-center mb-6">해당 이메일로 계정이 있으면 재설정 링크를 보냈습니다. 이메일을 확인해 주세요.</p>
              <button type="button" onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); setIsSignUp(false); }} className="w-full text-[10px] tracking-[0.2em] uppercase underline">
                로그인으로 돌아가기
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="curator@example.com"
                />
              </div>
              {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
              <button type="submit" className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors">
                재설정 링크 받기
              </button>
              <button type="button" onClick={() => { setShowForgotPassword(false); setForgotError(''); setIsSignUp(false); }} className="w-full text-[9px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100">
                로그인으로 돌아가기
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (withdrawnPrompt) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fadeIn">
        <div className="w-full max-w-md text-center">
          <h2 className="serif text-3xl mb-4 text-[#2D2A26]">탈퇴된 계정</h2>
          <p className="text-sm text-[#2D2A26]/80 mb-2">
            이 계정은 탈퇴 처리된 상태입니다.
          </p>
          <p className="text-sm text-[#2D2A26]/80 mb-8">
            {withdrawnPrompt.daysLeft > 0
              ? `${withdrawnPrompt.daysLeft}일 이내에 복구하지 않으면 모든 데이터가 영구 삭제됩니다.`
              : '곧 모든 데이터가 영구 삭제될 예정입니다.'}
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            type="button"
            disabled={restoreLoading}
            onClick={handleRestoreAccount}
            className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors disabled:opacity-50 mb-4"
          >
            {restoreLoading ? '복구 중...' : '계정 복구하기'}
          </button>
          <button
            type="button"
            onClick={() => { setWithdrawnPrompt(null); setEmail(''); setPassword(''); }}
            className="w-full text-[9px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (showFindEmail) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fadeIn">
        <div className="w-full max-w-md">
          <h2 className="serif text-3xl mb-2 text-[#2D2A26] text-center">아이디 찾기</h2>
          <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 text-center mb-10">휴대폰 번호로 아이디를 찾을 수 있습니다.</p>

          {/* 전화번호로 아이디 찾기 */}
          <section className="space-y-4">
            <h3 className="text-[10px] tracking-[0.2em] uppercase opacity-60">전화번호로 아이디 찾기</h3>
            {findEmailResult ? (
              <>
                <p className="text-sm text-[#2D2A26]/80 mb-2">가입된 아이디(이메일)입니다.</p>
                <p className="text-base font-medium text-[#2D2A26] mb-4">{findEmailResult}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFindEmailResult('');
                    setFindOtpSent(false);
                    setFindOtpInput('');
                    setFindDevOtp('');
                    setFindByPhone('');
                    setFindVerifyError('');
                  }}
                  className="text-[9px] tracking-[0.2em] uppercase opacity-50 hover:opacity-100"
                >
                  다시 찾기
                </button>
              </>
            ) : findOtpSent ? (
              <form onSubmit={handleFindEmailVerifyOtp} className="space-y-6">
                {findDevOtp && <p className="text-[9px] text-amber-700/80">개발용 인증번호: {findDevOtp}</p>}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={findOtpInput}
                  onChange={(e) => setFindOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="인증번호 6자리"
                />
                {findVerifyError && <p className="text-sm text-red-600">{findVerifyError}</p>}
                <button
                  type="submit"
                  className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors"
                >
                  확인
                </button>
                <button type="button" onClick={() => { setFindOtpSent(false); setFindOtpInput(''); setFindDevOtp(''); setFindVerifyError(''); }} className="text-[9px] tracking-[0.2em] uppercase opacity-50 hover:opacity-100">
                  인증번호 다시 받기
                </button>
              </form>
            ) : (
              <form onSubmit={handleFindEmailSendOtp} className="space-y-6">
                <input
                  type="tel"
                  required
                  value={findByPhone}
                  onChange={(e) => setFindByPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="휴대폰 번호"
                />
                {findByPhoneError && <p className="text-sm text-red-600">{findByPhoneError}</p>}
                <button
                  type="submit"
                  className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors"
                >
                  인증번호 받기
                </button>
              </form>
            )}
          </section>

          <button
            type="button"
            onClick={() => {
              setShowFindEmail(false);
              setFindOtpSent(false);
              setFindOtpInput('');
              setFindDevOtp('');
              setFindEmailResult('');
              setFindByPhone('');
              setFindByPhoneError('');
              setFindVerifyError('');
              setIsSignUp(false);
            }}
            className="w-full mt-6 text-[9px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fadeIn">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h2 className="serif text-5xl mb-4 text-[#2D2A26]">{isSignUp ? 'Join Moodie' : 'Welcome Back'}</h2>
          <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 italic text-[#2D2A26]">Enter the world of editorial cinema.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
              placeholder="curator@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">
              {isSignUp ? "Password (8+ chars, letters, numbers, symbols)" : "Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-black/10 py-3 pr-8 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60 transition-opacity"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {isSignUp && password.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {[
                  { ok: passwordRequirements.minLength, label: '8자 이상' },
                  { ok: passwordRequirements.hasLetter, label: '영문 포함' },
                  { ok: passwordRequirements.hasNumber, label: '숫자 포함' },
                  { ok: passwordRequirements.hasSpecial, label: '특수문자 포함' },
                ].map((r) => (
                  <p key={r.label} className={`text-[9px] flex items-center gap-1 ${r.ok ? 'text-green-700' : 'text-black/35'}`}>
                    <span>{r.ok ? '✓' : '✗'}</span>{r.label}
                  </p>
                ))}
              </div>
            )}
          </div>

          {isSignUp && (
            <>
              <div className="space-y-1">
                <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full bg-transparent border-b border-black/10 py-3 pr-8 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-40 hover:opacity-60 transition-opacity"
                    aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                  >
                    {showPasswordConfirm ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordConfirm.length > 0 && (
                  <p className={`text-[9px] flex items-center gap-1 pt-1 ${password === passwordConfirm ? 'text-green-700' : 'text-red-500'}`}>
                    <span>{password === passwordConfirm ? '✓' : '✗'}</span>
                    {password === passwordConfirm ? '비밀번호 일치' : '비밀번호 불일치'}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Nickname (optional)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={50}
                  className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="Enter your nickname"
                />
                {nickname.length > 0 && (
                  <p className="text-[9px] text-black/40 mt-1">{nickname.length}/50</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[8px] tracking-[0.3em] uppercase opacity-40">Phone Number (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  className="w-full bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26]"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </>
          )}

          {isSignUp && (
            <div className="mt-6">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={agreeTermsAndPrivacy}
                    onChange={(e) => setAgreeTermsAndPrivacy(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 border border-black/20 transition-all ${agreeTermsAndPrivacy ? 'bg-black border-black' : 'bg-transparent group-hover:border-black/40'}`}>
                    {agreeTermsAndPrivacy && (
                      <svg className="w-full h-full text-[#D8D5CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-black/50 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal('terms');
                    }}
                    className="underline hover:text-black/70 transition-colors"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal('privacy');
                    }}
                    className="underline hover:text-black/70 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full bg-black text-[#D8D5CF] py-5 uppercase text-[10px] tracking-[0.4em] mt-8 hover:bg-black/90 transition-colors active:scale-[0.98]"
          >
            {isSignUp ? 'Create Account' : 'Enter Gallery'}
          </button>

          {!isSignUp && (
            <div className="mt-4 flex justify-center items-center gap-2 text-[9px] tracking-[0.2em] uppercase">
              <button
                type="button"
                onClick={() => setShowFindEmail(true)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                아이디 찾기
              </button>
              <span className="opacity-30">|</span>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                비밀번호 찾기
              </button>
            </div>
          )}
        </form>

        <div className="mt-12 space-y-4">
          <p className="text-[8px] tracking-[0.3em] uppercase opacity-30 text-center">Social Entry</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex-1 border border-black/10 py-3 text-[8px] tracking-[0.2em] uppercase hover:bg-black/5 text-[#2D2A26]"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => setError('Apple 로그인은 아직 준비 중입니다.')}
              className="flex-1 border border-black/10 py-3 text-[8px] tracking-[0.2em] uppercase text-[#2D2A26] opacity-50 cursor-not-allowed"
            >
              Apple (Coming Soon)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-10 text-[9px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity"
        >
          {isSignUp ? 'Already a curator? Log in' : 'New observer? Sign up'}
        </button>
      </div>

      {showTermsModal && (
        <TermsModal
          type={showTermsModal}
          onClose={() => setShowTermsModal(null)}
        />
      )}
    </div>
  );
};

export default Login;
