import React from 'react';
import { useApp } from './context/AppContext';

// Layout
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Preloader from './components/layout/Preloader';

// Tabs
import MainTab from './components/main/MainTab';
import PromosTab from './components/promos/PromosTab';
import CabinetTab from './components/cabinet/CabinetTab';

// Modals & Overlays
import FinanceModal from './components/modals/FinanceModal';
import HistoryModal from './components/modals/HistoryModal';
import SupportModal from './components/modals/SupportModal';
import ReferralModal from './components/modals/ReferralModal';
import PromocodeModal from './components/modals/PromocodeModal';
import StatsModal from './components/modals/StatsModal';
import RanksModal from './components/modals/RanksModal';
import AdminModal from './components/modals/AdminModal';
import TermsModal from './components/modals/TermsModal';
import SubscriptionModal from './components/modals/SubscriptionModal';
import GameOverlay from './components/games/GameOverlay';
import Toast from './components/common/Toast';
import { APP_CONFIG } from './config';

export default function App() {
  const { activeTab, activeModal, toast, isAdmin, tgUser } = useApp();
  const isUserAdmin = Boolean(isAdmin);

  return (
    <div className="app-container">
      {/* Real Preloader Screen */}
      <Preloader />

      {/* Top Header */}
      <Header />

      {/* Main Tab Content with Smooth Transition */}
      <div className="tab-page-wrapper" key={activeTab}>
        {activeTab === 'main' && <MainTab />}
        {activeTab === 'promos' && <PromosTab />}
        {activeTab === 'cabinet' && <CabinetTab />}
      </div>

      {/* Bottom Pinned Capsule Navigation */}
      <BottomNav />

      {/* Modals & Game Overlays */}
      {(activeModal === 'deposit' || activeModal === 'withdraw') && (
        <FinanceModal initialMode={activeModal} />
      )}
      {activeModal === 'history' && <HistoryModal />}
      {activeModal === 'support' && <SupportModal />}
      {activeModal === 'ref' && <ReferralModal />}
      {activeModal === 'promo' && <PromocodeModal />}
      {activeModal === 'stats' && <StatsModal />}
      {activeModal === 'ranks' && <RanksModal />}
      {activeModal === 'admin' && isUserAdmin && <AdminModal />}
      <GameOverlay />
      <TermsModal />
      <SubscriptionModal />

      {/* Minimalist Toast Notifications */}
      <Toast toast={toast} />
    </div>
  );
}
