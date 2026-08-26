import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Barangay, EnvironmentalReport, Event, GarbageSchedule, Facility } from '../../types';
import { OfficialAnalyticsSection } from '../../components/dashboard';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  PlusCircle,
  Megaphone,
  Recycle,
  Clock,
  TrendingUp,
  MapPin,
  Loader2,
  BarChart3,
  Users,
  Layers,
  Map
} from 'lucide-react';

interface OfficialDashboardProps {
  currentUser: User;
  currentBarangay: Barangay;
  onRefreshData: () => void;
}

export const OfficialDashboard: React.FC<OfficialDashboardProps> = ({
  currentUser,
  currentBarangay,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'events' | 'schedules' | 'facilities'>('analytics');

  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<GarbageSchedule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // Resolution modal
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingReport, setUpdatingReport] = useState(false);

  // New Event Form
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('2026-08-20');
  const [eventTime, setEventTime] = useState('07:00 AM - 10:00 AM');
  const [eventCategory, setEventCategory] = useState<'Cleanup' | 'Tree Planting' | 'Workshop' | 'Recycling Drive'>('Cleanup');
  const [eventPoints, setEventPoints] = useState('150');

  useEffect(() => {
    fetchOfficialData();
  }, [currentBarangay.id]);

  const fetchOfficialData = () => {
    api.getReports(currentBarangay.id).then(setReports).catch(console.error);
    api.getEvents(currentBarangay.id).then(setEvents).catch(console.error);
    api.getSchedules(currentBarangay.id).then(setSchedules).catch(console.error);
    api.getFacilities({ barangayId: currentBarangay.id }).then(setFacilities).catch(console.error);
  };

  const handleResolveReport = async (status: 'In Progress' | 'Resolved' | 'Rejected') => {
    if (!resolvingReportId) return;
    setUpdatingReport(true);
    try {
      await api.updateReportStatus(resolvingReportId, status, resolutionNotes);
      setResolvingReportId(null);
      setResolutionNotes('');
      fetchOfficialData();
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingReport(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEvent({
        title: eventTitle,
        description: eventDesc,
        date: eventDate,
        time: eventTime,
        location: `Brgy. ${currentBarangay.name} Community Grounds`,
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        organizerName: `Brgy. ${currentBarangay.name} LGU Council`,
        category: eventCategory,
        pointsAwarded: parseInt(eventPoints, 10),
        maxParticipants: 50,
        lat: currentBarangay.lat,
        lng: currentBarangay.lng,
      });
      setShowEventModal(false);
      fetchOfficialData();
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Official Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black">{currentUser.fullName}</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Official Verification Active
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                LGU Official Portal • Brgy. {currentBarangay.name}, {currentBarangay.cityName} ({currentBarangay.provinceName})
              </p>
            </div>
          </div>

          {/* Barangay Score Pill */}
          <div className="p-4 bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300">National Rank</div>
              <div className="text-2xl font-black text-amber-400">#{currentBarangay.score.nationalRank}</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300">Sustainability Score</div>
              <div className="text-2xl font-black text-emerald-400">{currentBarangay.score.totalScore} / 100</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300">Total Citizens</div>
              <div className="text-2xl font-black text-teal-300">{currentBarangay.population.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-2 gap-2 overflow-x-auto shadow-xs">
        {[
          { id: 'analytics', label: '📊 Trends & Waste Diversion Analytics', icon: BarChart3 },
          { id: 'reports', label: `⚠️ Environmental Reports (${reports.filter(r => r.status === 'Pending').length} Pending)`, icon: AlertTriangle },
          { id: 'events', label: '📅 Cleanup Drives & Events', icon: Calendar },
          { id: 'schedules', label: '⏰ Collection Schedule', icon: Clock },
          { id: 'facilities', label: '🏢 Barangay MRFs & Centers', icon: Building2 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Recharts Data Visualization Section */}
      {activeTab === 'analytics' && (
        <OfficialAnalyticsSection
          currentBarangay={currentBarangay}
          currentUser={currentUser}
        />
      )}

      {/* Tab Content 2: Environmental Reports */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submitted Dumping & Violation Reports</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Resolving reports improves your barangay's official score rating and community health.</p>
            </div>
          </div>

          <div className="space-y-3">
            {reports.map(rep => (
              <div
                key={rep.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        rep.status === 'Resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : rep.status === 'In Progress'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {rep.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rep.category}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{rep.description}</p>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-2 pt-1 flex-wrap">
                    <span>📍 {rep.locationAddress}</span>
                    <span>• Reporter: {rep.reporterName}</span>
                    <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rep.officialNotes && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl mt-2 border border-emerald-100 dark:border-emerald-800">
                      <strong>Official Resolution Note:</strong> {rep.officialNotes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setResolvingReportId(rep.id);
                      setResolutionNotes(rep.officialNotes || '');
                    }}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Update Action
                  </button>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">No reports filed in this barangay yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Events */}
      {activeTab === 'events' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Barangay Cleanup & Community Drives</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Organize and publish community environmental drives to boost resident engagement.</p>
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Create New Drive
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(evt => (
              <div key={evt.id} className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 uppercase">
                    {evt.category}
                  </span>
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">+{evt.pointsAwarded} Eco Points</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{evt.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{evt.description}</p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span>📅 {evt.date} ({evt.time})</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">👥 {evt.registeredUserIds.length} Joined</span>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="col-span-2 text-xs text-slate-400 py-8 text-center">No upcoming events scheduled yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 4: Schedules */}
      {activeTab === 'schedules' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Waste Collection Timetable</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official schedule enforced by local garbage collection trucks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map(sch => (
              <div key={sch.id} className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
                    {sch.dayOfWeek}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{sch.timeRange}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">{sch.wasteType}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sch.zonesCovered.join(', ')}</p>
                </div>
                <div className="text-[11px] text-slate-400 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  ⚠️ {sch.reminderNote || 'Please bring out bins only during scheduled pickup hours.'}
                </div>
              </div>
            ))}
            {schedules.length === 0 && (
              <p className="col-span-3 text-xs text-slate-400 py-8 text-center">No schedules registered for this barangay.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Facilities */}
      {activeTab === 'facilities' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Barangay Materials Recovery Facilities (MRFs) & Junkshops</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Registered drop-off centers and recycling facilities within jurisdiction.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map(fac => (
              <div key={fac.id} className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {fac.category.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">🕒 {fac.openingHours}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">{fac.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {fac.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fac.acceptedMaterials.map((mat, i) => (
                    <span key={i} className="text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {facilities.length === 0 && (
              <p className="col-span-2 text-xs text-slate-400 py-8 text-center">No facilities registered for this barangay.</p>
            )}
          </div>
        </div>
      )}

      {/* Report Update Action Modal */}
      {resolvingReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Environmental Report Status</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Official Resolution Notes</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="e.g., Clean-up truck dispatched, illegal dumping fine issued..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleResolveReport('In Progress')}
                disabled={updatingReport}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                In Progress
              </button>
              <button
                onClick={() => handleResolveReport('Resolved')}
                disabled={updatingReport}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleResolveReport('Rejected')}
                disabled={updatingReport}
                className="p-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Dismiss
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setResolvingReportId(null)}
                className="text-xs font-bold text-slate-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Barangay Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Riverbanks Campaign"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={eventCategory}
                  onChange={e => setEventCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="Cleanup">Cleanup</option>
                  <option value="Tree Planting">Tree Planting</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Recycling Drive">Recycling Drive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={eventDesc}
                  onChange={e => setEventDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
