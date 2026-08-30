import React, { useState } from 'react';
import { EnvironmentalReport, User, Language } from '../../types';
import { api } from '../../lib/api';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Layers,
  Tag,
  ThumbsUp,
  ShieldCheck,
  Compass,
  FileText,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ReportCardProps {
  report: EnvironmentalReport;
  currentUser: User | null;
  onTagClick?: (tag: string) => void;
  lang?: Language;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  currentUser,
  onTagClick,
}) => {
  const [upvotes, setUpvotes] = useState(report.upvotesCount || 1);
  const [hasUpvoted, setHasUpvoted] = useState(
    currentUser ? (report.upvotedUserIds || []).includes(currentUser.id) : false
  );
  const [upvoting, setUpvoting] = useState(false);
  const [expandedText, setExpandedText] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleToggleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);

    const userKey = currentUser ? currentUser.id : 'guest-me-too';
    try {
      const updated = await api.upvoteReport(report.id, userKey);
      if (updated) {
        setUpvotes(updated.upvotesCount || 0);
        setHasUpvoted(
          currentUser ? (updated.upvotedUserIds || []).includes(currentUser.id) : !hasUpvoted
        );
      } else {
        setUpvotes(prev => (hasUpvoted ? prev - 1 : prev + 1));
        setHasUpvoted(!hasUpvoted);
      }
    } catch (err) {
      console.error('Error upvoting report:', err);
      // Optimistic fallback
      setUpvotes(prev => (hasUpvoted ? Math.max(0, prev - 1) : prev + 1));
      setHasUpvoted(!hasUpvoted);
    } finally {
      setUpvoting(false);
    }
  };

  // Category Icon & Color
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Illegal Dumping':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          badge: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
        };
      case 'Clogged Drainage':
      case 'Waterway Contamination':
        return {
          icon: <Droplets className="w-3.5 h-3.5" />,
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'Open Burning (Siga)':
        return {
          icon: <Flame className="w-3.5 h-3.5" />,
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      case 'Overflowing Bin':
        return {
          icon: <Layers className="w-3.5 h-3.5" />,
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'Hazardous Waste':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      default:
        return {
          icon: <Tag className="w-3.5 h-3.5" />,
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
    }
  };

  const catTheme = getCategoryTheme(report.category);

  // Urgency badge
  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-600 text-white font-black';
      case 'High':
        return 'bg-orange-500 text-white font-black';
      case 'Medium':
        return 'bg-amber-500 text-white font-bold';
      case 'Low':
      default:
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  // Status Pill
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Rejected':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  const isLongDescription = report.description && report.description.length > 180;
  const displayedDescription =
    isLongDescription && !expandedText
      ? `${report.description.slice(0, 180)}...`
      : report.description;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          {/* Photo Header */}
          {report.photoUrl && (
            <div
              className="relative w-full h-52 bg-slate-950 cursor-pointer group overflow-hidden"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={report.photoUrl}
                alt={report.category}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

              {/* Status and Urgency Floating Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm ${getStatusBadge(
                    report.status
                  )}`}
                >
                  {report.status}
                </span>

                {report.urgency && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-sm ${getUrgencyBadge(
                      report.urgency
                    )}`}
                  >
                    {report.urgency} Urgency
                  </span>
                )}
              </div>

              {/* Bottom Photo Overlay Info */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                <span className="text-[11px] text-white/90 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {new Date(report.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>

                <span className="text-[10px] text-white/80 font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
                  Click to view full photo
                </span>
              </div>
            </div>
          )}

          {/* Card Body */}
          <div className="p-5 sm:p-6 space-y-3.5">
            {/* Header info if no photo was attached */}
            {!report.photoUrl && (
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${getStatusBadge(
                    report.status
                  )}`}
                >
                  {report.status}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Category Tag Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide border mb-1.5 ${catTheme.badge}">
                {catTheme.icon}
                <span>{report.category}</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                {report.category} Incident Report
              </h3>
            </div>

            {/* Description Text */}
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {displayedDescription}
              </p>
              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setExpandedText(!expandedText)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 transition-colors"
                >
                  <span>{expandedText ? 'Show Less' : 'Read Full Description'}</span>
                  {expandedText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Categorical Tags Display */}
            {report.tags && report.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {report.tags.map(tag => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => onTagClick && onTagClick(tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                    title={`Filter by ${tag}`}
                  >
                    <Tag className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Location & Landmark */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{report.locationAddress}</span>
              </div>
              {report.landmark && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                  <Compass className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Landmark: {report.landmark}</span>
                </div>
              )}
            </div>

            {/* Official LGU Response Banner */}
            {report.officialNotes && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Barangay LGU Action & Resolution Notes:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  {report.officialNotes}
                </p>
                {report.resolvedAt && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-0.5">
                    Resolved on {new Date(report.resolvedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer: Reporter & Me-Too Confirmation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Reported by {report.reporterName}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
              +30 Eco Points Verified
            </span>
          </div>

          {/* Upvote / Confirm Button */}
          <button
            type="button"
            onClick={handleToggleUpvote}
            disabled={upvoting}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shrink-0 ${
              hasUpvoted
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700'
            }`}
            title="Confirm this hazard (Nagpapatunay)"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Confirm Concern</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-black/10 rounded-md font-mono text-[11px]">
              {upvotes}
            </span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && report.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full">
              <img
                src={report.photoUrl}
                alt={report.category}
                className="w-full h-full object-contain bg-black"
              />
            </div>
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">{report.category} - Photo Evidence</h4>
                <p className="text-xs text-slate-400">{report.locationAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
