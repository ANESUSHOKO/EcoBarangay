import type { Handler, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';
import { psgcDirectory } from '../../src/server/psgcDirectory';

const functionPrefix = '/.netlify/functions/api';
let appHandlerPromise: Promise<ReturnType<typeof serverless>> | undefined;

function normalizedPath(eventPath: string): string {
  return eventPath.startsWith(functionPrefix)
    ? `/api${eventPath.slice(functionPrefix.length)}`
    : eventPath;
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  cacheControl = 'public, max-age=3600, stale-while-revalidate=86400',
): HandlerResponse {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': cacheControl,
    },
    body: JSON.stringify(body),
  };
}

export function staticLocationResponse(
  method: string,
  requestPath: string,
  requestBody?: string | null,
  requestQuery?: Record<string, string | undefined> | null,
): HandlerResponse | null {
  const url = new URL(requestPath, 'https://ecobarangay.invalid');
  for (const [key, value] of Object.entries(requestQuery || {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const { pathname, searchParams } = url;
  const isLocationRoute = pathname.startsWith('/api/locations/');
  if (!isLocationRoute) return null;

  if (method === 'GET' && pathname === '/api/locations/regions') {
    return jsonResponse(200, psgcDirectory.getRegions());
  }
  if (method === 'GET' && pathname === '/api/locations/provinces') {
    return jsonResponse(200, psgcDirectory.getProvinces(searchParams.get('regionCode') || undefined));
  }
  if (method === 'GET' && pathname === '/api/locations/cities') {
    return jsonResponse(200, psgcDirectory.getCities(
      searchParams.get('provinceCode') || undefined,
      searchParams.get('regionCode') || undefined,
    ));
  }
  if (method === 'GET' && pathname === '/api/locations/barangays') {
    return jsonResponse(200, psgcDirectory.getBarangays({
      cityCode: searchParams.get('cityCode') || undefined,
      provinceCode: searchParams.get('provinceCode') || undefined,
      regionCode: searchParams.get('regionCode') || undefined,
      search: searchParams.get('search') || undefined,
    }));
  }

  const barangayIdMatch = pathname.match(/^\/api\/locations\/barangays\/([^/]+)$/);
  if (method === 'GET' && barangayIdMatch) {
    const barangay = psgcDirectory.getBarangayById(decodeURIComponent(barangayIdMatch[1]));
    return barangay
      ? jsonResponse(200, barangay)
      : jsonResponse(404, { error: 'Barangay not found.' });
  }

  if (method === 'POST' && pathname === '/api/locations/detect-nearest') {
    let coordinates: { lat?: unknown; lng?: unknown };
    try {
      coordinates = JSON.parse(requestBody || '{}') as { lat?: unknown; lng?: unknown };
    } catch {
      return jsonResponse(400, { error: 'Latitude and longitude must be valid JSON values.' });
    }
    const { lat, lng } = coordinates;
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      return jsonResponse(400, { error: 'Valid latitude and longitude are required.' });
    }
    const nearest = psgcDirectory.findNearestBarangay(lat, lng);
    return nearest
      ? jsonResponse(200, { success: true, ...nearest }, 'no-store')
      : jsonResponse(404, { error: 'No barangay location data is available.' });
  }

  return jsonResponse(405, { error: 'This location endpoint does not support the requested method.' });
}

function loadAppHandler() {
  // Import lazily so configuration errors (e.g. missing Firebase credentials)
  // surface as a JSON error response instead of crashing the function runtime.
  appHandlerPromise ??= import('../../server')
    .then(({ createApp }) => createApp())
    .then(app => serverless(app))
    .catch(error => {
      appHandlerPromise = undefined;
      throw error;
    });
  return appHandlerPromise;
}

export const handler: Handler = async (event, context) => {
  const path = normalizedPath(event.path);
  const hasFirebaseAdminCredentials = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIRESTORE_EMULATOR_HOST,
  );
  if (!hasFirebaseAdminCredentials) {
    const locationResponse = staticLocationResponse(event.httpMethod, path, event.body, event.queryStringParameters);
    if (locationResponse) return locationResponse;
    return jsonResponse(
      503,
      { error: 'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT for the deployed API.' },
      'no-store',
    );
  }

  let appHandler: ReturnType<typeof serverless>;
  try {
    appHandler = await loadAppHandler();
  } catch (error) {
    console.error('EcoBarangay API failed to initialize:', error);
    const locationResponse = staticLocationResponse(event.httpMethod, path, event.body, event.queryStringParameters);
    if (locationResponse) return locationResponse;
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'The API is not configured correctly. Check the function logs for details.',
      }),
    };
  }

  const response = await appHandler({ ...event, path }, context) as HandlerResponse;
  if (response.statusCode === 503) {
    const locationResponse = staticLocationResponse(event.httpMethod, path, event.body, event.queryStringParameters);
    if (locationResponse) return locationResponse;
  }
  return response;
};
