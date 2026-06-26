import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Map, Marker } from 'pigeon-maps';

interface SatelliteMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  interactive?: boolean;
  onMoveEnd?: (center: { lat: number; lng: number }, zoom: number) => void;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number } | null;
  provider?: (x: number, y: number, z: number, dpr?: number) => string;
  staticImageUrl?: string;
  width?: number;
  height?: number;
}

// Google Satellite tile provider
export function googleSatelliteProvider(x: number, y: number, z: number, dpr?: number) {
  return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;
}

// Fallback: OpenStreetMap if Google fails
export function osmProvider(x: number, y: number, z: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

// Esri Satellite provider (often more reliable for high zoom free usage)
export function esriSatelliteProvider(x: number, y: number, z: number) {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
}

// Debounce helper
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;
}

function SatelliteMap({
  center,
  zoom,
  interactive = true,
  onMoveEnd,
  showMarker = false,
  markerPosition,
  provider = googleSatelliteProvider,
  staticImageUrl,
  width,
  height
}: SatelliteMapProps) {
  // Local state for interactive mode
  const [mapCenter, setMapCenter] = useState<[number, number]>([center.lat, center.lng]);
  const [mapZoom, setMapZoom] = useState(zoom);

  // Sync local state when props change
  useEffect(() => {
    setMapCenter([center.lat, center.lng]);
    setMapZoom(zoom);
  }, [center.lat, center.lng, zoom]);

  // Derived active state: strictly follow props if not interactive, avoiding 1-frame lag
  const activeCenter: [number, number] = interactive ? mapCenter : [center.lat, center.lng];
  const activeZoom = interactive ? mapZoom : zoom;

  const debouncedOnMoveEnd = useDebounce((newCenter: [number, number], newZoom: number) => {
    if (onMoveEnd) onMoveEnd({ lat: newCenter[0], lng: newCenter[1] }, newZoom);
  }, 300);

  const handleBoundsChange = useCallback(({ center: newCenter, zoom: newZoom }: { center: [number, number]; zoom: number }) => {
    setMapCenter(newCenter);
    const maxStep = 0.25;
    const dz = newZoom - mapZoom;
    const nextZoom = Math.abs(dz) > maxStep ? mapZoom + Math.sign(dz) * maxStep : newZoom;
    setMapZoom(nextZoom);
    debouncedOnMoveEnd(newCenter, nextZoom);
  }, [debouncedOnMoveEnd, mapZoom]);

  return (
    <div style={{ height: height ? `${height}px` : '100%', width: width ? `${width}px` : '100%', position: 'relative' }}>
      <Map
        width={width}
        height={height}
        center={activeCenter}
        zoom={activeZoom}
        onBoundsChanged={handleBoundsChange}
        provider={provider}
        dprs={[1, 2]}
        minZoom={10}
        maxZoom={24}
        mouseEvents={interactive}
        touchEvents={interactive}
        twoFingerDrag={interactive}
        metaWheelZoom={true}
        metaWheelZoomWarning="Dùng CTRL + scroll để zoom"
        animateMaxScreens={15}
        animate={interactive}
        attribution={false}
        attributionPrefix={false}
      >
        {showMarker && (markerPosition || center) && (
          <Marker
            anchor={markerPosition ? [markerPosition.lat, markerPosition.lng] : [center.lat, center.lng]}
            color="#ef4444"
            width={40}
          />
        )}
      </Map>
      {staticImageUrl && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000 }}>
          <img src={staticImageUrl} alt="site preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </div>
  );
}

export default React.memo(SatelliteMap);