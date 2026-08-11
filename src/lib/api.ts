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
    fetchJSON<{
      registeredResidents: number;
      participatingBarangays: number;
      wasteRecycledKg: number;
      cleanupActivities: number;
      reportsResolved: number;
    }>('/api/stats/summary').catch(() => clientStore.getStatsSummary()),

  // Auth
  login: (email: string) =>
    fetchJSON<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }).catch(() => clientStore.login(email)),

  register: (data: {
    email: string;
    fullName: string;
    role: string;
    barangayId: string;
    phone?: string;
    avatarUrl?: string;
    householdHeadName?: string;
    householdMembersCount?: number;
    householdAddress?: string;
    householdSegregationType?: string;
  }) =>
    fetchJSON<{ success: boolean; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.register(data)),

  updateProfile: (id: string, updates: Partial<User>) =>
    fetchJSON<{ success: boolean; user: User }>(`/api/auth/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).catch(() => clientStore.updateProfile(id, updates)),

  registerHousehold: (id: string, householdData: {
    householdHeadName: string;
    householdMembersCount: number;
    householdAddress: string;
    householdSegregationType: string;
  }) =>
    fetchJSON<{ success: boolean; user: User }>(`/api/auth/user/${id}/household`, {
      method: 'POST',
      body: JSON.stringify(householdData),
    }).catch(() => clientStore.registerHousehold(id, householdData)),

  getUserProfile: (id: string) =>
    fetchJSON<User>(`/api/auth/user/${id}`).catch(() => clientStore.getUserProfile(id)),

  // Locations
  getRegions: () =>
    fetchJSON<Region[]>('/api/locations/regions').catch(() => clientStore.getRegions()),

  getProvinces: (regionCode?: string) =>
    fetchJSON<Province[]>(`/api/locations/provinces${regionCode ? `?regionCode=${regionCode}` : ''}`).catch(() =>
      clientStore.getProvinces(regionCode)
    ),

  getCities: (provinceCode?: string, regionCode?: string) => {
    const params = new URLSearchParams();
    if (provinceCode) params.append('provinceCode', provinceCode);
    if (regionCode) params.append('regionCode', regionCode);
    return fetchJSON<City[]>(`/api/locations/cities?${params.toString()}`).catch(() =>
      clientStore.getCities(provinceCode, regionCode)
    );
  },

  getBarangays: (filters?: { cityCode?: string; provinceCode?: string; regionCode?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cityCode) params.append('cityCode', filters.cityCode);
    if (filters?.provinceCode) params.append('provinceCode', filters.provinceCode);
    if (filters?.regionCode) params.append('regionCode', filters.regionCode);
    if (filters?.search) params.append('search', filters.search);
    return fetchJSON<Barangay[]>(`/api/locations/barangays?${params.toString()}`).catch(() =>
      clientStore.getBarangays(filters)
    );
  },

  detectNearestBarangay: async (lat: number, lng: number) => {
    try {
      return await fetchJSON<{
        success: boolean;
        nearestBarangay: Barangay & { distanceKm: number };
        distanceKm: number;
        reverseGeocodedAddress?: string;
      }>('/api/locations/detect-nearest', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      });
    } catch (err) {
      return clientStore.detectNearestBarangay(lat, lng);
    }
  },

  // Rankings
  getRankings: (filters?: { regionCode?: string; provinceCode?: string; cityCode?: string; tier?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.regionCode) params.append('regionCode', filters.regionCode);
    if (filters?.provinceCode) params.append('provinceCode', filters.provinceCode);
    if (filters?.cityCode) params.append('cityCode', filters.cityCode);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.search) params.append('search', filters.search);
    return fetchJSON<Barangay[]>(`/api/rankings?${params.toString()}`).catch(() =>
      clientStore.getRankings(filters)
    );
  },

  // Facilities
  getFacilities: (filters?: { barangayId?: string; category?: string; userLat?: number; userLng?: number }) => {
    const params = new URLSearchParams();
    if (filters?.barangayId) params.append('barangayId', filters.barangayId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.userLat) params.append('userLat', filters.userLat.toString());
    if (filters?.userLng) params.append('userLng', filters.userLng.toString());
    return fetchJSON<Facility[]>(`/api/facilities?${params.toString()}`).catch(() =>
      clientStore.getFacilities(filters)
    );
  },

  createFacility: (data: Omit<Facility, 'id'>) =>
    fetchJSON<Facility>('/api/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createFacility(data)),

  // Reports
  getReports: (barangayId?: string, reporterId?: string) => {
    const params = new URLSearchParams();
    if (barangayId) params.append('barangayId', barangayId);
    if (reporterId) params.append('reporterId', reporterId);
    return fetchJSON<EnvironmentalReport[]>(`/api/reports?${params.toString()}`).catch(() =>
      clientStore.getReports(barangayId, reporterId)
    );
  },

  createReport: (data: Omit<EnvironmentalReport, 'id' | 'status' | 'createdAt'>) =>
    fetchJSON<EnvironmentalReport>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createReport(data)),

  updateReportStatus: (id: string, status: string, notes?: string) =>
    fetchJSON<EnvironmentalReport>(`/api/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }).catch(() => clientStore.updateReportStatus(id, status, notes)),

  // Events
  getEvents: (barangayId?: string) =>
    fetchJSON<Event[]>(`/api/events${barangayId ? `?barangayId=${barangayId}` : ''}`).catch(() =>
      clientStore.getEvents(barangayId)
    ),

  createEvent: (data: Omit<Event, 'id' | 'registeredUserIds'>) =>
    fetchJSON<Event>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createEvent(data)),

  joinEvent: (eventId: string, userId: string) =>
    fetchJSON<Event>(`/api/events/${eventId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => clientStore.joinEvent(eventId, userId)),

  // Challenges
  getChallenges: () => fetchJSON<Challenge[]>('/api/challenges').catch(() => clientStore.getChallenges()),

  joinChallenge: (challengeId: string, userId: string) =>
    fetchJSON<Challenge>(`/api/challenges/${challengeId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => clientStore.joinChallenge(challengeId, userId)),

  completeChallenge: (challengeId: string, userId: string) =>
    fetchJSON<Challenge>(`/api/challenges/${challengeId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => clientStore.completeChallenge(challengeId, userId)),

  // Schedules
  getSchedules: (barangayId?: string) =>
    fetchJSON<GarbageSchedule[]>(`/api/schedules${barangayId ? `?barangayId=${barangayId}` : ''}`).catch(() =>
      clientStore.getSchedules(barangayId)
    ),

  createSchedule: (data: Omit<GarbageSchedule, 'id'>) =>
    fetchJSON<GarbageSchedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createSchedule(data)),

  // Global Search
  globalSearch: (q: string) =>
    fetchJSON<GlobalSearchResults>(`/api/search?q=${encodeURIComponent(q)}`).catch(() =>
      clientStore.globalSearch(q)
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
    return fetchJSON<FeedPost[]>(`/api/feed?${params.toString()}`).catch(() =>
      clientStore.getFeedPosts(filters)
    );
  },

  // Government Pages & Follow System
  getGovernmentPages: (category?: string, regionCode?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (regionCode) params.append('regionCode', regionCode);
    return fetchJSON<GovernmentPage[]>(`/api/government-pages?${params.toString()}`).catch(() =>
      clientStore.getGovernmentPages(category, regionCode)
    );
  },

  followUser: (userId: string, targetUserId: string) =>
    fetchJSON<{ user: User; isFollowing: boolean }>('/api/follow/user', {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId }),
    }).catch(() => clientStore.followUser(userId, targetUserId)),

  followPage: (userId: string, targetPageId: string) =>
    fetchJSON<{ user: User; page: GovernmentPage; isFollowing: boolean }>('/api/follow/page', {
      method: 'POST',
      body: JSON.stringify({ userId, targetPageId }),
    }).catch(() => clientStore.followPage(userId, targetPageId)),

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
    fetchJSON<FeedPost>('/api/feed', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createFeedPost(data)),

  likeFeedPost: (postId: string, userId: string) =>
    fetchJSON<FeedPost>(`/api/feed/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => clientStore.likeFeedPost(postId, userId)),

  addFeedComment: (postId: string, data: { authorId: string; authorName: string; authorAvatar?: string; content: string }) =>
    fetchJSON<FeedPost>(`/api/feed/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.addFeedComment(postId, data)),

  shareFeedPost: (postId: string) =>
    fetchJSON<FeedPost>(`/api/feed/${postId}/share`, {
      method: 'POST',
    }).catch(() => clientStore.shareFeedPost(postId)),

  // Log Waste
  logWaste: (userId: string, kg: number, wasteType: string, photoUrl?: string, autoPostToFeed?: boolean) =>
    fetchJSON<{ success: boolean; user: User }>('/api/waste/log', {
      method: 'POST',
      body: JSON.stringify({ userId, kg, wasteType, photoUrl, autoPostToFeed }),
    }).catch(() => clientStore.logWaste(userId, kg, wasteType, photoUrl, autoPostToFeed)),

  // Activity Logs
  getActivityLogs: (userId?: string) =>
    fetchJSON<UserActivityLog[]>(`/api/activity-logs${userId ? `?userId=${userId}` : ''}`).catch(() =>
      clientStore.getActivityLogs(userId)
    ),

  // Announcements
  getAnnouncements: (barangayId?: string) =>
    fetchJSON<Announcement[]>(`/api/announcements${barangayId ? `?barangayId=${barangayId}` : ''}`).catch(() =>
      clientStore.getAnnouncements(barangayId)
    ),

  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) =>
    fetchJSON<Announcement>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createAnnouncement(data)),

  // Notifications
  getNotifications: (barangayId?: string) =>
    fetchJSON<AppNotification[]>(`/api/notifications${barangayId ? `?barangayId=${barangayId}` : ''}`).catch(() =>
      clientStore.getNotifications(barangayId)
    ),

  markNotificationRead: (id: string) =>
    fetchJSON<AppNotification>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }).catch(() => clientStore.markNotificationRead(id)),

  markAllNotificationsRead: (barangayId?: string) =>
    fetchJSON<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ barangayId }),
    }).catch(() => clientStore.markAllNotificationsRead(barangayId)),

  createNotification: (data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) =>
    fetchJSON<AppNotification>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => clientStore.createNotification(data)),

  // Admin
  getAllAdminUsers: () =>
    fetchJSON<User[]>('/api/admin/users').catch(() => clientStore.getAllAdminUsers()),
};
