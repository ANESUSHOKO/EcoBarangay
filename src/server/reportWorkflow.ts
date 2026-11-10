import { EnvironmentalReport, ReportStatus } from '../types';

const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  Pending: ['Under Review', 'In Progress', 'Rejected'],
  'Under Review': ['Assigned', 'In Progress', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: [],
  Rejected: [],
};

export function canTransitionReportStatus(
  current: ReportStatus | undefined,
  next: ReportStatus | undefined,
  reopenRequested = false,
): boolean {
  if (!current || !next) return false;
  const transitions = REPORT_TRANSITIONS[current] ?? [];
  return transitions.includes(next) ||
    (current === 'Resolved' && next === 'In Progress' && reopenRequested);
}

export function findPotentialDuplicateReports(
  candidate: Pick<EnvironmentalReport, 'category' | 'barangayId' | 'lat' | 'lng'> & { id?: string },
  reports: EnvironmentalReport[],
  now = new Date(),
  radiusMeters = 50,
  lookbackDays = 7,
): EnvironmentalReport[] {
  if (!candidate || typeof candidate !== 'object' || !Array.isArray(reports)) return [];

  const candidateLat = Number(candidate.lat);
  const candidateLng = Number(candidate.lng);
  if (!Number.isFinite(candidateLat) || !Number.isFinite(candidateLng)) return [];

  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  return reports.filter(report => {
    if (!report || typeof report !== 'object') return false;
    if (report.id && candidate.id && report.id === candidate.id) return false;
    if (
      report.barangayId !== candidate.barangayId ||
      report.category !== candidate.category ||
      report.status === 'Rejected' ||
      typeof report.createdAt !== 'string' ||
      new Date(report.createdAt).getTime() < cutoff
    ) {
      return false;
    }

    const reportLat = Number(report.lat);
    const reportLng = Number(report.lng);
    if (!Number.isFinite(reportLat) || !Number.isFinite(reportLng)) return false;

    return getDistanceMeters(candidateLat, candidateLng, reportLat, reportLng) <= radiusMeters;
  });
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
