import React, { useState, useEffect, useRef } from 'react';
import { User, Barangay, GlobalSearchResults, Language, AppNotification } from '../../types';
import { api } from '../../lib/api';
import { getTranslation } from '../../lib/i18n';
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
  Info
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLocationModal: () => void;
  onOpenGuideModal: () => void;
  onSwitchUser: (email: string) => void;
  onLogout: () => void;
  lang: Language;
  onToggleLang: () => void;
  onSelectBarangayFromSearch?: (barangay: Barangay) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
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
  onSelectBarangayFromSearch,
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
    { id: 'home', label: t('navHome') },
    { id: 'feed', label: t('navFeed') },
    { id: 'dashboard', label: t('navDashboard') },
    { id: 'map', label: t('navMap') },
    { id: 'rankings', label: t('navRankings') },
    { id: 'reports', label: t('navReports') },
    { id: 'events', label: t('navEvents') },
    { id: 'schedule', label: t('navSchedule') },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl eco-gradient flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 fill-white/20 shrink-0" />
            </div>
            <div className="hidden sm:block whitespace-nowrap shrink-0">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-800 group-hover:text-emerald-700 transition-colors leading-none block">
                Eco<span className="text-emerald-600">Barangay</span>
              </span>
              <span className="block text-[9px] font-bold tracking-widest uppercase text-emerald-600 mt-0.5">
                {lang === 'tl' ? 'Mas Malinis na Barangay' : 'Sustainable Philippines'}
              </span>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 min-w-[120px] max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults) setShowSearchDropdown(true);
                }}
                placeholder={t('navSearchPlaceholder')}
                className="w-full bg-slate-100/90 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition-all truncate"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-3 shrink-0" />
              ) : searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Live Search Results Dropdown */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                {searchResults.barangays.length === 0 &&
                searchResults.facilities.length === 0 &&
                searchResults.events.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-medium">
                    {t('noSearchResults')}
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {/* Barangays */}
                    {searchResults.barangays.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
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
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/80 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">Brgy. {b.name}</span>
                                <span className="text-slate-500 text-[11px] block">{b.cityName}, {b.provinceName}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap shrink-0">
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
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Recycle className="w-3 h-3 text-teal-600 shrink-0" />
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
                              className="w-full text-left p-2 rounded-xl hover:bg-teal-50/80 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{f.name}</span>
                                <span className="text-slate-500 text-[11px] block">{f.address}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase whitespace-nowrap shrink-0">
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
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
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
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-50/80 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{e.title}</span>
                                <span className="text-slate-500 text-[11px] block">{e.date} • {e.location}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 whitespace-nowrap shrink-0">
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

          {/* Navigation Links (Desktop 2XL screens) */}
          <nav className="hidden 2xl:flex items-center space-x-1 shrink-0">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            
            {/* Language Toggle Button */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 whitespace-nowrap shrink-0"
              title="Switch Language / Palitan ang Wika"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{lang === 'tl' ? '🇵🇭 Tagalog' : '🇺🇸 English'}</span>
              <span className="sm:hidden whitespace-nowrap">{lang === 'tl' ? '🇵🇭' : '🇺🇸'}</span>
            </button>

            {/* RA 9003 Guide Button */}
            <button
              onClick={onOpenGuideModal}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              title="View RA 9003 Waste Segregation Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="whitespace-nowrap">{t('guideButton')}</span>
            </button>

            {/* Location Selector Pill */}
            <button
              onClick={onOpenLocationModal}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              title="Change active Barangay"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-[110px] whitespace-nowrap">
                {currentBarangay ? currentBarangay.name : t('selectBarangay')}
              </span>
            </button>

            {/* Notification Bell Button & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  if (!notifDropdownOpen) fetchNotifications();
                }}
                className="relative p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all border border-slate-200/80 flex items-center justify-center group"
                title={t('notificationsHeading')}
                id="nav-notification-bell"
              >
                <Bell className={`w-4 h-4 transition-transform group-hover:rotate-12 ${unreadNotifCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-600'}`} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Modal */}
              {notifDropdownOpen && (
                <div className="absolute -right-10 sm:right-0 mt-2 w-[310px] sm:w-96 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  
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
                  <div className="p-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1 overflow-x-auto text-[11px]">
                    <button
                      onClick={() => setNotifFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {t('notificationsAll')} ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('EVENT_SIGNUP')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'EVENT_SIGNUP'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      🌱 {t('notifFilterEvent')}
                    </button>
                    <button
                      onClick={() => setNotifFilter('REPORT_UPDATE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'REPORT_UPDATE'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      🚨 {t('notifFilterReport')}
                    </button>
                    <button
                      onClick={() => setNotifFilter('RANKING_CHANGE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                        notifFilter === 'RANKING_CHANGE'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      🏆 {t('notifFilterRanking')}
                    </button>
                  </div>

                  {/* List Container */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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
                              isUnread ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Unread indicator bar */}
                            {isUnread && (
                              <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-md" />
                            )}

                            {/* Type Icon */}
                            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              notif.type === 'EVENT_SIGNUP'
                                ? 'bg-emerald-100 text-emerald-700'
                                : notif.type === 'REPORT_UPDATE'
                                ? 'bg-amber-100 text-amber-700'
                                : notif.type === 'RANKING_CHANGE'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {notif.type === 'EVENT_SIGNUP' && <Calendar className="w-4 h-4" />}
                              {notif.type === 'REPORT_UPDATE' && <AlertTriangle className="w-4 h-4" />}
                              {notif.type === 'RANKING_CHANGE' && <Trophy className="w-4 h-4" />}
                              {notif.type === 'ANNOUNCEMENT' && <Info className="w-4 h-4" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-xs font-extrabold text-slate-900 truncate">
                                  {notif.title}
                                </span>
                                {isUnread && (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-extrabold rounded-full shrink-0">
                                    {t('notifNewBadge')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
                                <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}</span>
                                <span className="text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5">
                                  {t('notifView')} &rarr;
                                </span>
                              </div>
                            </div>

                            {/* Read toggle button */}
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkRead(notif.id, e)}
                                className="text-slate-400 hover:text-emerald-600 p-1 rounded-md hover:bg-white transition-colors"
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
                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500 font-medium">
                    <span>Updates automatically on new event sign-ups, reports, & rankings.</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Quick Account Switcher */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white transition-all shadow-2xs"
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-emerald-500/20"
                  />
                  <div className="text-left hidden xl:block pr-1">
                    <div className="text-xs font-bold text-slate-800 line-clamp-1 flex items-center gap-1">
                      {currentUser.fullName}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Account Switcher Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 bg-slate-50 rounded-xl mb-2">
                      <div className="text-xs font-bold text-slate-800">{currentUser.fullName}</div>
                      <div className="text-[11px] text-slate-500">{currentUser.email}</div>
                      <div className="mt-2 flex items-center justify-between text-xs font-bold text-emerald-800 pt-1 border-t border-slate-200/60">
                        <span>Eco Points:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-800">
                          ⚡ {currentUser.ecoPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                      Quick Demo Accounts
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          onSwitchUser('resident@ecobarangay.ph');
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          currentUser.role === 'RESIDENT' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>Juan Dela Cruz</div>
                          <div className="text-[10px] text-slate-500">Resident • Brgy. Kapitolyo</div>
                        </div>
                        {currentUser.role === 'RESIDENT' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </button>

                      <button
                        onClick={() => {
                          onSwitchUser('official@ecobarangay.ph');
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          currentUser.role === 'BARANGAY_OFFICIAL' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>Captain Maria Santos</div>
                          <div className="text-[10px] text-slate-500">Official • Brgy. Kapitolyo</div>
                        </div>
                        {currentUser.role === 'BARANGAY_OFFICIAL' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </button>

                      <button
                        onClick={() => {
                          onSwitchUser('admin@ecobarangay.ph');
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          currentUser.role === 'SYSTEM_ADMIN' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>DENR Eco Admin</div>
                          <div className="text-[10px] text-slate-500">System Admin</div>
                        </div>
                        {currentUser.role === 'SYSTEM_ADMIN' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </button>
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center space-x-2 transition-colors"
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
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0"
              >
                {t('navSignIn')}
              </button>
            )}
          </div>
        </div>

        {/* Responsive Navigation Row for screens below 2XL */}
        <div className="flex 2xl:hidden items-center justify-start py-2 border-t border-slate-100 overflow-x-auto gap-1.5 no-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === item.id ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

