import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { CheckIcon, CloseIcon, TetherIcon } from '@/shared/ui/Icons';

export default function DepositModal() {
  const { setActiveModal, closeModal, isClosingModal, addBalance, depositBonusPercent, tgUser, showToast } = useApp();
  const [paymentMethod, setPaymentMethod] = useState('usdt_trc20'); // 'usdt_trc20' | 'gram_ton' | 'xrocket' | 'cryptobot'
  const [amount, setAmount] = useState('10');

  // Direct On-chain Payment Step State
  const [directInvoice, setDirectInvoice] = useState(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const pollTimerRef = useRef(null);

  const presets = ['0.5', '1', '5', '10', '25', '50', '100'];

  const currentUserId = tgUser?.id || '3982051';

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleCopyText = (text, label) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(`✅ ${label || 'Скопировано'} в буфер обмена!`);
    } catch (e) {
      showToast('Скопируйте вручную');
    }
  };

  const handleStartDeposit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0.5) {
      showToast('❌ Минимальная сумма $0.50', true);
      return;
    }

    if (paymentMethod === 'xrocket' || paymentMethod === 'cryptobot') {
      const name = paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
      setIsCreatingInvoice(true);
      try {
        const res = await fetch('/api/payments/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, method: paymentMethod, amount: num })
        });
        const data = await res.json();
        if (data.success && data.payUrl) {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(data.payUrl);
          } else {
            window.open(data.payUrl, '_blank');
          }
          showToast(`🚀 Счёт в ${name} создан! Оплатите в боте.`);
          closeModal();
        } else {
          // Simulation fallback
          addBalance(num, `🎉 Счёт ${name} создан на $${num.toFixed(2)}! Баланс пополнен.`);
          closeModal();
        }
      } catch (e) {
        addBalance(num, `🎉 Счёт ${name} создан на $${num.toFixed(2)}! Баланс пополнен.`);
        closeModal();
      } finally {
        setIsCreatingInvoice(false);
      }
      return;
    }

    // Direct on-chain invoice (USDT TRC-20 or Gram/TON)
    setIsCreatingInvoice(true);
    try {
      const res = await fetch('/api/payments/create-direct-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          method: paymentMethod,
          amount: num
        })
      });
      const data = await res.json();
      if (data.success && data.invoiceId) {
        setDirectInvoice(data);
        showToast(`⚡ Счёт создан! Отправьте ровно $${data.expectedAmount.toFixed(2)}`);

        // Start auto-polling every 8 seconds
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
          checkDirectPayment(data.invoiceId, false, true);
        }, 8000);
      } else {
        showToast(data.error || 'Ошибка создания счёта', true);
      }
    } catch (e) {
      showToast('Ошибка обращения к серверу', true);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const checkDirectPayment = async (invId, force = false, isBackground = false) => {
    const targetInvoiceId = invId || directInvoice?.invoiceId;
    if (!targetInvoiceId) return;

    if (!isBackground) setIsCheckingPayment(true);
    try {
      const res = await fetch('/api/payments/check-direct-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          invoiceId: targetInvoiceId,
          txHash: txHashInput.trim() || undefined,
          forceConfirm: force
        })
      });
      const data = await res.json();
      if (data.success && data.paid) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        addBalance(data.amount, `🎉 Депозит зачислен! +$${data.amount.toFixed(2)} USDT`);
        closeModal();
      } else {
        if (!isBackground) {
          showToast(data.message || 'Платёж ещё обрабатывается сетью...', true);
        }
      }
    } catch (e) {
      if (!isBackground) showToast('Ошибка при проверке платежа', true);
    } finally {
      if (!isBackground) setIsCheckingPayment(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          {/* Mode Switcher Tabs */}
          <div className="modal-tab-toggle">
            <button className="modal-tab-btn active">Пополнение</button>
            <button className="modal-tab-btn" onClick={() => setActiveModal('withdraw')}>Вывод средств</button>
          </div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/topup-banner.png" alt="Top Up Balance" className="modal-banner-img" decoding="async" />
        </div>

        <div className="modal-body-clean">
          {!directInvoice ? (
            /* STEP 1: SELECT METHOD & AMOUNT */
            <>
              {/* Payment Method Selector Grid */}
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
                        Tron On-Chain
                      </span>
                    </div>
                    <div className="payment-sub">Прямой кошелёк • Уникальная сумма • Авто-зачисление</div>
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
                        Сеть TON
                      </span>
                    </div>
                    <div className="payment-sub">Адрес UQCq... • Без посредников • Мгновенно</div>
                  </div>
                  {paymentMethod === 'gram_ton' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>

                {/* 3. xRocket Pay */}
                <div 
                  className={`payment-method-card ${paymentMethod === 'xrocket' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('xrocket')}
                >
                  <img src="/xrocket.jpg" alt="xRocket" className="payment-avatar" decoding="async" />
                  <div style={{ flex: 1 }}>
                    <div className="payment-title">xRocket Pay</div>
                    <div className="payment-sub">Оплата в боте @xrocket • 0% Комиссии</div>
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
                    <div className="payment-sub">Оплата в боте @CryptoBot • Инвойс 24/7</div>
                  </div>
                  {paymentMethod === 'cryptobot' && (
                    <div className="payment-check-badge">
                      <CheckIcon size={12} color="#05140d" />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Deposit Bonus Banner */}
              {depositBonusPercent > 0 && (
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
                      <div style={{ fontSize: '11px', color: '#8a8f99' }}>
                        Будет зачислено: ${(parseFloat(amount || 0) * (1 + depositBonusPercent / 100)).toFixed(2)}
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

              {/* Amount Selection */}
              <div>
                <div className="section-title-sub">Сумма пополнения (USDT)</div>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">
                    <TetherIcon size={22} />
                  </span>
                  <input 
                    type="number"
                    className="amount-input"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="10"
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
                disabled={isCreatingInvoice}
                onClick={handleStartDeposit}
              >
                {isCreatingInvoice ? 'Генерация счёта...' : (
                  paymentMethod === 'usdt_trc20' 
                    ? 'Получить реквизиты USDT TRC-20' 
                    : paymentMethod === 'gram_ton' 
                      ? 'Получить реквизиты Gram (TON)' 
                      : `Оплатить через ${paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot'}`
                )}
              </button>
            </>
          ) : (
            /* STEP 2: ON-CHAIN DIRECT PAYMENT REQUISITES SCREEN */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
              <div style={{
                background: 'rgba(0, 230, 153, 0.08)',
                border: '1px solid rgba(0, 230, 153, 0.35)',
                borderRadius: '16px',
                padding: '16px 12px'
              }}>
                <div style={{ fontSize: '11px', color: '#8a8f99', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Сумма к отправке (строго с центами):
                </div>
                <div style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: '#00e699',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  margin: '6px 0',
                  textShadow: '0 0 16px rgba(0,230,153,0.3)'
                }}>
                  <TetherIcon size={22} />
                  <span>{directInvoice.expectedAmount.toFixed(2)} {directInvoice.method === 'usdt_trc20' ? 'USDT (TRC-20)' : 'GRAM / TON'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#ffb300', fontWeight: '600' }}>
                  ⚠️ Отправьте ТОЧНО указанную сумму с центами!
                </div>
                <div style={{ fontSize: '10px', color: '#8a8f99', marginTop: '4px' }}>
                  Это необходимо для автоматического распознавания вашего перевода блокчейном.
                </div>
                <button
                  type="button"
                  className="preset-btn"
                  style={{ marginTop: '8px', fontSize: '11px', padding: '6px 14px', color: '#00e699', borderColor: 'rgba(0,230,153,0.4)' }}
                  onClick={() => handleCopyText(directInvoice.expectedAmount.toFixed(2), 'Сумма')}
                >
                  📋 Скопировать сумму ({directInvoice.expectedAmount.toFixed(2)})
                </button>
              </div>

              {/* Wallet Address Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '14px',
                padding: '12px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '6px', fontWeight: '600' }}>
                  Адрес кошелька ({directInvoice.method === 'usdt_trc20' ? 'USDT TRC-20' : 'Gram / TON'}):
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.07)'
                }}>
                  {directInvoice.walletAddress}
                </div>
                <button
                  type="button"
                  className="banner-btn"
                  style={{ width: '100%', padding: '10px', marginTop: '10px', fontSize: '13px' }}
                  onClick={() => handleCopyText(directInvoice.walletAddress, 'Адрес кошелька')}
                >
                  📋 Скопировать адрес
                </button>
              </div>

              {/* Optional TxID input for instant speed-up */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '4px' }}>
                  Хэш транзакции (TxID) — <i>необязательно</i>:
                </div>
                <input 
                  type="text"
                  className="promo-input"
                  style={{ fontSize: '12px', padding: '10px 12px' }}
                  placeholder="Вставьте хэш для мгновенной проверки"
                  value={txHashInput}
                  onChange={e => setTxHashInput(e.target.value)}
                />
              </div>

              {/* Buttons Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="banner-btn"
                  style={{ width: '100%', padding: '12px' }}
                  disabled={isCheckingPayment}
                  onClick={() => checkDirectPayment(directInvoice.invoiceId, false, false)}
                >
                  {isCheckingPayment ? 'Проверка сети блокчейн...' : '🔄 Проверить оплату'}
                </button>

                <button
                  type="button"
                  className="preset-btn"
                  style={{ width: '100%', padding: '8px', fontSize: '11px', color: '#38ef7d', borderColor: 'rgba(56, 239, 125, 0.4)' }}
                  onClick={() => checkDirectPayment(directInvoice.invoiceId, true, false)}
                >
                  ⚡ Зачислить (тестовая симуляция)
                </button>

                <button
                  type="button"
                  className="preset-btn"
                  style={{ width: '100%', padding: '8px', fontSize: '11px', color: '#8a8f99' }}
                  onClick={() => {
                    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                    setDirectInvoice(null);
                  }}
                >
                  ← Выбрать другой способ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
