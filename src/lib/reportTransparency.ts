import { EnvironmentalReport } from '../types';

export interface ReportResolutionMetrics {
  generatedAt: string;
  reportingPeriod: { start: string | null; end: string | null };
  medianResolutionHours: number | null;
  reopenRequests: number;
  reopenRequestRate: number | null;
}

export function getReportResolutionMetrics(
  reports: EnvironmentalReport[],
  now = new Date(),
): ReportResolutionMetrics {
  const createdTimes = reports
    .map(report => Date.parse(report.createdAt))
    .filter(timestamp => Number.isFinite(timestamp));
  const resolutionHours = reports.flatMap(report => {
    if (report.status !== 'Resolved') return [];
    const resolutionChange = [...(report.statusHistory || [])]
      .reverse()
      .find(change => change.status === 'Resolved');
    const createdAt = Date.parse(report.createdAt);
    const resolvedAt = Date.parse(
      resolutionChange?.changedAt || report.resolvedAt || report.resolutionDate || '',
    );
    if (!Number.isFinite(createdAt) || !Number.isFinite(resolvedAt) || resolvedAt < createdAt) return [];
    return [(resolvedAt - createdAt) / (60 * 60 * 1000)];
  }).sort((a, b) => a - b);
  const middle = Math.floor(resolutionHours.length / 2);
  const medianHours = resolutionHours.length === 0
    ? null
    : resolutionHours.length % 2 === 0
      ? (resolutionHours[middle - 1] + resolutionHours[middle]) / 2
      : resolutionHours[middle];
  const reopenRequests = reports.filter(report => Boolean(report.reopenRequest)).length;

  return {
    generatedAt: now.toISOString(),
    reportingPeriod: {
      start: createdTimes.length
        ? new Date(createdTimes.reduce((earliest, timestamp) => Math.min(earliest, timestamp))).toISOString().slice(0, 10)
        : null,
      end: createdTimes.length
        ? new Date(createdTimes.reduce((latest, timestamp) => Math.max(latest, timestamp))).toISOString().slice(0, 10)
        : null,
    },
    medianResolutionHours: medianHours === null ? null : Math.round(medianHours * 10) / 10,
    reopenRequests,
    reopenRequestRate: reports.length ? Math.round((reopenRequests / reports.length) * 1000) / 10 : null,
  };
}
