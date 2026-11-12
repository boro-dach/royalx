import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/shared/config';
import './AuthModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    isStandalone,
    tgUser,
    sessionToken,
    phoneLogin,
    phoneRegister,
    phoneBind
  } = useApp();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [refCode, setRefCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract referral code from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('ref') || params.get('start');
      if (r) setRefCode(r.trim());
    }
  }, []);

  // Pre-fill phone if user already has one (e.g. in bind mode)
  useEffect(() => {
    if (tgUser?.phone) {
      setPhone(tgUser.phone);
    }
  }, [tgUser]);

  // Reset errors on mode change
  useEffect(() => {
    setError('');
  }, [authModalMode]);

  if (!isAuthModalOpen) return null;

  const isBindMode = authModalMode === 'bind';
  const isRegisterMode = authModalMode === 'register';
  const isLoginMode = authModalMode === 'login' || (!isBindMode && !isRegisterMode);

  // Can close only if already authenticated (e.g. in bind mode, or user has an active session)
  const canClose = Boolean(isBindMode || sessionToken || (tgUser?.id && !isStandalone));

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Auto-prefix with + if user starts typing digits
    if (val && !val.startsWith('+')) {
      val = '+' + val;
    }
    setPhone(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Введите корректный номер телефона (например, +79991234567)');
      return;
    }

    if (!password || password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isBindMode) {
        const res = await phoneBind(cleanPhone, password);
        if (!res.success) setError(res.error || 'Ошибка привязки номера');
      } else if (isRegisterMode) {
        const res = await phoneRegister({
          phone: cleanPhone,
          password,
          name: name.trim(),
          referrerId: refCode.trim() || undefined
        });
        if (!res.success) setError(res.error || 'Ошибка регистрации');
      } else {
        const res = await phoneLogin(cleanPhone, password);
        if (!res.success) setError(res.error || 'Ошибка входа');
      }
    } catch (err) {
      setError(err.message || 'Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const botUrl = `https://t.me/${APP_CONFIG.botUsername || 'RXcasbot'}`;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        {canClose && (
          <button 
            type="button" 
            className="auth-close-btn" 
            onClick={() => setIsAuthModalOpen(false)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        )}

        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand">
            ROYAL <span>X</span>
          </div>
          <h2 className="auth-title">
            {isBindMode 
              ? 'Привязка телефона' 
              : isRegisterMode 
              ? 'Регистрация' 
              : 'Вход в аккаунт'}
          </h2>
          <p className="auth-subtitle">
            {isBindMode
              ? 'Задайте номер и пароль для доступа к вашему аккаунту с любого устройства и браузера'
              : isRegisterMode
              ? 'Создайте аккаунт по номеру телефона для игры на сайте и в Telegram'
              : 'Введите номер телефона и пароль для входа в свой игровой профиль'}
          </p>
        </div>

        {/* Bind Mode Notice */}
        {isBindMode && (
          <div className="auth-info-banner">
            <span>ℹ️</span>
            <div>
              Ваш баланс, уровень и статистика будут привязаны к указанному номеру. Вы сможете заходить на сайт с компьютера.
            </div>
          </div>
        )}

        {/* Tabs Switcher (Only in standalone login/register mode) */}
        {!isBindMode && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${isLoginMode ? 'active' : ''}`}
              onClick={() => setAuthModalMode('login')}
            >
              Вход
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${isRegisterMode ? 'active' : ''}`}
              onClick={() => setAuthModalMode('register')}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="auth-error-banner">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* Auth Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Phone Field */}
          <div className="auth-field">
            <label className="auth-label">Номер телефона</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">📱</span>
              <input
                type="tel"
                className="auth-input"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={handlePhoneChange}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          {/* Name Field (Only in register mode) */}
          {isRegisterMode && (
            <div className="auth-field">
              <label className="auth-label">Ваше имя или никнейм</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Игрок (необязательно)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="auth-field">
            <label className="auth-label">
              {isBindMode ? 'Новый пароль' : 'Пароль'}
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Не менее 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegisterMode || isBindMode ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Referral Code Field (Only in register mode) */}
          {isRegisterMode && (
            <div className="auth-field">
              <label className="auth-label">Реферальный код (если есть)</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🎁</span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="ID пригласившего"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth-submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                Подождите...
              </>
            ) : isBindMode ? (
              'Привязать к аккаунту'
            ) : isRegisterMode ? (
              'Создать аккаунт 🚀'
            ) : (
              'Войти в аккаунт'
            )}
          </button>
        </form>

        {/* Footer info & Telegram shortcut */}
        <div className="auth-footer">
          {!isBindMode && (
            <div className="auth-switch-prompt">
              {isLoginMode ? (
                <>
                  Ещё нет аккаунта?
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => setAuthModalMode('register')}
                  >
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => setAuthModalMode('login')}
                  >
                    Войти
                  </button>
                </>
              )}
            </div>
          )}

          {isStandalone && !isBindMode && (
            <>
              <div className="auth-divider">или</div>
              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="auth-tg-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.5 2.5L2 10.5L9.5 14L18 6.5L12 15.5L18.5 21.5L21.5 2.5Z" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Играть в Telegram-боте</span>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
