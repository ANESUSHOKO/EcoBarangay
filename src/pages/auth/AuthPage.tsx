import React, { useState } from 'react';
import { api } from '../../lib/api';
import { User, Barangay } from '../../types';
import { auth } from '../../lib/firebase';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  Leaf,
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
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  // Form states - Login & Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarInputType, setAvatarInputType] = useState<'preset' | 'upload' | 'url'>('preset');

  const [forgotEmail, setForgotEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Reject GIF format explicitly (TC_REPORT_04)
    if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
      setError('GIF format is not supported. Please upload a JPG, PNG, or WEBP photo.');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpe?g|png|webp)$/i;

    if (!allowedTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setError('Invalid file format. Only JPG, JPEG, PNG, and WEBP images are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      e.target.value = '';
      return;
    }

    setUploadingImage(true);

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

  // Sign in with Firebase Authentication and require a verified email.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      let firebaseUser;
      try {
        firebaseUser = (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
      } catch (signInError) {
        const migration = await api.checkLegacyCredentials(email.trim(), password);
        if (!migration.success) throw signInError;

        firebaseUser = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
        try {
          await sendEmailVerification(firebaseUser, { url: window.location.origin });
        } catch (error) {
          await deleteUser(firebaseUser);
          throw error;
        }
        await signOut(auth);
        setSuccessInfo('We sent an email verification link. Verify your email, then sign in again.');
        return;
      }

      if (!firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser, { url: window.location.origin });
        await signOut(auth);
        setSuccessInfo('Please verify your email using the link we sent before signing in.');
        return;
      }

      onSuccess(await api.getCurrentUser());
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Firebase sends a password-reset link without exposing a reset code to the app.
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim(), { url: window.location.origin });
      setMode('login');
      setSuccessInfo('If an account exists for that address, Firebase has sent a password-reset link.');
    } catch (err: any) {
      setError(err.message || 'Unable to send a password-reset email.');
    } finally {
      setLoading(false);
    }
  };

  // Register Account
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

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firebaseUser = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
      try {
        await sendEmailVerification(firebaseUser, { url: window.location.origin });
        await api.register({
          email: firebaseUser.email || email.trim(),
          fullName: fullName.trim(),
          role: 'RESIDENT',
          barangayId: selectedBarangay.id,
          phone: phone.trim() || undefined,
          avatarUrl: avatarUrl || undefined,
        });
      } catch (error) {
        await deleteUser(firebaseUser);
        throw error;
      }
      await signOut(auth);
      setMode('login');
      setEmail(email.trim());
      setPassword('');
      setSuccessInfo('Account created. Verify your email using the link we sent, then sign in.');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden transition-all text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-emerald-900 to-slate-900 text-white text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Leaf className="w-7 h-7 fill-slate-950/20" />
          </div>
          <h2 className="text-2xl font-black">
            {mode === 'login'
              ? 'Welcome Back to EcoBarangay'
              : mode === 'forgot_password'
              ? 'Reset Account Password'
              : 'Register Your Household'}
          </h2>
          <p className="text-xs text-emerald-200 leading-relaxed">
            {mode === 'login'
              ? 'Enter your account credentials to access your dashboard.'
              : mode === 'forgot_password'
              ? 'Enter your email address and Firebase will send a secure password-reset link.'
              : 'Join your local Philippine community environmental network.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot_password' ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="resident@ecobarangay.ph"
                      value={forgotEmail}
                      onChange={e => {
                        setForgotEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Firebase will email a secure password-reset link if an account exists for this address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !forgotEmail.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending Link...' : 'Send Reset Link'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessInfo(null);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </form>
          ) : mode === 'login' ? (
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
                      onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Account Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setForgotEmail(email.trim());
                        setError(null);
                        setSuccessInfo(null);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your account password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
          ) : (
            /* REGISTER MODE */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                New accounts are resident accounts. Barangay official access requires administrator approval.
              </div>

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
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? 'Uploading image...' : 'Choose Photo File'}
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
                    onChange={e => {
                      setFullName(e.target.value);
                      if (error) setError(null);
                    }}
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
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Create Account Password <span className="text-[10px] text-slate-400 font-normal">(Min. 6 characters)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Create a strong account password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter your account password"
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                    onChange={e => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
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

          {/* Toggle Login/Register/Forgot */}
          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
            {mode === 'forgot_password' ? (
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Remembered your password? Sign in
              </button>
            ) : mode === 'login' ? (
              <button
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Don't have an account? Register household
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Already registered? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
