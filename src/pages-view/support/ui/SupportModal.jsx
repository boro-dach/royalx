import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/shared/config';
import { CloseIcon, HeadphonesIcon } from '@/shared/ui/Icons';

const SUPPORT_TOPICS = [
  {
    id: 'deposit',
    title: 'Пополнение',
    icon: '💳',
    faqs: [
      {
        q: 'Как быстро зачисляются средства?',
        a: 'Пополнения через @CryptoBot, @xrocket и Lave Pay (@laveshka) зачисляются моментально. При прямом переводе USDT TRC-20 или TON зачисление происходит сразу после 1 подтверждения сети (обычно 1–3 минуты).'
      },
      {
        q: 'Что делать, если деньги не поступили на баланс?',
        a: 'Если в течение 5 минут баланс не обновился, нажмите кнопку «Связаться с оператором» внизу, укажите ваш ID и прикрепите TXID (хэш) или скриншот чека из бота.'
      },
      {
        q: 'Какая минимальная сумма депозита?',
        a: 'Минимальный депозит составляет всего $0.50 USDT через платежные боты и от $1.00 при пополнении через TON/TRC-20.'
      }
    ]
  },
  {
    id: 'withdraw',
    title: 'Вывод средств',
    icon: '💸',
    faqs: [
      {
        q: 'Каков регламент обработки заявок на вывод?',
        a: 'Автоматический вывод через CryptoBot чеками происходит моментально 24/7. Прямые переводы на кошельки USDT TRC-20 и TON занимают от 5 до 30 минут.'
      },
      {
        q: 'Есть ли комиссия за вывод?',
        a: 'Комиссия платформы составляет 0%. Вы получаете ровно ту сумму, которую указали в заявке на вывод.'
      },
      {
        q: 'Что такое вагер и нужно ли его отыгрывать?',
        a: 'Вагер накладывается только при активации специальных бонусов или промокодов. Проверить текущий прогресс отыгрыша можно в вашем Личном Кабинете.'
      }
    ]
  },
  {
    id: 'games',
    title: 'Игры и ставки',
    icon: '🎰',
    faqs: [
      {
        q: 'Как проверяется честность исходов (Provably Fair)?',
        a: 'Все исходы генерируются на сервере с прозрачным алгоритмом. Эмодзи-игры (Кубик, Дартс, Боулинг, Футбол, Баскетбол, Слоты) в WebApp и Telegram-боте выдают одинаковые результаты на базе Telegram Dice Engine.'
      },
      {
        q: 'Что произойдет, если прервётся интернет-соединение?',
        a: 'Каждая ставка регистрируется на защищённом сервере мгновенно. Если вы выиграли, выигрыш будет зачислен на ваш баланс, даже если приложение закрылось.'
      }
    ]
  },
  {
    id: 'promo',
    title: 'Бонусы и промо',
    icon: '🎁',
    faqs: [
      {
        q: 'Как активировать промокод?',
        a: 'Вы можете активировать промокод в разделе «Промокоды» в приложении либо отправив команду /promo ВАШ_КОД боту в Telegram.'
      },
      {
        q: 'Где брать секретные промокоды?',
        a: 'Свежие промокоды регулярно публикуются в нашем официальном Telegram-канале и в игровом чате сообщества.'
      }
    ]
  },
  {
    id: 'operator',
    title: 'Оператор 24/7',
    icon: '👤',
    faqs: [
      {
        q: 'В какое время работает поддержка?',
        a: 'Операторы службы поддержки дежурят круглосуточно без выходных. Среднее время первого ответа — 2–5 минут.'
      }
    ]
  }
];

export default function SupportModal() {
  const { closeModal, isClosingModal, showToast, tgUser } = useApp();
  const [activeTab, setActiveTab] = useState('deposit');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const currentUserId = tgUser?.id || '3982051';
  const userName = tgUser?.first_name || tgUser?.username || 'Игрок';
  const supportNick = APP_CONFIG.supportUsername || 'MartinCartier';

  const currentTopic = SUPPORT_TOPICS.find(t => t.id === activeTab) || SUPPORT_TOPICS[0];

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
    showToast(`Переход к оператору @${supportNick}...`);
    const prefilledText = `Здравствуйте! Мой ID: ${currentUserId}\nИмя: ${userName}\nТема обращения: «${currentTopic.title}»\nВопрос: `;
    const url = `https://t.me/${supportNick}?text=${encodeURIComponent(prefilledText)}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
    closeModal();
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
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(0, 230, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00e699'
            }}>
              <HeadphonesIcon size={16} color="#00e699" />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: '15px' }}>Центр Поддержки CG</div>
              <div style={{ fontSize: '11px', color: '#8a8f99' }}>Решаем любые вопросы 24/7</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* User ID Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8a8f99' }}>Ваш профиль в системе</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>ID: {currentUserId}</span>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(0, 230, 153, 0.15)',
                  color: '#00e699',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  Активен 🟢
                </span>
              </div>
            </div>
            <button
              type="button"
              className="preset-btn"
              onClick={handleCopyId}
              style={{ padding: '6px 12px', fontSize: '11px', width: 'auto' }}
            >
              📋 Скопировать
            </button>
          </div>

          {/* Category Tabs */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              ТЕМАТИКА ВОПРОСА
            </div>
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '2px'
            }}>
              {SUPPORT_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(topic.id);
                    setOpenFaqIndex(0);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: activeTab === topic.id ? '1px solid #00e699' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: activeTab === topic.id ? 'rgba(0, 230, 153, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    color: activeTab === topic.id ? '#00e699' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{topic.icon}</span>
                  <span>{topic.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ЧАСТЫЕ ВОПРОСЫ
            </div>
            {currentTopic.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      fontSize: '10px',
                      color: '#8a8f99'
                    }}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 14px 12px',
                      fontSize: '12px',
                      color: '#8a8f99',
                      lineHeight: '1.5',
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      paddingTop: '8px'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Agent CTA Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 230, 153, 0.08) 0%, rgba(20, 23, 33, 0.6) 100%)',
            border: '1px solid rgba(0, 230, 153, 0.25)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                Не нашли ответ на свой вопрос?
              </div>
              <span style={{ fontSize: '11px', color: '#00e699', fontWeight: 600 }}>
                ● Онлайн
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#8a8f99', lineHeight: '1.4' }}>
              Дежурный оператор ответит на ваше обращение в Telegram и поможет решить любую возникшую проблему.
            </div>
            <button
              type="button"
              className="banner-btn"
              onClick={handleContactSupport}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 800,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Связаться с оператором (@{supportNick})</span>
              <span>↗</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
