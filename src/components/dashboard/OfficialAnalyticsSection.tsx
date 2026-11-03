import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import { Barangay, EnvironmentalReport } from '../../types';

interface OfficialAnalyticsSectionProps {
  currentBarangay: Barangay;
  reports: EnvironmentalReport[];
  reportsLoaded: boolean;
  reportsLoadError: boolean;
  accountSummary: { registeredAccounts: number; residentAccounts: number } | null;
  accountSummaryError: boolean;
}

const REPORT_STATUSES = ['Pending', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'] as const;

export const OfficialAnalyticsSection: React.FC<OfficialAnalyticsSectionProps> = ({
  currentBarangay,
  reports,
  reportsLoaded,
  reportsLoadError,
  accountSummary,
  accountSummaryError,
}) => {
  const reportCounts = useMemo(
    () => Object.fromEntries(REPORT_STATUSES.map(status => [
      status,
      reports.filter(report => report.status === status).length,
    ])) as Record<typeof REPORT_STATUSES[number], number>,
    [reports],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach(report => counts.set(report.category, (counts.get(report.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);
  const resolvedReports = reportCounts.Resolved;
  const resolutionRate = reports.length > 0
    ? Math.round((resolvedReports / reports.length) * 100)
    : null;

  return (
    <section className="space-y-5" aria-labelledby="official-results-heading">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <h2 id="official-results-heading" className="text-lg font-bold text-slate-900 dark:text-white">
          Barangay Results & Account Overview
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Current recorded figures for Brgy. {currentBarangay.name}. Report counts reflect submitted reports; rankings and totals are not independently audited.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Registered resident accounts"
            value={accountSummary ? accountSummary.residentAccounts.toLocaleString() : accountSummaryError ? 'Unavailable' : 'Loading'}
            detail={accountSummary ? `${accountSummary.registeredAccounts.toLocaleString()} total accounts assigned to this barangay` : accountSummaryError ? 'Account summary could not be loaded' : 'Loading account summary'}
          />
          <MetricCard icon={<Users className="h-4 w-4" />} label="Recorded population" value={currentBarangay.population.toLocaleString()} detail="Population in barangay record" />
          <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Environmental reports" value={!reportsLoaded ? 'Loading' : reportsLoadError ? 'Unavailable' : reports.length.toLocaleString()} detail="Reports recorded for this barangay" />
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Resolved reports" value={!reportsLoaded ? 'Loading' : reportsLoadError ? 'Unavailable' : resolvedReports.toLocaleString()} detail={!reportsLoaded ? 'Loading report data' : reportsLoadError ? 'Report data unavailable' : resolutionRate === null ? 'No reports recorded' : `${resolutionRate}% of recorded reports`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white">Report status breakdown</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current status counts from the barangay report list.</p>
          {!reportsLoaded ? (
            <p className="mt-5 text-sm text-slate-500">Loading report analysis…</p>
          ) : reportsLoadError ? (
            <p role="alert" className="mt-5 text-sm text-rose-700 dark:text-rose-300">Report analysis is unavailable because report data could not be loaded.</p>
          ) : reports.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">No environmental reports have been recorded for this barangay.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {REPORT_STATUSES.filter(status => reportCounts[status] > 0).map(status => (
                <div key={status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    {status === 'Resolved' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                      status === 'Rejected' ? <Clock className="h-4 w-4 text-slate-500" /> :
                        <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    {status}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{reportCounts[status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white">Most reported categories</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Counts are based on reports currently recorded; they are not population-adjusted.</p>
          {!reportsLoaded ? (
            <p className="mt-5 text-sm text-slate-500">Loading report analysis…</p>
          ) : reportsLoadError ? (
            <p role="alert" className="mt-5 text-sm text-rose-700 dark:text-rose-300">Category analysis is unavailable because report data could not be loaded.</p>
          ) : categoryCounts.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">No report categories are available yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {categoryCounts.map(([category, count]) => (
                <li key={category} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800">
                  <span className="text-slate-700 dark:text-slate-200">{category}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, detail }) => (
  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
    </div>
    <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{value}</div>
    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
  </div>
);
