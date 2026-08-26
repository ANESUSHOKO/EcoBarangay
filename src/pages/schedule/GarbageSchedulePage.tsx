import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  GarbageSchedule,
  Barangay,
  Language,
  User,
  Event as CommunityEvent,
  PersonalCalendarEvent,
  BulkWastePickupRequest
} from '../../types';
import { getTranslation } from '../../lib/i18n';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Truck,
  Plus,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Layers,
  Leaf,
  Bell,
  MapPin,
  CalendarDays,
  ListFilter,
  CheckSquare,
  Square,
  Info,
  CalendarRange,
  Users
} from 'lucide-react';
import { AddEcoReminderModal } from './AddEcoReminderModal';
import { exportToICS, ExportCalendarItem } from './icsExporter';

interface GarbageSchedulePageProps {
  currentBarangay: Barangay;
  currentUser?: User | null;
  lang?: Language;
  onNavigate?: (tab: string) => void;
}

export type ViewMode = 'month' | 'week' | 'agenda' | 'timetable';
export type FilterCategory = 'ALL' | 'COLLECTION' | 'EVENT' | 'REMINDER' | 'BULK';

interface DayEventItem {
  id: string;
  title: string;
  time?: string;
  type: 'bio' | 'recyclable' | 'residual' | 'bulk' | 'event' | 'reminder' | 'bulk-pickup';
  categoryLabel: string;
  instructions?: string;
  truckNo?: string;
  location?: string;
  pointsReward?: number;
  isCustom?: boolean;
  completed?: boolean;
  rawEvent?: CommunityEvent;
  rawReminder?: PersonalCalendarEvent;
  rawPickup?: BulkWastePickupRequest;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const GarbageSchedulePage: React.FC<GarbageSchedulePageProps> = ({
  currentBarangay,
  currentUser,
  lang = 'en',
  onNavigate,
}) => {
  const t = (key: any) => getTranslation(lang as Language, key);

  // States
  const [schedules, setSchedules] = useState<GarbageSchedule[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [reminders, setReminders] = useState<PersonalCalendarEvent[]>([]);
  const [bulkPickups, setBulkPickups] = useState<BulkWastePickupRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');

  // Active Calendar Month / Year (default to August 2026 / current date)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed (0 = Jan, 7 = Aug)
  
  // Selected date string (YYYY-MM-DD)
  const formatTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(formatTodayStr);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>(formatTodayStr);
  const [completedReminderIds, setCompletedReminderIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ecobarangay_completed_reminders') || '[]');
    } catch {
      return [];
    }
  });

  // Load Data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSchedules(currentBarangay.id),
      api.getEvents(currentBarangay.id),
      currentUser ? api.getCalendarEvents(currentUser.id, currentBarangay.id) : Promise.resolve([]),
      currentUser ? api.getBulkPickups(currentUser.id, currentBarangay.id) : Promise.resolve([]),
    ])
      .then(([schList, evtList, remList, bulkList]) => {
        setSchedules(schList || []);
        setEvents(evtList || []);
        setReminders(remList || []);
        setBulkPickups(bulkList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentBarangay.id, currentUser?.id]);

  // Handle Month Nav
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(formatTodayStr);
  };

  // Toggle Reminder Checkbox
  const handleToggleReminder = (id: string) => {
    setCompletedReminderIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('ecobarangay_completed_reminders', JSON.stringify(next));
      return next;
    });
  };

  // Add Reminder Handler
  const handleAddReminder = async (eventData: Partial<PersonalCalendarEvent>) => {
    try {
      const created = await api.addCalendarEvent(eventData);
      setReminders(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to add calendar event', err);
    }
  };

  // Build Calendar Days for Current Month (CSS Grid calculation)
  const calendarGridDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
        dayOfWeekIndex: new Date(prevYear, prevMonth, d).getDay(),
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
        dayOfWeekIndex: new Date(currentYear, currentMonth, d).getDay(),
      });
    }

    // 3. Next month leading days to complete full grid (multiple of 7: 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
        dayOfWeekIndex: new Date(nextYear, nextMonth, d).getDay(),
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Aggregate items mapped to date string
  const getItemsForDate = (dateStr: string): DayEventItem[] => {
    const items: DayEventItem[] = [];
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_NAMES[dateObj.getDay()];

    // A. Weekly Recurring Garbage Schedules for this Day of Week
    schedules.forEach(sch => {
      if (sch.dayOfWeek.toLowerCase() === dayName.toLowerCase()) {
        let type: DayEventItem['type'] = 'bio';
        if (sch.wasteType === 'Recyclable') type = 'recyclable';
        else if (sch.wasteType === 'Non-Biodegradable') type = 'residual';
        else if (sch.wasteType === 'Bulk/E-Waste') type = 'bulk';

        items.push({
          id: `sch-${sch.id}-${dateStr}`,
          title: `${sch.wasteType} Collection`,
          time: sch.timeSlot,
          type,
          categoryLabel: sch.wasteType,
          instructions: sch.instructions,
          truckNo: sch.truckNo,
        });
      }
    });

    // B. Specific Community Events
    events.forEach(evt => {
      if (evt.date === dateStr) {
        items.push({
          id: `evt-${evt.id}`,
          title: evt.title,
          time: evt.time,
          type: 'event',
          categoryLabel: `Community ${evt.category}`,
          location: evt.location,
          pointsReward: evt.pointsAwarded,
          instructions: evt.description,
          rawEvent: evt,
        });
      }
    });

    // C. User Personal Calendar Reminders
    reminders.forEach(rem => {
      if (rem.date === dateStr) {
        items.push({
          id: rem.id,
          title: rem.title,
          time: rem.time,
          type: 'reminder',
          categoryLabel: rem.type || 'Personal Reminder',
          instructions: rem.description,
          isCustom: true,
          completed: completedReminderIds.includes(rem.id),
          rawReminder: rem,
        });
      }
    });

    // D. Bulk Pickups
    bulkPickups.forEach(blk => {
      const matchDate = blk.scheduledDate || blk.preferredPickupDate;
      if (matchDate === dateStr) {
        items.push({
          id: blk.id,
          title: `Bulk Pickup: ${blk.wasteType}`,
          time: 'Morning Slot',
          type: 'bulk-pickup',
          categoryLabel: `Bulk Waste (${blk.status})`,
          instructions: `Location: ${blk.locationAddress}. Qty: ${blk.quantityDescription}`,
          rawPickup: blk,
        });
      }
    });

    // Filter according to category filter
    if (filterCategory === 'COLLECTION') {
      return items.filter(i => ['bio', 'recyclable', 'residual', 'bulk'].includes(i.type));
    }
    if (filterCategory === 'EVENT') {
      return items.filter(i => i.type === 'event');
    }
    if (filterCategory === 'REMINDER') {
      return items.filter(i => i.type === 'reminder');
    }
    if (filterCategory === 'BULK') {
      return items.filter(i => ['bulk', 'bulk-pickup'].includes(i.type));
    }

    return items;
  };

  // Find Next Upcoming Collection relative to today
  const nextCollection = useMemo(() => {
    if (schedules.length === 0) return null;
    const currentDayIdx = today.getDay();
    
    // Check next 7 days in order
    for (let offset = 0; offset < 7; offset++) {
      const checkDayIdx = (currentDayIdx + offset) % 7;
      const checkDayName = DAY_NAMES[checkDayIdx];
      const match = schedules.find(s => s.dayOfWeek.toLowerCase() === checkDayName.toLowerCase());
      if (match) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : `This ${checkDayName}`;
        return {
          schedule: match,
          dayLabel,
          formattedDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }
    }
    return null;
  }, [schedules, today]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    return getItemsForDate(selectedDate);
  }, [selectedDate, schedules, events, reminders, bulkPickups, filterCategory, completedReminderIds]);

  // Formatted Selected Date Label
  const formattedSelectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Export Calendar handler
  const handleExportICS = () => {
    const exportItems: ExportCalendarItem[] = [];
    
    // Export items across the active displayed month
    calendarGridDays.forEach(day => {
      const dayItems = getItemsForDate(day.dateStr);
      dayItems.forEach(item => {
        exportItems.push({
          id: item.id,
          title: item.title,
          description: item.instructions || `${item.categoryLabel} for Brgy. ${currentBarangay.name}`,
          date: day.dateStr,
          time: item.time,
          location: item.location || `Barangay ${currentBarangay.name}, ${currentBarangay.cityName}`,
          category: item.categoryLabel,
        });
      });
    });

    exportToICS(exportItems, `EcoBarangay ${currentBarangay.name} Calendar`);
  };

  // Helper Badge Colors
  const getItemBadgeStyle = (type: DayEventItem['type']) => {
    switch (type) {
      case 'bio':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'recyclable':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'residual':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'bulk':
      case 'bulk-pickup':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'event':
        return 'bg-teal-100 text-teal-900 border-teal-200';
      case 'reminder':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getItemDotColor = (type: DayEventItem['type']) => {
    switch (type) {
      case 'bio': return 'bg-emerald-500';
      case 'recyclable': return 'bg-blue-500';
      case 'residual': return 'bg-slate-500';
      case 'bulk':
      case 'bulk-pickup': return 'bg-amber-500';
      case 'event': return 'bg-teal-500';
      case 'reminder': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner & Quick Status */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/40 relative overflow-hidden">
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-wider rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" /> RA 9003 Waste Timetable
              </span>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-extrabold text-xs rounded-full border border-teal-500/30 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Brgy. {currentBarangay.name}, {currentBarangay.cityName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              My Eco Calendar & Collection Schedule
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Plan your household segregation, track assigned barangay truck pickup times, join community cleanups, and set custom reminders.
            </p>
          </div>

          {/* Next Collection Alert Widget */}
          {nextCollection && (
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 lg:min-w-[320px] shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400 animate-pulse" /> Next Barangay Pickup
                </span>
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                  {nextCollection.dayLabel}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-white flex items-center justify-between">
                <span>{nextCollection.schedule.wasteType}</span>
                <span className="text-xs text-slate-300 font-medium">{nextCollection.formattedDate}</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{nextCollection.schedule.timeSlot} • {nextCollection.schedule.truckNo || 'Standard Route'}</span>
              </div>
              <div className="text-[11px] text-emerald-200/90 bg-emerald-950/50 p-2 rounded-xl border border-emerald-500/20">
                💡 {nextCollection.schedule.instructions}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Action Bar: View Switcher, Category Filters, and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              viewMode === 'month'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Monthly Grid</span>
          </button>

          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              viewMode === 'week'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-blue-600" />
            <span>Weekly Planner</span>
          </button>

          <button
            onClick={() => setViewMode('agenda')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              viewMode === 'agenda'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4 text-purple-600" />
            <span>Agenda List</span>
          </button>

          <button
            onClick={() => setViewMode('timetable')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              viewMode === 'timetable'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Truck Timetable</span>
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setModalDate(selectedDate || formatTodayStr);
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Eco Reminder</span>
          </button>

          <button
            onClick={handleExportICS}
            title="Export full schedule to Google Calendar, Apple Calendar, or Outlook (.ics)"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            onClick={() => window.print()}
            title="Print weekly / monthly schedule for household bulletin"
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 3. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <span className="text-slate-500 uppercase tracking-wider text-[11px] mr-1 hidden sm:inline">Filter:</span>
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            filterCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilterCategory('COLLECTION')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            filterCategory === 'COLLECTION'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          🗑️ Waste Collections
        </button>
        <button
          onClick={() => setFilterCategory('EVENT')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            filterCategory === 'EVENT'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50 hover:text-teal-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          🌿 Cleanups & Events
        </button>
        <button
          onClick={() => setFilterCategory('REMINDER')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            filterCategory === 'REMINDER'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          📌 My Reminders
        </button>
        <button
          onClick={() => setFilterCategory('BULK')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            filterCategory === 'BULK'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          📦 Bulk Pickups
        </button>
      </div>

      {/* 4. MAIN CONTENT VIEW */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Grid Container (8 Columns on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Calendar Controls (Month Navigation) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {schedules.length} recurring collection routes active
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleJumpToToday}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  <button
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* CSS Grid Calendar: 7 Weekday Columns */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-black text-slate-500 py-1 border-b border-slate-100">
              {DAY_SHORT.map((day, idx) => (
                <div key={day} className={`py-1 ${idx === 0 || idx === 6 ? 'text-emerald-700' : ''}`}>
                  <span className="hidden sm:inline">{DAY_NAMES[idx]}</span>
                  <span className="sm:hidden">{day}</span>
                </div>
              ))}
            </div>

            {/* CSS Grid: Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGridDays.map(cell => {
                const dayItems = getItemsForDate(cell.dateStr);
                const isSelected = selectedDate === cell.dateStr;
                const isToday = formatTodayStr === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[85px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/20 shadow-xs'
                        : cell.isCurrentMonth
                        ? 'border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60'
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          isToday
                            ? 'bg-emerald-600 text-white font-black shadow-xs'
                            : isSelected
                            ? 'text-emerald-700 font-black'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Quick Add icon on cell hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalDate(cell.dateStr);
                          setSelectedDate(cell.dateStr);
                          setIsAddModalOpen(true);
                        }}
                        title="Add eco reminder for this day"
                        className="opacity-0 group-hover:opacity-100 p-1 text-emerald-600 hover:bg-emerald-100 rounded-md transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Day Badges Container */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border truncate flex items-center gap-1 ${getItemBadgeStyle(
                            item.type
                          )}`}
                          title={`${item.title} (${item.time || ''})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getItemDotColor(item.type)}`} />
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}

                      {dayItems.length > 2 && (
                        <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 px-1">
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom active dot indicator if any items */}
                    {dayItems.length > 0 && (
                      <div className="flex items-center justify-center gap-0.5 mt-1 sm:hidden">
                        {dayItems.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={`w-1 h-1 rounded-full ${getItemDotColor(item.type)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Biodegradable
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Recyclables
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Residual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Community Events
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> My Reminders
                </span>
              </div>

              <span className="text-slate-400">Click any date to inspect details</span>
            </div>
          </div>

          {/* Selected Day Inspector Side Panel (4 Columns on desktop) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5 sticky top-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Day Overview
                  </span>
                  {selectedDate === formatTodayStr && (
                    <span className="text-[10px] font-black uppercase text-white bg-slate-900 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 pt-1">
                  {formattedSelectedDateLabel}
                </h3>
              </div>

              {/* Items Scheduled for this Day */}
              <div className="space-y-3">
                {selectedDayItems.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No scheduled collections or events</p>
                    <p className="text-[11px] text-slate-400">
                      You can add your own custom segregation or cleanup reminder for this date.
                    </p>
                  </div>
                ) : (
                  selectedDayItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${getItemBadgeStyle(
                              item.type
                            )}`}
                          >
                            {item.categoryLabel}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 pt-1">{item.title}</h4>
                        </div>

                        {item.isCustom && (
                          <button
                            onClick={() => handleToggleReminder(item.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                            title={item.completed ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {item.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {item.time && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Time: {item.time}</span>
                        </div>
                      )}

                      {item.truckNo && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Vehicle: {item.truckNo}</span>
                        </div>
                      )}

                      {item.location && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Location: {item.location}</span>
                        </div>
                      )}

                      {item.pointsReward && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-extrabold text-[11px]">
                          <Sparkles className="w-3 h-3 text-emerald-600" /> +{item.pointsReward} EcoPoints Reward
                        </div>
                      )}

                      {item.instructions && (
                        <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70 leading-relaxed">
                          💡 {item.instructions}
                        </p>
                      )}

                      {item.rawEvent && onNavigate && (
                        <button
                          onClick={() => onNavigate('events')}
                          className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-center text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" /> View Community Event Details
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Action Button for Selected Day */}
              <button
                onClick={() => {
                  setModalDate(selectedDate);
                  setIsAddModalOpen(true);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Reminder for this Date</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. WEEKLY PLANNER VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">7-Day Weekly Planner</h2>
              <p className="text-xs text-slate-500">Plan household waste sorting throughout the week</p>
            </div>
            <div className="text-xs text-slate-400 font-semibold">
              Brgy. {currentBarangay.name} Route
            </div>
          </div>

          {/* 7 Day Column CSS Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {DAY_NAMES.map((dayName, idx) => {
              const daySchedules = schedules.filter(s => s.dayOfWeek.toLowerCase() === dayName.toLowerCase());
              const isToday = today.getDay() === idx;

              return (
                <div
                  key={dayName}
                  className={`rounded-2xl border p-4 space-y-3 flex flex-col justify-between ${
                    isToday
                      ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="border-b border-slate-200/70 pb-2 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{dayName}</h4>
                      <span className="text-[10px] text-slate-400">{DAY_SHORT[idx]}</span>
                    </div>
                    {isToday && (
                      <span className="text-[9px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    {daySchedules.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-4 text-center">
                        No collection scheduled
                      </div>
                    ) : (
                      daySchedules.map(sch => (
                        <div
                          key={sch.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                sch.wasteType === 'Biodegradable'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sch.wasteType === 'Recyclable'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {sch.wasteType}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{sch.timeSlot}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2">{sch.instructions}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setModalDate(formatTodayStr);
                      setIsAddModalOpen(true);
                    }}
                    className="w-full py-1.5 text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Task
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. AGENDA LIST VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Upcoming Agenda & Reminders</h2>
              <p className="text-xs text-slate-500">Chronological timeline of collections, events, and tasks</p>
            </div>
            <button
              onClick={() => {
                setModalDate(formatTodayStr);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {calendarGridDays
              .filter(d => d.isCurrentMonth)
              .map(day => {
                const dayItems = getItemsForDate(day.dateStr);
                if (dayItems.length === 0) return null;

                const dayDate = new Date(day.dateStr + 'T00:00:00');
                const isToday = day.dateStr === formatTodayStr;

                return (
                  <div
                    key={day.dateStr}
                    className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                            isToday ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          {dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayItems.map(item => (
                        <div
                          key={item.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getItemBadgeStyle(item.type)}`}>
                              {item.categoryLabel}
                            </span>
                            {item.time && (
                              <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-600" /> {item.time}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                          {item.instructions && (
                            <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg leading-relaxed">
                              {item.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 7. TIMETABLE REFERENCE CARDS */}
      {viewMode === 'timetable' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map(sch => (
              <div key={sch.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm font-black text-slate-900">{sch.dayOfWeek}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      sch.wasteType === 'Biodegradable'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sch.wasteType === 'Recyclable'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {sch.wasteType}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <Clock className="w-4 h-4 text-emerald-600" /> Collection Time: {sch.timeSlot}
                  </div>
                  {sch.truckNo && (
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Truck className="w-4 h-4 text-slate-400" /> Dispatched Vehicle: {sch.truckNo}
                    </div>
                  )}
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-2 leading-relaxed">
                    💡 {sch.instructions}
                  </p>
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="col-span-3 p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
                No collection schedule logged for this barangay yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Republic Act 9003 Segregation Guide Cheat Sheet Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">
              Ecological Solid Waste Management Act
            </span>
            <h3 className="text-lg font-black text-white">
              Republic Act 9003 Mandatory Household Segregation at Source
            </h3>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            No Segregation, No Collection Policy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Bio */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-black">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Biodegradable (Green Bin)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Kitchen scraps, leftover food, fruit peels, vegetable cuttings, yard leaves, coffee grounds.
            </p>
          </div>

          {/* Recyclables */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-blue-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 font-black">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Recyclables (Blue Bin)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              PET bottles, tin cans, cardboard boxes, newspapers, glass bottles, clean hard plastic containers.
            </p>
          </div>

          {/* Residual */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-slate-300 font-black">
              <span className="w-3 h-3 rounded-full bg-slate-400" />
              <span>Residual (Black/Gray Bin)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Single-use sachets, soiled wrappers, worn-out ceramics, sanitary napkins, disposable diapers.
            </p>
          </div>

          {/* Special / Bulk */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-amber-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-black">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Special & Hazardous (Red Bin)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Fluorescent bulbs, electronic e-waste, spray cans, expired paint, lead batteries. Coordinate with MRF.
            </p>
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      <AddEcoReminderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEvent={handleAddReminder}
        initialDate={modalDate}
        userId={currentUser?.id}
      />
    </div>
  );
};
