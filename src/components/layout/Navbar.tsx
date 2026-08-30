import React, { useState, useEffect, useRef } from 'react';
import { User, Barangay, GlobalSearchResults, Language, AppNotification } from '../../types';
import { api } from '../../lib/api';
import { getTranslation } from '../../lib/i18n';
import { ThemeMode } from '../../lib/theme';
import {
  Leaf,
  MapPin,
  Award,
  BookOpen,
  UserCheck,
  ChevronDown,
  Globe,
  Bell,
  LogOut,
  Sparkles,
  ShieldAlert,
  Search,
  X,
  Building2,
  Recycle,
  Calendar,
  Loader2,
  AlertTriangle,
  Trophy,
  Check,
  CheckCheck,
  Info,
  Camera,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Code2,
  Menu,
  Home,
  MessageSquare,
  Map,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLocationModal: () => void;
  onOpenGuideModal: () => void;
  onOpenProfileSettings?: () => void;
  onOpenDeveloperInfo?: () => void;
  onLogout: () => void;
  lang: Language;
  onToggleLang: () => void;
  onSelectBarangayFromSearch?: (barangay: Barangay) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
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
  onSelectBarangayFromSearch,
  theme = 'light',
  onToggleTheme,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'EVENT_SIGNUP' | 'REPORT_UPDATE' | 'RANKING_CHANGE'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications(currentBarangay?.id);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentBarangay?.id]);

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentBarangay?.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
    }
    setNotifDropdownOpen(false);
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'ALL') return true;
    return n.type === notifFilter;
  });

  const t = (key: any) => getTranslation(lang, key);

  // Debounced Search API effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.globalSearch(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: t('navHome'), icon: Home, desc: 'Overview & Barangay score' },
    { id: 'feed', label: t('navFeed'), icon: MessageSquare, desc: 'Discussions & eco community' },
    { id: 'dashboard', label: t('navDashboard'), icon: Building2, desc: 'Waste metrics & action logs' },
    { id: 'map', label: t('navMap'), icon: Map, desc: 'MRF & junk shop locators' },
    { id: 'rankings', label: t('navRankings'), icon: Trophy, desc: 'National 100-pt leaderboard' },
    { id: 'reports', label: t('navReports'), icon: AlertTriangle, desc: 'Report dumping & hazards' },
    { id: 'events', label: t('navEvents'), icon: Calendar, desc: 'Cleanups, tree planting & points' },
    { id: 'schedule', label: t('navSchedule'), icon: Clock, desc: 'Collection calendar & alerts' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center space-x-2 shrink-0">
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl eco-gradient flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 fill-white/20 shrink-0" />
              </div>
              <div className="hidden sm:block whitespace-nowrap shrink-0">
                <span className="text-sm sm:text-base font-black tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-none block">
                  Eco<span className="text-emerald-600 dark:text-emerald-400">Barangay</span>
                </span>
                <span className="block text-[8px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {lang === 'tl' ? 'Mas Malinis na Barangay' : 'Sustainable Philippines'}
                </span>
              </div>
            </div>

            {/* Barangay Switcher Pill (Desktop / Computer view) */}
            <button
              onClick={onOpenLocationModal}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700 transition-all shrink-0 max-w-[190px]"
              title="Switch Active Barangay"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{currentBarangay ? `Brgy. ${currentBarangay.name}` : t('selectBarangay')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Center: Global Search Bar */}
          <div className="relative flex-1 min-w-[90px] sm:min-w-[130px] max-w-xs sm:max-w-sm md:max-w-md mx-0.5 sm:mx-1" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 sm:left-3 pointer-events-none shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults) setShowSearchDropdown(true);
                }}
                placeholder={t('navSearchPlaceholder')}
                className="w-full bg-slate-100/90 dark:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pl-7 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition-all truncate"
              />
              {isSearching ? (
                <Loader2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-spin absolute right-2.5 shrink-0" />
              ) : searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
            </div>

            {/* Live Search Results Dropdown */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                {searchResults.barangays.length === 0 &&
                searchResults.facilities.length === 0 &&
                searchResults.events.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('noSearchResults')}
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {/* Barangays */}
                    {searchResults.barangays.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          {t('searchHeadingBarangays')}
                        </div>
                        <div className="space-y-1">
                          {searchResults.barangays.map(b => (
                            <button
                              key={b.id}
                              onClick={() => {
                                if (onSelectBarangayFromSearch) onSelectBarangayFromSearch(b);
                                setActiveTab('rankings');
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">Brgy. {b.name}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">{b.cityName}, {b.provinceName}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 whitespace-nowrap shrink-0">
                                {b.score.tier} Tier • {b.score.totalScore} pts
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Facilities */}
                    {searchResults.facilities.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1">
                          <Recycle className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                          {t('searchHeadingFacilities')}
                        </div>
                        <div className="space-y-1">
                          {searchResults.facilities.map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setActiveTab('map');
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-teal-50/80 dark:hover:bg-teal-950/40 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{f.name}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">{f.address}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 uppercase whitespace-nowrap shrink-0">
                                {f.category}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {searchResults.events.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          {t('searchHeadingEvents')}
                        </div>
                        <div className="space-y-1">
                          {searchResults.events.map(e => (
                            <button
                              key={e.id}
                              onClick={() => {
                                setActiveTab('events');
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-50/80 dark:hover:bg-amber-950/40 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{e.title}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">{e.date} • {e.location}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 whitespace-nowrap shrink-0">
                                +{e.pointsAwarded} pts
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Bar: Compact, clean, and never overflows */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            
            {/* Dark Mode Quick Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group shrink-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
                id="nav-theme-toggle"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 group-hover:-rotate-12 transition-transform duration-300 shrink-0" />
                )}
              </button>
            )}

            {/* Language Toggle Button (Hidden on extra small screens, accessible via dropdown menu) */}
            <button
              onClick={onToggleLang}
              className="hidden xs:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700 whitespace-nowrap shrink-0"
              title="Switch Language / Palitan ang Wika"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{lang === 'tl' ? '🇵🇭 Tagalog' : '🇺🇸 English'}</span>
              <span className="sm:hidden whitespace-nowrap">{lang === 'tl' ? '🇵🇭' : '🇺🇸'}</span>
            </button>

            {/* RA 9003 Guide Button (Desktop only) */}
            <button
              onClick={onOpenGuideModal}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              title="View RA 9003 Waste Segregation Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">{t('guideButton')}</span>
            </button>

            {/* Notification Bell Button & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  if (!notifDropdownOpen) fetchNotifications();
                }}
                className="relative p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group shrink-0"
                title={t('notificationsHeading')}
                id="nav-notification-bell"
              >
                <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:rotate-12 ${unreadNotifCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-600 dark:text-slate-300'}`} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Modal */}
              {notifDropdownOpen && (
                <div className="absolute -right-10 sm:right-0 mt-2 w-[310px] sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Header */}
                  <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight">{t('notificationsHeading')}</h4>
                        <p className="text-[10px] text-slate-300">
                          {currentBarangay ? `Brgy. ${currentBarangay.name}` : t('allPhilippines')}
                        </p>
                      </div>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t('notificationsMarkAllRead')}</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 overflow-x-auto text-[11px]">
                    <button
                      onClick={() => setNotifFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'ALL'
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t('notificationsAll')} ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('EVENT_SIGNUP')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'EVENT_SIGNUP'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      🌱 {t('notifFilterEvent')}
                    </button>
                    <button
                      onClick={() => setNotifFilter('REPORT_UPDATE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'REPORT_UPDATE'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      🚨 {t('notifFilterReport')}
                    </button>
                    <button
                      onClick={() => setNotifFilter('RANKING_CHANGE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'RANKING_CHANGE'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      🏆 {t('notifFilterRanking')}
                    </button>
                  </div>

                  {/* List Container */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold">{t('notificationsEmpty')}</p>
                      </div>
                    ) : (
                      filteredNotifications.map((notif) => {
                        const isUnread = !notif.read;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 transition-colors cursor-pointer flex items-start gap-3 group relative ${
                              isUnread ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            {/* Unread indicator bar */}
                            {isUnread && (
                              <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-md" />
                            )}

                            {/* Type Icon */}
                            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              notif.type === 'EVENT_SIGNUP'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : notif.type === 'REPORT_UPDATE'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                : notif.type === 'RANKING_CHANGE'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                            }`}>
                              {notif.type === 'EVENT_SIGNUP' && <Calendar className="w-4 h-4" />}
                              {notif.type === 'REPORT_UPDATE' && <AlertTriangle className="w-4 h-4" />}
                              {notif.type === 'RANKING_CHANGE' && <Trophy className="w-4 h-4" />}
                              {notif.type === 'ANNOUNCEMENT' && <Info className="w-4 h-4" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                  {notif.title}
                                </span>
                                {isUnread && (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-extrabold rounded-full shrink-0">
                                    {t('notifNewBadge')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                                <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover:underline flex items-center gap-0.5">
                                  {t('notifView')} &rarr;
                                </span>
                              </div>
                            </div>

                            {/* Read toggle button */}
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkRead(notif.id, e)}
                                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>Updates automatically on new event sign-ups, reports, & rankings.</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Account Details (When Logged In) OR Sign In Icon Button (When Not Logged In) */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-1.5 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-white dark:bg-slate-800 transition-all shadow-2xs shrink-0"
                  title="Profile & Account Settings"
                  aria-label="User Profile"
                  id="nav-user-profile-button"
                >
                  {currentUser.photoUrl || currentUser.avatarUrl ? (
                    <img
                      src={currentUser.photoUrl || currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                      <UserIcon className="w-4 h-4 shrink-0" />
                    </div>
                  )}
                  <div className="text-left hidden xl:block pr-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 flex items-center gap-1">
                      {currentUser.fullName}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* Account Details Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900 dark:text-slate-100">
                    <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentUser.fullName}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold rounded-md uppercase">
                          {currentUser.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{currentUser.barangayName}, {currentUser.city}</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>Eco Points:</span>
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs font-black">
                          ⚡ {currentUser.ecoPoints || 0} pts
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Dark Mode switcher inside user dropdown */}
                      {onToggleTheme && (
                        <button
                          onClick={() => {
                            onToggleTheme();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                            <span>Appearance</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                            {theme === 'dark' ? 'Dark' : 'Light'}
                          </span>
                        </button>
                      )}

                      {onOpenProfileSettings && (
                        <button
                          onClick={() => {
                            onOpenProfileSettings();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl flex items-center space-x-2 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Profile & Settings</span>
                        </button>
                      )}

                      {onOpenDeveloperInfo && (
                        <button
                          onClick={() => {
                            onOpenDeveloperInfo();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl flex items-center space-x-2 transition-colors"
                        >
                          <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Developer Information</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('navSignOut')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all shrink-0 whitespace-nowrap"
                title={t('navSignIn')}
                aria-label="Sign In"
                id="nav-signin-button"
              >
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('navSignIn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Desktop / Computer Navigation Bar (Visible on md, lg, xl screens) */}
      <nav className="hidden md:block border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11">
            {/* Desktop Navigation Links */}
            <div className="flex items-center space-x-1 lg:space-x-2 overflow-x-auto py-1 scrollbar-none">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 select-none ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                    id={`desktop-nav-${item.id}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Quick Eco Indicator */}
            {currentBarangay && (
              <div className="hidden xl:flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-extrabold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>National Rank #{currentBarangay.score.nationalRank}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Cleanliness Score: {currentBarangay.score.totalScore}/100</span>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

