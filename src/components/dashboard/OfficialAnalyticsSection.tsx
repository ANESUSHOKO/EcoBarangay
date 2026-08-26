import React, { useState, useMemo } from 'react';
import { Barangay, User } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Recycle,
  Users,
  Award,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';

interface OfficialAnalyticsSectionProps {
  currentBarangay: Barangay;
  currentUser: User;
}

interface MonthlyMetric {
  monthKey: string;
  monthName: string;
  diversionRate: number; // %
  targetRate: number; // %
  totalWasteTons: number;
  organicTons: number;
  recyclableTons: number;
  specialWasteTons: number;
  residualLandfillTons: number;
  divertedTons: number;
  participatingHouseholdsRate: number; // %
  segregationComplianceRate: number; // %
  volunteerCount: number;
  activeAppUsers: number;
  reportsFiled: number;
  reportsResolved: number;
  resolutionRate: number; // %
}

interface PurokMetric {
  purokName: string;
  diversionRate: number;
  participationRate: number;
  complianceRate: number;
  households: number;
}

const PIE_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6'];

export const OfficialAnalyticsSection: React.FC<OfficialAnalyticsSectionProps> = ({
  currentBarangay,
  currentUser
}) => {
  const [timeframe, setTimeframe] = useState<'6m' | 'ytd' | '12m'>('6m');
  const [viewMode, setViewMode] = useState<'all' | 'diversion' | 'participation' | 'composition'>('all');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Generate deterministic monthly historical data tuned to current barangay's specific metrics
  const monthlyData: MonthlyMetric[] = useMemo(() => {
    const months = [
      { key: '2025-09', name: 'Sep 2025' },
      { key: '2025-10', name: 'Oct 2025' },
      { key: '2025-11', name: 'Nov 2025' },
      { key: '2025-12', name: 'Dec 2025' },
      { key: '2026-01', name: 'Jan 2026' },
      { key: '2026-02', name: 'Feb 2026' },
      { key: '2026-03', name: 'Mar 2026' },
      { key: '2026-04', name: 'Apr 2026' },
      { key: '2026-05', name: 'May 2026' },
      { key: '2026-06', name: 'Jun 2026' },
      { key: '2026-07', name: 'Jul 2026' },
      { key: '2026-08', name: 'Aug 2026' }
    ];

    // Seed calculations based on barangay sustainability score & population
    const baseScore = currentBarangay.score?.totalScore || 78;
    const wasteScore = currentBarangay.score?.wasteManagement || 18; // max 25
    const participationScore = currentBarangay.score?.communityParticipation || 15; // max 20
    const pop = currentBarangay.population || 12000;
    const approxHouseholds = Math.round(pop / 4.4);

    // Baseline monthly total waste generation in metric tons (~0.4 - 0.6 kg/capita/day)
    const baseMonthlyWasteTons = Number(((pop * 0.48 * 30.5) / 1000).toFixed(1));

    return months.map((m, idx) => {
      // Create progressive trend up to current month (August 2026)
      const progressFactor = (idx / (months.length - 1)); // 0 to 1
      const seasonalVariance = Math.sin((idx * Math.PI) / 6) * 2.5;

      // Diversion rate formula: base + progressive improvement + slight seasonal noise
      const baseDiversion = 42 + (wasteScore * 1.3);
      const diversionRate = Math.min(
        88,
        Math.max(35, Number((baseDiversion + progressFactor * 14.5 + seasonalVariance * 0.6).toFixed(1)))
      );

      // Participation rate
      const basePart = 48 + (participationScore * 1.5);
      const participatingHouseholdsRate = Math.min(
        92,
        Math.max(40, Number((basePart + progressFactor * 16 + (idx % 2 === 0 ? 1.2 : -0.8)).toFixed(1)))
      );

      // Compliance rate
      const segregationComplianceRate = Math.min(
        95,
        Math.max(45, Number((participatingHouseholdsRate + 6.2 - seasonalVariance * 0.3).toFixed(1)))
      );

      // Volumes
      const totalWasteTons = Number((baseMonthlyWasteTons * (1 + (idx * 0.008) + (seasonalVariance * 0.015))).toFixed(1));
      const divertedTons = Number(((totalWasteTons * diversionRate) / 100).toFixed(1));
      const residualLandfillTons = Number((totalWasteTons - divertedTons).toFixed(1));

      // Diversion breakdown
      const organicTons = Number((divertedTons * 0.54).toFixed(1));
      const recyclableTons = Number((divertedTons * 0.38).toFixed(1));
      const specialWasteTons = Number((divertedTons - organicTons - recyclableTons).toFixed(1));

      // Volunteer & App metrics
      const volunteerCount = Math.round((approxHouseholds * (participatingHouseholdsRate / 100) * 0.12) + (idx * 6));
      const activeAppUsers = Math.min(approxHouseholds, Math.round((currentBarangay.totalUsers || 280) * (0.65 + progressFactor * 0.45)));

      // Reports
      const reportsFiled = Math.max(3, Math.round(18 - progressFactor * 8 + (idx % 3)));
      const reportsResolved = Math.max(2, Math.min(reportsFiled, Math.round(reportsFiled * (0.75 + (currentBarangay.score.reportsResolution / 20)))));
      const resolutionRate = Number(((reportsResolved / reportsFiled) * 100).toFixed(1));

      return {
        monthKey: m.key,
        monthName: m.name,
        diversionRate,
        targetRate: 50, // RA 9003 statutory target
        totalWasteTons,
        organicTons,
        recyclableTons,
        specialWasteTons,
        residualLandfillTons,
        divertedTons,
        participatingHouseholdsRate,
        segregationComplianceRate,
        volunteerCount,
        activeAppUsers,
        reportsFiled,
        reportsResolved,
        resolutionRate
      };
    });
  }, [currentBarangay]);

  // Filtered dataset according to selected timeframe
  const filteredData = useMemo(() => {
    if (timeframe === '6m') {
      return monthlyData.slice(-6);
    }
    if (timeframe === 'ytd') {
      return monthlyData.slice(4); // Jan 2026 to Aug 2026
    }
    return monthlyData; // 12m
  }, [monthlyData, timeframe]);

  // Latest month and previous month for comparative KPIs
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];

  const diversionDiff = Number((currentMonth.diversionRate - previousMonth.diversionRate).toFixed(1));
  const participationDiff = Number((currentMonth.participatingHouseholdsRate - previousMonth.participatingHouseholdsRate).toFixed(1));
  const divertedTonsDiff = Number((currentMonth.divertedTons - previousMonth.divertedTons).toFixed(1));
  const complianceDiff = Number((currentMonth.segregationComplianceRate - previousMonth.segregationComplianceRate).toFixed(1));

  // Material composition for current month
  const compositionData = useMemo(() => [
    { name: 'Organic & Biodegradable Compost', value: currentMonth.organicTons, percentage: 54, color: '#10b981', icon: '🌿' },
    { name: 'Recyclable Plastics & PET', value: Number((currentMonth.recyclableTons * 0.48).toFixed(1)), percentage: 18, color: '#06b6d4', icon: '🧴' },
    { name: 'Paper & Cardboard', value: Number((currentMonth.recyclableTons * 0.32).toFixed(1)), percentage: 12, color: '#3b82f6', icon: '📦' },
    { name: 'Glass & Scrap Metals', value: Number((currentMonth.recyclableTons * 0.20).toFixed(1)), percentage: 8, color: '#f59e0b', icon: '🥫' },
    { name: 'Special & Hazardous E-Waste', value: currentMonth.specialWasteTons, percentage: 8, color: '#8b5cf6', icon: '🔋' }
  ], [currentMonth]);

  // Purok / Zone breakdowns for local barangay administration
  const purokMetrics: PurokMetric[] = useMemo(() => [
    { purokName: 'Purok 1 (Sentro / Plaza)', diversionRate: Number((currentMonth.diversionRate + 4.2).toFixed(1)), participationRate: Number((currentMonth.participatingHouseholdsRate + 5.1).toFixed(1)), complianceRate: 91.2, households: 420 },
    { purokName: 'Purok 2 (Riverside)', diversionRate: Number((currentMonth.diversionRate - 3.8).toFixed(1)), participationRate: Number((currentMonth.participatingHouseholdsRate - 4.5).toFixed(1)), complianceRate: 78.4, households: 380 },
    { purokName: 'Purok 3 (Commercial Hub)', diversionRate: Number((currentMonth.diversionRate + 2.1).toFixed(1)), participationRate: Number((currentMonth.participatingHouseholdsRate + 1.8).toFixed(1)), complianceRate: 86.5, households: 510 },
    { purokName: 'Purok 4 (Upper Hills)', diversionRate: Number((currentMonth.diversionRate - 1.2).toFixed(1)), participationRate: Number((currentMonth.participatingHouseholdsRate + 2.4).toFixed(1)), complianceRate: 84.1, households: 340 },
    { purokName: 'Purok 5 (Subdivision Area)', diversionRate: Number((currentMonth.diversionRate + 6.5).toFixed(1)), participationRate: Number((currentMonth.participatingHouseholdsRate + 7.8).toFixed(1)), complianceRate: 94.8, households: 620 }
  ], [currentMonth]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Month',
      'Waste Diversion Rate (%)',
      'RA 9003 Target Rate (%)',
      'Total Waste Generated (Tons)',
      'Total Diverted (Tons)',
      'Organic Waste Diverted (Tons)',
      'Recyclables Diverted (Tons)',
      'Special/E-Waste Diverted (Tons)',
      'Residual to Landfill (Tons)',
      'Participating Households Rate (%)',
      'Segregation Compliance Rate (%)',
      'Volunteers Active',
      'EcoBarangay App Active Users',
      'Reports Filed',
      'Reports Resolved',
      'Resolution Efficiency (%)'
    ];

    const rows = filteredData.map(d => [
      d.monthName,
      d.diversionRate,
      d.targetRate,
      d.totalWasteTons,
      d.divertedTons,
      d.organicTons,
      d.recyclableTons,
      d.specialWasteTons,
      d.residualLandfillTons,
      d.participatingHouseholdsRate,
      d.segregationComplianceRate,
      d.volunteerCount,
      d.activeAppUsers,
      d.reportsFiled,
      d.reportsResolved,
      d.resolutionRate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Brgy_${currentBarangay.name}_Waste_Diversion_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Chart Tooltips with clean Light / Dark styling
  const CustomDiversionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyMetric;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1.5 min-w-[200px]">
          <div className="font-extrabold text-emerald-400 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>📅 {data.monthName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
              {data.diversionRate >= 50 ? 'Compliant' : 'Below Target'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Waste Diversion:</span>
            <span className="font-black text-emerald-400 text-sm">{data.diversionRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">RA 9003 Benchmark:</span>
            <span className="font-bold text-amber-400">50.0%</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-300">Diverted Volume:</span>
            <span className="font-bold text-teal-300">{data.divertedTons} Tons</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Residual Landfill:</span>
            <span className="font-medium text-slate-300">{data.residualLandfillTons} Tons</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomParticipationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyMetric;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1.5 min-w-[210px]">
          <div className="font-extrabold text-teal-400 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>📅 {data.monthName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800">
              Civic Engagement
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Household Participation:</span>
            <span className="font-black text-emerald-400">{data.participatingHouseholdsRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Segregation Compliance:</span>
            <span className="font-bold text-indigo-300">{data.segregationComplianceRate}%</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-300">Cleanup Volunteers:</span>
            <span className="font-bold text-amber-400">{data.volunteerCount} residents</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Active App Citizens:</span>
            <span className="font-medium text-slate-300">{data.activeAppUsers} users</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomVolumeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyMetric;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1.5 min-w-[220px]">
          <div className="font-extrabold text-slate-200 border-b border-slate-700 pb-1">
            📅 {data.monthName} • Total {data.totalWasteTons} Tons
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>🌿 Biodegradable / Organic:</span>
            <span className="font-bold">{data.organicTons} T</span>
          </div>
          <div className="flex items-center justify-between text-cyan-400">
            <span>♻️ Recyclables (Plastic/Paper/Metal):</span>
            <span className="font-bold">{data.recyclableTons} T</span>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <span>⚡ Special / E-Waste:</span>
            <span className="font-bold">{data.specialWasteTons} T</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
            <span>🗑️ Landfill Residual:</span>
            <span className="font-bold text-slate-200">{data.residualLandfillTons} T</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Barangay Ecological Intelligence & Trends
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Republic Act 9003 Solid Waste Management Metrics • Monthly Waste Diversion & Civic Compliance Analytics
            </p>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe selector */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setTimeframe('6m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === '6m'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Last 6M
              </button>
              <button
                onClick={() => setTimeframe('ytd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === 'ytd'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2026 YTD
              </button>
              <button
                onClick={() => setTimeframe('12m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === '12m'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                12 Months
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-800 dark:border-slate-700 transition-all"
              title="Download CENRO/DENR formatted CSV sheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: '📊 All Key Analytics', icon: Activity },
            { id: 'diversion', label: '♻️ Waste Diversion Trend', icon: TrendingUp },
            { id: 'participation', label: '👥 Participation & Compliance', icon: Users },
            { id: 'composition', label: '🌿 Waste Stream Breakdown', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  viewMode === tab.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Waste Diversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Waste Diversion Rate
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {currentMonth.diversionRate}%
            </span>
            <span className={`text-xs font-bold flex items-center ${diversionDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {diversionDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(diversionDiff)}% MoM
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <span>RA 9003 Min: 50%</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Goal: 75%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentMonth.diversionRate / 75) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Exceeding National Standard by +{(currentMonth.diversionRate - 50).toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 2: Diverted Tonnage */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Diverted Volume
            </span>
            <div className="p-2 bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-600 dark:text-teal-400">
              {currentMonth.divertedTons}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Tons</span>
            <span className={`text-xs font-bold flex items-center ${divertedTonsDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {divertedTonsDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              +{divertedTonsDiff} T
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl">
            <span>🌿 Organics: <strong>{currentMonth.organicTons} T</strong></span>
            <span>♻️ Recycled: <strong>{currentMonth.recyclableTons} T</strong></span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-400">
            Avoided {currentMonth.divertedTons} tons from Payatas/Navotas Landfills
          </div>
        </div>

        {/* Card 3: Community Participation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Community Participation
            </span>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {currentMonth.participatingHouseholdsRate}%
            </span>
            <span className={`text-xs font-bold flex items-center ${participationDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {participationDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(participationDiff)}% MoM
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <span>Active Households</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{Math.round((currentBarangay.population / 4.4) * (currentMonth.participatingHouseholdsRate / 100))} homes</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full"
                style={{ width: `${currentMonth.participatingHouseholdsRate}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{currentMonth.volunteerCount} Active Drive Volunteers This Month</span>
          </div>
        </div>

        {/* Card 4: Segregation Compliance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Segregation at Source
            </span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {currentMonth.segregationComplianceRate}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Grade A
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl">
            <span>Issue Resolution:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">{currentMonth.resolutionRate}%</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-400">
            {currentMonth.reportsResolved} of {currentMonth.reportsFiled} resident reports addressed
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Waste Diversion & Volume Trend */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Waste Diversion Rate Trend */}
          {(viewMode === 'all' || viewMode === 'diversion') && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Monthly Waste Diversion Rate vs. RA 9003 Target
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Percentage of municipal solid waste diverted from sanitary landfills through recovery & composting
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Actual Rate (%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-3 h-0.5 bg-amber-500 border-dashed" />
                    <span>RA 9003 Benchmark (50%)</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="diversionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="monthName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CustomDiversionTooltip />} />
                    <ReferenceLine
                      y={50}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{ value: 'Target: 50%', position: 'insideTopRight', fill: '#d97706', fontSize: 10, fontWeight: 700 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="diversionRate"
                      name="Waste Diversion Rate"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#diversionGradient)"
                      activeDot={{ r: 6, stroke: '#047857', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Brgy. {currentBarangay.name} is currently <strong>+{(currentMonth.diversionRate - 50).toFixed(1)}%</strong> ahead of statutory baseline.</span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Target for Q4 2026: <span className="text-emerald-600 dark:text-emerald-400 font-bold">75.0% Diversion</span>
                </div>
              </div>
            </div>
          )}

          {/* Chart 2: Community Participation & Segregation Rate */}
          {(viewMode === 'all' || viewMode === 'participation') && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Community Participation & Household Segregation Dynamics
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tracking registered households, source segregation compliance, and volunteer turnout
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span>Participation %</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Compliance %</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="monthName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[30, 100]}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CustomParticipationTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="participatingHouseholdsRate"
                      name="Household Participation Rate"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#4f46e5', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="segregationComplianceRate"
                      name="Segregation Compliance Rate"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      strokeDasharray="4 2"
                      dot={{ r: 4, stroke: '#059669', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Avg. Participation</div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {(filteredData.reduce((acc, c) => acc + c.participatingHouseholdsRate, 0) / filteredData.length).toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Segregation Grade</div>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    94.8% Pure
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Volunteers</div>
                  <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {filteredData.reduce((acc, c) => acc + c.volunteerCount, 0)} Turnouts
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Active App Citizens</div>
                  <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {currentMonth.activeAppUsers} Users
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart 3: Monthly Waste Stream Volumes (Tons) */}
          {(viewMode === 'all' || viewMode === 'composition') && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Monthly Solid Waste Stream Volume Breakdown (Metric Tons)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparing diverted organic compost, recyclables, and residual waste sent to landfill
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Organic
                  </span>
                  <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Recyclables
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Landfill
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="monthName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="T"
                    />
                    <Tooltip content={<CustomVolumeTooltip />} />
                    <Bar dataKey="organicTons" name="Organic / Compost" stackId="waste" fill="#10b981" />
                    <Bar dataKey="recyclableTons" name="Recyclables" stackId="waste" fill="#06b6d4" />
                    <Bar dataKey="specialWasteTons" name="Special / E-Waste" stackId="waste" fill="#f59e0b" />
                    <Bar dataKey="residualLandfillTons" name="Residual to Landfill" stackId="waste" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Material Composition & Purok Leaders & AI Insights */}
        <div className="space-y-6">
          {/* Material Stream Donut Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Diverted Material Streams
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current month recovered composition</p>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {currentMonth.divertedTons} T Total
              </span>
            </div>

            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    {compositionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={activePieIndex === index ? 3 : 1}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Tons`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {currentMonth.diversionRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Diverted</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 mt-2">
              {compositionData.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl flex items-center justify-between text-xs transition-colors ${
                    activePieIndex === idx
                      ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.icon} {item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-bold text-slate-800 dark:text-white">{item.value} T</span>
                    <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purok / Zone Performance Comparison */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Purok & Zone Rankings</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Waste diversion by neighborhood sector</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                5 Zones
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {purokMetrics.map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-md">
                        #{idx + 1}
                      </span>
                      {p.purokName}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {p.diversionRate}% Diversion
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${p.diversionRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{p.households} households</span>
                    <span>{p.complianceRate}% compliance rate</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart LGU Policy & Action Recommendations */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-3xl shadow-md border border-emerald-800/80 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-200">
                Barangay Council Action Insights
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-emerald-100">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs">
                <span className="font-bold text-emerald-300 block mb-0.5">🌟 Top Performing Zone</span>
                Purok 5 reached <strong>74.9% diversion</strong> through active weekend food-waste composting.
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs">
                <span className="font-bold text-amber-300 block mb-0.5">💡 Collection Adjustment</span>
                Biodegradables peak on Wednesdays and Sundays; consider deploying dedicated organic truck dispatch.
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs">
                <span className="font-bold text-cyan-300 block mb-0.5">📢 Community Incentive</span>
                Plastic-to-Points program increased resident MRF drop-offs by <strong>+18.4%</strong> this quarter.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
