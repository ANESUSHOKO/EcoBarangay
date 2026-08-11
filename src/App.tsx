import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { User, Barangay, Language } from './types';
import { Navbar, LocationSelectorModal, SegregationGuideModal, MobileBottomNav } from './components';
import {
  HomePage,
  AuthPage,
  ResidentDashboard,
  OfficialDashboard,
  AdminDashboard,
  EcoMapPage,
  RankingsPage,
  ReportsPage,
  EventsChallengesPage,
  GarbageSchedulePage,
  CommunityFeedPage
} from './pages';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBarangay, setCurrentBarangay] = useState<Barangay | null>(null);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [lang, setLang] = useState<Language>('en');

  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    // Load default user (Maria Santos - Resident)
    api.login('resident@ecobarangay.ph')
      .then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          // Load default barangay
          api.getBarangays().then(barangays => {
            const match = barangays.find(b => b.id === res.user.barangayId) || barangays[0];
            setCurrentBarangay(match);
          }).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  const handleSwitchUser = async (email: string) => {
    try {
      const res = await api.login(email);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        // Sync active barangay to user's registered barangay
        const barangays = await api.getBarangays();
        const match = barangays.find(b => b.id === res.user.barangayId);
        if (match) setCurrentBarangay(match);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectBarangay = (b: Barangay) => {
    setCurrentBarangay(b);
  };

  const handleEarnPointsFromGuide = async (points: number, activityName: string) => {
    if (currentUser) {
      try {
        const res = await api.logWaste(currentUser.id, 0.1, activityName);
        if (res.success && res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRefreshBarangayData = async () => {
    if (currentBarangay) {
      const barangays = await api.getBarangays();
      const updated = barangays.find(b => b.id === currentBarangay.id);
      if (updated) setCurrentBarangay(updated);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        currentBarangay={currentBarangay}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onSwitchUser={handleSwitchUser}
        onLogout={() => setCurrentUser(null)}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'tl' : 'en'))}
        onSelectBarangayFromSearch={handleSelectBarangay}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20 md:pb-8">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={setActiveTab}
            onSelectBarangay={handleSelectBarangay}
            lang={lang}
          />
        )}

        {activeTab === 'feed' && (
          <CommunityFeedPage
            currentUser={currentUser}
            currentBarangay={currentBarangay}
            lang={lang}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'auth' && (
          <AuthPage
            onSuccess={user => {
              setCurrentUser(user);
              setActiveTab('dashboard');
            }}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            selectedBarangay={currentBarangay}
          />
        )}

        {activeTab === 'dashboard' && currentUser && currentBarangay && (
          <>
            {currentUser.role === 'RESIDENT' && (
              <ResidentDashboard
                currentUser={currentUser}
                currentBarangay={currentBarangay}
                onNavigate={setActiveTab}
                onUserUpdate={setCurrentUser}
                lang={lang}
              />
            )}

            {currentUser.role === 'BARANGAY_OFFICIAL' && (
              <OfficialDashboard
                currentUser={currentUser}
                currentBarangay={currentBarangay}
                onRefreshData={handleRefreshBarangayData}
              />
            )}

            {currentUser.role === 'SYSTEM_ADMIN' && (
              <AdminDashboard
                currentUser={currentUser}
                onRefreshData={handleRefreshBarangayData}
              />
            )}
          </>
        )}

        {activeTab === 'dashboard' && !currentUser && (
          <AuthPage
            onSuccess={user => {
              setCurrentUser(user);
              setActiveTab('dashboard');
            }}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            selectedBarangay={currentBarangay}
          />
        )}

        {activeTab === 'map' && currentBarangay && (
          <EcoMapPage
            currentBarangay={currentBarangay}
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {activeTab === 'rankings' && (
          <RankingsPage
            onSelectBarangay={handleSelectBarangay}
            onNavigate={setActiveTab}
            lang={lang}
          />
        )}

        {activeTab === 'reports' && currentBarangay && (
          <ReportsPage
            currentBarangay={currentBarangay}
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {activeTab === 'events' && currentBarangay && (
          <EventsChallengesPage
            currentBarangay={currentBarangay}
            currentUser={currentUser}
            onUserUpdate={setCurrentUser}
            lang={lang}
          />
        )}

        {activeTab === 'schedule' && currentBarangay && (
          <GarbageSchedulePage
            currentBarangay={currentBarangay}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mb-14 md:mb-0 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white text-sm">EcoBarangay Pilipinas</span>
            <span>• Compliant with Republic Act 9003</span>
          </div>
          <div className="text-slate-500 text-center sm:text-right">
            "Mas Malinis na Barangay, Mas Mataas na Ranking." © {new Date().getFullYear()} EcoBarangay Network.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentUser={currentUser}
        currentBarangay={currentBarangay}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onSwitchUser={handleSwitchUser}
        onLogout={() => setCurrentUser(null)}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'tl' : 'en'))}
      />

      {/* Modals */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectBarangay={handleSelectBarangay}
        currentBarangayId={currentBarangay?.id}
      />

      <SegregationGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onEarnPoints={handleEarnPointsFromGuide}
      />
    </div>
  );
}

export default App;
