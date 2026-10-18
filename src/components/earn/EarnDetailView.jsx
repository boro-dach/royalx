import React from 'react';
import { APP_CONFIG } from '../../config';
import { 
  ChevronLeftIcon, 
  TelegramPaperPlaneIcon, 
  TikTokIcon, 
  CommentBubbleIcon 
} from '../common/Icons';

export default function EarnDetailView({ task, onBack }) {
  const botName = (APP_CONFIG.botUsername && APP_CONFIG.botUsername !== 'RoyalX_Bot') ? APP_CONFIG.botUsername : 'RXcasbot';
  const channelName = APP_CONFIG.channelUsername || 'RoyalX_Win';

  // Specific data for each earn method
  const earnConfig = {
    comment: {
      title: 'Напиши коммент',
      icon: <CommentBubbleIcon size={56} />,
      badge: 'до 1 000 ₽ в день',
      badgeClass: 'gold',
      themeClass: 'red',
      description: `За комментарии с @${channelName} под видео в TikTok и Shorts про Telegram, подарки и игры`,
      rates: [
        { label: '10 комментариев', value: '14 ₽' },
        { label: '100 комментариев', value: '105 ₽' },
        { label: '1 000 комментариев', value: '1 050 ₽' }
      ],
      note: 'Выплата от 10 комментариев на баланс RoyalX',
      steps: [
        `Привяжите свой TikTok в боте @${botName}`,
        `Пишите комментарии с @${channelName} под видео про Telegram и подарки`,
        'Присылайте в бот скриншоты и ссылки на комментарии',
        'После проверки выплата приходит на баланс RoyalX'
      ]
    },
    tiktok: {
      title: 'TikTok & Reels',
      icon: <TikTokIcon size={56} />,
      badge: 'до 2 000 $',
      badgeClass: 'cyan',
      themeClass: 'cyan',
      description: `Снимайте и выкладывайте короткие видео о заносах и играх в RoyalX с упоминанием @${channelName} и бота @${botName}`,
      rates: [
        { label: '1 000 просмотров', value: '25 ₽ ($0.30)' },
        { label: '10 000 просмотров', value: '250 ₽ ($3.00)' },
        { label: '100 000 просмотров', value: '3 000 ₽ ($35.00)' },
        { label: '1 000 000 просмотров', value: 'до 2 000 $' }
      ],
      note: 'Оплата начисляется за каждые 1 000 просмотров видео',
      steps: [
        'Создайте креативное видео про игру или выигрыш в RoyalX',
        `Добавьте в описание или комментарии отметку @${channelName} и бота @${botName}`,
        'Отправьте ссылку на опубликованное видео в бота отчетов',
        'Получайте выплаты на баланс по мере роста просмотров вашего видео'
      ]
    },
    nickname: {
      title: `Поставь в ник @${channelName}`,
      icon: <TelegramPaperPlaneIcon size={56} color="#2AABEE" />,
      badge: 'до 60 ₽ в день',
      badgeClass: 'blue',
      themeClass: 'blue',
      description: `Добавьте @${channelName} в свой никнейм или имя профиля в Telegram и получайте ежедневную награду`,
      rates: [
        { label: '1 день с ником', value: '60 ₽ ($0.70)' },
        { label: '7 дней с ником', value: '450 ₽ ($5.00)' },
        { label: '30 дней с ником', value: '2 000 ₽ ($22.00)' }
      ],
      note: 'Ежедневная автоматическая проверка статуса профиля через бота',
      steps: [
        `Зайдите в настройки Telegram и добавьте @${channelName} в имя профиля`,
        'Нажмите «Отправить отчет» в боте для фиксации вашего профиля',
        'Не убирайте отметку из ника в течение всего периода участия',
        'Ежедневно в 00:00 получайте начисление прямо на игровой баланс'
      ]
    }
  };

  const current = earnConfig[task?.id] || earnConfig.comment;

  const handleSendReport = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      } catch (e) {}
    }
    const reportUrl = `https://t.me/${botName}?start=earn_${task?.id || 'report'}`;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      try {
        window.Telegram.WebApp.openTelegramLink(reportUrl);
        return;
      } catch (e) {}
    }
    window.open(reportUrl, '_blank');
  };

  return (
    <div className="earn-detail-container">
      {/* Top Back Button */}
      <button className="earn-detail-back-btn" onClick={onBack}>
        <ChevronLeftIcon size={16} color="#e2e8f0" />
        <span>Назад к способам</span>
      </button>

      {/* Hero Header */}
      <div className="earn-detail-hero">
        <div className="earn-detail-icon-wrap">
          {current.icon}
        </div>
        <div className="earn-detail-title">{current.title}</div>
        <div className="earn-detail-badge-box">
          <span style={{ color: '#8e95a5', fontSize: '13px', fontWeight: '600' }}>до</span>
          <span className={current.badgeClass}>{current.badge.replace(/^до\s+/, '')}</span>
        </div>
        <div className="earn-detail-desc">{current.description}</div>
      </div>

      {/* Rates Table Card */}
      <div className="earn-rates-card">
        {current.rates.map((rate, idx) => (
          <div key={idx} className="earn-rate-row">
            <span className="earn-rate-label">{rate.label}</span>
            <span className="earn-rate-val">{rate.value}</span>
          </div>
        ))}
        <div className="earn-rate-note">{current.note}</div>
      </div>

      {/* Step by Step Guide */}
      <div className="earn-steps-list">
        {current.steps.map((stepText, idx) => (
          <div key={idx} className="earn-step-item">
            <div className={`earn-step-num ${current.themeClass}`}>
              {idx + 1}
            </div>
            <div className="earn-step-text">
              {stepText}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Report Button */}
      <button className="earn-report-btn" onClick={handleSendReport}>
        <TelegramPaperPlaneIcon size={20} color="#ffffff" />
        <span>Отправить отчет</span>
      </button>
    </div>
  );
}
