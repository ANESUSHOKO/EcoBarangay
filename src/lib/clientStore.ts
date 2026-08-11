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
  FeedPost,
  GovernmentPage,
  AppNotification,
  Region,
  Province,
  City,
  GlobalSearchResults
} from '../types';
import {
  INITIAL_REGIONS,
  INITIAL_PROVINCES,
  INITIAL_CITIES,
  INITIAL_BARANGAYS,
  INITIAL_USERS,
  INITIAL_FACILITIES,
  INITIAL_REPORTS,
  INITIAL_EVENTS,
  INITIAL_CHALLENGES,
  INITIAL_SCHEDULES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_FEED_POSTS,
  INITIAL_GOVERNMENT_PAGES,
  INITIAL_NOTIFICATIONS
} from '../server/initialData';

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
  }
  return defaultValue;
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
}

// Distance helper
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

class ClientStore {
  private users: User[] = loadStorage('ecobarangay_users', INITIAL_USERS);
  private barangays: Barangay[] = loadStorage('ecobarangay_barangays', INITIAL_BARANGAYS);
  private facilities: Facility[] = loadStorage('ecobarangay_facilities', INITIAL_FACILITIES);
  private reports: EnvironmentalReport[] = loadStorage('ecobarangay_reports', INITIAL_REPORTS);
  private events: Event[] = loadStorage('ecobarangay_events', INITIAL_EVENTS);
  private challenges: Challenge[] = loadStorage('ecobarangay_challenges', INITIAL_CHALLENGES);
  private schedules: GarbageSchedule[] = loadStorage('ecobarangay_schedules', INITIAL_SCHEDULES);
  private activityLogs: UserActivityLog[] = loadStorage('ecobarangay_activityLogs', INITIAL_ACTIVITY_LOGS);
  private announcements: Announcement[] = loadStorage('ecobarangay_announcements', INITIAL_ANNOUNCEMENTS);
  private feedPosts: FeedPost[] = loadStorage('ecobarangay_feedPosts', INITIAL_FEED_POSTS);
  private govPages: GovernmentPage[] = loadStorage('ecobarangay_govPages', INITIAL_GOVERNMENT_PAGES);
  private notifications: AppNotification[] = loadStorage('ecobarangay_notifications', INITIAL_NOTIFICATIONS);

  private saveUsers() { saveStorage('ecobarangay_users', this.users); }
  private saveBarangays() { saveStorage('ecobarangay_barangays', this.barangays); }
  private saveFacilities() { saveStorage('ecobarangay_facilities', this.facilities); }
  private saveReports() { saveStorage('ecobarangay_reports', this.reports); }
  private saveEvents() { saveStorage('ecobarangay_events', this.events); }
  private saveChallenges() { saveStorage('ecobarangay_challenges', this.challenges); }
  private saveSchedules() { saveStorage('ecobarangay_schedules', this.schedules); }
  private saveActivityLogs() { saveStorage('ecobarangay_activityLogs', this.activityLogs); }
  private saveAnnouncements() { saveStorage('ecobarangay_announcements', this.announcements); }
  private saveFeedPosts() { saveStorage('ecobarangay_feedPosts', this.feedPosts); }
  private saveGovPages() { saveStorage('ecobarangay_govPages', this.govPages); }
  private saveNotifications() { saveStorage('ecobarangay_notifications', this.notifications); }

  // Stats
  public getStatsSummary() {
    const registeredResidents = this.users.length;
    const participatingBarangays = this.barangays.length;

    let wasteRecycledKg = 0;
    this.feedPosts.forEach(post => {
      if (post.wasteKg) wasteRecycledKg += post.wasteKg;
    });
    this.users.forEach(u => {
      if (u.kgRecycled) wasteRecycledKg += u.kgRecycled;
    });

    const cleanupActivities = this.events.filter(e => e.category === 'Cleanup').length;
    const reportsResolved = this.reports.filter(r => r.status === 'Resolved').length;

    return {
      registeredResidents,
      participatingBarangays,
      wasteRecycledKg: Math.round(wasteRecycledKg * 10) / 10,
      cleanupActivities,
      reportsResolved
    };
  }

  // Auth
  public login(email: string) {
    let user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const kapitolyo = this.barangays.find(b => b.name === 'Kapitolyo') || this.barangays[0];
      user = {
        id: `user-${Date.now()}`,
        email,
        fullName: email.split('@')[0],
        role: 'RESIDENT',
        barangayId: kapitolyo ? kapitolyo.id : 'brgy-kapitolyo',
        barangayName: kapitolyo ? kapitolyo.name : 'Kapitolyo',
        city: kapitolyo ? kapitolyo.cityName : 'Pasig City',
        province: kapitolyo ? kapitolyo.provinceName : 'Metro Manila',
        region: kapitolyo ? kapitolyo.regionName : 'NCR',
        ecoPoints: 100,
        ecoScore: 75,
        kgRecycled: 12.5,
        challengesCompleted: 1,
        cleanupActivitiesCount: 2
      };
      this.users.push(user);
      this.saveUsers();
    }
    return { success: true, user };
  }

  public register(data: {
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
  }) {
    const brgy = this.barangays.find(b => b.id === data.barangayId) || this.barangays[0];
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      fullName: data.fullName,
      role: (data.role as any) || 'RESIDENT',
      barangayId: brgy.id,
      barangayName: brgy.name,
      city: brgy.cityName,
      province: brgy.provinceName,
      region: brgy.regionName,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      householdHeadName: data.householdHeadName,
      householdMembersCount: data.householdMembersCount,
      householdAddress: data.householdAddress,
      householdSegregationType: data.householdSegregationType,
      householdRegistered: Boolean(data.householdHeadName),
      ecoPoints: 50,
      ecoScore: 60,
      kgRecycled: 0,
      challengesCompleted: 0,
      cleanupActivitiesCount: 0
    };
    this.users.push(newUser);
    this.saveUsers();
    return { success: true, user: newUser };
  }

  public updateProfile(id: string, updates: Partial<User>) {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveUsers();
      return { success: true, user: this.users[index] };
    }
    const fallbackUser = { id, email: 'user@example.com', fullName: 'User', ...updates } as User;
    return { success: true, user: fallbackUser };
  }

  public registerHousehold(id: string, householdData: {
    householdHeadName: string;
    householdMembersCount: number;
    householdAddress: string;
    householdSegregationType: string;
  }) {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        ...householdData,
        householdRegistered: true,
        ecoPoints: (this.users[index].ecoPoints || 0) + 50
      };
      this.saveUsers();
      return { success: true, user: this.users[index] };
    }
    return { success: false, user: null };
  }

  public getUserProfile(id: string) {
    const u = this.users.find(user => user.id === id);
    if (u) return u;
    return this.users[0];
  }

  // Locations
  public getRegions(): Region[] {
    return INITIAL_REGIONS;
  }

  public getProvinces(regionCode?: string): Province[] {
    if (regionCode) {
      return INITIAL_PROVINCES.filter(p => p.regionCode === regionCode);
    }
    return INITIAL_PROVINCES;
  }

  public getCities(provinceCode?: string, regionCode?: string): City[] {
    let list = INITIAL_CITIES;
    if (provinceCode) {
      list = list.filter(c => c.provinceCode === provinceCode);
    } else if (regionCode) {
      list = list.filter(c => c.regionCode === regionCode);
    }
    return list;
  }

  public getBarangays(filters?: { cityCode?: string; provinceCode?: string; regionCode?: string; search?: string }): Barangay[] {
    let list = this.barangays;
    if (filters?.cityCode) list = list.filter(b => b.cityCode === filters.cityCode);
    if (filters?.provinceCode) list = list.filter(b => b.provinceCode === filters.provinceCode);
    if (filters?.regionCode) list = list.filter(b => b.regionCode === filters.regionCode);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.cityName.toLowerCase().includes(q) ||
          b.provinceName.toLowerCase().includes(q) ||
          b.regionName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public detectNearestBarangay(lat: number, lng: number): {
    success: boolean;
    nearestBarangay: Barangay & { distanceKm: number };
    distanceKm: number;
    reverseGeocodedAddress?: string;
  } {
    let nearest: Barangay | null = null;
    let minDistance = Infinity;

    for (const b of this.barangays) {
      const dist = calculateHaversineDistanceKm(lat, lng, b.lat, b.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = b;
      }
    }

    if (!nearest) {
      nearest = this.barangays[0];
      minDistance = 0;
    }

    return {
      success: true,
      nearestBarangay: { ...nearest, distanceKm: minDistance },
      distanceKm: minDistance,
      reverseGeocodedAddress: undefined
    };
  }

  // Rankings
  public getRankings(filters?: { regionCode?: string; provinceCode?: string; cityCode?: string; tier?: string; search?: string }): Barangay[] {
    let list = [...this.barangays];
    if (filters?.regionCode) list = list.filter(b => b.regionCode === filters.regionCode);
    if (filters?.provinceCode) list = list.filter(b => b.provinceCode === filters.provinceCode);
    if (filters?.cityCode) list = list.filter(b => b.cityCode === filters.cityCode);
    if (filters?.tier && filters.tier !== 'all') list = list.filter(b => b.score.tier.toLowerCase() === filters.tier?.toLowerCase());
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.cityName.toLowerCase().includes(q) ||
          b.provinceName.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.score.totalScore - a.score.totalScore);
  }

  // Facilities
  public getFacilities(filters?: { barangayId?: string; category?: string; userLat?: number; userLng?: number }): Facility[] {
    let list = this.facilities;
    if (filters?.barangayId) list = list.filter(f => f.barangayId === filters.barangayId);
    if (filters?.category && filters.category !== 'all') list = list.filter(f => f.category === filters.category);
    return list;
  }

  public createFacility(data: Omit<Facility, 'id'>): Facility {
    const newFacility: Facility = {
      ...data,
      id: `fac-${Date.now()}`
    };
    this.facilities.push(newFacility);
    this.saveFacilities();
    return newFacility;
  }

  // Reports
  public getReports(barangayId?: string, reporterId?: string): EnvironmentalReport[] {
    let list = this.reports;
    if (barangayId) list = list.filter(r => r.barangayId === barangayId);
    if (reporterId) list = list.filter(r => r.reporterId === reporterId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createReport(data: Omit<EnvironmentalReport, 'id' | 'status' | 'createdAt'>): EnvironmentalReport {
    const brgy = this.barangays.find(b => b.id === data.barangayId) || this.barangays[0];
    const newReport: EnvironmentalReport = {
      ...data,
      id: `rep-${Date.now()}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      barangayName: brgy ? brgy.name : data.barangayId
    };
    this.reports.unshift(newReport);
    this.saveReports();

    // Reward reporter points
    const user = this.users.find(u => u.id === data.reporterId);
    if (user) {
      user.ecoPoints = (user.ecoPoints || 0) + 15;
      this.saveUsers();
    }

    return newReport;
  }

  public updateReportStatus(id: string, status: string, notes?: string): EnvironmentalReport {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.status = status as any;
      if (notes) rep.officialNotes = notes;
      this.saveReports();
      return rep;
    }
    throw new Error('Report not found');
  }

  // Events
  public getEvents(barangayId?: string): Event[] {
    let list = this.events;
    if (barangayId) list = list.filter(e => e.barangayId === barangayId);
    return list;
  }

  public createEvent(data: Omit<Event, 'id' | 'registeredUserIds'>): Event {
    const newEvent: Event = {
      ...data,
      id: `event-${Date.now()}`,
      registeredUserIds: []
    };
    this.events.unshift(newEvent);
    this.saveEvents();
    return newEvent;
  }

  public joinEvent(eventId: string, userId: string): Event {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      if (!event.registeredUserIds.includes(userId)) {
        event.registeredUserIds.push(userId);
        this.saveEvents();
      }
      const user = this.users.find(u => u.id === userId);
      if (user) {
        user.ecoPoints = (user.ecoPoints || 0) + (event.pointsAwarded || 20);
        user.cleanupActivitiesCount = (user.cleanupActivitiesCount || 0) + 1;
        this.saveUsers();
      }
      return event;
    }
    throw new Error('Event not found');
  }

  // Challenges
  public getChallenges(): Challenge[] {
    return this.challenges;
  }

  public joinChallenge(challengeId: string, userId: string): Challenge {
    const chal = this.challenges.find(c => c.id === challengeId);
    if (chal) {
      if (!chal.joinedUserIds) chal.joinedUserIds = [];
      if (!chal.joinedUserIds.includes(userId)) {
        chal.joinedUserIds.push(userId);
        this.saveChallenges();
      }
      return chal;
    }
    throw new Error('Challenge not found');
  }

  public completeChallenge(challengeId: string, userId: string): Challenge {
    const chal = this.challenges.find(c => c.id === challengeId);
    if (chal) {
      if (!chal.completedUserIds) chal.completedUserIds = [];
      if (!chal.completedUserIds.includes(userId)) {
        chal.completedUserIds.push(userId);
        this.saveChallenges();
      }
      const user = this.users.find(u => u.id === userId);
      if (user) {
        user.ecoPoints = (user.ecoPoints || 0) + (chal.pointsAwarded || 30);
        user.challengesCompleted = (user.challengesCompleted || 0) + 1;
        this.saveUsers();
      }
      return chal;
    }
    throw new Error('Challenge not found');
  }

  // Schedules
  public getSchedules(barangayId?: string): GarbageSchedule[] {
    let list = this.schedules;
    if (barangayId) list = list.filter(s => s.barangayId === barangayId);
    return list;
  }

  public createSchedule(data: Omit<GarbageSchedule, 'id'>): GarbageSchedule {
    const newSchedule: GarbageSchedule = {
      ...data,
      id: `sched-${Date.now()}`
    };
    this.schedules.push(newSchedule);
    this.saveSchedules();
    return newSchedule;
  }

  // Search
  public globalSearch(q: string): GlobalSearchResults {
    const query = q.toLowerCase();
    const barangays = this.barangays.filter(
      b => b.name.toLowerCase().includes(query) || b.cityName.toLowerCase().includes(query)
    );
    const facilities = this.facilities.filter(
      f => f.name.toLowerCase().includes(query) || f.category.toLowerCase().includes(query)
    );
    const events = this.events.filter(
      e => e.title.toLowerCase().includes(query) || e.description.toLowerCase().includes(query)
    );

    return { barangays, facilities, events };
  }

  // Social Feed
  public getFeedPosts(filters?: {
    barangayId?: string;
    cityCode?: string;
    provinceCode?: string;
    regionCode?: string;
    followingUserId?: string;
    isGovernmentOnly?: boolean;
    scopeLevel?: 'national' | 'region' | 'province' | 'city' | 'barangay';
  }): FeedPost[] {
    let list = this.feedPosts;
    if (filters?.barangayId) list = list.filter(p => p.barangayId === filters.barangayId);
    if (filters?.isGovernmentOnly) list = list.filter(p => p.isGovernmentPost);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createFeedPost(data: {
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
  }): FeedPost {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      ...data,
      authorRole: data.authorRole as any,
      likes: [],
      comments: [],
      sharesCount: 0,
      createdAt: new Date().toISOString()
    };
    this.feedPosts.unshift(newPost);
    this.saveFeedPosts();
    return newPost;
  }

  public likeFeedPost(postId: string, userId: string): FeedPost {
    const post = this.feedPosts.find(p => p.id === postId);
    if (post) {
      if (!post.likes) post.likes = [];
      const idx = post.likes.indexOf(userId);
      if (idx === -1) {
        post.likes.push(userId);
      } else {
        post.likes.splice(idx, 1);
      }
      this.saveFeedPosts();
      return post;
    }
    throw new Error('Post not found');
  }

  public addFeedComment(postId: string, data: { authorId: string; authorName: string; authorAvatar?: string; content: string }): FeedPost {
    const post = this.feedPosts.find(p => p.id === postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push({
        id: `cmt-${Date.now()}`,
        postId,
        authorId: data.authorId,
        authorName: data.authorName,
        authorAvatar: data.authorAvatar,
        content: data.content,
        createdAt: new Date().toISOString()
      });
      this.saveFeedPosts();
      return post;
    }
    throw new Error('Post not found');
  }

  public shareFeedPost(postId: string): FeedPost {
    const post = this.feedPosts.find(p => p.id === postId);
    if (post) {
      post.sharesCount = (post.sharesCount || 0) + 1;
      this.saveFeedPosts();
      return post;
    }
    throw new Error('Post not found');
  }

  // Government Pages
  public getGovernmentPages(category?: string, regionCode?: string): GovernmentPage[] {
    let list = this.govPages;
    if (category && category !== 'all') list = list.filter(p => p.category === category);
    if (regionCode) list = list.filter(p => p.regionCode === regionCode);
    return list;
  }

  public followUser(userId: string, targetUserId: string) {
    const user = this.users.find(u => u.id === userId);
    let isFollowing = false;
    if (user) {
      if (!user.followingUserIds) user.followingUserIds = [];
      const idx = user.followingUserIds.indexOf(targetUserId);
      if (idx === -1) {
        user.followingUserIds.push(targetUserId);
        isFollowing = true;
      } else {
        user.followingUserIds.splice(idx, 1);
      }
      this.saveUsers();
      return { user, isFollowing };
    }
    throw new Error('User not found');
  }

  public followPage(userId: string, targetPageId: string) {
    const user = this.users.find(u => u.id === userId);
    const page = this.govPages.find(p => p.id === targetPageId);
    let isFollowing = false;
    if (user && page) {
      if (!user.followingPageIds) user.followingPageIds = [];
      const idx = user.followingPageIds.indexOf(targetPageId);
      if (idx === -1) {
        user.followingPageIds.push(targetPageId);
        page.followersCount = (page.followersCount || 0) + 1;
        isFollowing = true;
      } else {
        user.followingPageIds.splice(idx, 1);
        page.followersCount = Math.max(0, (page.followersCount || 0) - 1);
      }
      this.saveUsers();
      this.saveGovPages();
      return { user, page, isFollowing };
    }
    throw new Error('User or Page not found');
  }

  // Log Waste
  public logWaste(userId: string, kg: number, wasteType: string, photoUrl?: string, autoPostToFeed?: boolean) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.kgRecycled = (user.kgRecycled || 0) + kg;
      user.ecoPoints = (user.ecoPoints || 0) + Math.round(kg * 10);
      this.saveUsers();

      if (autoPostToFeed) {
        this.createFeedPost({
          authorId: user.id,
          authorName: user.fullName,
          authorAvatar: user.avatarUrl,
          authorRole: user.role,
          barangayId: user.barangayId,
          barangayName: user.barangayName,
          content: `Just recycled ${kg} kg of ${wasteType}! ♻️ Green neighborhood milestone!`,
          photoUrl,
          wasteKg: kg,
          wasteType
        });
      }

      return { success: true, user };
    }
    throw new Error('User not found');
  }

  // Activity Logs
  public getActivityLogs(userId?: string): UserActivityLog[] {
    let list = this.activityLogs;
    if (userId) list = list.filter(a => a.userId === userId);
    return list;
  }

  // Announcements
  public getAnnouncements(barangayId?: string): Announcement[] {
    let list = this.announcements;
    if (barangayId) list = list.filter(a => a.barangayId === barangayId);
    return list;
  }

  public createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
    const newAnn: Announcement = {
      ...data,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.announcements.unshift(newAnn);
    this.saveAnnouncements();
    return newAnn;
  }

  // Notifications
  public getNotifications(barangayId?: string): AppNotification[] {
    let list = this.notifications;
    if (barangayId) {
      list = list.filter(n => !n.barangayId || n.barangayId === barangayId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public markNotificationRead(id: string): AppNotification {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveNotifications();
      return notif;
    }
    throw new Error('Notification not found');
  }

  public markAllNotificationsRead(barangayId?: string) {
    this.notifications.forEach(n => {
      if (!barangayId || n.barangayId === barangayId) {
        n.read = true;
      }
    });
    this.saveNotifications();
    return { success: true };
  }

  public createNotification(data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(newNotif);
    this.saveNotifications();
    return newNotif;
  }

  // Admin
  public getAllAdminUsers(): User[] {
    return this.users;
  }
}

export const clientStore = new ClientStore();
