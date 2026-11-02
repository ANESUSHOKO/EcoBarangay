import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  User,
  Barangay,
  Facility,
  EnvironmentalReport,
  OfficialPhotoReview,
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
import { canTransitionReportStatus, findPotentialDuplicateReports } from './reportWorkflow';
import {
  INITIAL_REGIONS,
  INITIAL_PROVINCES,
  INITIAL_CITIES,
  INITIAL_BARANGAYS,
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
const FIRESTORE_COLLECTIONS: Array<{ name: keyof DBData; idField: 'id' | 'code' }> = [
  { name: 'regions', idField: 'code' },
  { name: 'provinces', idField: 'code' },
  { name: 'cities', idField: 'code' },
  { name: 'barangays', idField: 'id' },
  { name: 'users', idField: 'id' },
  { name: 'governmentPages', idField: 'id' },
  { name: 'facilities', idField: 'id' },
  { name: 'reports', idField: 'id' },
  { name: 'events', idField: 'id' },
  { name: 'challenges', idField: 'id' },
  { name: 'schedules', idField: 'id' },
  { name: 'activityLogs', idField: 'id' },
  { name: 'announcements', idField: 'id' },
  { name: 'feedPosts', idField: 'id' },
  { name: 'notifications', idField: 'id' },
  { name: 'calendarEvents', idField: 'id' },
  { name: 'bulkPickups', idField: 'id' },
  { name: 'businesses', idField: 'id' },
  { name: 'organizations', idField: 'id' },
  { name: 'familyGroups', idField: 'id' },
  { name: 'assets', idField: 'id' },
  { name: 'trees', idField: 'id' },
  { name: 'alerts', idField: 'id' },
  { name: 'improvements', idField: 'id' },
];

type StoredRecord = Record<string, unknown>;
type StoredDocument = { collection: string; id: string; value: StoredRecord; serialized: string };

class DBStore {
  private data!: DBData;
  private readonly readyPromise: Promise<void>;
  private firestoreRevision = 0;
  private persistedDocuments = new Map<string, string>();
  private writeQueue: Promise<void> = Promise.resolve();
  private persistenceError: unknown = null;
  private psgcRegions: Region[] | null = null;
  private psgcProvinces: Province[] | null = null;
  private psgcCities: City[] | null = null;
  private psgcBarangaysByCity: Record<string, any[]> | null = null;
  private psgcAllBarangays: any[] | null = null;

  constructor() {
    this.data = this.createDefaultData();
    this.loadPsgcData();
    this.readyPromise = this.initializeFromFirestore();
  }

  public async ready() {
    await this.readyPromise;
  }

  public async refreshIfStale() {
    await this.writeQueue;
    if (!firestoreDb) throw new Error('Firebase Admin Firestore is not configured.');

    const stateRef = firestoreDb.collection('_metadata').doc('appState');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const stateSnapshot = await stateRef.get();
      const revision = Number(stateSnapshot.get('revision') || 0);
      if (revision === this.firestoreRevision) {
        if (this.persistenceError) {
          this.save();
          await this.flush();
        }
        return;
      }

      const collectionSnapshots = await Promise.all(
        FIRESTORE_COLLECTIONS.map(collection => firestoreDb!.collection(collection.name).get())
      );
      const latestState = await stateRef.get();
      if (Number(latestState.get('revision') || 0) !== revision) continue;

      const loadedData = this.createDefaultData();
      for (const [index, collection] of FIRESTORE_COLLECTIONS.entries()) {
        const records = collectionSnapshots[index].docs.map(document => {
          const value = document.data() as StoredRecord;
          if (typeof value[collection.idField] !== 'string') {
            value[collection.idField] = document.id;
          }
          return value;
        });
        Object.assign(loadedData, { [collection.name]: records });
      }

      this.data = loadedData;
      this.firestoreRevision = revision;
      this.persistedDocuments = new Map(
        Array.from(this.collectDocuments(loadedData), ([documentPath, document]) => [
          documentPath,
          document.serialized,
        ])
      );
      this.persistenceError = null;
      return;
    }

    throw new Error('Firestore changed repeatedly while reloading application data.');
  }

  public async flush() {
    await this.writeQueue;
    if (this.persistenceError) {
      throw new Error('Firestore could not persist the requested change.', { cause: this.persistenceError });
    }
  }

  private createDefaultData(): DBData {
    return JSON.parse(JSON.stringify({
      regions: INITIAL_REGIONS,
      provinces: INITIAL_PROVINCES,
      cities: INITIAL_CITIES,
      barangays: INITIAL_BARANGAYS,
      users: [],
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
    })) as DBData;
  }

  private readLegacyData(): Record<string, unknown> | null {
    if (!fs.existsSync(DB_FILE)) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The legacy data/db.json file is not a valid data object.');
    }
    return parsed as Record<string, unknown>;
  }

  private async initializeFromFirestore() {
    if (!firestoreDb) {
      throw new Error('Firebase Admin Firestore is required; configure Application Default Credentials.');
    }

    const stateRef = firestoreDb.collection('_metadata').doc('appState');
    const [stateSnapshot, ...collectionSnapshots] = await Promise.all([
      stateRef.get(),
      ...FIRESTORE_COLLECTIONS.map(collection => firestoreDb!.collection(collection.name).get()),
    ]);
    const isMigrated = stateSnapshot.exists && stateSnapshot.get('schemaVersion') === 1;
    this.firestoreRevision = Number(stateSnapshot.get('revision') || 0);
    const legacyData = isMigrated ? null : this.readLegacyData();
    const loadedData = this.createDefaultData();

    for (const [index, collection] of FIRESTORE_COLLECTIONS.entries()) {
      const snapshot = collectionSnapshots[index];
      if (!snapshot.empty) {
        const records = snapshot.docs.map(document => {
          const value = document.data() as StoredRecord;
          if (typeof value[collection.idField] !== 'string') {
            value[collection.idField] = document.id;
          }
          return value;
        });
        Object.assign(loadedData, { [collection.name]: records });
        for (const document of snapshot.docs) {
          const value = document.data() as StoredRecord;
          if (typeof value[collection.idField] !== 'string') value[collection.idField] = document.id;
          this.persistedDocuments.set(`${collection.name}/${document.id}`, JSON.stringify(value));
        }
        continue;
      }

      const legacyRecords = legacyData?.[collection.name];
      if (!isMigrated && Array.isArray(legacyRecords) && legacyRecords.length > 0) {
        Object.assign(loadedData, { [collection.name]: legacyRecords });
      } else if (isMigrated || collection.name === 'users') {
        Object.assign(loadedData, { [collection.name]: [] });
      }
    }

    this.data = loadedData;
    this.recalculateRanks();
    await this.persistSnapshot(this.cloneData(this.data), !isMigrated);
    console.log(`[dbStore] Firestore ready at revision ${this.firestoreRevision}.`);
  }

  private cloneData(data: DBData): DBData {
    return JSON.parse(JSON.stringify(data)) as DBData;
  }

  private collectDocuments(data: DBData): Map<string, StoredDocument> {
    const documents = new Map<string, StoredDocument>();
    for (const collection of FIRESTORE_COLLECTIONS) {
      const records = (data[collection.name] || []) as unknown as StoredRecord[];
      for (const record of records) {
        const id = record[collection.idField];
        if (typeof id !== 'string' || !id) {
          throw new Error(`A record in ${collection.name} is missing its ${collection.idField}.`);
        }
        const serialized = JSON.stringify(record);
        const documentPath = `${collection.name}/${id}`;
        if (documents.has(documentPath)) {
          throw new Error(`Duplicate document ID "${id}" in ${collection.name}.`);
        }
        documents.set(documentPath, {
          collection: collection.name,
          id,
          value: JSON.parse(serialized) as StoredRecord,
          serialized,
        });
      }
    }
    return documents;
  }

  private async persistSnapshot(snapshot: DBData, forceStateWrite = false) {
    if (!firestoreDb) throw new Error('Firebase Admin Firestore is not configured.');

    const currentDocuments = this.collectDocuments(snapshot);
    const operations: Array<{ path: string; document?: StoredDocument }> = [];
    for (const [documentPath, document] of currentDocuments) {
      if (this.persistedDocuments.get(documentPath) !== document.serialized) {
        operations.push({ path: documentPath, document });
      }
    }
    for (const documentPath of this.persistedDocuments.keys()) {
      if (!currentDocuments.has(documentPath)) operations.push({ path: documentPath });
    }

    if (!operations.length && !forceStateWrite) return;
    if (operations.length > 499) {
      throw new Error('This Firestore update exceeds the 499-record transaction limit.');
    }

    const stateRef = firestoreDb.collection('_metadata').doc('appState');
    await firestoreDb.runTransaction(async transaction => {
      const stateSnapshot = await transaction.get(stateRef);
      const currentRevision = Number(stateSnapshot.get('revision') || 0);
      if (currentRevision !== this.firestoreRevision) {
        throw new Error('Firestore changed during this request; retry after the application reloads its state.');
      }

      for (const operation of operations) {
        const [collection, id] = operation.path.split('/');
        const reference = firestoreDb!.collection(collection).doc(id);
        if (operation.document) {
          transaction.set(reference, operation.document.value);
        } else {
          transaction.delete(reference);
        }
      }
      transaction.set(stateRef, {
        schemaVersion: 1,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
      });
    });

    this.persistedDocuments = new Map(
      Array.from(currentDocuments, ([documentPath, document]) => [documentPath, document.serialized])
    );
    this.firestoreRevision += 1;
    this.persistenceError = null;
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

  private save() {
    const snapshot = this.cloneData(this.data);
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(() => this.persistSnapshot(snapshot))
      .catch(error => {
        this.persistenceError = error;
        console.error('[dbStore] Firestore write failed:', error);
      });
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
      ecoPoints: 0,
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
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const user = this.getUserById(id);
    if (user) {
      Object.assign(user, updates);
      this.save();
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
    const now = new Date();
    const id = `rep-${randomUUID()}`;
    const newReport: EnvironmentalReport = {
      ...data,
      id,
      trackingNumber: `EB-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'Pending',
      createdAt: now.toISOString(),
      statusHistory: [{
        status: 'Pending',
        changedAt: now.toISOString(),
        changedBy: data.reporterId,
      }],
      possibleDuplicateIds: findPotentialDuplicateReports(data, this.data.reports, now)
        .map(report => report.id),
    };
    this.data.reports.push(newReport);

    // Update barangay stats
    const brgy = this.getBarangayById(data.barangayId);
    if (brgy) {
      brgy.totalReportsReceived += 1;
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

  public updateReportStatus(
    id: string,
    status: EnvironmentalReport['status'],
    notes: string | undefined,
    officialId: string,
    evidenceUrl?: string,
    assignedTeam?: string,
  ) {
    const report = this.data.reports.find(r => r.id === id);
    if (report) {
      if (report.status === status) return report;
      if (!canTransitionReportStatus(
        report.status,
        status,
        report.reopenRequest?.status === 'Pending',
      )) return null;

      const now = new Date().toISOString();
      report.status = status;
      if (status === 'Assigned' && assignedTeam) report.assignedTeam = assignedTeam.trim();
      if (report.reopenRequest?.status === 'Pending' && status === 'In Progress') {
        report.reopenRequest.status = 'Approved';
      }
      if (notes?.trim()) {
        report.officialNotes = notes.trim();
        report.resolutionDescription = notes.trim();
      }
      if (evidenceUrl) report.afterPhotoUrl = evidenceUrl;
      if (!report.statusHistory) report.statusHistory = [];
      report.statusHistory.push({
        status,
        changedAt: now,
        changedBy: officialId,
        notes: notes?.trim() || undefined,
        evidenceUrl,
        assignedTeam: status === 'Assigned' ? assignedTeam?.trim() : undefined,
      });

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
        report.resolvedAt = now;
        report.resolutionDate = now;
        const reporter = this.getUserById(report.reporterId);
        if (reporter) {
          reporter.ecoPoints += 30;
          this.addActivityLog({
            userId: reporter.id,
            type: 'Report',
            title: `Verified ${report.category} report`,
            description: report.description,
            pointsEarned: 30,
            verificationStatus: 'Verified',
            verifiedBy: officialId,
            verifiedAt: now,
            sourceId: report.id,
          });
        }
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

  public submitReportFeedback(
    reportId: string,
    reporterId: string,
    rating: number,
    comment?: string,
    reopenReason?: string,
  ) {
    const report = this.data.reports.find(item => item.id === reportId);
    if (!report || report.reporterId !== reporterId || report.status !== 'Resolved' || report.resolutionFeedback) {
      return null;
    }

    const submittedAt = new Date().toISOString();
    report.resolutionFeedback = { rating, comment, submittedAt };
    if (reopenReason) {
      report.reopenRequest = {
        residentAnswer: 'YES',
        reason: reopenReason,
        requestedAt: submittedAt,
        status: 'Pending',
      };
    }
    this.createNotification({
      type: 'REPORT_UPDATE',
      title: reopenReason ? 'Report Reopen Requested' : 'Resolution Feedback Received',
      message: reopenReason
        ? `The resident requested another review of report ${report.trackingNumber || report.id}.`
        : `The resident provided feedback on report ${report.trackingNumber || report.id}.`,
      barangayId: report.barangayId,
      barangayName: report.barangayName,
      targetTab: 'reports',
      linkId: report.id,
    });
    this.save();
    return report;
  }

  public decideReportReopenRequest(
    reportId: string,
    officialId: string,
    decision: 'Approved' | 'Rejected',
    notes: string,
  ) {
    const report = this.data.reports.find(item => item.id === reportId);
    if (!report || report.status !== 'Resolved' || report.reopenRequest?.status !== 'Pending') return null;
    if (decision === 'Approved') {
      return this.updateReportStatus(reportId, 'In Progress', notes, officialId);
    }

    const changedAt = new Date().toISOString();
    report.reopenRequest.status = 'Rejected';
    if (!report.statusHistory) report.statusHistory = [];
    report.statusHistory.push({
      status: 'Resolved',
      changedAt,
      changedBy: officialId,
      notes: notes.trim(),
      action: 'Reopen request rejected',
    });
    this.createNotification({
      type: 'REPORT_UPDATE',
      title: 'Reopen request declined',
      message: `The barangay reviewed your reopen request for ${report.trackingNumber || report.id}.`,
      barangayId: report.barangayId,
      barangayName: report.barangayName,
      recipientUserId: report.reporterId,
      targetTab: 'reports',
      linkId: report.id,
    });
    this.save();
    return report;
  }

  public reviewReportPhotoSuggestion(
    reportId: string,
    officialId: string,
    decision: OfficialPhotoReview['decision'],
    correctedCategory?: EnvironmentalReport['category'],
    notes?: string,
  ) {
    const report = this.data.reports.find(item => item.id === reportId);
    if (!report?.photoAssessment) return null;
    report.photoAssessment.officialReview = {
      decision,
      correctedCategory: decision === 'Corrected' ? correctedCategory : undefined,
      notes: notes?.trim() || undefined,
      reviewedBy: officialId,
      reviewedAt: new Date().toISOString(),
    };
    this.save();
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

    this.save();
    return newEvent;
  }

  public joinEvent(eventId: string, userId: string) {
    const event = this.data.events.find(e => e.id === eventId);
    if (event && !event.registeredUserIds.includes(userId)) {
      event.registeredUserIds.push(userId);
      const user = this.getUserById(userId);
      if (user) {
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

  public createSchedule(data: Omit<GarbageSchedule, 'id' | 'history'>, officialId: string) {
    const now = new Date().toISOString();
    const newSch: GarbageSchedule = {
      ...data,
      id: `sch-${randomUUID()}`,
      active: true,
      history: [{
        changedAt: now,
        changedBy: officialId,
        changedFields: ['created'],
        previousValues: {},
      }],
    };
    this.data.schedules.push(newSch);
    this.createNotification({
      type: 'SCHEDULE',
      title: 'Waste collection schedule updated',
      message: `A ${newSch.wasteType} collection schedule was published for ${newSch.dayOfWeek}.`,
      barangayId: newSch.barangayId,
      barangayName: newSch.barangayName,
      targetTab: 'schedule',
      linkId: newSch.id,
    });
    this.save();
    return newSch;
  }

  public updateSchedule(
    id: string,
    updates: Partial<Pick<GarbageSchedule, 'dayOfWeek' | 'timeSlot' | 'wasteType' | 'instructions' | 'truckNo' | 'zoneId' | 'zonesCovered' | 'collectionTeam' | 'vehicleNumber' | 'active'>>,
    officialId: string,
  ) {
    const schedule = this.data.schedules.find(item => item.id === id);
    if (!schedule) return null;

    const changedFields = Object.keys(updates).filter(key =>
      updates[key as keyof typeof updates] !== undefined &&
      updates[key as keyof typeof updates] !== schedule[key as keyof typeof updates]
    );
    if (changedFields.length === 0) return schedule;

    const previousValues: NonNullable<GarbageSchedule['history']>[number]['previousValues'] = {};
    for (const key of changedFields) {
      Object.assign(previousValues, { [key]: schedule[key as keyof GarbageSchedule] });
    }
    Object.assign(schedule, updates);
    if (!schedule.history) schedule.history = [];
    schedule.history.push({
      changedAt: new Date().toISOString(),
      changedBy: officialId,
      changedFields,
      previousValues,
    });
    this.createNotification({
      type: 'SCHEDULE',
      title: 'Waste collection schedule changed',
      message: `${schedule.wasteType} collection on ${schedule.dayOfWeek} was updated. Check the latest schedule details.`,
      barangayId: schedule.barangayId,
      barangayName: schedule.barangayName,
      targetTab: 'schedule',
      linkId: schedule.id,
    });
    this.save();
    return schedule;
  }

  // Recycling log
  public logWasteRecycled(userId: string, kg: number, wasteType: string, photoUrl?: string, autoPostToFeed?: boolean) {
    const user = this.getUserById(userId);
    if (user) {
      this.addActivityLog({
        userId,
        type: 'Recycling',
        title: `Submitted ${kg} kg of ${wasteType} for verification`,
        description: 'Points and recycling totals are updated after an official verifies the activity.',
        pointsEarned: 0,
        kgRecycled: kg,
        photoUrl,
        verificationStatus: 'Pending',
      });

      if (autoPostToFeed) {
        this.createFeedPost({
          authorId: user.id,
          authorName: user.fullName,
          authorAvatar: user.avatarUrl,
          authorRole: user.role,
          barangayId: user.barangayId,
          barangayName: user.barangayName,
          content: `I submitted ${kg} kg of ${wasteType} for recycling verification! ♻️`,
          photoUrl,
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

  public getPendingEcoActivities(barangayId: string) {
    return this.data.activityLogs.filter(log => {
      if (!['Recycling', 'Education'].includes(log.type) || log.verificationStatus !== 'Pending') return false;
      return this.getUserById(log.userId)?.barangayId === barangayId;
    });
  }

  public submitSegregationQuiz(userId: string) {
    const sourceId = 'segregation-quiz-v1';
    const alreadySubmitted = this.data.activityLogs.some(log => log.userId === userId && log.sourceId === sourceId);
    if (alreadySubmitted) return null;
    return this.addActivityLog({
      userId,
      type: 'Education',
      title: 'Passed the waste segregation quiz',
      description: 'Quiz score passed the server-side answer check; an official must approve the points.',
      pointsEarned: 0,
      verificationStatus: 'Pending',
      sourceId,
    });
  }

  public reviewEcoActivity(
    activityId: string,
    officialId: string,
    status: 'Verified' | 'Rejected',
    pointsAwarded: number,
    notes: string,
  ) {
    const activity = this.data.activityLogs.find(log => log.id === activityId);
    if (!activity || !['Recycling', 'Education'].includes(activity.type) || activity.verificationStatus !== 'Pending') return null;
    const resident = this.getUserById(activity.userId);
    if (!resident) return null;

    activity.verificationStatus = status;
    activity.verifiedBy = officialId;
    activity.verifiedAt = new Date().toISOString();
    activity.verificationNotes = notes.trim();
    activity.pointsEarned = status === 'Verified' ? pointsAwarded : 0;
    if (status === 'Verified') {
      resident.ecoPoints += pointsAwarded;
      if (activity.type === 'Recycling') {
        resident.kgRecycled += activity.kgRecycled || 0;
        const barangay = this.getBarangayById(resident.barangayId);
        if (barangay) {
          barangay.totalRecycledKg += activity.kgRecycled || 0;
        }
      }
    }

    const activityLabel = activity.type === 'Recycling' ? 'Recycling activity' : 'Education activity';
    this.createNotification({
      type: 'REPORT_UPDATE',
      title: `${activityLabel} ${status === 'Verified' ? 'verified' : 'not verified'}`,
      message: activity.type === 'Recycling'
        ? `Your ${activity.kgRecycled || 0} kg recycling submission was ${status.toLowerCase()}${status === 'Verified' ? ` with ${pointsAwarded} Eco Points` : ''}.`
        : `Your waste segregation quiz was ${status.toLowerCase()}${status === 'Verified' ? ` with ${pointsAwarded} Eco Points` : ''}.`,
      barangayId: resident.barangayId,
      barangayName: resident.barangayName,
      recipientUserId: resident.id,
      targetTab: 'dashboard',
      linkId: activity.id,
    });
    this.save();
    return activity;
  }

  public addActivityLog(data: Omit<UserActivityLog, 'id' | 'createdAt'>) {
    const log: UserActivityLog = {
      ...data,
      id: `act-${randomUUID()}`,
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
  public getNotifications(barangayId?: string, userId?: string) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    let list = this.data.notifications;
    if (barangayId) {
      list = list.filter(n => !n.barangayId || n.barangayId === barangayId);
    }
    list = list.filter(notification => !notification.recipientUserId || notification.recipientUserId === userId);
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

  public markAllNotificationsAsRead(barangayId?: string, userId?: string) {
    if (!this.data.notifications) {
      this.data.notifications = INITIAL_NOTIFICATIONS;
    }
    this.data.notifications.forEach(n => {
      if ((!barangayId || n.barangayId === barangayId) &&
          (!n.recipientUserId || n.recipientUserId === userId)) {
        n.read = true;
      }
    });
    this.save();
    return true;
  }

  // System statistics summary for landing page
  public getStatsSummary() {
    const totalResidents = this.data.users.filter(user => user.role === 'RESIDENT').length;
    const participatingBarangays = new Set(this.data.users.map(user => user.barangayId)).size;
    const totalRecycled = this.data.barangays.reduce((acc, b) => acc + b.totalRecycledKg, 0);
    const totalCleanups = this.data.events.filter(e => e.category === 'Cleanup').length;
    const totalResolvedReports = this.data.reports.filter(r => r.status === 'Resolved').length;

    return {
      registeredResidents: totalResidents,
      participatingBarangays,
      wasteRecycledKg: Math.round(totalRecycled),
      cleanupActivities: totalCleanups,
      reportsResolved: totalResolvedReports,
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

  public createBulkPickup(
    data: Omit<BulkWastePickupRequest, 'id' | 'trackingNumber' | 'status' | 'statusHistory' | 'createdAt'>,
  ): BulkWastePickupRequest {
    if (!this.data.bulkPickups) this.data.bulkPickups = INITIAL_BULK_PICKUPS;
    const now = new Date();
    const createdAt = now.toISOString();
    const newReq: BulkWastePickupRequest = {
      ...data,
      id: `bulk-${randomUUID()}`,
      trackingNumber: `BP-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      photoUrl: data.photoUrl,
      status: 'Submitted',
      statusHistory: [{
        status: 'Submitted',
        changedAt: createdAt,
        changedBy: data.userId,
      }],
      createdAt,
    };
    this.data.bulkPickups.unshift(newReq);
    this.createNotification({
      type: 'SCHEDULE',
      title: 'Bulk pickup request submitted',
      message: `Bulk pickup ${newReq.trackingNumber} is awaiting barangay scheduling.`,
      barangayId: newReq.barangayId,
      barangayName: newReq.barangayName,
      targetTab: 'schedule',
      linkId: newReq.id,
    });
    this.save();
    return newReq;
  }

  public updateBulkPickupStatus(
    id: string,
    status: BulkWasteStatus,
    scheduledDate: string | undefined,
    changedBy: string,
    notes?: string,
    collectionTeam?: string,
    vehicleNumber?: string,
  ): BulkWastePickupRequest | null {
    if (!this.data.bulkPickups) this.data.bulkPickups = INITIAL_BULK_PICKUPS;
    const req = this.data.bulkPickups.find(b => b.id === id);
    if (req) {
      const transitions: Record<BulkWasteStatus, BulkWasteStatus[]> = {
        Submitted: ['Scheduled', 'Cancelled'],
        Scheduled: ['Missed', 'Collected', 'Cancelled'],
        Missed: ['Scheduled', 'Cancelled'],
        Collected: ['Completed'],
        Completed: [],
        Cancelled: [],
      };
      if (req.status === status) return req;
      if (!transitions[req.status].includes(status)) return null;
      if (status === 'Scheduled' && !scheduledDate) return null;
      req.status = status;
      if (scheduledDate) req.scheduledDate = scheduledDate;
      if (collectionTeam) req.collectionTeam = collectionTeam;
      if (vehicleNumber) req.vehicleNumber = vehicleNumber;
      const changedAt = new Date().toISOString();
      if (!req.statusHistory) req.statusHistory = [];
      req.statusHistory.push({
        status,
        changedAt,
        changedBy,
        notes: notes?.trim() || undefined,
        collectionTeam,
        vehicleNumber,
      });
      this.createNotification({
        type: 'SCHEDULE',
        title: `Bulk pickup ${status.toLowerCase()}`,
        message: `Bulk pickup ${req.trackingNumber || req.id} is now ${status.toLowerCase()}${scheduledDate ? ` for ${scheduledDate}` : ''}.`,
        barangayId: req.barangayId,
        barangayName: req.barangayName,
        targetTab: 'schedule',
        linkId: req.id,
      });
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
      totalBudget: null,
      fundsAllocatedWaste: null,
      fundsSpent: null,
      reportsTotal: reports.length,
      reportsResolved: resolved,
      reportsResolutionRate: reports.length > 0 ? Math.round((resolved / reports.length) * 100) : null,
      mrfCount: facilities.filter(f => f.category === 'mrf').length,
      complianceRateRA9003: null,
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
