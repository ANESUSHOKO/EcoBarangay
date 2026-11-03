import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/server/dbStore';
import { isBootstrapSystemAdmin } from './src/server/adminBootstrap';
import { challengeView, eventView } from './src/server/publicViews';
import {
  verifyPassword,
} from './src/server/authSecurity';
import { validateReportPhoto, chatWithEcoAssistant } from './src/server/geminiService';
import { firebaseAuth } from './src/server/firebaseAdmin';
import { User } from './src/types';

type AuthenticatedRequest = express.Request & {
  appUser?: User;
  firebaseUid?: string;
  firebaseEmail?: string;
};

type AppOptions = {
  serveFrontend?: boolean;
};

function inspectImageData(imageData: string, declaredMimeType?: string) {
  const dataUriMatch = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  const base64 = dataUriMatch?.[2] || imageData;
  const mimeType = dataUriMatch?.[1] || declaredMimeType;
  if (
    typeof mimeType !== 'string' ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    return { error: 'format' as const };
  }

  const buffer = Buffer.from(base64, 'base64');
  if (
    buffer.length === 0 ||
    buffer.length > 5 * 1024 * 1024 ||
    buffer.toString('base64').replace(/=+$/, '') !== base64.replace(/=+$/, '')
  ) {
    return { error: 'size' as const };
  }

  const isJpeg = mimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = mimeType === 'image/png' && buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  const isWebp = mimeType === 'image/webp' &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp
    ? { base64, mimeType }
    : { error: 'format' as const };
}

export async function createApp(options: AppOptions = {}) {
  await dbStore.ready();
  const app = express();
  const aiRequestTimes = new Map<string, number[]>();

  function allowAiRequest(key: string, limit: number): boolean {
    const now = Date.now();
    if (aiRequestTimes.size > 1_000) {
      for (const [requestKey, timestamps] of aiRequestTimes) {
        if (!timestamps.some(timestamp => now - timestamp < 60_000)) aiRequestTimes.delete(requestKey);
      }
    }
    const recent = (aiRequestTimes.get(key) || []).filter(timestamp => now - timestamp < 60_000);
    if (recent.length >= limit) {
      aiRequestTimes.set(key, recent);
      return false;
    }
    recent.push(now);
    aiRequestTimes.set(key, recent);
    return true;
  }

  app.use(express.json({ limit: '10mb' }));

  const publicReadRoutes = [
    /^\/api\/stats\/summary$/,
    /^\/api\/locations\/(regions|provinces|cities|barangays)$/,
    /^\/api\/locations\/detect-nearest$/,
    /^\/api\/rankings$/,
    /^\/api\/rankings\/[^/]+\/history$/,
    /^\/api\/facilities$/,
    /^\/api\/events$/,
    /^\/api\/challenges$/,
    /^\/api\/schedules$/,
    /^\/api\/businesses$/,
    /^\/api\/organizations$/,
    /^\/api\/assets$/,
    /^\/api\/trees$/,
    /^\/api\/alerts$/,
    /^\/api\/most-improved$/,
    /^\/api\/transparency\/[^/]+$/,
    /^\/api\/search$/,
    /^\/api\/feed$/,
    /^\/api\/government-pages$/,
    /^\/api\/announcements$/,
  ];

  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();
    try {
      await dbStore.refreshIfStale();
      return next();
    } catch (error) {
      console.error('Firestore refresh failed before API request:', error);
      return res.status(503).json({ error: 'Application data is temporarily unavailable.' });
    }
  });

  app.use(async (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (req.path === '/api/health') return next();
    if (req.path === '/api/auth/legacy-migration-check' && req.method === 'POST') return next();
    if (req.method === 'GET' && !req.headers.authorization &&
        publicReadRoutes.some(route => route.test(req.path))) return next();
    if (req.path === '/api/locations/detect-nearest' && req.method === 'POST') return next();

    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token || !firebaseAuth) {
      return res.status(401).json({ error: 'Authentication is required.' });
    }

    try {
      const identity = await firebaseAuth.verifyIdToken(token);
      const isRegistration = req.path === '/api/auth/register' && req.method === 'POST';

      const storedAppUser = identity.email ? dbStore.getUserByEmail(identity.email) : undefined;
      const isBootstrapAdmin = isBootstrapSystemAdmin(
        identity.email,
        identity.uid,
        process.env.SYSTEM_ADMIN_EMAIL,
        process.env.SYSTEM_ADMIN_UID,
        Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
      );
      const appUser = storedAppUser && isBootstrapAdmin
        ? { ...storedAppUser, role: 'SYSTEM_ADMIN' as const, verifiedOfficial: false }
        : storedAppUser;
      if (!appUser && !isRegistration) {
        return res.status(403).json({ error: 'No EcoBarangay profile is linked to this account.' });
      }
      if (appUser?.firebaseUid && appUser.firebaseUid !== identity.uid) {
        return res.status(403).json({ error: 'This profile is linked to a different Firebase account.' });
      }

      const authenticatedRequest = req as AuthenticatedRequest;
      authenticatedRequest.appUser = appUser;
      authenticatedRequest.firebaseUid = identity.uid;
      authenticatedRequest.firebaseEmail = identity.email;

      if (appUser) {
        const claimedActorIds = [
          req.body?.userId,
          req.body?.authorId,
          req.body?.reporterId,
          req.body?.leaderUser?.id,
        ].filter((value): value is string => typeof value === 'string');
        if (claimedActorIds.some(id => id !== appUser.id)) {
          return res.status(403).json({ error: 'You may only act on your own account.' });
        }

        if (req.path.startsWith('/api/admin/') && appUser.role !== 'SYSTEM_ADMIN') {
          return res.status(403).json({ error: 'System administrator access is required.' });
        }

        const officialOnly = req.method !== 'GET' && (
          /^\/api\/(facilities|events|schedules|businesses|organizations|assets|trees|alerts|announcements)(\/|$)/.test(req.path) ||
          /^\/api\/reports\/[^/]+\/(status|photo-review|reopen-decision)$/.test(req.path) ||
          /^\/api\/activity-logs\/(pending|[^/]+\/review)$/.test(req.path) ||
          /^\/api\/bulk-pickups\/[^/]+\/status$/.test(req.path) ||
          /^\/api\/facilities\/[^/]+\/status$/.test(req.path) ||
          req.path === '/api/notifications'
        );

        if (officialOnly && appUser.role !== 'SYSTEM_ADMIN' &&
            (appUser.role !== 'BARANGAY_OFFICIAL' || !appUser.verifiedOfficial)) {
          return res.status(403).json({ error: 'Verified barangay official access is required.' });
        }

        if (appUser.role === 'BARANGAY_OFFICIAL' && appUser.verifiedOfficial) {
          let targetBarangayId = req.body?.barangayId;
          const reportStatusId = req.path.match(/^\/api\/reports\/([^/]+)\/(?:status|photo-review|reopen-decision)$/)?.[1];
          const facilityStatusId = req.path.match(/^\/api\/facilities\/([^/]+)\/status$/)?.[1];
          const pickupStatusId = req.path.match(/^\/api\/bulk-pickups\/([^/]+)\/status$/)?.[1];
          const scheduleId = req.path.match(/^\/api\/schedules\/([^/]+)$/)?.[1];
          const activityReviewId = req.path.match(/^\/api\/activity-logs\/([^/]+)\/review$/)?.[1];
          if (reportStatusId) {
            targetBarangayId = dbStore.getReports().find(item => item.id === reportStatusId)?.barangayId;
          } else if (facilityStatusId) {
            targetBarangayId = dbStore.getFacilities().find(item => item.id === facilityStatusId)?.barangayId;
          } else if (pickupStatusId) {
            targetBarangayId = dbStore.getBulkPickups().find(item => item.id === pickupStatusId)?.barangayId;
          } else if (scheduleId) {
            targetBarangayId = dbStore.getSchedules().find(item => item.id === scheduleId)?.barangayId;
          } else if (activityReviewId) {
            const activity = dbStore.getActivityLogs().find(item => item.id === activityReviewId);
            targetBarangayId = activity ? dbStore.getUserById(activity.userId)?.barangayId : undefined;
          } else if (req.path === '/api/activity-logs/pending') {
            targetBarangayId = typeof req.query.barangayId === 'string' ? req.query.barangayId : undefined;
          }
          if (typeof targetBarangayId === 'string' && targetBarangayId !== appUser.barangayId) {
            return res.status(403).json({ error: 'You may only manage records in your assigned barangay.' });
          }
        }

        const profileMatch = req.path.match(/^\/api\/auth\/user\/([^/]+)$/);
        const householdMatch = req.path.match(/^\/api\/auth\/user\/([^/]+)\/household$/);
        const familyGroupMatch = req.path.match(/^\/api\/family-group\/([^/]+)$/);
        const requestedUserId = profileMatch?.[1] || householdMatch?.[1] || familyGroupMatch?.[1] ||
          (req.path === '/api/activity-logs' ? req.query.userId : undefined) ||
          (req.path === '/api/calendar' || req.path === '/api/bulk-pickups' ? req.query.userId : undefined);
        if (typeof requestedUserId === 'string' && requestedUserId !== appUser.id) {
          return res.status(403).json({ error: 'You may only access your own account data.' });
        }
        const officialPickupQueue = req.method === 'GET' && req.path === '/api/bulk-pickups' &&
          (appUser.role === 'SYSTEM_ADMIN' || (appUser.role === 'BARANGAY_OFFICIAL' && appUser.verifiedOfficial));
        if (
          req.path === '/api/bulk-pickups' &&
          officialPickupQueue &&
          appUser.role === 'BARANGAY_OFFICIAL' &&
          req.query.barangayId !== appUser.barangayId
        ) {
          return res.status(403).json({ error: 'You may only view pickup requests in your assigned barangay.' });
        }
        if (
          ['/api/activity-logs', '/api/calendar'].includes(req.path) &&
          requestedUserId !== appUser.id
        ) {
          return res.status(403).json({ error: 'A personal account ID is required for this request.' });
        }
        if (req.path === '/api/bulk-pickups' && !officialPickupQueue && requestedUserId !== appUser.id) {
          return res.status(403).json({ error: 'A personal account ID is required for this request.' });
        }
      }

      return next();
    } catch (error) {
      console.warn('Firebase ID token verification failed:', error);
      return res.status(401).json({ error: 'Authentication could not be verified.' });
    }
  });

  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();

    const sendJson = res.json.bind(res);
    res.json = ((body?: unknown) => {
      void dbStore.flush()
        .then(() => sendJson(body))
        .catch(error => {
          console.error('Firestore persistence failed before API response:', error);
          if (!res.headersSent) {
            res.status(503);
            sendJson({ error: 'The change could not be saved. Please retry.' });
          }
        });
      return res;
    }) as typeof res.json;
    return next();
  });

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

  // Verify a legacy password only to allow Firebase Auth account migration.
  app.post('/api/auth/legacy-migration-check', (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = dbStore.getUserByEmail(cleanEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'The email or password is incorrect.' });
    }

    return res.json({ success: true });
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
      requestOfficialAccess,
      householdHeadName,
      householdMembersCount,
      householdAddress,
      householdSegregationType,
    } = req.body;
    const authenticatedRequest = req as AuthenticatedRequest;
    const appUser = authenticatedRequest.appUser;
    const firebaseUid = authenticatedRequest.firebaseUid;

    if (typeof email !== 'string' || typeof fullName !== 'string' || !barangayId) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }

    if (!firebaseUid || email.trim().toLowerCase() !== authenticatedRequest.firebaseEmail?.toLowerCase()) {
      return res.status(403).json({ error: 'The registration email must match the Firebase account.' });
    }

    if (role !== 'RESIDENT') {
      return res.status(403).json({ error: 'Privileged roles require administrator approval.' });
    }
    if (requestOfficialAccess !== undefined && typeof requestOfficialAccess !== 'boolean') {
      return res.status(400).json({ error: 'Official access request must be true or false.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = dbStore.getUserByEmail(cleanEmail);
    if (existing) {
      if (existing.firebaseUid === firebaseUid) {
        const { passwordHash: _, householdAddress: __, ...safeUser } = existing;
        return res.status(200).json({ success: true, user: safeUser });
      }
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const brgy = dbStore.getBarangayById(barangayId);
    if (!brgy) {
      return res.status(400).json({ error: 'Selected barangay not found.' });
    }

    const isHouseholdRegistered = Boolean(householdHeadName && householdAddress);

    const newUser = dbStore.createUser({
      email: cleanEmail,
      firebaseUid,
      fullName: fullName.trim(),
      role,
      barangayId: brgy.id,
      barangayName: brgy.name,
      city: brgy.cityName,
      province: brgy.provinceName,
      region: brgy.regionName,
      phone,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      photoUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      verifiedOfficial: false,
      officialAccessRequest: requestOfficialAccess
        ? { barangayId: brgy.id, status: 'Pending', submittedAt: new Date().toISOString() }
        : undefined,
      householdHeadName,
      householdMembersCount: householdMembersCount ? Number(householdMembersCount) : undefined,
      householdAddress,
      householdSegregationType: householdSegregationType || '3-Bin Segregation System',
      householdRegistered: isHouseholdRegistered,
    });

    const { passwordHash: _, householdAddress: __, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser });
  });

  // Auth: Update User Profile
  app.put('/api/auth/user/:id', (req, res) => {
    const userId = req.params.id;
    const allowedFields = [
      'fullName',
      'phone',
      'avatarUrl',
      'photoUrl',
      'householdHeadName',
      'householdMembersCount',
      'householdAddress',
      'householdSegregationType',
    ] as const;
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (Object.keys(body).some(field => !allowedFields.includes(field as typeof allowedFields[number]))) {
      return res.status(400).json({ error: 'The profile update contains unsupported fields.' });
    }
    const stringLimits: Partial<Record<typeof allowedFields[number], { min: number; max: number }>> = {
      fullName: { min: 2, max: 80 },
      phone: { min: 0, max: 32 },
      avatarUrl: { min: 0, max: 2_048 },
      photoUrl: { min: 0, max: 2_048 },
      householdHeadName: { min: 0, max: 80 },
      householdAddress: { min: 0, max: 200 },
      householdSegregationType: { min: 0, max: 80 },
    };
    for (const [field, value] of Object.entries(body)) {
      if (field === 'householdMembersCount') {
        if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 30) {
          return res.status(400).json({ error: 'Household member count must be between 1 and 30.' });
        }
        continue;
      }
      const limits = stringLimits[field as keyof typeof stringLimits];
      if (typeof value !== 'string' || !limits || value.trim().length < limits.min || value.length > limits.max) {
        return res.status(400).json({ error: `Invalid value for profile field "${field}".` });
      }
      if (['avatarUrl', 'photoUrl'].includes(field) && value.trim()) {
        try {
          if (new URL(value).protocol !== 'https:') throw new Error();
        } catch {
          return res.status(400).json({ error: 'Profile image must be a valid HTTPS URL.' });
        }
      }
    }
    const updates = Object.fromEntries(
      Object.entries(body).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])
    );
    const updated = dbStore.updateUser(userId, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  });

  // Auth: Register household details
  app.post('/api/auth/user/:id/household', (req, res) => {
    const userId = req.params.id;
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const allowedFields = ['householdHeadName', 'householdMembersCount', 'householdAddress', 'householdSegregationType'];
    if (
      Object.keys(body).some(field => !allowedFields.includes(field)) ||
      typeof body.householdHeadName !== 'string' || body.householdHeadName.trim().length < 2 || body.householdHeadName.length > 80 ||
      !Number.isInteger(body.householdMembersCount) || body.householdMembersCount < 1 || body.householdMembersCount > 30 ||
      typeof body.householdAddress !== 'string' || body.householdAddress.trim().length < 3 || body.householdAddress.length > 200 ||
      typeof body.householdSegregationType !== 'string' || body.householdSegregationType.trim().length < 2 || body.householdSegregationType.length > 80
    ) {
      return res.status(400).json({ error: 'Provide a valid household head, member count, address, and segregation setup.' });
    }
    const { householdHeadName, householdMembersCount, householdAddress, householdSegregationType } = body;
    const user = dbStore.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = dbStore.updateUser(userId, {
      householdHeadName,
      householdMembersCount,
      householdAddress: householdAddress.trim(),
      householdSegregationType: householdSegregationType.trim(),
      householdRegistered: true,
    });

    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    const firebaseUid = (req as AuthenticatedRequest).firebaseUid;
    if (user.passwordHash || user.firebaseUid !== firebaseUid) {
      dbStore.updateUser(user.id, { passwordHash: undefined, firebaseUid });
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Auth: Get User Profile
  app.get('/api/auth/user/:id', (req, res) => {
    const user = dbStore.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
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
  app.post('/api/locations/detect-nearest', async (req, res) => {
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

    let reverseGeocodedAddress = '';
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'EcoBarangay/1.0' } }
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData && nomData.display_name) {
          reverseGeocodedAddress = nomData.display_name;
        }
      }
    } catch (e) {
      // Optional reverse geocode
    }

    res.json({
      success: true,
      nearestBarangay: nearest,
      distanceKm: minDistance,
      reverseGeocodedAddress,
    });
  });

  // Rankings Leaderboard
  app.get('/api/rankings', (req, res) => {
    dbStore.captureDailyRankingSnapshotIfDue();
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

  app.get('/api/rankings/:barangayId/history', (req, res) => {
    dbStore.captureDailyRankingSnapshotIfDue();
    res.json(dbStore.getRankingHistory(req.params.barangayId));
  });

  // --- AI & INTELLIGENCE ROUTES ---

  // AI Photo Verification for Environmental Reports
  app.post('/api/ai/validate-report-photo', async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).appUser;
      if (!user) return res.status(401).json({ error: 'Authentication is required.' });
      if (!allowAiRequest(`photo:${user.id}`, 10)) {
        return res.status(429).json({ error: 'Photo verification limit reached. Try again in a minute.' });
      }
      const { imageData, mimeType } = req.body;
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: 'Image data is required.' });
      }

      const image = inspectImageData(imageData, mimeType);
      if ('error' in image && image.error === 'format') {
        return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
      }
      if ('error' in image) {
        return res.status(413).json({ error: 'The image must be smaller than 5 MB.' });
      }

      const result = await validateReportPhoto(image.base64, image.mimeType);
      return res.json(result);
    } catch (error) {
      console.error('[AI Photo Validation Route Error]:', error);
      return res.status(500).json({ error: 'Failed to process AI photo validation.' });
    }
  });

  // AI EcoBarangay Assistant Chat
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).appUser;
      if (!user) return res.status(401).json({ error: 'Authentication is required.' });
      if (!allowAiRequest(`chat:${user.id}`, 20)) {
        return res.status(429).json({ error: 'Assistant limit reached. Try again in a minute.' });
      }

      const { messages, context } = req.body;
      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.length > 20 ||
        messages.some(message =>
          !message ||
          !['user', 'model'].includes(message.role) ||
          typeof message.content !== 'string' ||
          message.content.length > 2_000
        )
      ) {
        return res.status(400).json({ error: 'Provide up to 20 valid messages of at most 2,000 characters each.' });
      }

      const localSchedules = dbStore.getSchedules(user.barangayId);
      const reply = await chatWithEcoAssistant(messages, {
        barangayName: user.barangayName,
        lang: typeof context?.lang === 'string' && ['en', 'tl'].includes(context.lang) ? context.lang : 'en',
        localSchedules,
      });
      return res.json({ reply });
    } catch (error) {
      console.error('[AI Chat Route Error]:', error);
      return res.status(500).json({ error: 'Failed to communicate with AI Assistant.' });
    }
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
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const requestedBarangay = typeof req.query.barangayId === 'string' ? req.query.barangayId : undefined;
    if (user.role === 'SYSTEM_ADMIN') {
      return res.json(dbStore.getReports(requestedBarangay));
    }

    const reports = dbStore.getReports(user.barangayId).map(report => ({
      ...report,
      reporterId: report.reporterId === user.id ? report.reporterId : '',
      reporterContact: report.reporterId === user.id ? report.reporterContact : undefined,
      upvotedUserIds: report.upvotedUserIds?.filter(id => id === user.id),
      resolutionFeedback: report.reporterId === user.id ? report.resolutionFeedback : undefined,
      reopenRequest: report.reporterId === user.id || user.role === 'BARANGAY_OFFICIAL'
        ? report.reopenRequest
        : undefined,
      statusHistory: report.statusHistory?.map(update => ({
        ...update,
        changedBy: update.changedBy === user.id ? update.changedBy : 'Barangay official',
      })),
    }));
    return res.json(reports);
  });

  app.post('/api/reports', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const {
      category,
      description,
      locationAddress,
      landmark,
      tags,
      urgency,
      estimatedVolume,
      lat,
      lng,
      photoUrl,
      photoAssessment,
      isAnonymous,
    } = req.body;
    const categories = [
      'Illegal Dumping', 'Overflowing Bin', 'Missed Collection', 'Clogged Drainage',
      'Hazardous Waste', 'Open Burning (Siga)', 'Plastic Pollution',
      'Waterway Contamination', 'Unsegregated Waste',
    ];
    if (
      !categories.includes(category) ||
      typeof description !== 'string' ||
      description.trim().length < 8 ||
      description.trim().length > 2_000 ||
      typeof locationAddress !== 'string' ||
      locationAddress.trim().length < 3 ||
      locationAddress.trim().length > 200 ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      return res.status(400).json({ error: 'Provide a valid category, description, address, and location.' });
    }

    let safePhotoUrl: string | undefined;
    if (photoUrl !== undefined && photoUrl !== '') {
      if (typeof photoUrl !== 'string') return res.status(400).json({ error: 'Invalid photo evidence.' });
      if (photoUrl.startsWith('data:')) {
        const image = inspectImageData(photoUrl);
        if ('error' in image) {
          return res.status(image.error === 'size' ? 413 : 415).json({ error: 'Photo must be a valid JPEG, PNG, or WebP under 600 KB.' });
        }
        if (Buffer.from(image.base64, 'base64').length > 600 * 1024) {
          return res.status(413).json({ error: 'Photo must be under 600 KB after compression.' });
        }
        safePhotoUrl = photoUrl;
      } else {
        try {
          const parsed = new URL(photoUrl);
          if (parsed.protocol !== 'https:' || photoUrl.length > 2_048) throw new Error('Invalid URL');
          safePhotoUrl = parsed.toString();
        } catch {
          return res.status(400).json({ error: 'Photo evidence must be a valid HTTPS URL or supported image.' });
        }
      }
    }

    const safeAssessment = photoAssessment && typeof photoAssessment === 'object'
      ? {
          isValid: photoAssessment.isValid === true,
          reason: typeof photoAssessment.reason === 'string' ? photoAssessment.reason.slice(0, 500) : 'AI suggestion unavailable.',
          reviewRequired: true,
          confidence: typeof photoAssessment.confidence === 'number' && Number.isFinite(photoAssessment.confidence)
            ? Math.min(1, Math.max(0, photoAssessment.confidence))
            : 0,
          labels: Array.isArray(photoAssessment.labels)
            ? photoAssessment.labels.filter((label: unknown): label is string => typeof label === 'string').slice(0, 10)
            : [],
          detectedCategory: typeof photoAssessment.detectedCategory === 'string' ? photoAssessment.detectedCategory : undefined,
          detectedSeverity: typeof photoAssessment.detectedSeverity === 'string' ? photoAssessment.detectedSeverity : undefined,
        }
      : undefined;
    const report = dbStore.createReport({
      category,
      description: description.trim(),
      locationAddress: locationAddress.trim(),
      landmark: typeof landmark === 'string' ? landmark.trim().slice(0, 160) : undefined,
      tags: Array.isArray(tags)
        ? tags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 16)
        : [],
      urgency: ['Low', 'Medium', 'High', 'Critical'].includes(urgency) ? urgency : 'Medium',
      estimatedVolume: typeof estimatedVolume === 'string' ? estimatedVolume.slice(0, 80) : undefined,
      lat,
      lng,
      barangayId: user.barangayId,
      barangayName: user.barangayName,
      cityName: user.city,
      reporterId: user.id,
      reporterName: isAnonymous === true ? 'Anonymous Resident' : user.fullName,
      reporterContact: user.phone,
      photoUrl: safePhotoUrl,
      photoAssessment: safeAssessment,
      upvotesCount: 0,
      upvotedUserIds: [],
    });
    res.status(201).json(report);
  });

  app.patch('/api/reports/:id/status', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    const { status, notes, evidenceUrl, assignedTeam } =
      req.body && typeof req.body === 'object' ? req.body : {};
    const supportedStatuses = ['Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
    if (!supportedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Choose a valid next report status.' });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1_000)) {
      return res.status(400).json({ error: 'Status notes must be 1,000 characters or fewer.' });
    }
    if (status === 'Rejected' && !(typeof notes === 'string' && notes.trim().length >= 8)) {
      return res.status(400).json({ error: 'Provide a clear reason before rejecting a report.' });
    }
    if (assignedTeam !== undefined &&
        (typeof assignedTeam !== 'string' || assignedTeam.trim().length > 80)) {
      return res.status(400).json({ error: 'Assignment must be at most 80 characters.' });
    }
    if (status === 'Assigned' && !(typeof assignedTeam === 'string' && assignedTeam.trim())) {
      return res.status(400).json({ error: 'Name a team or responsible office before assigning the report.' });
    }
    if (status === 'Resolved' && !(typeof notes === 'string' && notes.trim().length >= 8) &&
        !(typeof evidenceUrl === 'string' && evidenceUrl.trim())) {
      return res.status(400).json({ error: 'A resolution note or evidence photo is required before resolving a report.' });
    }
    let safeEvidenceUrl: string | undefined;
    if (evidenceUrl !== undefined && evidenceUrl !== '') {
      try {
        const parsedEvidenceUrl = new URL(evidenceUrl);
        if (parsedEvidenceUrl.protocol !== 'https:' || evidenceUrl.length > 2_048) throw new Error();
        safeEvidenceUrl = parsedEvidenceUrl.toString();
      } catch {
        return res.status(400).json({ error: 'Resolution evidence must be a valid HTTPS URL.' });
      }
    }
    const updated = dbStore.updateReportStatus(
      req.params.id,
      status,
      typeof notes === 'string' ? notes : undefined,
      user?.id || 'unknown-official',
      safeEvidenceUrl,
      typeof assignedTeam === 'string' ? assignedTeam : undefined,
    );
    if (!updated) return res.status(409).json({ error: 'Report status change is not allowed from its current state.' });
    res.json(updated);
  });

  app.post('/api/reports/:id/feedback', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const { rating, comment, reopenReason } = req.body && typeof req.body === 'object' ? req.body : {};
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      (comment !== undefined && (typeof comment !== 'string' || comment.length > 500)) ||
      (reopenReason !== undefined && (typeof reopenReason !== 'string' || reopenReason.trim().length < 8 || reopenReason.length > 500))
    ) {
      return res.status(400).json({ error: 'Provide a 1–5 rating, an optional comment up to 500 characters, and a clear reopen reason when requested.' });
    }
    const report = dbStore.submitReportFeedback(
      req.params.id,
      user.id,
      rating,
      typeof comment === 'string' ? comment.trim() : undefined,
      typeof reopenReason === 'string' ? reopenReason.trim() : undefined,
    );
    if (!report) return res.status(409).json({ error: 'Feedback is only accepted once from the reporter after the report is resolved.' });
    res.json(report);
  });

  app.post('/api/reports/:id/photo-review', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || (user.role !== 'SYSTEM_ADMIN' &&
        (user.role !== 'BARANGAY_OFFICIAL' || !user.verifiedOfficial))) {
      return res.status(403).json({ error: 'Verified barangay official access is required.' });
    }
    const { decision, correctedCategory, notes } = req.body && typeof req.body === 'object' ? req.body : {};
    const decisions = ['Confirmed', 'Rejected', 'Corrected'];
    const categories = [
      'Illegal Dumping', 'Overflowing Bin', 'Missed Collection', 'Clogged Drainage',
      'Hazardous Waste', 'Open Burning (Siga)', 'Plastic Pollution',
      'Waterway Contamination', 'Unsegregated Waste',
    ];
    if (
      !decisions.includes(decision) ||
      (decision === 'Corrected' && !categories.includes(correctedCategory)) ||
      (notes !== undefined && (typeof notes !== 'string' || notes.length > 500))
    ) {
      return res.status(400).json({ error: 'Choose a valid photo review decision and corrected category.' });
    }
    const report = dbStore.reviewReportPhotoSuggestion(
      req.params.id,
      user.id,
      decision,
      decision === 'Corrected' ? correctedCategory : undefined,
      typeof notes === 'string' ? notes : undefined,
    );
    if (!report) return res.status(404).json({ error: 'Report or AI photo suggestion not found.' });
    res.json(report);
  });

  app.post('/api/reports/:id/reopen-decision', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || (user.role !== 'SYSTEM_ADMIN' &&
        (user.role !== 'BARANGAY_OFFICIAL' || !user.verifiedOfficial))) {
      return res.status(403).json({ error: 'Verified barangay official access is required.' });
    }
    const { decision, notes } = req.body && typeof req.body === 'object' ? req.body : {};
    if (!['Approved', 'Rejected'].includes(decision) ||
        typeof notes !== 'string' || notes.trim().length < 8 || notes.length > 500) {
      return res.status(400).json({ error: 'Choose a decision and provide a clear reason of at least 8 characters.' });
    }
    const report = dbStore.decideReportReopenRequest(req.params.id, user.id, decision, notes);
    if (!report) return res.status(409).json({ error: 'No pending reopen request exists for this report.' });
    res.json(report);
  });

  app.post('/api/reports/:id/upvote', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const updated = dbStore.upvoteReport(req.params.id, user.id);
    if (!updated) return res.status(404).json({ error: 'Report not found' });
    res.json(updated);
  });

  // Events
  app.get('/api/events', (req, res) => {
    const { barangayId } = req.query;
    const userId = (req as AuthenticatedRequest).appUser?.id;
    res.json(dbStore.getEvents(barangayId as string).map(event => eventView(event, userId)));
  });

  app.post('/api/events', (req, res) => {
    const evt = dbStore.createEvent(req.body);
    res.status(201).json(evt);
  });

  app.post('/api/events/:id/join', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const updated = dbStore.joinEvent(req.params.id, user.id);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(eventView(updated, user.id));
  });

  // Challenges
  app.get('/api/challenges', (req, res) => {
    const userId = (req as AuthenticatedRequest).appUser?.id;
    res.json(dbStore.getChallenges().map(challenge => challengeView(challenge, userId)));
  });

  app.post('/api/challenges/:id/join', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const updated = dbStore.joinChallenge(req.params.id, user.id);
    if (!updated) return res.status(404).json({ error: 'Challenge not found.' });
    res.json(challengeView(updated, user.id));
  });

  app.post('/api/challenges/:id/complete', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const updated = dbStore.completeChallenge(req.params.id, user.id);
    if (!updated) return res.status(404).json({ error: 'Challenge not found.' });
    res.json(challengeView(updated, user.id));
  });

  // Garbage Collection Schedules
  app.get('/api/schedules', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getSchedules(barangayId as string));
  });

  app.post('/api/schedules', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const wasteTypes = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Bulk/E-Waste'];
    const barangayId = user.role === 'SYSTEM_ADMIN' ? data.barangayId : user.barangayId;
    const barangay = dbStore.getBarangayById(barangayId);
    if (
      !barangay ||
      typeof data.dayOfWeek !== 'string' ||
      data.dayOfWeek.length > 20 ||
      typeof data.timeSlot !== 'string' ||
      !data.timeSlot.trim() ||
      data.timeSlot.length > 80 ||
      !wasteTypes.includes(data.wasteType) ||
      typeof data.instructions !== 'string' ||
      data.instructions.length > 500
    ) {
      return res.status(400).json({ error: 'Provide a valid collection day, time, waste type, and instructions.' });
    }
    const zonesCovered = Array.isArray(data.zonesCovered)
      ? data.zonesCovered.filter((zone: unknown): zone is string => typeof zone === 'string').slice(0, 30)
      : [];
    const schedule = dbStore.createSchedule({
      barangayId,
      barangayName: barangay.name,
      dayOfWeek: data.dayOfWeek.trim(),
      timeSlot: data.timeSlot.trim(),
      wasteType: data.wasteType,
      instructions: data.instructions.trim(),
      truckNo: typeof data.truckNo === 'string' ? data.truckNo.trim().slice(0, 40) : undefined,
      zoneId: typeof data.zoneId === 'string' ? data.zoneId.trim().slice(0, 80) : undefined,
      zonesCovered,
      collectionTeam: typeof data.collectionTeam === 'string' ? data.collectionTeam.trim().slice(0, 80) : undefined,
      vehicleNumber: typeof data.vehicleNumber === 'string' ? data.vehicleNumber.trim().slice(0, 40) : undefined,
    }, user.id);
    res.status(201).json(schedule);
  });

  app.patch('/api/schedules/:id', (req, res) => {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const wasteTypes = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Bulk/E-Waste'];
    if (
      (data.dayOfWeek !== undefined && (typeof data.dayOfWeek !== 'string' || data.dayOfWeek.length > 20)) ||
      (data.timeSlot !== undefined && (typeof data.timeSlot !== 'string' || !data.timeSlot.trim() || data.timeSlot.length > 80)) ||
      (data.wasteType !== undefined && !wasteTypes.includes(data.wasteType)) ||
      (data.instructions !== undefined && (typeof data.instructions !== 'string' || data.instructions.length > 500)) ||
      (data.zonesCovered !== undefined && (!Array.isArray(data.zonesCovered) || data.zonesCovered.length > 30 || data.zonesCovered.some((zone: unknown) => typeof zone !== 'string'))) ||
      (data.active !== undefined && typeof data.active !== 'boolean')
    ) {
      return res.status(400).json({ error: 'The schedule update contains invalid fields.' });
    }
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const updates = {
      ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek.trim() } : {}),
      ...(data.timeSlot !== undefined ? { timeSlot: data.timeSlot.trim() } : {}),
      ...(data.wasteType !== undefined ? { wasteType: data.wasteType } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions.trim() } : {}),
      ...(data.truckNo !== undefined ? { truckNo: typeof data.truckNo === 'string' ? data.truckNo.trim().slice(0, 40) : '' } : {}),
      ...(data.zoneId !== undefined ? { zoneId: typeof data.zoneId === 'string' ? data.zoneId.trim().slice(0, 80) : '' } : {}),
      ...(data.zonesCovered !== undefined ? { zonesCovered: data.zonesCovered.map((zone: string) => zone.trim().slice(0, 80)) } : {}),
      ...(data.collectionTeam !== undefined ? { collectionTeam: typeof data.collectionTeam === 'string' ? data.collectionTeam.trim().slice(0, 80) : '' } : {}),
      ...(data.vehicleNumber !== undefined ? { vehicleNumber: typeof data.vehicleNumber === 'string' ? data.vehicleNumber.trim().slice(0, 40) : '' } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    };
    const schedule = dbStore.updateSchedule(req.params.id, updates, user.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
    res.json(schedule);
  });

  // Personal Calendar
  app.get('/api/calendar', (req, res) => {
    const { userId, barangayId } = req.query;
    res.json(dbStore.getCalendarEvents(userId as string, barangayId as string));
  });

  app.post('/api/calendar', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const event = dbStore.addCalendarEvent({ ...req.body, userId: user.id });
    res.status(201).json(event);
  });

  // Bulk Waste Pickups
  app.get('/api/bulk-pickups', (req, res) => {
    const { userId, barangayId } = req.query;
    res.json(dbStore.getBulkPickups(userId as string, barangayId as string));
  });

  app.post('/api/bulk-pickups', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const wasteTypes = ['Large Recyclables', 'Old Appliances', 'Furniture', 'E-Waste', 'Bulk Cardboard', 'Other'];
    const preferredDate = typeof data.preferredPickupDate === 'string'
      ? new Date(`${data.preferredPickupDate}T00:00:00.000Z`)
      : null;
    const today = new Date().toISOString().slice(0, 10);
    if (
      !wasteTypes.includes(data.wasteType) ||
      typeof data.quantityDescription !== 'string' ||
      data.quantityDescription.trim().length < 2 ||
      data.quantityDescription.length > 200 ||
      typeof data.locationAddress !== 'string' ||
      data.locationAddress.trim().length < 3 ||
      data.locationAddress.length > 200 ||
      typeof data.preferredPickupDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.preferredPickupDate) ||
      !preferredDate ||
      Number.isNaN(preferredDate.getTime()) ||
      preferredDate.toISOString().slice(0, 10) !== data.preferredPickupDate ||
      data.preferredPickupDate < today
    ) {
      return res.status(400).json({ error: 'Provide a valid waste type, quantity, pickup address, and preferred date.' });
    }
    let pickupPhotoUrl: string | undefined;
    if (data.photoUrl !== undefined && data.photoUrl !== '') {
      if (typeof data.photoUrl !== 'string') return res.status(400).json({ error: 'Invalid pickup photo evidence.' });
      if (data.photoUrl.startsWith('data:')) {
        const image = inspectImageData(data.photoUrl);
        if ('error' in image || Buffer.from(image.base64, 'base64').length > 600 * 1024) {
          return res.status(415).json({ error: 'Pickup photo must be a supported image under 600 KB.' });
        }
        pickupPhotoUrl = data.photoUrl;
      } else {
        try {
          const parsed = new URL(data.photoUrl);
          if (parsed.protocol !== 'https:' || data.photoUrl.length > 2_048) throw new Error();
          pickupPhotoUrl = parsed.toString();
        } catch {
          return res.status(400).json({ error: 'Pickup photo evidence must be a valid HTTPS URL or supported image.' });
        }
      }
    }
    const item = dbStore.createBulkPickup({
      userId: user.id,
      userName: user.fullName,
      userPhone: user.phone || '',
      barangayId: user.barangayId,
      barangayName: user.barangayName,
      wasteType: data.wasteType,
      quantityDescription: data.quantityDescription.trim(),
      photoUrl: pickupPhotoUrl,
      locationAddress: data.locationAddress.trim(),
      preferredPickupDate: data.preferredPickupDate,
      notes: typeof data.notes === 'string' ? data.notes.trim().slice(0, 500) : undefined,
    });
    res.status(201).json(item);
  });

  app.post('/api/bulk-pickups/:id/status', (req, res) => {
    const { status, scheduledDate, notes, collectionTeam, vehicleNumber } =
      req.body && typeof req.body === 'object' ? req.body : {};
    const user = (req as AuthenticatedRequest).appUser;
    const statuses = ['Submitted', 'Scheduled', 'Missed', 'Collected', 'Completed', 'Cancelled'];
    if (
      !statuses.includes(status) ||
      (scheduledDate !== undefined && (typeof scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))) ||
      (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) ||
      (collectionTeam !== undefined && (typeof collectionTeam !== 'string' || collectionTeam.length > 80)) ||
      (vehicleNumber !== undefined && (typeof vehicleNumber !== 'string' || vehicleNumber.length > 40))
    ) {
      return res.status(400).json({ error: 'The pickup status update contains invalid fields.' });
    }
    if (['Collected', 'Completed', 'Missed'].includes(status) &&
        !(typeof notes === 'string' && notes.trim().length >= 8)) {
      return res.status(400).json({ error: 'Add a clear field note for collection, missed pickup, or completion.' });
    }
    if (status === 'Scheduled') {
      const parsedDate = typeof scheduledDate === 'string' ? new Date(`${scheduledDate}T00:00:00.000Z`) : new Date('invalid');
      if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== scheduledDate) {
        return res.status(400).json({ error: 'Choose a valid date for the scheduled pickup.' });
      }
    }
    const updated = dbStore.updateBulkPickupStatus(
      req.params.id,
      status,
      scheduledDate,
      user?.id || 'unknown-official',
      notes,
      collectionTeam,
      vehicleNumber,
    );
    if (!updated) return res.status(409).json({ error: 'Pickup status change is not allowed from its current state.' });
    res.json(updated);
  });

  // Businesses & Partner Organizations
  app.get('/api/businesses', (req, res) => {
    const { barangayId, category } = req.query;
    res.json(dbStore.getEcoBusinesses(barangayId as string, category as string));
  });

  app.post('/api/businesses', (req, res) => {
    const biz = dbStore.createEcoBusiness(req.body);
    res.status(201).json(biz);
  });

  app.get('/api/organizations', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getPartnerOrganizations(barangayId as string));
  });

  app.post('/api/organizations', (req, res) => {
    const org = dbStore.createPartnerOrganization(req.body);
    res.status(201).json(org);
  });

  // Family Groups
  app.get('/api/family-group/:userId', (req, res) => {
    const group = dbStore.getFamilyGroup(req.params.userId);
    res.json(group || null);
  });

  app.post('/api/family-group', (req, res) => {
    const { data, leaderUser } = req.body;
    const group = dbStore.createFamilyGroup(data, leaderUser);
    res.status(201).json(group);
  });

  // Assets, Trees, Alerts, Most Improved, Transparency
  app.get('/api/assets', (req, res) => {
    const { barangayId, category } = req.query;
    res.json(dbStore.getAssets(barangayId as string, category as string));
  });

  app.post('/api/assets', (req, res) => {
    const asset = dbStore.createAsset(req.body);
    res.status(201).json(asset);
  });

  app.get('/api/trees', (req, res) => {
    const { barangayId } = req.query;
    res.json(dbStore.getTrees(barangayId as string));
  });

  app.post('/api/trees', (req, res) => {
    const tree = dbStore.addTree(req.body);
    res.status(201).json(tree);
  });

  app.get('/api/alerts', (req, res) => {
    res.json(dbStore.getAlerts());
  });

  app.post('/api/alerts', (req, res) => {
    const alert = dbStore.createAlert(req.body);
    res.status(201).json(alert);
  });

  app.get('/api/most-improved', (req, res) => {
    res.json(dbStore.getMostImprovedBarangays());
  });

  app.get('/api/transparency/:barangayId', (req, res) => {
    res.json(dbStore.getTransparencyMetrics(req.params.barangayId));
  });

  app.post('/api/facilities/:id/reviews', (req, res) => {
    const facility = dbStore.addFacilityReview(req.params.id, req.body);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    res.json(facility);
  });

  app.post('/api/facilities/:id/status', (req, res) => {
    const facility = dbStore.updateFacilityStatus(req.params.id, req.body.status);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    res.json(facility);
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
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const barangayId = user.role === 'SYSTEM_ADMIN' && typeof req.query.barangayId === 'string'
      ? req.query.barangayId
      : user.barangayId;
    res.json(dbStore.getNotifications(barangayId, user.id));
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || !dbStore.getNotifications(user.barangayId, user.id).some(notification => notification.id === id)) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    const result = dbStore.markNotificationAsRead(id);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json(result);
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const barangayId = user.role === 'SYSTEM_ADMIN' && typeof req.body?.barangayId === 'string'
      ? req.body.barangayId
      : user.barangayId;
    dbStore.markAllNotificationsAsRead(barangayId, user.id);
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
    const { passwordHash: _, ...safeUser } = result.user;
    res.json({ ...result, user: safeUser });
  });

  app.post('/api/follow/page', (req, res) => {
    const { userId, targetPageId } = req.body;
    if (!userId || !targetPageId) {
      return res.status(400).json({ error: 'userId and targetPageId are required' });
    }
    const result = dbStore.toggleFollowPage(userId, targetPageId);
    if (!result) return res.status(404).json({ error: 'User or Page not found' });
    const { passwordHash: _, ...safeUser } = result.user;
    res.json({ ...result, user: safeUser });
  });

  app.post('/api/feed', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    const { barangayId, barangayName, content, photoUrl, wasteKg, wasteType } = req.body;
    if (!user || !content) {
      return res.status(400).json({ error: 'Authenticated author and content are required' });
    }

    const post = dbStore.createFeedPost({
      authorId: user.id,
      authorName: user.fullName,
      authorAvatar: user.avatarUrl,
      authorRole: user.role,
      barangayId: user.barangayId,
      barangayName: user.barangayName,
      content,
      photoUrl,
      wasteKg: wasteKg ? parseFloat(wasteKg) : undefined,
      wasteType,
    });
    res.status(201).json(post);
  });

  app.post('/api/feed/:id/like', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    const post = dbStore.likeFeedPost(req.params.id, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  app.post('/api/feed/:id/comment', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    const { content } = req.body;
    if (!user || !content) return res.status(400).json({ error: 'Authenticated author and content are required.' });
    const post = dbStore.addFeedComment(req.params.id, {
      authorId: user.id,
      authorName: user.fullName,
      authorAvatar: user.avatarUrl,
      content,
    });
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
    const quantity = typeof kg === 'number' ? kg : Number(kg);
    if (!userId || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000 ||
        typeof wasteType !== 'string' || !wasteType.trim()) {
      return res.status(400).json({ error: 'A positive weight up to 1,000 kg and a waste type are required.' });
    }
    let safePhotoUrl: string | undefined;
    if (photoUrl !== undefined && photoUrl !== '') {
      if (typeof photoUrl !== 'string') return res.status(400).json({ error: 'Invalid photo evidence.' });
      if (photoUrl.startsWith('data:')) {
        const image = inspectImageData(photoUrl);
        if ('error' in image || Buffer.from(image.base64, 'base64').length > 600 * 1024) {
          return res.status(415).json({ error: 'Photo must be a supported image under 600 KB.' });
        }
        safePhotoUrl = photoUrl;
      } else {
        try {
          const parsed = new URL(photoUrl);
          if (parsed.protocol !== 'https:' || photoUrl.length > 2_048) throw new Error();
          safePhotoUrl = parsed.toString();
        } catch {
          return res.status(400).json({ error: 'Photo evidence must be a valid HTTPS URL or supported image.' });
        }
      }
    }
    const updatedUser = dbStore.logWasteRecycled(userId, quantity, wasteType.trim().slice(0, 80), safePhotoUrl, autoPostToFeed === true);
    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ success: true, user: safeUser });
  });

  // Activity logs
  app.get('/api/activity-logs', (req, res) => {
    const { userId } = req.query;
    res.json(dbStore.getActivityLogs(userId as string));
  });

  app.get('/api/activity-logs/pending', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || (user.role !== 'SYSTEM_ADMIN' &&
        (user.role !== 'BARANGAY_OFFICIAL' || !user.verifiedOfficial))) {
      return res.status(403).json({ error: 'Verified barangay official access is required.' });
    }
    const barangayId = user.role === 'SYSTEM_ADMIN' && typeof req.query.barangayId === 'string'
      ? req.query.barangayId
      : user.barangayId;
    if (user.role === 'BARANGAY_OFFICIAL' && req.query.barangayId !== user.barangayId) {
      return res.status(403).json({ error: 'You may only review recycling activity in your assigned barangay.' });
    }
    res.json(dbStore.getPendingEcoActivities(barangayId).map(activity => ({
      ...activity,
      residentName: dbStore.getUserById(activity.userId)?.fullName || 'Resident',
      userId: undefined,
    })));
  });

  app.post('/api/activity-logs/:id/review', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || (user.role !== 'SYSTEM_ADMIN' &&
        (user.role !== 'BARANGAY_OFFICIAL' || !user.verifiedOfficial))) {
      return res.status(403).json({ error: 'Verified barangay official access is required.' });
    }
    const { status, pointsAwarded, notes } = req.body && typeof req.body === 'object' ? req.body : {};
    if (
      !['Verified', 'Rejected'].includes(status) ||
      !Number.isInteger(pointsAwarded) ||
      pointsAwarded < 0 ||
      pointsAwarded > 50 ||
      typeof notes !== 'string' ||
      notes.trim().length < 8 ||
      notes.length > 500 ||
      (status === 'Rejected' && pointsAwarded !== 0)
    ) {
      return res.status(400).json({ error: 'Choose a decision, enter a clear reason, and award 0–50 points only for verified activity.' });
    }
    const activity = dbStore.getActivityLogs().find(item => item.id === req.params.id);
    const resident = activity ? dbStore.getUserById(activity.userId) : undefined;
    if (!resident) return res.status(404).json({ error: 'Activity or resident not found.' });
    if (user.role === 'BARANGAY_OFFICIAL' && resident.barangayId !== user.barangayId) {
      return res.status(403).json({ error: 'You may only review activity in your assigned barangay.' });
    }
    const reviewed = dbStore.reviewEcoActivity(req.params.id, user.id, status, pointsAwarded, notes);
    if (!reviewed) return res.status(409).json({ error: 'The activity was not found or has already been reviewed.' });
    res.json(reviewed);
  });

  app.post('/api/education/segregation-quiz', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user) return res.status(401).json({ error: 'Authentication is required.' });
    if (req.body?.answerIndex !== 1) {
      return res.status(400).json({ error: 'The submitted quiz answer is incorrect.' });
    }
    const activity = dbStore.submitSegregationQuiz(user.id);
    if (!activity) return res.status(409).json({ error: 'This quiz has already been submitted for review.' });
    res.status(201).json(activity);
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
    res.json(dbStore.getUsers().map(({ passwordHash: _, ...user }) => ({
      ...user,
      ...(isBootstrapSystemAdmin(
        user.email,
        user.firebaseUid,
        process.env.SYSTEM_ADMIN_EMAIL,
        process.env.SYSTEM_ADMIN_UID,
        Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
      )
        ? { role: 'SYSTEM_ADMIN' as const, verifiedOfficial: false }
        : {}),
    })));
  });

  app.get('/api/official/account-summary', (req, res) => {
    const user = (req as AuthenticatedRequest).appUser;
    if (!user || (user.role !== 'SYSTEM_ADMIN' &&
        (user.role !== 'BARANGAY_OFFICIAL' || !user.verifiedOfficial))) {
      return res.status(403).json({ error: 'Verified barangay official access is required.' });
    }

    const users = dbStore.getUsers().filter(account => account.barangayId === user.barangayId);
    return res.json({
      registeredAccounts: users.length,
      residentAccounts: users.filter(account => account.role === 'RESIDENT').length,
    });
  });

  app.post('/api/admin/users/:id/official-access', (req, res) => {
    const { decision } = req.body as { decision?: unknown };
    if (decision !== 'Approved' && decision !== 'Rejected') {
      return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
    }

    const user = dbStore.getUserById(req.params.id);
    if (
      !user ||
      user.role !== 'RESIDENT' ||
      user.officialAccessRequest?.status !== 'Pending' ||
      user.officialAccessRequest.barangayId !== user.barangayId
    ) {
      return res.status(404).json({ error: 'Pending official access request not found.' });
    }

    const updated = dbStore.updateUser(user.id, {
      role: decision === 'Approved' ? 'BARANGAY_OFFICIAL' : 'RESIDENT',
      verifiedOfficial: decision === 'Approved',
      officialAccessRequest: { ...user.officialAccessRequest, status: decision },
    });
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    const { passwordHash: _, ...safeUser } = updated;
    return res.json(safeUser);
  });

  if (options.serveFrontend) {
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
  }

  return app;
}

async function startServer() {
  const app = await createApp({ serveFrontend: true });
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EcoBarangay] Full-stack Server listening at http://localhost:${PORT}`);
  });
}

if (process.env.NETLIFY !== 'true') {
  startServer().catch(error => {
    console.error('EcoBarangay failed to start:', error);
    process.exitCode = 1;
  });
}
