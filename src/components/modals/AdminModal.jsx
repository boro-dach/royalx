import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import { CloseIcon, TrashIcon, TetherIcon } from '../common/Icons';
import './AdminModal.css';

export default function AdminModal() {
  const {
    closeModal,
    isClosingModal,
    balance,
    setBalance,
    addBalance,
    showToast,
    getCurrentRankInfo,
    RANKS_CONFIG,
    setUserRankLevel,
    passLevel,
    setUserPassLevel,
    accumulatedCashback,
    setAccumulatedCashback,
    adminSettings,
    updateAdminSettings,
    promocodes,
    addPromocode,
    deletePromocode,
    syncBalance,
    isAdminAuthed,
    setAdminAuthed,
    tgUser,
    userRtp,
    setUserRtp,
    getAuthHeaders
  } = useApp();

  const [activeTab, setActiveTab] = useState('database'); // database, withdrawals, games, promos, admins, balance
  const [balanceInput, setBalanceInput] = useState(balance);
  const [crashInput, setCrashInput] = useState(adminSettings.crashNextMult || '');
  const [pinCode, setPinCode] = useState('');

  // Promo form
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState('balance'); // 'balance' | 'deposit_bonus'
  const [promoAmount, setPromoAmount] = useState('50');
  const [promoMaxUses, setPromoMaxUses] = useState('100');
  const [promoMinTurnover, setPromoMinTurnover] = useState('0');

  // Database Management State
  const [dbStats, setDbStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalTurnover: 0,
    admins: [APP_CONFIG.superAdminId]
  });
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTab, setUserTab] = useState('games'); // 'games' | 'trans'
  const [inspectUserBalance, setInspectUserBalance] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [newAdminId, setNewAdminId] = useState('');
  const [directIdSearch, setDirectIdSearch] = useState('');

  // Stats editor form state
  const [editingStats, setEditingStats] = useState(false);
  const [statsForm, setStatsForm] = useState({
    totalTurnover: '',
    totalDeposited: '',
    totalWithdrawn: '',
    gamesPlayed: '',
    gamesWon: '',
    referralsCount: '',
    referralEarned: ''
  });

  const currentAdminId = tgUser?.id || APP_CONFIG.superAdminId;
  const { current: currentRank } = getCurrentRankInfo();

  // Load database overview and users
  const loadDbOverview = async () => {
    try {
      const res = await fetch(`/api/admin/db/overview?adminId=${currentAdminId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.stats) setDbStats(data.stats);
          if (data.users) setUsersList(data.users);
        }
      }
    } catch (e) {
      console.warn('Failed to load DB overview:', e);
    }
  };

  // Load withdrawals
  const loadWithdrawals = async () => {
    try {
      const res = await fetch(`/api/admin/db/withdrawals?adminId=${currentAdminId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.withdrawals)) {
          setWithdrawalsList(data.withdrawals);
        }
      }
    } catch (e) {}
  };

  // Treasury (Казна) State
  const [treasuryMethod, setTreasuryMethod] = useState('xrocket'); // 'xrocket' | 'cryptobot'
  const [treasuryAmount, setTreasuryAmount] = useState('100');
  const [treasuryInvoice, setTreasuryInvoice] = useState(null);
  const [isCreatingTreasuryInvoice, setIsCreatingTreasuryInvoice] = useState(false);
  const [isCheckingTreasuryInvoice, setIsCheckingTreasuryInvoice] = useState(false);
  const [manualTreasuryInput, setManualTreasuryInput] = useState('');

  const handleCreateTreasuryInvoice = async () => {
    const amt = parseFloat(treasuryAmount);
    if (isNaN(amt) || amt < 0.5) {
      showToast('❌ Минимальная сумма пополнения $0.50', true);
      return;
    }
    setIsCreatingTreasuryInvoice(true);
    try {
      const res = await fetch('/api/admin/treasury/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminId: currentAdminId,
          method: treasuryMethod,
          amount: amt
        })
      });
      const data = await res.json();
      if (data.success && data.payUrl) {
        setTreasuryInvoice(data);
        showToast(`✅ Счёт на $${amt.toFixed(2)} создан! Перейдите к оплате`);
      } else {
        showToast(data.error || 'Ошибка создания счёта', true);
      }
    } catch (e) {
      showToast('Сетевая ошибка при создании счёта', true);
    } finally {
      setIsCreatingTreasuryInvoice(false);
    }
  };

  const handleCheckTreasuryPayment = async (force = false) => {
    if (!treasuryInvoice) return;
    setIsCheckingTreasuryInvoice(true);
    try {
      const res = await fetch('/api/admin/treasury/check-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminId: currentAdminId,
          invoiceId: treasuryInvoice.invoiceId,
          method: treasuryInvoice.method,
          forceConfirm: force
        })
      });
      const data = await res.json();
      if (data.success && data.paid) {
        setDbStats(prev => ({ ...prev, treasury: data.treasury }));
        showToast(`🎉 Оплата подтверждена! Казна: $${data.treasury.toFixed(2)} USDT`);
        setTreasuryInvoice(null);
      } else {
        showToast(data.message || 'Оплата ещё не найдена в сети', true);
      }
    } catch (e) {
      showToast('Ошибка при проверке оплаты', true);
    } finally {
      setIsCheckingTreasuryInvoice(false);
    }
  };

  const handleSetTreasuryManual = async (newVal) => {
    const val = parseFloat(newVal);
    if (isNaN(val)) return;
    try {
      const res = await fetch('/api/admin/treasury/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminId: currentAdminId,
          amount: val
        })
      });
      const data = await res.json();
      if (data.success) {
        setDbStats(prev => ({ ...prev, treasury: data.treasury }));
        showToast(`🏛️ Казна изменена: $${data.treasury.toFixed(2)} USDT`);
        setManualTreasuryInput('');
      }
    } catch (e) {
      showToast('Ошибка обновления казны', true);
    }
  };

  useEffect(() => {
    if (isAdminAuthed) {
      loadDbOverview();
      loadWithdrawals();
    }
  }, [isAdminAuthed]);

  // Load full user info
  const handleInspectUser = async (targetUserId) => {
    const cleanId = String(targetUserId || '').trim();
    if (!cleanId) return;
    setIsLoadingUser(true);
    try {
      const res = await fetch(`/api/admin/db/user?adminId=${currentAdminId}&targetUserId=${cleanId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setSelectedUser(data.user);
          setInspectUserBalance(String(data.user.balance || 0));
          setEditingStats(false);
        }
      } else {
        showToast(`Пользователь с ID "${cleanId}" не найден в базе`, true);
      }
    } catch (e) {
      showToast('Ошибка загрузки данных игрока', true);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Universal user patch updater
  const handleUpdateUserField = async (patch, successMsg) => {
    if (!selectedUser) return;
    try {
      const res = await fetch('/api/admin/db/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminUserId: currentAdminId,
          targetUserId: selectedUser.id,
          patch
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setSelectedUser(prev => ({ ...prev, ...data.user }));
          if (patch.balance !== undefined) {
            setInspectUserBalance(String(data.user.balance));
          }
          showToast(successMsg || 'Данные игрока обновлены');
          loadDbOverview();
          if (String(selectedUser.id) === String(tgUser?.id)) {
            if (patch.balance !== undefined) setBalance(data.user.balance);
            if (patch.rtp !== undefined && setUserRtp) setUserRtp(data.user.rtp);
          }
        }
      }
    } catch (e) {
      showToast('Ошибка обновления пользователя', true);
    }
  };

  // Update user balance in DB
  const handleUpdateUserBalance = async (newBal) => {
    const val = parseFloat(newBal);
    if (isNaN(val)) return;
    handleUpdateUserField({ balance: val }, `Баланс игрока изменен: $${val.toFixed(2)}`);
  };

  // Stats editor handlers
  const handleOpenStatsEditor = () => {
    if (!selectedUser) return;
    setStatsForm({
      totalTurnover: String(selectedUser.totalTurnover || 0),
      cashback: String(selectedUser.cashback || 0),
      wagerRequired: String(selectedUser.wagerRequired || 0),
      totalDeposited: String(selectedUser.totalDeposited || 0),
      totalWithdrawn: String(selectedUser.totalWithdrawn || 0),
      gamesPlayed: String(selectedUser.gamesPlayed || 0),
      gamesWon: String(selectedUser.gamesWon || 0),
      referralsCount: String(selectedUser.referralsCount || 0),
      referralEarned: String(selectedUser.referralEarned || 0)
    });
    setEditingStats(prev => !prev);
  };

  const handleSaveStats = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const patch = {
      totalTurnover: parseFloat(statsForm.totalTurnover) || 0,
      cashback: parseFloat(statsForm.cashback) || 0,
      wagerRequired: parseFloat(statsForm.wagerRequired) || 0,
      totalDeposited: parseFloat(statsForm.totalDeposited) || 0,
      totalWithdrawn: parseFloat(statsForm.totalWithdrawn) || 0,
      gamesPlayed: parseInt(statsForm.gamesPlayed, 10) || 0,
      gamesWon: parseInt(statsForm.gamesWon, 10) || 0,
      referralsCount: parseInt(statsForm.referralsCount, 10) || 0,
      referralEarned: parseFloat(statsForm.referralEarned) || 0
    };
    handleUpdateUserField(patch, 'Статистика игрока успешно обновлена!');
    setEditingStats(false);
  };

  // Toggle user admin status
  const handleToggleAdminStatus = async (targetUserId, currentIsAdmin) => {
    const nextStatus = !currentIsAdmin;
    try {
      const res = await fetch('/api/admin/db/user/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminUserId: currentAdminId,
          targetUserId,
          isAdmin: nextStatus
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(nextStatus ? `Пользователь ${targetUserId} назначен администратором 👑` : `Админ-права сняты с ${targetUserId}`);
        setDbStats(prev => ({ ...prev, admins: data.admins }));
        if (selectedUser && selectedUser.id === targetUserId) {
          setSelectedUser(prev => ({ ...prev, isAdmin: nextStatus }));
        }
        loadDbOverview();
      } else {
        showToast(data.error || 'Ошибка назначения администратора', true);
      }
    } catch (e) {
      showToast('Ошибка связи с сервером', true);
    }
  };

  // Update withdrawal status
  const handleUpdateWithdrawalStatus = async (withdrawalId, status) => {
    try {
      const res = await fetch('/api/admin/db/withdrawals/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          adminUserId: currentAdminId,
          withdrawalId,
          status
        })
      });
      if (res.ok) {
        showToast(`Статус заявки обновлен: ${status}`);
        loadWithdrawals();
      }
    } catch (e) {
      showToast('Ошибка обновления статуса', true);
    }
  };

  const handleSaveBalance = () => {
    const val = parseFloat(balanceInput);
    if (isNaN(val)) return;
    syncBalance(val);
    showToast(`Баланс сохранен и синхронизирован: $${val.toFixed(2)}`);
  };

  const handleCreatePromo = (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const amt = parseFloat(promoAmount) || 10;
    const clean = promoCode.trim().toUpperCase();
    const maxUses = parseInt(promoMaxUses, 10) || 100;
    const minTurn = Math.max(0, parseFloat(promoMinTurnover) || 0);
    addPromocode({
      id: String(Date.now()),
      code: clean,
      type: promoType,
      amount: amt,
      percent: amt,
      usesLeft: maxUses,
      maxUses: maxUses,
      minTurnover: minTurn,
      active: true
    });
    fetch('/api/promocodes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        code: clean,
        type: promoType,
        amount: amt,
        percent: amt,
        maxUses: maxUses,
        minTurnover: minTurn
      })
    }).catch(() => {});
    setPromoCode('');
    setPromoMinTurnover('0');
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinCode === '2026' || pinCode === '777' || pinCode === 'admin') {
      setAdminAuthed(true);
      showToast('✅ Доступ разрешен!');
    } else {
      showToast('❌ Неверный PIN-код администратора', true);
    }
  };

  // Filter users by search
  const filteredUsers = usersList.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Админ-панель</span>
            <span className="admin-badge-cyan">Full DB</span>
          </div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        <div className="modal-body-clean">
          {!isAdminAuthed ? (
            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>🔒 Введите PIN-код администратора</div>
              <div style={{ fontSize: '12px', color: '#8a8f99' }}>
                Панель защищена. (PIN: 2026)
              </div>
              <input
                type="password"
                className="promo-input"
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
                placeholder="••••"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className="banner-btn" style={{ width: '100%', padding: '12px' }}>
                Войти в админку
              </button>
            </form>
          ) : (
            <>
              {/* Glowing Treasury Summary Header Card */}
              <div 
                className="admin-treasury-banner-card" 
                onClick={() => setActiveTab('treasury')} 
                style={{ cursor: 'pointer' }}
                title="Нажмите для перехода в управление казной"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🏛️</span>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8a8f99', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Текущая казна проекта
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: '#00e699', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TetherIcon size={15} />
                      <span>${parseFloat(dbStats.treasury !== undefined ? dbStats.treasury : 5000).toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>
                <button 
                  type="button"
                  className="preset-btn" 
                  style={{ fontSize: '11px', padding: '5px 12px', background: 'rgba(0, 230, 153, 0.15)', color: '#00e699', borderColor: 'rgba(0, 230, 153, 0.35)' }}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('treasury'); }}
                >
                  + Пополнить казну
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="admin-tabs-nav" style={{ overflowX: 'auto', padding: '4px' }}>
                <button 
                  className={`admin-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('database'); setSelectedUser(null); }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  👥 База Данных
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'treasury' ? 'active' : ''}`}
                  onClick={() => setActiveTab('treasury')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  🏛️ Казна
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('withdrawals')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  💸 Выводы
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'games' ? 'active' : ''}`}
                  onClick={() => setActiveTab('games')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  🎰 RTP
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'promos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('promos')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  🎁 Промо
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admins')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  👑 Админы
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
                  onClick={() => setActiveTab('balance')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  💳 Баланс
                </button>
              </div>

              {/* TAB 1: FULL DATABASE ACCESS & USERS */}
              {activeTab === 'database' && (
                <div className="admin-section">
                  {selectedUser ? (
                    /* USER DETAILS INSPECTOR */
                    <div className="admin-inspector-card">
                      <div className="admin-inspector-header">
                        <button className="admin-back-btn" onClick={() => setSelectedUser(null)}>
                          ← Назад к списку
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="preset-btn"
                            style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', color: selectedUser.isBanned ? '#00e699' : '#ff4d4d' }}
                            onClick={() => handleUpdateUserField({ isBanned: !selectedUser.isBanned }, selectedUser.isBanned ? 'Игрок разблокирован' : 'Игрок заблокирован!')}
                          >
                            {selectedUser.isBanned ? '✓ Разблокировать' : '🚫 Заблокировать'}
                          </button>
                          {String(selectedUser.id) === APP_CONFIG.superAdminId ? (
                            <span className="admin-badge-gold">👑 Создатель</span>
                          ) : (
                            <button
                              className="preset-btn"
                              style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', color: selectedUser.isAdmin ? '#ff4d4d' : '#00e699' }}
                              onClick={() => handleToggleAdminStatus(selectedUser.id, selectedUser.isAdmin)}
                            >
                              {selectedUser.isAdmin ? 'Снять админку' : '👑 Сделать админом'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* User Header Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="admin-user-avatar" style={{ width: '42px', height: '42px', fontSize: '16px' }}>
                          {selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{selectedUser.name || 'Пользователь'}</span>
                            {selectedUser.isBanned && <span style={{ fontSize: '10px', background: 'rgba(255, 77, 77, 0.2)', color: '#ff4d4d', padding: '2px 6px', borderRadius: '4px' }}>БАН</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8a8f99' }}>
                            Telegram ID: <span style={{ color: '#00e699', fontWeight: 600 }}>{selectedUser.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Personal User RTP Controls */}
                      <div className="admin-card-simple" style={{ background: 'rgba(255, 204, 0, 0.04)', borderColor: 'rgba(255, 204, 0, 0.2)' }}>
                        <div className="admin-card-title-simple">
                          <span>Персональный RTP игрока</span>
                          <span style={{ 
                            fontSize: '11px',
                            fontWeight: 700,
                            color: selectedUser.rtp === 'win' ? '#00e699' : selectedUser.rtp === 'lose' ? '#ff4d4d' : '#8a8f99'
                          }}>
                            {selectedUser.rtp === 'win' ? '🟢 ВИН (ВСЕГДА ПОБЕДА)' : selectedUser.rtp === 'lose' ? '🔴 СЛИВ (ПРОИГРЫШ)' : '⚖️ АВТО (ЧЕСТНО)'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          <button 
                            className={`admin-tag-btn ${(!selectedUser.rtp || selectedUser.rtp === 'auto') ? 'active' : ''}`}
                            onClick={() => handleUpdateUserField({ rtp: 'auto' }, 'RTP: Честный режим (Авто)')}
                          >
                            Авто
                          </button>
                          <button 
                            className={`admin-tag-btn ${selectedUser.rtp === 'win' ? 'active' : ''}`}
                            style={{ borderColor: selectedUser.rtp === 'win' ? '#00e699' : '' }}
                            onClick={() => handleUpdateUserField({ rtp: 'win' }, 'RTP: Подкрутка на выигрыш включена 🟢')}
                          >
                            Вин (Победа)
                          </button>
                          <button 
                            className={`admin-tag-btn ${selectedUser.rtp === 'lose' ? 'active' : ''}`}
                            style={{ borderColor: selectedUser.rtp === 'lose' ? '#ff4d4d' : '' }}
                            onClick={() => handleUpdateUserField({ rtp: 'lose' }, 'RTP: Подкрутка на слив включена 🔴')}
                          >
                            Слив (Луз)
                          </button>
                        </div>
                      </div>

                      {/* Financial Balance Controls (Балик) */}
                      <div className="admin-card-simple" style={{ background: 'rgba(0, 230, 153, 0.04)', borderColor: 'rgba(0, 230, 153, 0.2)' }}>
                        <div className="admin-card-title-simple">
                          <span>Управление балансом (Балик)</span>
                          <span style={{ color: '#00e699', fontWeight: 700, fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <TetherIcon size={14} /> {parseFloat(selectedUser.balance || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="admin-row">
                          <input 
                            type="number"
                            step="0.1"
                            className="promo-input"
                            style={{ flex: 1 }}
                            placeholder="Сумма USDT"
                            value={inspectUserBalance}
                            onChange={e => setInspectUserBalance(e.target.value)}
                          />
                          <button 
                            className="banner-btn"
                            style={{ width: 'auto', padding: '10px 14px', borderRadius: '12px' }}
                            onClick={() => handleUpdateUserBalance(inspectUserBalance)}
                          >
                            Задать
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {[10, 50, 100, 500, 1000].map(amt => (
                            <button 
                              key={amt}
                              className="preset-btn"
                              style={{ flex: 1, minWidth: '48px', padding: '6px 0', fontSize: '11px' }}
                              onClick={() => handleUpdateUserBalance((parseFloat(selectedUser.balance || 0) + amt).toFixed(2))}
                            >
                              +{amt}
                            </button>
                          ))}
                          {[-10, -50, -100].map(amt => (
                            <button 
                              key={amt}
                              className="preset-btn"
                              style={{ flex: 1, minWidth: '48px', padding: '6px 0', fontSize: '11px', color: '#ff9999' }}
                              onClick={() => handleUpdateUserBalance(Math.max(0, parseFloat(selectedUser.balance || 0) + amt).toFixed(2))}
                            >
                              {amt}
                            </button>
                          ))}
                          <button 
                            className="preset-btn"
                            style={{ flex: 1, minWidth: '60px', padding: '6px 0', fontSize: '11px', color: '#ff4d4d' }}
                            onClick={() => handleUpdateUserBalance(0)}
                          >
                            Сбросить (0)
                          </button>
                        </div>
                      </div>

                      {/* Stats Editor Toggle & Section (Стата) */}
                      <div className="admin-card-simple">
                        <div className="admin-card-title-simple">
                          <span>Статистика игрока (Стата)</span>
                          <button 
                            className="preset-btn"
                            style={{ width: 'auto', padding: '3px 10px', fontSize: '10px' }}
                            onClick={handleOpenStatsEditor}
                          >
                            {editingStats ? '✕ Закрыть редактор' : '✏️ Редактировать стату'}
                          </button>
                        </div>

                        {editingStats ? (
                          <form onSubmit={handleSaveStats} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Оборот (USDT)</div>
                                <input 
                                  type="number"
                                  step="0.1"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.totalTurnover}
                                  onChange={e => setStatsForm({ ...statsForm, totalTurnover: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Кэшбэк (USDT)</div>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.cashback}
                                  onChange={e => setStatsForm({ ...statsForm, cashback: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Депозиты (USDT)</div>
                                <input 
                                  type="number"
                                  step="0.1"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.totalDeposited}
                                  onChange={e => setStatsForm({ ...statsForm, totalDeposited: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Выводы (USDT)</div>
                                <input 
                                  type="number"
                                  step="0.1"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.totalWithdrawn}
                                  onChange={e => setStatsForm({ ...statsForm, totalWithdrawn: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Сыграно игр</div>
                                <input 
                                  type="number"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.gamesPlayed}
                                  onChange={e => setStatsForm({ ...statsForm, gamesPlayed: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Выиграно игр</div>
                                <input 
                                  type="number"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.gamesWon}
                                  onChange={e => setStatsForm({ ...statsForm, gamesWon: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Рефералов (чел)</div>
                                <input 
                                  type="number"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.referralsCount}
                                  onChange={e => setStatsForm({ ...statsForm, referralsCount: e.target.value })}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#8a8f99', marginBottom: '2px' }}>Отыгрыш ($)</div>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="promo-input"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={statsForm.wagerRequired}
                                  onChange={e => setStatsForm({ ...statsForm, wagerRequired: e.target.value })}
                                />
                              </div>
                            </div>
                            <button 
                              type="submit"
                              className="banner-btn"
                              style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '4px' }}
                            >
                              ✓ Сохранить статистику в БД
                            </button>
                          </form>
                        ) : (
                          <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Оборот ставок</span>
                              <span className="admin-stat-value">${parseFloat(selectedUser.totalTurnover || 0).toFixed(2)}</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Депозитов всего</span>
                              <span className="admin-stat-value" style={{ color: '#00e699' }}>${parseFloat(selectedUser.totalDeposited || 0).toFixed(2)}</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Выводов всего</span>
                              <span className="admin-stat-value" style={{ color: '#ff4d4d' }}>${parseFloat(selectedUser.totalWithdrawn || 0).toFixed(2)}</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Игры (Вин / Всего)</span>
                              <span className="admin-stat-value">
                                {selectedUser.gamesWon || 0} / {selectedUser.gamesPlayed || 0} 
                                <span style={{ fontSize: '11px', color: '#8a8f99', marginLeft: '4px' }}>
                                  ({selectedUser.gamesPlayed > 0 ? Math.round(((selectedUser.gamesWon || 0) / selectedUser.gamesPlayed) * 100) : 0}%)
                                </span>
                              </span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Рефералов</span>
                              <span className="admin-stat-value">{selectedUser.referralsCount || 0} чел.</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Доход с рефералов</span>
                              <span className="admin-stat-value" style={{ color: '#00e699' }}>${parseFloat(selectedUser.referralEarned || 0).toFixed(2)}</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Кэшбэк</span>
                              <span className="admin-stat-value" style={{ color: '#00e699' }}>${parseFloat(selectedUser.cashback || 0).toFixed(2)}</span>
                            </div>
                            <div className="admin-stat-card">
                              <span className="admin-stat-label">Отыгрыш (Wager)</span>
                              <span className="admin-stat-value" style={{ color: parseFloat(selectedUser.wagerRequired || 0) > 0 ? '#ffb300' : '#00e699' }}>
                                ${parseFloat(selectedUser.wagerRequired || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* User History Sub-tabs */}
                      <div className="admin-subnav">
                        <button 
                          className={`admin-subtab-btn ${userTab === 'games' ? 'active' : ''}`}
                          onClick={() => setUserTab('games')}
                        >
                          🎮 История игр ({Array.isArray(selectedUser.history) ? selectedUser.history.filter(h => h.type === 'game').length : 0})
                        </button>
                        <button 
                          className={`admin-subtab-btn ${userTab === 'trans' ? 'active' : ''}`}
                          onClick={() => setUserTab('trans')}
                        >
                          💳 Депозиты и Выводы ({Array.isArray(selectedUser.history) ? selectedUser.history.filter(h => h.type !== 'game').length : 0})
                        </button>
                      </div>

                      {/* Sub-tab 1: GAME BETS HISTORY */}
                      {userTab === 'games' && (
                        <div className="admin-history-scroll">
                          {Array.isArray(selectedUser.history) && selectedUser.history.filter(h => h.type === 'game').length > 0 ? (
                            selectedUser.history.filter(h => h.type === 'game').map(item => (
                              <div key={item.id} className="admin-history-item">
                                <div>
                                  <div className="admin-history-title">{item.title}</div>
                                  <div className="admin-history-meta">{item.time}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div className={item.amount >= 0 ? 'admin-amount-positive' : 'admin-amount-negative'}>
                                    {item.amount >= 0 ? `+$${parseFloat(item.amount).toFixed(2)}` : `-$${Math.abs(parseFloat(item.amount)).toFixed(2)}`}
                                  </div>
                                  <div style={{ fontSize: '9px', color: item.status === 'ВЫИГРЫШ' ? '#00e699' : '#8a8f99' }}>
                                    {item.status}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', padding: '16px', color: '#8a8f99', fontSize: '12px' }}>
                              Пользователь пока не совершал ставок в играх
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-tab 2: DEPOSITS & WITHDRAWALS */}
                      {userTab === 'trans' && (
                        <div className="admin-history-scroll">
                          {Array.isArray(selectedUser.history) && selectedUser.history.filter(h => h.type !== 'game').length > 0 ? (
                            selectedUser.history.filter(h => h.type !== 'game').map(item => (
                              <div key={item.id} className="admin-history-item">
                                <div>
                                  <div className="admin-history-title">{item.title}</div>
                                  <div className="admin-history-meta">{item.time}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div className={item.amount >= 0 ? 'admin-amount-positive' : 'admin-amount-negative'}>
                                    {item.amount >= 0 ? `+$${parseFloat(item.amount).toFixed(2)}` : `-$${Math.abs(parseFloat(item.amount)).toFixed(2)}`}
                                  </div>
                                  <div style={{ fontSize: '9px', color: '#00e699' }}>
                                    {item.status}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', padding: '16px', color: '#8a8f99', fontSize: '12px' }}>
                              Нет истории пополнений и выводов
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* DATABASE OVERVIEW & SEARCH */
                    <>
                      {/* Global Overview KPI Cards */}
                      <div className="admin-stats-grid">
                        <div className="admin-stat-card">
                          <span className="admin-stat-label">👥 Всего игроков</span>
                          <span className="admin-stat-value neon">{dbStats.totalUsers}</span>
                        </div>
                        <div className="admin-stat-card">
                          <span className="admin-stat-label">🔄 Общий оборот</span>
                          <span className="admin-stat-value">${dbStats.totalTurnover.toFixed(2)}</span>
                        </div>
                        <div className="admin-stat-card">
                          <span className="admin-stat-label">📥 Все депозиты</span>
                          <span className="admin-stat-value" style={{ color: '#00e699' }}>${dbStats.totalDeposited.toFixed(2)}</span>
                        </div>
                        <div className="admin-stat-card">
                          <span className="admin-stat-label">📤 Все выводы</span>
                          <span className="admin-stat-value" style={{ color: '#ff4d4d' }}>${dbStats.totalWithdrawn.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Direct ID Management Jump */}
                      <form 
                        onSubmit={(e) => { 
                          e.preventDefault(); 
                          if (directIdSearch.trim()) {
                            handleInspectUser(directIdSearch.trim()); 
                          }
                        }} 
                        style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                      >
                        <input 
                          type="text" 
                          className="promo-input" 
                          placeholder="⚡ Ввести Telegram ID для управления..." 
                          value={directIdSearch} 
                          onChange={e => setDirectIdSearch(e.target.value)} 
                          style={{ flex: 1, padding: '9px 12px', fontSize: '12px' }}
                        />
                        <button 
                          type="submit" 
                          className="banner-btn" 
                          disabled={isLoadingUser}
                          style={{ width: 'auto', padding: '9px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        >
                          {isLoadingUser ? '...' : 'Управлять'}
                        </button>
                      </form>

                      {/* Search Bar */}
                      <div className="admin-search-box">
                        <span style={{ fontSize: '14px' }}>🔍</span>
                        <input 
                          type="text"
                          className="admin-search-input"
                          placeholder="Фильтр списка по ID или имени..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            className="modal-close-btn" 
                            style={{ width: '20px', height: '20px' }} 
                            onClick={() => setSearchQuery('')}
                          >
                            <CloseIcon size={10} color="#8a8f99" />
                          </button>
                        )}
                      </div>

                      {/* User List */}
                      <div className="admin-card-simple" style={{ padding: '8px' }}>
                        <div className="admin-card-title-simple" style={{ padding: '4px 6px' }}>
                          <span>Пользователи базы ({filteredUsers.length})</span>
                          <button 
                            className="preset-btn"
                            style={{ width: 'auto', padding: '2px 8px', fontSize: '10px' }}
                            onClick={loadDbOverview}
                          >
                            Обновить
                          </button>
                        </div>

                        <div className="admin-users-list">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                              <div 
                                key={u.id} 
                                className="admin-user-item"
                                onClick={() => handleInspectUser(u.id)}
                              >
                                <div className="admin-user-avatar">
                                  {u.name ? u.name[0].toUpperCase() : 'U'}
                                </div>
                                <div className="admin-user-info">
                                  <div className="admin-user-name">
                                    <span>{u.name || 'Пользователь'}</span>
                                    {String(u.id) === APP_CONFIG.superAdminId && <span className="admin-badge-gold">👑 Создатель</span>}
                                    {u.isAdmin && String(u.id) !== APP_CONFIG.superAdminId && <span className="admin-badge-cyan">Админ</span>}
                                  </div>
                                  <div className="admin-user-meta">
                                    <span>ID: {u.id}</span>
                                    <span>•</span>
                                    <span>Игр: {u.gamesPlayed || 0}</span>
                                    <span>•</span>
                                    <span>Оборот: ${parseFloat(u.totalTurnover || 0).toFixed(0)}</span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#00e699', fontWeight: 700, fontSize: '13px' }}>
                                    ${parseFloat(u.balance || 0).toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#8a8f99' }}>
                                    Открыть →
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#8a8f99', fontSize: '12px' }}>
                              Пользователи не найдены
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: WITHDRAWAL REQUESTS */}
              {activeTab === 'withdrawals' && (
                <div className="admin-section">
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Заявки на вывод средств ({withdrawalsList.length})</span>
                      <button 
                        className="preset-btn"
                        style={{ width: 'auto', padding: '2px 8px', fontSize: '10px' }}
                        onClick={loadWithdrawals}
                      >
                        Обновить
                      </button>
                    </div>

                    {withdrawalsList.length > 0 ? (
                      <div className="admin-history-scroll" style={{ maxHeight: '340px' }}>
                        {withdrawalsList.map(w => (
                          <div key={w.id} className="admin-history-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: '#ffffff' }}>ID: {w.userId}</span>
                                <span style={{ fontSize: '10px', color: '#8a8f99', marginLeft: '6px' }}>
                                  ({w.method === 'xrocket' ? 'xRocket' : 'CryptoBot'})
                                </span>
                              </div>
                              <span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: '14px' }}>
                                -${parseFloat(w.amount).toFixed(2)}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#8a8f99', wordBreak: 'break-all' }}>
                              Адрес: <span style={{ color: '#ffffff' }}>{w.address || 'Внутренний перевод'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#8a8f99' }}>
                                {w.createdAt ? new Date(w.createdAt).toLocaleString('ru-RU') : ''}
                              </span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  className="preset-btn"
                                  style={{ width: 'auto', padding: '3px 8px', fontSize: '10px', color: '#00e699' }}
                                  onClick={() => handleUpdateWithdrawalStatus(w.id, 'ВЫПЛАЧЕНО')}
                                >
                                  ✓ Выплачено
                                </button>
                                <button 
                                  className="preset-btn"
                                  style={{ width: 'auto', padding: '3px 8px', fontSize: '10px', color: '#ff4d4d' }}
                                  onClick={() => handleUpdateWithdrawalStatus(w.id, 'ОТКЛОНЕНО')}
                                >
                                  Отклонить
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#8a8f99', fontSize: '12px' }}>
                        Нет активных заявок на вывод средств
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ADMIN ROLES & ASSIGNMENTS */}
              {activeTab === 'admins' && (
                <div className="admin-section">
                  {/* Add Admin Form */}
                  <form 
                    className="admin-card-simple"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newAdminId.trim()) return;
                      handleToggleAdminStatus(newAdminId.trim(), false);
                      setNewAdminId('');
                    }}
                  >
                    <div className="admin-card-title-simple">Назначить администратора</div>
                    <div className="admin-row">
                      <input 
                        type="text"
                        className="promo-input"
                        style={{ flex: 1 }}
                        placeholder={`Telegram ID (например: ${APP_CONFIG.superAdminId})`}
                        value={newAdminId}
                        onChange={e => setNewAdminId(e.target.value)}
                      />
                      <button 
                        type="submit"
                        className="banner-btn"
                        style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px' }}
                      >
                        + Добавить
                      </button>
                    </div>
                  </form>

                  {/* Admins List */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">Список администраторов ({(dbStats.admins || []).length})</div>
                    <div className="admin-history-scroll">
                      {(dbStats.admins || [APP_CONFIG.superAdminId]).map(adminId => (
                        <div key={adminId} className="admin-history-item">
                          <div>
                            <div className="admin-history-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>ID: {adminId}</span>
                              {String(adminId) === APP_CONFIG.superAdminId ? (
                                <span className="admin-badge-gold">👑 Создатель</span>
                              ) : (
                                <span className="admin-badge-cyan">Админ</span>
                              )}
                            </div>
                          </div>
                          <div>
                            {String(adminId) !== APP_CONFIG.superAdminId && (
                              <button 
                                className="modal-close-btn"
                                style={{ width: '26px', height: '26px' }}
                                onClick={() => handleToggleAdminStatus(adminId, true)}
                              >
                                <TrashIcon size={12} color="#ff4d4d" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GAMES & RTP */}
              {activeTab === 'games' && (
                <div className="admin-section">
                  {/* Global RTP */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">Общий режим отдачи</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      <button 
                        className={`admin-tag-btn ${adminSettings.globalRtp === 'normal' ? 'active' : ''}`}
                        onClick={() => { updateAdminSettings({ globalRtp: 'normal' }); showToast('Честный режим ⚖️'); }}
                      >
                        Честный
                      </button>
                      <button 
                        className={`admin-tag-btn ${adminSettings.globalRtp === 'casino' ? 'active' : ''}`}
                        style={{ border: adminSettings.globalRtp === 'casino' ? '1px solid #00e699' : undefined, color: adminSettings.globalRtp === 'casino' ? '#00e699' : undefined }}
                        onClick={() => { updateAdminSettings({ globalRtp: 'casino' }); showToast('Среднее: Казино всегда в плюсе 💰'); }}
                      >
                        Среднее (казино в +)
                      </button>
                      <button 
                        className={`admin-tag-btn ${adminSettings.globalRtp === 'win' ? 'active' : ''}`}
                        onClick={() => { updateAdminSettings({ globalRtp: 'win' }); showToast('Всегда победа 🟢'); }}
                      >
                        Победа
                      </button>
                      <button 
                        className={`admin-tag-btn ${adminSettings.globalRtp === 'lose' ? 'active' : ''}`}
                        onClick={() => { updateAdminSettings({ globalRtp: 'lose' }); showToast('Проигрыш 🔴'); }}
                      >
                        Проигрыш
                      </button>
                    </div>
                  </div>

                  {/* RTP Percentage Control */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Настройка шансов RTP</span>
                      <span style={{ color: '#00e699', fontSize: '12px', fontWeight: '800' }}>
                        {adminSettings.targetRtpPercent || 80}%
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '8px', lineHeight: '1.4' }}>
                      При <b>{adminSettings.targetRtpPercent || 80}% RTP</b> с депозита $100 алгоритм выдаст около ${(100 * ((adminSettings.targetRtpPercent || 80) / 100)).toFixed(0)}, казино всегда остаётся в стабильном плюсе.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                      {[60, 70, 80, 85, 90, 95].map(pct => (
                        <button
                          key={pct}
                          className={`preset-btn ${(adminSettings.targetRtpPercent || 80) === pct ? 'active' : ''}`}
                          style={{ padding: '6px 0', fontSize: '11px', fontWeight: '700' }}
                          onClick={() => {
                            updateAdminSettings({ targetRtpPercent: pct });
                            showToast(`Шансы RTP заданы: ${pct}% 📊`);
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crash Next Mult */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Краш: следующий множитель</span>
                      <span style={{ color: '#00e699', fontSize: '11px' }}>
                        {adminSettings.crashNextMult ? `${adminSettings.crashNextMult}x` : 'Авто'}
                      </span>
                    </div>
                    <div className="admin-row">
                      <div className="amount-input-wrapper" style={{ flex: 1, margin: 0 }}>
                        <span className="currency-symbol">x</span>
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="Авто"
                          className="amount-input"
                          value={crashInput}
                          onChange={e => setCrashInput(e.target.value)}
                        />
                      </div>
                      <button 
                        className="banner-btn"
                        style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px' }}
                        onClick={() => {
                          const val = parseFloat(crashInput);
                          if (val && val >= 1.05) {
                            updateAdminSettings({ crashNextMult: val });
                            fetch('/api/crash/admin-multiplier', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ multiplier: val })
                            }).catch(() => {});
                            showToast(`Множитель задан: ${val}x`);
                          } else {
                            updateAdminSettings({ crashNextMult: null });
                            fetch('/api/crash/admin-multiplier', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ multiplier: null })
                            }).catch(() => {});
                            setCrashInput('');
                            showToast('Сброшено на авто');
                          }
                        }}
                      >
                        Задать
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[2.0, 5.0, 10.0, 50.0, 100.0].map(m => (
                        <button 
                          key={m}
                          className="preset-btn"
                          style={{ flex: 1, padding: '4px 0', fontSize: '11px' }}
                          onClick={() => {
                            setCrashInput(String(m));
                            updateAdminSettings({ crashNextMult: m });
                            fetch('/api/crash/admin-multiplier', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ multiplier: m })
                            }).catch(() => {});
                            showToast(`Краш: ${m}x`);
                          }}
                        >
                          {m}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mines, Dice, Blackjack Controls */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">Игры: Мины, Дайс, Блэкджек</div>
                    
                    {/* Mines */}
                    <div className="admin-toggle-item">
                      <div>
                        <div className="admin-toggle-text">Минёр: исход игры (RTP)</div>
                        <div style={{ fontSize: '10px', color: '#8a8f99' }}>Умный шанс попадания на мину</div>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[
                          { id: 'auto', label: 'Авто' },
                          { id: 'casino', label: 'Казино +' },
                          { id: 'win', label: 'Вин' },
                          { id: 'lose', label: 'Луз' }
                        ].map(item => (
                          <button 
                            key={item.id}
                            className={`admin-tag-btn ${(adminSettings.minesRtp || 'auto') === item.id ? 'active' : ''}`}
                            style={{ padding: '4px 6px', fontSize: '10px' }}
                            onClick={() => {
                              updateAdminSettings({ minesRtp: item.id });
                              showToast(`Мины: ${item.label}`);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blackjack Dealer Wins */}
                    <div className="admin-toggle-item">
                      <div>
                        <div className="admin-toggle-text">Блэкджек: везёт только дилеру</div>
                        <div style={{ fontSize: '10px', color: '#8a8f99' }}>Дилеру чётко падают 20-21 и блэкджеки</div>
                      </div>
                      <button 
                        className={`preset-btn ${adminSettings.bjDealerWin ? 'active' : ''}`}
                        style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => {
                          const next = !adminSettings.bjDealerWin;
                          updateAdminSettings({ bjDealerWin: next, bjDealerBust: false });
                          showToast(next ? 'Блэкджек: только дилеру везёт 🃏' : 'Блэкджек: авто-режим');
                        }}
                      >
                        {adminSettings.bjDealerWin ? 'ВКЛ' : 'ВЫКЛ'}
                      </button>
                    </div>

                    {/* Dice */}
                    <div className="admin-toggle-item">
                      <div>
                        <div className="admin-toggle-text">Дайс: форсировать исход</div>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[
                          { id: 'auto', label: 'Авто' },
                          { id: 'casino', label: 'Казино +' },
                          { id: 'win', label: 'Вин' },
                          { id: 'lose', label: 'Луз' }
                        ].map(item => (
                          <button 
                            key={item.id}
                            className={`admin-tag-btn ${(adminSettings.diceForceResult || 'auto') === item.id ? 'active' : ''}`}
                            style={{ padding: '4px 6px', fontSize: '10px' }}
                            onClick={() => updateAdminSettings({ diceForceResult: item.id })}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Upgrader */}
                    <div className="admin-toggle-item">
                      <div>
                        <div className="admin-toggle-text">Апгрейдер: исход игры (RTP)</div>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[
                          { id: 'auto', label: 'Авто' },
                          { id: 'casino', label: 'Казино +' },
                          { id: 'win', label: 'Вин' },
                          { id: 'lose', label: 'Луз' }
                        ].map(item => (
                          <button 
                            key={item.id}
                            className={`admin-tag-btn ${(adminSettings.upgraderRtp || 'auto') === item.id ? 'active' : ''}`}
                            style={{ padding: '4px 6px', fontSize: '10px' }}
                            onClick={() => {
                              updateAdminSettings({ upgraderRtp: item.id });
                              showToast(`Апгрейдер: ${item.label}`);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mystery Boxes */}
                    <div className="admin-toggle-item">
                      <div>
                        <div className="admin-toggle-text">Боксы: исход игры (RTP)</div>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[
                          { id: 'auto', label: 'Авто' },
                          { id: 'casino', label: 'Казино +' },
                          { id: 'win', label: 'Вин' },
                          { id: 'lose', label: 'Луз' }
                        ].map(item => (
                          <button 
                            key={item.id}
                            className={`admin-tag-btn ${(adminSettings.boxesRtp || 'auto') === item.id ? 'active' : ''}`}
                            style={{ padding: '4px 6px', fontSize: '10px' }}
                            onClick={() => {
                              updateAdminSettings({ boxesRtp: item.id });
                              showToast(`Боксы: ${item.label}`);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROMOCODES */}
              {activeTab === 'promos' && (
                <div className="admin-section">
                  <form className="admin-card-simple" onSubmit={handleCreatePromo}>
                    <div className="admin-card-title-simple">Создать промокод</div>
                    
                    {/* Promo Type Selector */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      <button
                        type="button"
                        className={`preset-btn ${promoType === 'balance' ? 'active' : ''}`}
                        style={{ flex: 1, padding: '7px 0', fontSize: '11px', fontWeight: '600' }}
                        onClick={() => setPromoType('balance')}
                      >
                        💵 На баланс ($)
                      </button>
                      <button
                        type="button"
                        className={`preset-btn ${promoType === 'deposit_bonus' ? 'active' : ''}`}
                        style={{ flex: 1, padding: '7px 0', fontSize: '11px', fontWeight: '600' }}
                        onClick={() => setPromoType('deposit_bonus')}
                      >
                        📈 +% к пополнению
                      </button>
                    </div>

                    <div className="admin-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <input 
                        type="text"
                        className="promo-input"
                        style={{ flex: '2 1 120px', padding: '10px 14px' }}
                        placeholder="КОД (напр. ROYAL50)"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                      />
                      <div style={{ flex: '1 1 90px', position: 'relative' }}>
                        <input 
                          type="number"
                          className="promo-input"
                          style={{ width: '100%', padding: '10px 14px' }}
                          placeholder={promoType === 'deposit_bonus' ? '% бонуса' : '$ сумма'}
                          value={promoAmount}
                          onChange={e => setPromoAmount(e.target.value)}
                        />
                      </div>
                      <div style={{ flex: '1 1 85px' }}>
                        <input 
                          type="number"
                          className="promo-input"
                          style={{ width: '100%', padding: '10px 14px' }}
                          placeholder="Лимит"
                          title="Количество активаций"
                          value={promoMaxUses}
                          onChange={e => setPromoMaxUses(e.target.value)}
                        />
                      </div>
                      <div style={{ flex: '1 1 95px' }}>
                        <input 
                          type="number"
                          className="promo-input"
                          style={{ width: '100%', padding: '10px 14px' }}
                          placeholder="Оборот $"
                          title="Минимальный оборот ставок для активации ($) (0 = без ограничений)"
                          value={promoMinTurnover}
                          onChange={e => setPromoMinTurnover(e.target.value)}
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="banner-btn"
                        style={{ width: 'auto', padding: '10px 18px', borderRadius: '12px' }}
                      >
                        + Создать
                      </button>
                    </div>
                  </form>

                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">Список промокодов ({promocodes.length})</div>
                    <table className="admin-table-simple">
                      <thead>
                        <tr>
                          <th>Код</th>
                          <th>Тип & Бонус</th>
                          <th>Мин. оборот</th>
                          <th>Активаций</th>
                          <th>Удалить</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promocodes.map(p => {
                          const isDepBonus = p.type === 'deposit_bonus';
                          const val = isDepBonus ? `+${p.percent || p.amount}% к депу` : `$${parseFloat(p.amount || 0).toFixed(2)}`;
                          const minTurn = parseFloat(p.minTurnover || 0);
                          return (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600, color: '#ffffff' }}>{p.code}</td>
                              <td>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  background: isDepBonus ? 'rgba(0, 204, 255, 0.15)' : 'rgba(0, 230, 153, 0.15)',
                                  color: isDepBonus ? '#00ccff' : '#00e699'
                                }}>
                                  {val}
                                </span>
                              </td>
                              <td>
                                {minTurn > 0 ? (
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: 'rgba(255, 170, 0, 0.15)',
                                    color: '#ffaa00'
                                  }}>
                                    от ${minTurn.toFixed(0)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#8a8f99' }}>Любой</span>
                                )}
                              </td>
                              <td style={{ fontSize: '11px', color: '#8a8f99' }}>
                                {p.usesLeft !== undefined ? `${p.usesLeft} / ${p.maxUses || 100}` : 'Активен'}
                              </td>
                              <td>
                                <button 
                                  className="modal-close-btn"
                                  style={{ width: '26px', height: '26px' }}
                                  onClick={() => deletePromocode(p.id, p.code)}
                                >
                                  <TrashIcon size={12} color="#ff4d4d" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: CURRENT ADMIN BALANCE */}
              {activeTab === 'balance' && (
                <div className="admin-section">
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Мой баланс</span>
                      <span style={{ color: '#00e699', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <TetherIcon size={14} /> {balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="admin-row">
                      <input 
                        type="number"
                        className="promo-input"
                        style={{ flex: 1 }}
                        placeholder="Сумма баланса"
                        value={balanceInput}
                        onChange={e => setBalanceInput(e.target.value)}
                      />
                      <button 
                        className="banner-btn"
                        style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px' }}
                        onClick={handleSaveBalance}
                      >
                        ОК
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[50, 100, 500, 1000].map(amt => (
                        <button 
                          key={amt}
                          className="preset-btn"
                          style={{ flex: 1, padding: '6px 0', fontSize: '11px' }}
                          onClick={() => { addBalance(amt, `+${amt}$`); setBalanceInput(balance + amt); }}
                        >
                          +${amt}
                        </button>
                      ))}
                      <button 
                        className="preset-btn"
                        style={{ flex: 1, padding: '6px 0', fontSize: '11px', color: '#ff4d4d' }}
                        onClick={() => { syncBalance(0); setBalanceInput(0); showToast('Баланс обнулен'); }}
                      >
                        Сброс
                      </button>
                    </div>
                  </div>

                  {/* Rank */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Ранг: {currentRank.fullName} ({currentRank.shortName})</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                      {RANKS_CONFIG.map((r, i) => (
                        <button 
                          key={r.level}
                          className={`preset-btn ${currentRank.level === r.level ? 'active' : ''}`}
                          style={{ padding: '6px 0', fontSize: '10px' }}
                          onClick={() => setUserRankLevel(i + 1)}
                        >
                          {r.shortName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: КАЗНА (TREASURY MANAGEMENT & TOP-UP VIA XROCKET & CRYPTOBOT) */}
              {activeTab === 'treasury' && (
                <div className="admin-section">
                  {/* Hero Treasury Display */}
                  <div className="admin-treasury-hero">
                    <div style={{ fontSize: '11px', color: '#8a8f99', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      🏛️ Текущая казна проекта
                    </div>
                    <div className="admin-treasury-hero-val">
                      <TetherIcon size={24} />
                      <span>${parseFloat(dbStats.treasury !== undefined ? dbStats.treasury : 5000).toFixed(2)} USDT</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8a8f99', marginTop: '6px' }}>
                      Резервный фонд проекта для мгновенных выплат и выигрышей
                    </div>
                  </div>

                  {/* Manual Quick Adjust Box */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Ручная корректировка казны</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="number"
                        className="promo-input"
                        style={{ flex: 1 }}
                        placeholder="Задать точную сумму USDT"
                        value={manualTreasuryInput}
                        onChange={e => setManualTreasuryInput(e.target.value)}
                      />
                      <button 
                        type="button"
                        className="banner-btn"
                        style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px' }}
                        onClick={() => handleSetTreasuryManual(manualTreasuryInput)}
                      >
                        Задать
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {[100, 500, 1000, 5000].map(amt => (
                        <button 
                          key={amt}
                          type="button"
                          className="preset-btn"
                          style={{ flex: 1, minWidth: '55px', padding: '6px 0', fontSize: '11px' }}
                          onClick={() => handleSetTreasuryManual((parseFloat(dbStats.treasury !== undefined ? dbStats.treasury : 5000) + amt).toFixed(2))}
                        >
                          +{amt}$
                        </button>
                      ))}
                      {[-100, -500].map(amt => (
                        <button 
                          key={amt}
                          type="button"
                          className="preset-btn"
                          style={{ flex: 1, minWidth: '55px', padding: '6px 0', fontSize: '11px', color: '#ff9999' }}
                          onClick={() => handleSetTreasuryManual(Math.max(0, parseFloat(dbStats.treasury !== undefined ? dbStats.treasury : 5000) + amt).toFixed(2))}
                        >
                          {amt}$
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Up Treasury via xRocket & CryptoBot */}
                  <div className="admin-card-simple">
                    <div className="admin-card-title-simple">
                      <span>Пополнить казну (xRocket / CryptoBot)</span>
                    </div>

                    {!treasuryInvoice ? (
                      <div>
                        <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '8px' }}>
                          1. Выберите платёжную систему:
                        </div>
                        <div className="admin-method-cards-grid">
                          <div 
                            className={`admin-method-card ${treasuryMethod === 'xrocket' ? 'active' : ''}`}
                            onClick={() => setTreasuryMethod('xrocket')}
                          >
                            <img src="/xrocket.jpg" alt="xRocket" decoding="async" />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>xRocket Pay</div>
                              <div style={{ fontSize: '10px', color: '#8a8f99' }}>TON / USDT</div>
                            </div>
                          </div>
                          <div 
                            className={`admin-method-card ${treasuryMethod === 'cryptobot' ? 'active' : ''}`}
                            onClick={() => setTreasuryMethod('cryptobot')}
                          >
                            <img src="/cryptobot-avatar.jpg" alt="CryptoBot" decoding="async" />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>CryptoBot</div>
                              <div style={{ fontSize: '10px', color: '#8a8f99' }}>CryptoPay API</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#8a8f99', marginBottom: '8px' }}>
                          2. Сумма пополнения (USDT):
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <input 
                            type="number"
                            className="promo-input"
                            placeholder="100"
                            value={treasuryAmount}
                            onChange={e => setTreasuryAmount(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px' }}>
                          {['10', '50', '100', '250', '500', '1000'].map(p => (
                            <button 
                              key={p} 
                              type="button"
                              className={`preset-btn ${treasuryAmount === p ? 'active' : ''}`}
                              onClick={() => setTreasuryAmount(p)}
                              style={{ padding: '6px 0', fontSize: '10px' }}
                            >
                              ${p}
                            </button>
                          ))}
                        </div>

                        <button 
                          type="button"
                          className="banner-btn"
                          style={{ width: '100%', padding: '12px' }}
                          disabled={isCreatingTreasuryInvoice}
                          onClick={handleCreateTreasuryInvoice}
                        >
                          {isCreatingTreasuryInvoice ? 'Создание счёта...' : `⚡ Создать счёт на $${parseFloat(treasuryAmount || 0).toFixed(2)} USDT`}
                        </button>
                      </div>
                    ) : (
                      /* Invoice Created View */
                      <div className="admin-treasury-invoice-box">
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#00e699' }}>
                          ✅ Счёт #{treasuryInvoice.invoiceId} создан!
                        </div>
                        <div style={{ fontSize: '12px', color: '#ffffff' }}>
                          К оплате: <strong style={{ color: '#00e699' }}>${parseFloat(treasuryInvoice.amount).toFixed(2)} USDT</strong> через {treasuryInvoice.method === 'xrocket' ? 'xRocket Pay' : 'CryptoBot'}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="banner-btn"
                            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00e699 0%, #00b4d8 100%)' }}
                            onClick={() => {
                              const url = treasuryInvoice.payUrl;
                              if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
                                window.Telegram.WebApp.openTelegramLink(url);
                              } else {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            💳 Оплатить в {treasuryInvoice.method === 'xrocket' ? '@xrocket' : '@CryptoBot'}
                          </button>

                          <button
                            type="button"
                            className="preset-btn"
                            style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                            disabled={isCheckingTreasuryInvoice}
                            onClick={() => handleCheckTreasuryPayment(false)}
                          >
                            {isCheckingTreasuryInvoice ? 'Проверка...' : '🔄 Проверить оплату'}
                          </button>

                          <button
                            type="button"
                            className="preset-btn"
                            style={{ width: '100%', padding: '8px', fontSize: '11px', color: '#38ef7d', borderColor: 'rgba(56, 239, 125, 0.4)' }}
                            onClick={() => handleCheckTreasuryPayment(true)}
                          >
                            ⚡ Зачислить сразу (тестовая симуляция)
                          </button>

                          <button
                            type="button"
                            className="preset-btn"
                            style={{ width: '100%', padding: '6px', fontSize: '11px', color: '#8a8f99' }}
                            onClick={() => setTreasuryInvoice(null)}
                          >
                            ✕ Отменить / создать другой
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
