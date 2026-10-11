import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckIcon, CloseIcon, TetherIcon } from '../common/Icons';

export default function WithdrawModal() {
  const { setActiveModal, closeModal, isClosingModal, balance, setBalance, showToast, wagerRequired, tgUser } = useApp();
  const [paymentMethod, setPaymentMethod] = useState('usdt_trc20'); // 'usdt_trc20' | 'gram_ton' | 'cryptobot'
  const [amount, setAmount] = useState('50');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presets = ['10', '25', '50', '100', '250'];
  const currentUserId = tgUser?.id || '3982051';

  const handleWithdraw = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
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

    if ((paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton') && (!walletAddress.trim() || walletAddress.trim().length < 8)) {
      showToast('❌ Укажите корректный адрес кошелька для выплаты!', true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          method: paymentMethod,
          amount: num,
          address: walletAddress.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBalance(prev => Math.max(0, parseFloat((prev - num).toFixed(2))));
        if (data.manualWithdraw) {
          showToast(`📥 Заявка #${data.withdrawalId} отправлена администратору! Ожидайте подтверждения.`);
        } else {
          showToast(`🚀 Выплата $${num.toFixed(2)} отправлена!`);
        }
        closeModal();
      } else {
        showToast(data.error || 'Ошибка вывода средств', true);
      }
    } catch (e) {
      showToast('Сетевая ошибка при выводе', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          {/* Mode Switcher Tabs */}
          <div className="modal-tab-toggle">
            <button className="modal-tab-btn" onClick={() => setActiveModal('deposit')}>Пополнение</button>
            <button className="modal-tab-btn active">Вывод средств</button>
          </div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/withdraw-banner.png" alt="Withdraw Balance" className="modal-banner-img" decoding="async" />
        </div>

        <div className="modal-body-clean">
          {/* Payment Method Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 1. USDT TRC-20 */}
            <div 
              className={`payment-method-card ${paymentMethod === 'usdt_trc20' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('usdt_trc20')}
            >
              <img src="/usdt-trc20.png" alt="USDT TRC-20" className="payment-avatar" decoding="async" />
              <div style={{ flex: 1 }}>
                <div className="payment-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>USDT (TRC-20)</span>
                  <span style={{ fontSize: '10px', background: 'rgba(0,230,153,0.15)', color: '#00e699', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    Заявка админу
                  </span>
                </div>
                <div className="payment-sub">На кошелёк Tron (T...) • Ручная выплата 24/7</div>
              </div>
              {paymentMethod === 'usdt_trc20' && (
                <div className="payment-check-badge">
                  <CheckIcon size={12} color="#05140d" />
                </div>
              )}
            </div>

            {/* 2. Gram / TON */}
            <div 
              className={`payment-method-card ${paymentMethod === 'gram_ton' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('gram_ton')}
            >
              <img src="/gram.jpg" alt="Gram (TON)" className="payment-avatar" decoding="async" />
              <div style={{ flex: 1 }}>
                <div className="payment-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Gram / TON</span>
                  <span style={{ fontSize: '10px', background: 'rgba(0,180,216,0.15)', color: '#00b4d8', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    Заявка админу
                  </span>
                </div>
                <div className="payment-sub">На кошелёк TON (UQ... / EQ...) • Быстрая выплата</div>
              </div>
              {paymentMethod === 'gram_ton' && (
                <div className="payment-check-badge">
                  <CheckIcon size={12} color="#05140d" />
                </div>
              )}
            </div>

            {/* 3. CryptoBot */}
            <div 
              className={`payment-method-card ${paymentMethod === 'cryptobot' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cryptobot')}
            >
              <img src="/cryptobot-avatar.jpg" alt="CryptoBot" className="payment-avatar" decoding="async" />
              <div style={{ flex: 1 }}>
                <div className="payment-title">CryptoPay (CryptoBot)</div>
                <div className="payment-sub">Официальный чек в Telegram бот</div>
              </div>
              {paymentMethod === 'cryptobot' && (
                <div className="payment-check-badge">
                  <CheckIcon size={12} color="#05140d" />
                </div>
              )}
            </div>
          </div>

          {/* Wallet Address Input for TRC-20 and Gram/TON */}
          {(paymentMethod === 'usdt_trc20' || paymentMethod === 'gram_ton') && (
            <div>
              <div className="section-title-sub">
                {paymentMethod === 'usdt_trc20' ? 'Ваш адрес кошелька USDT TRC-20 (начинается на T)' : 'Ваш адрес кошелька Gram / TON (начинается на UQ или EQ)'}
              </div>
              <input 
                type="text"
                className="promo-input"
                style={{ width: '100%', padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace' }}
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder={paymentMethod === 'usdt_trc20' ? 'TYDzsYUEpvnYmQk4zGP9sWWcTEd...' : 'UQCq7UgQ1bhs9pI8dw5juHB1cY...'}
              />
            </div>
          )}

          {/* Amount Selection */}
          <div>
            <div className="section-title-sub">Сумма вывода (USDT)</div>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">
                <TetherIcon size={22} />
              </span>
              <input 
                type="number"
                className="amount-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="50"
              />
            </div>

            <div className="presets-grid">
              {presets.map(p => (
                <button 
                  key={p} 
                  type="button"
                  className={`preset-btn ${amount === p ? 'active' : ''}`}
                  onClick={() => setAmount(p)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                >
                  <TetherIcon size={12} /> {p}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="button"
            className="banner-btn deposit-submit-btn"
            disabled={isSubmitting}
            onClick={handleWithdraw}
          >
            {isSubmitting ? 'Отправка заявки...' : (
              paymentMethod === 'usdt_trc20' 
                ? 'Запросить вывод на USDT TRC-20' 
                : paymentMethod === 'gram_ton' 
                  ? 'Запросить вывод на Gram (TON)' 
                  : 'Вывести средства через CryptoBot'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
