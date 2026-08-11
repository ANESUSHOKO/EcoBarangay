export type UserRole = 'RESIDENT' | 'BARANGAY_OFFICIAL' | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  barangayId: string;
  barangayName: string;
  city: string;
  province: string;
  region: string;
  phone?: string;
  ecoPoints: number;
  ecoScore: number; // 0 - 100
  kgRecycled: number;
  challengesCompleted: number;
  cleanupActivitiesCount: number;
  avatarUrl?: string;
  verifiedOfficial?: boolean;
  followingUserIds?: string[];
  followingPageIds?: string[];
  householdHeadName?: string;
  householdMembersCount?: number;
  householdAddress?: string;
  householdRegistered?: boolean;
  householdSegregationType?: string;
}

export interface SustainabilityScore {
  wasteManagement: number; // Max 25
  recycling: number; // Max 20
  communityParticipation: number; // Max 20
  reportsResolution: number; // Max 15
  cleanupActivities: number; // Max 10
  sustainabilityChallenges: number; // Max 5
  educationParticipation: number; // Max 5
  totalScore: number; // Sum 0 - 100
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Developing';
  nationalRank?: number;
  regionalRank?: number;
  cityRank?: number;
}

export interface Region {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  name: string;
  regionCode: string;
}

export interface City {
  code: string;
  name: string;
  provinceCode: string;
  regionCode: string;
  isNCR?: boolean;
  isIndependent?: boolean;
}

export interface Barangay {
  id: string;
  psgcCode: string;
  name: string;
  cityCode: string;
  cityName: string;
  provinceCode: string;
  provinceName: string;
  regionCode: string;
  regionName: string;
  lat: number;
  lng: number;
  population: number;
  totalUsers: number;
  score: SustainabilityScore;
  totalRecycledKg: number;
  totalReportsResolved: number;
  totalReportsReceived: number;
  mrfActive: boolean;
  garbageScheduleDays: string[];
}

export type FacilityCategory = 'recycling' | 'mrf' | 'junkshop' | 'ewaste' | 'composting';

export interface Facility {
  id: string;
  name: string;
  category: FacilityCategory;
  address: string;
  barangayId: string;
  barangayName: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  acceptedMaterials: string[];
  openingHours: string;
  contact: string;
  description: string;
  distanceKm?: number;
}

export type ReportCategory = 'Illegal Dumping' | 'Overflowing Bin' | 'Missed Collection' | 'Clogged Drainage' | 'Hazardous Waste';
export type ReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';

export interface EnvironmentalReport {
  id: string;
  category: ReportCategory;
  description: string;
  locationAddress: string;
  lat: number;
  lng: number;
  barangayId: string;
  barangayName: string;
  cityName: string;
  reporterId: string;
  reporterName: string;
  photoUrl?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  officialNotes?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  barangayId: string;
  barangayName: string;
  organizerName: string;
  category: 'Cleanup' | 'Tree Planting' | 'Workshop' | 'Recycling Drive';
  pointsAwarded: number;
  registeredUserIds: string[];
  maxParticipants: number;
  lat?: number;
  lng?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  durationDays: number;
  pointsAwarded: number;
  icon: string;
  joinedUserIds: string[];
  completedUserIds: string[];
}

export interface GarbageSchedule {
  id: string;
  barangayId: string;
  barangayName: string;
  dayOfWeek: string;
  timeSlot: string;
  wasteType: 'Biodegradable' | 'Non-Biodegradable' | 'Recyclable' | 'Bulk/E-Waste';
  instructions: string;
  truckNo?: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  type: 'Recycling' | 'Report' | 'Event' | 'Challenge' | 'Education';
  title: string;
  description: string;
  pointsEarned: number;
  kgRecycled?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  barangayId: string;
  barangayName: string;
  authorName: string;
  title: string;
  content: string;
  category: 'Urgent' | 'Garbage Schedule' | 'Community Event' | 'General';
  createdAt: string;
}

export type Language = 'en' | 'tl';

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface GovernmentPage {
  id: string;
  name: string;
  acronym: string;
  category: 'National Agency' | 'LGU Office' | 'Barangay Office' | 'Environmental NGO';
  description: string;
  avatarUrl: string;
  coverUrl?: string;
  verified: boolean;
  followersCount: number;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
  cityName?: string;
  barangayId?: string;
  barangayName?: string;
  website?: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  barangayId: string;
  barangayName: string;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
  cityName?: string;
  governmentPageId?: string;
  isGovernmentPost?: boolean;
  content: string;
  photoUrl?: string;
  wasteKg?: number;
  wasteType?: string;
  likes: string[];
  comments: FeedComment[];
  sharesCount: number;
  createdAt: string;
}

export interface GlobalSearchResults {
  barangays: Barangay[];
  facilities: Facility[];
  events: Event[];
}

export interface AppNotification {
  id: string;
  type: 'EVENT_SIGNUP' | 'REPORT_UPDATE' | 'RANKING_CHANGE' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  barangayId?: string;
  barangayName?: string;
  targetTab?: string;
  linkId?: string;
}
