import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { InfoIcon, TetherIcon } from '@/shared/ui/Icons';

export default function PromosTab() {
  const {
    balance,
    setBalance,
    setHistoryItems,
    showToast,
    getAuthHeaders,
    accumulatedCashback,
    claimCashback,
    getCurrentRankInfo,
    redeemPromocode
  } = useApp();

  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Checks (Чеки) state
  const [checkTab, setCheckTab] = useState<'redeem' | 'create' | 'my'>('redeem');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemPassword, setRedeemPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [isRedeemingCheck, setIsRedeemingCheck] = useState(false);

  const [createAmount, setCreateAmount] = useState('1');
  const [createUses, setCreateUses] = useState('1');
  const [createPassword, setCreatePassword] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isCreatingCheck, setIsCreatingCheck] = useState(false);

  const [myChecks, setMyChecks] = useState<any[]>([]);
  const [loadingMyChecks, setLoadingMyChecks] = useState(false);

  const rankInfo = getCurrentRankInfo ? getCurrentRankInfo() : null;
  const current = rankInfo?.current || { cashbackPercent: 2.0, fullName: 'Бронза' };

  const fetchMyChecks = useCallback(async () => {
    setLoadingMyChecks(true);
    try {
      const res = await fetch('/api/checks/my', {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.checks)) {
          setMyChecks(data.checks);
        }
      }
    } catch (e) {} finally {
      setLoadingMyChecks(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (checkTab === 'my') {
      fetchMyChecks();
    }
  }, [checkTab, fetchMyChecks]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || isRedeeming) return;
    setIsRedeeming(true);
    try {
      const res = await redeemPromocode(promoCode.trim());
      if (res?.success) {
        setPromoCode('');
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleRedeemCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim() || isRedeemingCheck) return;
    setIsRedeemingCheck(true);
    try {
      const res = await fetch('/api/checks/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          code: redeemCode.trim(),
          password: redeemPassword.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setBalance(data.user.balance);
          if (Array.isArray(data.user.history)) setHistoryItems(data.user.history);
        }
        showToast(data.message || 'Чек активирован!');
        setRedeemCode('');
        setRedeemPassword('');
        setNeedPassword(false);
      } else {
        if (data.needPassword) setNeedPassword(true);
        showToast(data.error || 'Не удалось активировать чек', true);
      }
    } catch (e) {
      showToast('Ошибка сети при активации чека', true);
    } finally {
      setIsRedeemingCheck(false);
    }
  };

  const parsedAmount = parseFloat(createAmount) || 0;
  const parsedUses = parseInt(createUses, 10) || 0;
  const totalCheckCost = parseFloat((Math.max(0, parsedAmount) * Math.max(0, parsedUses)).toFixed(2));

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingCheck) return;
    if (parsedAmount < 0.01 || parsedUses < 1) {
      showToast('Укажите корректную сумму и количество активаций', true);
      return;
    }
    if (totalCheckCost > balance) {
      showToast('Недостаточно средств на балансе', true);
      return;
    }
    setIsCreatingCheck(true);
    try {
      const res = await fetch('/api/checks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          amount: parsedAmount,
          maxUses: parsedUses,
          password: createPassword.trim() || undefined,
          description: createDesc.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setBalance(data.user.balance);
          if (Array.isArray(data.user.history)) setHistoryItems(data.user.history);
        }
        if (data.check?.code && navigator.clipboard) {
          navigator.clipboard.writeText(data.check.code).catch(() => {});
        }
        showToast(data.message || 'Чек создан и скопирован!');
        setCreatePassword('');
        setCreateDesc('');
        setCheckTab('my');
        fetchMyChecks();
      } else {
        showToast(data.error || 'Ошибка создания чека', true);
      }
    } catch (e) {
      showToast('Ошибка сети при создании чека', true);
    } finally {
      setIsCreatingCheck(false);
    }
  };

  const handleCancelCheck = async (code: string) => {
    try {
      const res = await fetch('/api/checks/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setBalance(data.user.balance);
          if (Array.isArray(data.user.history)) setHistoryItems(data.user.history);
        }
        showToast(data.message || 'Чек отменён');
        fetchMyChecks();
      } else {
        showToast(data.error || 'Не удалось отменить чек', true);
      }
    } catch (e) {
      showToast('Ошибка сети', true);
    }
  };

  return (
    <div className="main-content promos-container">
      {/* Inline Promocode Card */}
      <form className="bonus-card" onSubmit={handleRedeem} style={{ gap: '10px' }}>
        <div className="cashback-card-header">
          <span className="bonus-title" style={{ margin: 0, fontSize: '15px' }}>Активация промокода</span>
          <span className="cashback-rules-tag">Бонус</span>
        </div>
        <div className="promo-input-group">
          <input
            type="text"
            className="promo-input"
            placeholder="Введите промокод"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            maxLength={32}
          />
          <button
            type="submit"
            className="promo-submit-btn"
            disabled={!promoCode.trim() || isRedeeming}
            style={{ opacity: !promoCode.trim() || isRedeeming ? 0.55 : 1 }}
          >
            {isRedeeming ? '...' : 'Применить'}
          </button>
        </div>
      </form>

      {/* Checks (Чеки) Card */}
      <div className="bonus-card" style={{ gap: '12px' }}>
        <div className="cashback-card-header">
          <span className="bonus-title" style={{ margin: 0, fontSize: '15px' }}>Чеки</span>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '10px' }}>
            {([
              { id: 'redeem', label: 'Активировать' },
              { id: 'create', label: 'Создать' },
              { id: 'my', label: 'Мои' }
            ] as const).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCheckTab(t.id)}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: checkTab === t.id ? 'rgba(0, 230, 153, 0.18)' : 'transparent',
                  color: checkTab === t.id ? '#00e699' : '#8c93a8',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {checkTab === 'redeem' && (
          <form onSubmit={handleRedeemCheck} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="promo-input-group">
              <input
                type="text"
                className="promo-input"
                placeholder="Код чека (CHK-...)"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value.toUpperCase());
                  setNeedPassword(false);
                }}
                maxLength={24}
              />
              <button
                type="submit"
                className="promo-submit-btn"
                disabled={!redeemCode.trim() || isRedeemingCheck}
                style={{ opacity: !redeemCode.trim() || isRedeemingCheck ? 0.55 : 1 }}
              >
                {isRedeemingCheck ? '...' : 'Получить'}
              </button>
            </div>
            <input
              type="password"
              className="promo-input"
              placeholder={needPassword ? 'Введите пароль от чека (обязательно)' : 'Пароль от чека (если установлен)'}
              value={redeemPassword}
              onChange={(e) => setRedeemPassword(e.target.value)}
              maxLength={40}
              style={{
                borderColor: needPassword ? 'rgba(251, 191, 36, 0.6)' : undefined
              }}
            />
          </form>
        )}

        {checkTab === 'create' && (
          <form onSubmit={handleCreateCheck} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#8c93a8', marginBottom: '4px' }}>Сумма ($ / 1 акц.)</div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="promo-input"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8c93a8', marginBottom: '4px' }}>Активаций *</div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10000"
                  className="promo-input"
                  value={createUses}
                  onChange={(e) => setCreateUses(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <input
              type="password"
              className="promo-input"
              placeholder="Пароль (необязательно)"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              maxLength={40}
            />
            <input
              type="text"
              className="promo-input"
              placeholder="Описание (необязательно)"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              maxLength={120}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '12px', color: totalCheckCost > balance ? '#f87171' : '#8c93a8' }}>
                Спишется: <strong style={{ color: totalCheckCost > balance ? '#f87171' : '#fff' }}>${totalCheckCost.toFixed(2)}</strong>
              </span>
              <button
                type="submit"
                className="promo-submit-btn"
                disabled={isCreatingCheck || totalCheckCost <= 0 || totalCheckCost > balance}
                style={{ opacity: isCreatingCheck || totalCheckCost <= 0 || totalCheckCost > balance ? 0.55 : 1 }}
              >
                {isCreatingCheck ? '...' : 'Создать чек'}
              </button>
            </div>
          </form>
        )}

        {checkTab === 'my' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingMyChecks ? (
              <div style={{ fontSize: '12px', color: '#8c93a8', textAlign: 'center', padding: '10px 0' }}>Загрузка...</div>
            ) : myChecks.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#8c93a8', textAlign: 'center', padding: '10px 0' }}>У вас пока нет созданных чеков</div>
            ) : (
              myChecks.map(c => (
                <div
                  key={c.code}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#fff', letterSpacing: '0.4px' }}>
                      {c.hasPassword ? '🔒 ' : ''}{c.code}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: c.active ? '#00e699' : '#8c93a8' }}>
                      ${Number(c.amount).toFixed(2)} • {c.usesLeft}/{c.maxUses}
                    </span>
                  </div>
                  {c.description && (
                    <div style={{ fontSize: '11px', color: '#8c93a8' }}>{c.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(c.code).catch(() => {});
                        showToast(`Код ${c.code} скопирован`);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Копировать
                    </button>
                    {c.active && c.usesLeft > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCancelCheck(c.code)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(248,113,113,0.3)',
                          background: 'rgba(248,113,113,0.1)',
                          color: '#f87171',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Cashback Card */}
      <div className="cashback-card-clean">
        <div className="cashback-card-header">
          <span className="cashback-badge-green">
            {current.cashbackPercent}% КЭШБЭК
          </span>
          <span 
            className="cashback-date-text" 
            style={{ 
              color: '#00e699', 
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="live-dot" />
            Вывод 24/7
          </span>
        </div>

        <div>
          <div className="cashback-card-title">
            Кэшбэк до 8% с проигрышей
          </div>
          <div className="cashback-card-subtext">
            Ваш текущий ранг: {current.fullName} ({current.cashbackPercent}% кэшбэк) • Выплата без вейджера 24/7
          </div>
        </div>

        {/* Accumulated Cashback Balance */}
        <div className="cashback-accumulated-box">
          <div>
            <div className="cashback-accumulated-label">
              Накоплено кэшбэка
            </div>
            <div className="cashback-accumulated-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <TetherIcon size={20} />
              {accumulatedCashback.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: '#8c93a8', marginTop: '3px', fontWeight: '500' }}>
              Мин. вывод: 1.00 USDT • <span style={{ color: '#00e699', fontWeight: '700' }}>
                Без вейджера
              </span>
            </div>
          </div>

          <button 
            className="cashback-claim-btn-main"
            onClick={claimCashback}
            disabled={accumulatedCashback < 1}
            style={{
              opacity: (accumulatedCashback < 1) ? 0.6 : 1,
              cursor: (accumulatedCashback < 1) ? 'not-allowed' : 'pointer'
            }}
          >
            Забрать
          </button>
        </div>
      </div>

      {/* Rules & Info Card */}
      <div className="cashback-rules-card">
        <div className="cashback-rules-header">
          <div className="cashback-rules-header-left">
            <InfoIcon size={16} color="var(--accent-cyan)" />
            <span className="cashback-rules-title">Как рассчитывается кэшбэк</span>
          </div>
          <span className="cashback-rules-tag">Правила</span>
        </div>

        <div className="cashback-rules-list">
          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Учитываются любые ставки в играх от <span className="cashback-rule-highlight">0.15 USDT</span>
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Процент кэшбэка растёт с вашим рангом: от <span className="cashback-rule-highlight">2.0%</span> до <span className="cashback-rule-highlight">8.0%</span> (макс. на 10 ранге)
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              При каждом проигрышном раунде ваш процент мгновенно начисляется в копилку
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Вывод накопившегося кэшбэка доступен от <span className="cashback-rule-highlight">1.00 USDT</span> без вейджера прямо на баланс в любое время суток (24/7)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
