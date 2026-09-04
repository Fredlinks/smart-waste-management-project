import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface LiveDriver {
  driverId: string;
  lat: number;
  lng: number;
  speedKph: number;
  heading: string;
  timestamp: string;
}

export interface LiveStatus {
  collectionId: string;
  status: string;
  assignedDriverId?: string;
}

interface StreamContextType {
  drivers: Record<string, LiveDriver>;
  statuses: Record<string, LiveStatus>;
  connected: boolean;
  pushDriverLocation: (driverId: string, lat: number, lng: number, opts?: { speedKph?: number; heading?: LiveDriver['heading'] }) => Promise<void>;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drivers, setDrivers] = useState<Record<string, LiveDriver>>({});
  const [statuses, setStatuses] = useState<Record<string, LiveStatus>>({});
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const es = new EventSource('/api/stream');
    esRef.current = es;

    const onDriver = (e: MessageEvent) => {
      try {
        const data: LiveDriver = JSON.parse(e.data);
        setDrivers((prev) => ({ ...prev, [data.driverId]: data }));
      } catch {
        // ignore
      }
    };
    const onStatus = (e: MessageEvent) => {
      try {
        const data: LiveStatus = JSON.parse(e.data);
        setStatuses((prev) => ({ ...prev, [data.collectionId]: data }));
      } catch {
        // ignore
      }
    };
    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);

    es.addEventListener('driver-location', onDriver);
    es.addEventListener('collection-status', onStatus);
    es.addEventListener('ping', () => {
      // heartbeat received — consider us connected if not already
      setConnected(true);
    });
    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);

    return () => {
      es.removeEventListener('driver-location', onDriver);
      es.removeEventListener('collection-status', onStatus);
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, []);

  const pushDriverLocation = useCallback(
    async (driverId: string, lat: number, lng: number, opts?: { speedKph?: number; heading?: LiveDriver['heading'] }) => {
      try {
        await fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId,
            lat,
            lng,
            speedKph: opts?.speedKph ?? 25,
            heading: opts?.heading ?? 'N',
          }),
        });
      } catch {
        // ignore — SSE will pick up the next push
      }
    },
    []
  );

  const value = useMemo<StreamContextType>(
    () => ({ drivers, statuses, connected, pushDriverLocation }),
    [drivers, statuses, connected, pushDriverLocation]
  );

  return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>;
};

export function useStream() {
  const ctx = useContext(StreamContext);
  if (!ctx) throw new Error('useStream must be used within a StreamProvider');
  return ctx;
}