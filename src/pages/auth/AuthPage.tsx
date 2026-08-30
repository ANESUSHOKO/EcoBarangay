import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, UserRole, Barangay } from '../../types';
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
  KeyRound,
  ArrowLeft,
  RotateCw,
  Inbox,
  Shield,
  HelpCircle,
  CheckCircle2
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
  const [role, setRole] = useState<UserRole>('RESIDENT');

  // Form states - Login & Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [officialPassword, setOfficialPassword] = useState('');
  const [showOfficialPassword, setShowOfficialPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarInputType, setAvatarInputType] = useState<'preset' | 'upload' | 'url'>('preset');

  // OTP Login Step states
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password flow states
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [simulatedResetOtpNotice, setSimulatedResetOtpNotice] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  // Login Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Forgot Password Resend cooldown timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setForgotCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCooldown]);

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

  // Step 1: Submit Password Login & Trigger Email OTP
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
      const res = await api.login(email.trim(), password);
      if (res.success) {
        if (res.requireOtp) {
          // Switch to OTP verification view
          setLoginStep('otp');
          setOtpCode('');
          setResendCooldown(45);
          if (res.simulatedOtpCode) {
            setSimulatedOtpNotice(res.simulatedOtpCode);
          }
          setSuccessInfo(`Verification code sent to ${res.email || email}.`);
        } else if (res.user) {
          // Direct login fallback
          onSuccess(res.user);
        }
      } else {
        setError(res.message || 'Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Login OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyOtp(email.trim(), otpCode.trim());
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || 'Invalid verification code. Please check your email and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Login OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await api.resendOtp(email.trim());
      if (res.success) {
        setResendCooldown(45);
        if (res.simulatedOtpCode) {
          setSimulatedOtpNotice(res.simulatedOtpCode);
        }
        setSuccessInfo(`A fresh 6-digit verification code was sent to ${email}.`);
      } else {
        setError(res.message || 'Failed to resend verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 1 - Request Reset Code
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
      const res = await api.requestPasswordReset(forgotEmail.trim());
      if (res.success) {
        setForgotStep('reset');
        setForgotOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setForgotCooldown(45);
        if (res.simulatedOtpCode) {
          setSimulatedResetOtpNotice(res.simulatedOtpCode);
        }
        setSuccessInfo(`Password reset code sent to ${forgotEmail.trim()}.`);
      } else {
        setError(res.message || 'No account found with this email address.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 2 - Resend Reset Code
  const handleResendResetOtp = async () => {
    if (forgotCooldown > 0 || loading) return;

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await api.requestPasswordReset(forgotEmail.trim());
      if (res.success) {
        setForgotCooldown(45);
        if (res.simulatedOtpCode) {
          setSimulatedResetOtpNotice(res.simulatedOtpCode);
        }
        setSuccessInfo(`A new password reset code has been sent to ${forgotEmail.trim()}.`);
      } else {
        setError(res.message || 'Failed to resend reset code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 3 - Submit New Password with OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.resetPassword(forgotEmail.trim(), forgotOtp.trim(), newPassword);
      if (res.success) {
        // Return to login mode with success notice
        setMode('login');
        setLoginStep('credentials');
        setEmail(forgotEmail.trim());
        setPassword('');
        setSuccessInfo('Password reset successfully! Please sign in with your new password.');
      } else {
        setError(res.message || 'Failed to reset password. Please check your verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
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
        password: password,
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
        setError(res.message || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden transition-all">
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-emerald-900 to-slate-900 text-white text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Leaf className="w-7 h-7 fill-slate-950/20" />
          </div>
          <h2 className="text-2xl font-black">
            {mode === 'login'
              ? loginStep === 'otp'
                ? 'Two-Step Email Verification'
                : 'Welcome Back to EcoBarangay'
              : mode === 'forgot_password'
              ? forgotStep === 'email'
                ? 'Reset Account Password'
                : 'Enter Verification Code'
              : 'Register Your Household'}
          </h2>
          <p className="text-xs text-emerald-200 leading-relaxed">
            {mode === 'login'
              ? loginStep === 'otp'
                ? 'Enter the 6-digit security code sent to verify your login.'
                : 'Enter your account credentials to access your dashboard.'
              : mode === 'forgot_password'
              ? forgotStep === 'email'
                ? 'Enter your registered email address to receive a secure password reset code.'
                : 'Verify your code and create a new secure password.'
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
            forgotStep === 'email' ? (
              /* Step 1: Request Reset Code with Email */
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
                    We will send a 6-digit verification code to this address to verify your identity.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !forgotEmail.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLoginStep('credentials');
                      setError(null);
                      setSuccessInfo(null);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Verify Code & Set New Password */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reset Code Sent</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    A 6-digit reset code has been sent to <strong className="font-mono text-emerald-950">{forgotEmail}</strong>.
                  </p>
                </div>

                {/* Simulated Email Delivery Banner */}
                {simulatedResetOtpNotice && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4 text-amber-600" />
                        Simulated Email Inbox
                      </span>
                      <button
                        type="button"
                        onClick={() => setForgotOtp(simulatedResetOtpNotice)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200 text-xs">
                      <span className="text-slate-600 font-medium">EcoBarangay Reset Code:</span>
                      <span className="font-mono font-black text-amber-800 text-base tracking-widest bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {simulatedResetOtpNotice}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                    Enter 6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    value={forgotOtp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setForgotOtp(val);
                      if (error) setError(null);
                    }}
                    className="w-full py-3 text-center tracking-[0.4em] font-mono text-2xl font-black bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                  />
                </div>

                <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password <span className="text-[10px] text-slate-400 font-normal">(Min. 6 characters)</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Create a new password"
                        value={newPassword}
                        onChange={e => {
                          setNewPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Re-enter your new password"
                        value={confirmNewPassword}
                        onChange={e => {
                          setConfirmNewPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotOtp.length !== 6 || !newPassword || !confirmNewPassword}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Resetting Password...' : 'Save New Password & Sign In'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setError(null);
                      setSuccessInfo(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendResetOtp}
                    disabled={forgotCooldown > 0 || loading}
                    className="text-emerald-700 hover:text-emerald-800 font-bold disabled:opacity-40 flex items-center gap-1"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {forgotCooldown > 0 ? `Resend code (${forgotCooldown}s)` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )
          ) : mode === 'login' ? (
            /* LOGIN MODE */
            loginStep === 'credentials' ? (
              /* Step 1: Email & Password */
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
                        setForgotStep('email');
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
                  {loading ? 'Verifying Password...' : 'Sign In'}
                </button>
              </form>
            ) : (
              /* Step 2: Email Verification OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verification Code Sent</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    A 6-digit OTP has been dispatched to <strong className="font-mono text-emerald-950">{email}</strong>.
                  </p>
                </div>

                {/* Simulated Email Delivery Banner */}
                {simulatedOtpNotice && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4 text-amber-600" />
                        Simulated Email Inbox
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(simulatedOtpNotice)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200 text-xs">
                      <span className="text-slate-600 font-medium">EcoBarangay Login OTP:</span>
                      <span className="font-mono font-black text-amber-800 text-base tracking-widest bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {simulatedOtpNotice}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    value={otpCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (error) setError(null);
                    }}
                    className="w-full py-3 text-center tracking-[0.4em] font-mono text-2xl font-black bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying OTP...' : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('credentials');
                      setError(null);
                      setSuccessInfo(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Password
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-emerald-700 hover:text-emerald-800 font-bold disabled:opacity-40 flex items-center gap-1"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* REGISTER MODE */
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
          <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
            {mode === 'forgot_password' ? (
              <button
                onClick={() => {
                  setMode('login');
                  setLoginStep('credentials');
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-bold text-emerald-700 hover:underline"
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
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Don't have an account? Register household
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode('login');
                  setLoginStep('credentials');
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-bold text-emerald-700 hover:underline"
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
