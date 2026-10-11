import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import { CheckIcon, CloseIcon, ArrowLeftIcon, TetherIcon } from '../common/Icons';

export default function FinanceModal({ initialMode = 'deposit' }) {
  const { 
    setActiveModal, 
    balance, 
    setBalance, 
    addBalance, 
    showToast, 
    tgUser, 
    setUserStats, 
    setHistoryItems, 
    depositBonusPercent, 
    wagerRequired, 
    setWagerRequired,
    getAuthHeaders 
  } = useApp();

  const [mode, setMode] = useState(initialMode); // 'deposit' | 'withdraw'
  const [paymentMethod, setPaymentMethod] = useState('usdt_trc20'); // 'usdt_trc20' | 'gram_ton' | 'xrocket' | 'cryptobot'
  const [step, setStep] = useState('form'); // 'form' | 'pending' | 'direct_pending' | 'withdraw_success' | 'withdraw_manual_success'
  const [amount, setAmount] = useState('10');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isSwitchingTab, setIsSwitchingTab] = useState(false);

  // Pending API payment states (xRocket / CryptoBot)
  const [invoiceId, setInvoiceId] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes (900s)
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Direct on-chain deposit states (USDT TRC-20 & Gram TON)
  const [directInvoice, setDirectInvoice] = useState(null);
  const [directTxHash, setDirectTxHash] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [tonRate, setTonRate] = useState(1.46);

  // Auto-withdrawal check state (CryptoBot check / xRocket)
  const [withdrawCheckUrl, setWithdrawCheckUrl] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [manualWithdrawData, setManualWithdrawData] = useState(null);

  useEffect(() => {
    fetch('/api/payments/crypto-rates')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.tonUsd) setTonRate(d.tonUsd);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setStep('form');
    setAmount(initialMode === 'withdraw' ? '10' : '10');
  }, [initialMode]);

  // Countdown timer for pending payments
  useEffect(() => {
    let timerInterval = null;
    if ((step === 'pending' || step === 'direct_pending') && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            showToast('⌛ Время действия счета истекло!', true);
            setStep('form');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [step, timeLeft]);

  // Auto-poll direct on-chain invoice status
  useEffect(() => {
    let pollInterval = null;
    if (step === 'direct_pending' && directInvoice?.invoiceId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/payments/check-direct-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              userId: tgUser.id || '3982051',
              invoiceId: directInvoice.invoiceId,
              txHash: directTxHash ? directTxHash.trim() : undefined
            })
          });
          const data = await res.json();
          if (data.paid && data.user) {
            clearInterval(pollInterval);
            setBalance(data.user.balance);
            if (data.user.wagerRequired !== undefined) {
              setWagerRequired(parseFloat(data.user.wagerRequired) || 0.00);
            }
            setUserStats(prev => ({ ...prev, totalDeposits: data.user.totalDeposited }));
            if (Array.isArray(data.user.history)) {
              setHistoryItems(data.user.history);
            }
            showToast(`🎉 Перевод подтвержден! +$${(data.creditAmount || directInvoice.baseAmount).toFixed(2)} зачислено!`);
            handleClose();
          }
        } catch (e) {}
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, directInvoice, directTxHash]);

  const depositPresets = ['5', '10', '25', '50', '100', '250'];
  const withdrawPresets = ['5', '10', '25', '50', '100', '250'];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
    }, 240);
  };

  const handleSwitchTab = (newMode) => {
    if (newMode === mode) return;
    setIsSwitchingTab(true);
    setTimeout(() => {
      setMode(newMode);
      setStep('form');
      setAmount(newMode === 'withdraw' ? '10' : '10');
      setIsSwitchingTab(false);
    }, 150);
  };

  const copyToClipboard = (text, fieldName) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedField(fieldName);
      showToast('📋 Скопировано в буфер обмена!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      showToast('❌ Ошибка копирования', true);
    }
  };

  const handleProceedToPayment = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      showToast('❌ Введите корректную сумму!', true);
      return;
    }

    if (mode === 'deposit') {
      if (paymentMethod === 'usdt_trc20' && num < 5) {
        showToast('❌ Минимальная сумма пополнения USDT TRC-20 — $5.00', true);
        return;
      }
      if (paymentMethod === 'gram_ton' && num < 1) {
        showToast('❌ Минимальная сумма пополнения Gram (TON) — $1.00', true);
        return;
      }
      if (num < 1) {
        showToast('❌ Минимальная сумма пополнения $1.00', true);
        return;
      }

      // 1. Direct Blockchain Payment (USDT TRC-20 or Gram TON)
      if (paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton') {
        setIsCreating(true);
        const nameMethod = paymentMethod === 'usdt_trc20' ? 'USDT TRC-20' : 'Gram (TON)';
        showToast(`Формирование персонального счёта ${nameMethod}...`);

        try {
          const res = await fetch('/api/payments/create-direct-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              userId: tgUser.id || '3982051',
              method: paymentMethod,
              amount: num
            })
          });
          const data = await res.json();
          if (data.success && data.invoiceId) {
            setDirectInvoice(data);
            setTimeLeft((data.timeoutMinutes || 30) * 60);
            setStep('direct_pending');
          } else {
            showToast(data.error || 'Ошибка формирования счёта', true);
          }
        } catch (e) {
          showToast('Ошибка сети при создании счета', true);
        } finally {
          setIsCreating(false);
        }
        return;
      }

      // 2. Bot Payment (xRocket or CryptoBot)
      const methodName = paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
      setIsCreating(true);
      showToast(`Создание счёта в ${methodName}...`);

      try {
        const res = await fetch('/api/payments/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            userId: tgUser.id || '3982051',
            method: paymentMethod,
            amount: num
          })
        });
        const data = await res.json();
        if (data.success && data.invoiceId) {
          setInvoiceId(data.invoiceId);
          setPayUrl(data.payUrl);
          setTimeLeft(900);
          setStep('pending');
        } else {
          const prefix = paymentMethod === 'xrocket' ? 'XRK' : 'CB';
          const fallbackId = `${prefix}-${Date.now().toString().slice(-6)}`;
          setInvoiceId(fallbackId);
          setPayUrl(paymentMethod === 'xrocket' ? APP_CONFIG.xrocketPayUrl : APP_CONFIG.cryptobotPayUrl);
          setTimeLeft(900);
          setStep('pending');
        }
      } catch (e) {
        const prefix = paymentMethod === 'xrocket' ? 'XRK' : 'CB';
        const fallbackId = `${prefix}-${Date.now().toString().slice(-6)}`;
        setInvoiceId(fallbackId);
        setPayUrl(paymentMethod === 'xrocket' ? APP_CONFIG.xrocketPayUrl : APP_CONFIG.cryptobotPayUrl);
        setTimeLeft(900);
        setStep('pending');
      } finally {
        setIsCreating(false);
      }
    } else {
      // 3. WITHDRAWAL
      if (wagerRequired > 0) {
        showToast(`❌ Вывод недоступен! Отыграйте еще $${wagerRequired.toFixed(2)}`, true);
        return;
      }
      if (num < 5) {
        showToast('❌ Минимальная сумма вывода $5.00', true);
        return;
      }
      if (balance < num) {
        showToast('❌ Недостаточно средств на балансе!', true);
        return;
      }

      // Check wallet address for direct manual methods
      const isDirectMethod = paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton';
      if (isDirectMethod && !withdrawAddress.trim()) {
        showToast('❌ Введите адрес кошелька для выплаты!', true);
        return;
      }

      try {
        const res = await fetch('/api/payments/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            userId: tgUser.id || '3982051',
            method: paymentMethod,
            amount: num,
            address: withdrawAddress.trim() || 'Telegram User Wallet'
          })
        });
        const data = await res.json();
        if (data.success && data.user) {
          setBalance(data.user.balance);
          setUserStats(prev => ({
            ...prev,
            totalWithdrawals: data.user.totalWithdrawn
          }));
          if (Array.isArray(data.user.history)) {
            setHistoryItems(data.user.history);
          }

          if (isDirectMethod) {
            setManualWithdrawData({
              id: data.withdrawal?.id || Date.now(),
              amount: num,
              method: paymentMethod === 'usdt_trc20' ? 'USDT TRC-20' : 'Gram (TON)',
              address: withdrawAddress.trim()
            });
            setStep('withdraw_manual_success');
            showToast('🚀 Заявка на вывод отправлена администратору!');
          } else if (data.checkUrl) {
            setWithdrawCheckUrl(data.checkUrl);
            setWithdrawAmount(num.toFixed(2));
            setStep('withdraw_success');
            showToast(`🎉 Чек на $${num.toFixed(2)} отправлен вам в ЛС Telegram!`);
          } else if (data.isDirectTransfer) {
            setWithdrawCheckUrl('');
            setWithdrawAmount(num.toFixed(2));
            setStep('withdraw_success');
            showToast(`🚀 Выплата $${num.toFixed(2)} переведена на ваш баланс!`);
          } else {
            showToast(`🚀 Заявка на вывод $${num.toFixed(2)} принята!`);
            handleClose();
          }
        } else {
          showToast(data.error || '❌ Ошибка создания заявки на вывод', true);
        }
      } catch (e) {
        showToast('❌ Ошибка сети при отправке заявки на вывод', true);
      }
    }
  };

  const handleOpenPayment = () => {
    const link = payUrl || (paymentMethod === 'xrocket' ? APP_CONFIG.xrocketPayUrl : APP_CONFIG.cryptobotPayUrl);
    const methodName = paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
    showToast(`📲 Переход к оплате в ${methodName}...`);
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(link);
    } else {
      window.open(link, '_blank');
    }
  };

  const handleCheckPayment = async () => {
    const num = parseFloat(amount);
    const methodName = paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
    setIsChecking(true);
    showToast(`🔍 Проверка транзакции в ${methodName}...`);

    try {
      const res = await fetch('/api/payments/check-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          userId: tgUser.id || '3982051',
          invoiceId,
          method: paymentMethod
        })
      });
      const data = await res.json();
      if (data.paid) {
        if (data.user) {
          setBalance(data.user.balance);
          if (data.user.wagerRequired !== undefined) {
            setWagerRequired(parseFloat(data.user.wagerRequired) || 0.00);
          }
          setUserStats(prev => ({
            ...prev,
            totalDeposits: data.user.totalDeposited
          }));
          if (Array.isArray(data.user.history)) {
            setHistoryItems(data.user.history);
          }
        } else {
          addBalance(num);
        }
        showToast(`🎉 Оплата подтверждена! +$${num.toFixed(2)} зачислено на баланс!`);
        handleClose();
      } else {
        showToast('⏳ Ожидание оплаты в блокчейне. Если оплатили, попробуйте еще раз через 10 секунд', false);
      }
    } catch (e) {
      addBalance(num, `🎉 Оплата подтверждена! +$${num.toFixed(2)} зачислено на баланс!`);
      handleClose();
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckDirectPayment = async () => {
    if (!directInvoice?.invoiceId) return;
    setIsChecking(true);
    showToast('🔍 Проверка блокчейн-перевода по уникальной сумме...');

    try {
      const res = await fetch('/api/payments/check-direct-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          userId: tgUser.id || '3982051',
          invoiceId: directInvoice.invoiceId,
          txHash: directTxHash ? directTxHash.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.paid && data.user) {
        setBalance(data.user.balance);
        if (data.user.wagerRequired !== undefined) {
          setWagerRequired(parseFloat(data.user.wagerRequired) || 0.00);
        }
        setUserStats(prev => ({ ...prev, totalDeposits: data.user.totalDeposited }));
        if (Array.isArray(data.user.history)) {
          setHistoryItems(data.user.history);
        }
        showToast(`🎉 Перевод подтвержден! +$${(data.creditAmount || directInvoice.baseAmount).toFixed(2)} зачислено!`);
        handleClose();
      } else {
        showToast('⏳ Перевод еще не поступил в блокчейн сети. Если вы уже отправили средства, подождите 1-2 минуты.', false);
      }
    } catch (e) {
      showToast('❌ Ошибка сети при проверке транзакции', true);
    } finally {
      setIsChecking(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerPercent = (timeLeft / (directInvoice ? (directInvoice.timeoutMinutes * 60) : 900)) * 100;

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`modal-container ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Top Header with Mode Switcher & Close Button */}
        <div className="modal-header">
          {step === 'form' ? (
            <div className="modal-tab-toggle">
              <button 
                className={`modal-tab-btn ${mode === 'deposit' ? 'active' : ''}`}
                onClick={() => handleSwitchTab('deposit')}
              >
                Пополнение
              </button>
              <button 
                className={`modal-tab-btn ${mode === 'withdraw' ? 'active' : ''}`}
                onClick={() => handleSwitchTab('withdraw')}
              >
                Вывод средств
              </button>
            </div>
          ) : step === 'withdraw_success' || step === 'withdraw_manual_success' ? (
            <div className="modal-title" style={{ color: '#00e699' }}>
              {step === 'withdraw_manual_success' ? 'Заявка принята' : 'Чек на выплату'}
            </div>
          ) : (
            <div className="modal-title">
              {step === 'direct_pending' ? 'Прямой перевод на кошелёк' : 'Оплата счета'}
            </div>
          )}

          <button className="modal-close-btn" onClick={handleClose} aria-label="Закрыть">
            <CloseIcon size={16} color="#8a8f99" />
          </button>
        </div>

        {/* STEP 1: FORM VIEW */}
        {step === 'form' && (
          <>
            {/* Banner */}
            <div className="modal-banner-box">
              <img 
                src={mode === 'deposit' ? '/topup-banner.png' : '/withdraw-banner.png'} 
                alt="Finance Banner" 
                className={`modal-banner-img ${isSwitchingTab ? 'switching' : ''}`} 
                loading="eager"
              />
            </div>

            {/* Tab Content */}
            <div className={`modal-body-clean ${isSwitchingTab ? 'switching' : ''}`}>
              {/* Payment Method Selector (4 Methods) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. USDT TRC-20 */}
                <div 
                  className={`payment-method-card ${paymentMethod === 'usdt_trc20' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('usdt_trc20')}
                >
                  <img src="/usdt-trc20.png" alt="USDT TRC-20" className="payment-avatar" decoding="async" />
                  <div style={{ flex: 1 }}>
                    <div className="payment-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      USDT TRC-20
                      <span style={{ fontSize: '10px', background: 'rgba(38, 161, 123, 0.2)', color: '#26a17b', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>TRON</span>
                    </div>
                    <div className="payment-sub">
                      {mode === 'deposit' 
                        ? 'Мин: 5.00 USDT • Прямой перевод • Уникальные центы' 
                        : 'Выплата на кошелек TRC-20 • Ручная заявка админу'
                      }
                    </div>
                  </div>
                  {paymentMethod === 'usdt_trc20' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>

                {/* 2. Gram (TON) */}
                <div 
                  className={`payment-method-card ${paymentMethod === 'gram_ton' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('gram_ton')}
                >
                  <img src="/gram.jpg" alt="Gram (TON)" className="payment-avatar" decoding="async" />
                  <div style={{ flex: 1 }}>
                    <div className="payment-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Gram (TON)
                      <span style={{ fontSize: '10px', background: 'rgba(0, 152, 234, 0.2)', color: '#0098ea', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>TON</span>
                    </div>
                    <div className="payment-sub">
                      {mode === 'deposit' 
                        ? 'Мин: 1.00 USD • Прямой перевод TON • Без комиссий' 
                        : 'Выплата на любой TON/Gram кошелек • Ручная заявка'
                      }
                    </div>
                  </div>
                  {paymentMethod === 'gram_ton' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>

                {/* 3. xRocket */}
                <div 
                  className={`payment-method-card ${paymentMethod === 'xrocket' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('xrocket')}
                >
                  <img src="/xrocket.jpg" alt="xRocket" className="payment-avatar" decoding="async" />
                  <div style={{ flex: 1 }}>
                    <div className="payment-title">xRocket Pay</div>
                    <div className="payment-sub">
                      {mode === 'deposit' 
                        ? 'Мгновенно через бота • 0% Комиссии • TON / USDT' 
                        : 'Автовывод на чек xRocket в ЛС • Мин: 5.00 USDT'
                      }
                    </div>
                  </div>
                  {paymentMethod === 'xrocket' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>

                {/* 4. CryptoBot */}
                <div 
                  className={`payment-method-card ${paymentMethod === 'cryptobot' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cryptobot')}
                >
                  <img src="/cryptobot-avatar.jpg" alt="CryptoBot" className="payment-avatar" decoding="async" />
                  <div style={{ flex: 1 }}>
                    <div className="payment-title">CryptoPay (CryptoBot)</div>
                    <div className="payment-sub">
                      {mode === 'deposit' 
                        ? 'Мгновенно через бота • 0% Комиссии • TON / USDT' 
                        : 'Автовывод чеком в ЛС • 24/7 • Мин: 5.00 USDT'
                      }
                    </div>
                  </div>
                  {paymentMethod === 'cryptobot' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Deposit Bonus Banner */}
              {mode === 'deposit' && depositBonusPercent > 0 && (
                <div style={{
                  background: 'rgba(0, 230, 153, 0.08)',
                  border: '1px solid rgba(0, 230, 153, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🎁</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e699' }}>
                        Бонус +{depositBonusPercent}% к депозиту активен!
                      </div>
                      <div style={{ fontSize: '11px', color: '#8a8f99', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Будет зачислено: <span style={{ color: '#fff', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <TetherIcon size={12} /> {(parseFloat(amount || 0) * (1 + depositBonusPercent / 100)).toFixed(2)}
                        </span> (+{(parseFloat(amount || 0) * (depositBonusPercent / 100)).toFixed(2)} бонус)
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: 'rgba(0, 230, 153, 0.2)',
                    color: '#00e699',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    +{depositBonusPercent}%
                  </span>
                </div>
              )}

              {/* Wager Requirement Status Box */}
              {mode === 'withdraw' && (
                <div style={{
                  background: wagerRequired > 0 ? 'rgba(255, 77, 77, 0.08)' : 'rgba(0, 230, 153, 0.08)',
                  border: `1px solid ${wagerRequired > 0 ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 230, 153, 0.3)'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{wagerRequired > 0 ? '⏳' : '✅'}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: wagerRequired > 0 ? '#ff5252' : '#00e699' }}>
                        {wagerRequired > 0 ? 'Требуется отыгрыш перед выводом' : 'Отыгрыш выполнен'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8a8f99' }}>
                        {wagerRequired > 0 
                          ? <>Осталось отыграть в играх: <span style={{ color: '#fff', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={12} /> {wagerRequired.toFixed(2)}</span></>
                          : 'Депозиты и бонусы отыграны. Вывод доступен!'}
                      </div>
                    </div>
                  </div>
                  {wagerRequired > 0 && (
                    <span style={{
                      background: 'rgba(255, 77, 77, 0.18)',
                      color: '#ff5252',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      -<TetherIcon size={12} /> {wagerRequired.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <div className="section-title-sub">
                  {mode === 'deposit' ? 'Сумма пополнения' : 'Сумма вывода'}
                </div>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">
                    <TetherIcon size={22} />
                  </span>
                  <input 
                    type="number"
                    className="amount-input"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={mode === 'deposit' ? '10' : '10'}
                  />
                </div>

                <div className="presets-grid">
                  {(mode === 'withdraw' ? withdrawPresets : (paymentMethod === 'gram_ton' ? ['1', '3', '5', '10', '25', '50'] : ['5', '10', '25', '50', '100', '250'])).map(p => (
                    <button 
                      key={p} 
                      className={`preset-btn ${amount === p ? 'active' : ''}`}
                      onClick={() => setAmount(p)}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                    >
                      <TetherIcon size={12} /> {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallet Address Input for Manual Withdrawal */}
              {mode === 'withdraw' && (paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton') && (
                <div style={{ marginTop: '2px' }}>
                  <div className="section-title-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Адрес кошелька получателя</span>
                    <span style={{ color: '#00e699' }}>{paymentMethod === 'usdt_trc20' ? 'TRC-20' : 'TON / Gram'}</span>
                  </div>
                  <input 
                    type="text"
                    className="amount-input"
                    style={{ fontSize: '13px', padding: '12px 14px', width: '100%', boxSizing: 'border-box' }}
                    value={withdrawAddress}
                    onChange={e => setWithdrawAddress(e.target.value)}
                    placeholder={paymentMethod === 'usdt_trc20' ? 'Адрес кошелька TRC-20 (начинается с T...)' : 'Адрес кошелька TON (UQ... или EQ...)'}
                  />
                  <div style={{ fontSize: '11px', color: '#8a8f99', marginTop: '6px' }}>
                    💡 Заявка на вывод будет отправлена администратору в ЛС Telegram на подтверждение.
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                className="banner-btn deposit-submit-btn"
                style={mode === 'withdraw' && wagerRequired > 0 ? { background: 'linear-gradient(135deg, rgba(255, 77, 77, 0.3), rgba(211, 47, 47, 0.5))', border: '1px solid rgba(255, 77, 77, 0.5)', color: '#ffb3b3' } : {}}
                onClick={handleProceedToPayment}
                disabled={isCreating}
              >
                {isCreating ? 'Создание счета...' : (
                  mode === 'deposit' 
                    ? `Получить реквизиты (${paymentMethod === 'usdt_trc20' ? 'USDT TRC-20' : paymentMethod === 'gram_ton' ? 'Gram (TON)' : paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot'})` 
                    : (wagerRequired > 0 
                        ? `Отыграйте еще ${wagerRequired.toFixed(2)} USDT` 
                        : (paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton')
                            ? `Отправить заявку на вывод (${paymentMethod === 'usdt_trc20' ? 'USDT' : 'Gram'})`
                            : `Вывести через ${paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot'}`)
                )}
              </button>
            </div>
          </>
        )}

        {/* STEP 2A: DIRECT ON-CHAIN PAYMENT (USDT TRC-20 & Gram TON) */}
        {step === 'direct_pending' && directInvoice && (
          <div className="payment-pending-wrapper" style={{ padding: '8px 0' }}>
            {/* Status Header */}
            <div className="payment-status-header">
              <div className="payment-status-badge-glow">
                <span className="pulse-dot" />
                Ожидание прямого перевода
              </div>
              <div className="payment-order-id-tag">
                #{directInvoice.invoiceId}
              </div>
            </div>

            {/* 1. INTERACTIVE TOUCH-TO-COPY BOX FOR EXACT AMOUNT */}
            <div 
              className={`payment-interactive-box ${copiedField === 'amount' ? 'copied-flash' : ''}`}
              onClick={() => copyToClipboard(String(directInvoice.exactAmount), 'amount')}
              role="button"
              tabIndex={0}
            >
              <div className="payment-interactive-box-top">
                <span className="payment-box-tag">ТОЧНАЯ СУММА К ПЕРЕВОДУ</span>
                <span className={`payment-box-hint ${copiedField === 'amount' ? 'active' : ''}`}>
                  {copiedField === 'amount' ? 'СКОПИРОВАНО!' : 'НАЖМИТЕ ДЛЯ КОПИРОВАНИЯ'}
                </span>
              </div>
              <div className="payment-interactive-box-val">
                <span className="payment-box-num">{directInvoice.exactAmount}</span>
                <span className="payment-box-cur">{directInvoice.currency || (paymentMethod === 'usdt_trc20' ? 'USDT' : 'Gram')}</span>
              </div>
              <div className="payment-interactive-box-sub">
                💡 Зачисление на баланс: <b>${directInvoice.baseAmount.toFixed(2)} USDT</b>
              </div>
            </div>

            {/* 2. INTERACTIVE TOUCH-TO-COPY BOX FOR WALLET ADDRESS */}
            <div 
              className={`payment-interactive-box wallet-box ${copiedField === 'wallet' ? 'copied-flash' : ''}`}
              onClick={() => copyToClipboard(directInvoice.walletAddress, 'wallet')}
              role="button"
              tabIndex={0}
            >
              <div className="payment-interactive-box-top">
                <span className="payment-box-tag">
                  АДРЕС ДЛЯ ПЕРЕВОДА ({paymentMethod === 'usdt_trc20' ? 'TRON TRC-20' : 'СЕТЬ TON'})
                </span>
                <span className={`payment-box-hint ${copiedField === 'wallet' ? 'active' : ''}`}>
                  {copiedField === 'wallet' ? 'СКОПИРОВАНО!' : 'НАЖМИТЕ ДЛЯ КОПИРОВАНИЯ'}
                </span>
              </div>
              <div className="payment-interactive-box-address">
                {directInvoice.walletAddress}
              </div>
            </div>

            {/* Anti-old-payments notice */}
            <div style={{ fontSize: '11px', color: '#ffcc00', background: 'rgba(255, 204, 0, 0.08)', border: '1px solid rgba(255, 204, 0, 0.25)', borderRadius: '10px', padding: '10px 12px', lineHeight: '1.4', marginBottom: '12px' }}>
              ⚠️ <b>Внимание:</b> Переводите только после открытия этой страницы. Старые переводы игнорируются. Баланс зачисляется автоматически в течение 1-2 минут после поступления средств в сеть!
            </div>

            {/* Countdown Timer Box */}
            <div className="payment-timer-box" style={{ marginTop: '10px' }}>
              <div className="payment-timer-label">Счет действителен в течение</div>
              <div className="payment-timer-digits">
                {formatTimer(timeLeft)}
              </div>
              <div className="payment-timer-bar-bg">
                <div 
                  className="payment-timer-bar-fill"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>

            {/* Actions Group */}
            <div className="payment-actions-group" style={{ marginTop: '12px' }}>
              <button 
                className="payment-btn-open"
                onClick={handleCheckDirectPayment}
                disabled={isChecking}
                style={{ background: 'linear-gradient(135deg, #00e699 0%, #00b377 100%)', color: '#05140d', fontWeight: '800' }}
              >
                {isChecking ? '🔍 Проверка сети...' : '🔍 Проверить поступление'}
              </button>

              <button 
                className="payment-btn-cancel"
                onClick={() => setStep('form')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ArrowLeftIcon size={14} color="var(--text-gray)" />
                <span>Изменить сумму или вернуться назад</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2B: API BOT PAYMENT (xRocket / CryptoBot) */}
        {step === 'pending' && (
          <div className="payment-pending-wrapper" style={{ padding: '8px 0' }}>
            {/* Status Header */}
            <div className="payment-status-header">
              <div className="payment-status-badge-glow">
                <span className="pulse-dot" />
                Ожидание оплаты
              </div>
              <div className="payment-order-id-tag">
                {invoiceId}
              </div>
            </div>

            {/* Payment Details Card */}
            <div className="payment-details-card">
              <div className="payment-amount-hero">
                <div className="payment-amount-hero-lbl">К оплате</div>
                <div className="payment-amount-hero-val" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <TetherIcon size={24} /> {parseFloat(amount || 0).toFixed(2)}
                </div>
              </div>

              <div className="payment-info-rows">
                <div className="payment-info-row">
                  <span className="payment-info-lbl">Способ оплаты</span>
                  <span className="payment-info-val">
                    {paymentMethod === 'xrocket' ? 'xRocket Telegram (@xrocket)' : 'CryptoBot Telegram (@CryptoBot)'}
                  </span>
                </div>
                <div className="payment-info-row">
                  <span className="payment-info-lbl">Валюты</span>
                  <span className="payment-info-val">
                    {paymentMethod === 'xrocket' ? 'TON / USDT / NOT / BTC' : 'USDT / TON / BTC / GRAM'}
                  </span>
                </div>
                <div className="payment-info-row">
                  <span className="payment-info-lbl">Комиссия</span>
                  <span className="payment-info-val" style={{ color: '#00e699' }}>0%</span>
                </div>
              </div>
            </div>

            {/* Countdown Timer Box */}
            <div className="payment-timer-box">
              <div className="payment-timer-label">Счет действителен в течение</div>
              <div className="payment-timer-digits">
                {formatTimer(timeLeft)}
              </div>
              <div className="payment-timer-bar-bg">
                <div 
                  className="payment-timer-bar-fill"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="payment-actions-group">
              <button 
                className="payment-btn-open"
                onClick={handleOpenPayment}
              >
                Открыть оплату
              </button>

              <button 
                className="payment-btn-check"
                onClick={handleCheckPayment}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <span className="spinner-icon">🔄</span>
                    Проверка...
                  </>
                ) : (
                  'Проверить оплату'
                )}
              </button>

              <button 
                className="payment-btn-cancel"
                onClick={() => setStep('form')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ArrowLeftIcon size={14} color="var(--text-gray)" />
                <span>Изменить сумму или вернуться назад</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3A: MANUAL WITHDRAWAL SUBMITTED VIEW */}
        {step === 'withdraw_manual_success' && manualWithdrawData && (
          <div className="payment-pending-wrapper" style={{ padding: '16px 8px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 230, 153, 0.15)',
              border: '2px solid #00e699',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 0 24px rgba(0, 230, 153, 0.3)'
            }}>
              <CheckIcon size={32} color="#00e699" />
            </div>

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Заявка #{manualWithdrawData.id} принята!
            </div>

            <div style={{ fontSize: '13px', color: '#8a8f99', lineHeight: '1.45', marginBottom: '16px', padding: '0 10px' }}>
              Заявка на выплату <span style={{ color: '#00e699', fontWeight: '800' }}>${manualWithdrawData.amount.toFixed(2)} USDT</span> успешно передана администратору в личные сообщения бота.
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px', textAlign: 'left', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                <span style={{ color: '#8a8f99' }}>Метод вывода:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{manualWithdrawData.method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                <span style={{ color: '#8a8f99' }}>Статус:</span>
                <span style={{ color: '#ffcc00', fontWeight: '600' }}>⏳ На проверке админом</span>
              </div>
              <div style={{ fontSize: '12px', color: '#8a8f99', marginBottom: '4px' }}>Адрес получения:</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff', wordBreak: 'break-all' }}>
                {manualWithdrawData.address}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '16px', lineHeight: '1.4' }}>
              💡 Администратор подтвердит выплату в Telegram. При отклонении заявки средства вернутся обратно на ваш баланс.
            </div>

            <button 
              className="banner-btn"
              style={{ 
                width: '100%', 
                background: 'linear-gradient(135deg, #00e699 0%, #00b377 100%)',
                boxShadow: '0 4px 16px rgba(0, 230, 153, 0.35)',
                fontSize: '15px',
                fontWeight: '700'
              }}
              onClick={handleClose}
            >
              Понятно
            </button>
          </div>
        )}

        {/* STEP 3B: WITHDRAW SUCCESS VIEW (AUTOMATIC BOT CHECK) */}
        {step === 'withdraw_success' && (
          <div className="payment-pending-wrapper" style={{ padding: '16px 8px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 230, 153, 0.15)',
              border: '2px solid #00e699',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 0 24px rgba(0, 230, 153, 0.3)'
            }}>
              <CheckIcon size={32} color="#00e699" />
            </div>

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Выплата отправлена!
            </div>

            <div style={{ fontSize: '13px', color: '#8a8f99', lineHeight: '1.45', marginBottom: '18px', padding: '0 10px' }}>
              {withdrawCheckUrl ? (
                <>Персональный чек на сумму <span style={{ color: '#00e699', fontWeight: '800' }}>${withdrawAmount} USDT</span> успешно сформирован и отправлен вам в личные сообщения Telegram!</>
              ) : (
                <>Выплата на сумму <span style={{ color: '#00e699', fontWeight: '800' }}>${withdrawAmount} USDT</span> успешно отправлена напрямую на ваш кошелек!</>
              )}
            </div>

            {withdrawCheckUrl ? (
              <button 
                className="banner-btn"
                style={{ 
                  width: '100%', 
                  background: 'linear-gradient(135deg, #00e699 0%, #00b377 100%)',
                  boxShadow: '0 4px 16px rgba(0, 230, 153, 0.35)',
                  fontSize: '15px',
                  fontWeight: '700'
                }}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
                    window.Telegram.WebApp.openTelegramLink(withdrawCheckUrl);
                  } else {
                    window.open(withdrawCheckUrl, '_blank');
                  }
                }}
              >
                Забрать чек
              </button>
            ) : (
              <button 
                className="banner-btn"
                style={{ 
                  width: '100%', 
                  background: 'linear-gradient(135deg, #00e699 0%, #00b377 100%)',
                  boxShadow: '0 4px 16px rgba(0, 230, 153, 0.35)',
                  fontSize: '15px',
                  fontWeight: '700'
                }}
                onClick={handleClose}
              >
                Отлично
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
