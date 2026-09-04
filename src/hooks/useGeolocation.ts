import { useCallback, useEffect, useState } from 'react';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

interface GeolocationState {
  point: GeoPoint | null;
  error: string | null;
  loading: boolean;
  supported: boolean;
}

const GHANA_BOUNDS = { lat: [4.5, 11.5], lng: [-3.5, 1.5] };
const GHANA_FALLBACK: GeoPoint = { lat: 5.6037, lng: -0.187, accuracy: 50000, timestamp: Date.now() };

function isInGhana(p: { lat: number; lng: number }) {
  return p.lat >= GHANA_BOUNDS.lat[0] && p.lat <= GHANA_BOUNDS.lat[1] && p.lng >= GHANA_BOUNDS.lng[0] && p.lng <= GHANA_BOUNDS.lng[1];
}

export function useGeolocation(autoStart = false) {
  const [state, setState] = useState<GeolocationState>(() => ({
    point: null,
    error: null,
    loading: false,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  }));

  const request = useCallback(() => {
    if (!state.supported) {
      setState((s) => ({ ...s, error: 'Geolocation not supported by this browser', point: GHANA_FALLBACK }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        if (!isInGhana(point)) {
          setState({
            point: GHANA_FALLBACK,
            error: 'Detected location is outside Ghana — using default (Accra).',
            loading: false,
            supported: true,
          });
          return;
        }
        setState({ point, error: null, loading: false, supported: true });
      },
      (err) => {
        setState({
          point: GHANA_FALLBACK,
          error: `Geolocation unavailable (${err.message}). Using default Accra hub.`,
          loading: false,
          supported: true,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }, [state.supported]);

  useEffect(() => {
    if (autoStart) request();
  }, [autoStart, request]);

  return { ...state, request };
}