import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { GarbageSchedule, Barangay, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { Calendar, Clock, Truck, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GarbageSchedulePageProps {
  currentBarangay: Barangay;
  lang?: Language;
}

export const GarbageSchedulePage: React.FC<GarbageSchedulePageProps> = ({ currentBarangay, lang = 'en' }) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [schedules, setSchedules] = useState<GarbageSchedule[]>([]);

  useEffect(() => {
    api.getSchedules(currentBarangay.id).then(setSchedules).catch(console.error);
  }, [currentBarangay.id]);

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl space-y-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-wider rounded-full border border-emerald-500/30">
            RA 9003 Waste Collection Timetable
          </span>
          <h1 className="text-3xl font-black">{t('scheduleHeading')} - Brgy. {currentBarangay.name}</h1>
          <p className="text-xs text-slate-300">
            {t('scheduleSub')}
          </p>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedules.map(sch => (
          <div key={sch.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-black text-slate-900">{sch.dayOfWeek}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                  sch.wasteType === 'Biodegradable'
                    ? 'bg-emerald-100 text-emerald-800'
                    : sch.wasteType === 'Recyclable'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {sch.wasteType}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Clock className="w-4 h-4 text-emerald-600" /> Collection Time: {sch.timeSlot}
              </div>
              {sch.truckNo && (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Truck className="w-4 h-4 text-slate-400" /> Dispatched Vehicle: {sch.truckNo}
                </div>
              )}
              <p className="text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-2 leading-relaxed">
                💡 {sch.instructions}
              </p>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            No collection schedule logged for this barangay yet.
          </div>
        )}
      </div>
    </div>
  );
};
