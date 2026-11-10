import { Barangay, RankingSnapshot } from '../types';

const SNAPSHOT_RETENTION_DAYS = 365;
const MAX_RANKED_BARANGAYS_PER_SNAPSHOT = 100;

export function updateRankingHistory(
  existing: RankingSnapshot[],
  rankedBarangays: Barangay[],
  now = new Date(),
): RankingSnapshot[] {
  const snapshotDate = now.toISOString().slice(0, 10);
  const safeExisting = Array.isArray(existing) ? existing : [];
  const entries = (Array.isArray(rankedBarangays) ? rankedBarangays : [])
    .filter(barangay => barangay && typeof barangay === 'object' && Number.isFinite(barangay.score?.totalScore) && barangay.score.totalScore > 0)
    .slice(0, MAX_RANKED_BARANGAYS_PER_SNAPSHOT)
    .map(barangay => ({
    barangayId: barangay.id,
    barangayName: barangay.name,
    cityName: barangay.cityName,
    provinceName: barangay.provinceName,
    nationalRank: barangay.score.nationalRank || 0,
    population: barangay.population,
    score: { ...barangay.score },
    dataStatus: 'Recorded; not independently verified' as const,
    }));
  const snapshot: RankingSnapshot = {
    id: `rankings-${snapshotDate}`,
    snapshotDate,
    generatedAt: now.toISOString(),
    reportingPeriod: { start: snapshotDate, end: snapshotDate },
    entries,
  };
  const snapshots = [...safeExisting.filter(item => item.snapshotDate !== snapshotDate), snapshot]
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate));
  return snapshots.slice(0, SNAPSHOT_RETENTION_DAYS);
}
