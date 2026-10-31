import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/shared/config';
import { 
  TikTokIcon, 
  TelegramPaperPlaneIcon, 
  CommentBubbleIcon, 
  Gift3DIcon, 
  ChevronDownIcon, 
  RubleIcon,
  TetherIcon
} from '@/shared/ui/Icons';
import EarnDetailView from './EarnDetailView';
import './EarnTab.css';

export default function EarnTab() {
  const { setActiveModal, referralStats, showToast, tgUser } = useApp();
  const [selectedTask, setSelectedTask] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const faqRef = useRef(null);

  const channelName = APP_CONFIG.channelUsername || 'RoyalX_Win';
  const botName = (APP_CONFIG.botUsername && APP_CONFIG.botUsername !== 'RoyalX_Bot') ? APP_CONFIG.botUsername : 'RXcasbot';

  // Referral total earned
  const earnedAmount = referralStats?.earned || 0.00;

  // 1. Earning Methods (without BetBoom, strictly adhering to user instructions)
  const earnMethods = [
    {
      id: 'tiktok',
      title: 'TikTok',
      badge: 'до 2 000 $',
      className: 'tiktok',
      icon: <TikTokIcon size={26} />
    },
    {
      id: 'nickname',
      title: `Поставь в ник @${channelName}`,
      badge: 'до 10 $ в неделю',
      className: 'nickname',
      icon: <TelegramPaperPlaneIcon size={26} color="#2AABEE" />
    },
    {
      id: 'comment',
      title: 'Напиши коммент',
      badge: 'до 1 000 ₽ в день',
      className: 'comment',
      icon: <CommentBubbleIcon size={30} />
    }
  ];

  // FAQ Items
  const faqItems = [
    {
      id: 'steps',
      question: 'Как проходить этапы / выполнять задания',
      answer: 'Выберите любой доступный способ заработка, нажмите на него и ознакомьтесь с подробными условиями и сеткой выплат. Выполните указанные действия и отправьте отчет в Telegram-бота. После быстрой проверки награда начисляется сразу на ваш игровой баланс.'
    },
    {
      id: 'screenshot',
      question: 'Зачем скриншот',
      answer: 'Скриншот или прямая ссылка подтверждают факт размещения комментария, видеоролика или изменения никнейма в вашем профиле Telegram. Это позволяет модераторам быстро проверить выполнение и зачислить выплату.'
    },
    {
      id: 'wheel',
      question: 'Колесо удачи и бонусы',
      answer: 'За активное выполнение заданий и приглашение друзей вы получаете дополнительные вращения Колеса Удачи, повышенный ранг и билеты на регулярные денежные розыгрыши RoyalX.'
    },
    {
      id: 'reward',
      question: 'Куда приходит награда',
      answer: 'Все заработанные средства мгновенно поступают на ваш реальный игровой баланс RoyalX. Вы можете использовать их для ставок во всех играх или сразу вывести в USDT, TON, CryptoBot или xRocket.'
    },
    {
      id: 'speed',
      question: 'Сроки проверки отчетов',
      answer: 'Проверка отчетов модераторами обычно занимает от 5 до 30 минут. Выплата начисляется автоматически сразу после одобрения.'
    }
  ];

  const handleToggleFaq = (id) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } catch (e) {}
    }
    setOpenFaq(prev => prev === id ? null : id);
  };

  const handleScrollToFaq = () => {
    if (faqRef.current) {
      faqRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenReferral = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      } catch (e) {}
    }
    setActiveModal('ref');
  };

  // If a task is selected, render the dedicated explanation / detail page
  if (selectedTask) {
    return (
      <EarnDetailView 
        task={selectedTask} 
        onBack={() => setSelectedTask(null)} 
      />
    );
  }

  return (
    <div className="earn-tab-container">
      {/* 1. Earning Methods List (without BetBoom) */}
      <div className="earn-methods-list">
        {earnMethods.map((method) => (
          <div 
            key={method.id} 
            className={`earn-method-card ${method.className}`}
            onClick={() => setSelectedTask(method)}
          >
            <div className="earn-method-left">
              <div className="earn-method-icon-box">
                {method.icon}
              </div>
              <div className="earn-method-title">{method.title}</div>
            </div>
            <div className={`earn-badge ${method.className}`}>
              {method.badge}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Section: How to get more (Referral card) */}
      <div className="earn-section-title">Как получить ещё</div>

      <div className="earn-referral-card">
        <div className="earn-referral-header">
          <Gift3DIcon size={32} />
          <div className="earn-referral-header-title">Пригласить друга</div>
        </div>

        <div className="earn-referral-list">
          <div className="earn-referral-item">
            <span className="earn-referral-label">За регистрацию друга</span>
            <span className="earn-referral-value" style={{ color: '#00e699' }}>+10 ₽ ($0.10)</span>
          </div>
          <div className="earn-referral-item">
            <span className="earn-referral-label">За друга второго уровня</span>
            <span className="earn-referral-value" style={{ color: '#00e699' }}>+5 ₽ ($0.05)</span>
          </div>
          <div className="earn-referral-item">
            <span className="earn-referral-label">От дохода RoyalX с игры друзей</span>
            <span className="earn-referral-value" style={{ color: '#38bdf8' }}>10 %</span>
          </div>
        </div>

        <button className="earn-referral-btn" onClick={handleOpenReferral}>
          Пригласить друзей
        </button>
      </div>

      {/* 3. Earnings Summary Card */}
      <div className="earn-summary-card">
        <div className="earn-summary-left">
          <div className="earn-summary-icon">
            <RubleIcon size={26} color="#7b88aa" />
          </div>
          <div>
            <div className="earn-summary-amount">
              {earnedAmount > 0 ? `${(earnedAmount * 95).toFixed(0)} ₽` : '0 ₽'}
            </div>
            <div className="earn-summary-label">получено</div>
          </div>
        </div>
        <button className="earn-terms-btn" onClick={handleScrollToFaq}>
          Условия
        </button>
      </div>

      {/* 4. FAQ / Questions Accordion */}
      <div className="earn-section-title" ref={faqRef}>Вопросы</div>

      <div className="earn-faq-card">
        {faqItems.map((item) => {
          const isOpen = openFaq === item.id;
          return (
            <div key={item.id} className="earn-faq-item">
              <div 
                className="earn-faq-question" 
                onClick={() => handleToggleFaq(item.id)}
              >
                <span className="earn-faq-title">{item.question}</span>
                <span className={`earn-faq-chevron ${isOpen ? 'open' : ''}`}>
                  <ChevronDownIcon size={18} />
                </span>
              </div>
              {isOpen && (
                <div className="earn-faq-answer">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
