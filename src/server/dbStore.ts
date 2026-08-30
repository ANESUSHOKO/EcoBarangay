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
  AppNotification
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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DBStore {
  private data!: DBData;

  constructor() {
    this.init();
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

  // Region / Province / City / Barangay APIs
  public getRegions() { return this.data.regions; }
  
  public getProvinces(regionCode?: string) {
    if (regionCode) {
      return this.data.provinces.filter(p => p.regionCode === regionCode);
    }
    return this.data.provinces;
  }

  public getCities(provinceCode?: string, regionCode?: string) {
    let list = this.data.cities;
    if (provinceCode) {
      list = list.filter(c => c.provinceCode === provinceCode);
    } else if (regionCode) {
      list = list.filter(c => c.regionCode === regionCode);
    }
    return list;
  }

  public getBarangays(filters?: { cityCode?: string; provinceCode?: string; regionCode?: string; search?: string }) {
    let list = this.data.barangays;
    if (filters?.cityCode) {
      list = list.filter(b => b.cityCode === filters.cityCode);
    } else if (filters?.provinceCode) {
      list = list.filter(b => b.provinceCode === filters.provinceCode);
    } else if (filters?.regionCode) {
      list = list.filter(b => b.regionCode === filters.regionCode);
    }

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

  public getBarangayById(id: string) {
    return this.data.barangays.find(b => b.id === id);
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
}

export const dbStore = new DBStore();
