import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Event, Challenge, Barangay, User, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { Calendar, Award, CheckCircle2, Users, Sparkles, MapPin, Loader2 } from 'lucide-react';

interface EventsChallengesPageProps {
  currentBarangay: Barangay;
  currentUser: User | null;
  onUserUpdate: (u: User) => void;
  lang?: Language;
}

export const EventsChallengesPage: React.FC<EventsChallengesPageProps> = ({
  currentBarangay,
  currentUser,
  onUserUpdate,
  lang = 'en',
}) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [activeTab, setActiveTab] = useState<'events' | 'challenges'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    api.getEvents(currentBarangay.id).then(setEvents).catch(console.error);
    api.getChallenges().then(setChallenges).catch(console.error);
  }, [currentBarangay.id]);

  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser) return;
    try {
      await api.joinEvent(eventId, currentUser.id);
      const updatedUser = await api.getUserProfile(currentUser.id);
      onUserUpdate(updatedUser);
      api.getEvents(currentBarangay.id).then(setEvents).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteChallenge = async (chlId: string) => {
    if (!currentUser) return;
    try {
      await api.completeChallenge(chlId, currentUser.id);
      const updatedUser = await api.getUserProfile(currentUser.id);
      onUserUpdate(updatedUser);
      api.getChallenges().then(setChallenges).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl space-y-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-wider rounded-full border border-emerald-500/30">
            Community Engagement Hub
          </span>
          <h1 className="text-3xl font-black">{t('eventsHeading')}</h1>
          <p className="text-xs text-slate-300">
            {t('eventsSub')} (Brgy. {currentBarangay.name})
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-2 gap-2">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'events' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🧹 Cleanup Drives & Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'challenges' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>7-Day Sustainability Challenges ({challenges.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'events' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(evt => {
            const hasJoined = currentUser ? evt.registeredUserIds.includes(currentUser.id) : false;
            return (
              <div key={evt.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 uppercase">
                      {evt.category}
                    </span>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      🎁 +{evt.pointsAwarded} Eco Pts
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{evt.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

                  <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 font-medium">
                    <div>📅 {evt.date} ({evt.time})</div>
                    <div>📍 {evt.location}</div>
                    <div className="text-emerald-700 font-bold">Organizer: {evt.organizerName}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    👥 {evt.registeredUserIds.length} / {evt.maxParticipants} Registered
                  </span>

                  <button
                    onClick={() => handleJoinEvent(evt.id)}
                    disabled={hasJoined || !currentUser}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      hasJoined
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    {hasJoined ? '✓ Registered' : 'RSVP & Join Event'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map(chl => {
            const hasJoined = currentUser ? chl.joinedUserIds.includes(currentUser.id) : false;
            const isCompleted = currentUser ? chl.completedUserIds.includes(currentUser.id) : false;

            return (
              <div key={chl.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 uppercase">
                      {chl.category} • {chl.durationDays} Days
                    </span>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      ⚡ +{chl.pointsAwarded} Eco Pts
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{chl.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{chl.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    🏆 {chl.completedUserIds.length} Residents Completed
                  </span>

                  {isCompleted ? (
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCompleteChallenge(chl.id)}
                      disabled={!currentUser}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                    >
                      Log Completed Challenge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
