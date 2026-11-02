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
  current: ReportStatus,
  next: ReportStatus,
  reopenRequested = false,
): boolean {
  return REPORT_TRANSITIONS[current].includes(next) ||
    (current === 'Resolved' && next === 'In Progress' && reopenRequested);
}

export function findPotentialDuplicateReports(
  candidate: Pick<EnvironmentalReport, 'category' | 'barangayId' | 'lat' | 'lng'>,
  reports: EnvironmentalReport[],
  now = new Date(),
  radiusMeters = 50,
  lookbackDays = 7,
): EnvironmentalReport[] {
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  return reports.filter(report => {
    if (
      report.barangayId !== candidate.barangayId ||
      report.category !== candidate.category ||
      report.status === 'Rejected' ||
      new Date(report.createdAt).getTime() < cutoff
    ) {
      return false;
    }

    return getDistanceMeters(candidate.lat, candidate.lng, report.lat, report.lng) <= radiusMeters;
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
