import React from 'react';
import {
  X,
  Code2,
  Cpu,
  Mail,
  ShieldCheck,
  Award,
  Globe,
  Terminal,
  Database,
  Layers,
  Sparkles,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  Flame,
  FileCode2
} from 'lucide-react';

interface DeveloperInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperInfoModal: React.FC<DeveloperInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header Hero */}
        <div className="relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors backdrop-blur-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Developer Avatar / Monogram */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-1 shadow-xl shadow-emerald-950/50">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-white font-black text-2xl tracking-wider">
                  <span className="bg-gradient-to-br from-emerald-300 via-teal-200 to-white bg-clip-text text-transparent">
                    ALS
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-xl shadow-md border-2 border-slate-900">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Developer Title & Name */}
            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
                <Code2 className="w-3.5 h-3.5" />
                <span>Lead Software Engineer & Architect</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Anesu Lancelot Shoko
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  Centro Escolar University
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-300 font-mono">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  shoko2314731@ceu.edu.ph
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Engineering Mission & Overview */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Project Architecture & Vision
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Designed and engineered the full-stack architecture for <strong>EcoBarangay Pilipinas</strong>, an end-to-end digital governance platform promoting Republic Act 9003 compliance, intelligent solid waste segregation, community gamification, and real-time national leaderboard analytics.
            </p>
          </div>

          {/* Technical Implementation Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-500" />
              Key System Innovations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Dual-Layer Security</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  PBKDF2 cryptographic salted password hashing with two-step email OTP authentication & recovery flow.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Database className="w-4 h-4 text-cyan-500" />
                  <span>Real-time Cloud Sync</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Dual-tier data persistence combining Firestore cloud storage with lightning-fast reactive client state.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Normalized Scoring Engine</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Weighted 7-dimension evaluation model ensuring equitable competition between urban and rural LGUs.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Interactive Geospatial GIS</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Live MRF, drop-off, collection routes, and hot-spot reporting with geocoded status lifecycles.
                </p>
              </div>
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              Core Technologies & Engineering Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                'TypeScript',
                'React 18',
                'Tailwind CSS',
                'Node.js / Express',
                'Google Firestore',
                'PBKDF2 Cryptography',
                'REST API Architecture',
                'Lucide Icons',
                'Bi-lingual Localization (EN/TL)'
              ].map((tech, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/70"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Developer Contact & Accreditation */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Developer Direct Contact
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-mono">
                  shoko2314731@ceu.edu.ph
                </p>
              </div>
            </div>
            <a
              href="mailto:shoko2314731@ceu.edu.ph"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            EcoBarangay Pilipinas • Developed by Anesu Lancelot Shoko
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
