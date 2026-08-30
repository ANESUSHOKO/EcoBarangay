import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { ThemeMode } from '../../lib/theme';
import { X, User as UserIcon, Phone, MapPin, Camera, Save, CheckCircle2, AlertCircle, Moon, Sun, Code2 } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenDeveloperInfo?: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  theme,
  onToggleTheme,
  onOpenDeveloperInfo,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || currentUser.photoUrl || '');
  const [householdAddress, setHouseholdAddress] = useState(currentUser.householdAddress || '');
  const [householdMembersCount, setHouseholdMembersCount] = useState(currentUser.householdMembersCount || 1);
  const [householdSegregationType, setHouseholdSegregationType] = useState(currentUser.householdSegregationType || '3-Way (Bio, Recyclable, Residual)');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.updateProfile(currentUser.id, {
        fullName,
        phone,
        avatarUrl,
        householdAddress,
        householdMembersCount,
        householdSegregationType,
      });

      if (res.success && res.user) {
        onUpdateUser(res.user);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError('Failed to update profile settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Profile & Household Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your eco-identity and display preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile successfully updated!</span>
          </div>
        )}

        {/* Theme Mode Option */}
        {onToggleTheme && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Theme Appearance</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Avatar section */}
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="relative">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={fullName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500"
              />
              <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 shadow-md">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 dark:text-white">{fullName || 'Resident'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Brgy. {currentUser.barangayName}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                {currentUser.ecoPoints || 0} EcoPoints • Level {Math.floor((currentUser.ecoPoints || 0) / 100) + 1}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+63 912 345 6789"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Household Members</label>
              <input
                type="number"
                min="1"
                max="20"
                value={householdMembersCount}
                onChange={e => setHouseholdMembersCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Household Address / Purok</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={householdAddress}
                onChange={e => setHouseholdAddress(e.target.value)}
                placeholder="Unit, Street, Purok / Zone"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Waste Segregation Practice</label>
            <select
              value={householdSegregationType}
              onChange={e => setHouseholdSegregationType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            >
              <option value="3-Way (Bio, Recyclable, Residual)">3-Way (Biodegradable, Recyclable, Residual)</option>
              <option value="4-Way (Bio, Recyclable, Residual, Special/Hazardous)">4-Way (Bio, Recyclable, Residual, Special/Hazardous)</option>
              <option value="Zero-Waste Household (Composting + Full Recycling)">Zero-Waste Household (Composting + Full Recycling)</option>
            </select>
          </div>

          {/* Developer & Platform Credits */}
          {onOpenDeveloperInfo && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Anesu Lancelot Shoko
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Lead Software Engineer & Architect
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenDeveloperInfo}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
              >
                View Profile
              </button>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
