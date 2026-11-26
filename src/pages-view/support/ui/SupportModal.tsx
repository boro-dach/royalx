import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/shared/config';
import { CloseIcon, HeadphonesIcon, SendIcon } from '@/shared/ui/Icons';

const SUPPORT_TOPICS = [
  { id: 'deposit',  title: 'Пополнение',       icon: '💳' },
  { id: 'withdraw', title: 'Вывод средств',     icon: '💸' },
  { id: 'games',    title: 'Игры и ставки',     icon: '🎰' },
  { id: 'promo',    title: 'Бонусы и промо',    icon: '🎁' },
  { id: 'account',  title: 'Аккаунт',           icon: '👤' },
  { id: 'other',    title: 'Другое',            icon: '📋' }
];

const TOPIC_FAQS = {
  deposit: [
    { q: 'Как быстро зачисляются средства?', a: 'Пополнения через @CryptoBot, @xrocket и Lave Pay зачисляются моментально. При прямом переводе USDT TRC-20 или TON зачисление происходит после 1 подтверждения сети (обычно 1–3 мин).' },
    { q: 'Что делать, если деньги не поступили?', a: 'Если в течение 5 минут баланс не обновился — создайте тикет ниже, укажите ваш ID и прикрепите TXID или скриншот чека.' },
    { q: 'Минимальная сумма депозита?', a: 'От $0.50 через платёжные боты, от $1.00 при пополнении через TON/TRC-20.' }
  ],
  withdraw: [
    { q: 'Регламент обработки заявок?', a: 'Автовывод через CryptoBot чеками — моментально 24/7. Прямые переводы USDT TRC-20 и TON — от 5 до 30 минут.' },
    { q: 'Есть ли комиссия за вывод?', a: 'Комиссия платформы 0%. Вы получаете ровно ту сумму, что указали в заявке.' },
    { q: 'Что такое вагер?', a: 'Вагер накладывается только при активации специальных бонусов. Прогресс отыгрыша можно проверить в Личном Кабинете.' }
  ],
  games: [
    { q: 'Как проверяется честность (Provably Fair)?', a: 'Все исходы генерируются на сервере прозрачным алгоритмом. Эмодзи-игры используют Telegram Dice Engine.' },
    { q: 'Что будет, если отключится интернет?', a: 'Каждая ставка регистрируется на защищённом сервере мгновенно. Выигрыш будет зачислен даже если приложение закрылось.' }
  ],
  promo: [
    { q: 'Как активировать промокод?', a: 'В разделе «Акции» в приложении или командой /promo КОД боту в Telegram.' },
    { q: 'Где брать промокоды?', a: 'Свежие промокоды публикуются в официальном Telegram-канале и в игровом чате.' }
  ],
  account: [
    { q: 'Как изменить данные профиля?', a: 'Данные профиля синхронизируются с вашим Telegram-аккаунтом автоматически.' },
    { q: 'Как привязать реферала?', a: 'Пройдите по реферальной ссылке партнёра до первой игры — привязка произойдёт автоматически.' }
  ],
  other: [
    { q: 'Как связаться с поддержкой?', a: 'Создайте тикет ниже или напишите напрямую оператору. Среднее время ответа — 2–5 минут.' }
  ]
};

export default function SupportModal() {
  const { closeModal, isClosingModal, showToast, tgUser, getAuthHeaders } = useApp();
  const [view, setView] = useState('main'); // main | ticket
  const [activeTopic, setActiveTopic] = useState('deposit');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Ticket form state
  const [ticketTopic, setTicketTopic] = useState('deposit');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSent, setTicketSent] = useState<any>(null); // null | ticketId

  const currentUserId = tgUser?.id || '—';
  const userName = tgUser?.first_name || tgUser?.username || 'Игрок';
  const supportNick = APP_CONFIG.supportUsername || 'MartinCartier';

  const currentFaqs = TOPIC_FAQS[activeTopic] || [];

  const handleCopyId = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(String(currentUserId));
      } else {
        const ta = document.createElement('textarea');
        ta.value = String(currentUserId);
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('✅ ID скопирован в буфер обмена!');
    } catch (e) {
      showToast(`ID: ${currentUserId}`);
    }
  };

  const handleContactSupport = () => {
    const prefilledText = `Здравствуйте! Мой ID: ${currentUserId}\nИмя: ${userName}\nВопрос: `;
    const url = `https://t.me/${supportNick}?text=${encodeURIComponent(prefilledText)}`;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSendTicket = async () => {
    if (!ticketMessage.trim() || ticketMessage.trim().length < 10) {
      showToast('⚠️ Сообщение слишком короткое (минимум 10 символов)');
      return;
    }
    setTicketSending(true);
    try {
      const topicLabel = SUPPORT_TOPICS.find(t => t.id === ticketTopic)?.title || ticketTopic;
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
        body: JSON.stringify({
          userId: currentUserId,
          userName,
          topic: topicLabel,
          message: ticketMessage.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setTicketSent(data.ticketId);
        setTicketMessage('');
      } else {
        showToast(`❌ ${data.error || 'Ошибка отправки'}`);
      }
    } catch (e) {
      showToast('❌ Не удалось отправить тикет. Попробуйте позже.');
    } finally {
      setTicketSending(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div
        className={`modal-container ${isClosingModal ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(0, 230, 153, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <HeadphonesIcon size={16} color="#00e699" />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: '15px' }}>Центр Поддержки</div>
              <div style={{ fontSize: '11px', color: '#8a8f99' }}>Решаем любые вопросы 24/7</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* View switcher tabs */}
        <div style={{
          display: 'flex', gap: '6px', padding: '0 16px 10px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          {[
            { id: 'main', label: '📖 FAQ' },
            { id: 'ticket', label: '🎫 Создать тикет' }
          ].map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => { setView(v.id); setTicketSent(null); }}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                border: view === v.id ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
                background: view === v.id ? 'rgba(0, 230, 153, 0.12)' : 'rgba(255,255,255,0.03)',
                color: view === v.id ? '#00e699' : '#8a8f99', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

          {/* ───── FAQ VIEW ───── */}
          {view === 'main' && (
            <>
              {/* User ID Card */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8a8f99' }}>Ваш профиль в системе</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>ID: {currentUserId}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(0,230,153,0.15)', color: '#00e699', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Активен 🟢
                    </span>
                  </div>
                </div>
                <button type="button" className="preset-btn" onClick={handleCopyId}
                  style={{ padding: '6px 12px', fontSize: '11px', width: 'auto' }}>
                  📋 Скопировать
                </button>
              </div>

              {/* Topic Tabs */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  ТЕМАТИКА ВОПРОСА
                </div>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                  {SUPPORT_TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => { setActiveTopic(topic.id); setOpenFaqIndex(0); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: '12px', whiteSpace: 'nowrap',
                        border: activeTopic === topic.id ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
                        background: activeTopic === topic.id ? 'rgba(0,230,153,0.12)' : 'rgba(255,255,255,0.03)',
                        color: activeTopic === topic.id ? '#00e699' : '#fff',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      <span>{topic.icon}</span><span>{topic.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Accordion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ЧАСТЫЕ ВОПРОСЫ
                </div>
                {currentFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px', overflow: 'hidden'
                    }}>
                      <button type="button" onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                        style={{
                          width: '100%', padding: '12px 14px', background: 'transparent', border: 'none',
                          color: '#fff', fontSize: '12.5px', fontWeight: 600, textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer'
                        }}>
                        <span>{faq.q}</span>
                        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', fontSize: '10px', color: '#8a8f99', flexShrink: 0 }}>▼</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 14px 12px', fontSize: '12px', color: '#8a8f99', lineHeight: '1.5', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Agent CTA */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,230,153,0.08) 0%, rgba(20,23,33,0.6) 100%)',
                border: '1px solid rgba(0,230,153,0.25)', borderRadius: '14px', padding: '14px',
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>Не нашли ответ?</div>
                  <span style={{ fontSize: '11px', color: '#00e699', fontWeight: 600 }}>● Онлайн</span>
                </div>
                <div style={{ fontSize: '11px', color: '#8a8f99', lineHeight: '1.4' }}>
                  Оператор ответит на ваше обращение в Telegram и поможет решить любую проблему.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="banner-btn" onClick={handleContactSupport}
                    style={{ flex: 1, padding: '11px', fontSize: '12px', fontWeight: 800, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span>↗ @{supportNick}</span>
                  </button>
                  <button type="button" className="preset-btn" onClick={() => setView('ticket')}
                    style={{ flex: 1, padding: '11px', fontSize: '12px', fontWeight: 700, borderRadius: '12px', width: 'auto' }}>
                    🎫 Тикет
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ───── TICKET VIEW ───── */}
          {view === 'ticket' && (
            <>
              {ticketSent ? (
                /* Success screen */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                  padding: '24px 0', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '48px' }}>✅</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                      Тикет отправлен!
                    </div>
                    <div style={{ fontSize: '12px', color: '#8a8f99', lineHeight: '1.5' }}>
                      Номер обращения: <span style={{ color: '#00e699', fontWeight: 700 }}>{ticketSent}</span>
                      <br />Оператор свяжется с вами в Telegram в течение 2–5 минут.
                    </div>
                  </div>
                  <button type="button" className="banner-btn" onClick={() => { setTicketSent(null); setView('main'); }}
                    style={{ padding: '11px 24px', fontSize: '13px', fontWeight: 700, borderRadius: '12px', width: '100%' }}>
                    Вернуться к FAQ
                  </button>
                </div>
              ) : (
                /* Ticket form */
                <>
                  {/* User card */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#8a8f99' }}>Отправитель</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{userName} · ID: {currentUserId}</div>
                    </div>
                    <span style={{ fontSize: '10px', background: 'rgba(0,230,153,0.15)', color: '#00e699', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      🟢 Онлайн
                    </span>
                  </div>

                  {/* Topic select */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      ТЕМА ОБРАЩЕНИЯ
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {SUPPORT_TOPICS.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTicketTopic(t.id)}
                          style={{
                            padding: '7px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                            border: ticketTopic === t.id ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
                            background: ticketTopic === t.id ? 'rgba(0,230,153,0.12)' : 'rgba(255,255,255,0.03)',
                            color: ticketTopic === t.id ? '#00e699' : '#fff', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {t.icon} {t.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message textarea */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      СООБЩЕНИЕ
                    </div>
                    <textarea
                      value={ticketMessage}
                      onChange={e => setTicketMessage(e.target.value)}
                      placeholder="Опишите вашу проблему подробно: что произошло, когда, какой результат ожидали..."
                      maxLength={1000}
                      rows={5}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                        color: '#fff', fontSize: '13px', padding: '12px 14px',
                        resize: 'none', outline: 'none', fontFamily: 'inherit',
                        lineHeight: '1.5', boxSizing: 'border-box',
                        transition: 'border-color 0.15s'
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,230,153,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <div style={{ fontSize: '11px', color: '#8a8f99', textAlign: 'right', marginTop: '4px' }}>
                      {ticketMessage.length}/1000
                    </div>
                  </div>

                  {/* Send button */}
                  <button
                    type="button"
                    className="banner-btn"
                    onClick={handleSendTicket}
                    disabled={ticketSending || ticketMessage.trim().length < 10}
                    style={{
                      width: '100%', padding: '13px', fontSize: '13px', fontWeight: 800,
                      borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: (ticketSending || ticketMessage.trim().length < 10) ? 0.5 : 1
                    }}
                  >
                    {ticketSending ? (
                      <span>Отправка...</span>
                    ) : (
                      <>
                        <SendIcon size={15} color="#05140d" />
                        <span>Отправить тикет</span>
                      </>
                    )}
                  </button>

                  <div style={{ fontSize: '11px', color: '#8a8f99', textAlign: 'center', lineHeight: '1.4' }}>
                    Среднее время ответа — 2–5 минут. Оператор напишет вам в Telegram.
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
