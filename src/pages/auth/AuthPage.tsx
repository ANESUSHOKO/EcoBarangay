import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, UserRole, Barangay } from '../../types';
import {
  Leaf,
  UserCheck,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Sparkles,
  AlertCircle,
  Camera,
  Upload,
  Link,
  X,
  Check,
  Image as ImageIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  KeyRound
} from 'lucide-react';

interface AuthPageProps {
  onSuccess: (user: User) => void;
  onOpenLocationModal: () => void;
  selectedBarangay: Barangay | null;
}

const PRESET_AVATARS = [
  { label: 'Resident 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
  { label: 'Resident 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250' },
  { label: 'Resident 3', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250' },
  { label: 'Community Lead', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=250' },
  { label: 'Youth Eco', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=250' },
  { label: 'Volunteer', url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=250' },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onOpenLocationModal,
  selectedBarangay,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('RESIDENT');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [officialPassword, setOfficialPassword] = useState('');
  const [showOfficialPassword, setShowOfficialPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarInputType, setAvatarInputType] = useState<'preset' | 'upload' | 'url'>('preset');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
      setUploadingImage(false);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || 'No account found with this email. Please register below.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangay) {
      setError('Please select your home Barangay before registering.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (role === 'BARANGAY_OFFICIAL') {
      if (!officialPassword.trim()) {
        setError('Please enter the required authorization password to register as a Barangay Official.');
        return;
      }
      if (officialPassword.trim() !== '123456') {
        setError('Invalid Barangay Official authorization password. Please check your credentials or contact your LGU.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.register({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        barangayId: selectedBarangay.id,
        officialPassword: role === 'BARANGAY_OFFICIAL' ? officialPassword.trim() : undefined,
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-emerald-900 to-slate-900 text-white text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Leaf className="w-7 h-7 fill-slate-950/20" />
          </div>
          <h2 className="text-2xl font-black">
            {mode === 'login' ? 'Welcome Back to EcoBarangay' : 'Register Your Household'}
          </h2>
          <p className="text-xs text-emerald-200">
            {mode === 'login'
              ? 'Access your sustainability dashboard, points & barangay reports.'
              : 'Join your local Philippine community environmental network.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="resident@ecobarangay.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('RESIDENT');
                      if (error) setError(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                      role === 'RESIDENT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🇵🇭 Resident Household
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('BARANGAY_OFFICIAL');
                      if (error) setError(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                      role === 'BARANGAY_OFFICIAL'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🏛️ Barangay Official
                  </button>
                </div>
              </div>

              {/* Barangay Official Verification Password Requirement */}
              {role === 'BARANGAY_OFFICIAL' && (
                <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-300 space-y-2.5 transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      Official Authorization Password <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Signing up as a Barangay Official requires the official administrative authorization password provided by your local LGU or CENRO office.
                  </p>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-600 absolute left-3.5 top-3" />
                    <input
                      type={showOfficialPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter official authorization password"
                      value={officialPassword}
                      onChange={e => {
                        setOfficialPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOfficialPassword(!showOfficialPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showOfficialPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Profile Picture Option */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Profile Picture <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-200/80 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Method Selector */}
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
                        <label className={`cursor-pointer block text-center px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 transition-all shadow-xs ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
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
                        value={avatarUrl}
                        onChange={e => setAvatarUrl(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    )}
                  </div>
                </div>

                {avatarInputType === 'preset' && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Pick a community avatar:</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {PRESET_AVATARS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                            avatarUrl === preset.url
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105'
                              : 'border-transparent opacity-80 hover:opacity-100 hover:border-slate-300'
                          }`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-10 h-10 object-cover" />
                          {avatarUrl === preset.url && (
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="maria.santos@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Home Barangay Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Home Barangay</label>
                <div
                  onClick={onOpenLocationModal}
                  className="p-3 bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{selectedBarangay ? `${selectedBarangay.name}, ${selectedBarangay.cityName}` : 'Click to select Barangay'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 underline">Change</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="0917 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Toggle Login/Register */}
          <div className="text-center pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              {mode === 'login' ? "Don't have an account? Register household" : 'Already registered? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
