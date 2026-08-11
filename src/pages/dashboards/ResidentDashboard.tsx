import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Barangay, GarbageSchedule, UserActivityLog, Announcement, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import {
  Award,
  Recycle,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Volume2,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Camera,
  Upload,
  Share2,
  X,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { RegisterHouseholdModal } from '../../components/modals';

interface ResidentDashboardProps {
  currentUser: User;
  currentBarangay: Barangay;
  onNavigate: (page: string) => void;
  onUserUpdate: (updatedUser: User) => void;
  lang?: Language;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({
  currentUser,
  currentBarangay,
  onNavigate,
  onUserUpdate,
  lang = 'en'
}) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [schedules, setSchedules] = useState<GarbageSchedule[]>([]);
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Log Waste Form Modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [householdModalOpen, setHouseholdModalOpen] = useState(false);
  const [wasteType, setWasteType] = useState('PET Plastic Bottles');
  const [wasteKg, setWasteKg] = useState('2.5');
  const [photoUrl, setPhotoUrl] = useState('');
  const [autoPostToFeed, setAutoPostToFeed] = useState(true);
  const [submittingWaste, setSubmittingWaste] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getSchedules(currentBarangay.id).then(setSchedules).catch(console.error);
    api.getActivityLogs(currentUser.id).then(setLogs).catch(console.error);
    api.getAnnouncements(currentBarangay.id).then(setAnnouncements).catch(console.error);
  }, [currentBarangay.id, currentUser.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kgVal = parseFloat(wasteKg);
    if (isNaN(kgVal) || kgVal <= 0) return;

    setSubmittingWaste(true);
    try {
      const res = await api.logWaste(currentUser.id, kgVal, wasteType, photoUrl || undefined, autoPostToFeed);
      if (res.success && res.user) {
        onUserUpdate(res.user);
        setLogSuccessMessage(`Great job! +${Math.round(kgVal * 10)} Eco Points added to your profile.`);
        setTimeout(() => {
          setLogSuccessMessage(null);
          setLogModalOpen(false);
          setPhotoUrl('');
        }, 2000);

        // Refresh activity logs
        api.getActivityLogs(currentUser.id).then(setLogs).catch(console.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingWaste(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Profile Overview */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={currentUser.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black">{currentUser.fullName}</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                  Resident
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Brgy. {currentBarangay.name}, {currentBarangay.cityName} ({currentBarangay.provinceName})
              </p>
            </div>
          </div>

          {/* User Score & Points Counter */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-center px-3 border-r border-white/20">
              <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Eco Points</div>
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                ⚡ {currentUser.ecoPoints}
              </div>
            </div>

            <div className="text-center px-3 border-r border-white/20">
              <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Recycled</div>
              <div className="text-2xl font-black text-emerald-400">
                {currentUser.kgRecycled} kg
              </div>
            </div>

            <div className="text-center px-3">
              <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Eco Score</div>
              <div className="text-2xl font-black text-cyan-400">
                {currentUser.ecoScore} / 100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Carousel / Banner */}
      {announcements.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
          <Volume2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Barangay Announcement • {announcements[0].authorName}
              </span>
              <span className="text-[10px] text-emerald-600">
                {new Date(announcements[0].createdAt).toLocaleDateString()}
              </span>
            </div>
            <h4 className="text-sm font-bold text-emerald-950 mt-0.5">{announcements[0].title}</h4>
            <p className="text-xs text-emerald-800 mt-1">{announcements[0].content}</p>
          </div>
        </div>
      )}

      {/* Household Compliance Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">Household Registration</h3>
              {currentUser.householdRegistered ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  Not Registered Yet (+50 pts)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser.householdRegistered
                ? `${currentUser.householdHeadName || currentUser.fullName} • ${currentUser.householdAddress || 'Address on record'} • ${currentUser.householdMembersCount || 4} members (${currentUser.householdSegregationType || '3-Bin System'})`
                : 'Register your home address and family segregation bin setup under RA 9003 to claim +50 Eco Points.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setHouseholdModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{currentUser.householdRegistered ? 'Edit Household Info' : 'Register Your Household'}</span>
        </button>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setLogModalOpen(true)}
          className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl shadow-md hover:shadow-lg transition-all text-left group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <PlusCircle className="w-6 h-6 text-emerald-200" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">+ Points</span>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-extrabold group-hover:translate-x-0.5 transition-transform">
              Log Recycled Waste
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">Record plastics, glass, paper or metal drop-off.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('map')}
          className="p-5 bg-white border border-slate-200/80 hover:border-emerald-400 rounded-3xl shadow-2xs hover:shadow-sm transition-all text-left group flex flex-col justify-between"
        >
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl w-max">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Find Recycling Centers & MRFs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Locate nearby junk shops & e-waste hubs.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="p-5 bg-white border border-slate-200/80 hover:border-emerald-400 rounded-3xl shadow-2xs hover:shadow-sm transition-all text-left group flex flex-col justify-between"
        >
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl w-max">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
              Report Illegal Dumping
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">File reports & track official resolution.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('events')}
          className="p-5 bg-white border border-slate-200/80 hover:border-emerald-400 rounded-3xl shadow-2xs hover:shadow-sm transition-all text-left group flex flex-col justify-between"
        >
          <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl w-max">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
              Join Cleanup Drives
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Participate in community sustainability events.</p>
          </div>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Barangay Garbage Collection Schedule */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Collection Schedule
              </h3>
              <p className="text-xs text-slate-500">Official trash collection for Brgy. {currentBarangay.name}</p>
            </div>
            <button
              onClick={() => onNavigate('schedule')}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Full Calendar
            </button>
          </div>

          <div className="space-y-3">
            {schedules.map(sch => (
              <div
                key={sch.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">{sch.dayOfWeek}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {sch.wasteType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {sch.timeSlot}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">{sch.instructions}</p>
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No collection schedule logged for this barangay yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Personal Eco Activity Log */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Activity & Eco Points History
              </h3>
              <p className="text-xs text-slate-500">Your recent sustainability contributions</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {logs.map(log => (
              <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{log.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{log.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
                <div className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full">
                  +{log.pointsEarned} pts
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">
                No activity logs yet. Try logging waste or joining a challenge!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Log Recycled Waste Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Recycle className="w-5 h-5 text-emerald-600" /> Log Recycled Waste
              </h3>
              <button onClick={() => setLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {logSuccessMessage ? (
              <div className="p-4 bg-emerald-100 text-emerald-900 font-bold rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{logSuccessMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleLogWasteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recyclable Waste Category</label>
                  <select
                    value={wasteType}
                    onChange={e => setWasteType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="PET Plastic Bottles">PET Plastic Bottles</option>
                    <option value="Clean Cardboard & Paper">Clean Cardboard & Paper</option>
                    <option value="Glass Bottles & Jars">Glass Bottles & Jars</option>
                    <option value="Aluminum Cans & Scrap Metal">Aluminum Cans & Scrap Metal</option>
                    <option value="E-Waste & Small Electronics">E-Waste & Small Electronics</option>
                    <option value="Organic Kitchen Food Scraps">Organic Kitchen Food Scraps</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Weight (Kilograms)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={wasteKg}
                    onChange={e => setWasteKg(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">1 kg recycled = 10 Eco Points earned for your household!</p>
                </div>

                {/* Snap / Upload Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attach Photo Evidence (Optional)</label>
                  {photoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-40">
                      <img src={photoUrl} alt="Recycled waste photo" className="w-full max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition-colors text-xs font-semibold text-slate-600 hover:text-emerald-700">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoUrl('https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800')
                        }
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 shrink-0"
                      >
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Sample</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Auto share to Feed Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoPost"
                    checked={autoPostToFeed}
                    onChange={e => setAutoPostToFeed(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="autoPost" className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-emerald-600" />
                    Share this achievement to Community Eco Feed
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWaste}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    {submittingWaste && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Log
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Register Household Modal */}
      <RegisterHouseholdModal
        isOpen={householdModalOpen}
        onClose={() => setHouseholdModalOpen(false)}
        currentUser={currentUser}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
};
