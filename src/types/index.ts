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
  passwordHash?: string;
  phone?: string;
  ecoPoints: number;
  ecoScore: number; // 0 - 100
  kgRecycled: number;
  challengesCompleted: number;
  cleanupActivitiesCount: number;
  avatarUrl?: string;
  photoUrl?: string;
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
  status?: FacilityStatus;
  reviews?: FacilityReview[];
}

export type ReportCategory =
  | 'Illegal Dumping'
  | 'Overflowing Bin'
  | 'Missed Collection'
  | 'Clogged Drainage'
  | 'Hazardous Waste'
  | 'Open Burning (Siga)'
  | 'Plastic Pollution'
  | 'Waterway Contamination'
  | 'Unsegregated Waste';

export type ReportUrgency = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';

export interface EnvironmentalReport {
  id: string;
  category: ReportCategory;
  description: string;
  locationAddress: string;
  landmark?: string;
  tags?: string[];
  urgency?: ReportUrgency;
  estimatedVolume?: string;
  lat: number;
  lng: number;
  barangayId: string;
  barangayName: string;
  cityName: string;
  reporterId: string;
  reporterName: string;
  reporterContact?: string;
  photoUrl?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionDescription?: string;
  resolutionDate?: string;
  officialAction?: string;
  officialNotes?: string;
  upvotesCount?: number;
  upvotedUserIds?: string[];
  reopenRequest?: {
    residentAnswer: 'YES' | 'NO';
    reason?: string;
    photoUrl?: string;
    requestedAt: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  };
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
  projects?: EcoProject[];
  businesses?: EcoBusiness[];
}

export interface AppNotification {
  id: string;
  type: 'SCHEDULE' | 'ANNOUNCEMENT' | 'ALERT' | 'EVENT_SIGNUP' | 'REPORT_UPDATE' | 'RANKING_CHANGE' | 'PROJECT_UPDATE';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  barangayId?: string;
  barangayName?: string;
  targetTab?: string;
  linkId?: string;
}

// ==================== NEW FEATURES TYPES ====================

export type ProjectStatus =
  | 'Proposed'
  | 'Under Review'
  | 'Voting'
  | 'Approved'
  | 'Planning'
  | 'In Progress'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export type ProjectCategory =
  | 'Recycling Station'
  | 'Community Garden'
  | 'Tree Planting'
  | 'Composting Facility'
  | 'Drainage Cleanup'
  | 'E-Waste Collection'
  | 'Public Bins'
  | 'Solar Installation'
  | 'Other';

export interface ProjectProgressUpdate {
  id: string;
  date: string;
  title: string;
  description: string;
  progressPercent: number;
  photoUrl?: string;
  authorName: string;
}

export interface ProjectFeedback {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  flagsCount?: number;
}

export interface EcoProject {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  barangayId: string;
  barangayName: string;
  cityName: string;
  suggestedByUserId: string;
  suggestedByName: string;
  votesCount: number;
  votedUserIds: string[];
  followersCount: number;
  followedUserIds: string[];
  progressPercent: number;
  targetCompletionDate?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  lat?: number;
  lng?: number;
  updates: ProjectProgressUpdate[];
  feedback: ProjectFeedback[];
  createdAt: string;
}

export interface CommunityPoll {
  id: string;
  barangayId: string;
  barangayName: string;
  title: string;
  description: string;
  options: { id: string; text: string; votesCount: number }[];
  votedUserIds: { userId: string; optionId: string }[];
  totalVotes: number;
  deadline: string;
  status: 'Active' | 'Closed';
  createdAt: string;
  createdByOfficialName: string;
}

export type AssetCategory =
  | 'Trees'
  | 'Community Gardens'
  | 'Recycling Stations'
  | 'Public Waste Bins'
  | 'Rainwater Systems'
  | 'Bike Parking'
  | 'Solar Installations'
  | 'Drainage Systems'
  | 'Green Spaces';

export interface EnvironmentalAsset {
  id: string;
  name: string;
  category: AssetCategory;
  barangayId: string;
  barangayName: string;
  lat: number;
  lng: number;
  description: string;
  photoUrl?: string;
  condition?: string;
  details?: string;
}

export type AlertSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';
export type AlertTargetScope = 'Barangay' | 'City' | 'Province' | 'Region' | 'Entire Philippines';

export interface EnvironmentalAlert {
  id: string;
  title: string;
  description: string;
  category: 'Flooding' | 'Chemical Spill' | 'Major Pollution' | 'Waste Facility Fire' | 'Water Contamination' | 'Hazardous Waste Incident';
  targetScope: AlertTargetScope;
  targetId?: string;
  targetName?: string;
  severity: AlertSeverity;
  createdAt: string;
  active: boolean;
  authorName: string;
}

export interface FacilityReview {
  id: string;
  facilityId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  ratingOverall: number; // 1 to 5
  ratingAccessibility: number;
  ratingHours: number;
  ratingMaterials: number;
  ratingCleanliness: number;
  comment: string;
  createdAt: string;
}

export type FacilityStatus =
  | 'Open'
  | 'Closed'
  | 'Temporarily Closed'
  | 'Under Maintenance'
  | 'Full Capacity'
  | 'Limited Materials';

export type BulkWasteType =
  | 'Large Recyclables'
  | 'Old Appliances'
  | 'Furniture'
  | 'E-Waste'
  | 'Bulk Cardboard'
  | 'Other';

export type BulkWasteStatus = 'Submitted' | 'Scheduled' | 'Collected' | 'Completed' | 'Cancelled';

export interface BulkWastePickupRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  barangayId: string;
  barangayName: string;
  wasteType: BulkWasteType;
  quantityDescription: string;
  photoUrl?: string;
  locationAddress: string;
  preferredPickupDate: string;
  notes?: string;
  status: BulkWasteStatus;
  scheduledDate?: string;
  createdAt: string;
}

export type BusinessCategory =
  | 'Refill Station'
  | 'Zero-Waste Store'
  | 'Recycling Service'
  | 'Repair Shop'
  | 'Second-Hand Store'
  | 'Sustainable Business';

export interface EcoBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  barangayId: string;
  barangayName: string;
  cityName: string;
  address: string;
  contactPhone: string;
  openingHours: string;
  services: string[];
  verified: boolean;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  rating?: number;
}

export interface PartnerOrganization {
  id: string;
  name: string;
  type: 'School' | 'NGO' | 'Community Organization';
  barangayId: string;
  barangayName: string;
  verified: boolean;
  description: string;
  contactEmail: string;
  logoUrl?: string;
  eventsCreatedCount: number;
}

export interface FamilyGroupMember {
  userId: string;
  fullName: string;
  role: 'Leader' | 'Member';
  pointsContributed: number;
  avatarUrl?: string;
}

export interface FamilyGroup {
  id: string;
  familyName: string;
  barangayId: string;
  barangayName: string;
  leaderUserId: string;
  members: FamilyGroupMember[];
  monthlyTargetKg: number;
  currentProgressKg: number;
  totalEcoPoints: number;
}

export interface TreeItem {
  id: string;
  species: string;
  barangayId: string;
  barangayName: string;
  lat: number;
  lng: number;
  datePlanted: string;
  condition: 'Healthy' | 'Needs Care' | 'Sapling' | 'Mature';
  photoUrl?: string;
  plantingOrg: string;
  status: 'Active' | 'Protected' | 'Relocated';
}

export interface BarangayImprovement {
  barangayId: string;
  barangayName: string;
  cityName: string;
  previousScore: number;
  currentScore: number;
  scoreImprovement: number;
  rankImprovement: number;
  timeframe: 'Monthly' | 'Quarterly' | 'Yearly';
}

export interface PersonalCalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string;
  time?: string;
  type:
    | 'Garbage Collection'
    | 'Recycling Schedule'
    | 'Cleanup Event'
    | 'Challenge Deadline'
    | 'Project Event'
    | 'Personal Reminder';
  description?: string;
  isCustom: boolean;
}

