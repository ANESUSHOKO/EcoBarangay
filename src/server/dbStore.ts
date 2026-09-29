import fs from 'fs';
import path from 'path';
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
  FeedPost,
  GovernmentPage,
  AppNotification,
  PersonalCalendarEvent,
  BulkWastePickupRequest,
  BulkWasteStatus,
  EcoBusiness,
  PartnerOrganization,
  FamilyGroup,
  EnvironmentalAsset,
  TreeItem,
  EnvironmentalAlert,
  BarangayImprovement
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
  INITIAL_NOTIFICATIONS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_BULK_PICKUPS,
  INITIAL_BUSINESSES,
  INITIAL_ORGANIZATIONS,
  INITIAL_FAMILY_GROUPS,
  INITIAL_ASSETS,
  INITIAL_TREES,
  INITIAL_ALERTS,
  INITIAL_BARANGAY_IMPROVEMENTS
} from './initialData';
import { firestoreDb } from './firebaseAdmin';

interface DBData {
  regions: Region[];
  provinces: Province[];
  cities: City[];
  barangays: Barangay[];
  users: User[];
  governmentPages: GovernmentPage[];
  facilities: Facility[];
  reports: EnvironmentalReport[];
  events: Event[];
  challenges: Challenge[];
  schedules: GarbageSchedule[];
  activityLogs: UserActivityLog[];
  announcements: Announcement[];
  feedPosts: FeedPost[];
  notifications: AppNotification[];
  calendarEvents?: PersonalCalendarEvent[];
  bulkPickups?: BulkWastePickupRequest[];
  businesses?: EcoBusiness[];
  organizations?: PartnerOrganization[];
  familyGroups?: FamilyGroup[];
  assets?: EnvironmentalAsset[];
  trees?: TreeItem[];
  alerts?: EnvironmentalAlert[];
  improvements?: BarangayImprovement[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PSGC_DIR = path.join(DATA_DIR, 'psgc');

class DBStore {
  private data!: DBData;
  private psgcRegions: Region[] | null = null;
  private psgcProvinces: Province[] | null = null;
  private psgcCities: City[] | null = null;
  private psgcBarangaysByCity: Record<string, any[]> | null = null;
  private psgcAllBarangays: any[] | null = null;

  constructor() {
    this.init();
    this.loadPsgcData();
  }

  public loadPsgcData() {
    if (this.psgcRegions) return;
    try {
      if (fs.existsSync(path.join(PSGC_DIR, 'regions.json'))) {
        this.psgcRegions = JSON.parse(fs.readFileSync(path.join(PSGC_DIR, 'regions.json'), 'utf-8'));
        this.psgcProvinces = JSON.parse(fs.readFileSync(path.join(PSGC_DIR, 'provinces_and_independent_cities.json'), 'utf-8'));
        this.psgcCities = JSON.parse(fs.readFileSync(path.join(PSGC_DIR, 'cities.json'), 'utf-8'));
        this.psgcBarangaysByCity = JSON.parse(fs.readFileSync(path.join(PSGC_DIR, 'barangays_by_city.json'), 'utf-8'));
        this.psgcAllBarangays = JSON.parse(fs.readFileSync(path.join(PSGC_DIR, 'all_barangays_index.json'), 'utf-8'));
        console.log(`[dbStore] Loaded PSGC official dataset: ${this.psgcRegions?.length} regions, ${this.psgcProvinces?.length} provinces/HUCs, ${this.psgcCities?.length} cities, ${this.psgcAllBarangays?.length} barangays.`);
      }
    } catch (e) {
      console.warn('[dbStore] Note: Could not load data/psgc files, using fallback data:', e);
    }
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (!this.data.feedPosts) {
          this.data.feedPosts = INITIAL_FEED_POSTS;
        }
        if (!this.data.governmentPages) {
          this.data.governmentPages = INITIAL_GOVERNMENT_PAGES;
        }
        if (!this.data.notifications) {
          this.data.notifications = INITIAL_NOTIFICATIONS;
        }
        if (!this.data.calendarEvents) {
          this.data.calendarEvents = INITIAL_CALENDAR_EVENTS;
        }
        if (!this.data.bulkPickups) {
          this.data.bulkPickups = INITIAL_BULK_PICKUPS;
        }
        if (!this.data.businesses) {
          this.data.businesses = INITIAL_BUSINESSES;
        }
        if (!this.data.organizations) {
          this.data.organizations = INITIAL_ORGANIZATIONS;
        }
        if (!this.data.familyGroups) {
          this.data.familyGroups = INITIAL_FAMILY_GROUPS;
        }
        if (!this.data.assets) {
          this.data.assets = INITIAL_ASSETS;
        }
        if (!this.data.trees) {
          this.data.trees = INITIAL_TREES;
        }
        if (!this.data.alerts) {
          this.data.alerts = INITIAL_ALERTS;
        }
        if (!this.data.improvements) {
          this.data.improvements = INITIAL_BARANGAY_IMPROVEMENTS;
        }
        // Ensure ranking calculations are up to date
        this.recalculateRanks();
      } else {
        this.resetToDefaults();
      }

      // Sync existing users from Firestore if present
      if (firestoreDb) {
        this.loadUsersFromFirestore().catch(err => {
          console.warn('Initial Firestore user fetch:', err);
        });
      }
    } catch (err) {
      console.error('Failed to load DB file, initializing default dataset:', err);
      this.resetToDefaults();
    }
  }

  private async loadUsersFromFirestore() {
    if (!firestoreDb) return;
    try {
      const snap = await firestoreDb.collection('users').get();
      if (!snap.empty) {
        snap.forEach(docSnap => {
          const remoteUser = docSnap.data() as User;
          if (remoteUser && remoteUser.email) {
            const idx = this.data.users.findIndex(
              u => u.id === remoteUser.id || u.email.toLowerCase() === remoteUser.email.toLowerCase()
            );
            if (idx >= 0) {
              this.data.users[idx] = { ...this.data.users[idx], ...remoteUser };
            } else {
              this.data.users.push(remoteUser);
            }
          }
        });
        this.saveLocal();
        console.log(`Loaded ${snap.size} user accounts from Firestore.`);
      }
    } catch (err) {
      console.error('Error fetching users from Firestore in dbStore:', err);
    }
  }

  private saveLocal() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing local DB file:', err);
    }
  }

  private resetToDefaults() {
    this.data = {
      regions: INITIAL_REGIONS,
      provinces: INITIAL_PROVINCES,
      cities: INITIAL_CITIES,
      barangays: INITIAL_BARANGAYS,
      users: INITIAL_USERS,
      governmentPages: INITIAL_GOVERNMENT_PAGES,
      facilities: INITIAL_FACILITIES,
      reports: INITIAL_REPORTS,
      events: INITIAL_EVENTS,
      challenges: INITIAL_CHALLENGES,
      schedules: INITIAL_SCHEDULES,
      activityLogs: INITIAL_ACTIVITY_LOGS,
      announcements: INITIAL_ANNOUNCEMENTS,
      feedPosts: INITIAL_FEED_POSTS,
      notifications: INITIAL_NOTIFICATIONS,
      calendarEvents: INITIAL_CALENDAR_EVENTS,
      bulkPickups: INITIAL_BULK_PICKUPS,
      businesses: INITIAL_BUSINESSES,
      organizations: INITIAL_ORGANIZATIONS,
      familyGroups: INITIAL_FAMILY_GROUPS,
      assets: INITIAL_ASSETS,
      trees: INITIAL_TREES,
      alerts: INITIAL_ALERTS,
      improvements: INITIAL_BARANGAY_IMPROVEMENTS,
    };
    this.recalculateRanks();
    this.save();
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');

      // Asynchronously mirror key collections to Firestore
      if (firestoreDb) {
        this.syncToFirestore().catch(err => {
          console.error('Failed to sync to Firestore:', err);
        });
      }
    } catch (err) {
      console.error('Error saving DB file:', err);
    }
  }

  private async syncToFirestore() {
    if (!firestoreDb) return;
    try {
      const batch = firestoreDb.batch();

      // Sync Users
      for (const user of this.data.users) {
        const ref = firestoreDb.collection('users').doc(user.id);
        batch.set(ref, JSON.parse(JSON.stringify(user)), { merge: true });
      }

      // Sync Reports
      for (const report of this.data.reports) {
        const ref = firestoreDb.collection('reports').doc(report.id);
        batch.set(ref, JSON.parse(JSON.stringify(report)), { merge: true });
      }

      // Sync Feed Posts
      for (const post of this.data.feedPosts) {
        const ref = firestoreDb.collection('feedPosts').doc(post.id);
        batch.set(ref, JSON.parse(JSON.stringify(post)), { merge: true });
      }

      // Sync Events
      for (const event of this.data.events) {
        const ref = firestoreDb.collection('events').doc(event.id);
        batch.set(ref, JSON.parse(JSON.stringify(event)), { merge: true });
      }

      // Sync Barangays
      for (const brgy of this.data.barangays) {
        const ref = firestoreDb.collection('barangays').doc(brgy.id);
        batch.set(ref, JSON.parse(JSON.stringify(brgy)), { merge: true });
      }

      await batch.commit();
    } catch (err) {
      console.error('Firestore batch write error:', err);
    }
  }

  public recalculateRanks() {
    // Sort barangays by score.totalScore descending
    const sorted = [...this.data.barangays].sort((a, b) => b.score.totalScore - a.score.totalScore);
    
    // Assign national ranks
    sorted.forEach((b, idx) => {
      b.score.nationalRank = idx + 1;
      
      // Calculate tier based on normalized score (0-100)
      const score = b.score.totalScore;
      if (score >= 90) b.score.tier = 'Platinum';
      else if (score >= 80) b.score.tier = 'Gold';
      else if (score >= 70) b.score.tier = 'Silver';
      else if (score >= 60) b.score.tier = 'Bronze';
      else b.score.tier = 'Developing';
    });

    // Update main array references
    this.data.barangays = sorted;
  }

  // Region / Province / City / Barangay APIs (Powered by official BetterGov PSGC dataset)
  public getRegions(): Region[] {
    this.loadPsgcData();
    if (this.psgcRegions && this.psgcRegions.length > 0) {
      return this.psgcRegions;
    }
    return this.data.regions;
  }
  
  public getProvinces(regionCode?: string): Province[] {
    this.loadPsgcData();
    let list = (this.psgcProvinces && this.psgcProvinces.length > 0) ? this.psgcProvinces : this.data.provinces;
    if (regionCode) {
      return list.filter(p => p.regionCode === regionCode);
    }
    return list;
  }

  public getCities(provinceCode?: string, regionCode?: string): City[] {
    this.loadPsgcData();
    let list = (this.psgcCities && this.psgcCities.length > 0) ? this.psgcCities : this.data.cities;
    if (provinceCode) {
      // If provinceCode matches an independent city (HUC/ICC), return that city directly
      const matchInd = list.filter(c => c.code === provinceCode);
      if (matchInd.length > 0 && matchInd[0].isIndependent) {
        return matchInd;
      }
      return list.filter(c => c.provinceCode === provinceCode);
    } else if (regionCode) {
      return list.filter(c => c.regionCode === regionCode);
    }
    return list;
  }

  public getBarangays(filters?: { cityCode?: string; provinceCode?: string; regionCode?: string; search?: string }): Barangay[] {
    this.loadPsgcData();

    const wrapBarangay = (b: any): Barangay => {
      const existing = this.data.barangays.find(ex => ex.id === b.id || ex.psgcCode === b.psgcCode);
      if (existing) return existing;
      return {
        id: b.id,
        psgcCode: b.psgcCode || b.id,
        name: b.name,
        cityCode: b.cityCode,
        cityName: b.cityName,
        provinceCode: b.provinceCode,
        provinceName: b.provinceName,
        regionCode: b.regionCode,
        regionName: b.regionName,
        lat: b.lat,
        lng: b.lng,
        population: 4500,
        totalUsers: 0,
        score: {
          wasteManagement: 15,
          recycling: 12,
          communityParticipation: 10,
          reportsResolution: 10,
          cleanupActivities: 5,
          sustainabilityChallenges: 2,
          educationParticipation: 2,
          totalScore: 56,
          tier: 'Developing',
          nationalRank: 1000,
        },
        totalRecycledKg: 0,
        totalReportsResolved: 0,
        totalReportsReceived: 0,
        mrfActive: true,
        garbageScheduleDays: ['Monday', 'Wednesday', 'Friday'],
      };
    };

    // Fast O(1) retrieval when cityCode is provided
    if (filters?.cityCode && this.psgcBarangaysByCity && this.psgcBarangaysByCity[filters.cityCode]) {
      let brgyList = this.psgcBarangaysByCity[filters.cityCode];
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        brgyList = brgyList.filter((b: any) => b.name.toLowerCase().includes(q));
      }
      return brgyList.map(wrapBarangay);
    }

    // High performance search across all 42,000+ official barangays
    if (filters?.search && this.psgcAllBarangays) {
      const q = filters.search.toLowerCase();
      let matches = this.psgcAllBarangays.filter((b: any) =>
        b.name.toLowerCase().includes(q) ||
        (b.cityName && b.cityName.toLowerCase().includes(q)) ||
        (b.provinceName && b.provinceName.toLowerCase().includes(q))
      );
      if (filters?.regionCode) {
        matches = matches.filter((b: any) => b.regionCode === filters.regionCode);
      }
      if (filters?.provinceCode) {
        matches = matches.filter((b: any) => b.provinceCode === filters.provinceCode || b.cityCode === filters.provinceCode);
      }
      return matches.slice(0, 50).map(wrapBarangay);
    }

    // Filter by province
    if (filters?.provinceCode && this.psgcAllBarangays) {
      const matches = this.psgcAllBarangays.filter((b: any) =>
        b.provinceCode === filters.provinceCode || b.cityCode === filters.provinceCode
      );
      return matches.slice(0, 100).map(wrapBarangay);
    }

    // Default fallback
    return this.data.barangays;
  }

  public getBarangayById(id: string): Barangay | undefined {
    const existing = this.data.barangays.find(b => b.id === id || b.psgcCode === id);
    if (existing) return existing;

    this.loadPsgcData();
    if (this.psgcAllBarangays) {
      const match = this.psgcAllBarangays.find((b: any) => b.id === id || b.psgcCode === id);
      if (match) {
        return {
          id: match.id,
          psgcCode: match.psgcCode || match.id,
          name: match.name,
          cityCode: match.cityCode,
          cityName: match.cityName,
          provinceCode: match.provinceCode,
          provinceName: match.provinceName,
          regionCode: match.regionCode,
          regionName: match.regionName,
          lat: match.lat,
          lng: match.lng,
          population: 4500,
          totalUsers: 0,
          score: {
            wasteManagement: 15,
            recycling: 12,
            communityParticipation: 10,
            reportsResolution: 10,
            cleanupActivities: 5,
            sustainabilityChallenges: 2,
            educationParticipation: 2,
            totalScore: 56,
            tier: 'Developing',
            nationalRank: 1000,
          },
          totalRecycledKg: 0,
          totalReportsResolved: 0,
          totalReportsReceived: 0,
          mrfActive: true,
          garbageScheduleDays: ['Monday', 'Wednesday', 'Friday'],
        };
      }
    }
    return undefined;
  }

  public detectNearestBarangay(lat: number, lng: number): { nearestBarangay: Barangay & { distanceKm: number }; distanceKm: number } {
    this.loadPsgcData();
    const candidateList = (this.psgcAllBarangays && this.psgcAllBarangays.length > 0)
      ? this.psgcAllBarangays
      : this.data.barangays;

    let nearest: any = null;
    let minDistance = Infinity;

    for (const b of candidateList) {
      if (typeof b.lat === 'number' && typeof b.lng === 'number') {
        const R = 6371; // km
        const dLat = (b.lat - lat) * (Math.PI / 180);
        const dLon = (b.lng - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(b.lat * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.round(R * c * 100) / 100;
        if (dist < minDistance) {
          minDistance = dist;
          nearest = b;
        }
      }
    }

    if (!nearest) {
      nearest = this.data.barangays[0];
      minDistance = 0;
    }

    const fullNearest = this.getBarangayById(nearest.id) || this.data.barangays[0];
    return {
      nearestBarangay: { ...fullNearest, distanceKm: minDistance },
      distanceKm: minDistance,
    };
  }

  // Users & Auth
  public getUsers() { return this.data.users; }
  
  public getUserById(id: string) {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(userData: Omit<User, 'id' | 'ecoPoints' | 'ecoScore' | 'kgRecycled' | 'challengesCompleted' | 'cleanupActivitiesCount'>) {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      ecoPoints: 50, // Welcome points
      ecoScore: 60,
      kgRecycled: 0,
      challengesCompleted: 0,
      cleanupActivitiesCount: 0,
    };
    this.data.users.push(newUser);

    // Update barangay total user count
    const brgy = this.getBarangayById(newUser.barangayId);
    if (brgy) {
      brgy.totalUsers = (brgy.totalUsers || 0) + 1;
    }

    this.save();

    // Persist immediately to Firestore
    if (firestoreDb) {
      firestoreDb
        .collection('users')
        .doc(newUser.id)
        .set(JSON.parse(JSON.stringify(newUser)), { merge: true })
        .then(() => {
          console.log(`Successfully stored user account ${newUser.id} (${newUser.email}) in Firestore.`);
        })
        .catch(err => {
          console.error('Error saving user to Firestore in createUser:', err);
        });
    }

    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const user = this.getUserById(id);
    if (user) {
      Object.assign(user, updates);
      this.save();

      // Persist updates to Firestore
      if (firestoreDb) {
        firestoreDb
          .collection('users')
          .doc(id)
          .set(JSON.parse(JSON.stringify(user)), { merge: true })
          .catch(err => {
            console.error('Error updating user in Firestore:', err);
          });
      }
    }
    return user;
  }

  // Facilities
  public getFacilities(barangayId?: string, category?: string) {
    let list = this.data.facilities;
    if (barangayId) {
      list = list.filter(f => f.barangayId === barangayId);
    }
    if (category && category !== 'all') {
      list = list.filter(f => f.category === category);
    }
    return list;
  }

  public createFacility(data: Omit<Facility, 'id'>) {
    const newFacility: Facility = {
      ...data,
      id: `fac-${Date.now()}`,
    };
    this.data.facilities.push(newFacility);

    // Boost barangay score if MRF added
    if (data.category === 'mrf') {
      const brgy = this.getBarangayById(data.barangayId);
      if (brgy) {
        brgy.mrfActive = true;
        brgy.score.wasteManagement = Math.min(25, brgy.score.wasteManagement + 2);
        brgy.score.recycling = Math.min(20, brgy.score.recycling + 2);
        brgy.score.totalScore =
          brgy.score.wasteManagement +
          brgy.score.recycling +
          brgy.score.communityParticipation +
          brgy.score.reportsResolution +
          brgy.score.cleanupActivities +
          brgy.score.sustainabilityChallenges +
          brgy.score.educationParticipation;
        this.recalculateRanks();
      }
    }

    this.save();
    return newFacility;
  }

  // Environmental Reports
  public getReports(barangayId?: string, reporterId?: string) {
    let list = this.data.reports;
    if (barangayId) {
      list = list.filter(r => r.barangayId === barangayId);
    }
    if (reporterId) {
      list = list.filter(r => r.reporterId === reporterId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createReport(data: Omit<EnvironmentalReport, 'id' | 'status' | 'createdAt'>) {
    const newReport: EnvironmentalReport = {
      ...data,
      id: `rep-${Date.now()}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    this.data.reports.push(newReport);

    // Update barangay stats
    const brgy = this.getBarangayById(data.barangayId);
    if (brgy) {
      brgy.totalReportsReceived += 1;
    }

    // Award eco points to reporter
    const user = this.getUserById(data.reporterId);
    if (user) {
      user.ecoPoints += 30;
      this.addActivityLog({
        userId: user.id,
        type: 'Report',
        title: `Reported ${data.category}`,
        description: data.description,
        pointsEarned: 30,
      });
    }

    // Create notification
    this.createNotification({
      type: 'REPORT_UPDATE',
      title: '📋 New Environmental Report Filed',
      message: `Report #${newReport.id} (${data.category}) reported in Brgy. ${brgy?.name || data.barangayId}. Status: Pending.`,
      barangayId: data.barangayId,
      barangayName: brgy?.name,
      targetTab: 'reports',
      linkId: newReport.id,
    });

    this.save();
    return newReport;
  }

  public updateReportStatus(id: string, status: EnvironmentalReport['status'], notes?: string) {
    const report = this.data.reports.find(r => r.id === id);
    if (report) {
      report.status = status;
      if (notes) report.officialNotes = notes;

      const brgy = this.getBarangayById(report.barangayId);

      // Create notification for report update
      this.createNotification({
        type: 'REPORT_UPDATE',
        title: status === 'Resolved' ? '🚨 Environmental Report Resolved' : '📋 Report Status Updated',
        message: `Report #${report.id} (${report.category}) status changed to ${status.toUpperCase()}${notes ? `: "${notes}"` : ''}.`,
        barangayId: report.barangayId,
        barangayName: brgy?.name,
        targetTab: 'reports',
        linkId: report.id,
      });

      if (status === 'Resolved' && !report.resolvedAt) {
        report.resolvedAt = new Date().toISOString();
        const brgy = this.getBarangayById(report.barangayId);
        if (brgy) {
          brgy.totalReportsResolved += 1;
          // Boost report resolution score
          const ratio = brgy.totalReportsResolved / Math.max(1, brgy.totalReportsReceived);
          brgy.score.reportsResolution = Math.min(15, Math.round(ratio * 15));
          brgy.score.totalScore =
            brgy.score.wasteManagement +
            brgy.score.recycling +
            brgy.score.communityParticipation +
            brgy.score.reportsResolution +
            brgy.score.cleanupActivities +
            brgy.score.sustainabilityChallenges +
            brgy.score.educationParticipation;
          this.recalculateRanks();
        }
      }
      this.save();
    }
    return report;
  }

  public upvoteReport(id: string, userId?: string) {
    const report = this.data.reports.find(r => r.id === id);
    if (report) {
      if (!report.upvotedUserIds) report.upvotedUserIds = [];
      const userKey = userId || 'anonymous-user';
      if (report.upvotedUserIds.includes(userKey)) {
        report.upvotedUserIds = report.upvotedUserIds.filter(u => u !== userKey);
        report.upvotesCount = Math.max(0, (report.upvotesCount || 1) - 1);
      } else {
        report.upvotedUserIds.push(userKey);
        report.upvotesCount = (report.upvotesCount || 0) + 1;
      }
      this.save();
      return report;
    }
    return null;
  }

  // Events
  public getEvents(barangayId?: string) {
    let list = this.data.events;
    if (barangayId) {
      list = list.filter(e => e.barangayId === barangayId);
    }
    return list;
  }

  public createEvent(data: Omit<Event, 'id' | 'registeredUserIds'>) {
    const newEvent: Event = {
      ...data,
      id: `evt-${Date.now()}`,
      registeredUserIds: [],
    };
    this.data.events.push(newEvent);

    // Boost barangay cleanup score
    const brgy = this.getBarangayById(data.barangayId);
    if (brgy) {
      brgy.score.cleanupActivities = Math.min(10, brgy.score.cleanupActivities + 1);
      brgy.score.totalScore =
        brgy.score.wasteManagement +
        brgy.score.recycling +
        brgy.score.communityParticipation +
        brgy.score.reportsResolution +
        brgy.score.cleanupActivities +
        brgy.score.sustainabilityChallenges +
        brgy.score.educationParticipation;
      this.recalculateRanks();
    }

    this.save();
    return newEvent;
  }

  public joinEvent(eventId: string, userId: string) {
    const event = this.data.events.find(e => e.id === eventId);
    if (event && !event.registeredUserIds.includes(userId)) {
      event.registeredUserIds.push(userId);
      const user = this.getUserById(userId);
      if (user) {
        user.ecoPoints += event.pointsAwarded;
        user.cleanupActivitiesCount += 1;
        this.addActivityLog({
          userId,
          type: 'Event',
          title: `Joined ${event.title}`,
          description: `Participating in ${event.category} on ${event.date}`,
          pointsEarned: event.pointsAwarded,
        });

        // Trigger notification for new event sign-up
        this.createNotification({
          type: 'EVENT_SIGNUP',
          title: '🌱 New Event Sign-up',
          message: `${user.fullName} registered for "${event.title}". (${event.registeredUserIds.length}/${event.maxParticipants} participants)`,
          barangayId: event.barangayId,
          barangayName: event.barangayName,
          targetTab: 'events',
          linkId: event.id,
        });
      }
      this.save();
    }
    return event;
  }

  // Challenges
  public getChallenges() { return this.data.challenges; }

  public joinChallenge(challengeId: string, userId: string) {
    const chl = this.data.challenges.find(c => c.id === challengeId);
    if (chl && !chl.joinedUserIds.includes(userId)) {
      chl.joinedUserIds.push(userId);
      this.save();
    }
    return chl;
  }

  public completeChallenge(challengeId: string, userId: string) {
    const chl = this.data.challenges.find(c => c.id === challengeId);
    if (chl) {
      if (!chl.joinedUserIds.includes(userId)) chl.joinedUserIds.push(userId);
      if (!chl.completedUserIds.includes(userId)) {
        chl.completedUserIds.push(userId);
        const user = this.getUserById(userId);
        if (user) {
          user.ecoPoints += chl.pointsAwarded;
          user.challengesCompleted += 1;
          user.ecoScore = Math.min(100, user.ecoScore + 5);
          this.addActivityLog({
            userId,
            type: 'Challenge',
            title: `Completed ${chl.title}`,
            description: `Earned ${chl.pointsAwarded} Eco Points!`,
            pointsEarned: chl.pointsAwarded,
          });
        }
        this.save();
      }
    }
    return chl;
  }

  // Schedules
  public getSchedules(barangayId?: string) {
    if (barangayId) {
      return this.data.schedules.filter(s => s.barangayId === barangayId);
    }
    return this.data.schedules;
  }

  public createSchedule(data: Omit<GarbageSchedule, 'id'>) {
    const newSch: GarbageSchedule = {
      ...data,
      id: `sch-${Date.now()}`,
    };
    this.data.schedules.push(newSch);
    this.save();
    return newSch;
  }

  // Recycling log
  public logWasteRecycled(userId: string, kg: number, wasteType: string, photoUrl?: string, autoPostToFeed?: boolean) {
    const user = this.getUserById(userId);
    if (user) {
      user.kgRecycled += kg;
      const points = Math.round(kg * 10);
      user.ecoPoints += points;
      user.ecoScore = Math.min(100, user.ecoScore + 2);

      // Update barangay total recycled
      const brgy = this.getBarangayById(user.barangayId);
      if (brgy) {
        brgy.totalRecycledKg += kg;
        brgy.score.recycling = Math.min(20, Math.round(brgy.score.recycling + (kg / 100)));
        brgy.score.totalScore =
          brgy.score.wasteManagement +
          brgy.score.recycling +
          brgy.score.communityParticipation +
          brgy.score.reportsResolution +
          brgy.score.cleanupActivities +
          brgy.score.sustainabilityChallenges +
          brgy.score.educationParticipation;
        this.recalculateRanks();
      }

      this.addActivityLog({
        userId,
        type: 'Recycling',
        title: `Logged ${kg} kg of ${wasteType}`,
        description: `Contributed to ${user.barangayName} recycling score`,
        pointsEarned: points,
        kgRecycled: kg,
        photoUrl,
      });

      if (autoPostToFeed) {
        this.createFeedPost({
          authorId: user.id,
          authorName: user.fullName,
          authorAvatar: user.avatarUrl,
          authorRole: user.role,
          barangayId: user.barangayId,
          barangayName: user.barangayName,
          content: `I just recycled ${kg} kg of ${wasteType}! ♻️ Supporting our barangay's zero-waste journey.`,
          photoUrl: photoUrl || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800',
          wasteKg: kg,
          wasteType,
        });
      }

      this.save();
    }
    return user;
  }

  // Global Search across Barangays, Facilities, and Events
  public globalSearch(query: string) {
    if (!query || query.trim() === '') {
      return { barangays: [], facilities: [], events: [] };
    }
    const q = query.trim().toLowerCase();

    const barangays = this.data.barangays
      .filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.cityName.toLowerCase().includes(q) ||
          b.provinceName.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const facilities = this.data.facilities
      .filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.address.toLowerCase().includes(q) ||
          f.acceptedMaterials.some(m => m.toLowerCase().includes(q))
      )
      .slice(0, 5);

    const events = this.data.events
      .filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
      .slice(0, 5);

    return { barangays, facilities, events };
  }

  // Government Pages & Follow Methods
  public getGovernmentPages(category?: string, regionCode?: string) {
    let pages = [...(this.data.governmentPages || [])];
    if (category) {
      pages = pages.filter(p => p.category === category);
    }
    if (regionCode) {
      pages = pages.filter(p => p.regionCode === regionCode || p.category === 'National Agency');
    }
    return pages;
  }

  public getGovernmentPageById(id: string) {
    return (this.data.governmentPages || []).find(p => p.id === id) || null;
  }

  public toggleFollowUser(userId: string, targetUserId: string) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;

    if (!user.followingUserIds) {
      user.followingUserIds = [];
    }

    const idx = user.followingUserIds.indexOf(targetUserId);
    let isFollowing = false;
    if (idx > -1) {
      user.followingUserIds.splice(idx, 1);
      isFollowing = false;
    } else {
      user.followingUserIds.push(targetUserId);
      isFollowing = true;
    }

    this.save();
    return { user, isFollowing };
  }

  public toggleFollowPage(userId: string, targetPageId: string) {
    const user = this.data.users.find(u => u.id === userId);
    const page = (this.data.governmentPages || []).find(p => p.id === targetPageId);
    if (!user || !page) return null;

    if (!user.followingPageIds) {
      user.followingPageIds = [];
    }

    const idx = user.followingPageIds.indexOf(targetPageId);
    let isFollowing = false;
    if (idx > -1) {
      user.followingPageIds.splice(idx, 1);
      page.followersCount = Math.max(0, (page.followersCount || 0) - 1);
      isFollowing = false;
    } else {
      user.followingPageIds.push(targetPageId);
      page.followersCount = (page.followersCount || 0) + 1;
      isFollowing = true;
    }

    this.save();
    return { user, page, isFollowing };
  }

  // Social Feed Methods
  public getFeedPosts(filters?: {
    barangayId?: string;
    cityCode?: string;
    provinceCode?: string;
    regionCode?: string;
    followingUserId?: string;
    isGovernmentOnly?: boolean;
    scopeLevel?: 'national' | 'region' | 'province' | 'city' | 'barangay';
  }) {
    let posts = [...this.data.feedPosts];

    if (!filters) {
      return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filters.followingUserId) {
      const user = this.data.users.find(u => u.id === filters.followingUserId);
      if (user) {
        const followingUsers = user.followingUserIds || [];
        const followingPages = user.followingPageIds || [];
        posts = posts.filter(p => 
          followingUsers.includes(p.authorId) || 
          (p.governmentPageId && followingPages.includes(p.governmentPageId))
        );
      } else {
        posts = [];
      }
    }

    if (filters.isGovernmentOnly) {
      posts = posts.filter(p => p.isGovernmentPost === true || p.authorRole === 'SYSTEM_ADMIN' || p.governmentPageId);
    }

    if (filters.scopeLevel === 'barangay' && filters.barangayId) {
      posts = posts.filter(p => p.barangayId === filters.barangayId);
    } else if (filters.scopeLevel === 'city' && filters.cityCode) {
      posts = posts.filter(p => {
        if (p.cityCode === filters.cityCode) return true;
        const b = this.data.barangays.find(brgy => brgy.id === p.barangayId);
        return b?.cityCode === filters.cityCode;
      });
    } else if (filters.scopeLevel === 'province' && filters.provinceCode) {
      posts = posts.filter(p => {
        if (p.provinceCode === filters.provinceCode) return true;
        const b = this.data.barangays.find(brgy => brgy.id === p.barangayId);
        return b?.provinceCode === filters.provinceCode;
      });
    } else if (filters.scopeLevel === 'region' && filters.regionCode) {
      posts = posts.filter(p => {
        if (p.regionCode === filters.regionCode) return true;
        const b = this.data.barangays.find(brgy => brgy.id === p.barangayId);
        return b?.regionCode === filters.regionCode;
      });
    } else if (filters.barangayId && !filters.scopeLevel) {
      posts = posts.filter(p => p.barangayId === filters.barangayId);
    }

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createFeedPost(data: {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: any;
    barangayId: string;
    barangayName: string;
    content: string;
    photoUrl?: string;
    wasteKg?: number;
    wasteType?: string;
  }) {
    const newPost: FeedPost = {
      ...data,
      id: `post-${Date.now()}`,
      likes: [],
      comments: [],
      sharesCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.feedPosts.unshift(newPost);
    this.save();
    return newPost;
  }

  public likeFeedPost(postId: string, userId: string) {
    const post = this.data.feedPosts.find(p => p.id === postId);
    if (post) {
      const idx = post.likes.indexOf(userId);
      if (idx > -1) {
        post.likes.splice(idx, 1);
      } else {
        post.likes.push(userId);
      }
      this.save();
    }
    return post;
  }

  public addFeedComment(postId: string, data: { authorId: string; authorName: string; authorAvatar?: string; content: string }) {
    const post = this.data.feedPosts.find(p => p.id === postId);
    if (post) {
      const newComment = {
        id: `c-${Date.now()}`,
        postId,
        ...data,
        createdAt: new Date().toISOString(),
      };
      post.comments.push(newComment);
      this.save();
      return post;
    }
    return null;
  }

  public shareFeedPost(postId: string) {
    const post = this.data.feedPosts.find(p => p.id === postId);
    if (post) {
      post.sharesCount = (post.sharesCount || 0) + 1;
      this.save();
    }
    return post;
  }

  // Activity logs
  public getActivityLogs(userId?: string) {
    if (userId) {
      return this.data.activityLogs.filter(a => a.userId === userId);
    }
    return this.data.activityLogs;
  }

  public addActivityLog(data: Omit<UserActivityLog, 'id' | 'createdAt'>) {
    const log: UserActivityLog = {
      ...data,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    this.save();
    return log;
  }

  // Announcements
  public getAnnouncements(barangayId?: string) {
    if (barangayId) {
      return this.data.announcements.filter(a => a.barangayId === barangayId);
    }
    return this.data.announcements;
  }

  public createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>) {
    const anc: Announcement = {
      ...data,
      id: `anc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.announcements.unshift(anc);
    this.save();
    return anc;
  }

  // Notifications System
  public getNotifications(barangayId?: string) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    let list = this.data.notifications;
    if (barangayId) {
      list = list.filter(n => !n.barangayId || n.barangayId === barangayId);
    }
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public createNotification(data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.data.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  public markNotificationAsRead(id: string) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
    return notif;
  }

  public markAllNotificationsAsRead(barangayId?: string) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    this.data.notifications.forEach(n => {
      if (!barangayId || n.barangayId === barangayId) {
        n.read = true;
      }
    });
    this.save();
    return true;
  }

  // System statistics summary for landing page
  public getStatsSummary() {
    const totalResidents = this.data.users.length;
    const totalBarangays = this.data.barangays.length;
    const totalRecycled = this.data.barangays.reduce((acc, b) => acc + b.totalRecycledKg, 0);
    const totalCleanups = this.data.events.filter(e => e.category === 'Cleanup').length;
    const totalResolvedReports = this.data.reports.filter(r => r.status === 'Resolved').length;

    return {
      registeredResidents: totalResidents + 2450, // Added realistic scale
      participatingBarangays: totalBarangays + 42,
      wasteRecycledKg: Math.round(totalRecycled + 18700),
      cleanupActivities: totalCleanups + 34,
      reportsResolved: totalResolvedReports + 128,
    };
  }

  // Personal Eco Calendar Events
  public getCalendarEvents(userId: string, _barangayId?: string): PersonalCalendarEvent[] {
    if (!this.data.calendarEvents) this.data.calendarEvents = INITIAL_CALENDAR_EVENTS;
    return this.data.calendarEvents.filter(e => e.userId === userId);
  }

  public addCalendarEvent(event: any): PersonalCalendarEvent {
    if (!this.data.calendarEvents) this.data.calendarEvents = INITIAL_CALENDAR_EVENTS;
    const newEvt: PersonalCalendarEvent = {
      id: `calevt-${Date.now()}`,
      userId: event.userId || 'anonymous',
      title: event.title || 'Eco Activity',
      date: event.date || new Date().toISOString().split('T')[0],
      time: event.time || '08:00 AM',
      type: event.type || 'Personal Reminder',
      description: event.description || event.instructions || '',
      isCustom: true,
    };
    this.data.calendarEvents.push(newEvt);
    this.save();
    return newEvt;
  }

  // Bulk Waste Pickups
  public getBulkPickups(userId?: string, barangayId?: string): BulkWastePickupRequest[] {
    if (!this.data.bulkPickups) this.data.bulkPickups = INITIAL_BULK_PICKUPS;
    let list = this.data.bulkPickups;
    if (userId) list = list.filter(b => b.userId === userId);
    if (barangayId) list = list.filter(b => b.barangayId === barangayId);
    return list;
  }

  public createBulkPickup(data: any): BulkWastePickupRequest {
    if (!this.data.bulkPickups) this.data.bulkPickups = INITIAL_BULK_PICKUPS;
    const newReq: BulkWastePickupRequest = {
      id: `bulk-${Date.now()}`,
      userId: data.userId || 'anonymous',
      userName: data.userName || 'Resident',
      userPhone: data.userPhone || data.phone || '09123456789',
      barangayId: data.barangayId || '',
      barangayName: data.barangayName || '',
      wasteType: data.wasteType || 'Furniture',
      quantityDescription: data.quantityDescription || data.description || '1 item',
      photoUrl: data.photoUrl,
      locationAddress: data.locationAddress || data.pickupAddress || '',
      preferredPickupDate: data.preferredPickupDate || data.preferredDate || new Date().toISOString().split('T')[0],
      notes: data.notes,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
    };
    this.data.bulkPickups.unshift(newReq);
    this.save();
    return newReq;
  }

  public updateBulkPickupStatus(id: string, status: BulkWasteStatus, scheduledDate?: string): BulkWastePickupRequest | null {
    if (!this.data.bulkPickups) this.data.bulkPickups = INITIAL_BULK_PICKUPS;
    const req = this.data.bulkPickups.find(b => b.id === id);
    if (req) {
      req.status = status;
      if (scheduledDate) req.scheduledDate = scheduledDate;
      this.save();
      return req;
    }
    return null;
  }

  // Businesses & Partner Organizations
  public getEcoBusinesses(barangayId?: string, category?: string): EcoBusiness[] {
    if (!this.data.businesses) this.data.businesses = INITIAL_BUSINESSES;
    let list = this.data.businesses;
    if (barangayId) list = list.filter(b => !b.barangayId || b.barangayId === barangayId);
    if (category && category !== 'ALL') list = list.filter(b => b.category === category);
    return list;
  }

  public createEcoBusiness(data: any): EcoBusiness {
    if (!this.data.businesses) this.data.businesses = INITIAL_BUSINESSES;
    const b: EcoBusiness = {
      id: `biz-${Date.now()}`,
      name: data.name || '',
      category: data.category || 'Zero-Waste Store',
      barangayId: data.barangayId || '',
      barangayName: data.barangayName || '',
      cityName: data.cityName || '',
      address: data.address || '',
      contactPhone: data.contactPhone || data.phone || '',
      openingHours: data.openingHours || '8:00 AM - 5:00 PM',
      services: data.services || ['Recycling'],
      verified: true,
      lat: data.lat || 14.58,
      lng: data.lng || 121.06,
      rating: 5,
    };
    this.data.businesses.push(b);
    this.save();
    return b;
  }

  public getPartnerOrganizations(barangayId?: string): PartnerOrganization[] {
    if (!this.data.organizations) this.data.organizations = INITIAL_ORGANIZATIONS;
    let list = this.data.organizations;
    if (barangayId) list = list.filter(o => !o.barangayId || o.barangayId === barangayId);
    return list;
  }

  public createPartnerOrganization(data: any): PartnerOrganization {
    if (!this.data.organizations) this.data.organizations = INITIAL_ORGANIZATIONS;
    const o: PartnerOrganization = {
      id: `org-${Date.now()}`,
      name: data.name || '',
      type: data.type || 'NGO',
      description: data.description || 'Environmental initiative partner',
      contactEmail: data.contactEmail || '',
      barangayId: data.barangayId,
      verified: true,
      eventsCreatedCount: 0,
      acronym: data.acronym,
      category: data.category,
      scope: data.scope,
      activeProjectsCount: data.activeProjectsCount || 1,
    };
    this.data.organizations.push(o);
    this.save();
    return o;
  }

  // Family Groups
  public getFamilyGroup(userId: string): FamilyGroup | null {
    if (!this.data.familyGroups) this.data.familyGroups = INITIAL_FAMILY_GROUPS;
    return this.data.familyGroups.find(g => g.members?.some(m => m.userId === userId) || g.leaderUserId === userId) || null;
  }

  public createFamilyGroup(data: any, leaderUser: User): FamilyGroup {
    if (!this.data.familyGroups) this.data.familyGroups = INITIAL_FAMILY_GROUPS;
    const group: FamilyGroup = {
      id: `fam-${Date.now()}`,
      familyName: data.familyName || data.name || `${leaderUser.fullName}'s Household`,
      leaderUserId: leaderUser.id,
      barangayId: leaderUser.barangayId,
      barangayName: leaderUser.barangayName,
      members: [{
        userId: leaderUser.id,
        fullName: leaderUser.fullName,
        role: 'Leader',
        pointsContributed: leaderUser.ecoPoints || 0,
        avatarUrl: leaderUser.avatarUrl,
      }],
      monthlyTargetKg: 50,
      currentProgressKg: leaderUser.kgRecycled || 0,
      totalEcoPoints: leaderUser.ecoPoints || 0,
    };
    this.data.familyGroups.push(group);
    this.save();
    return group;
  }

  // Assets & Trees & Alerts
  public getAssets(barangayId?: string, category?: string): EnvironmentalAsset[] {
    if (!this.data.assets) this.data.assets = INITIAL_ASSETS;
    let list = this.data.assets;
    if (barangayId) list = list.filter(a => !a.barangayId || a.barangayId === barangayId);
    if (category) list = list.filter(a => a.category === category);
    return list;
  }

  public createAsset(data: any): EnvironmentalAsset {
    if (!this.data.assets) this.data.assets = INITIAL_ASSETS;
    const a: EnvironmentalAsset = {
      id: `asset-${Date.now()}`,
      name: data.name || '',
      category: data.category || 'Solar Installations',
      barangayId: data.barangayId || '',
      barangayName: data.barangayName || '',
      lat: data.lat || 14.58,
      lng: data.lng || 121.06,
      description: data.description || '',
    };
    this.data.assets.push(a);
    this.save();
    return a;
  }

  public getTrees(barangayId?: string): TreeItem[] {
    if (!this.data.trees) this.data.trees = INITIAL_TREES;
    let list = this.data.trees;
    if (barangayId) list = list.filter(t => !t.barangayId || t.barangayId === barangayId);
    return list;
  }

  public addTree(data: any): TreeItem {
    if (!this.data.trees) this.data.trees = INITIAL_TREES;
    const tree: TreeItem = {
      id: `tree-${Date.now()}`,
      species: data.species || 'Narra',
      barangayId: data.barangayId || '',
      barangayName: data.barangayName || '',
      lat: data.lat || 14.58,
      lng: data.lng || 121.06,
      datePlanted: data.datePlanted || data.plantedDate || new Date().toISOString().split('T')[0],
      condition: data.condition || 'Healthy',
      plantingOrg: data.plantingOrg || 'EcoBarangay Green Initiative',
      status: 'Active',
    };
    this.data.trees.push(tree);
    this.save();
    return tree;
  }

  public getAlerts(): EnvironmentalAlert[] {
    if (!this.data.alerts) this.data.alerts = INITIAL_ALERTS;
    return this.data.alerts;
  }

  public createAlert(data: any): EnvironmentalAlert {
    if (!this.data.alerts) this.data.alerts = INITIAL_ALERTS;
    const al: EnvironmentalAlert = {
      id: `alt-${Date.now()}`,
      title: data.title || '',
      description: data.description || data.message || '',
      category: data.category || 'Hazardous Waste Incident',
      targetScope: data.targetScope || 'Barangay',
      targetId: data.targetId || data.barangayId,
      severity: data.severity || 'Low',
      createdAt: new Date().toISOString(),
      active: true,
      authorName: data.authorName || 'CENRO Officer',
    };
    this.data.alerts.unshift(al);
    this.save();
    return al;
  }

  public getMostImprovedBarangays(): BarangayImprovement[] {
    if (!this.data.improvements) this.data.improvements = INITIAL_BARANGAY_IMPROVEMENTS;
    return this.data.improvements;
  }

  public getTransparencyMetrics(barangayId: string) {
    const brgy = this.getBarangayById(barangayId);
    const reports = this.getReports(barangayId);
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const facilities = this.getFacilities(barangayId);
    return {
      barangayId,
      barangayName: brgy?.name || 'Barangay',
      totalBudget: 2500000,
      fundsAllocatedWaste: 850000,
      fundsSpent: 620000,
      reportsTotal: reports.length,
      reportsResolved: resolved,
      reportsResolutionRate: reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 100,
      mrfCount: facilities.filter(f => f.category === 'mrf').length,
      complianceRateRA9003: 92,
    };
  }

  public addFacilityReview(facilityId: string, review: any) {
    const f = this.data.facilities.find(fac => fac.id === facilityId);
    if (f) {
      const newReview = {
        ...review,
        id: `rev-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      this.save();
      return f;
    }
    return null;
  }

  public updateFacilityStatus(facilityId: string, status: any) {
    const f = this.data.facilities.find(fac => fac.id === facilityId);
    if (f) {
      f.status = status;
      this.save();
      return f;
    }
    return null;
  }
}

export const dbStore = new DBStore();
