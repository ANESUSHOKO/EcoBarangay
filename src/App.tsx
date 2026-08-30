import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { User, Barangay, Language } from './types';
import { ThemeMode, getInitialTheme, setThemeMode } from './lib/theme';
import { Navbar, LocationSelectorModal, SegregationGuideModal, ProfileSettingsModal, MobileBottomNav, DeveloperInfoModal } from './components';
import {
  Code2,
  GraduationCap,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
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
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState<boolean>(false);

  // Sync theme to DOM
  useEffect(() => {
    setThemeMode(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial load
  useEffect(() => {
    // 1. Load initial barangay
    api.getBarangays().then(barangays => {
      if (barangays.length > 0) {
        const savedBrgyId = localStorage.getItem('ecobarangay_selected_barangay_id');
        const match = (savedBrgyId ? barangays.find(b => b.id === savedBrgyId) : null) || barangays[0];
        setCurrentBarangay(match);
      }
    }).catch(console.error);

    // 2. Check if a real user has an active session
    const savedUserId = localStorage.getItem('ecobarangay_current_user_id');
    if (savedUserId) {
      api.getUserProfile(savedUserId)
        .then(user => {
          if (user) {
            setCurrentUser(user);
            api.getBarangays().then(barangays => {
              const match = barangays.find(b => b.id === user.barangayId);
              if (match) setCurrentBarangay(match);
            }).catch(console.error);
          } else {
            localStorage.removeItem('ecobarangay_current_user_id');
          }
        })
        .catch(() => {
          localStorage.removeItem('ecobarangay_current_user_id');
        });
    }
  }, []);

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ecobarangay_current_user_id', user.id);
    } catch (e) {
      console.warn(e);
    }
    api.getBarangays().then(barangays => {
      const match = barangays.find(b => b.id === user.barangayId);
      if (match) setCurrentBarangay(match);
    }).catch(console.error);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ecobarangay_current_user_id');
    } catch (e) {
      console.warn(e);
    }
    setActiveTab('home');
  };

  const handleSelectBarangay = (b: Barangay) => {
    setCurrentBarangay(b);
    try {
      localStorage.setItem('ecobarangay_selected_barangay_id', b.id);
    } catch (e) {
      console.warn(e);
    }
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
        onOpenDeveloperInfo={() => setIsDeveloperModalOpen(true)}
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
            onOpenDeveloperInfo={() => setIsDeveloperModalOpen(true)}
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

            {/* Right: Pro Developer Card */}
            <div className="md:col-span-6 flex md:justify-end">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 max-w-md w-full shadow-lg shadow-black/20">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shrink-0 shadow-md shadow-emerald-900/40">
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-black text-sm">
                      <span className="bg-gradient-to-br from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                        ALS
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Code2 className="w-3 h-3" />
                      <span>Lead Software Engineer</span>
                    </div>
                    <div className="text-sm font-black text-white truncate">
                      Anesu Lancelot Shoko
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      shoko2314731@ceu.edu.ph
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeveloperModalOpen(true)}
                  className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95"
                  title="View Developer Credentials & Profile"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">View Profile</span>
                  <span className="sm:hidden">Info</span>
                </button>
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
        onOpenDeveloperInfo={() => setIsDeveloperModalOpen(true)}
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
        onEarnPoints={handleEarnPointsFromGuide}
      />

      <DeveloperInfoModal
        isOpen={isDeveloperModalOpen}
        onClose={() => setIsDeveloperModalOpen(false)}
      />

      {currentUser && (
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
          onOpenDeveloperInfo={() => {
            setIsProfileModalOpen(false);
            setIsDeveloperModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
