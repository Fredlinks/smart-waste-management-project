import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteStop } from '../types';
import { GHANA_CENTER, GHANA_DEFAULT_ZOOM } from '../data/ghanaRegions';
import { useGeolocation } from '../hooks/useGeolocation';
import { Crosshair, MapPin } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  status?: string;
  type?: 'customer' | 'driver' | 'depot' | 'landfill' | 'selected';
  wasteType?: string;
  quantity?: string;
  driverName?: string;
  plateNumber?: string;
}

interface LeafletMapProps {
  markers?: MapMarkerItem[];
  routeCoordinates?: [number, number][];
  routeStops?: RouteStop[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  allowClickSelection?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  regionName?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers = [],
  routeCoordinates = [],
  routeStops = [],
  center = GHANA_CENTER,
  zoom = GHANA_DEFAULT_ZOOM,
  height = '400px',
  allowClickSelection = false,
  onLocationSelect,
  selectedLocation,
  regionName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const autoDetectedRef = useRef(false);
  const geo = useGeolocation(false);
  const { point: userPoint, request: requestLocation, loading: locating, error: geoError } = geo;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([center[0], center[1]] as L.LatLngTuple, zoom);

      // Clean OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; OpenStreetMap, CartoDB · Ghana National Waste Logistics')
        .addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map clicks for custom pin placement
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (allowClickSelection && onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    // Try to auto-detect user location on first mount
    if (!autoDetectedRef.current) {
      autoDetectedRef.current = true;
      requestLocation();
    }

    return () => {
      // Keep map alive or clean on unmount
    };
  }, [requestLocation]);

  // Render / move a "you are here" marker whenever the user geolocates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPoint) return;

    const userIcon = L.divIcon({
      className: 'user-location-pin',
      html: `
        <div style="position:relative;width:18px;height:18px;">
          <div style="position:absolute;inset:0;border-radius:9999px;background:#2563eb;opacity:0.25;animation:userPulse 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userPoint.lat, userPoint.lng], { icon: userIcon, interactive: false }).addTo(map);
      // Only auto-fly to user if the map hasn't been explicitly positioned with markers
      if (markers.length === 0 && routeStops.length === 0) {
        map.flyTo([userPoint.lat, userPoint.lng], Math.max(zoom, 13), { duration: 1.4 });
      }
    } else {
      userMarkerRef.current.setLatLng([userPoint.lat, userPoint.lng]);
    }
  }, [userPoint, markers.length, routeStops.length, zoom]);

  // Update view when center or zoom changes from outside
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.flyTo([center[0], center[1]], zoom, { duration: 1.2 });
    }
  }, [center[0], center[1], zoom]);

  // Update map markers and route layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const boundsPoints: [number, number][] = [];

    // Helper to create custom HTML pin
    const createCustomIcon = (type: string, status?: string, label?: string) => {
      let bgColor = 'bg-emerald-600';
      let iconHtml = '📦';

      if (type === 'depot') {
        bgColor = 'bg-slate-900';
        iconHtml = '🏢';
      } else if (type === 'landfill') {
        bgColor = 'bg-teal-700';
        iconHtml = '♻️';
      } else if (type === 'driver') {
        bgColor = 'bg-blue-600';
        iconHtml = '🚛';
      } else if (type === 'selected') {
        bgColor = 'bg-indigo-600 ring-4 ring-indigo-200 animate-bounce';
        iconHtml = '📍';
      } else {
        // Customer status colors
        switch (status) {
          case 'in_progress':
            bgColor = 'bg-amber-500 ring-4 ring-amber-200';
            iconHtml = '⏳';
            break;
          case 'assigned':
            bgColor = 'bg-blue-500';
            iconHtml = '📋';
            break;
          case 'completed':
            bgColor = 'bg-emerald-600';
            iconHtml = '✅';
            break;
          case 'failed':
            bgColor = 'bg-rose-500';
            iconHtml = '⚠️';
            break;
          case 'pending':
          default:
            bgColor = 'bg-orange-500';
            iconHtml = '📍';
            break;
        }
      }

      return L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full ${bgColor} text-white flex items-center justify-center shadow-lg border-2 border-white text-xs font-bold transition-transform hover:scale-110">
              ${label ? `<span>${label}</span>` : iconHtml}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    };

    // Draw route stops if provided
    if (routeStops && routeStops.length > 0) {
      routeStops.forEach((stop) => {
        boundsPoints.push([stop.lat, stop.lng]);
        const stopType = stop.type;
        const marker = L.marker([stop.lat, stop.lng], {
          icon: createCustomIcon(stopType, stop.status, `${stop.stopNumber}`),
        });

        const popupContent = `
          <div class="p-1">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                stop.type === 'depot' ? 'bg-slate-200 text-slate-800' :
                stop.type === 'landfill' ? 'bg-teal-100 text-teal-800' :
                'bg-emerald-100 text-emerald-800'
              }">Stop #${stop.stopNumber} · ${stop.type}</span>
              ${stop.estimatedArrival ? `<span class="text-xs text-slate-500 font-medium">${stop.estimatedArrival}</span>` : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-900">${stop.customerName || stop.address}</h4>
            ${stop.customerPhone ? `<p class="text-xs text-slate-600 mt-0.5">📞 ${stop.customerPhone}</p>` : ''}
            ${stop.quantity ? `<p class="text-xs text-emerald-700 font-semibold mt-1">Waste: ${stop.quantity} (${stop.wasteType || ''})</p>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      });
    } else {
      // Draw general markers
      markers.forEach((m) => {
        boundsPoints.push([m.lat, m.lng]);
        const marker = L.marker([m.lat, m.lng], {
          icon: createCustomIcon(m.type || 'customer', m.status),
        });

        const popupContent = `
          <div class="p-1">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                ${m.type || 'Location'}
              </span>
              ${m.status ? `<span class="text-xs font-semibold uppercase text-emerald-700">${m.status}</span>` : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-900">${m.title}</h4>
            ${m.description ? `<p class="text-xs text-slate-600 mt-1">${m.description}</p>` : ''}
            ${m.plateNumber ? `<p class="text-xs text-blue-700 font-medium mt-1">Truck: ${m.plateNumber}</p>` : ''}
            ${m.wasteType ? `<p class="text-xs text-emerald-700 font-semibold mt-1">Waste: ${m.quantity || ''} ${m.wasteType}</p>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      });
    }

    // Selected location marker for booking
    if (selectedLocation) {
      boundsPoints.push([selectedLocation.lat, selectedLocation.lng]);
      const selMarker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: createCustomIcon('selected', undefined),
      });
      selMarker.bindPopup('<b>Selected Pickup Location</b><br/>Lat: ' + selectedLocation.lat.toFixed(4) + ', Lng: ' + selectedLocation.lng.toFixed(4));
      markersLayer.addLayer(selMarker);
    }

    // Draw route polyline
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      const polyline = L.polyline(routeCoordinates, {
        color: '#059669',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(map);

      routeLayerRef.current = polyline;
      routeCoordinates.forEach((coord) => boundsPoints.push(coord));
    }

    // Auto-fit map to show all items
    if (boundsPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (err) {
        console.error('Fit bounds error', err);
      }
    }
  }, [markers, routeCoordinates, routeStops, selectedLocation]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {allowClickSelection && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
          Click anywhere on the map to pin your exact pickup address
        </div>
      )}

      {/* "Locate me" button — always available so users can re-center on their device */}
      <button
        type="button"
        onClick={() => {
          requestLocation();
          if (userPoint && mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([userPoint.lat, userPoint.lng], Math.max(zoom, 14), { duration: 1 });
          }
        }}
        title="Center map on my current location"
        className="absolute bottom-4 right-4 z-[1000] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-lg border border-slate-200 dark:border-slate-700 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
      >
        {locating ? (
          <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4 text-blue-600" />
        )}
      </button>

      {userPoint && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-blue-600" />
          You: {userPoint.lat.toFixed(4)}, {userPoint.lng.toFixed(4)}
          {userPoint.accuracy ? ` (±${Math.round(userPoint.accuracy)}m)` : ''}
        </div>
      )}

      {geoError && !userPoint && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2.5 py-1.5 rounded-lg shadow-md border border-amber-200 dark:border-amber-700/50 text-[10px] font-medium max-w-[280px]">
          {geoError}
        </div>
      )}
    </div>
  );
};
