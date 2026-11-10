import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentalReport } from '../types';
import { canTransitionReportStatus, findPotentialDuplicateReports } from './reportWorkflow';

function report(overrides: Partial<EnvironmentalReport> = {}): EnvironmentalReport {
  return {
    id: 'report-1',
    category: 'Illegal Dumping',
    description: 'Waste dumped by the roadside',
    locationAddress: 'Main Road',
    lat: 14.5995,
    lng: 120.9842,
    barangayId: 'brgy-1',
    barangayName: 'Sample',
    cityName: 'Manila',
    reporterId: 'resident-1',
    reporterName: 'Resident',
    status: 'Pending',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

test('report status transitions follow the operational lifecycle', () => {
  assert.equal(canTransitionReportStatus('Pending', 'Under Review'), true);
  assert.equal(canTransitionReportStatus('Under Review', 'Assigned'), true);
  assert.equal(canTransitionReportStatus('Assigned', 'In Progress'), true);
  assert.equal(canTransitionReportStatus('In Progress', 'Resolved'), true);
  assert.equal(canTransitionReportStatus('Resolved', 'In Progress'), false);
  assert.equal(canTransitionReportStatus('Resolved', 'In Progress', true), true);
  assert.equal(canTransitionReportStatus('Rejected', 'In Progress', true), false);
  assert.equal(canTransitionReportStatus(undefined, 'Under Review'), false);
});

test('duplicate detection is a non-blocking same-category, same-barangay, 50m/7-day check', () => {
  const now = new Date('2026-06-07T00:00:00.000Z');
  const nearby = report({ createdAt: '2026-06-06T00:00:00.000Z' });
  const farAway = report({ id: 'report-far', lat: 14.61 });
  const old = report({ id: 'report-old', createdAt: '2026-05-30T00:00:00.000Z' });
  const otherCategory = report({ id: 'report-other-category', category: 'Missed Collection' });
  const rejected = report({ id: 'report-rejected', status: 'Rejected' });

  const duplicates = findPotentialDuplicateReports(
    { category: 'Illegal Dumping', barangayId: 'brgy-1', lat: 14.5995, lng: 120.9842 },
    [nearby, farAway, old, otherCategory, rejected],
    now,
  );

  assert.deepEqual(duplicates.map(item => item.id), ['report-1']);
  assert.deepEqual(
    findPotentialDuplicateReports({ id: 'report-1', category: 'Illegal Dumping', barangayId: 'brgy-1', lat: 14.5995, lng: 120.9842 }, [nearby, report({ id: 'report-1' })], now),
    [],
  );
});
