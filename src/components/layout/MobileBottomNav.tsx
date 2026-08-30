import React, { useState } from 'react';
import { User, Barangay, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { ThemeMode } from '../../lib/theme';
import {
  Home,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Trophy,
  Menu,
  X,
  MapPin,
  BookOpen,
  Map,
  Clock,
  User as UserIcon,
  Globe,
  ChevronRight,
  ShieldCheck,
  Building2,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Code2,
  LayoutDashboard,
  Settings,
  PlusCircle,
  Award,
  Navigation,
  CheckCircle2,
  Leaf
} from 'lucide-react';

interface MobileBottomNavProps {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLocationModal: () => void;
  onOpenGuideModal: () => void;
  onOpenProfileSettings?: () => void;
  onOpenDeveloperInfo?: () => void;
  onLogout?: () => void;
  lang: Language;
  onToggleLang: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  currentBarangay,
  activeTab,
  setActiveTab,
  onOpenLocationModal,
  onOpenGuideModal,
  onOpenProfileSettings,
  onOpenDeveloperInfo,
  onLogout,
  lang,
  onToggleLang,
  theme = 'light',
  onToggleTheme,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = (key: any) => getTranslation(lang, key);

  // Main 5 navigation touch targets on the bottom dock
  const mainBottomTabs = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'feed', label: t('navFeed'), icon: MessageSquare },
    { id: 'map', label: t('navMap'), icon: Map },
    { id: 'reports', label: t('navReports'), icon: AlertTriangle },
    { id: 'rankings', label: t('navRankings'), icon: Trophy },
  ];

  // Full module list for the expanded mobile command drawer
  const allModules = [
    {
      id: 'home',
      label: t('navHome'),
      subtitle: 'Overview, Impact & News',
      icon: Home,
      color: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'dashboard',
      label: t('navDashboard'),
      subtitle: currentUser ? 'My Performance & Points' : 'Official & Resident Portal',
      icon: LayoutDashboard,
      color: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300',
    },
    {
      id: 'feed',
      label: t('navFeed'),
      subtitle: 'Community Posts & Updates',
      icon: MessageSquare,
      color: 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300',
    },
    {
      id: 'map',
      label: t('navMap'),
      subtitle: 'Recycling Hubs & MRF Finder',
      icon: Map,
      color: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300',
    },
    {
      id: 'schedule',
      label: t('navSchedule'),
      subtitle: 'Truck Timetable & Calendar',
      icon: Clock,
      color: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'reports',
      label: t('navReports'),
      subtitle: 'Civic Environmental Watch',
      icon: AlertTriangle,
      color: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'events',
      label: t('navEvents'),
      subtitle: 'Cleanups & Eco Challenges',
      icon: Calendar,
      color: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'rankings',
      label: t('navRankings'),
      subtitle: 'National Cleanliness League',
      icon: Trophy,
      color: 'bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-300',
    },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  const isMoreTabActive = ['schedule', 'dashboard', 'events', 'auth'].includes(activeTab);

  return (
    <>
      {/* 1. Fixed Bottom Navigation Bar (Mobile / Tablet up to md screens) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-2xl px-1.5 py-1 flex items-center justify-around transition-colors duration-200"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        id="mobile-bottom-dock"
      >
        {mainBottomTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all select-none ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id={`mobile-nav-${tab.id}`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              </div>
              <span
                className={`text-[10px] leading-tight mt-0.5 truncate max-w-[58px] ${
                  isActive
                    ? 'font-black text-emerald-700 dark:text-emerald-400'
                    : 'font-semibold text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Dynamic Menu / Hub Trigger */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all select-none ${
            isMenuOpen || isMoreTabActive
              ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          id="mobile-nav-menu-button"
        >
          <div
            className={`p-1 rounded-xl transition-colors relative ${
              isMenuOpen || isMoreTabActive
                ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : ''
            }`}
          >
            <Menu className="w-5 h-5 stroke-[2]" />
            {isMoreTabActive && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span
            className={`text-[10px] leading-tight mt-0.5 truncate max-w-[58px] ${
              isMenuOpen || isMoreTabActive
                ? 'font-black text-emerald-700 dark:text-emerald-400'
                : 'font-semibold text-slate-500 dark:text-slate-400'
            }`}
          >
            Menu
          </span>
        </button>
      </nav>

      {/* 2. Mobile Command Hub Drawer (Bottom Sheet) */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Touch Dismiss */}
          <div className="flex-1 min-h-[40px]" onClick={() => setIsMenuOpen(false)} />

          {/* Drawer Container */}
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 text-slate-900 dark:text-slate-100"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Grab Handle & Header */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
              <div className="w-full flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      EcoBarangay Hub
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Navigation, Utilities & Community Tools
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Active Barangay Status Card */}
            <div className="p-3 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl shadow-md border border-emerald-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Active Barangay
                  </div>
                  <div className="text-sm font-black truncate text-white">
                    {currentBarangay ? `Brgy. ${currentBarangay.name}` : t('selectBarangay')}
                  </div>
                  {currentBarangay && (
                    <div className="text-[10px] text-slate-300 font-medium truncate flex items-center gap-1">
                      <span>{currentBarangay.cityName}, {currentBarangay.provinceName}</span>
                      {currentBarangay.score && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded-md font-bold text-[9px]">
                          Rank #{currentBarangay.score.nationalRank}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenLocationModal();
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-xs shrink-0 transition-transform active:scale-95 flex items-center gap-1"
              >
                <span>Switch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Hub */}
            <div className="mt-3.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 px-1 mb-2 flex items-center justify-between">
                <span>Quick Actions</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">1-Tap Shortcuts</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTabClick('reports')}
                  className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-left flex items-center gap-2.5 active:scale-98 transition-all"
                >
                  <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200 block truncate">
                      Report Dumping
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block truncate">
                      +30 Eco Points
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('schedule')}
                  className="p-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 rounded-xl text-left flex items-center gap-2.5 active:scale-98 transition-all"
                >
                  <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-teal-950 dark:text-teal-200 block truncate">
                      Truck Timetable
                    </span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 block truncate">
                      Pickup Routes
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* All System Modules */}
            <div className="mt-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 px-1 mb-2">
                All System Modules
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allModules.map(mod => {
                  const Icon = mod.icon;
                  const isActive = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleTabClick(mod.id)}
                      className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all active:scale-98 ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                      id={`drawer-nav-${mod.id}`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${mod.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold truncate ${
                              isActive ? 'text-emerald-900 dark:text-emerald-200 font-extrabold' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {mod.label}
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 block truncate mt-0.5">
                          {mod.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Republic Act 9003 Waste Sorting Guide Banner */}
            <div className="mt-3.5">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenGuideModal();
                }}
                className="w-full p-3 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-300/80 dark:border-amber-800/80 rounded-2xl flex items-center justify-between gap-3 text-left transition-all active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-2xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-950 dark:text-amber-200 truncate">
                        {t('guideButton')} (RA 9003)
                      </span>
                      <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[9px] font-extrabold rounded-md uppercase">
                        Quiz & Rules
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                      Interactive Philippine Waste Sorting & Points Guide
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </button>
            </div>

            {/* User Account & Authentication Section */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 px-1 mb-2">
                Account & Membership
              </div>

              {currentUser ? (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      {currentUser.photoUrl || currentUser.avatarUrl ? (
                        <img
                          src={currentUser.photoUrl || currentUser.avatarUrl}
                          alt={currentUser.fullName}
                          className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-500/40 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-300">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {currentUser.email}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-extrabold uppercase">
                            <ShieldCheck className="w-3 h-3" />
                            {currentUser.role.replace('_', ' ')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded text-[9px] font-extrabold">
                            <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            {currentUser.ecoPoints || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </button>

                    {onOpenProfileSettings && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenProfileSettings();
                        }}
                        className="w-full py-2 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                    )}
                  </div>

                  {/* Logout Button */}
                  {onLogout && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('navSignOut')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/90 dark:to-slate-800/60 border border-emerald-200/80 dark:border-slate-700 p-4 rounded-2xl text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      Join the Clean Barangay League
                    </h5>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                      Log household recycling, earn verified Eco Points, and boost your barangay's national rank.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTabClick('auth')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>{t('navSignIn')} / Register</span>
                  </button>
                </div>
              )}
            </div>

            {/* System Preferences: Theme & Language */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 px-1 mb-2">
                Display & Preferences
              </div>
              <div className="grid grid-cols-2 gap-2">
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs font-extrabold transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-600" />
                      )}
                      <span>Theme</span>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded-md">
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>
                )}

                <button
                  onClick={onToggleLang}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs font-extrabold transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Language</span>
                  </div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded-md">
                    {lang === 'tl' ? '🇵🇭 Tagalog' : '🇺🇸 English'}
                  </span>
                </button>
              </div>

              {/* Developer Info Trigger */}
              {onOpenDeveloperInfo && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDeveloperInfo();
                  }}
                  className="mt-2.5 w-full p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs font-extrabold transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Developer: Anesu Lancelot Shoko</span>
                  </div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-md shrink-0">
                    Info
                  </span>
                </button>
              )}
            </div>

            {/* Footer Tag */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-400 font-medium">
              EcoBarangay Pilipinas • RA 9003 Solid Waste Management Framework
            </div>
          </div>
        </div>
      )}
    </>
  );
};
