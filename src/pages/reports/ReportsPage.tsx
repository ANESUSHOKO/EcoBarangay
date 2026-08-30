import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { EnvironmentalReport, Barangay, User, Language, ReportCategory } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { EnvironmentalReportForm, POPULAR_TAGS } from './EnvironmentalReportForm';
import { ReportCard } from './ReportCard';
import {
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Tag,
  Filter,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  Flame,
  Droplets,
  AlertOctagon,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface ReportsPageProps {
  currentBarangay: Barangay;
  currentUser: User | null;
  lang?: Language;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  currentBarangay,
  currentUser,
  lang = 'en',
}) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form display states
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showModalForm, setShowModalForm] = useState(false);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'In Progress' | 'Resolved'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchReports();
  }, [currentBarangay.id]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(currentBarangay.id);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportCreated = (newReport: EnvironmentalReport) => {
    setReports(prev => [newReport, ...prev]);
    setIsFormExpanded(false);
    setShowModalForm(false);
  };

  // Tag filter trigger from report card or tag cloud
  const handleTagClick = (tag: string) => {
    if (selectedTagFilter === tag) {
      setSelectedTagFilter(null);
    } else {
      setSelectedTagFilter(tag);
    }
  };

  // Compute Metrics Summary
  const metrics = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Pending').length;
    const inProgress = reports.filter(r => r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, pending, inProgress, resolved, resolutionRate };
  }, [reports]);

  // Filtered Reports calculation
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) {
        return false;
      }

      // Tag filter
      if (selectedTagFilter) {
        if (!r.tags || !r.tags.includes(selectedTagFilter)) {
          return false;
        }
      }

      // Search query (matches description, address, reporter, tags, category)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchAddr = r.locationAddress?.toLowerCase().includes(q);
        const matchLandmark = r.landmark?.toLowerCase().includes(q);
        const matchCat = r.category?.toLowerCase().includes(q);
        const matchReporter = r.reporterName?.toLowerCase().includes(q);
        const matchTags = r.tags?.some(t => t.toLowerCase().includes(q));

        if (!matchDesc && !matchAddr && !matchLandmark && !matchCat && !matchReporter && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [reports, statusFilter, categoryFilter, urgencyFilter, selectedTagFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    urgencyFilter !== 'ALL' ||
    selectedTagFilter !== null;

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setUrgencyFilter('ALL');
    setSelectedTagFilter(null);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-amber-600/10 via-emerald-600/5 to-transparent p-6 sm:p-8 rounded-3xl border border-amber-200/60 dark:border-slate-800">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Civic Environmental Watch & Hotline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('reportsHeading')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Report illegal dumping, blocked waterways, or hazardous waste in{' '}
            <strong className="text-slate-900 dark:text-white">
              Brgy. {currentBarangay.name}, {currentBarangay.cityName}
            </strong>
            . Citizens receive +30 Eco Points for verified reports complying with Republic Act 9003.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="px-5 py-3 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isFormExpanded ? 'Hide Document Form' : 'Document Concern (Form)'}</span>
            {isFormExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Barangay Reports
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logged incidents</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending Triage</span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {metrics.pending}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting inspection</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>In Progress</span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {metrics.inProgress}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">LGU crew deployed</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved / Cleaned</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.resolved}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            {metrics.resolutionRate}% resolution rate
          </div>
        </div>
      </div>

      {/* Embedded In-Page Form (Expandable) */}
      {isFormExpanded && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <EnvironmentalReportForm
            currentBarangay={currentBarangay}
            currentUser={currentUser}
            lang={lang}
            onReportCreated={handleReportCreated}
            onCancel={() => setIsFormExpanded(false)}
          />
        </div>
      )}

      {/* Search, Tag Bar & Multi-Filters */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports by keyword, description, tag, street address, or reporter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Illegal Dumping">Illegal Dumping</option>
              <option value="Clogged Drainage">Clogged Drainage / Canal</option>
              <option value="Overflowing Bin">Overflowing Public Bin</option>
              <option value="Missed Collection">Missed Collection</option>
              <option value="Open Burning (Siga)">Open Burning (Siga)</option>
              <option value="Hazardous Waste">Hazardous Waste</option>
              <option value="Plastic Pollution">Plastic Pollution</option>
              <option value="Waterway Contamination">Waterway Contamination</option>
            </select>

            {/* Urgency Dropdown */}
            <select
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Urgency Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'ALL', label: 'All Reports', count: metrics.total },
              { key: 'Pending', label: 'Pending Triage', count: metrics.pending },
              { key: 'In Progress', label: 'In Progress', count: metrics.inProgress },
              { key: 'Resolved', label: 'Resolved', count: metrics.resolved },
            ].map(tab => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    statusFilter === tab.key
                      ? 'bg-white/20 dark:bg-slate-900/20'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing <strong>{filteredReports.length}</strong> of {reports.length} reports
          </div>
        </div>

        {/* Categorical Tag Quick Filter Chips */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Filter by Categorical Tag:
            </span>
            {selectedTagFilter && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                (Filtering by {selectedTagFilter})
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TAGS.map(tag => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reports Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            currentUser={currentUser}
            onTagClick={handleTagClick}
            lang={lang}
          />
        ))}

        {/* Empty State */}
        {filteredReports.length === 0 && !loading && (
          <div className="col-span-1 md:col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              No matching environmental reports found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try resetting the search keywords, categorical tags, or status filters.'
                : `No reports logged in Brgy. ${currentBarangay.name} yet. Be the first resident to document a concern!`}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFormExpanded(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Document New Concern</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Form (Alternative Trigger) */}
      {showModalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <EnvironmentalReportForm
              currentBarangay={currentBarangay}
              currentUser={currentUser}
              lang={lang}
              onReportCreated={handleReportCreated}
              onCancel={() => setShowModalForm(false)}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
