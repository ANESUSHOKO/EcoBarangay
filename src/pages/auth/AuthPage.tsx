import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, UserRole, Barangay } from '../../types';
import { Leaf, UserCheck, Shield, Lock, Mail, User as UserIcon, Phone, MapPin, Sparkles, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  onSuccess: (user: User) => void;
  onOpenLocationModal: () => void;
  selectedBarangay: Barangay | null;
}

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email);
      if (res.success && res.user) {
        onSuccess(res.user);
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

    setLoading(true);
    setError(null);

    try {
      const res = await api.register({
        email,
        fullName,
        role,
        barangayId: selectedBarangay.id,
        phone,
      });

      if (res.success && res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetLogin = async (presetEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(presetEmail);
      if (res.success && res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError('Failed to log in with preset account.');
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
                    onClick={() => setRole('RESIDENT')}
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
                    onClick={() => setRole('BARANGAY_OFFICIAL')}
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

          {/* Preset Demo Accounts */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Instant Demo Access
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetLogin('resident@ecobarangay.ph')}
                className="p-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl text-[11px] font-bold transition-colors"
              >
                Maria Santos (Resident)
              </button>
              <button
                type="button"
                onClick={() => handlePresetLogin('official@ecobarangay.ph')}
                className="p-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl text-[11px] font-bold transition-colors"
              >
                Kapitan Juan (Official)
              </button>
              <button
                type="button"
                onClick={() => handlePresetLogin('admin@ecobarangay.ph')}
                className="p-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl text-[11px] font-bold transition-colors"
              >
                Admin Sofia (System Admin)
              </button>
            </div>
          </div>

          {/* Toggle Login/Register */}
          <div className="text-center pt-2">
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
