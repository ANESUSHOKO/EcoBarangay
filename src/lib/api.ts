import {
  User,
  UserActivityLog,
  Barangay,
  Facility,
  EnvironmentalReport,
  ReportCategory,
  ReportStatus,
  Event,
  Challenge,
  GarbageSchedule,
  Announcement,
  Region,
  Province,
  City,
  GlobalSearchResults,
  FeedPost,
  GovernmentPage,
  AppNotification,
  EcoProject,
  ProjectStatus,
  CommunityPoll,
  EnvironmentalAsset,
  EnvironmentalAlert,
  BulkWastePickupRequest,
  BulkWasteStatus,
  EcoBusiness,
  PartnerOrganization,
  FamilyGroup,
  TreeItem,
  PersonalCalendarEvent,
  BarangayImprovement,
  FacilityStatus,
  PhotoValidationResult,
  AIChatMessage,
  RankingSnapshot,
  ReportAnalysisSuggestion
} from '../types';
import { clientStore } from './clientStore';
import { auth } from './firebase';
import type { ReportResolutionMetrics } from './reportTransparency';

interface TransparencyMetrics extends ReportResolutionMetrics {
  barangayId: string;
  barangayName: string;
  totalBudget: number | null;
  fundsAllocatedWaste: number | null;
  fundsSpent: number | null;
  reportsTotal: number;
  reportsResolved: number;
  reportsResolutionRate: number | null;
  mrfCount: number;
  complianceRateRA9003: number | null;
}

let backendServerChecked = false;
let isServerAvailable = false;
let lastAvailabilityCheck = 0;
let availabilityCheck: Promise<boolean> | null = null;
const LOCAL_FALLBACK_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true';

async function checkServerAvailability(): Promise<boolean> {
  if (backendServerChecked) return isServerAvailable;
  if (availabilityCheck) return availabilityCheck;
  if (Date.now() - lastAvailabilityCheck < 3_000) return false;

  availabilityCheck = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return false;
      const health = await res.json().catch(() => null);
      if (health?.status === 'ok' && health?.service === 'EcoBarangay API') {
        isServerAvailable = true;
        backendServerChecked = true;
        return true;
      }
    } catch {
      // The health check is retried after a short cooldown.
    }
    isServerAvailable = false;
    return false;
  })();
  try {
    return await availabilityCheck;
  } finally {
    lastAvailabilityCheck = Date.now();
    availabilityCheck = null;
  }
}

async function safeCall<T>(remoteCall: () => Promise<T>, fallbackCall: () => T | Promise<T>): Promise<T> {
  const hasServer = await checkServerAvailability();
  if (!hasServer) {
    if (LOCAL_FALLBACK_ENABLED) return Promise.resolve(fallbackCall());
    throw new Error('The EcoBarangay API is unavailable. Check the connection and try again.');
  }

  return remoteCall();
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status} Not Found` }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Stats
  getStatsSummary: () =>
    safeCall(
      () =>
        fetchJSON<{
          registeredResidents: number;
          participatingBarangays: number;
          wasteRecycledKg: number | null;
          cleanupActivities: number;
          reportsResolved: number;
        }>('/api/stats/summary'),
      () => clientStore.getStatsSummary()
    ),

  // Auth
  checkLegacyCredentials: (email: string, password: string) =>
    fetchJSON<{ success: boolean; message?: string }>('/api/auth/legacy-migration-check', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: () => fetchJSON<User>('/api/auth/me'),

  register: (data: {
    email: string;
    fullName: string;
    role: string;
    barangayId: string;
    requestOfficialAccess?: boolean;
    phone?: string;
    avatarUrl?: string;
    householdHeadName?: string;
    householdMembersCount?: number;
    householdAddress?: string;
    householdSegregationType?: string;
  }) =>
    fetchJSON<{ success: boolean; user?: User; message?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProfile: (id: string, updates: Partial<User>) =>
    fetchJSON<{ success: boolean; user?: User; message?: string }>(`/api/auth/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  registerHousehold: (
    id: string,
    householdData: {
      householdHeadName: string;
      householdMembersCount: number;
      householdAddress: string;
      householdSegregationType: string;
    }
  ) =>
    fetchJSON<{ success: boolean; user: User }>(`/api/auth/user/${id}/household`, {
      method: 'POST',
      body: JSON.stringify(householdData),
    }),

  getUserProfile: (id: string) => fetchJSON<User>(`/api/auth/user/${id}`),

  // Locations
  getRegions: () =>
    safeCall(
      () => fetchJSON<Region[]>('/api/locations/regions'),
      () => clientStore.getRegions()
    ),

  getProvinces: (regionCode?: string) =>
    safeCall(
      () => fetchJSON<Province[]>(`/api/locations/provinces${regionCode ? `?regionCode=${regionCode}` : ''}`),
      () => clientStore.getProvinces(regionCode)
    ),

  getCities: (provinceCode?: string, regionCode?: string) => {
    const params = new URLSearchParams();
    if (provinceCode) params.append('provinceCode', provinceCode);
    if (regionCode) params.append('regionCode', regionCode);
    return safeCall(
      () => fetchJSON<City[]>(`/api/locations/cities?${params.toString()}`),
      () => clientStore.getCities(provinceCode, regionCode)
    );
  },

  getBarangays: (filters?: { cityCode?: string; provinceCode?: string; regionCode?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cityCode) params.append('cityCode', filters.cityCode);
    if (filters?.provinceCode) params.append('provinceCode', filters.provinceCode);
    if (filters?.regionCode) params.append('regionCode', filters.regionCode);
    if (filters?.search) params.append('search', filters.search);
    return safeCall(
      () => fetchJSON<Barangay[]>(`/api/locations/barangays?${params.toString()}`),
      () => clientStore.getBarangays(filters)
    );
  },

  getBarangayById: (id: string) =>
    safeCall(
      () => fetchJSON<Barangay | undefined>(`/api/locations/barangays/${encodeURIComponent(id)}`),
      () => clientStore.getBarangays({ search: id }).find(barangay => barangay.id === id)
    ),

  detectNearestBarangay: (lat: number, lng: number) =>
    safeCall(
      () =>
        fetchJSON<{
          success: boolean;
          nearestBarangay: Barangay & { distanceKm: number };
          distanceKm: number;
          reverseGeocodedAddress?: string;
        }>('/api/locations/detect-nearest', {
          method: 'POST',
          body: JSON.stringify({ lat, lng }),
        }),
      () => clientStore.detectNearestBarangay(lat, lng)
    ),

  // Rankings
  getRankings: (filters?: { regionCode?: string; provinceCode?: string; cityCode?: string; tier?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.regionCode) params.append('regionCode', filters.regionCode);
    if (filters?.provinceCode) params.append('provinceCode', filters.provinceCode);
    if (filters?.cityCode) params.append('cityCode', filters.cityCode);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.search) params.append('search', filters.search);
    return safeCall(
      () => fetchJSON<Barangay[]>(`/api/rankings?${params.toString()}`),
      () => clientStore.getRankings(filters)
    );
  },
  getRankingHistory: (barangayId: string) =>
    fetchJSON<RankingSnapshot[]>(`/api/rankings/${encodeURIComponent(barangayId)}/history`),

  // Facilities
  getFacilities: (filters?: { barangayId?: string; category?: string; userLat?: number; userLng?: number }) => {
    const params = new URLSearchParams();
    if (filters?.barangayId) params.append('barangayId', filters.barangayId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.userLat) params.append('userLat', filters.userLat.toString());
    if (filters?.userLng) params.append('userLng', filters.userLng.toString());
    return safeCall(
      () => fetchJSON<Facility[]>(`/api/facilities?${params.toString()}`),
      () => clientStore.getFacilities(filters)
    );
  },

  createFacility: (data: Omit<Facility, 'id'>) =>
    safeCall(
      () =>
        fetchJSON<Facility>('/api/facilities', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createFacility(data)
    ),

  // Reports
  getReports: (barangayId?: string, reporterId?: string) => {
    const params = new URLSearchParams();
    if (barangayId) params.append('barangayId', barangayId);
    if (reporterId) params.append('reporterId', reporterId);
    return safeCall(
      () => fetchJSON<EnvironmentalReport[]>(`/api/reports?${params.toString()}`),
      () => clientStore.getReports(barangayId, reporterId)
    );
  },

  createReport: (data: Omit<EnvironmentalReport, 'id' | 'status' | 'createdAt'>) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>('/api/reports', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createReport(data)
    ),

  updateReportStatus: (id: string, status: ReportStatus, notes?: string, evidenceUrl?: string, assignedTeam?: string) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>(`/api/reports/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes, evidenceUrl, assignedTeam }),
        }),
      () => clientStore.updateReportStatus(id, status, notes)
    ),

  submitReportFeedback: (id: string, data: { rating: number; comment?: string; reopenReason?: string }) =>
    fetchJSON<EnvironmentalReport>(`/api/reports/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewReportPhoto: (
    id: string,
    decision: 'Confirmed' | 'Rejected' | 'Corrected',
    correctedCategory?: EnvironmentalReport['category'],
  ) =>
    fetchJSON<EnvironmentalReport>(`/api/reports/${id}/photo-review`, {
      method: 'POST',
      body: JSON.stringify({ decision, correctedCategory }),
    }),

  decideReportReopen: (id: string, decision: 'Approved' | 'Rejected', notes: string) =>
    fetchJSON<EnvironmentalReport>(`/api/reports/${id}/reopen-decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),

  upvoteReport: (id: string, userId?: string) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>(`/api/reports/${id}/upvote`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.upvoteReport(id, userId)
    ),

  // Events
  getEvents: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<Event[]>(`/api/events${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getEvents(barangayId)
    ),

  createEvent: (data: Omit<Event, 'id' | 'registeredUserIds'>) =>
    safeCall(
      () =>
        fetchJSON<Event>('/api/events', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createEvent(data)
    ),

  joinEvent: (eventId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<Event>(`/api/events/${eventId}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.joinEvent(eventId, userId)
    ),

  // Challenges
  getChallenges: () =>
    safeCall(
      () => fetchJSON<Challenge[]>('/api/challenges'),
      () => clientStore.getChallenges()
    ),

  joinChallenge: (challengeId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<Challenge>(`/api/challenges/${challengeId}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.joinChallenge(challengeId, userId)
    ),

  completeChallenge: (challengeId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<Challenge>(`/api/challenges/${challengeId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.completeChallenge(challengeId, userId)
    ),

  // Schedules
  getSchedules: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<GarbageSchedule[]>(`/api/schedules${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getSchedules(barangayId)
    ),

  createSchedule: (data: Omit<GarbageSchedule, 'id'>) =>
    safeCall(
      () =>
        fetchJSON<GarbageSchedule>('/api/schedules', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createSchedule(data)
    ),

  updateSchedule: (id: string, updates: Partial<Omit<GarbageSchedule, 'id' | 'barangayId' | 'barangayName'>>) =>
    fetchJSON<GarbageSchedule>(`/api/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Global Search
  globalSearch: (q: string) =>
    safeCall(
      () => fetchJSON<GlobalSearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
      () => clientStore.globalSearch(q)
    ),

  // Social Feed
  getFeedPosts: (filters?: {
    barangayId?: string;
    cityCode?: string;
    provinceCode?: string;
    regionCode?: string;
    followingUserId?: string;
    isGovernmentOnly?: boolean;
    scopeLevel?: 'national' | 'region' | 'province' | 'city' | 'barangay';
  }) => {
    const params = new URLSearchParams();
    if (filters?.barangayId) params.append('barangayId', filters.barangayId);
    if (filters?.cityCode) params.append('cityCode', filters.cityCode);
    if (filters?.provinceCode) params.append('provinceCode', filters.provinceCode);
    if (filters?.regionCode) params.append('regionCode', filters.regionCode);
    if (filters?.followingUserId) params.append('followingUserId', filters.followingUserId);
    if (filters?.isGovernmentOnly) params.append('isGovernmentOnly', 'true');
    if (filters?.scopeLevel) params.append('scopeLevel', filters.scopeLevel);
    return safeCall(
      () => fetchJSON<FeedPost[]>(`/api/feed?${params.toString()}`),
      () => clientStore.getFeedPosts(filters)
    );
  },

  // Government Pages & Follow System
  getGovernmentPages: (category?: string, regionCode?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (regionCode) params.append('regionCode', regionCode);
    return safeCall(
      () => fetchJSON<GovernmentPage[]>(`/api/government-pages?${params.toString()}`),
      () => clientStore.getGovernmentPages(category, regionCode)
    );
  },

  followUser: (userId: string, targetUserId: string) =>
    safeCall(
      () =>
        fetchJSON<{ user: User; isFollowing: boolean }>('/api/follow/user', {
          method: 'POST',
          body: JSON.stringify({ userId, targetUserId }),
        }),
      () => clientStore.followUser(userId, targetUserId)
    ),

  followPage: (userId: string, targetPageId: string) =>
    safeCall(
      () =>
        fetchJSON<{ user: User; page: GovernmentPage; isFollowing: boolean }>('/api/follow/page', {
          method: 'POST',
          body: JSON.stringify({ userId, targetPageId }),
        }),
      () => clientStore.followPage(userId, targetPageId)
    ),

  createFeedPost: (data: {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: string;
    barangayId: string;
    barangayName: string;
    content: string;
    photoUrl?: string;
    wasteKg?: number;
    wasteType?: string;
  }) =>
    safeCall(
      () =>
        fetchJSON<FeedPost>('/api/feed', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createFeedPost(data)
    ),

  likeFeedPost: (postId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<FeedPost>(`/api/feed/${postId}/like`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.likeFeedPost(postId, userId)
    ),

  addFeedComment: (
    postId: string,
    data: { authorId: string; authorName: string; authorAvatar?: string; content: string }
  ) =>
    safeCall(
      () =>
        fetchJSON<FeedPost>(`/api/feed/${postId}/comment`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.addFeedComment(postId, data)
    ),

  shareFeedPost: (postId: string) =>
    safeCall(
      () =>
        fetchJSON<FeedPost>(`/api/feed/${postId}/share`, {
          method: 'POST',
        }),
      () => clientStore.shareFeedPost(postId)
    ),

  // Log Waste
  logWaste: (userId: string, kg: number, wasteType: string, photoUrl?: string, autoPostToFeed?: boolean) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean; user: User }>('/api/waste/log', {
          method: 'POST',
          body: JSON.stringify({ userId, kg, wasteType, photoUrl, autoPostToFeed }),
        }),
      () => clientStore.logWaste(userId, kg, wasteType, photoUrl, autoPostToFeed)
    ),

  // Activity Logs
  getActivityLogs: (userId?: string) =>
    safeCall(
      () => fetchJSON<UserActivityLog[]>(`/api/activity-logs${userId ? `?userId=${userId}` : ''}`),
      () => clientStore.getActivityLogs(userId)
    ),

  getPendingEcoActivities: (barangayId: string) =>
    fetchJSON<UserActivityLog[]>(`/api/activity-logs/pending?barangayId=${encodeURIComponent(barangayId)}`),

  reviewEcoActivity: (
    activityId: string,
    status: 'Verified' | 'Rejected',
    pointsAwarded: number,
    notes: string,
  ) =>
    fetchJSON<UserActivityLog>(`/api/activity-logs/${activityId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, pointsAwarded, notes }),
    }),

  submitSegregationQuiz: (answerIndex: number) =>
    fetchJSON<UserActivityLog>('/api/education/segregation-quiz', {
      method: 'POST',
      body: JSON.stringify({ answerIndex }),
    }),

  // Announcements
  getAnnouncements: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<Announcement[]>(`/api/announcements${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getAnnouncements(barangayId)
    ),

  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) =>
    safeCall(
      () =>
        fetchJSON<Announcement>('/api/announcements', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createAnnouncement(data)
    ),

  // Notifications
  getNotifications: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<AppNotification[]>(`/api/notifications${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getNotifications(barangayId)
    ),

  markNotificationRead: (id: string) =>
    safeCall(
      () =>
        fetchJSON<AppNotification>(`/api/notifications/${id}/read`, {
          method: 'POST',
        }),
      () => clientStore.markNotificationRead(id)
    ),

  markAllNotificationsRead: (barangayId?: string) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean }>('/api/notifications/read-all', {
          method: 'POST',
          body: JSON.stringify({ barangayId }),
        }),
      () => clientStore.markAllNotificationsRead(barangayId)
    ),

  createNotification: (data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) =>
    safeCall(
      () =>
        fetchJSON<AppNotification>('/api/notifications', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createNotification(data)
    ),

  // Admin
  getAllAdminUsers: () =>
    safeCall(
      () => fetchJSON<User[]>('/api/admin/users'),
      () => clientStore.getAllAdminUsers()
    ),

  decideOfficialAccess: (userId: string, decision: 'Approved' | 'Rejected') =>
    fetchJSON<User>(`/api/admin/users/${encodeURIComponent(userId)}/official-access`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  getOfficialAccountSummary: () =>
    fetchJSON<{ registeredAccounts: number; residentAccounts: number }>('/api/official/account-summary'),

  // ==================== NEW FEATURES API METHODS ====================

  // 1. Projects
  getProjects: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<EcoProject[]>(`/api/projects${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getProjects(barangayId)
    ),

  getProjectById: (id: string) =>
    safeCall(
      () => fetchJSON<EcoProject>(`/api/projects/${id}`),
      () => clientStore.getProjectById(id)
    ),

  createProject: (data: Partial<EcoProject>) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>('/api/projects', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createProject(data)
    ),

  voteProject: (projectId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>(`/api/projects/${projectId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.voteProject(projectId, userId)
    ),

  followProject: (projectId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>(`/api/projects/${projectId}/follow`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStore.followProject(projectId, userId)
    ),

  updateProjectProgress: (
    projectId: string,
    update: { title: string; description: string; progressPercent: number; photoUrl?: string; authorName: string },
    newStatus?: ProjectStatus
  ) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>(`/api/projects/${projectId}/progress`, {
          method: 'POST',
          body: JSON.stringify({ update, newStatus }),
        }),
      () => clientStore.updateProjectProgress(projectId, update, newStatus)
    ),

  updateProjectStatus: (projectId: string, status: ProjectStatus, beforePhotoUrl?: string, afterPhotoUrl?: string) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>(`/api/projects/${projectId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status, beforePhotoUrl, afterPhotoUrl }),
        }),
      () => clientStore.updateProjectStatus(projectId, status, beforePhotoUrl, afterPhotoUrl)
    ),

  addProjectFeedback: (
    projectId: string,
    feedback: { authorId: string; authorName: string; authorAvatar?: string; content: string }
  ) =>
    safeCall(
      () =>
        fetchJSON<EcoProject>(`/api/projects/${projectId}/feedback`, {
          method: 'POST',
          body: JSON.stringify(feedback),
        }),
      () => clientStore.addProjectFeedback(projectId, feedback)
    ),

  // 2. Polls
  getPolls: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<CommunityPoll[]>(`/api/polls${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getPolls(barangayId)
    ),

  createPoll: (data: Partial<CommunityPoll>) =>
    safeCall(
      () =>
        fetchJSON<CommunityPoll>('/api/polls', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createPoll(data)
    ),

  votePoll: (pollId: string, optionId: string, userId: string) =>
    safeCall(
      () =>
        fetchJSON<CommunityPoll>(`/api/polls/${pollId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ optionId, userId }),
        }),
      () => clientStore.votePoll(pollId, optionId, userId)
    ),

  closePoll: (pollId: string) =>
    safeCall(
      () =>
        fetchJSON<CommunityPoll>(`/api/polls/${pollId}/close`, {
          method: 'POST',
        }),
      () => clientStore.closePoll(pollId)
    ),

  // 4. Report Verification
  resolveReportWithVerification: (
    reportId: string,
    data: {
      beforePhotoUrl?: string;
      afterPhotoUrl?: string;
      resolutionDescription: string;
      officialAction: string;
      officialNotes?: string;
    }
  ) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>(`/api/reports/${reportId}/verify-resolve`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.resolveReportWithVerification(reportId, data)
    ),

  submitReportReopenRequest: (
    reportId: string,
    data: { residentAnswer: 'YES' | 'NO'; reason?: string; photoUrl?: string }
  ) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>(`/api/reports/${reportId}/reopen-request`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.submitReportReopenRequest(reportId, data)
    ),

  // 5. Transparency Metrics
  getTransparencyMetrics: (barangayId: string) =>
    safeCall(
      () => fetchJSON<TransparencyMetrics>(`/api/transparency/${encodeURIComponent(barangayId)}`),
      async () => clientStore.getTransparencyMetrics(barangayId)
    ),

  // 6 & 17. Environmental Assets & Trees
  getAssets: (barangayId?: string, category?: string) =>
    safeCall(
      () => fetchJSON<EnvironmentalAsset[]>(`/api/assets?barangayId=${barangayId || ''}&category=${category || ''}`),
      () => clientStore.getAssets(barangayId, category)
    ),

  createAsset: (data: Partial<EnvironmentalAsset>) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalAsset>('/api/assets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createAsset(data)
    ),

  getTrees: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<TreeItem[]>(`/api/trees${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getTrees(barangayId)
    ),

  addTree: (data: Partial<TreeItem>) =>
    safeCall(
      () =>
        fetchJSON<TreeItem>('/api/trees', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.addTree(data)
    ),

  // 9. Environmental Alerts
  getAlerts: () =>
    safeCall(
      () => fetchJSON<EnvironmentalAlert[]>('/api/alerts'),
      () => clientStore.getAlerts()
    ),

  createAlert: (data: Partial<EnvironmentalAlert>) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalAlert>('/api/alerts', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createAlert(data)
    ),

  // 11 & 12. Facilities Reviews & Status
  addFacilityReview: (
    facilityId: string,
    review: {
      userId: string;
      userName: string;
      userAvatar?: string;
      ratingOverall: number;
      ratingAccessibility: number;
      ratingHours: number;
      ratingMaterials: number;
      ratingCleanliness: number;
      comment: string;
    }
  ) =>
    safeCall(
      () =>
        fetchJSON<Facility>(`/api/facilities/${facilityId}/reviews`, {
          method: 'POST',
          body: JSON.stringify(review),
        }),
      () => clientStore.addFacilityReview(facilityId, review)
    ),

  updateFacilityStatus: (facilityId: string, status: FacilityStatus) =>
    safeCall(
      () =>
        fetchJSON<Facility>(`/api/facilities/${facilityId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        }),
      () => clientStore.updateFacilityStatus(facilityId, status)
    ),

  // 13. Bulk Waste Pickup
  getBulkPickups: (userId?: string, barangayId?: string) =>
    safeCall(
      () => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (barangayId) params.set('barangayId', barangayId);
        return fetchJSON<BulkWastePickupRequest[]>(`/api/bulk-pickups?${params}`);
      },
      () => clientStore.getBulkPickups(userId, barangayId)
    ),

  createBulkPickup: (data: Partial<BulkWastePickupRequest>) =>
    safeCall(
      () =>
        fetchJSON<BulkWastePickupRequest>('/api/bulk-pickups', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createBulkPickup(data)
    ),

  updateBulkPickupStatus: (
    requestId: string,
    status: BulkWasteStatus,
    scheduledDate?: string,
    notes?: string,
    collectionTeam?: string,
    vehicleNumber?: string,
  ) =>
    safeCall(
      () =>
        fetchJSON<BulkWastePickupRequest>(`/api/bulk-pickups/${requestId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status, scheduledDate, notes, collectionTeam, vehicleNumber }),
        }),
      () => clientStore.updateBulkPickupStatus(requestId, status, scheduledDate)
    ),

  // 14 & 15. Eco Businesses & Partner Organizations
  getEcoBusinesses: (barangayId?: string, category?: string) =>
    safeCall(
      () => fetchJSON<EcoBusiness[]>(`/api/businesses?barangayId=${barangayId || ''}&category=${category || ''}`),
      () => clientStore.getEcoBusinesses(barangayId, category)
    ),

  createEcoBusiness: (data: Partial<EcoBusiness>) =>
    safeCall(
      () =>
        fetchJSON<EcoBusiness>('/api/businesses', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createEcoBusiness(data)
    ),

  getPartnerOrganizations: (barangayId?: string) =>
    safeCall(
      () => fetchJSON<PartnerOrganization[]>(`/api/organizations${barangayId ? `?barangayId=${barangayId}` : ''}`),
      () => clientStore.getPartnerOrganizations(barangayId)
    ),

  createPartnerOrganization: (data: Partial<PartnerOrganization>) =>
    safeCall(
      () =>
        fetchJSON<PartnerOrganization>('/api/organizations', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.createPartnerOrganization(data)
    ),

  // 16. Family Group
  getFamilyGroup: (userId: string) =>
    safeCall(
      () => fetchJSON<FamilyGroup>(`/api/family-group/${userId}`),
      () => clientStore.getFamilyGroup(userId)
    ),

  createFamilyGroup: (data: Partial<FamilyGroup>, leaderUser: User) =>
    safeCall(
      () =>
        fetchJSON<FamilyGroup>('/api/family-group', {
          method: 'POST',
          body: JSON.stringify({ data, leaderUser }),
        }),
      () => clientStore.createFamilyGroup(data, leaderUser)
    ),

  // 10. Personal Eco Calendar
  getCalendarEvents: (userId: string, barangayId?: string) =>
    safeCall(
      () => fetchJSON<PersonalCalendarEvent[]>(`/api/calendar?userId=${userId}&barangayId=${barangayId || ''}`),
      () => clientStore.getCalendarEvents(userId, barangayId)
    ),

  addCalendarEvent: (event: Partial<PersonalCalendarEvent>) =>
    safeCall(
      () =>
        fetchJSON<PersonalCalendarEvent>('/api/calendar', {
          method: 'POST',
          body: JSON.stringify(event),
        }),
      () => clientStore.addCalendarEvent(event)
    ),

  // 18. Most Improved Barangay
  getMostImprovedBarangays: () =>
    safeCall(
      () => fetchJSON<BarangayImprovement[]>('/api/most-improved'),
      () => clientStore.getMostImprovedBarangays()
    ),

  // AI Capabilities: report suggestions, photo assessment & Eco Assistant
  analyzeReport: (description: string, category: ReportCategory) =>
    safeCall(
      () =>
        fetchJSON<ReportAnalysisSuggestion>('/api/ai/analyze-report', {
          method: 'POST',
          body: JSON.stringify({ description, category }),
        }),
      () => Promise.reject(new Error('AI report analysis is unavailable because the application API is not connected.'))
    ),

  validateReportPhoto: (imageData: string, mimeType?: string) =>
    safeCall(
      () =>
        fetchJSON<PhotoValidationResult>('/api/ai/validate-report-photo', {
          method: 'POST',
          body: JSON.stringify({ imageData, mimeType }),
        }),
      () => ({
        isValid: true,
        reason: 'AI review is unavailable. An authorized official must review the photo.',
        reviewRequired: true,
        confidence: 0,
        labels: [],
      })
    ),

  chatWithAssistant: (messages: AIChatMessage[], context?: any) =>
    safeCall(
      () =>
        fetchJSON<{ reply: string }>('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ messages, context }),
        }),
      () => ({
        reply:
          'Mabuhay! Narito ako upang tumulong sa inyong katanungan tungkol sa waste management, segregation (RA 9003), at paggamit ng EcoBarangay platform.',
      })
    ),
};
