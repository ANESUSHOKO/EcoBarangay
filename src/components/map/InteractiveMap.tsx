import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Pin
} from '@vis.gl/react-google-maps';
import { Facility, EnvironmentalReport, Event } from '../../types';
import { MapPin, Navigation, Sparkles, AlertCircle, Info, ExternalLink } from 'lucide-react';

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
  initialProvider?: 'google' | 'osm';
}

interface SelectedMarker {
  type: 'facility' | 'report' | 'event';
  data: Facility | EnvironmentalReport | Event;
  lat: number;
  lng: number;
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
  initialProvider,
}) => {
  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
  
  // Choose default provider: Google Maps if key available, else OpenStreetMap for free zero-config
  const [provider, setProvider] = useState<'google' | 'osm'>(() => {
    if (initialProvider) return initialProvider;
    return mapsApiKey ? 'google' : 'osm';
  });

  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);

  // Leaflet references
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (provider !== 'osm' || !leafletContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(leafletContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
      leafletMarkersGroupRef.current = L.layerGroup().addTo(map);
    } else {
      leafletMapRef.current.setView([centerLat, centerLng], zoom);
    }
  }, [provider, centerLat, centerLng, zoom]);

  // Update Leaflet markers
  useEffect(() => {
    if (provider !== 'osm' || !leafletMapRef.current || !leafletMarkersGroupRef.current) return;

    leafletMarkersGroupRef.current.clearLayers();

    // Facilities
    facilities.forEach(fac => {
      let iconColor = '#059669';
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
        </div>
      `;

      const marker = L.marker([fac.lat, fac.lng], { icon: customIcon }).bindPopup(popupContent);
      marker.on('click', () => {
        if (onFacilityClick) onFacilityClick(fac);
      });
      leafletMarkersGroupRef.current?.addLayer(marker);
    });

    // Reports
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
        </div>
      `;

      const marker = L.marker([rep.lat, rep.lng], { icon: customIcon }).bindPopup(popupContent);
      marker.on('click', () => {
        if (onReportClick) onReportClick(rep);
      });
      leafletMarkersGroupRef.current?.addLayer(marker);
    });

    // Events
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

      const marker = L.marker([evt.lat, evt.lng], { icon: customIcon });
      marker.on('click', () => {
        if (onEventClick) onEventClick(evt);
      });
      leafletMarkersGroupRef.current?.addLayer(marker);
    });
  }, [provider, facilities, reports, events, onFacilityClick, onReportClick, onEventClick]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-full bg-slate-100 dark:bg-slate-900">
      {/* Provider Switcher Badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setProvider('google')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            provider === 'google'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Google Maps
        </button>
        <button
          type="button"
          onClick={() => setProvider('osm')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            provider === 'osm'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          OpenStreetMap (Free)
        </button>
      </div>

      {/* Google Maps Render */}
      {provider === 'google' ? (
        <APIProvider apiKey={mapsApiKey} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
          <div style={{ height }} className="w-full relative min-h-[340px] max-h-[70vh] sm:max-h-none">
            <GoogleMap
              id="DEMO_MAP_ID"
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: centerLat, lng: centerLng }}
              defaultZoom={zoom}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Facilities Advanced Markers */}
              {facilities.map(fac => {
                let glyphEmoji = '♻️';
                let bg = '#059669';
                if (fac.category === 'mrf') {
                  glyphEmoji = '🏭';
                  bg = '#2563eb';
                } else if (fac.category === 'junkshop') {
                  glyphEmoji = '🛍️';
                  bg = '#d97706';
                } else if (fac.category === 'ewaste') {
                  glyphEmoji = '🔋';
                  bg = '#7c3aed';
                } else if (fac.category === 'composting') {
                  glyphEmoji = '🌱';
                  bg = '#16a34a';
                }

                return (
                  <AdvancedMarker
                    key={`fac-${fac.id}`}
                    position={{ lat: fac.lat, lng: fac.lng }}
                    title={fac.name}
                    onClick={() => {
                      setSelectedMarker({
                        type: 'facility',
                        data: fac,
                        lat: fac.lat,
                        lng: fac.lng,
                      });
                      if (onFacilityClick) onFacilityClick(fac);
                    }}
                  >
                    <Pin background={bg} glyphColor="#ffffff" borderColor="#ffffff">
                      <span className="text-sm">{glyphEmoji}</span>
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* Environmental Reports Advanced Markers */}
              {reports.map(rep => {
                const isResolved = rep.status === 'Resolved';
                const bg = isResolved ? '#10b981' : '#ef4444';
                return (
                  <AdvancedMarker
                    key={`rep-${rep.id}`}
                    position={{ lat: rep.lat, lng: rep.lng }}
                    title={`${rep.category} (${rep.status})`}
                    onClick={() => {
                      setSelectedMarker({
                        type: 'report',
                        data: rep,
                        lat: rep.lat,
                        lng: rep.lng,
                      });
                      if (onReportClick) onReportClick(rep);
                    }}
                  >
                    <Pin background={bg} glyphColor="#ffffff" borderColor="#ffffff">
                      <span className="text-xs font-black">🚨</span>
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* Events Advanced Markers */}
              {events
                .filter(evt => evt.lat && evt.lng)
                .map(evt => (
                  <AdvancedMarker
                    key={`evt-${evt.id}`}
                    position={{ lat: evt.lat!, lng: evt.lng! }}
                    title={evt.title}
                    onClick={() => {
                      setSelectedMarker({
                        type: 'event',
                        data: evt,
                        lat: evt.lat!,
                        lng: evt.lng!,
                      });
                      if (onEventClick) onEventClick(evt);
                    }}
                  >
                    <Pin background="#0d9488" glyphColor="#ffffff" borderColor="#ffffff">
                      <span className="text-xs">🧹</span>
                    </Pin>
                  </AdvancedMarker>
                ))}

              {/* Google Maps InfoWindow */}
              {selectedMarker && (
                <InfoWindow
                  position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 max-w-xs text-slate-900 font-sans">
                    {selectedMarker.type === 'facility' && (
                      (() => {
                        const fac = selectedMarker.data as Facility;
                        return (
                          <div className="space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              {fac.category}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 leading-snug">{fac.name}</h4>
                            <p className="text-xs text-slate-600">{fac.address}</p>
                            <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="font-semibold">Accepted:</span> {fac.acceptedMaterials.join(', ')}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                              <span>🕒 {fac.openingHours}</span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fac.name + ' ' + fac.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 underline"
                              >
                                Directions <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {selectedMarker.type === 'report' && (
                      (() => {
                        const rep = selectedMarker.data as EnvironmentalReport;
                        return (
                          <div className="space-y-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rep.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {rep.status} Report
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{rep.category}</h4>
                            <p className="text-xs text-slate-600">{rep.locationAddress}</p>
                            <p className="text-xs italic text-slate-700">"{rep.description}"</p>
                          </div>
                        );
                      })()
                    )}

                    {selectedMarker.type === 'event' && (
                      (() => {
                        const evt = selectedMarker.data as Event;
                        return (
                          <div className="space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                              Community Activity
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                            <p className="text-xs text-slate-600">📅 {evt.date} | ⏰ {evt.time}</p>
                            <p className="text-xs text-slate-600">📍 {evt.location}</p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        </APIProvider>
      ) : (
        /* OpenStreetMap Render */
        <div
          ref={leafletContainerRef}
          style={{ height }}
          className="w-full z-0 min-h-[340px] max-h-[70vh] sm:max-h-none"
        />
      )}
    </div>
  );
};
