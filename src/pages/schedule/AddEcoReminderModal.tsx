import React, { useState } from 'react';
import { PersonalCalendarEvent } from '../../types';
import { X, Calendar, Clock, Bell, Tag, Sparkles, CheckCircle2 } from 'lucide-react';

interface AddEcoReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: Partial<PersonalCalendarEvent>) => Promise<void>;
  initialDate?: string;
  userId?: string;
}

const PRESET_REMINDERS = [
  { title: '🥬 Take out Kitchen Biodegradables', category: 'Garbage Collection', time: '06:00 AM' },
  { title: '🧴 Clean & Dry Recyclable Plastics', category: 'Recycling Schedule', time: '07:00 AM' },
  { title: '📦 Flatten & Bundle Cardboard Boxes', category: 'Recycling Schedule', time: '08:00 AM' },
  { title: '🔋 Bring Batteries & E-Waste to MRF', category: 'Recycling Schedule', time: '10:00 AM' },
  { title: '🧹 Clear Neighborhood Drainage / Gutters', category: 'Cleanup Event', time: '07:30 AM' },
  { title: '🌱 Compost Bin Moisture & Turn Check', category: 'Personal Reminder', time: '05:00 PM' },
];

export const AddEcoReminderModal: React.FC<AddEcoReminderModalProps> = ({
  isOpen,
  onClose,
  onAddEvent,
  initialDate,
  userId = 'user-resident-1',
}) => {
  const defaultDate = initialDate || new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('06:30 AM');
  const [type, setType] = useState<PersonalCalendarEvent['type']>('Personal Reminder');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_REMINDERS[0]) => {
    setTitle(preset.title);
    setType(preset.category as any);
    setTime(preset.time);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddEvent({
        userId,
        title: title.trim(),
        date,
        time,
        type,
        description: description.trim() || undefined,
        isCustom: true,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setTitle('');
        setDescription('');
      }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Add Eco Calendar Reminder</h2>
              <p className="text-xs text-slate-500">Plan household waste sorting & community activities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base font-black text-emerald-900">Reminder Added!</h3>
            <p className="text-xs text-emerald-700">Your reminder is now pinned to your Eco Calendar.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> One-Tap Quick Presets:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REMINDERS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg font-medium text-slate-700 transition-all text-left"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Reminder / Activity Title *</label>
              <input
                type="text"
                required
                placeholder="e.g., Put out bio-waste bin by the gate"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Time (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 06:30 AM"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Category
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="Garbage Collection">🗑️ Garbage Collection</option>
                <option value="Recycling Schedule">♻️ Recycling Schedule / MRF</option>
                <option value="Cleanup Event">🌿 Cleanup Activity / Drive</option>
                <option value="Personal Reminder">📌 Personal Eco Reminder</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Special Notes & Segregation Instructions</label>
              <textarea
                rows={2}
                placeholder="e.g., Double check that plastics are washed and no food residue remains..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-normal"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
              >
                <Bell className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Pin to Calendar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
