import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Facility, EnvironmentalReport, Event, Barangay, User, Language } from '../../types';
import { getTranslation } from '../../lib/i18n';
import { InteractiveMap } from '../../components';
import {
  MapPin,
  Search,
  Filter,
  PlusCircle,
  Phone,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface EcoMapPageProps {
  currentBarangay: Barangay;
  currentUser: User | null;
  lang?: Language;
}

export const EcoMapPage: React.FC<EcoMapPageProps> = ({ currentBarangay, currentUser, lang = 'en' }) => {
  const t = (key: any) => getTranslation(lang as Language, key);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  // New Facility Form
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [facName, setFacName] = useState('');
  const [facCategory, setFacCategory] = useState<any>('recycling');
  const [facAddress, setFacAddress] = useState('');
  const [facMaterials, setFacMaterials] = useState('Plastic, Paper, Glass, Metal');
  const [facHours, setFacHours] = useState('8:00 AM - 5:00 PM');
  const [facContact, setFacContact] = useState('');
  const [facDesc, setFacDesc] = useState('');
  const [submittingFac, setSubmittingFac] = useState(false);

  useEffect(() => {
    fetchMapData();
  }, [currentBarangay.id, category]);

  const fetchMapData = () => {
    api
      .getFacilities({
        category: category !== 'all' ? category : undefined,
        userLat: currentBarangay.lat,
        userLng: currentBarangay.lng,
      })
      .then(setFacilities)
      .catch(console.error);

    api.getReports(currentBarangay.id).then(setReports).catch(console.error);
    api.getEvents(currentBarangay.id).then(setEvents).catch(console.error);
  };

  const filteredFacilities = facilities.filter(
    f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.address.toLowerCase().includes(search.toLowerCase()) ||
      f.acceptedMaterials.some(m => m.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFac(true);

    try {
      await api.createFacility({
        name: facName,
        category: facCategory,
        address: facAddress,
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        city: currentBarangay.cityName,
        province: currentBarangay.provinceName,
        lat: currentBarangay.lat + (Math.random() - 0.5) * 0.01,
        lng: currentBarangay.lng + (Math.random() - 0.5) * 0.01,
        acceptedMaterials: facMaterials.split(',').map(s => s.trim()),
        openingHours: facHours,
        contact: facContact || '(02) 8000-0000',
        description: facDesc,
      });

      setShowAddModal(false);
      fetchMapData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFac(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">
            Interactive Geographic Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('mapHeading')}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {t('mapSub')} ({currentBarangay.cityName})
          </p>
        </div>

        {currentUser && (currentUser.role === 'BARANGAY_OFFICIAL' || currentUser.role === 'SYSTEM_ADMIN') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start md:self-auto shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> Add Recycling Facility
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: t('allCategories'), emoji: '📍' },
          { id: 'recycling', label: 'Recycling Hubs', emoji: '♻️' },
          { id: 'mrf', label: t('mrfCategory'), emoji: '🏭' },
          { id: 'junkshop', label: t('junkshopCategory'), emoji: '🛍️' },
          { id: 'ewaste', label: t('dropoffCategory'), emoji: '🔋' },
          { id: 'composting', label: t('compostCategory'), emoji: '🌱' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
              category === cat.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Interactive Leaflet Map */}
        <div className="lg:col-span-8 space-y-4">
          <InteractiveMap
            facilities={filteredFacilities}
            reports={reports}
            events={events}
            centerLat={selectedFacility ? selectedFacility.lat : currentBarangay.lat}
            centerLng={selectedFacility ? selectedFacility.lng : currentBarangay.lng}
            height="560px"
            onFacilityClick={setSelectedFacility}
          />

          {/* Selected Facility Detail Card */}
          {selectedFacility && (
            <div className="bg-white p-6 rounded-3xl border border-emerald-300 shadow-lg space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                    {selectedFacility.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedFacility.name}</h3>
                  <p className="text-xs text-slate-500">{selectedFacility.address}</p>
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedFacility.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <strong className="text-slate-700 block">Accepted Materials:</strong>
                  <span className="text-slate-600">{selectedFacility.acceptedMaterials.join(', ')}</span>
                </div>
                <div>
                  <strong className="text-slate-700 block">Hours & Contact:</strong>
                  <span className="text-slate-600">{selectedFacility.openingHours} • {selectedFacility.contact}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Searchable Facility Directory List */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4 flex flex-col max-h-[640px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search facility name or materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="text-xs font-bold text-slate-500">
            Showing {filteredFacilities.length} Facilities Near You
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {filteredFacilities.map(fac => {
              const isSelected = selectedFacility?.id === fac.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFacility(fac)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{fac.name}</span>
                    {fac.distanceKm !== undefined && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {fac.distanceKm} km
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{fac.address}</p>
                  <div className="text-[10px] text-slate-600 mt-2 font-medium flex items-center gap-1">
                    <span>📦 {fac.acceptedMaterials.slice(0, 3).join(', ')}...</span>
                  </div>
                </div>
              );
            })}

            {filteredFacilities.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">No facilities match your search criteria.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Facility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Barangay Recycling Facility</h3>

            <form onSubmit={handleAddFacilitySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Antonio Eco-Hub"
                  value={facName}
                  onChange={e => setFacName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facility Category</label>
                <select
                  value={facCategory}
                  onChange={e => setFacCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="recycling">Recycling Center</option>
                  <option value="mrf">Materials Recovery Facility (MRF)</option>
                  <option value="junkshop">Junk Shop</option>
                  <option value="ewaste">E-Waste Drop-Off Station</option>
                  <option value="composting">Composting Park</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shaw Boulevard"
                  value={facAddress}
                  onChange={e => setFacAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Accepted Materials (comma separated)</label>
                <input
                  type="text"
                  required
                  value={facMaterials}
                  onChange={e => setFacMaterials(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Hours</label>
                <textarea
                  rows={2}
                  required
                  value={facDesc}
                  onChange={e => setFacDesc(e.target.value)}
                  placeholder="Brief summary of services and operating rules..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFac}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  {submittingFac && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
