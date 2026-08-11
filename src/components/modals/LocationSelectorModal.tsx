import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Region, Province, City, Barangay } from '../../types';
import { MapPin, Navigation, Check, X, Search, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBarangay: (barangay: Barangay) => void;
  currentBarangayId?: string;
}

export const LocationSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectBarangay,
  currentBarangayId,
}) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [detectingLocation, setDetectingLocation] = useState<boolean>(false);
  const [detectedNearest, setDetectedNearest] = useState<{ barangay: Barangay; distanceKm: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getRegions().then(setRegions).catch(console.error);
      api.getBarangays().then(setBarangays).catch(console.error);
    }
  }, [isOpen]);

  // When region changes
  useEffect(() => {
    if (selectedRegion) {
      api.getProvinces(selectedRegion).then(setProvinces).catch(console.error);
      setSelectedProvince('');
      setSelectedCity('');
    } else {
      setProvinces([]);
    }
  }, [selectedRegion]);

  // When province changes
  useEffect(() => {
    if (selectedProvince || selectedRegion) {
      api.getCities(selectedProvince, selectedRegion).then(setCities).catch(console.error);
      setSelectedCity('');
    } else {
      setCities([]);
    }
  }, [selectedProvince, selectedRegion]);

  // Fetch filtered barangays
  useEffect(() => {
    api
      .getBarangays({
        regionCode: selectedRegion || undefined,
        provinceCode: selectedProvince || undefined,
        cityCode: selectedCity || undefined,
        search: searchQuery || undefined,
      })
      .then(setBarangays)
      .catch(console.error);
  }, [selectedRegion, selectedProvince, selectedCity, searchQuery]);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    setGeoError(null);
    setDetectedNearest(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const res = await api.detectNearestBarangay(position.coords.latitude, position.coords.longitude);
          if (res.success && res.nearestBarangay) {
            setDetectedNearest({
              barangay: res.nearestBarangay,
              distanceKm: res.distanceKm,
            });
          }
        } catch (err) {
          setGeoError('Failed to detect nearest barangay from location.');
        } finally {
          setDetectingLocation(false);
        }
      },
      error => {
        setDetectingLocation(false);
        setGeoError('Unable to retrieve location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Select Barangay Location</h3>
              <p className="text-xs text-slate-500">Official Philippine Geographic Code (PSGC) Directory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Automatic Location Detection */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" /> Auto-Detect Nearby Barangay
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">Use GPS coordinates to find your nearest local community.</p>
              </div>
              <button
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {detectingLocation ? 'Locating...' : 'Use GPS Location'}
              </button>
            </div>

            {geoError && <p className="text-xs text-red-600 font-medium mt-2">{geoError}</p>}

            {detectedNearest && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Nearest Match ({detectedNearest.distanceKm} km away)
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-1">{detectedNearest.barangay.name}</div>
                  <div className="text-xs text-slate-500">
                    {detectedNearest.barangay.cityName}, {detectedNearest.barangay.provinceName}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectBarangay(detectedNearest.barangay);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                >
                  Confirm Choice
                </button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search barangay or city name (e.g. Kapitolyo, Pasig)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Cascading Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Region</label>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Regions</option>
                {regions.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Province / District</label>
              <select
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Provinces</option>
                {provinces.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">City / Municipality</label>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Cities</option>
                {cities.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barangay Results Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Available Barangays ({barangays.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {barangays.map(b => {
                const isSelected = b.id === currentBarangayId;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBarangay(b);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        {b.name}
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {b.cityName}, {b.provinceName}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 mt-1">
                        Rank #{b.score.nationalRank} ({b.score.tier} Tier) • {b.score.totalScore} pts
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                      PSGC: {b.psgcCode.substring(0, 6)}
                    </span>
                  </div>
                );
              })}

              {barangays.length === 0 && (
                <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                  No barangays matched your filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
