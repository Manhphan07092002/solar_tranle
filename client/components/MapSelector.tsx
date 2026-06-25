import React, { useState, useEffect } from 'react';
import { Crosshair, Camera, AlertTriangle, Loader2, Locate, ZoomIn, ZoomOut } from 'lucide-react';
import { MapConfig } from '../types';
import SatelliteMap from './SatelliteMap';

interface MapSelectorProps {
  onCapture: (config: MapConfig) => void;
  targetLocation?: { lat: number; lng: number } | null;
  initialConfig?: MapConfig | null;
}

// Default coordinate (Da Nang, Vietnam)
const DEFAULT_CENTER = { lat: 16.0544, lng: 108.2022 };
const DEFAULT_ZOOM = 20;

export const MapSelector: React.FC<MapSelectorProps> = ({
  onCapture,
  targetLocation,
  initialConfig
}) => {
  // Separate state for "Commanded View" (what we tell map to do)
  // and "Actual View" (where the map is right now).
  // This prevents the circular loop of: Drag -> Update State -> Update Map Prop -> Map Resets/Flickers.
  const [viewConfig, setViewConfig] = useState<MapConfig>(
    initialConfig || {
      lat: DEFAULT_CENTER.lat,
      lng: DEFAULT_CENTER.lng,
      zoom: DEFAULT_ZOOM
    }
  );

  const [captureConfig, setCaptureConfig] = useState<MapConfig>(viewConfig);

  // Track processed target location to avoid re-centering on re-renders
  const lastProcessedTarget = React.useRef(targetLocation);

  // Update center when target location changes (from search only)
  useEffect(() => {


    // Only update if targetLocation has changed by value (or is new reference and different)
    if (targetLocation &&
      (targetLocation !== lastProcessedTarget.current)) {

      const isSame = lastProcessedTarget.current &&
        Math.abs(targetLocation.lat - lastProcessedTarget.current.lat) < 0.0001 &&
        Math.abs(targetLocation.lng - lastProcessedTarget.current.lng) < 0.0001;

      if (!isSame) {
        const newConfig = {
          lat: targetLocation.lat,
          lng: targetLocation.lng,
          zoom: 21 // Auto zoom in on search result
        };
        setViewConfig(newConfig); // Command map to move
        setCaptureConfig(newConfig); // Sync capture state
        lastProcessedTarget.current = targetLocation;
      }
    }
  }, [targetLocation]);

  // Manual Capture Handler
  const handleCapture = () => {
    onCapture(captureConfig);
  };

  // Locate Me Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newConfig = {
          lat: latitude,
          lng: longitude,
          zoom: 20
        };
        setViewConfig(newConfig);
        setCaptureConfig(newConfig);
      },
      () => {
        alert("Unable to retrieve your location");
      }
    );
  };

  const handleMapMove = React.useCallback((center: { lat: number; lng: number }, zoom: number) => {
    // Only update capture config, DO NOT update viewConfig (which would force map reset)
    setCaptureConfig({ lat: center.lat, lng: center.lng, zoom });
  }, []);


  const handleZoomIn = () => {
    setViewConfig(prev => {
      const nextZoom = Math.min((prev.zoom || DEFAULT_ZOOM) + 1, 22);
      const next = { ...prev, zoom: nextZoom };
      setCaptureConfig(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setViewConfig(prev => {
      const nextZoom = Math.max((prev.zoom || DEFAULT_ZOOM) - 1, 10);
      const next = { ...prev, zoom: nextZoom };
      setCaptureConfig(next);
      return next;
    });
  };



  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="relative w-full h-full bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-300 shadow-inner group">

        {/* Map Component - Key removed to prevent remounting crashes. MapController handles updates. */}
        <div className="h-full w-full">
          <SatelliteMap
            center={{ lat: viewConfig.lat, lng: viewConfig.lng }}
            zoom={viewConfig.zoom}
            onMoveEnd={handleMapMove}
            interactive={true}
            showMarker={!!targetLocation}
            markerPosition={targetLocation}
          />
        </div>

        {/* Capture Area Overlay (Fixed 900x900 px ratio logic relative to view) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
          <div className="w-[450px] h-[450px] md:w-[600px] md:h-[600px] border-2 border-dashed border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] relative box-border">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-t shadow-lg">
              Design Area
            </div>
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 drop-shadow-md">
              <Crosshair size={32} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 right-6 z-[2000] flex flex-col gap-3 items-end">
          {/* Zoom Controls */}
          <div className="flex bg-white rounded shadow-md flex-col overflow-hidden border border-slate-200">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 border-b border-slate-100"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
          </div>
          {/* Locate Me Button */}
          <button
            onClick={handleLocateMe}
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 border border-slate-200"
            title="My Location"
          >
            <Locate size={20} />
          </button>

          {/* Manual Capture Button */}
          <button
            onClick={handleCapture}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
          >
            <Camera size={20} />
            Capture Location
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center mt-[-10px]">
        Drag the map to center your building inside the red box. High-resolution satellite imagery provided.
      </p>
    </div>
  );
};