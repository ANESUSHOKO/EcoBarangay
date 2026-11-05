import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { User, Barangay, Language } from './types';
import { ThemeMode, getInitialTheme, setThemeMode } from './lib/theme';
import { auth } from './lib/firebase';
import { hasSystemAdminCapabilities } from './server/accessControl';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Navbar, LocationSelectorModal, SegregationGuideModal, ProfileSettingsModal, MobileBottomNav } from './components';
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
  const [officeView, setOfficeView] = useState<'operations' | 'administration'>('operations');

  // Initial tab from URL hash if available
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '').trim();
    const validTabs = ['home', 'feed', 'auth', 'dashboard', 'map', 'rankings', 'reports', 'events', 'schedule'];
    return validTabs.includes(hash) ? hash : 'home';
  };

  const [activeTab, setActiveTabState] = useState<string>(() => getTabFromHash());
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Set active tab and sync with browser URL/history
  const setActiveTab = (tab: string, replace = false) => {
    setActiveTabState(tab);
    const targetHash = `#${tab}`;
    if (window.location.hash !== targetHash) {
      if (replace) {
        window.history.replaceState({ tab }, '', targetHash);
      } else {
        window.history.pushState({ tab }, '', targetHash);
      }
    }
  };

  // Browser navigation / Back button listener (TC_LOGOUT_02)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromHash();
      const savedUserId = localStorage.getItem('ecobarangay_current_user_id');

      // If user is logged out and tries to access dashboard via back/forward buttons, redirect to auth
      if (tab === 'dashboard' && (!currentUser && !savedUserId)) {
        window.history.replaceState({ tab: 'auth' }, '', '#auth');
        setActiveTabState('auth');
      } else {
        setActiveTabState(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Sync theme to DOM
  useEffect(() => {
    setThemeMode(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial load
  useEffect(() => {
    const savedBrgyId = localStorage.getItem('ecobarangay_selected_barangay_id');
    const initialBarangay = savedBrgyId
      ? api.getBarangayById(savedBrgyId).then(barangay => {
          if (barangay) setCurrentBarangay(barangay);
        })
      : api.getBarangays().then(barangays => {
          if (barangays[0]) setCurrentBarangay(barangays[0]);
        });
    void initialBarangay.catch(console.error);

    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setCurrentUser(null);
        localStorage.removeItem('ecobarangay_current_user_id');
        if (window.location.hash === '#dashboard') {
          window.history.replaceState({ tab: 'auth' }, '', '#auth');
          setActiveTabState('auth');
        }
        return;
      }

      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        setOfficeView(user.role === 'SYSTEM_ADMIN' ? 'administration' : 'operations');
        localStorage.setItem('ecobarangay_current_user_id', user.id);
        const barangay = await api.getBarangayById(user.barangayId);
        if (barangay) setCurrentBarangay(barangay);
      } catch (error) {
        console.error('Unable to restore the authenticated user profile:', error);
        setCurrentUser(null);
        localStorage.removeItem('ecobarangay_current_user_id');
      }
    });
  }, []);

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    setOfficeView(user.role === 'SYSTEM_ADMIN' ? 'administration' : 'operations');
    try {
      localStorage.setItem('ecobarangay_current_user_id', user.id);
    } catch (e) {
      console.warn(e);
    }
    api.getBarangayById(user.barangayId).then(barangay => {
      if (barangay) setCurrentBarangay(barangay);
    }).catch(console.error);
    setActiveTab('dashboard');
  };

  // TC_LOGOUT_02: Invalidate session and replace browser history to prevent unauthorized access via back button
  const handleLogout = () => {
    void signOut(auth).catch(console.error);
    setCurrentUser(null);
    try {
      localStorage.removeItem('ecobarangay_current_user_id');
    } catch (e) {
      console.warn(e);
    }
    // Replace URL and state with home
    window.history.replaceState({ tab: 'home' }, '', '#home');
    setActiveTabState('home');
  };

  const handleSelectBarangay = (b: Barangay) => {
    setCurrentBarangay(b);
    try {
      localStorage.setItem('ecobarangay_selected_barangay_id', b.id);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSegregationQuizSubmit = async (answerIndex: number) => {
    if (!currentUser) throw new Error('Sign in before submitting a quiz for review.');
    await api.submitSegregationQuiz(answerIndex);
  };

  const handleRefreshBarangayData = async () => {
    if (currentBarangay) {
      const updated = await api.getBarangayById(currentBarangay.id);
      if (updated) setCurrentBarangay(updated);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200 overflow-x-hidden w-full">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        currentBarangay={currentBarangay}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'tl' : 'en'))}
        onSelectBarangayFromSearch={handleSelectBarangay}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-8 overflow-x-hidden min-w-0">
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
            onSuccess={handleUserLogin}
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

            {hasSystemAdminCapabilities(currentUser) && (
              <section className="space-y-5">
                <div role="tablist" aria-label="Barangay Office dashboard" className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={officeView === 'operations'}
                    onClick={() => setOfficeView('operations')}
                    className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${officeView === 'operations' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                  >
                    Barangay operations
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={officeView === 'administration'}
                    onClick={() => setOfficeView('administration')}
                    className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${officeView === 'administration' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                  >
                    Platform administration
                  </button>
                </div>
                {officeView === 'operations' ? (
                  <OfficialDashboard
                    currentUser={currentUser}
                    currentBarangay={currentBarangay}
                    onRefreshData={handleRefreshBarangayData}
                  />
                ) : (
                  <AdminDashboard
                    currentUser={currentUser}
                  />
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'dashboard' && !currentUser && (
          <AuthPage
            onSuccess={handleUserLogin}
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
            currentUser={currentUser}
            lang={lang}
            onNavigate={setActiveTab}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mb-14 md:mb-0 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Main Footer Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-between">
            {/* Left: Branding & Compliance */}
            <div className="md:col-span-6 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base tracking-tight">EcoBarangay Pilipinas</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  RA 9003 Compliant
                </span>
              </div>
              <p className="text-slate-400 text-xs max-w-md leading-relaxed">
                National Solid Waste Governance & Community Gamification System. Promoting transparent, fair, and verified environmental performance across Philippine barangays.
              </p>
              <div className="text-slate-500 text-[11px] font-medium pt-1">
                "Mas Malinis na Barangay, Mas Mataas na Ranking." © {new Date().getFullYear()} EcoBarangay Network.
              </div>
            </div>

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
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'tl' : 'en'))}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
        onSubmitQuiz={handleSegregationQuizSubmit}
      />

      {currentUser && (
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
        />
      )}
    </div>
  );
}

export default App;
