import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Barangay, EnvironmentalReport, Event, GarbageSchedule, Facility } from '../../types';
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
  Loader2
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
  const [activeTab, setActiveTab] = useState<'reports' | 'events' | 'schedules' | 'facilities' | 'announcements'>('reports');

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

  // New Announcement
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [ancTitle, setAncTitle] = useState('');
  const [ancContent, setAncContent] = useState('');
  const [ancCategory, setAncCategory] = useState<'Urgent' | 'Garbage Schedule' | 'Community Event' | 'General'>('Urgent');

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

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAnnouncement({
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        authorName: currentUser.fullName,
        title: ancTitle,
        content: ancContent,
        category: ancCategory,
      });
      setShowAnnouncementModal(false);
      fetchOfficialData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Official Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black">{currentUser.fullName}</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Official Verification Active
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                LGU Official Portal • Brgy. {currentBarangay.name}, {currentBarangay.cityName}
              </p>
            </div>
          </div>

          {/* Barangay Score Pill */}
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300">National Rank</div>
              <div className="text-2xl font-black text-amber-400">#{currentBarangay.score.nationalRank}</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300">Sustainability Score</div>
              <div className="text-2xl font-black text-emerald-400">{currentBarangay.score.totalScore} / 100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-2 gap-2 overflow-x-auto">
        {[
          { id: 'reports', label: `Environmental Reports (${reports.filter(r => r.status === 'Pending').length} Pending)` },
          { id: 'events', label: 'Cleanup Drives & Events' },
          { id: 'schedules', label: 'Collection Schedule' },
          { id: 'facilities', label: 'Barangay MRFs & Centers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Environmental Reports */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Submitted Dumping & Violation Reports</h3>
              <p className="text-xs text-slate-500">Resolving reports improves your barangay's official score rating.</p>
            </div>
          </div>

          <div className="space-y-3">
            {reports.map(rep => (
              <div
                key={rep.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        rep.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rep.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rep.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{rep.category}</span>
                  </div>
                  <p className="text-xs text-slate-600">{rep.description}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                    <span>📍 {rep.locationAddress}</span>
                    <span>• Reporter: {rep.reporterName}</span>
                    <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rep.officialNotes && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-xl mt-2 border border-emerald-100">
                      <strong>Official Note:</strong> {rep.officialNotes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setResolvingReportId(rep.id);
                      setResolutionNotes(rep.officialNotes || '');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
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

      {/* Tab Content: Events */}
      {activeTab === 'events' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Barangay Cleanup & Community Drives</h3>
              <p className="text-xs text-slate-500">Organize events to boost resident participation.</p>
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Create New Drive
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(evt => (
              <div key={evt.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                  {evt.category}
                </span>
                <h4 className="text-sm font-bold text-slate-800">{evt.title}</h4>
                <p className="text-xs text-slate-600">{evt.description}</p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span>📅 {evt.date} ({evt.time})</span>
                  <span className="font-bold text-emerald-700">👥 {evt.registeredUserIds.length} Joined</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Update Action Modal */}
      {resolvingReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Update Environmental Report Status</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Resolution Notes</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="e.g., Clean-up truck dispatched, illegal dumping fine issued..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Barangay Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Riverbanks Campaign"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={eventCategory}
                  onChange={e => setEventCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Cleanup">Cleanup</option>
                  <option value="Tree Planting">Tree Planting</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Recycling Drive">Recycling Drive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={eventDesc}
                  onChange={e => setEventDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
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
