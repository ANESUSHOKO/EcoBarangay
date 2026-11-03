import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Barangay, EnvironmentalReport, Event, GarbageSchedule, Facility, ReportStatus, ReportCategory, BulkWastePickupRequest, BulkWasteStatus, UserActivityLog } from '../../types';
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

const REPORT_ACTIONS: Partial<Record<ReportStatus, ReportStatus[]>> = {
  Pending: ['Under Review', 'In Progress', 'Rejected'],
  'Under Review': ['Assigned', 'In Progress', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
};
const REPORT_CATEGORIES: ReportCategory[] = [
  'Illegal Dumping', 'Overflowing Bin', 'Missed Collection', 'Clogged Drainage',
  'Hazardous Waste', 'Open Burning (Siga)', 'Plastic Pollution',
  'Waterway Contamination', 'Unsegregated Waste',
];
type ScheduleEdit = {
  dayOfWeek: string;
  timeSlot: string;
  wasteType: GarbageSchedule['wasteType'];
  instructions: string;
  collectionTeam: string;
  vehicleNumber: string;
  zonesCovered: string;
};

export const OfficialDashboard: React.FC<OfficialDashboardProps> = ({
  currentUser,
  currentBarangay,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'events' | 'schedules' | 'recycling' | 'facilities'>('analytics');

  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [reportsLoadError, setReportsLoadError] = useState(false);
  const [accountSummary, setAccountSummary] = useState<{ registeredAccounts: number; residentAccounts: number } | null>(null);
  const [accountSummaryError, setAccountSummaryError] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<GarbageSchedule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bulkPickups, setBulkPickups] = useState<BulkWastePickupRequest[]>([]);
  const [pickupUpdates, setPickupUpdates] = useState<Record<string, { notes: string; collectionTeam: string; vehicleNumber: string; scheduledDate: string }>>({});
  const [pickupError, setPickupError] = useState('');
  const [savingPickupId, setSavingPickupId] = useState<string | null>(null);
  const [pendingRecyclingLogs, setPendingRecyclingLogs] = useState<UserActivityLog[]>([]);
  const [recyclingEdits, setRecyclingEdits] = useState<Record<string, { points: string; notes: string }>>({});
  const [recyclingError, setRecyclingError] = useState('');
  const [reviewingActivityId, setReviewingActivityId] = useState<string | null>(null);
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, ScheduleEdit>>({});
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState('');
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 'Monday',
    timeSlot: '07:00–10:00',
    wasteType: 'Biodegradable' as GarbageSchedule['wasteType'],
    instructions: '',
    zonesCovered: '',
    collectionTeam: '',
    vehicleNumber: '',
  });

  // Resolution modal
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [reportActionError, setReportActionError] = useState('');
  const [correctedPhotoCategory, setCorrectedPhotoCategory] = useState<ReportCategory>('Illegal Dumping');
  const [photoReviewError, setPhotoReviewError] = useState('');
  const [updatingReport, setUpdatingReport] = useState(false);

  // New Event Form
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('2026-08-20');
  const [eventTime, setEventTime] = useState('07:00 AM - 10:00 AM');
  const [eventCategory, setEventCategory] = useState<'Cleanup' | 'Tree Planting' | 'Workshop' | 'Recycling Drive'>('Cleanup');

  useEffect(() => {
    fetchOfficialData();
  }, [currentBarangay.id]);

  const fetchOfficialData = () => {
    setReports([]);
    setReportsLoaded(false);
    setReportsLoadError(false);
    setAccountSummary(null);
    setAccountSummaryError(false);
    api.getReports(currentBarangay.id)
      .then(setReports)
      .catch(error => {
        console.error(error);
        setReportsLoadError(true);
      })
      .finally(() => setReportsLoaded(true));
    api.getOfficialAccountSummary().then(setAccountSummary).catch(error => {
      console.error(error);
      setAccountSummaryError(true);
    });
    api.getEvents(currentBarangay.id).then(setEvents).catch(console.error);
    api.getSchedules(currentBarangay.id).then(setSchedules).catch(console.error);
    api.getFacilities({ barangayId: currentBarangay.id }).then(setFacilities).catch(console.error);
    api.getBulkPickups(undefined, currentBarangay.id).then(setBulkPickups).catch(console.error);
    api.getPendingEcoActivities(currentBarangay.id).then(setPendingRecyclingLogs).catch(console.error);
  };

  const getScheduleEdit = (schedule: GarbageSchedule): ScheduleEdit => scheduleEdits[schedule.id] || {
    dayOfWeek: schedule.dayOfWeek,
    timeSlot: schedule.timeSlot,
    wasteType: schedule.wasteType,
    instructions: schedule.instructions || '',
    collectionTeam: schedule.collectionTeam || '',
    vehicleNumber: schedule.vehicleNumber || schedule.truckNo || '',
    zonesCovered: (schedule.zonesCovered || []).join(', '),
  };

  const updateScheduleEdit = (schedule: GarbageSchedule, updates: Partial<ScheduleEdit>) => {
    setScheduleEdits(current => {
      const currentEdit = current[schedule.id] || {
        dayOfWeek: schedule.dayOfWeek,
        timeSlot: schedule.timeSlot,
        wasteType: schedule.wasteType,
        instructions: schedule.instructions || '',
        collectionTeam: schedule.collectionTeam || '',
        vehicleNumber: schedule.vehicleNumber || schedule.truckNo || '',
        zonesCovered: (schedule.zonesCovered || []).join(', '),
      };
      return { ...current, [schedule.id]: { ...currentEdit, ...updates } };
    });
  };

  const handleResolveReport = async (status: ReportStatus) => {
    if (!resolvingReportId) return;
    if (status === 'Rejected' && resolutionNotes.trim().length < 8) {
      setReportActionError('Add a reason (at least 8 characters) before rejecting a report.');
      return;
    }
    if (status === 'Assigned' && !assignedTeam.trim()) {
      setReportActionError('Name the team or office responsible for this report.');
      return;
    }
    if (status === 'Resolved' && resolutionNotes.trim().length < 8 && !resolutionEvidenceUrl.trim()) {
      setReportActionError('Add a resolution note (at least 8 characters) or an evidence photo URL before resolving.');
      return;
    }
    setUpdatingReport(true);
    setReportActionError('');
    try {
      await api.updateReportStatus(resolvingReportId, status, resolutionNotes, resolutionEvidenceUrl || undefined, assignedTeam || undefined);
      setResolvingReportId(null);
      setResolutionNotes('');
      setResolutionEvidenceUrl('');
      setAssignedTeam('');
      fetchOfficialData();
      onRefreshData();
    } catch (err) {
      setReportActionError(err instanceof Error ? err.message : 'Could not update the report.');
    } finally {
      setUpdatingReport(false);
    }
  };

  const handleRejectReopenRequest = async () => {
    if (!resolvingReportId) return;
    if (resolutionNotes.trim().length < 8) {
      setReportActionError('Add a clear reason (at least 8 characters) for declining the reopen request.');
      return;
    }
    setUpdatingReport(true);
    setReportActionError('');
    try {
      await api.decideReportReopen(resolvingReportId, 'Rejected', resolutionNotes.trim());
      setResolvingReportId(null);
      setResolutionNotes('');
      fetchOfficialData();
    } catch (error) {
      setReportActionError(error instanceof Error ? error.message : 'Could not decide the reopen request.');
    } finally {
      setUpdatingReport(false);
    }
  };

  const handlePhotoReview = async (
    reportId: string,
    decision: 'Confirmed' | 'Rejected' | 'Corrected',
  ) => {
    setPhotoReviewError('');
    try {
      const updated = await api.reviewReportPhoto(
        reportId,
        decision,
        decision === 'Corrected' ? correctedPhotoCategory : undefined,
      );
      setReports(current => current.map(report => report.id === updated.id ? updated : report));
    } catch (error) {
      setPhotoReviewError(error instanceof Error ? error.message : 'Could not save photo review.');
    }
  };

  const handleSaveScheduleAssignment = async (schedule: GarbageSchedule) => {
    const edits = getScheduleEdit(schedule);
    setSavingScheduleId(schedule.id);
    setScheduleError('');
    try {
      const updated = await api.updateSchedule(schedule.id, {
        dayOfWeek: edits.dayOfWeek.trim(),
        timeSlot: edits.timeSlot.trim(),
        wasteType: edits.wasteType,
        instructions: edits.instructions.trim(),
        collectionTeam: edits.collectionTeam.trim(),
        vehicleNumber: edits.vehicleNumber.trim(),
        zonesCovered: edits.zonesCovered.split(',').map(zone => zone.trim()).filter(Boolean),
      });
      setSchedules(current => current.map(item => item.id === updated.id ? updated : item));
      setScheduleEdits(current => {
        const next = { ...current };
        delete next[schedule.id];
        return next;
      });
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Could not update collection assignment.');
    } finally {
      setSavingScheduleId(null);
    }
  };

  const handleCreateSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setScheduleError('');
    try {
      const created = await api.createSchedule({
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        dayOfWeek: newSchedule.dayOfWeek,
        timeSlot: newSchedule.timeSlot.trim(),
        wasteType: newSchedule.wasteType,
        instructions: newSchedule.instructions.trim(),
        collectionTeam: newSchedule.collectionTeam.trim() || undefined,
        vehicleNumber: newSchedule.vehicleNumber.trim() || undefined,
        zonesCovered: newSchedule.zonesCovered.split(',').map(zone => zone.trim()).filter(Boolean),
        truckNo: newSchedule.vehicleNumber.trim() || undefined,
        active: true,
      });
      setSchedules(current => [...current, created]);
      setShowNewScheduleForm(false);
      setNewSchedule(current => ({ ...current, instructions: '', zonesCovered: '' }));
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Could not create the collection schedule.');
    }
  };

  const handleUpdatePickup = async (pickup: BulkWastePickupRequest, status: BulkWasteStatus) => {
    const update = pickupUpdates[pickup.id] || { notes: '', collectionTeam: '', vehicleNumber: '' };
    if (['Collected', 'Completed'].includes(status) && update.notes.trim().length < 8) {
      setPickupError('Add collection or completion evidence (at least 8 characters).');
      return;
    }
    setSavingPickupId(pickup.id);
    setPickupError('');
    try {
      const updated = await api.updateBulkPickupStatus(
        pickup.id,
        status,
        status === 'Scheduled' ? update.scheduledDate : pickup.scheduledDate,
        update.notes.trim() || undefined,
        update.collectionTeam.trim() || undefined,
        update.vehicleNumber.trim() || undefined,
      );
      setBulkPickups(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      setPickupError(error instanceof Error ? error.message : 'Could not update pickup request.');
    } finally {
      setSavingPickupId(null);
    }
  };

  const handleReviewRecyclingLog = async (activity: UserActivityLog, status: 'Verified' | 'Rejected') => {
    const edit = recyclingEdits[activity.id] || { points: '0', notes: '' };
    const points = status === 'Verified' ? Number(edit.points) : 0;
    if (!Number.isInteger(points) || points < 0 || points > 50 || edit.notes.trim().length < 8) {
      setRecyclingError('Enter a clear verification reason and an award from 0 to 50 points.');
      return;
    }
    setReviewingActivityId(activity.id);
    setRecyclingError('');
    try {
      await api.reviewEcoActivity(activity.id, status, points, edit.notes.trim());
      setPendingRecyclingLogs(current => current.filter(log => log.id !== activity.id));
    } catch (error) {
      setRecyclingError(error instanceof Error ? error.message : 'Could not review the recycling activity.');
    } finally {
      setReviewingActivityId(null);
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
        pointsAwarded: 0,
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
          { id: 'recycling', label: `♻️ Recycling review (${pendingRecyclingLogs.length})`, icon: Recycle },
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
          reports={reports}
          reportsLoaded={reportsLoaded}
          reportsLoadError={reportsLoadError}
          accountSummary={accountSummary}
          accountSummaryError={accountSummaryError}
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
                    <span className="text-[10px] font-semibold text-slate-500">Tracking: {rep.trackingNumber || rep.id}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{rep.description}</p>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-2 pt-1 flex-wrap">
                    <span>📍 {rep.locationAddress}</span>
                    <span>• Reporter: {rep.reporterName}</span>
                    <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rep.possibleDuplicateIds && rep.possibleDuplicateIds.length > 0 && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Possible duplicate of {rep.possibleDuplicateIds.length} recent nearby report(s); review before assigning.
                    </p>
                  )}
                  {rep.photoAssessment && (
                    <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
                      <p className="text-[11px] text-indigo-800 dark:text-indigo-200">
                        AI suggestion only ({Math.round(rep.photoAssessment.confidence * 100)}% confidence): {rep.photoAssessment.reason} Verify the original photo manually.
                      </p>
                      {rep.photoAssessment.officialReview && (
                        <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-100">
                          Human review: {rep.photoAssessment.officialReview.decision}
                          {rep.photoAssessment.officialReview.correctedCategory
                            ? ` — ${rep.photoAssessment.officialReview.correctedCategory}`
                            : ''}
                        </p>
                      )}
                      {!rep.photoAssessment.officialReview && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePhotoReview(rep.id, 'Confirmed')}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white"
                          >
                            Confirm suggestion
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePhotoReview(rep.id, 'Rejected')}
                            className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-white"
                          >
                            Disagree
                          </button>
                          <select
                            aria-label="Correct AI photo category"
                            value={correctedPhotoCategory}
                            onChange={event => setCorrectedPhotoCategory(event.target.value as ReportCategory)}
                            className="max-w-48 rounded-lg border border-indigo-300 bg-white px-2 py-1.5 text-[10px] dark:border-indigo-700 dark:bg-slate-900"
                          >
                            {REPORT_CATEGORIES.map(category => <option key={category}>{category}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => handlePhotoReview(rep.id, 'Corrected')}
                            className="rounded-lg bg-indigo-700 px-2.5 py-1.5 text-[10px] font-bold text-white"
                          >
                            Save correction
                          </button>
                        </div>
                      )}
                      {photoReviewError && <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-300">{photoReviewError}</p>}
                    </div>
                  )}
                  {rep.officialNotes && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl mt-2 border border-emerald-100 dark:border-emerald-800">
                      <strong>Official Resolution Note:</strong> {rep.officialNotes}
                    </div>
                  )}
                  {rep.assignedTeam && <p className="text-[11px] text-indigo-700 dark:text-indigo-300">Assigned to: {rep.assignedTeam}</p>}
                </div>

                {Boolean(REPORT_ACTIONS[rep.status]?.length) || rep.reopenRequest?.status === 'Pending' ? (
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setResolvingReportId(rep.id);
                        setResolutionNotes(rep.officialNotes || '');
                        setResolutionEvidenceUrl('');
                        setAssignedTeam(rep.assignedTeam || '');
                        setReportActionError('');
                      }}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      {rep.reopenRequest?.status === 'Pending' ? 'Review Reopen Request' : 'Update Action'}
                    </button>
                  </div>
                ) : null}
                {rep.reopenRequest?.status === 'Pending' && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Resident requested reopening: {rep.reopenRequest.reason}
                  </p>
                )}
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
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Community event · RSVP does not award points</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{evt.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{evt.description}</p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span>📅 {evt.date} ({evt.time})</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">👥 {evt.registeredCount ?? evt.registeredUserIds.length} Joined</span>
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
            <button
              type="button"
              onClick={() => setShowNewScheduleForm(value => !value)}
              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
            >
              {showNewScheduleForm ? 'Cancel' : 'Add schedule'}
            </button>
          </div>
          {showNewScheduleForm && (
            <form onSubmit={handleCreateSchedule} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-700">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Collection day
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={event => setNewSchedule(current => ({ ...current, dayOfWeek: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Time window
                <input required maxLength={80} value={newSchedule.timeSlot} onChange={event => setNewSchedule(current => ({ ...current, timeSlot: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Waste type
                <select
                  value={newSchedule.wasteType}
                  onChange={event => setNewSchedule(current => ({ ...current, wasteType: event.target.value as GarbageSchedule['wasteType'] }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  {['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Bulk/E-Waste'].map(type => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Zones (comma-separated)
                <input value={newSchedule.zonesCovered} onChange={event => setNewSchedule(current => ({ ...current, zonesCovered: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Collection team
                <input value={newSchedule.collectionTeam} onChange={event => setNewSchedule(current => ({ ...current, collectionTeam: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vehicle number
                <input value={newSchedule.vehicleNumber} onChange={event => setNewSchedule(current => ({ ...current, vehicleNumber: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                Collection instructions
                <textarea required minLength={8} maxLength={500} value={newSchedule.instructions} onChange={event => setNewSchedule(current => ({ ...current, instructions: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900" />
              </label>
              <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white sm:col-span-2">Publish schedule</button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map(sch => (
              <div key={sch.id} className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Collection day
                    <select
                      value={getScheduleEdit(sch).dayOfWeek}
                      onChange={event => updateScheduleEdit(sch, { dayOfWeek: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day}>{day}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Time window
                    <input
                      maxLength={80}
                      value={getScheduleEdit(sch).timeSlot}
                      onChange={event => updateScheduleEdit(sch, { timeSlot: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                    />
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Waste type
                  <select
                    value={getScheduleEdit(sch).wasteType}
                    onChange={event => updateScheduleEdit(sch, { wasteType: event.target.value as GarbageSchedule['wasteType'] })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                  >
                    {['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Bulk/E-Waste'].map(type => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Collection instructions
                  <textarea
                    maxLength={500}
                    rows={2}
                    value={getScheduleEdit(sch).instructions}
                    onChange={event => updateScheduleEdit(sch, { instructions: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Collection team
                  <input
                    aria-label={`Collection team for ${sch.wasteType} on ${sch.dayOfWeek}`}
                    value={getScheduleEdit(sch).collectionTeam}
                    onChange={event => updateScheduleEdit(sch, { collectionTeam: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Vehicle
                  <input
                    aria-label={`Collection vehicle for ${sch.wasteType} on ${sch.dayOfWeek}`}
                    value={getScheduleEdit(sch).vehicleNumber}
                    onChange={event => updateScheduleEdit(sch, { vehicleNumber: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Zones (comma-separated)
                  <input
                    aria-label={`Collection zones for ${sch.wasteType} on ${sch.dayOfWeek}`}
                    value={getScheduleEdit(sch).zonesCovered}
                    onChange={event => updateScheduleEdit(sch, { zonesCovered: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                {scheduleError && <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-300">{scheduleError}</p>}
                <button
                  type="button"
                  onClick={() => handleSaveScheduleAssignment(sch)}
                  disabled={savingScheduleId === sch.id}
                  className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {savingScheduleId === sch.id ? 'Saving…' : `Save assignment${sch.history?.length ? ` · ${sch.history.length} change(s) logged` : ''}`}
                </button>
              </div>
            ))}
            {schedules.length === 0 && (
              <p className="col-span-3 text-xs text-slate-400 py-8 text-center">No schedules registered for this barangay.</p>
            )}
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bulk pickup requests</h4>
              <p className="text-xs text-slate-500">Move requests through scheduled, collected, and completed states; add a field note at each collection step.</p>
            </div>
            {pickupError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{pickupError}</p>}
            <div className="grid gap-3 lg:grid-cols-2">
              {bulkPickups.map(pickup => {
                const update = pickupUpdates[pickup.id] || {
                  notes: '',
                  collectionTeam: pickup.collectionTeam || '',
                  vehicleNumber: pickup.vehicleNumber || '',
                  scheduledDate: pickup.scheduledDate || pickup.preferredPickupDate,
                };
                const nextStatuses: BulkWasteStatus[] = pickup.status === 'Submitted'
                  ? ['Scheduled']
                  : pickup.status === 'Scheduled'
                    ? ['Collected', 'Missed']
                    : pickup.status === 'Missed'
                      ? ['Scheduled', 'Cancelled']
                      : pickup.status === 'Collected' ? ['Completed'] : [];
                return (
                  <div key={pickup.id} className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{pickup.wasteType} · {pickup.trackingNumber || pickup.id}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">{pickup.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{pickup.quantityDescription} · {pickup.locationAddress}</p>
                    <p className="text-[11px] text-slate-500">Resident: {pickup.userName} {pickup.userPhone ? `· ${pickup.userPhone}` : ''} · Preferred: {pickup.preferredPickupDate}</p>
                    {pickup.statusHistory?.length ? (
                      <details className="text-[11px] text-slate-600 dark:text-slate-300">
                        <summary className="cursor-pointer font-semibold">Pickup history ({pickup.statusHistory.length})</summary>
                        <ul className="mt-1 space-y-1">
                          {pickup.statusHistory.map((entry, index) => (
                            <li key={`${entry.changedAt}-${index}`}>{entry.status} · {new Date(entry.changedAt).toLocaleString()}{entry.notes ? ` · ${entry.notes}` : ''}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {nextStatuses.length > 0 && (
                      <>
                        {nextStatuses.includes('Scheduled') && (
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Pickup date
                            <input
                              type="date"
                              value={update.scheduledDate}
                              onChange={event => setPickupUpdates(current => ({ ...current, [pickup.id]: { ...update, scheduledDate: event.target.value } }))}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                            />
                          </label>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Collection team
                            <input
                              value={update.collectionTeam}
                              onChange={event => setPickupUpdates(current => ({ ...current, [pickup.id]: { ...update, collectionTeam: event.target.value } }))}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Vehicle number
                            <input
                              value={update.vehicleNumber}
                              onChange={event => setPickupUpdates(current => ({ ...current, [pickup.id]: { ...update, vehicleNumber: event.target.value } }))}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                            />
                          </label>
                        </div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Collection / status note
                          <textarea
                            value={update.notes}
                            onChange={event => setPickupUpdates(current => ({ ...current, [pickup.id]: { ...update, notes: event.target.value } }))}
                            maxLength={500}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses.map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleUpdatePickup(pickup, status)}
                              disabled={savingPickupId === pickup.id}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {savingPickupId === pickup.id
                                ? 'Saving…'
                                : status === 'Scheduled' ? 'Schedule pickup'
                                  : status === 'Collected' ? 'Mark collected'
                                    : status === 'Missed' ? 'Mark missed'
                                      : status === 'Cancelled' ? 'Cancel request' : 'Complete pickup'}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {bulkPickups.length === 0 && <p className="text-xs text-slate-400">No bulk pickup requests are awaiting action.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recycling' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recycling and education activity review</h3>
            <p className="text-xs text-slate-500">Verify reported weights and evidence before crediting kilograms or Eco Points. Awards are capped at 50 points per activity and require an audit note.</p>
          </div>
          {recyclingError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{recyclingError}</p>}
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingRecyclingLogs.map(activity => {
              const edit = recyclingEdits[activity.id] || { points: activity.type === 'Education' ? '50' : '0', notes: '' };
              return (
                <div key={activity.id} className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {activity.type === 'Recycling' ? `${activity.kgRecycled || 0} kg · ` : ''}{activity.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{activity.description}</p>
                  <p className="text-[11px] text-slate-500">Resident: {activity.residentName || 'Resident'} · Submitted {new Date(activity.createdAt).toLocaleString()}</p>
                  {activity.photoUrl && (
                    <a href={activity.photoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 underline dark:text-emerald-300">
                      View submitted evidence
                    </a>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Eco Points (0–50)
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={edit.points}
                        onChange={event => setRecyclingEdits(current => ({ ...current, [activity.id]: { ...edit, points: event.target.value } }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                      Verification reason / audit note
                      <textarea
                        value={edit.notes}
                        onChange={event => setRecyclingEdits(current => ({ ...current, [activity.id]: { ...edit, notes: event.target.value } }))}
                        maxLength={500}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewRecyclingLog(activity, 'Verified')}
                      disabled={reviewingActivityId === activity.id}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Verify and credit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewRecyclingLog(activity, 'Rejected')}
                      disabled={reviewingActivityId === activity.id}
                      className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
            {pendingRecyclingLogs.length === 0 && <p className="text-xs text-slate-400">No recycling submissions are awaiting review.</p>}
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
            {reports.find(report => report.id === resolvingReportId)?.reopenRequest?.status === 'Pending' && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Resident reopen request: {reports.find(report => report.id === resolvingReportId)?.reopenRequest?.reason}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Team or office assignment</label>
              <input
                type="text"
                maxLength={80}
                value={assignedTeam}
                onChange={event => setAssignedTeam(event.target.value)}
                placeholder="e.g., Sanitation Team A"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Resolution evidence photo URL (optional)</label>
              <input
                type="url"
                value={resolutionEvidenceUrl}
                onChange={e => setResolutionEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            {reportActionError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{reportActionError}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {(reports.find(report => report.id === resolvingReportId)?.reopenRequest?.status === 'Pending'
                ? ['In Progress' as ReportStatus]
                : REPORT_ACTIONS[reports.find(report => report.id === resolvingReportId)?.status || 'Pending'] || []
              ).map(status => (
                <button
                  key={status}
                  onClick={() => handleResolveReport(status)}
                  disabled={updatingReport}
                  className={`p-2 text-white rounded-xl text-xs font-bold ${
                    status === 'Resolved' ? 'bg-emerald-600 hover:bg-emerald-700'
                      : status === 'Rejected' ? 'bg-slate-600 hover:bg-slate-700'
                      : status === 'Assigned' ? 'bg-violet-600 hover:bg-violet-700'
                      : status === 'Under Review' ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {status === 'In Progress' && reports.find(report => report.id === resolvingReportId)?.reopenRequest?.status === 'Pending'
                    ? 'Approve & Reopen'
                    : status === 'Resolved' ? 'Mark Resolved' : status === 'Rejected' ? 'Reject' : status}
                </button>
              ))}
              {reports.find(report => report.id === resolvingReportId)?.reopenRequest?.status === 'Pending' && (
                <button
                  type="button"
                  onClick={handleRejectReopenRequest}
                  disabled={updatingReport}
                  className="p-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Decline reopen request
                </button>
              )}
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
