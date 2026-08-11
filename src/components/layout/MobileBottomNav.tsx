import React, { useState } from 'react';
import { User, Barangay, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
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
  Sparkles
} from 'lucide-react';

interface MobileBottomNavProps {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLocationModal: () => void;
  onOpenGuideModal: () => void;
  onSwitchUser: (email: string) => void;
  onLogout?: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  currentBarangay,
  activeTab,
  setActiveTab,
  onOpenLocationModal,
  onOpenGuideModal,
  onSwitchUser,
  onLogout,
  lang,
  onToggleLang,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = (key: any) => getTranslation(lang, key);

  const mainTabs = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'feed', label: t('navFeed'), icon: MessageSquare },
    { id: 'reports', label: t('navReports'), icon: AlertTriangle },
    { id: 'events', label: t('navEvents'), icon: Calendar },
    { id: 'rankings', label: t('navRankings'), icon: Trophy },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  const isMoreTabActive = ['map', 'schedule', 'dashboard', 'auth'].includes(activeTab);

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Visible on mobile/tablet up to md screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl px-1 py-1 flex items-center justify-around safe-area-pb">
        {mainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-emerald-100/90 text-emerald-700' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              </div>
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[62px] ${isActive ? 'font-black text-emerald-700' : 'font-semibold text-slate-500'}`}>
                {tab.label.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Menu / More Button */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all ${
            isMenuOpen || isMoreTabActive
              ? 'text-emerald-700 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${isMenuOpen || isMoreTabActive ? 'bg-emerald-100/90 text-emerald-700' : ''}`}>
            <Menu className="w-5 h-5 stroke-[2]" />
          </div>
          <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[62px] ${isMenuOpen || isMoreTabActive ? 'font-black text-emerald-700' : 'font-semibold text-slate-500'}`}>
            Menu
          </span>
        </button>
      </nav>

      {/* Mobile Drawer / Bottom Sheet Modal */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />

          {/* Drawer Content */}
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            {/* Header / Handle */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {t('mobileMenuTitle')}
                </h3>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Barangay & Location Switcher Card */}
            <div className="mt-3 p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Barangay</div>
                  <div className="text-sm font-extrabold truncate text-white">
                    {currentBarangay ? `Brgy. ${currentBarangay.name}` : t('selectBarangay')}
                  </div>
                  {currentBarangay && (
                    <div className="text-[10px] text-emerald-300 font-semibold truncate">
                      {currentBarangay.cityName}, {currentBarangay.provinceName}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenLocationModal();
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 transition-transform active:scale-95"
              >
                Change
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="mt-4">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                {t('mobileMoreTabs')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {/* Eco-Map */}
                <button
                  onClick={() => handleTabClick('map')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    activeTab === 'map'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                    <Map className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{t('navMap')}</span>
                    <span className="text-[10px] text-slate-500 block">Recycling Hubs</span>
                  </div>
                </button>

                {/* Garbage Schedule */}
                <button
                  onClick={() => handleTabClick('schedule')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    activeTab === 'schedule'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-xl shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{t('navSchedule')}</span>
                    <span className="text-[10px] text-slate-500 block">Collection Days</span>
                  </div>
                </button>

                {/* RA 9003 Segregation Guide */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenGuideModal();
                  }}
                  className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center gap-3 text-left hover:bg-amber-100/80 transition-all col-span-2"
                >
                  <div className="p-2 bg-amber-200 text-amber-800 rounded-xl shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-amber-900 block truncate">{t('guideButton')}</span>
                    <span className="text-[10px] text-amber-700 block truncate">Republic Act 9003 Waste Sorting Guide</span>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                </button>
              </div>
            </div>

            {/* Account & Profile Section */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Account & Settings
              </h4>

              {currentUser ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                        alt={currentUser.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">{currentUser.fullName}</div>
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>{currentUser.role.replace('_', ' ')}</span>
                          <span>• {currentUser.pointsBalance || 0} pts</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shrink-0"
                    >
                      Dashboard
                    </button>
                  </div>

                  {/* Switch Quick Demo Accounts */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400 mb-1.5">Switch Persona (Demo)</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          onSwitchUser('resident@ecobarangay.ph');
                          setIsMenuOpen(false);
                        }}
                        className={`text-left p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          currentUser.email === 'resident@ecobarangay.ph'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        🇵🇭 Resident (Maria)
                      </button>
                      <button
                        onClick={() => {
                          onSwitchUser('official@ecobarangay.ph');
                          setIsMenuOpen(false);
                        }}
                        className={`text-left p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          currentUser.email === 'official@ecobarangay.ph'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        🏛️ Official (Captain)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleTabClick('auth')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{t('navSignIn')}</span>
                </button>
              )}

              {/* Language Switcher */}
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Language / Wika</span>
                </div>
                <button
                  onClick={onToggleLang}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl border border-slate-200"
                >
                  {lang === 'tl' ? '🇵🇭 Tagalog' : '🇺🇸 English'}
                </button>
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
              EcoBarangay Pilipinas • Republic Act 9003 Compliance
            </div>
          </div>
        </div>
      )}
    </>
  );
};
