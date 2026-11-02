import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_BARANGAYS } from './initialData';
import { updateRankingHistory } from './rankingHistory';

test('ranking history replaces the same-day snapshot and retains the top 100', () => {
  const firstTime = new Date('2026-04-04T10:00:00.000Z');
  const first = updateRankingHistory([], INITIAL_BARANGAYS, firstTime);
  const updatedBarangays = INITIAL_BARANGAYS.map((barangay, index) =>
    index === 0
      ? { ...barangay, score: { ...barangay.score, totalScore: barangay.score.totalScore + 1 } }
      : barangay,
  );
  const second = updateRankingHistory(first, updatedBarangays, new Date('2026-04-04T12:00:00.000Z'));

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(second[0].id, 'rankings-2026-04-04');
  assert.equal(second[0].generatedAt, '2026-04-04T12:00:00.000Z');
  assert.ok(second[0].entries.length <= 100);
  assert.equal(
    second[0].entries[0].dataStatus,
    'Recorded; not independently verified',
  );
});

test('ranking history retains at most 365 daily snapshots', () => {
  const now = new Date('2026-12-31T12:00:00.000Z');
  const existing = Array.from({ length: 366 }, (_, index) => {
    const date = new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      id: `rankings-${date}`,
      snapshotDate: date,
      generatedAt: `${date}T12:00:00.000Z`,
      reportingPeriod: { start: date, end: date },
      entries: [],
    };
  });
  const snapshots = updateRankingHistory(existing, [], now);

  assert.equal(snapshots.length, 365);
  assert.equal(snapshots[0].snapshotDate, '2026-12-31');
  assert.equal(snapshots.at(-1)?.snapshotDate, '2026-01-01');
});
