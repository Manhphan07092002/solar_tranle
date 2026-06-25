import React from 'react';
import { DesignState } from '../../../types';
import { Settings, Download } from 'lucide-react';
import StringPreview from './StringPreview';

interface Props {
    designData: DesignState;
}

const LOSS_DATA = [
    { label: 'Global irradiance on PV modules', val: -7.41, type: 'loss' },
    { label: 'Shading irradiance loss', val: -0.50, type: 'loss' },
    { label: 'Reflection loss', val: -2.39, type: 'loss' },
    { label: 'Energy after PV conversion', val: 32.53, type: 'milestone' },
    { label: 'Irradiance level loss', val: -1.00, type: 'loss' },
    { label: 'Temperature loss', val: -3.01, type: 'loss' },
    { label: 'Shading electrical loss', val: -0.22, type: 'loss' },
    { label: 'Module quality loss', val: 2.48, type: 'gain' },
    { label: 'Optimizer efficiency loss', val: -0.65, type: 'loss' },
    { label: 'DC Ohmic wiring loss', val: -0.42, type: 'loss' },
    { label: 'Energy after DC losses', val: 30.06, type: 'milestone' },
    { label: 'PV Inverter loss', val: -3.01, type: 'loss' },
    { label: 'Exportable energy', val: 28.53, type: 'milestone' },
];

export default function ProjectLayoutTab({ designData }: Props) {
    const numModules = designData.modules.length;
    const modulePower = designData.selectedModule?.power || 550;
    const specificYield = designData.weather?.specificYield > 0 ? designData.weather?.specificYield : 1400;
    
    // Actual exportable energy in MWh based on system size
    const actualExportableMWh = (numModules * modulePower * specificYield) / 1000000;
    // Scale factor against the dummy reference data (28.53 MWh)
    const scale = actualExportableMWh > 0 ? actualExportableMWh / 28.53 : 0;
    
    // Waterfall logic for visual rendering
    let currentOffset = 100; // start at 100% width
    
    return (
        <div className="space-y-6 pb-20">
            {/* SYSTEM LOSS DIAGRAM */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">System Loss Diagram</h3>
                </div>
                <div className="p-8">
                    <div className="space-y-2">
                        {/* Initial Global Irradiance */}
                        <div className="flex items-center text-xs">
                            <div className="w-1/4 text-blue-600 font-medium truncate pr-4 text-right">Global horizontal irradiance</div>
                            <div className="w-3/4 flex items-center">
                                <div className="bg-[#4a90e2] h-4 rounded-sm flex items-center px-2" style={{ width: '100%' }}>
                                    <span className="text-[9px] text-white font-bold">{(5.68 * scale).toFixed(2)} MWh/m²</span>
                                </div>
                            </div>
                        </div>
                        
                        {LOSS_DATA.map((item, idx) => {
                            if (item.type === 'milestone') {
                                currentOffset = (item.val / 35) * 100; // arbitrary scale for demo
                                const scaledVal = (item.val * scale).toFixed(2);
                                return (
                                    <div key={idx} className="flex items-center text-xs py-1">
                                        <div className="w-1/4 text-blue-600 font-bold truncate pr-4 text-right">{item.label}</div>
                                        <div className="w-3/4 flex items-center">
                                            <div className="bg-[#4a90e2] h-4 rounded-sm flex items-center px-2" style={{ width: `${currentOffset}%` }}>
                                                <span className="text-[9px] text-white font-bold">{scaledVal} MWh</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                const barWidth = Math.abs(item.val) * 2; // visual multiplier
                                const isGain = item.type === 'gain';
                                
                                // Before drawing the loss, calculate its position
                                const offsetLeft = isGain ? currentOffset : currentOffset - barWidth;
                                
                                return (
                                    <div key={idx} className="flex items-center text-xs">
                                        <div className="w-1/4 text-slate-500 truncate pr-4 text-right">{item.label}</div>
                                        <div className="w-3/4 relative h-4">
                                            <div 
                                                className={`absolute h-4 rounded-sm flex items-center px-1 ${isGain ? 'bg-[#4a90e2]' : 'bg-[#e74c3c]'}`}
                                                style={{ 
                                                    left: `${offsetLeft}%`, 
                                                    width: `${barWidth}%`,
                                                    justifyContent: isGain ? 'flex-start' : 'flex-end'
                                                }}
                                            >
                                                <span className="text-[9px] text-white font-bold absolute -right-10 text-slate-600 whitespace-nowrap">
                                                    {item.val > 0 ? '+' : ''}{item.val}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            </div>

            {/* SIMULATION PARAMETERS */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                        <Settings size={16} className="text-slate-400" />
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Location & Grid</h3>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-xs text-slate-600">
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="px-6 py-3 font-medium text-slate-500 w-1/2">Time zone</td><td className="px-6 py-3 text-right font-semibold text-slate-800">GMT+7 (Ho Chi Minh)</td></tr>
                                <tr><td className="px-6 py-3 font-medium text-slate-500 w-1/2">Weather station</td><td className="px-6 py-3 text-right font-semibold text-slate-800">Da Nang Intl Airp. (8 km away)</td></tr>
                                <tr><td className="px-6 py-3 font-medium text-slate-500 w-1/2">Station altitude</td><td className="px-6 py-3 text-right font-semibold text-slate-800">7 m</td></tr>
                                <tr><td className="px-6 py-3 font-medium text-slate-500 w-1/2">Station data source</td><td className="px-6 py-3 text-right font-semibold text-slate-800">Meteonorm 8.2</td></tr>
                                <tr><td className="px-6 py-3 font-medium text-slate-500 w-1/2">Grid</td><td className="px-6 py-3 text-right font-semibold text-slate-800">{designData.grid?.gridType || '400V L-L, 230V L-N'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings size={16} className="text-red-400" />
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Loss Factors</h3>
                        </div>
                        <span className="text-xs text-blue-600 font-medium cursor-pointer">Advanced Settings</span>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-xs text-slate-600">
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500 w-3/4">Near shading</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">Enabled</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">Albedo</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">0.20</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">Soiling/Snow</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">0%</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">Incidence angle modifier (IAM)</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">0.05</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">Thermal loss factor Uc (const) Flush mount</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">20</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">Thermal loss factor Uc (const) Tilted</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">25</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">LID loss factor</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">0%</td></tr>
                                <tr><td className="px-6 py-2.5 font-medium text-slate-500">System unavailability</td><td className="px-6 py-2.5 text-right font-semibold text-slate-800">0%</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* STRING LAYOUT */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">String Layout</h3>
                </div>
                <div className="p-8 flex gap-8">
                    <div className="w-1/3">
                        <p className="text-sm text-slate-600 mb-6">
                            The string design report provides a graphical and a textual representation of how strings are connected to the inverter(s).
                            Each power optimizer has an identifier of the inverter and an ordinal number of the string it belongs to.
                        </p>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-blue-100 transition-colors">
                                Download PDF
                            </button>
                            <button className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-blue-50 transition-colors">
                                Download DXF
                            </button>
                        </div>
                    </div>
                    <div className="w-2/3 flex items-center justify-center bg-[#f8fafc] rounded-lg border border-slate-200 p-2 min-h-[300px]">
                        <StringPreview designData={designData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
