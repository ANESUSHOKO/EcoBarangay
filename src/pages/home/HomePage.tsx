import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Barangay, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import {
  Sparkles,
  Award,
  Recycle,
  MapPin,
  Calendar,
  AlertTriangle,
  Users,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Building2,
  ArrowRight,
  Leaf,
  Code2,
  GraduationCap,
  Mail,
  Terminal,
  Cpu
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectBarangay: (b: Barangay) => void;
  lang?: Language;
  onOpenDeveloperInfo?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectBarangay, lang = 'en', onOpenDeveloperInfo }) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [stats, setStats] = useState<{
    registeredResidents: number;
    participatingBarangays: number;
    wasteRecycledKg: number;
    cleanupActivities: number;
    reportsResolved: number;
  }>({
    registeredResidents: 3690,
    participatingBarangays: 56,
    wasteRecycledKg: 142800,
    cleanupActivities: 88,
    reportsResolved: 940,
  });

  const [topBarangays, setTopBarangays] = useState<Barangay[]>([]);

  useEffect(() => {
    api.getStatsSummary().then(setStats).catch(console.error);
    api.getRankings({ tier: 'Platinum' }).then(res => setTopBarangays(res.slice(0, 4))).catch(console.error);
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{t('heroNetwork')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                {t('heroTitle')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  {t('heroTitleHighlight')}
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
                {t('heroSubtitle')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => onNavigate('map')}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  {t('exploreMapBtn')}
                </button>

                <button
                  onClick={() => onNavigate('rankings')}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all text-sm"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  {t('leaderboardBtn')}
                </button>
              </div>

              {/* Slogan Pill */}
              <div className="pt-4 text-xs font-semibold text-emerald-300/80 tracking-wide flex items-center justify-center lg:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t('ra9003Badge')}</span>
              </div>
            </div>

            {/* Right Card Stack: Live Stats */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" /> {t('liveNationalImpact')}
                    </h3>
                    <p className="text-xs text-slate-400">{t('verifiedCommunityStats')}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                    REAL-TIME
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {stats.wasteRecycledKg.toLocaleString()} kg
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                      <Recycle className="w-3.5 h-3.5 text-emerald-500" /> {t('wasteRecycledLabel')}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                    <div className="text-2xl sm:text-3xl font-black text-teal-400">
                      {stats.participatingBarangays}
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-teal-500" /> {t('activeBarangaysLabel')}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                    <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                      {stats.reportsResolved}
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> {t('reportsResolvedLabel')}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                    <div className="text-2xl sm:text-3xl font-black text-amber-400">
                      {stats.registeredResidents.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-500" /> {t('residentMembersLabel')}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 flex items-center justify-between">
                  <span>{t('isYourBarangayReg')}</span>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="font-bold text-emerald-400 hover:text-white flex items-center gap-1"
                  >
                    {t('checkStatus')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Barangays Leaderboard Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
              {t('honorRollBadge')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {t('topBarangaysHeading')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('topBarangaysSub')}
            </p>
          </div>

          <button
            onClick={() => onNavigate('rankings')}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <span>{t('viewAllRankings')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topBarangays.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                onSelectBarangay(b);
                onNavigate('dashboard');
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-700">
                    #{b.score.nationalRank}
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider rounded-full border border-emerald-300 dark:border-emerald-800">
                    {b.score.tier} TIER
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Brgy. {b.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {b.cityName}, {b.provinceName}
                </p>

                <div className="my-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold uppercase">{t('totalScoreLabel')}</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{b.score.totalScore} / 100</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold uppercase">{t('recycledLabel')}</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{b.totalRecycledKg.toLocaleString()} kg</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800 group-hover:underline">
                <span>{t('exploreBarangayProfile')}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Platform Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t('howItWorksHeading')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {t('howItWorksSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('featMapTitle')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('featMapDesc')}
            </p>
            <button
              onClick={() => onNavigate('map')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1"
            >
              {t('exploreMapBtn')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('featScheduleTitle')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('featScheduleDesc')}
            </p>
            <button
              onClick={() => onNavigate('schedule')}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 flex items-center gap-1"
            >
              {t('navSchedule')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('featReportsTitle')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('featReportsDesc')}
            </p>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1"
            >
              {t('submitReport')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Normalized Scoring Explainer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-wider rounded-full border border-emerald-500/30">
                Fair National Ranking System
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">
                {lang === 'tl' ? 'Paano Kinalkula ang Iskor ng Barangay?' : 'How Are Barangay Scores Evaluated?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'tl'
                  ? 'Upang maging patas sa maliit at malalaking barangay sa buong bansa, sinusuri ang bawat barangay sa 7 dimensyon (Kabuong 100 puntos):'
                  : 'To ensure small rural barangays compete on an equal footing with large urban barangays, EcoBarangay evaluates performance across 7 normalized dimensions (Total 100 points):'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                  <div className="font-extrabold text-emerald-400 text-lg">25 pts</div>
                  <div className="text-[11px] text-slate-300">{lang === 'tl' ? 'Pamamahala sa Basura' : 'Waste Management'}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                  <div className="font-extrabold text-emerald-400 text-lg">20 pts</div>
                  <div className="text-[11px] text-slate-300">{lang === 'tl' ? 'Pagsunod sa Pagresiklo' : 'Recycling Compliance'}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                  <div className="font-extrabold text-emerald-400 text-lg">20 pts</div>
                  <div className="text-[11px] text-slate-300">{lang === 'tl' ? 'Partisipasyon ng Komunidad' : 'Community Participation'}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                  <div className="font-extrabold text-emerald-400 text-lg">15 pts</div>
                  <div className="text-[11px] text-slate-300">{lang === 'tl' ? 'Bilis ng Pag-resolba ng Ulat' : 'Report Resolution Speed'}</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center">
              <div className="bg-white/10 border border-white/20 rounded-3xl p-6 text-center backdrop-blur-md space-y-3 w-full">
                <Leaf className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold">
                  {lang === 'tl' ? 'Mag-ipon ng Eco Points bilang Mamamayan' : 'Earn Eco Points as a Resident'}
                </div>
                <p className="text-xs text-slate-300">
                  {lang === 'tl'
                    ? 'Sa bawat pag-resiklo o pagsali sa cleanup drive, nakakakuha ka ng Eco Points at pinalalakas ang ranggo ng iyong barangay!'
                    : 'Every time you drop off recyclables or join a cleanup drive, your household earns Eco Points and boosts your barangay national rank!'}
                </p>
                <button
                  onClick={() => onNavigate('events')}
                  className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  {lang === 'tl' ? 'Sumali sa Subok ng Kalikasan' : 'Join Sustainability Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer & Platform Engineering Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shrink-0 shadow-lg shadow-emerald-600/20">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-black text-lg">
                  <span className="bg-gradient-to-br from-emerald-300 via-teal-200 to-white bg-clip-text text-transparent">
                    ALS
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <Code2 className="w-3 h-3" />
                  <span>Platform Lead & Software Architect</span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Anesu Lancelot Shoko
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Centro Escolar University
                  </span>
                  <span>•</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    shoko2314731@ceu.edu.ph
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {onOpenDeveloperInfo && (
                <button
                  type="button"
                  onClick={onOpenDeveloperInfo}
                  className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View Engineering Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

