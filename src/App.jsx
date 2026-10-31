import React from 'react';
import { useApp } from './context/AppContext';

// Widgets (layout)
import Header from './widgets/header/ui/Header';
import BottomNav from './widgets/bottom-nav/ui/BottomNav';
import Preloader from './widgets/preloader/ui/Preloader';

// Pages-view (tabs)
import MainTab from './pages-view/main/ui/MainTab';
import EarnTab from './features/earn/ui/EarnTab';
import PromosTab from './features/promo/ui/PromosTab';
import CabinetTab from './pages-view/cabinet/ui/CabinetTab';

// Features & pages-view (modals)
import FinanceModal from './features/finance/ui/FinanceModal';
import HistoryModal from './pages-view/history/ui/HistoryModal';
import SupportModal from './pages-view/support/ui/SupportModal';
import ReferralModal from './pages-view/referral/ui/ReferralModal';
import PromocodeModal from './features/promo/ui/PromocodeModal';
import StatsModal from './pages-view/stats/ui/StatsModal';
import RanksModal from './pages-view/ranks/ui/RanksModal';
import AdminModal from './features/admin/ui/AdminModal';
import TermsModal from './features/auth/ui/TermsModal';
import SubscriptionModal from './features/auth/ui/SubscriptionModal';
import GameOverlay from './widgets/game-overlay/ui/GameOverlay';
import Toast from './shared/ui/Toast';
import { APP_CONFIG } from './shared/config';

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
        {activeTab === 'earn' && <EarnTab />}
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
