import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/server/dbStore';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper for distance calculation (Haversine formula in km)
  function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
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

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'EcoBarangay API', timestamp: new Date() });
  });

  // Summary Stats
  app.get('/api/stats/summary', (req, res) => {
    res.json(dbStore.getStatsSummary());
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = dbStore.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'User not found. Please check your credentials or register.' });
    }

    // In a production environment, pass hash check here
    res.json({ success: true, user });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const {
      email,
      fullName,
      role,
      barangayId,
      phone,
      avatarUrl,
      householdHeadName,
      householdMembersCount,
      householdAddress,
      householdSegregationType,
    } = req.body;

    if (!email || !fullName || !role || !barangayId) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const existing = dbStore.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const brgy = dbStore.getBarangayById(barangayId);
    if (!brgy) {
      return res.status(400).json({ error: 'Selected barangay not found.' });
    }

    const isHouseholdRegistered = Boolean(householdHeadName && householdAddress);

    const newUser = dbStore.createUser({
      email,
      fullName,
      role,
      barangayId: brgy.id,
      barangayName: brgy.name,
      city: brgy.cityName,
      province: brgy.provinceName,
      region: brgy.regionName,
      phone,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      verifiedOfficial: role === 'BARANGAY_OFFICIAL',
      householdHeadName,
      householdMembersCount: householdMembersCount ? Number(householdMembersCount) : undefined,
      householdAddress,
      householdSegregationType: householdSegregationType || '3-Bin Segregation System',
      householdRegistered: isHouseholdRegistered,
    });

    res.status(201).json({ success: true, user: newUser });
  });

  // Auth: Update User Profile
  app.put('/api/auth/user/:id', (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    const updated = dbStore.updateUser(userId, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: updated });
  });

  // Auth: Register Household & Award Points
  app.post('/api/auth/user/:id/household', (req, res) => {
    const userId = req.params.id;
    const { householdHeadName, householdMembersCount, householdAddress, householdSegregationType } = req.body;
    const user = dbStore.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = dbStore.updateUser(userId, {
      householdHeadName,
      householdMembersCount: Number(householdMembersCount) || 1,
      householdAddress,
      householdSegregationType: householdSegregationType || '3-Bin Segregation System',
      householdRegistered: true,
      ecoPoints: (user.ecoPoints || 0) + 50, // Award 50 bonus Eco Points for household registration
    });

    res.json({ success: true, user: updated });
  });

  // Auth: Get User Profile
  app.get('/api/auth/user/:id', (req, res) => {
    const user = dbStore.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // Location: Hierarchy (Regions, Provinces, Cities)
  app.get('/api/locations/regions', (req, res) => {
    res.json(dbStore.getRegions());
  });

  app.get('/api/locations/provinces', (req, res) => {
    const { regionCode } = req.query;
    res.json(dbStore.getProvinces(regionCode as string));
  });

  app.get('/api/locations/cities', (req, res) => {
    const { provinceCode, regionCode } = req.query;
    res.json(dbStore.getCities(provinceCode as string, regionCode as string));
  });

  app.get('/api/locations/barangays', (req, res) => {
    const { cityCode, provinceCode, regionCode, search } = req.query;
    res.json(
      dbStore.getBarangays({
        cityCode: cityCode as string,
        provinceCode: provinceCode as string,
        regionCode: regionCode as string,
        search: search as string,
      })
    );
  });

  // Location: Detect Nearest Barangay via Geolocation
  app.post('/api/locations/detect-nearest', (req, res) => {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const barangays = dbStore.getBarangays();
    let nearest: any = null;
    let minDistance = Infinity;

    for (const b of barangays) {
      const dist = getDistanceKm(lat, lng, b.lat, b.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { ...b, distanceKm: dist };
      }
    }

    res.json({ success: true, nearestBarangay: nearest, distanceKm: minDistance });
  });

  // Rankings Leaderboard
  app.get('/api/rankings', (req, res) => {
    const { regionCode, provinceCode, cityCode, tier, search } = req.query;
    let list = dbStore.getBarangays();

    if (regionCode) list = list.filter(b => b.regionCode === regionCode);
    if (provinceCode) list = list.filter(b => b.provinceCode === provinceCode);
    if (cityCode) list = list.filter(b => b.cityCode === cityCode);
    if (tier && tier !== 'ALL') list = list.filter(b => b.score.tier === tier);

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.cityName.toLowerCase().includes(q) ||
          b.provinceName.toLowerCase().includes(q)
      );
    }

    // Sort by national rank / total score
    list.sort((a, b) => b.score.totalScore - a.score.totalScore);
    res.json(list);
  });

  // Facilities
  app.get('/api/facilities', (req, res) => {
    const { barangayId, category, userLat, userLng } = req.query;
    let facilities = dbStore.getFacilities(barangayId as string, category as string);

    // Calculate distance if user lat/lng provided
    if (userLat && userLng) {
      const uLat = parseFloat(userLat as string);
      const uLng = parseFloat(userLng as string);
      facilities = facilities.map(f => ({
        ...f,
        distanceKm: getDistanceKm(uLat, uLng, f.lat, f.lng),
      }));
      facilities.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    res.json(facilities);
  });

  app.post('/api/facilities', (req, res) => {
    const newFacility = dbStore.createFacility(req.body);
    res.status(201).json(newFacility);
  });

  // Environmental Reports
  app.get('/api/reports', (req, res) => {
    const { barangayId, reporterId } = req.query;
    res.json(dbStore.getReports(barangayId as string, reporterId as string));
  });

  app.post('/api/reports', (req, res) => {
    const report = dbStore.createReport(req.body);
    res.status(201).json(report);
  });

  app.patch('/api/reports/:id/status', (req, res) => {
    const { status, notes } = req.body;
    const updated = dbStore.updateReportStatus(req.params.id, status, notes);
    if (!updated) return res.status(404).json({ error: 'Report not found' });
    res.json(updated);
  });

  // Events
  app.get('/api/events', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getEvents(barangayId as string));
  });

  app.post('/api/events', (req, res) => {
    const evt = dbStore.createEvent(req.body);
    res.status(201).json(evt);
  });

  app.post('/api/events/:id/join', (req, res) => {
    const { userId } = req.body;
    const updated = dbStore.joinEvent(req.params.id, userId);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  });

  // Challenges
  app.get('/api/challenges', (req, res) => {
    res.json(dbStore.getChallenges());
  });

  app.post('/api/challenges/:id/join', (req, res) => {
    const { userId } = req.body;
    const updated = dbStore.joinChallenge(req.params.id, userId);
    res.json(updated);
  });

  app.post('/api/challenges/:id/complete', (req, res) => {
    const { userId } = req.body;
    const updated = dbStore.completeChallenge(req.params.id, userId);
    res.json(updated);
  });

  // Garbage Collection Schedules
  app.get('/api/schedules', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getSchedules(barangayId as string));
  });

  app.post('/api/schedules', (req, res) => {
    const schedule = dbStore.createSchedule(req.body);
    res.status(201).json(schedule);
  });

  // Global Search
  app.get('/api/search', (req, res) => {
    const q = (req.query.q as string) || '';
    res.json(dbStore.globalSearch(q));
  });

  // Social Feed Endpoints
  app.get('/api/feed', (req, res) => {
    const { barangayId, cityCode, provinceCode, regionCode, followingUserId, isGovernmentOnly, scopeLevel } = req.query;
    res.json(dbStore.getFeedPosts({
      barangayId: barangayId as string,
      cityCode: cityCode as string,
      provinceCode: provinceCode as string,
      regionCode: regionCode as string,
      followingUserId: followingUserId as string,
      isGovernmentOnly: isGovernmentOnly === 'true',
      scopeLevel: scopeLevel as any,
    }));
  });

  // Government Pages
  app.get('/api/government-pages', (req, res) => {
    const { category, regionCode } = req.query;
    res.json(dbStore.getGovernmentPages(category as string, regionCode as string));
  });

  // Notifications API
  app.get('/api/notifications', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getNotifications(barangayId as string));
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const result = dbStore.markNotificationAsRead(id);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json(result);
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { barangayId } = req.body;
    dbStore.markAllNotificationsAsRead(barangayId);
    res.json({ success: true });
  });

  app.post('/api/notifications', (req, res) => {
    const { type, title, message, barangayId, barangayName, targetTab, linkId } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'type, title, and message are required' });
    }
    const notif = dbStore.createNotification({
      type,
      title,
      message,
      barangayId,
      barangayName,
      targetTab,
      linkId,
    });
    res.json(notif);
  });

  // Follow / Unfollow System
  app.post('/api/follow/user', (req, res) => {
    const { userId, targetUserId } = req.body;
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'userId and targetUserId are required' });
    }
    const result = dbStore.toggleFollowUser(userId, targetUserId);
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  });

  app.post('/api/follow/page', (req, res) => {
    const { userId, targetPageId } = req.body;
    if (!userId || !targetPageId) {
      return res.status(400).json({ error: 'userId and targetPageId are required' });
    }
    const result = dbStore.toggleFollowPage(userId, targetPageId);
    if (!result) return res.status(404).json({ error: 'User or Page not found' });
    res.json(result);
  });

  app.post('/api/feed', (req, res) => {
    const { authorId, authorName, authorAvatar, authorRole, barangayId, barangayName, content, photoUrl, wasteKg, wasteType } = req.body;
    if (!authorId || !content) {
      return res.status(400).json({ error: 'Author and content are required' });
    }
    const post = dbStore.createFeedPost({
      authorId,
      authorName: authorName || 'Anonymous',
      authorAvatar,
      authorRole: authorRole || 'RESIDENT',
      barangayId,
      barangayName: barangayName || 'Barangay Community',
      content,
      photoUrl,
      wasteKg: wasteKg ? parseFloat(wasteKg) : undefined,
      wasteType,
    });
    res.status(201).json(post);
  });

  app.post('/api/feed/:id/like', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const post = dbStore.likeFeedPost(req.params.id, userId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  app.post('/api/feed/:id/comment', (req, res) => {
    const { authorId, authorName, authorAvatar, content } = req.body;
    if (!authorId || !content) return res.status(400).json({ error: 'authorId and content are required' });
    const post = dbStore.addFeedComment(req.params.id, { authorId, authorName, authorAvatar, content });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  app.post('/api/feed/:id/share', (req, res) => {
    const post = dbStore.shareFeedPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  // Waste Log Activity
  app.post('/api/waste/log', (req, res) => {
    const { userId, kg, wasteType, photoUrl, autoPostToFeed } = req.body;
    if (!userId || !kg || !wasteType) {
      return res.status(400).json({ error: 'userId, kg, and wasteType are required' });
    }
    const updatedUser = dbStore.logWasteRecycled(userId, parseFloat(kg), wasteType, photoUrl, autoPostToFeed);
    res.json({ success: true, user: updatedUser });
  });

  // Activity logs
  app.get('/api/activity-logs', (req, res) => {
    const { userId } = req.query;
    res.json(dbStore.getActivityLogs(userId as string));
  });

  // Announcements
  app.get('/api/announcements', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getAnnouncements(barangayId as string));
  });

  app.post('/api/announcements', (req, res) => {
    const anc = dbStore.createAnnouncement(req.body);
    res.status(201).json(anc);
  });

  // System Admin: All Users
  app.get('/api/admin/users', (req, res) => {
    res.json(dbStore.getUsers());
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EcoBarangay] Full-stack Server listening at http://localhost:${PORT}`);
  });
}

startServer();
