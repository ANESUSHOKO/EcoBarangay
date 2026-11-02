import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import { Barangay, Region, Province, City, Language, RankingSnapshot } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { Award, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface RankingsPageProps {
  onSelectBarangay: (b: Barangay) => void;
  onNavigate: (page: string) => void;
  lang?: Language;
}

// Memoized individual Barangay ranking card component for smooth scrolling on large datasets
interface BarangayRankingCardProps {
  barangay: Barangay;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelectBarangay: (b: Barangay) => void;
  onNavigate: (page: string) => void;
  history: RankingSnapshot[];
  historyLoading: boolean;
  historyError?: string;
  onLoadHistory: (id: string) => void;
}

const BarangayRankingCard = React.memo<BarangayRankingCardProps>(({
  barangay: b,
  isExpanded,
  onToggleExpand,
  onSelectBarangay,
  onNavigate,
  history,
  historyLoading,
  historyError,
  onLoadHistory,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
          <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            #{b.score.nationalRank}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-base font-bold text-slate-900 truncate">Brgy. {b.name}</h3>
              <span
                className={`status-chip text-[10px] sm:text-xs py-0.5 px-2 ${
                  b.score.tier === 'Platinum'
                    ? 'rank-platinum'
                    : b.score.tier === 'Gold'
                    ? 'rank-gold'
                    : b.score.tier === 'Silver'
                    ? 'rank-silver'
                    : 'rank-bronze'
                }`}
              >
                {b.score.tier} TIER
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-1">
              {b.cityName}, {b.provinceName} ({b.regionName}) • Pop: {b.population.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Score</span>
            <span className="text-lg sm:text-xl font-black text-emerald-700">{b.score.totalScore} / 100</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectBarangay(b);
                onNavigate('dashboard');
              }}
              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              View Profile
            </button>

            <button
              onClick={() => {
                const nextOpen = !historyOpen;
                setHistoryOpen(nextOpen);
                if (nextOpen && history.length === 0) onLoadHistory(b.id);
              }}
              aria-expanded={historyOpen}
              aria-label={`${historyOpen ? 'Hide' : 'Show'} ranking history for Barangay ${b.name}`}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
              title="View daily ranking history"
            >
              History
            </button>
            <button
              onClick={() => onToggleExpand(b.id)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Hide' : 'Show'} score breakdown for Barangay ${b.name}`}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Toggle 100-pt Score Breakdown"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Score Breakdown Drawer */}
      {isExpanded && (
        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            7-Dimension Score Breakdown (100 Points Max)
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Waste Mgmt</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.wasteManagement} / 25</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Recycling</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.recycling} / 20</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Community</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.communityParticipation} / 20</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Reports Speed</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.reportsResolution} / 15</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Cleanups</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.cleanupActivities} / 10</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Challenges</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.sustainabilityChallenges} / 5</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Education</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{b.score.educationParticipation} / 5</div>
            </div>
          </div>
        </div>
      )}
      {historyOpen && (
        <div className="border-t border-slate-100 bg-white p-5" aria-live="polite">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Daily ranking history</h4>
          <p className="mt-1 text-[11px] text-slate-500">Daily snapshots are retained for up to 365 days and include the top 100 recorded barangays. Scores are not independently verified or population-normalized.</p>
          {historyLoading ? (
            <p className="mt-3 text-xs text-slate-500">Loading history…</p>
          ) : historyError ? (
            <p role="alert" className="mt-3 text-xs text-rose-700">{historyError}</p>
          ) : history.length ? (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {history.map(snapshot => {
                const entry = snapshot.entries[0];
                if (!entry) return null;
                return (
                  <li key={snapshot.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                    <time dateTime={snapshot.snapshotDate} className="font-semibold text-slate-700">{snapshot.snapshotDate}</time>
                    <span className="ml-2 text-slate-500">Rank #{entry.nationalRank} · {entry.score.totalScore}/100</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No archived snapshots for this barangay yet. History begins with the next daily update.</p>
          )}
        </div>
      )}
    </div>
  );
});

export const RankingsPage: React.FC<RankingsPageProps> = ({ onSelectBarangay, onNavigate, lang = 'en' }) => {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [search, setSearch] = useState('');

  const [expandedBarangayId, setExpandedBarangayId] = useState<string | null>(null);
  const [rankingHistory, setRankingHistory] = useState<Record<string, RankingSnapshot[]>>({});
  const [rankingHistoryErrors, setRankingHistoryErrors] = useState<Record<string, string>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  useEffect(() => {
    api.getRegions().then(setRegions).catch(console.error);
  }, []);

  const fetchRankings = useCallback(() => {
    api
      .getRankings({
        regionCode: selectedRegion || undefined,
        provinceCode: selectedProvince || undefined,
        cityCode: selectedCity || undefined,
        tier: selectedTier !== 'ALL' ? selectedTier : undefined,
        search: search || undefined,
      })
      .then(setBarangays)
      .catch(console.error);
  }, [selectedRegion, selectedProvince, selectedCity, selectedTier, search]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    if (selectedRegion) {
      api.getProvinces(selectedRegion).then(setProvinces).catch(console.error);
      setSelectedProvince('');
      setSelectedCity('');
    } else {
      setProvinces([]);
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedProvince || selectedRegion) {
      api.getCities(selectedProvince, selectedRegion).then(setCities).catch(console.error);
      setSelectedCity('');
    } else {
      setCities([]);
    }
  }, [selectedProvince, selectedRegion]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedBarangayId(prev => (prev === id ? null : id));
  }, []);

  const handleLoadHistory = useCallback((id: string) => {
    if (rankingHistory[id] || loadingHistoryId === id) return;
    setLoadingHistoryId(id);
    setRankingHistoryErrors(current => ({ ...current, [id]: '' }));
    api.getRankingHistory(id)
      .then(history => setRankingHistory(current => ({ ...current, [id]: history })))
      .catch(error => {
        console.error('Could not load ranking history:', error);
        setRankingHistoryErrors(current => ({
          ...current,
          [id]: error instanceof Error ? error.message : 'Could not load ranking history.',
        }));
      })
      .finally(() => setLoadingHistoryId(current => current === id ? null : current));
  }, [rankingHistory, loadingHistoryId]);

  // Memoized list of barangays to optimize render performance
  const memoizedBarangays = useMemo(() => {
    return barangays;
  }, [barangays]);

  return (
    <div className="space-y-8 pb-16">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-8 shadow-xl">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Award className="w-4 h-4 text-amber-400" /> Official Philippine Leaderboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">
            Cleanest Barangays National Ranking
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            "Mas Malinis na Barangay, Mas Mataas na Ranking." The documented 100-point formula weights waste management (25), recycling (20), community participation (20), report resolution (15), cleanups (10), challenges (5), and education (5). Scores are recorded values, not population-normalized or independently verified.
          </p>
          <p className="text-xs text-amber-200">
            Data coverage varies. An unavailable or unverified indicator should not be interpreted as zero or as an official audited result. Daily history is retained for up to 365 days for the top 100 recorded barangays.
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search barangay, city, or province..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Region */}
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>

          {/* City */}
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Cities</option>
            {cities.map(c => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Tier */}
          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Tiers</option>
            <option value="Platinum">Platinum (90-100 pts)</option>
            <option value="Gold">Gold (80-89 pts)</option>
            <option value="Silver">Silver (70-79 pts)</option>
            <option value="Bronze">Bronze (60-69 pts)</option>
            <option value="Developing">Developing (&lt;60 pts)</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div className="space-y-4">
        {memoizedBarangays.map(b => (
          <BarangayRankingCard
            key={b.id}
            barangay={b}
            isExpanded={expandedBarangayId === b.id}
            onToggleExpand={handleToggleExpand}
            onSelectBarangay={onSelectBarangay}
            onNavigate={onNavigate}
            history={rankingHistory[b.id] || []}
            historyLoading={loadingHistoryId === b.id}
            historyError={rankingHistoryErrors[b.id]}
            onLoadHistory={handleLoadHistory}
          />
        ))}

        {memoizedBarangays.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            No barangays matched your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
