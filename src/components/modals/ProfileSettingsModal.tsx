import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { uploadProfilePicture } from '../../lib/storage';
import {
  X,
  Camera,
  Upload,
  Link,
  Sparkles,
  Check,
  User as UserIcon,
  Phone,
  Home,
  Users,
  MapPin,
  Save,
  AlertCircle
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  { label: 'Resident 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
  { label: 'Resident 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250' },
  { label: 'Resident 3', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250' },
  { label: 'Community Lead', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=250' },
  { label: 'Youth Eco', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=250' },
  { label: 'Volunteer', url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=250' },
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl || currentUser.avatarUrl || '');
  const [avatarInputType, setAvatarInputType] = useState<'preset' | 'upload' | 'url'>('preset');

  const [householdHeadName, setHouseholdHeadName] = useState(currentUser.householdHeadName || '');
  const [householdMembersCount, setHouseholdMembersCount] = useState(currentUser.householdMembersCount || 1);
  const [householdAddress, setHouseholdAddress] = useState(currentUser.householdAddress || '');
  const [householdSegregationType, setHouseholdSegregationType] = useState(
    currentUser.householdSegregationType || '3-Bin Segregation System'
  );

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const downloadUrl = await uploadProfilePicture(file, currentUser.id);
      setPhotoUrl(downloadUrl);
    } catch (err: any) {
      console.error('Failed to upload image to Firebase Storage:', err);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updates: Partial<User> = {
        fullName,
        phone,
        photoUrl: photoUrl || undefined,
        avatarUrl: photoUrl || undefined,
        householdHeadName: householdHeadName || undefined,
        householdMembersCount: Number(householdMembersCount) || 1,
        householdAddress: householdAddress || undefined,
        householdSegregationType,
      };

      const res = await api.updateProfile(currentUser.id, updates);
      if (res.success && res.user) {
        onUpdateUser(res.user);
        setSuccessMsg('Profile and photo updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Profile & Settings</h2>
              <p className="text-xs text-slate-500">Update your photo, contact, and household info</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Profile Picture Upload Section */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Profile Picture (Firebase Storage)
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-200/80 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex rounded-xl bg-slate-200/60 p-0.5 text-[11px] font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setAvatarInputType('preset')}
                    className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      avatarInputType === 'preset' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarInputType('upload')}
                    className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      avatarInputType === 'upload' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3 h-3 text-emerald-600" /> Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarInputType('url')}
                    className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      avatarInputType === 'url' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <Link className="w-3 h-3 text-emerald-600" /> URL
                  </button>
                </div>

                {avatarInputType === 'upload' && (
                  <div>
                    <label
                      className={`cursor-pointer block text-center px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 transition-all shadow-xs ${
                        uploadingImage ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? 'Uploading to Firebase Storage...' : 'Choose Photo File'}
                    </label>
                  </div>
                )}

                {avatarInputType === 'url' && (
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            {avatarInputType === 'preset' && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Select a profile avatar:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(preset.url)}
                      className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        photoUrl === preset.url
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105'
                          : 'border-transparent opacity-80 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-10 h-10 object-cover" />
                      {photoUrl === preset.url && (
                        <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-xs" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Basic Info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+63 912 345 6789"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Household Details */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-emerald-600" /> Household Profile
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Head of Household</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={householdHeadName}
                  onChange={e => setHouseholdHeadName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Household Members</label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={householdMembersCount}
                    onChange={e => setHouseholdMembersCount(Number(e.target.value))}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Household Address</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Street, House No."
                  value={householdAddress}
                  onChange={e => setHouseholdAddress(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
