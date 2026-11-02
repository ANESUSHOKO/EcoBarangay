import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_REPORTS } from './initialData';
import { getReportResolutionMetrics } from '../lib/reportTransparency';

test('resolution metrics return unknown values when reports are unavailable', () => {
  const metrics = getReportResolutionMetrics([], new Date('2026-10-01T00:00:00.000Z'));

  assert.equal(metrics.reportingPeriod.start, null);
  assert.equal(metrics.reportingPeriod.end, null);
  assert.equal(metrics.medianResolutionHours, null);
  assert.equal(metrics.reopenRequestRate, null);
});

test('resolution metrics use recorded status history and report the reporting period', () => {
  const report = {
    ...INITIAL_REPORTS[0],
    createdAt: '2026-09-01T00:00:00.000Z',
    status: 'Resolved' as const,
    statusHistory: [{
      status: 'Resolved' as const,
      changedAt: '2026-09-02T12:00:00.000Z',
      changedBy: 'official-1',
    }],
    reopenRequest: {
      residentAnswer: 'NO' as const,
      requestedAt: '2026-09-03T00:00:00.000Z',
      status: 'Pending' as const,
    },
  };
  const metrics = getReportResolutionMetrics([report], new Date('2026-10-01T00:00:00.000Z'));

  assert.equal(metrics.reportingPeriod.start, '2026-09-01');
  assert.equal(metrics.reportingPeriod.end, '2026-09-01');
  assert.equal(metrics.medianResolutionHours, 36);
  assert.equal(metrics.reopenRequests, 1);
  assert.equal(metrics.reopenRequestRate, 100);
});
