import { Language } from '../types';

export const translations = {
  en: {
    // Navigation & Common
    navHome: 'Home',
    navFeed: 'Community Feed',
    navMap: 'Eco-Map',
    navRankings: 'Leaderboard',
    navReports: 'Reports',
    navEvents: 'Events & Challenges',
    navSchedule: 'Garbage Schedule',
    navDashboard: 'Dashboard',
    navSignIn: 'Sign In / Register',
    navSignOut: 'Sign Out',
    navSearchPlaceholder: 'Search barangays, recycling hubs, events...',
    guideButton: 'RA 9003 Guide',
    selectBarangay: 'Select Barangay',

    // Mobile Navigation & Drawer
    mobileMenuTitle: 'Barangay Services & Navigation',
    mobileQuickActions: 'Quick Actions',
    mobileChangeBarangay: 'Change Barangay',
    mobileMoreTabs: 'More Eco Services',

    // Notifications Bell
    notificationsHeading: 'Barangay Alerts & Notifications',
    notificationsEmpty: 'No new notifications right now.',
    notificationsMarkAllRead: 'Mark all as read',
    notificationsAll: 'All Alerts',
    notificationsUnread: 'Unread',
    notifFilterEvent: 'Event Sign-ups',
    notifFilterReport: 'Report Updates',
    notifFilterRanking: 'Barangay Rankings',
    notifView: 'View Details',
    notifNewBadge: 'NEW',

    // Global Search Modal/Dropdown
    searchHeadingBarangays: 'Barangays',
    searchHeadingFacilities: 'Recycling Facilities & MRFs',
    searchHeadingEvents: 'Community Events',
    noSearchResults: 'No matching barangays, facilities, or events found.',

    // Common Actions
    logWaste: 'Log Recycled Waste',
    snapPhoto: 'Snap / Upload Photo',
    postUpdate: 'Post Update',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    joined: 'Joined',
    joinEvent: 'Join Event',
    submitReport: 'Submit Report',
    viewOnMap: 'View on Map',
    myBarangay: 'My Barangay',
    allPhilippines: 'All Philippines',

    // Home Page Hero & Stats
    heroNetwork: 'Philippine Community Sustainability Network',
    heroTitle: 'Clean Barangay,',
    heroTitleHighlight: 'Higher Ranking.',
    heroSubtitle: 'Empowering Filipino households, LGUs, and barangay officials to properly segregate waste, find nearby recycling hubs, report illegal dumping, and elevate their local community score.',
    exploreMapBtn: 'Explore Eco Map',
    leaderboardBtn: 'National Barangay Leaderboard',
    ra9003Badge: 'Compliant with Republic Act 9003 (Ecological Solid Waste Management)',
    liveNationalImpact: 'Live National Impact',
    verifiedCommunityStats: 'Verified community statistics across the Philippines',
    wasteRecycledLabel: 'Waste Recycled',
    activeBarangaysLabel: 'Active Barangays',
    reportsResolvedLabel: 'Dumping Reports Resolved',
    residentMembersLabel: 'Resident Members',
    isYourBarangayReg: 'Is your barangay registered?',
    checkStatus: 'Check Status',

    // Home Showcase & Features
    honorRollBadge: 'National Sustainability Honor Roll',
    topBarangaysHeading: 'Top Cleanest Barangays in the Philippines',
    topBarangaysSub: 'Rankings calculated using normalized 100-point formula accounting for population density.',
    viewAllRankings: 'View All National Rankings',
    totalScoreLabel: 'Total Score',
    recycledLabel: 'Recycled',
    exploreBarangayProfile: 'Explore Barangay Profile',
    howItWorksHeading: 'How EcoBarangay Works for You',
    howItWorksSub: 'Comprehensive tools built specifically for Philippine environmental laws and community needs.',
    featMapTitle: 'Interactive Recycling Directory',
    featMapDesc: 'Locate nearby Materials Recovery Facilities (MRFs), junk shops, e-waste drop-off bins, and composting hubs with GPS navigation.',
    featScheduleTitle: 'Garbage Collection Timetables',
    featScheduleDesc: 'Never miss pickup day. View your barangay specific schedule for Biodegradable, Non-Biodegradable, and Recyclables.',
    featReportsTitle: 'Environmental Problem Reporting',
    featReportsDesc: 'Report illegal dumping or uncollected waste. Track status updates as barangay officials resolve your report.',

    // Feed Page
    feedTitle: 'Barangay Eco Social Feed',
    feedSubtitle: 'Connect, share photos of recycled waste, join community cleanups, and inspire green habits!',
    whatsOnYourMind: 'Share your eco progress or snap a picture...',
    attachPhoto: 'Attach Photo',
    postButton: 'Post',
    recyclingMilestone: 'Recycling Milestone',
    commentsCount: 'Comments',
    writeCommentPlaceholder: 'Write a comment...',
    shareSuccessToast: 'Link copied! Shared with community.',
    tabFollowing: 'Following',
    tabGovPages: 'Government & Official Pages',
    filterAreaScope: 'Feed Location Scope',
    chooseFeedArea: 'Choose Area for Feed',
    allNationalFeed: 'National Feed (All PH)',
    followBtn: 'Follow',
    followingBtn: 'Following',
    unfollowBtn: 'Unfollow',
    followersLabel: 'followers',
    discoverPagesHeading: 'Official Government Pages & Eco Leaders',
    discoverPagesSub: 'Follow government agencies, LGUs, and barangay officials to personalize your feed with official notices and environmental updates.',

    // Resident Dashboard & Waste Logging
    myEcoStats: 'My Eco Stats',
    totalRecycled: 'Total Recycled',
    ecoPoints: 'Eco Points',
    nationalRank: 'National Rank',
    selectWasteType: 'Select Waste Type',
    amountInKg: 'Amount (in kg)',
    photoEvidence: 'Photo Evidence (Snap or Upload)',
    cameraPresetOption: 'Quick Eco Snap Presets',
    shareToFeedOption: 'Auto-share this achievement to the Community Feed',
    logSuccessMsg: 'Waste logged successfully! You earned +',
    points: 'points',
    quickLogTitle: 'Log Recycled Waste',

    // Official & Admin Dashboards
    officialDashTitle: 'Barangay Official Control Center',
    officialDashSub: 'Manage waste collection schedules, resolve citizen dumping reports, and review Barangay Eco Scores.',
    adminDashTitle: 'DENR & LGU System Administrator',
    adminDashSub: 'Nationwide oversight, LGU verification, scoring audit logs, and environmental analytics.',
    resolveReport: 'Mark as Resolved',
    inProgressReport: 'Set to In Progress',
    pendingReport: 'Pending',

    // Eco Map Page
    mapHeading: 'Philippine Eco Directory & Recycling Map',
    mapSub: 'Find nearby Materials Recovery Facilities (MRFs), drop-off hubs, and junk shops.',
    searchFacilityPlaceholder: 'Search facility name or category...',
    allCategories: 'All Categories',
    mrfCategory: 'MRF Facility',
    junkshopCategory: 'Junk Shop',
    dropoffCategory: 'E-Waste Dropoff',
    compostCategory: 'Composting Hub',

    // Leaderboard & Rankings
    rankingsHeading: 'National Barangay Eco Score Leaderboard',
    rankingsSub: 'Transparent, normalized scoring system for all barangays in the Philippines.',
    allTiers: 'All Tiers',
    platinumTier: 'Platinum',
    goldTier: 'Gold',
    silverTier: 'Silver',
    bronzeTier: 'Bronze',
    tierLabel: 'Tier',
    scoreBreakdown: 'Score Breakdown',

    // Reports Page
    reportsHeading: 'Environmental Violation & Dumping Reports',
    reportsSub: 'Help keep our community clean by reporting illegal waste dumping, uncollected trash, or blocked waterways.',
    createNewReport: 'Report an Environmental Issue',
    reportCategoryLabel: 'Violation Category',
    locationAddressLabel: 'Location Address / Landmark',
    descriptionLabel: 'Detailed Description',

    // Events & Challenges Page
    eventsHeading: 'Barangay Cleanup Drives & Eco Challenges',
    eventsSub: 'Join volunteer cleanups, tree planting drives, and household waste reduction challenges to earn Eco Points!',
    upcomingEventsTab: 'Upcoming Events',
    activeChallengesTab: 'Eco Challenges',

    // Garbage Schedule Page
    scheduleHeading: 'Barangay Garbage Collection Timetable',
    scheduleSub: 'Specific pickup days and reminders for biodegradable, non-biodegradable, and recyclable waste.',

    // Modals
    locationModalTitle: 'Select Active Barangay',
    locationModalSub: 'Browse barangays by Region, Province, and City in the Philippines.',
    guideModalTitle: 'Republic Act 9003 Waste Segregation Guide',
    guideModalSub: 'Official Philippine guidelines for Ecological Solid Waste Management.',

    // Language Toggle
    languageLabel: 'Language',
    english: 'English',
    tagalog: 'Tagalog (Filipino)',
  },
  tl: {
    // Navigation & Common
    navHome: 'Tahanan',
    navFeed: 'Feed ng Komunidad',
    navMap: 'Eco-Mapa',
    navRankings: 'Ranggo ng Barangay',
    navReports: 'Mga Ulat',
    navEvents: 'Kaganapan at Subok',
    navSchedule: 'Iskedyul ng Basura',
    navDashboard: 'Aking Dashboard',
    navSignIn: 'Mag-Log In / Magrehistro',
    navSignOut: 'Mag-Log Out',
    navSearchPlaceholder: 'Maghanap ng barangay, recycling center, kaganapan...',
    guideButton: 'Gabay sa RA 9003',
    selectBarangay: 'Pumili ng Barangay',

    // Mobile Navigation & Drawer
    mobileMenuTitle: 'Mga Serbisyo at Navigasyon',
    mobileQuickActions: 'Mabilis na Aksyon',
    mobileChangeBarangay: 'Palitan ang Barangay',
    mobileMoreTabs: 'Iba pang Serbisyo',

    // Notifications Bell
    notificationsHeading: 'Mga Abiso at Alert sa Barangay',
    notificationsEmpty: 'Walang bagong abiso sa kasalukuyan.',
    notificationsMarkAllRead: 'I-marka lahat na nabasa na',
    notificationsAll: 'Lahat ng Alert',
    notificationsUnread: 'Hindi Pa Nabasa',
    notifFilterEvent: 'Mga Nag-rehistro sa Event',
    notifFilterReport: 'Update sa Report',
    notifFilterRanking: 'Ranggo ng Barangay',
    notifView: 'Tingnan ang Detalye',
    notifNewBadge: 'BAGO',

    // Global Search Modal/Dropdown
    searchHeadingBarangays: 'Mga Barangay',
    searchHeadingFacilities: 'Recycling Centers at MRF',
    searchHeadingEvents: 'Mga Kaganapan sa Komunidad',
    noSearchResults: 'Walang nahanap na barangay, pasilidad, o kaganapan.',

    // Common Actions
    logWaste: 'Mag-tala ng Naresiklo',
    snapPhoto: 'Maglitrato / Mag-upload',
    postUpdate: 'Mag-post ng Update',
    like: 'Pusuan',
    comment: 'Mag-kumento',
    share: 'Ibahagi',
    joined: 'Nakasali na',
    joinEvent: 'Sumali sa Kaganapan',
    submitReport: 'Mag-pasa ng Ulat',
    viewOnMap: 'Tingnan sa Mapa',
    myBarangay: 'Aking Barangay',
    allPhilippines: 'Buong Pilipinas',

    // Home Page Hero & Stats
    heroNetwork: 'Pambansang Network para sa Kalinisan ng Pilipinas',
    heroTitle: 'Mas Malinis na Barangay,',
    heroTitleHighlight: 'Mas Mataas na Ranking.',
    heroSubtitle: 'Pinalalakas ang mga pamilyang Pilipino, LGU, at opisyal ng barangay upang magbukod ng basura, mahanap ang pinakamalapit na recycling hub, at i-angat ang score ng komunidad.',
    exploreMapBtn: 'Suriin ang Eco-Mapa',
    leaderboardBtn: 'Pambansang Ranggo ng Barangay',
    ra9003Badge: 'Ayon sa Batas Pambansa RA 9003 (Ecological Solid Waste Management)',
    liveNationalImpact: 'Live na Pambansang Estatistika',
    verifiedCommunityStats: 'Binasag at na-verify na datos sa buong Pilipinas',
    wasteRecycledLabel: 'Naresiklong Basura',
    activeBarangaysLabel: 'Aktibong Barangay',
    reportsResolvedLabel: 'Ulat na Naresolba',
    residentMembersLabel: 'Rehistradong Mamamayan',
    isYourBarangayReg: 'Rehistrado na ba ang iyong barangay?',
    checkStatus: 'Tingnan ang Status',

    // Home Showcase & Features
    honorRollBadge: 'Pambansang Talaan ng Karangalan sa Kalikasan',
    topBarangaysHeading: 'Top sa Pinakamalinis na Barangay sa Pilipinas',
    topBarangaysSub: 'Kinalkula gamit ang makatarungang 100-point formula na nakabase sa populasyon.',
    viewAllRankings: 'Tingnan Lahat ng Ranggo',
    totalScoreLabel: 'Kabuong Iskor',
    recycledLabel: 'Naresiklo',
    exploreBarangayProfile: 'Suriin ang Profile ng Barangay',
    howItWorksHeading: 'Paano Tumutulong ang EcoBarangay',
    howItWorksSub: 'Komprehensibong kagamitan para sa mga batas sa kalikasan at pangangailangan ng pamayanan.',
    featMapTitle: 'Interaktibong Direktoryo ng Recycling',
    featMapDesc: 'Hanapin ang pinakamalapit na Materials Recovery Facility (MRF), junk shop, e-waste drop-off, at composting hubs gamit ang GPS.',
    featScheduleTitle: 'Iskedyul ng Koleksyon ng Basura',
    featScheduleDesc: 'Huwag mamiss ang araw ng hakot. Tingnan ang tukoy na araw ng hakot para sa nabubulok, di-nabubulok, at naresiklo.',
    featReportsTitle: 'Pag-uulat ng Basura at Paglabag',
    featReportsDesc: 'Iulat ang ilegal na pagtatapon ng basura o natambak na kalat. Subaybayan ang aksyon ng opisyal ng barangay.',

    // Feed Page
    feedTitle: 'Social Feed ng EcoBarangay',
    feedSubtitle: 'Mag-konekta, magbahagi ng larawan ng naresiklong basura, at inspirasyunan ang ating barangay!',
    whatsOnYourMind: 'Ibahagi ang iyong resiklo o kumuha ng larawan...',
    attachPhoto: 'Maglakip ng Larawan',
    postButton: 'I-Post',
    recyclingMilestone: 'Naresiklong Basura Tagumpay',
    commentsCount: 'Mga Kumento',
    writeCommentPlaceholder: 'Isulat ang iyong kumento...',
    shareSuccessToast: 'Naikopya ang link! Naibahagi sa komunidad.',
    tabFollowing: 'Sinusundan',
    tabGovPages: 'Pamahalaan at Opisyal',
    filterAreaScope: 'Sakop na Lugar sa Feed',
    chooseFeedArea: 'Pumili ng Lugar para sa Feed',
    allNationalFeed: 'Pambansang Feed (Buong PH)',
    followBtn: 'Sundan',
    followingBtn: 'Sinusundan',
    unfollowBtn: 'I-unfollow',
    followersLabel: 'tagasunod',
    discoverPagesHeading: 'Pahina ng Pamahalaan at Mga Pinuno',
    discoverPagesSub: 'Sundan ang mga ahensya ng gobyerno at opisyal ng barangay para sa opisyal na anunsyo sa kalikasan sa iyong feed.',

    // Resident Dashboard & Waste Logging
    myEcoStats: 'Aking Estatistika sa Kalikasan',
    totalRecycled: 'Kabuong Naresiklo',
    ecoPoints: 'Eco Points',
    nationalRank: 'Pambansang Ranggo',
    selectWasteType: 'Pumili ng Uri ng Basura',
    amountInKg: 'Timbang (sa kg)',
    photoEvidence: 'Ebidensya ng Larawan (Kumuha o Mag-upload)',
    cameraPresetOption: 'Mabilis na Sample ng Larawan',
    shareToFeedOption: 'I-post din ito sa Feed ng Komunidad',
    logSuccessMsg: 'Tagumpay na naitala ang basura! Nakakuha ka ng +',
    points: 'puntos',
    quickLogTitle: 'Mag-tala ng Naresiklong Basura',

    // Official & Admin Dashboards
    officialDashTitle: 'Pangunahing Sentro ng Opisyal ng Barangay',
    officialDashSub: 'Pamahalaan ang iskedyul ng hakot, resolbahin ang ulat ng mamamayan, at suriin ang Eco Score ng barangay.',
    adminDashTitle: 'Administrasyon ng DENR at LGU',
    adminDashSub: 'Pambansang pangangasiwa, bertipikasyon ng LGU, audit logs, at analitika sa kalikasan.',
    resolveReport: 'Markahang Naresolba',
    inProgressReport: 'Gawin Aksyon',
    pendingReport: 'Naghihintay',

    // Eco Map Page
    mapHeading: 'Mapa at Direktoryo ng Recycling sa Pilipinas',
    mapSub: 'Mabilis na mahanap ang pinakamalapit na Materials Recovery Facility (MRF), junk shop, at drop-off center.',
    searchFacilityPlaceholder: 'Maghanap ng pangalan ng pasilidad...',
    allCategories: 'Lahat ng Kategorya',
    mrfCategory: 'Pasilidad ng MRF',
    junkshopCategory: 'Junk Shop',
    dropoffCategory: 'E-Waste Dropoff',
    compostCategory: 'Composting Center',

    // Leaderboard & Rankings
    rankingsHeading: 'Pambansang Ranggo ng Eco Score ng Barangay',
    rankingsSub: 'Mataas at makatarungang sistema ng pagra-ranggo para sa lahat ng barangay sa Pilipinas.',
    allTiers: 'Lahat ng Antas',
    platinumTier: 'Platinum',
    goldTier: 'Ginto (Gold)',
    silverTier: 'Pilak (Silver)',
    bronzeTier: 'Tanso (Bronze)',
    tierLabel: 'Antas',
    scoreBreakdown: 'Paghahati ng Iskor',

    // Reports Page
    reportsHeading: 'Pag-uulat ng Paglabag sa Kalikasan at Basura',
    reportsSub: 'Tumulong na panatilihing malinis ang ating komunidad sa pamamagitan ng pag-uulat ng ilegal na pagtatapon ng basura.',
    createNewReport: 'Mag-ulat ng Isyu sa Kalikasan',
    reportCategoryLabel: 'Kategorya ng Paglabag',
    locationAddressLabel: 'Lokasyon / Landmark',
    descriptionLabel: 'Detalyadong Paglalarawan',

    // Events & Challenges Page
    eventsHeading: 'Bayanihan Cleanup at Mga Subok sa Kalikasan',
    eventsSub: 'Sumali sa bayanihan cleanup, pagtatanim ng puno, at mga subok sa pagresiklo upang makakuha ng Eco Points!',
    upcomingEventsTab: 'Mga Darating na Kaganapan',
    activeChallengesTab: 'Mga Subok sa Kalikasan',

    // Garbage Schedule Page
    scheduleHeading: 'Iskedyul ng Koleksyon ng Basura sa Barangay',
    scheduleSub: 'Tukoy na araw ng hakot para sa nabubulok, di-nabubulok, at naresiklong basura.',

    // Modals
    locationModalTitle: 'Pumili ng Aktibong Barangay',
    locationModalSub: 'Suriin ang mga barangay ayon sa Rehiyon, Probinsya, at Lungsod sa Pilipinas.',
    guideModalTitle: 'Gabay sa Pagbubukod ng Basura (RA 9003)',
    guideModalSub: 'Opisyal na pambansang pamantayan sa pamamahala ng solid waste sa Pilipinas.',

    // Language Toggle
    languageLabel: 'Wika',
    english: 'English',
    tagalog: 'Tagalog (Filipino)',
  },
};

export function getTranslation(lang: Language, key: keyof typeof translations['en']): string {
  return translations[lang]?.[key] || translations['en'][key] || (key as string);
}
