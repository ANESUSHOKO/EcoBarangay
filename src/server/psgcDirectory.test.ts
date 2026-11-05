import assert from 'node:assert/strict';
import test from 'node:test';
import { staticLocationResponse } from '../../netlify/functions/api';
import { psgcDirectory } from './psgcDirectory';

function responseBody(response: { body?: string } | null) {
  assert.ok(response?.body);
  return JSON.parse(response.body);
}

test('location endpoints serve the official PSGC hierarchy', () => {
  const regions = psgcDirectory.getRegions();
  assert.equal(regions.length, 17);
  assert.ok(regions.some(region => region.code === 'PH13' && region.name.includes('National Capital Region')));

  const provinces = psgcDirectory.getProvinces('PH13');
  assert.ok(provinces.some(province => province.code === 'PH1307403' && province.name === 'City of Pasig'));

  const cities = psgcDirectory.getCities('PH1307403');
  assert.deepEqual(cities.map(city => city.name), ['City of Pasig']);

  const barangays = psgcDirectory.getBarangays({ cityCode: 'PH1307403' });
  assert.equal(barangays.length, 30);
  assert.ok(barangays.some(barangay => barangay.name === 'Bagong Ilog'));
});

test('Netlify static location responses return PSGC records when Firebase is unavailable', () => {
  const regions = staticLocationResponse('GET', '/api/locations/regions');
  assert.equal(regions?.statusCode, 200);
  assert.equal(responseBody(regions).length, 17);

  const barangays = staticLocationResponse('GET', '/api/locations/barangays?cityCode=PH1307403');
  assert.equal(responseBody(barangays).length, 30);

  const netlifyStyleBarangays = staticLocationResponse(
    'GET',
    '/api/locations/barangays',
    null,
    { cityCode: 'PH1307403' },
  );
  assert.equal(responseBody(netlifyStyleBarangays).length, 30);

  const regionBarangays = staticLocationResponse('GET', '/api/locations/barangays?regionCode=PH13');
  const regionRecords = responseBody(regionBarangays);
  assert.equal(regionRecords.length, 100);
  assert.ok(regionRecords.every((barangay: { regionCode: string }) => barangay.regionCode === 'PH13'));

  const location = psgcDirectory.getBarangays({ cityCode: 'PH1307403' })[0];
  const nearest = staticLocationResponse(
    'POST',
    '/api/locations/detect-nearest',
    JSON.stringify({ lat: location.lat, lng: location.lng }),
  );
  const result = responseBody(nearest);
  assert.equal(result.success, true);
  assert.equal(result.nearestBarangay.id, location.id);
  assert.equal(result.distanceKm, 0);

  const invalidCoordinates = staticLocationResponse(
    'POST',
    '/api/locations/detect-nearest',
    JSON.stringify({ lat: 100, lng: 121 }),
  );
  assert.equal(invalidCoordinates?.statusCode, 400);
});
