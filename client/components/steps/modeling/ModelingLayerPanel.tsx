import React from 'react';
import { Layers, X, Box, Pentagon, TreeDeciduous } from 'lucide-react';
import { DesignState } from '../../../types';

interface ModelingLayerPanelProps {
    showLayerPanel: boolean;
    setShowLayerPanel: (show: boolean) => void;
    layerVisibility: { roofs: boolean; obstructions: boolean; trees: boolean };
    setLayerVisibility: React.Dispatch<React.SetStateAction<{ roofs: boolean; obstructions: boolean; trees: boolean }>>;
    designData: DesignState;
}

export default function ModelingLayerPanel({
    showLayerPanel,
    setShowLayerPanel,
    layerVisibility,
    setLayerVisibility,
    designData
}: ModelingLayerPanelProps) {
    if (!showLayerPanel) return null;

    return (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-56 z-50">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold flex items-center gap-2"><Layers size={18} /> Layers</h3>
                <button onClick={() => setShowLayerPanel(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                        type="checkbox"
                        checked={layerVisibility.roofs}
                        onChange={(e) => setLayerVisibility(prev => ({ ...prev, roofs: e.target.checked }))}
                        className="w-4 h-4"
                    />
                    <Box size={16} className={layerVisibility.roofs ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`text-sm ${layerVisibility.roofs ? 'text-slate-800' : 'text-slate-400'}`}>
                        Roofs ({designData.roofs.length})
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                        type="checkbox"
                        checked={layerVisibility.obstructions}
                        onChange={(e) => setLayerVisibility(prev => ({ ...prev, obstructions: e.target.checked }))}
                        className="w-4 h-4"
                    />
                    <Pentagon size={16} className={layerVisibility.obstructions ? 'text-red-600' : 'text-slate-400'} />
                    <span className={`text-sm ${layerVisibility.obstructions ? 'text-slate-800' : 'text-slate-400'}`}>
                        Obstructions ({designData.obstructions.length})
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                        type="checkbox"
                        checked={layerVisibility.trees}
                        onChange={(e) => setLayerVisibility(prev => ({ ...prev, trees: e.target.checked }))}
                        className="w-4 h-4"
                    />
                    <TreeDeciduous size={16} className={layerVisibility.trees ? 'text-green-600' : 'text-slate-400'} />
                    <span className={`text-sm ${layerVisibility.trees ? 'text-slate-800' : 'text-slate-400'}`}>
                        Trees ({(designData.trees || []).length})
                    </span>
                </label>
            </div>
        </div>
    );
}
