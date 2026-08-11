import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { Home, Users, MapPin, Sparkles, X, CheckCircle2, ShieldCheck, Trash2, Loader2 } from 'lucide-react';

interface RegisterHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

export const RegisterHouseholdModal: React.FC<RegisterHouseholdModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
}) => {
  if (!isOpen) return null;

  const [headName, setHeadName] = useState(currentUser.householdHeadName || currentUser.fullName);
  const [address, setAddress] = useState(currentUser.householdAddress || '');
  const [membersCount, setMembersCount] = useState<number>(currentUser.householdMembersCount || 4);
  const [segregationType, setSegregationType] = useState(
    currentUser.householdSegregationType || '3-Bin Segregation (Nabubulok, Di-Nabubulok, Recyclable)'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please provide your complete household street address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.registerHousehold(currentUser.id, {
        householdHeadName: headName,
        householdAddress: address,
        householdMembersCount: Number(membersCount),
        householdSegregationType: segregationType,
      });

      if (res.success && res.user) {
        onUserUpdate(res.user);
        setSuccessMsg('🎉 Household registered successfully! +50 Eco Points awarded.');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register household.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black leading-tight">Register Your Household</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Brgy. {currentUser.barangayName}, {currentUser.city}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
              {error}
            </div>
          )}

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">RA 9003 Compliance Perk:</span> Registering your household certifies
              your family's participation in barangay waste segregation and unlocks{' '}
              <strong className="text-emerald-700">+50 Eco Points</strong>!
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Household Head / Family Name</label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={headName}
                onChange={e => setHeadName(e.target.value)}
                placeholder="e.g. Santos Family / Juan Santos"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Complete Street Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. #142 Sampaguita St., Zone 4"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Household Members</label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={membersCount}
                onChange={e => setMembersCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Segregation System</label>
              <select
                value={segregationType}
                onChange={e => setSegregationType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="3-Bin Segregation (Nabubulok, Di-Nabubulok, Recyclable)">3-Bin System (Standard)</option>
                <option value="4-Bin System (+ Hazardous/E-waste)">4-Bin System (+ Hazardous)</option>
                <option value="Composting + Recyclables Only">Home Composting + Recyclables</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Household Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
