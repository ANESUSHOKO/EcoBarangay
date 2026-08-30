import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Facility, EnvironmentalReport, Event } from '../../types';

interface MapProps {
  facilities?: Facility[];
  reports?: EnvironmentalReport[];
  events?: Event[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onFacilityClick?: (facility: Facility) => void;
  onReportClick?: (report: EnvironmentalReport) => void;
  onEventClick?: (event: Event) => void;
  height?: string;
}

export const InteractiveMap: React.FC<MapProps> = ({
  facilities = [],
  reports = [],
  events = [],
  centerLat = 14.5721,
  centerLng = 121.0625,
  zoom = 14,
  onFacilityClick,
  onReportClick,
  onEventClick,
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map instance if not existing
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
    }
  }, [centerLat, centerLng, zoom]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    // Facility Markers
    facilities.forEach(fac => {
      let iconColor = '#059669'; // Default emerald
      let categoryEmoji = '♻️';

      if (fac.category === 'mrf') {
        iconColor = '#2563eb';
        categoryEmoji = '🏭';
      } else if (fac.category === 'junkshop') {
        iconColor = '#d97706';
        categoryEmoji = '🛍️';
      } else if (fac.category === 'ewaste') {
        iconColor = '#7c3aed';
        categoryEmoji = '🔋';
      } else if (fac.category === 'composting') {
        iconColor = '#16a34a';
        categoryEmoji = '🌱';
      }

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background-color: ${iconColor};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 2px solid white;
          ">
            ${categoryEmoji}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 200px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; background: ${iconColor}20; color: ${iconColor}; text-transform: uppercase;">
            ${fac.category.toUpperCase()}
          </span>
          <h4 style="margin: 6px 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${fac.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${fac.address}</p>
          <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
            <strong>Accepted:</strong> ${fac.acceptedMaterials.join(', ')}
          </div>
          <div style="font-size: 11px; color: #475569;">🕒 ${fac.openingHours}</div>
          ${fac.distanceKm !== undefined ? `<div style="font-size: 11px; font-weight: 600; color: #059669; margin-top: 4px;">📍 ${fac.distanceKm} km away</div>` : ''}
        </div>
      `;

      const marker = L.marker([fac.lat, fac.lng], { icon: customIcon }).bindPopup(popupContent);

      marker.on('click', () => {
        if (onFacilityClick) onFacilityClick(fac);
      });

      markersGroupRef.current?.addLayer(marker);
    });

    // Environmental Report Markers
    reports.forEach(rep => {
      const isResolved = rep.status === 'Resolved';
      const iconColor = isResolved ? '#10b981' : '#ef4444';

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background-color: ${iconColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            🚨
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 200px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; background: ${iconColor}20; color: ${iconColor};">
            ${rep.status.toUpperCase()} REPORT
          </span>
          <h4 style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${rep.category}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${rep.locationAddress}</p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #334155;">"${rep.description}"</p>
          <div style="font-size: 10px; color: #94a3b8;">Reported by ${rep.reporterName}</div>
        </div>
      `;

      const marker = L.marker([rep.lat, rep.lng], { icon: customIcon }).bindPopup(popupContent);

      marker.on('click', () => {
        if (onReportClick) onReportClick(rep);
      });

      markersGroupRef.current?.addLayer(marker);
    });

    // Event Markers
    events.forEach(evt => {
      if (!evt.lat || !evt.lng) return;

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background-color: #0d9488;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 17px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 2px solid white;
          ">
            🧹
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 200px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; background: #0d948820; color: #0d9488;">
            EVENT (${evt.category})
          </span>
          <h4 style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${evt.title}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">📅 ${evt.date} | ⏰ ${evt.time}</p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #334155;">📍 ${evt.location}</p>
          <div style="font-size: 11px; font-weight: 700; color: #059669;">🎁 Earn +${evt.pointsAwarded} Eco Points</div>
        </div>
      `;

      const marker = L.marker([evt.lat, evt.lng], { icon: customIcon }).bindPopup(popupContent);

      marker.on('click', () => {
        if (onEventClick) onEventClick(evt);
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [facilities, reports, events, onFacilityClick, onReportClick, onEventClick]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm max-w-full">
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full z-0 min-h-[340px] max-h-[70vh] sm:max-h-none"
      />
    </div>
  );
};
