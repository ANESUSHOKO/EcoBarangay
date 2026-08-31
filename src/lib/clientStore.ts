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
  GlobalSearchResults,
  EcoProject,
  ProjectStatus,
  ProjectCategory,
  CommunityPoll,
  EnvironmentalAsset,
  EnvironmentalAlert,
  FacilityReview,
  FacilityStatus,
  BulkWastePickupRequest,
  BulkWasteStatus,
  EcoBusiness,
  PartnerOrganization,
  FamilyGroup,
  TreeItem,
  BarangayImprovement,
  PersonalCalendarEvent
} from '../types';
import { hashPasswordClient, verifyPasswordClient } from './authCrypto';
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
  INITIAL_NOTIFICATIONS,
  INITIAL_PROJECTS,
  INITIAL_POLLS,
  INITIAL_ASSETS,
  INITIAL_ALERTS,
  INITIAL_BULK_PICKUPS,
  INITIAL_BUSINESSES,
  INITIAL_ORGANIZATIONS,
  INITIAL_FAMILY_GROUPS,
  INITIAL_TREES,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_BARANGAY_IMPROVEMENTS
} from '../server/initialData';
import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection
} from 'firebase/firestore';

const STORE_VERSION = 'ecobarangay_v2_clean_prod';

if (typeof window !== 'undefined' && localStorage.getItem('ecobarangay_store_version') !== STORE_VERSION) {
  try {
    localStorage.removeItem('ecobarangay_users');
    localStorage.removeItem('ecobarangay_reports');
    localStorage.removeItem('ecobarangay_activityLogs');
    localStorage.removeItem('ecobarangay_bulkPickups');
    localStorage.removeItem('ecobarangay_familyGroups');
    localStorage.removeItem('ecobarangay_calendarEvents');
    localStorage.removeItem('ecobarangay_notifications');
    localStorage.removeItem('ecobarangay_current_user_id');
    localStorage.setItem('ecobarangay_store_version', STORE_VERSION);
  } catch (e) {
    console.warn('Could not reset demo cache', e);
  }
}

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

  // New collections for 20 features
  private projects: EcoProject[] = loadStorage('ecobarangay_projects', INITIAL_PROJECTS);
  private polls: CommunityPoll[] = loadStorage('ecobarangay_polls', INITIAL_POLLS);
  private assets: EnvironmentalAsset[] = loadStorage('ecobarangay_assets', INITIAL_ASSETS);
  private alerts: EnvironmentalAlert[] = loadStorage('ecobarangay_alerts', INITIAL_ALERTS);
  private bulkPickups: BulkWastePickupRequest[] = loadStorage('ecobarangay_bulkPickups', INITIAL_BULK_PICKUPS);
  private businesses: EcoBusiness[] = loadStorage('ecobarangay_businesses', INITIAL_BUSINESSES);
  private organizations: PartnerOrganization[] = loadStorage('ecobarangay_organizations', INITIAL_ORGANIZATIONS);
  private familyGroups: FamilyGroup[] = loadStorage('ecobarangay_familyGroups', INITIAL_FAMILY_GROUPS);
  private trees: TreeItem[] = loadStorage('ecobarangay_trees', INITIAL_TREES);
  private calendarEvents: PersonalCalendarEvent[] = loadStorage('ecobarangay_calendarEvents', INITIAL_CALENDAR_EVENTS);
  private improvements: BarangayImprovement[] = loadStorage('ecobarangay_improvements', INITIAL_BARANGAY_IMPROVEMENTS);

  constructor() {
    this.syncUsersFromFirestore();
  }

  public async syncUsersFromFirestore() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        snap.forEach(docSnap => {
          const remoteUser = docSnap.data() as User;
          if (remoteUser && remoteUser.email) {
            const idx = this.users.findIndex(
              u => u.id === remoteUser.id || u.email.toLowerCase() === remoteUser.email.toLowerCase()
            );
            if (idx >= 0) {
              this.users[idx] = { ...this.users[idx], ...remoteUser };
            } else {
              this.users.push(remoteUser);
            }
          }
        });
        this.saveUsers();
      }
    } catch (err) {
      console.warn('ClientStore initial Firestore fetch note:', err);
    }
  }

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
  private saveProjects() { saveStorage('ecobarangay_projects', this.projects); }
  private savePolls() { saveStorage('ecobarangay_polls', this.polls); }
  private saveAssets() { saveStorage('ecobarangay_assets', this.assets); }
  private saveAlerts() { saveStorage('ecobarangay_alerts', this.alerts); }
  private saveBulkPickups() { saveStorage('ecobarangay_bulkPickups', this.bulkPickups); }
  private saveBusinesses() { saveStorage('ecobarangay_businesses', this.businesses); }
  private saveOrganizations() { saveStorage('ecobarangay_organizations', this.organizations); }
  private saveFamilyGroups() { saveStorage('ecobarangay_familyGroups', this.familyGroups); }
  private saveTrees() { saveStorage('ecobarangay_trees', this.trees); }
  private saveCalendarEvents() { saveStorage('ecobarangay_calendarEvents', this.calendarEvents); }
  private saveImprovements() { saveStorage('ecobarangay_improvements', this.improvements); }

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

  // In-memory OTP session map for client store
  private otpSessions: Map<string, { otp: string; expiresAt: number; attempts: number }> = new Map();
  private passwordResetSessions: Map<string, { otp: string; expiresAt: number; attempts: number }> = new Map();

  // Auth
  public async login(email: string, password?: string) {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach(docSnap => {
          const u = docSnap.data() as User;
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            user = u;
            if (!this.users.some(x => x.id === u.id)) {
              this.users.push(u);
              this.saveUsers();
            }
          }
        });
      } catch (err) {
        console.warn('Firestore lookup during login:', err);
      }
    }

    if (!user) {
      return { success: false, message: 'No account found with this email. Please register below.' };
    }

    if (!password) {
      return { success: false, message: 'Password is required.' };
    }

    // Verify password strictly against account hash
    const isPasswordValid = await verifyPasswordClient(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    // Generate 6-digit OTP for email verification
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.otpSessions.set(cleanEmail, {
      otp: randomOtp,
      expiresAt,
      attempts: 0,
    });

    return {
      success: true,
      requireOtp: true,
      email: user.email,
      simulatedOtpCode: randomOtp,
      message: `A 6-digit verification code has been sent to ${user.email}.`,
    };
  }

  public async verifyOtp(email: string, otp: string) {
    const cleanEmail = email.trim().toLowerCase();
    const session = this.otpSessions.get(cleanEmail);

    if (!session) {
      return { success: false, message: 'No verification session found. Please sign in again.' };
    }

    if (Date.now() > session.expiresAt) {
      this.otpSessions.delete(cleanEmail);
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    session.attempts += 1;
    if (session.otp !== otp.trim()) {
      return { success: false, message: 'Invalid verification code. Please check your email and try again.' };
    }

    this.otpSessions.delete(cleanEmail);
    const user = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    const { passwordHash: _, ...safeUser } = user;
    return { success: true, user: safeUser as User };
  }

  public async resendOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.otpSessions.set(cleanEmail, {
      otp: randomOtp,
      expiresAt,
      attempts: 0,
    });

    return {
      success: true,
      email: user.email,
      simulatedOtpCode: randomOtp,
      message: `A new 6-digit verification code has been sent to ${user.email}.`,
    };
  }

  public async requestPasswordReset(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach(docSnap => {
          const u = docSnap.data() as User;
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            user = u;
            if (!this.users.some(x => x.id === u.id)) {
              this.users.push(u);
            }
          }
        });
      } catch (err) {
        console.error('Error finding user for reset in Firestore:', err);
      }
    }

    if (!user) {
      return { success: false, message: 'No registered account found with this email address.' };
    }

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    this.passwordResetSessions.set(cleanEmail, {
      otp: randomOtp,
      expiresAt,
      attempts: 0,
    });

    return {
      success: true,
      email: user.email,
      simulatedOtpCode: randomOtp,
      message: `A 6-digit password reset code has been sent to ${user.email}.`,
    };
  }

  public async resetPassword(email: string, otp: string, newPassword: string) {
    const cleanEmail = email.trim().toLowerCase();
    const session = this.passwordResetSessions.get(cleanEmail);

    if (!session) {
      return { success: false, message: 'No password reset request found. Please request a code first.' };
    }

    if (Date.now() > session.expiresAt) {
      this.passwordResetSessions.delete(cleanEmail);
      return { success: false, message: 'Password reset code has expired. Please request a new code.' };
    }

    session.attempts += 1;
    if (session.otp !== otp.trim()) {
      return { success: false, message: 'Invalid password reset code. Please check your email and try again.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    let user = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    const passwordHash = await hashPasswordClient(newPassword);
    user.passwordHash = passwordHash;
    this.passwordResetSessions.delete(cleanEmail);
    this.saveUsers();

    try {
      await setDoc(doc(db, 'users', user.id), { passwordHash }, { merge: true });
    } catch (err) {
      console.error('Error saving updated password to Firestore:', err);
    }

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new password.',
    };
  }

  public async register(data: {
    email: string;
    password?: string;
    fullName: string;
    role: string;
    barangayId: string;
    officialPassword?: string;
    phone?: string;
    avatarUrl?: string;
    householdHeadName?: string;
    householdMembersCount?: number;
    householdAddress?: string;
    householdSegregationType?: string;
  }) {
    if (!data.password || data.password.length < 6) {
      return {
        success: false,
        message: 'Please enter a secure password (at least 6 characters).'
      };
    }

    if (data.role === 'BARANGAY_OFFICIAL') {
      if (!data.officialPassword || data.officialPassword.trim() !== '123456') {
        return {
          success: false,
          message: 'Invalid or missing Barangay Official authorization password.'
        };
      }
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'An account with this email address already exists. Please log in.' };
    }

    // Securely hash password on client
    const passwordHash = await hashPasswordClient(data.password);

    const brgy = this.barangays.find(b => b.id === data.barangayId) || this.barangays[0];
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      role: (data.role as any) || 'RESIDENT',
      barangayId: brgy.id,
      barangayName: brgy.name,
      city: brgy.cityName,
      province: brgy.provinceName,
      region: brgy.regionName,
      passwordHash,
      phone: data.phone?.trim() || undefined,
      avatarUrl: data.avatarUrl?.trim() || undefined,
      householdHeadName: data.householdHeadName?.trim() || undefined,
      householdMembersCount: data.householdMembersCount || 1,
      householdAddress: data.householdAddress?.trim() || undefined,
      householdSegregationType: data.householdSegregationType || 'Biodegradable, Non-Biodegradable & Recyclable (3-Way)',
      householdRegistered: Boolean(data.householdHeadName),
      ecoPoints: 100,
      ecoScore: 75,
      kgRecycled: 0,
      challengesCompleted: 0,
      cleanupActivitiesCount: 0,
      followingUserIds: [],
      followingPageIds: ['gov-denr', 'gov-pasig-cenro']
    };
    this.users.push(newUser);
    this.saveUsers();

    // Store in Firestore database
    try {
      await setDoc(doc(db, 'users', newUser.id), JSON.parse(JSON.stringify(newUser)), { merge: true });
      console.log(`Stored user account ${newUser.id} directly in Firestore`);
    } catch (err) {
      console.error('Error saving user to Firestore in clientStore.register:', err);
    }

    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, user: safeUser as User };
  }

  public async updateProfile(id: string, updates: Partial<User>) {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveUsers();

      // Persist to Firestore
      try {
        await setDoc(doc(db, 'users', id), JSON.parse(JSON.stringify(this.users[index])), { merge: true });
      } catch (err) {
        console.error('Error updating user in Firestore:', err);
      }

      return { success: true, user: this.users[index] };
    }
    return { success: false, message: 'User profile not found' };
  }

  public async registerHousehold(id: string, householdData: {
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

      // Persist to Firestore
      try {
        await setDoc(doc(db, 'users', id), JSON.parse(JSON.stringify(this.users[index])), { merge: true });
      } catch (err) {
        console.error('Error updating household registration in Firestore:', err);
      }

      return { success: true, user: this.users[index] };
    }
    return { success: false, user: null };
  }


  public getUserProfile(id: string) {
    const u = this.users.find(user => user.id === id);
    if (u) return u;
    return null;
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

  public upvoteReport(id: string, userId?: string): EnvironmentalReport {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      if (!rep.upvotedUserIds) rep.upvotedUserIds = [];
      const userKey = userId || 'anonymous-user';
      if (rep.upvotedUserIds.includes(userKey)) {
        rep.upvotedUserIds = rep.upvotedUserIds.filter(u => u !== userKey);
        rep.upvotesCount = Math.max(0, (rep.upvotesCount || 1) - 1);
      } else {
        rep.upvotedUserIds.push(userKey);
        rep.upvotesCount = (rep.upvotesCount || 0) + 1;
      }
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

  // ==================== 1. ECOPROJECTS ====================
  public getProjects(barangayId?: string): EcoProject[] {
    let list = this.projects;
    if (barangayId) {
      list = list.filter(p => p.barangayId === barangayId);
    }
    return list;
  }

  public getProjectById(id: string): EcoProject | undefined {
    return this.projects.find(p => p.id === id);
  }

  public createProject(data: Partial<EcoProject>): EcoProject {
    const newProject: EcoProject = {
      id: `proj-${Date.now()}`,
      title: data.title || 'Untitled Project',
      description: data.description || '',
      category: data.category || 'Other',
      status: 'Proposed',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      cityName: data.cityName || 'Pasig City',
      suggestedByUserId: data.suggestedByUserId || 'user-resident-1',
      suggestedByName: data.suggestedByName || 'Resident',
      votesCount: 1,
      votedUserIds: data.suggestedByUserId ? [data.suggestedByUserId] : [],
      followersCount: 1,
      followedUserIds: data.suggestedByUserId ? [data.suggestedByUserId] : [],
      progressPercent: 0,
      updates: [],
      feedback: [],
      createdAt: new Date().toISOString(),
      beforePhotoUrl: data.beforePhotoUrl,
      lat: data.lat,
      lng: data.lng,
    };
    this.projects.unshift(newProject);
    this.saveProjects();
    return newProject;
  }

  public voteProject(projectId: string, userId: string): EcoProject {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    if (proj.votedUserIds.includes(userId)) {
      proj.votedUserIds = proj.votedUserIds.filter(id => id !== userId);
      proj.votesCount = Math.max(0, proj.votesCount - 1);
    } else {
      proj.votedUserIds.push(userId);
      proj.votesCount += 1;
    }
    this.saveProjects();
    return proj;
  }

  public followProject(projectId: string, userId: string): EcoProject {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    if (proj.followedUserIds.includes(userId)) {
      proj.followedUserIds = proj.followedUserIds.filter(id => id !== userId);
      proj.followersCount = Math.max(0, proj.followersCount - 1);
    } else {
      proj.followedUserIds.push(userId);
      proj.followersCount += 1;
    }
    this.saveProjects();
    return proj;
  }

  public updateProjectProgress(
    projectId: string,
    update: { title: string; description: string; progressPercent: number; photoUrl?: string; authorName: string },
    newStatus?: ProjectStatus
  ): EcoProject {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    proj.progressPercent = update.progressPercent;
    if (newStatus) proj.status = newStatus;
    proj.updates.unshift({
      id: `upd-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...update,
    });
    this.saveProjects();
    return proj;
  }

  public updateProjectStatus(
    projectId: string,
    status: ProjectStatus,
    beforePhotoUrl?: string,
    afterPhotoUrl?: string
  ): EcoProject {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    proj.status = status;
    if (beforePhotoUrl) proj.beforePhotoUrl = beforePhotoUrl;
    if (afterPhotoUrl) proj.afterPhotoUrl = afterPhotoUrl;
    this.saveProjects();
    return proj;
  }

  public addProjectFeedback(
    projectId: string,
    feedback: { authorId: string; authorName: string; authorAvatar?: string; content: string }
  ): EcoProject {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    proj.feedback.unshift({
      id: `fb-${Date.now()}`,
      ...feedback,
      createdAt: new Date().toISOString(),
    });
    this.saveProjects();
    return proj;
  }

  // ==================== 2. COMMUNITY POLLS ====================
  public getPolls(barangayId?: string): CommunityPoll[] {
    let list = this.polls;
    if (barangayId) {
      list = list.filter(p => p.barangayId === barangayId);
    }
    return list;
  }

  public createPoll(data: Partial<CommunityPoll>): CommunityPoll {
    const newPoll: CommunityPoll = {
      id: `poll-${Date.now()}`,
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      title: data.title || 'Community Poll',
      description: data.description || '',
      options: data.options || [
        { id: 'opt-1', text: 'More Recycling Bins', votesCount: 0 },
        { id: 'opt-2', text: 'Drainage Cleanout', votesCount: 0 },
      ],
      votedUserIds: [],
      totalVotes: 0,
      deadline: data.deadline || '2026-12-31',
      status: 'Active',
      createdAt: new Date().toISOString(),
      createdByOfficialName: data.createdByOfficialName || 'Barangay Official',
    };
    this.polls.unshift(newPoll);
    this.savePolls();
    return newPoll;
  }

  public votePoll(pollId: string, optionId: string, userId: string): CommunityPoll {
    const poll = this.polls.find(p => p.id === pollId);
    if (!poll) throw new Error('Poll not found');
    if (poll.votedUserIds.some(v => v.userId === userId)) {
      throw new Error('You have already voted in this poll.');
    }
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
      option.votesCount += 1;
      poll.totalVotes += 1;
      poll.votedUserIds.push({ userId, optionId });
      this.savePolls();
    }
    return poll;
  }

  public closePoll(pollId: string): CommunityPoll {
    const poll = this.polls.find(p => p.id === pollId);
    if (!poll) throw new Error('Poll not found');
    poll.status = 'Closed';
    this.savePolls();
    return poll;
  }

  // ==================== 4. BEFORE & AFTER REPORT VERIFICATION ====================
  public resolveReportWithVerification(
    reportId: string,
    data: {
      beforePhotoUrl?: string;
      afterPhotoUrl?: string;
      resolutionDescription: string;
      officialAction: string;
      officialNotes?: string;
    }
  ): EnvironmentalReport {
    const rep = this.reports.find(r => r.id === reportId);
    if (!rep) throw new Error('Report not found');
    rep.status = 'Resolved';
    rep.resolvedAt = new Date().toISOString();
    rep.beforePhotoUrl = data.beforePhotoUrl || rep.photoUrl;
    rep.afterPhotoUrl = data.afterPhotoUrl;
    rep.resolutionDescription = data.resolutionDescription;
    rep.resolutionDate = new Date().toISOString().split('T')[0];
    rep.officialAction = data.officialAction;
    if (data.officialNotes) rep.officialNotes = data.officialNotes;

    this.saveReports();
    return rep;
  }

  public submitReportReopenRequest(
    reportId: string,
    data: { residentAnswer: 'YES' | 'NO'; reason?: string; photoUrl?: string }
  ): EnvironmentalReport {
    const rep = this.reports.find(r => r.id === reportId);
    if (!rep) throw new Error('Report not found');
    rep.reopenRequest = {
      residentAnswer: data.residentAnswer,
      reason: data.reason,
      photoUrl: data.photoUrl,
      requestedAt: new Date().toISOString(),
      status: 'Pending',
    };
    if (data.residentAnswer === 'NO') {
      rep.status = 'In Progress'; // Reopen report automatically for review
    }
    this.saveReports();
    return rep;
  }

  // ==================== 5. TRANSPARENCY CENTER DATA ====================
  public getTransparencyMetrics(barangayId: string) {
    const brgyReports = this.reports.filter(r => r.barangayId === barangayId);
    const reportsReceived = brgyReports.length;
    const reportsResolved = brgyReports.filter(r => r.status === 'Resolved').length;
    const pendingReports = brgyReports.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;
    
    const brgyUsers = this.users.filter(u => u.barangayId === barangayId);
    const activeResidents = brgyUsers.length;

    let wasteRecycled = 0;
    brgyUsers.forEach(u => wasteRecycled += (u.kgRecycled || 0));

    const brgyEvents = this.events.filter(e => e.barangayId === barangayId);
    const cleanupActivities = brgyEvents.filter(e => e.category === 'Cleanup').length;

    const brgyProjects = this.projects.filter(p => p.barangayId === barangayId);
    const projectsCount = brgyProjects.length;
    const completedProjects = brgyProjects.filter(p => p.status === 'Completed').length;

    const barangayObj = this.barangays.find(b => b.id === barangayId) || this.barangays[0];

    return {
      barangayName: barangayObj.name,
      cityName: barangayObj.cityName,
      sustainabilityScore: barangayObj.score.totalScore,
      tier: barangayObj.score.tier,
      reportsReceived,
      reportsResolved,
      pendingReports,
      avgResolutionTimeDays: 1.8,
      wasteRecycledKg: wasteRecycled || 18700,
      wasteDivertedPct: 68.5,
      activeResidents: activeResidents || 1240,
      communityParticipationPct: 84.2,
      cleanupActivities,
      environmentalProjects: projectsCount,
      completedProjects,
      rankingHistory: [
        { month: 'May', score: 82.1, rank: 4 },
        { month: 'Jun', score: 85.0, rank: 3 },
        { month: 'Jul', score: 87.8, rank: 2 },
        { month: 'Aug', score: barangayObj.score.totalScore, rank: 1 },
      ],
    };
  }

  // ==================== 6. ASSETS & 17. TREES ====================
  public getAssets(barangayId?: string, category?: string): EnvironmentalAsset[] {
    let list = this.assets;
    if (barangayId) list = list.filter(a => a.barangayId === barangayId);
    if (category && category !== 'ALL') list = list.filter(a => a.category === category);
    return list;
  }

  public createAsset(data: Partial<EnvironmentalAsset>): EnvironmentalAsset {
    const newAsset: EnvironmentalAsset = {
      id: `ast-${Date.now()}`,
      name: data.name || 'Environmental Asset',
      category: data.category || 'Green Spaces',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      lat: data.lat || 14.5714,
      lng: data.lng || 121.0617,
      description: data.description || '',
      photoUrl: data.photoUrl,
      condition: data.condition || 'Operational',
      details: data.details,
    };
    this.assets.unshift(newAsset);
    this.saveAssets();
    return newAsset;
  }

  public getTrees(barangayId?: string): TreeItem[] {
    let list = this.trees;
    if (barangayId) list = list.filter(t => t.barangayId === barangayId);
    return list;
  }

  public addTree(data: Partial<TreeItem>): TreeItem {
    const newTree: TreeItem = {
      id: `tree-${Date.now()}`,
      species: data.species || 'Native Tree',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      lat: data.lat || 14.5714,
      lng: data.lng || 121.0617,
      datePlanted: data.datePlanted || new Date().toISOString().split('T')[0],
      condition: data.condition || 'Healthy',
      plantingOrg: data.plantingOrg || 'Community Planting',
      status: 'Active',
      photoUrl: data.photoUrl,
    };
    this.trees.unshift(newTree);
    this.saveTrees();
    return newTree;
  }

  // ==================== 9. ENVIRONMENTAL ALERTS ====================
  public getAlerts(): EnvironmentalAlert[] {
    return this.alerts.filter(a => a.active);
  }

  public createAlert(data: Partial<EnvironmentalAlert>): EnvironmentalAlert {
    const newAlert: EnvironmentalAlert = {
      id: `alt-${Date.now()}`,
      title: data.title || 'Environmental Alert',
      description: data.description || '',
      category: data.category || 'Major Pollution',
      targetScope: data.targetScope || 'Barangay',
      targetId: data.targetId,
      targetName: data.targetName,
      severity: data.severity || 'Moderate',
      createdAt: new Date().toISOString(),
      active: true,
      authorName: data.authorName || 'Environmental Officer',
    };
    this.alerts.unshift(newAlert);
    this.saveAlerts();
    return newAlert;
  }

  // ==================== 11 & 12. FACILITY REVIEWS & STATUS ====================
  public addFacilityReview(
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
  ): Facility {
    const fac = this.facilities.find(f => f.id === facilityId);
    if (!fac) throw new Error('Facility not found');
    if (!fac.reviews) fac.reviews = [];
    if (fac.reviews.some(r => r.userId === review.userId)) {
      throw new Error('You have already submitted a review for this facility.');
    }
    fac.reviews.unshift({
      id: `rev-${Date.now()}`,
      facilityId,
      ...review,
      createdAt: new Date().toISOString(),
    });
    this.saveFacilities();
    return fac;
  }

  public updateFacilityStatus(facilityId: string, status: FacilityStatus): Facility {
    const fac = this.facilities.find(f => f.id === facilityId);
    if (!fac) throw new Error('Facility not found');
    fac.status = status;
    this.saveFacilities();
    return fac;
  }

  // ==================== 13. BULK WASTE PICKUP ====================
  public getBulkPickups(userId?: string, barangayId?: string): BulkWastePickupRequest[] {
    let list = this.bulkPickups;
    if (userId) list = list.filter(b => b.userId === userId);
    if (barangayId) list = list.filter(b => b.barangayId === barangayId);
    return list;
  }

  public createBulkPickup(data: Partial<BulkWastePickupRequest>): BulkWastePickupRequest {
    const newReq: BulkWastePickupRequest = {
      id: `blk-${Date.now()}`,
      userId: data.userId || 'user-resident-1',
      userName: data.userName || 'Resident',
      userPhone: data.userPhone || '',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      wasteType: data.wasteType || 'Bulk Cardboard',
      quantityDescription: data.quantityDescription || '',
      photoUrl: data.photoUrl,
      locationAddress: data.locationAddress || '',
      preferredPickupDate: data.preferredPickupDate || new Date().toISOString().split('T')[0],
      notes: data.notes,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
    };
    this.bulkPickups.unshift(newReq);
    this.saveBulkPickups();
    return newReq;
  }

  public updateBulkPickupStatus(
    requestId: string,
    status: BulkWasteStatus,
    scheduledDate?: string
  ): BulkWastePickupRequest {
    const req = this.bulkPickups.find(b => b.id === requestId);
    if (!req) throw new Error('Pickup request not found');
    req.status = status;
    if (scheduledDate) req.scheduledDate = scheduledDate;
    this.saveBulkPickups();
    return req;
  }

  // ==================== 14 & 15. BUSINESS DIRECTORY & ORGANIZATIONS ====================
  public getEcoBusinesses(barangayId?: string, category?: string): EcoBusiness[] {
    let list = this.businesses;
    if (barangayId) list = list.filter(b => b.barangayId === barangayId);
    if (category && category !== 'ALL') list = list.filter(b => b.category === category);
    return list;
  }

  public createEcoBusiness(data: Partial<EcoBusiness>): EcoBusiness {
    const newBiz: EcoBusiness = {
      id: `biz-${Date.now()}`,
      name: data.name || 'Eco Business',
      category: data.category || 'Sustainable Business',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      cityName: data.cityName || 'Pasig City',
      address: data.address || '',
      contactPhone: data.contactPhone || '',
      openingHours: data.openingHours || '08:00 AM - 05:00 PM',
      services: data.services || [],
      verified: true,
      photoUrl: data.photoUrl,
      lat: data.lat,
      lng: data.lng,
      rating: 5.0,
    };
    this.businesses.unshift(newBiz);
    this.saveBusinesses();
    return newBiz;
  }

  public getPartnerOrganizations(barangayId?: string): PartnerOrganization[] {
    let list = this.organizations;
    if (barangayId) list = list.filter(o => o.barangayId === barangayId);
    return list;
  }

  public createPartnerOrganization(data: Partial<PartnerOrganization>): PartnerOrganization {
    const newOrg: PartnerOrganization = {
      id: `org-${Date.now()}`,
      name: data.name || 'Partner Organization',
      type: data.type || 'NGO',
      barangayId: data.barangayId || 'brgy-kapitolyo',
      barangayName: data.barangayName || 'Kapitolyo',
      verified: true,
      description: data.description || '',
      contactEmail: data.contactEmail || '',
      eventsCreatedCount: 1,
    };
    this.organizations.unshift(newOrg);
    this.saveOrganizations();
    return newOrg;
  }

  // ==================== 16. FAMILY ECO CHALLENGES ====================
  public getFamilyGroup(userId: string): FamilyGroup | undefined {
    return this.familyGroups.find(f => f.members.some(m => m.userId === userId));
  }

  public createFamilyGroup(data: Partial<FamilyGroup>, leaderUser: User): FamilyGroup {
    const newFam: FamilyGroup = {
      id: `fam-${Date.now()}`,
      familyName: data.familyName || `${leaderUser.fullName} Family`,
      barangayId: leaderUser.barangayId,
      barangayName: leaderUser.barangayName,
      leaderUserId: leaderUser.id,
      members: [
        {
          userId: leaderUser.id,
          fullName: leaderUser.fullName,
          role: 'Leader',
          pointsContributed: leaderUser.ecoPoints || 0,
          avatarUrl: leaderUser.avatarUrl,
        },
      ],
      monthlyTargetKg: data.monthlyTargetKg || 20,
      currentProgressKg: leaderUser.kgRecycled || 0,
      totalEcoPoints: leaderUser.ecoPoints || 0,
    };
    this.familyGroups.unshift(newFam);
    this.saveFamilyGroups();
    return newFam;
  }

  // ==================== 10. PERSONAL CALENDAR ====================
  public getCalendarEvents(userId: string, barangayId?: string): PersonalCalendarEvent[] {
    let list = this.calendarEvents.filter(c => c.userId === userId || !c.isCustom);
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public addCalendarEvent(event: Partial<PersonalCalendarEvent>): PersonalCalendarEvent {
    const newEvt: PersonalCalendarEvent = {
      id: `cal-${Date.now()}`,
      userId: event.userId || 'user-resident-1',
      title: event.title || 'Personal Eco Event',
      date: event.date || new Date().toISOString().split('T')[0],
      time: event.time,
      type: event.type || 'Personal Reminder',
      description: event.description,
      isCustom: true,
    };
    this.calendarEvents.push(newEvt);
    this.saveCalendarEvents();
    return newEvt;
  }

  // ==================== 18. MOST IMPROVED BARANGAYS ====================
  public getMostImprovedBarangays(): BarangayImprovement[] {
    return this.improvements.sort((a, b) => b.scoreImprovement - a.scoreImprovement);
  }

  // Admin
  public getAllAdminUsers(): User[] {
    return this.users;
  }
}

export const clientStore = new ClientStore();
