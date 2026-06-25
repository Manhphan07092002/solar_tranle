import React from 'react';
import { Check, MapPin } from 'lucide-react';
import { DesignState, MapConfig } from '../../../types';
import { MapSelector } from '../../MapSelector';

interface SetupMapPanelProps {
    designData: DesignState;
    targetLocation: { lat: number, lng: number } | null;
    handleMapCapture: (config: MapConfig) => void;
}

export default function SetupMapPanel({ designData, targetLocation, handleMapCapture }: SetupMapPanelProps) {
    return (
        <div className="w-2/3 bg-slate-100 relative flex flex-col">
            {/* Map Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" />
                    <span className="font-semibold text-slate-800">Site Location</span>
                    {designData.mapConfig && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Check size={12} />
                            Locked
                        </span>
                    )}
                </div>
                {targetLocation && (
                    <button
                        onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${targetLocation.lat}&mlon=${targetLocation.lng}#map=19/${targetLocation.lat}/${targetLocation.lng}`, '_blank')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                        View on Google Maps
                    </button>
                )}
            </div>

            {/* Map Display */}
            <div className="flex-1 relative">
                <MapSelector
                    onCapture={handleMapCapture}
                    targetLocation={targetLocation}
                    initialConfig={designData.mapConfig}
                />
            </div>
        </div>
    );
}
