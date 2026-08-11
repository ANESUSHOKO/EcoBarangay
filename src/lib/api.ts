import {
  User,
  Barangay,
  Facility,
  EnvironmentalReport,
  Event,
  Challenge,
  GarbageSchedule,
  UserActivityLog,
  Announcement,
  Region,
  Province,
  City,
  GlobalSearchResults,
  FeedPost,
  GovernmentPage,
  AppNotification
} from '../types';
import { clientStore } from './clientStore';

let backendServerChecked = false;
let isServerAvailable = false;

async function checkServerAvailability(): Promise<boolean> {
  if (backendServerChecked) return isServerAvailable;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host.includes('netlify.app') ||
      host.includes('github.io') ||
      host.includes('vercel.app') ||
      host.includes('pages.dev') ||
      host.includes('surge.sh')
    ) {
      isServerAvailable = false;
      backendServerChecked = true;
      return false;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch('/api/stats/summary', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      isServerAvailable = true;
      backendServerChecked = true;
      return true;
    }
  } catch (e) {
    // Backend unreachable
  }

  isServerAvailable = false;
  backendServerChecked = true;
  return false;
}

async function safeCall<T>(remoteCall: () => Promise<T>, fallbackCall: () => T | Promise<T>): Promise<T> {
  const hasServer = await checkServerAvailability();
  if (!hasServer) {
    return Promise.resolve(fallbackCall());
  }

  try {
    return await remoteCall();
  } catch (err) {
    isServerAvailable = false;
    return Promise.resolve(fallbackCall());
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
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
          wasteRecycledKg: number;
          cleanupActivities: number;
          reportsResolved: number;
        }>('/api/stats/summary'),
      () => clientStore.getStatsSummary()
    ),

  // Auth
  login: (email: string) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }),
      () => clientStore.login(email)
    ),

  register: (data: {
    email: string;
    fullName: string;
    role: string;
    barangayId: string;
    phone?: string;
    avatarUrl?: string;
    photoUrl?: string;
    householdHeadName?: string;
    householdMembersCount?: number;
    householdAddress?: string;
    householdSegregationType?: string;
  }) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => clientStore.register(data)
    ),

  updateProfile: (id: string, updates: Partial<User>) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean; user: User }>(`/api/auth/user/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        }),
      () => clientStore.updateProfile(id, updates)
    ),

  registerHousehold: (
    id: string,
    householdData: {
      householdHeadName: string;
      householdMembersCount: number;
      householdAddress: string;
      householdSegregationType: string;
    }
  ) =>
    safeCall(
      () =>
        fetchJSON<{ success: boolean; user: User }>(`/api/auth/user/${id}/household`, {
          method: 'POST',
          body: JSON.stringify(householdData),
        }),
      () => clientStore.registerHousehold(id, householdData)
    ),

  getUserProfile: (id: string) =>
    safeCall(
      () => fetchJSON<User>(`/api/auth/user/${id}`),
      () => clientStore.getUserProfile(id)
    ),

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

  updateReportStatus: (id: string, status: string, notes?: string) =>
    safeCall(
      () =>
        fetchJSON<EnvironmentalReport>(`/api/reports/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes }),
        }),
      () => clientStore.updateReportStatus(id, status, notes)
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
};
