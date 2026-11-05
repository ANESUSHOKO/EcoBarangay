import fs from 'node:fs';
import path from 'node:path';
import type { Barangay, City, Province, Region } from '../types';

type PsgcBarangay = {
  id: string;
  psgcCode: string;
  name: string;
  cityCode: string;
  cityName: string;
  provinceCode: string;
  provinceName: string;
  regionCode: string;
  regionName: string;
  lat: number;
  lng: number;
};

type PsgcCity = City & { isIndependent?: boolean };
type PsgcProvince = Province & { isIndependentCity?: boolean };

export type BarangayFilters = {
  cityCode?: string;
  provinceCode?: string;
  regionCode?: string;
  search?: string;
};

export class PsgcDirectory {
  private readonly directory: string;
  private regions?: Region[];
  private provinces?: PsgcProvince[];
  private cities?: PsgcCity[];
  private barangaysByCity?: Record<string, PsgcBarangay[]>;
  private allBarangays?: PsgcBarangay[];

  constructor(directory = path.join(process.cwd(), 'data', 'psgc')) {
    this.directory = directory;
  }

  private load<T>(fileName: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.directory, fileName), 'utf-8')) as T;
  }

  getRegions(): Region[] {
    this.regions ??= this.load<Region[]>('regions.json');
    return this.regions;
  }

  getProvinces(regionCode?: string): Province[] {
    this.provinces ??= this.load<PsgcProvince[]>('provinces_and_independent_cities.json');
    return regionCode
      ? this.provinces.filter(province => province.regionCode === regionCode)
      : this.provinces;
  }

  getCities(provinceCode?: string, regionCode?: string): City[] {
    this.cities ??= this.load<PsgcCity[]>('cities.json');
    if (provinceCode) {
      const independentCity = this.cities.find(city => city.code === provinceCode && city.isIndependent);
      if (independentCity) return [independentCity];
      return this.cities.filter(city => city.provinceCode === provinceCode);
    }
    return regionCode
      ? this.cities.filter(city => city.regionCode === regionCode)
      : this.cities;
  }

  getBarangays(filters: BarangayFilters = {}): Barangay[] {
    if (filters.cityCode) {
      this.barangaysByCity ??= this.load<Record<string, PsgcBarangay[]>>('barangays_by_city.json');
      const barangays = this.barangaysByCity[filters.cityCode] || [];
      const query = filters.search?.trim().toLowerCase();
      return barangays
        .filter(barangay => !query || barangay.name.toLowerCase().includes(query))
        .map(toBarangay);
    }

    if (filters.search || filters.provinceCode || filters.regionCode) {
      this.allBarangays ??= this.load<PsgcBarangay[]>('all_barangays_index.json');
      let barangays = this.allBarangays;
      if (filters.search) {
        const query = filters.search.trim().toLowerCase();
        barangays = barangays.filter(barangay =>
          barangay.name.toLowerCase().includes(query) ||
          barangay.cityName.toLowerCase().includes(query) ||
          barangay.provinceName.toLowerCase().includes(query)
        );
      }
      if (filters.regionCode) {
        barangays = barangays.filter(barangay => barangay.regionCode === filters.regionCode);
      }
      if (filters.provinceCode) {
        barangays = barangays.filter(barangay =>
          barangay.provinceCode === filters.provinceCode || barangay.cityCode === filters.provinceCode
        );
      }
      return barangays.slice(0, filters.search ? 50 : 100).map(toBarangay);
    }

    return [];
  }

  getBarangayById(id: string): Barangay | undefined {
    this.allBarangays ??= this.load<PsgcBarangay[]>('all_barangays_index.json');
    const barangay = this.allBarangays.find(item => item.id === id || item.psgcCode === id);
    return barangay ? toBarangay(barangay) : undefined;
  }

  findNearestBarangay(lat: number, lng: number): { nearestBarangay: Barangay; distanceKm: number } | undefined {
    this.allBarangays ??= this.load<PsgcBarangay[]>('all_barangays_index.json');
    let nearest: PsgcBarangay | undefined;
    let nearestDistance = Infinity;

    for (const barangay of this.allBarangays) {
      const distance = haversineDistanceKm(lat, lng, barangay.lat, barangay.lng);
      if (distance < nearestDistance) {
        nearest = barangay;
        nearestDistance = distance;
      }
    }

    return nearest
      ? { nearestBarangay: toBarangay(nearest), distanceKm: nearestDistance }
      : undefined;
  }
}

function toBarangay(barangay: PsgcBarangay): Barangay {
  return {
    ...barangay,
    population: 0,
    totalUsers: 0,
    score: {
      wasteManagement: 0,
      recycling: 0,
      communityParticipation: 0,
      reportsResolution: 0,
      cleanupActivities: 0,
      sustainabilityChallenges: 0,
      educationParticipation: 0,
      totalScore: 0,
      tier: 'Developing',
      nationalRank: 0,
    },
    totalRecycledKg: 0,
    totalReportsResolved: 0,
    totalReportsReceived: 0,
    mrfActive: false,
    garbageScheduleDays: [],
  };
}

function haversineDistanceKm(lat: number, lng: number, targetLat: number, targetLng: number): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (targetLat - lat) * radians;
  const longitudeDelta = (targetLng - lng) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat * radians) * Math.cos(targetLat * radians) *
    Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

export const psgcDirectory = new PsgcDirectory();
