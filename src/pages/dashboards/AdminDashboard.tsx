import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { User, Barangay, Facility, PartnerOrganization } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  ShieldAlert,
  Users,
  Building2,
  CheckCircle2,
  Search,
  Award,
  Globe2,
  MapPin,
  FileText,
  Sliders,
  PlusCircle,
  TrendingUp,
  Shield,
  Layers,
  Settings,
  Trash2,
  Edit3,
  BarChart3,
  Briefcase,
  Activity,
  Calendar,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

type AdminTab = 'analytics' | 'users' | 'locations' | 'facilities' | 'rankings' | 'governance' | 'institutions';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [users, setUsers] = useState<User[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [organizations, setOrganizations] = useState<PartnerOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Governance / Platform state
  const [platformNotice, setPlatformNotice] = useState('National Clean Barangay Month active. Ensure all MRF records are synced.');
  const [pointMultiplier, setPointMultiplier] = useState(1.0);
  const [requirePhotoVerification, setRequirePhotoVerification] = useState(true);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // Timeframe selector for analytics

  // New Barangay Modal State
  const [showAddBarangayModal, setShowAddBarangayModal] = useState(false);
  const [newBrgyName, setNewBrgyName] = useState('');
  const [newBrgyCity, setNewBrgyCity] = useState('Pasig City');
  const [newBrgyProvince, setNewBrgyProvince] = useState('Metro Manila');
  const [newBrgyRegion, setNewBrgyRegion] = useState('NCR');
  const [newBrgyPopulation, setNewBrgyPopulation] = useState('15000');

  // New Partner / Institutional Org Modal
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgAcronym, setOrgAcronym] = useState('');
  const [orgCategory, setOrgCategory] = useState<'School / University' | 'Environmental NGO' | 'Partner LGU' | 'National Agency'>('School / University');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgScope, setOrgScope] = useState('Metro Manila');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    api.getAllAdminUsers().then(setUsers).catch(console.error);
    api.getBarangays().then(setBarangays).catch(console.error);
    api.getFacilities({}).then(setFacilities).catch(console.error);
    api.getPartnerOrganizations().then(setOrganizations).catch(console.error);
  };

  const notifySuccess = (msg: string) => {
    setAdminActionSuccess(msg);
    setAdminActionError(null);
    setTimeout(() => setAdminActionSuccess(null), 3500);
  };

  const decideOfficialAccess = async (user: User, decision: 'Approved' | 'Rejected') => {
    setAdminActionError(null);
    try {
      const updated = await api.decideOfficialAccess(user.id, decision);
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
      notifySuccess(decision === 'Approved'
        ? `${user.fullName} is now an approved official for ${user.barangayName}.`
        : `Official access request from ${user.fullName} was rejected.`);
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : 'Could not update official access.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.barangayName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate high-level aggregates
  const totalRecycledKg = useMemo(() => {
    return barangays.reduce((acc, b) => acc + (b.totalRecycledKg || 0), 0);
  }, [barangays]);
  const registeredResidents = users.filter(user => user.role === 'RESIDENT').length;
  const mrfAndHubCount = facilities.filter(facility => ['mrf', 'recycling', 'junkshop', 'ewaste', 'composting'].includes(facility.category)).length;

  const tierDistribution = useMemo(() => {
    const counts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0, Developing: 0 };
    barangays.forEach(b => {
      const tier = b.score?.tier || 'Developing';
      if (counts[tier] !== undefined) {
        counts[tier]++;
      } else {
        counts.Developing++;
      }
    });
    return [
      { name: 'Platinum', count: counts.Platinum, fill: '#059669' },
      { name: 'Gold', count: counts.Gold, fill: '#d97706' },
      { name: 'Silver', count: counts.Silver, fill: '#64748b' },
      { name: 'Bronze', count: counts.Bronze, fill: '#b45309' },
      { name: 'Developing', count: counts.Developing, fill: '#6366f1' },
    ];
  }, [barangays]);

  const handleCreateInstitutionalOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName) return;
    try {
      await api.createPartnerOrganization({
        name: orgName,
        acronym: orgAcronym || orgName.substring(0, 4).toUpperCase(),
        category: orgCategory as any,
        description: orgDesc || `${orgCategory} partner in Philippine zero-waste and sustainability initiative.`,
        scope: orgScope,
        activeProjectsCount: 1,
        verified: true,
        logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200'
      });
      setShowAddOrgModal(false);
      setOrgName('');
      setOrgAcronym('');
      setOrgDesc('');
      notifySuccess(`New Institutional Partner "${orgName}" successfully registered.`);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBarangayScore = (barangayId: string, delta: number) => {
    setBarangays(prev =>
      prev.map(b => {
        if (b.id === barangayId) {
          const newScore = Math.min(100, Math.max(0, b.score.totalScore + delta));
          let tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Developing' = 'Developing';
          if (newScore >= 90) tier = 'Platinum';
          else if (newScore >= 80) tier = 'Gold';
          else if (newScore >= 70) tier = 'Silver';
          else if (newScore >= 60) tier = 'Bronze';
          return {
            ...b,
            score: { ...b.score, totalScore: newScore, tier }
          };
        }
        return b;
      })
    );
    notifySuccess('Barangay ranking score updated.');
  };

  const handleExportGovernanceReport = () => {
    const csvContent = [
      ['National EcoBarangay Platform Governance Report', new Date().toISOString()],
      ['Total Registered Users', users.length],
      ['Total Participating Barangays', barangays.length],
      ['Total Waste Diverted (kg)', totalRecycledKg],
      ['Total Active MRFs', facilities.length],
      ['Accredited Institutional Partners', organizations.length],
      [],
      ['Barangay', 'City', 'Province', 'National Rank', 'Score Tier', 'Recycled (kg)', 'Population'],
      ...barangays.map(b => [
        b.name,
        b.cityName,
        b.provinceName,
        b.score.nationalRank || 'N/A',
        b.score.tier,
        b.totalRecycledKg,
        b.population
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EcoBarangay_National_Governance_Metrics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess('National Governance & Engagement Report exported successfully.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-amber-500/20 shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black">{currentUser.fullName}</h1>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" /> System Administrator
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Republic of the Philippines • National EcoBarangay Platform & Governance Console
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-right min-w-[120px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">National Nodes</div>
              <div className="text-xl font-black text-emerald-400">{barangays.length} Barangays</div>
            </div>
            <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-right min-w-[120px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Citizen Accounts</div>
              <div className="text-xl font-black text-amber-400">{users.length} Users</div>
            </div>
            <button
              onClick={handleExportGovernanceReport}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Download official CSV data for DENR & DILG governance"
              id="admin-export-report-btn"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {adminActionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{adminActionSuccess}</span>
        </div>
      )}
      {adminActionError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
          {adminActionError}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-2 gap-2 overflow-x-auto shadow-xs">
        {[
          { id: 'analytics', label: '📊 Activity & Governance Analytics', icon: BarChart3 },
          { id: 'users', label: `👥 Users (${users.length})`, icon: Users },
          { id: 'locations', label: `📍 Location Data & Barangays (${barangays.length})`, icon: MapPin },
          { id: 'facilities', label: `🏢 Facilities & MRFs (${facilities.length})`, icon: Building2 },
          { id: 'rankings', label: '🏆 National Rankings', icon: Award },
          { id: 'governance', label: '🛡️ Governance & Controls', icon: Sliders },
          { id: 'institutions', label: `🏛️ Institutional Partners (${organizations.length})`, icon: Briefcase },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              id={`admin-tab-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: ACTIVITY & ENGAGEMENT ANALYTICS (RECHARTS GOVERNANCE PANEL) */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Dashboard heading and refresh control */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Administration Overview
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Current registered accounts, facility listings, and recorded recycling totals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadAllData();
                }}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                title="Refresh dashboard data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Recorded Recycling Total</span>
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {totalRecycledKg ? totalRecycledKg.toLocaleString() : 'Not reported'} {totalRecycledKg ? <span className="text-sm font-bold text-slate-500">kg</span> : null}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Recorded values; verification and reporting coverage vary.
                </div>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Registered Residents</span>
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {registeredResidents.toLocaleString()} <span className="text-sm font-bold text-slate-500">accounts</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Monthly active participation is not currently measured.
                </div>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Incident SLA Turnaround</span>
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  Not reported
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  No response-time target or complete measurement period is configured.
                </div>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Listed Facilities & Hubs</span>
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {mrfAndHubCount} <span className="text-sm font-bold text-slate-500">MRFs & Hubs</span>
                </div>
                <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {organizations.length} registered institutional partners
                </div>
              </div>
            </div>
          </div>

          {/* Primary Recharts Visualization: Platform Engagement & Activity Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Historical activity metrics */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Platform Activity
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historical participation and verification data is not available.
                  </p>
                </div>
              </div>

              <div className="h-72 w-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No time-series activity data is available for this period.
              </div>
            </div>

            {/* Chart 2: National Waste Stream Composition (PieChart / Donut) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Waste Stream Segregation Share
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Waste composition has not been reported.
                </p>
              </div>

              <div className="h-56 w-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No verified composition data is available.
              </div>
            </div>
          </div>

          {/* Secondary Visualizations: Waste Diverted Over Time & Barangay Tier Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Total Waste Diverted in Kg (BarChart) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Verified Waste Diversion by Period
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verified recycling weights by reporting period are not available.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No verified time-series waste data is available.
              </div>
            </div>

            {/* Chart 4: Barangay Sustainability Score Tier Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Barangay Tier Classification
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current recorded score distribution across {barangays.length} barangays. Scores are not independently audited.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tierDistribution}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    />
                    <Bar dataKey="count" name="Barangays" radius={[0, 6, 6, 0]}>
                      {tierDistribution.map((entry, index) => (
                        <Cell key={`tier-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tertiary Governance Grid: unavailable analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional performance */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Regional Performance
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Regional compliance and incident response metrics are not reported.
                  </p>
                </div>
              </div>

              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No regional compliance dataset is available.
              </div>
            </div>

            {/* Feature Usage & Citizen Participation Channels */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Platform Module Engagement
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Feature usage is not currently measured.
                  </p>
                </div>
              </div>

              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No feature usage data is available.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: USERS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Accounts & Roles Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Oversee national residents, barangay officials, and institutional liaisons.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Roles</option>
                <option value="RESIDENT">Residents</option>
                <option value="BARANGAY_OFFICIAL">Barangay Officials</option>
                <option value="SYSTEM_ADMIN">System Admins</option>
              </select>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user, email, barangay..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">User & Contact</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Jurisdiction / Location</th>
                  <th className="p-3">Eco Points</th>
                  <th className="p-3">Kg Recycled</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <img
                        src={u.photoUrl || u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div>{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.role === 'RESIDENT'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : u.role === 'BARANGAY_OFFICIAL'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                      Brgy. {u.barangayName}, {u.city}
                    </td>
                    <td className="p-3 font-black text-amber-600 dark:text-amber-400">⚡ {u.ecoPoints || 0}</td>
                    <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{u.kgRecycled || 0} kg</td>
                    <td className="p-3 text-right">
                      {u.officialAccessRequest?.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => decideOfficialAccess(u, 'Approved')}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Approve official
                          </button>
                          <button
                            onClick={() => decideOfficialAccess(u, 'Rejected')}
                            className="rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Reject
                          </button>
                        </div>
                      ) : u.role === 'BARANGAY_OFFICIAL' && u.verifiedOfficial ? (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Verified official</span>
                      ) : u.officialAccessRequest?.status === 'Rejected' ? (
                        <span className="text-[11px] text-slate-500">Request rejected</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOCATION DATA & BARANGAYS */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">National PSGC Location Registry</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage LGUs, Cities, Provinces, and registered Barangay geographic boundaries.</p>
            </div>
            <button
              onClick={() => setShowAddBarangayModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Register New Barangay
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barangays.map(b => (
              <div
                key={b.id}
                className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Tier: {b.score.tier}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Rank #{b.score.nationalRank || '-'}</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Brgy. {b.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {b.cityName}, {b.provinceName} ({b.regionName})
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Population:</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{b.population.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Recycled:</span>{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{b.totalRecycledKg} kg</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateBarangayScore(b.id, 2)}
                    className="flex-1 py-1.5 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold text-center"
                  >
                    +2 Audit Pts
                  </button>
                  <button
                    onClick={() => handleUpdateBarangayScore(b.id, -2)}
                    className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold text-center"
                  >
                    -2 Deduct
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FACILITIES & MRFS */}
      {/* ========================================================================= */}
      {activeTab === 'facilities' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">National Recovery Facilities & MRF Network</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Listed Materials Recovery Facilities, junkshops, and hazardous waste drop-off hubs.</p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Total Managed Facilities: {facilities.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map(fac => (
              <div
                key={fac.id}
                className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {fac.category}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">🕒 {fac.openingHours}</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{fac.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {fac.address}
                  </p>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold">Accepted:</span> {fac.acceptedMaterials.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NATIONAL RANKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'rankings' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">National Barangay Sustainability Leaderboard</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time governance ranking calculated from waste diversion, resident engagement, and incident resolutions.</p>
            </div>
            <button
              onClick={() => notifySuccess('National rankings recalculated.')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black"
            >
              Recalculate National Ranks
            </button>
          </div>

          <div className="space-y-3">
            {[...barangays]
              .sort((a, b) => b.score.totalScore - a.score.totalScore)
              .map((b, idx) => (
                <div
                  key={b.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Brgy. {b.name}, {b.cityName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Tier: {b.score.tier} • {b.totalUsers ?? 'Not reported'} residents
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{b.score.totalScore} / 100</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Score Index</div>
                    </div>
                    <div className="hidden sm:block text-right">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{b.totalRecycledKg} kg</div>
                      <div className="text-[10px] text-slate-400 uppercase">Diversion</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GOVERNANCE CONTROLS */}
      {/* ========================================================================= */}
      {activeTab === 'governance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Platform Governance & National Policy Controls</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">System parameters enforcing RA 9003 compliance, verification rules, and public announcements.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500" /> System Verification Rules
              </h4>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Mandatory Photo Proof for Points</div>
                  <div className="text-[11px] text-slate-400">Require waste logs and reports to upload valid image proof.</div>
                </div>
                <input
                  type="checkbox"
                  checked={requirePhotoVerification}
                  onChange={e => {
                    setRequirePhotoVerification(e.target.checked);
                    notifySuccess(`Mandatory photo proof ${e.target.checked ? 'enabled' : 'disabled'}.`);
                  }}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">Eco Point Reward Multiplier</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">{pointMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={pointMultiplier}
                  onChange={e => {
                    setPointMultiplier(parseFloat(e.target.value));
                    notifySuccess(`National Eco Point multiplier updated to ${e.target.value}x.`);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> National Broadcast Bulletin
              </h4>
              <textarea
                value={platformNotice}
                onChange={e => setPlatformNotice(e.target.value)}
                rows={3}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
              />
              <button
                onClick={() => notifySuccess('National bulletin broadcasted to all barangay portals.')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Broadcast National Bulletin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INSTITUTIONAL USERS & PARTNERS */}
      {/* ========================================================================= */}
      {activeTab === 'institutions' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Institutional Partners, Schools & NGOs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Support for schools, universities, environmental NGOs, partner LGUs, and research institutions.
              </p>
            </div>
            <button
              onClick={() => setShowAddOrgModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add Institutional Partner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map(org => (
              <div
                key={org.id}
                className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {org.category || 'Institutional'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Accredited
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{org.name}</h4>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">{org.acronym}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{org.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Scope: {org.scope || 'National'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{org.activeProjectsCount ?? 0} Active Projects</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Institutional Org Modal */}
      {showAddOrgModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Institutional Partner</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Onboard a school, environmental NGO, partner LGU, or civic organization.</p>

            <form onSubmit={handleCreateInstitutionalOrg} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Organization / Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University of the Philippines Eco Guild"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Acronym</label>
                  <input
                    type="text"
                    placeholder="e.g. UP-EG"
                    value={orgAcronym}
                    onChange={e => setOrgAcronym(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={orgCategory}
                    onChange={e => setOrgCategory(e.target.value as any)}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="School / University">School / University</option>
                    <option value="Environmental NGO">Environmental NGO</option>
                    <option value="Partner LGU">Partner LGU</option>
                    <option value="National Agency">National Agency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Scope</label>
                <input
                  type="text"
                  placeholder="e.g. Metro Manila / Nationwide"
                  value={orgScope}
                  onChange={e => setOrgScope(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrgModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
