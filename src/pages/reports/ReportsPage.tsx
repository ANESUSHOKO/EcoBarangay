import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { EnvironmentalReport, Barangay, User, ReportCategory, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { AlertTriangle, PlusCircle, CheckCircle2, Clock, Camera, MapPin, Loader2 } from 'lucide-react';

interface ReportsPageProps {
  currentBarangay: Barangay;
  currentUser: User | null;
  lang?: Language;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ currentBarangay, currentUser, lang = 'en' }) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [category, setCategory] = useState<ReportCategory>('Illegal Dumping');
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [currentBarangay.id]);

  const fetchReports = () => {
    api.getReports(currentBarangay.id).then(setReports).catch(console.error);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSubmitting(true);
    try {
      await api.createReport({
        category,
        description: desc,
        locationAddress: address || `Corner Street in Brgy. ${currentBarangay.name}`,
        lat: currentBarangay.lat + (Math.random() - 0.5) * 0.005,
        lng: currentBarangay.lng + (Math.random() - 0.5) * 0.005,
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        cityName: currentBarangay.cityName,
        reporterId: currentUser.id,
        reporterName: currentUser.fullName,
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600',
      });

      setShowModal(false);
      setDesc('');
      setAddress('');
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-amber-700">
            Civic Environmental Watch
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('reportsHeading')}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {t('reportsSub')} (Brgy. {currentBarangay.name})
          </p>
        </div>

        {currentUser && (
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" /> {t('createNewReport')}
          </button>
        )}
      </div>

      {/* Reports Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(rep => (
          <div key={rep.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {rep.photoUrl && (
                <img src={rep.photoUrl} alt="" className="w-full h-48 object-cover" />
              )}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      rep.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rep.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rep.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{rep.category}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rep.description}</p>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {rep.locationAddress}
                </div>

                {rep.officialNotes && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 mt-2">
                    <strong>Official LGU Response:</strong> {rep.officialNotes}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-between">
              <span>Reported by {rep.reporterName}</span>
              <span>+30 Eco Points Awarded</span>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            No reports logged in this barangay yet.
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">File Environmental Report</h3>

            <form onSubmit={handleCreateReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Violation Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Illegal Dumping">Illegal Dumping</option>
                  <option value="Overflowing Bin">Overflowing Public Bin</option>
                  <option value="Missed Collection">Missed Garbage Collection</option>
                  <option value="Clogged Drainage">Clogged Drainage / Trash in Canal</option>
                  <option value="Hazardous Waste">Uncollected Hazardous Waste</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exact Location Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Corner Shaw Blvd & West Capitol Drive"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue (e.g. pile of wet garbage uncollected since yesterday)..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Report (+30 Pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
