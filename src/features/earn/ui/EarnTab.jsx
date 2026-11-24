import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import EarnProofModal from './EarnProofModal';
import './EarnTab.css';

const TASK_LABELS = {
  tiktok: '🎬 TikTok & Reels',
  nickname: '✈️ Ник в Telegram',
  comment: '💬 Комментарии',
  other: '📋 Другое'
};

export default function EarnTab() {
  const { setActiveModal, referralStats, showToast, tgUser, getAuthHeaders } = useApp();
  const [selectedTask, setSelectedTask] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [myProofs, setMyProofs] = useState([]);
  const [isLoadingProofs, setIsLoadingProofs] = useState(false);
  const faqRef = useRef(null);

  const channelName = APP_CONFIG.channelUsername || 'RoyalX_Win';
  const currentUserId = tgUser?.id || '3982051';

  const loadMyProofs = useCallback(async () => {
    setIsLoadingProofs(true);
    try {
      const res = await fetch(`/api/earn/proofs?userId=${encodeURIComponent(currentUserId)}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.proofs)) {
        setMyProofs(data.proofs);
      }
    } catch (e) {
      // silent
    } finally {
      setIsLoadingProofs(false);
    }
  }, [currentUserId, getAuthHeaders]);

  useEffect(() => {
    loadMyProofs();
  }, [loadMyProofs]);

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
      answer: 'Выберите любой доступный способ заработка, ознакомьтесь с условиями и сеткой выплат. Выполните действия и нажмите «Отправить пруф» прямо здесь во вкладке «Заработок». После проверки награда начисляется на ваш игровой баланс.'
    },
    {
      id: 'screenshot',
      question: 'Зачем скриншот',
      answer: 'Скриншот или прямая ссылка подтверждают факт размещения комментария, видеоролика или изменения никнейма в вашем профиле Telegram. Это позволяет модераторам быстро проверить выполнение и зачислить выплату.'
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
        onProofSubmitted={loadMyProofs}
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

      {/* 1.5 Proofs Submission & History Section */}
      <div className="earn-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📸 Пруфы и отчёты</span>
        <button
          type="button"
          onClick={() => setShowProofModal(true)}
          style={{
            background: 'linear-gradient(135deg, #00e699 0%, #00b87a 100%)',
            color: '#05140d',
            border: 'none',
            borderRadius: '10px',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          + Отправить пруф
        </button>
      </div>

      <div className="earn-referral-card" style={{ gap: '10px' }}>
        {isLoadingProofs ? (
          <div style={{ fontSize: '12px', color: '#8a8f99', textAlign: 'center', padding: '10px 0' }}>
            Загрузка ваших пруфов...
          </div>
        ) : myProofs.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#8a8f99', lineHeight: '1.45', textAlign: 'center', padding: '6px 0' }}>
            Вы ещё не отправляли пруфы. Выполните любое задание выше и прикрепите скриншот или ссылку!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myProofs.slice(0, 5).map((p) => {
              const statusColor = p.status === 'approved' ? '#00e699' : p.status === 'rejected' ? '#ff6b6b' : '#facc15';
              const statusBg = p.status === 'approved' ? 'rgba(0,230,153,0.14)' : p.status === 'rejected' ? 'rgba(255,77,77,0.14)' : 'rgba(250,204,21,0.14)';
              const statusLabel = p.status === 'approved' ? '✅ Одобрен' : p.status === 'rejected' ? '❌ Отклонён' : '⏳ На проверке';
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{TASK_LABELS[p.taskType] || '📋 Задание'}</span>
                      {p.hasImage && <span style={{ fontSize: '11px', opacity: 0.75 }}>🖼️</span>}
                    </div>
                    {p.caption && (
                      <div style={{ fontSize: '11px', color: '#8a8f99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {p.caption}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                      {new Date(p.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '8px',
                    background: statusBg,
                    color: statusColor,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
      {showProofModal && (
        <EarnProofModal
          initialTask="tiktok"
          onClose={() => setShowProofModal(false)}
          onSuccess={loadMyProofs}
        />
      )}
    </div>
  );
}
