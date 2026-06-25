import React, { useMemo } from 'react';
import { DesignState } from '../types';

interface ProjectStatsFooterProps {
    designData: DesignState;
}

export default function ProjectStatsFooter({ designData }: ProjectStatsFooterProps) {
    const stats = useMemo(() => {
        const totalModules = designData.modules?.length || 0;
        const validModules = designData.modules?.filter(m => !m.isShaded).length || 0;
        
        const modulePowerW = designData.selectedModule?.power || 0;
        const totalDC = (totalModules * modulePowerW) / 1000;
        const validDC = (validModules * modulePowerW) / 1000;
        
        const specificYield = designData.weather?.specificYield || 1500; // default to 1500 if not available
        const annualProdMWh = (validDC * specificYield) / 1000;
        const annualConsMWh = (designData.consumption?.annualConsumption || 0) / 1000;

        return {
            totalModules,
            validModules,
            totalDC,
            validDC,
            annualProdMWh,
            annualConsMWh
        };
    }, [designData]);

    const moduleProgress = stats.totalModules > 0 ? (stats.validModules / stats.totalModules) * 100 : 0;
    const powerProgress = stats.totalDC > 0 ? (stats.validDC / stats.totalDC) * 100 : 0;
    const prodProgress = stats.annualConsMWh > 0 ? Math.min((stats.annualProdMWh / stats.annualConsMWh) * 100, 100) : 100;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#2a2a2ab3] border border-slate-600 rounded-md shadow-2xl backdrop-blur-md px-6 py-3 flex items-end gap-12 text-slate-200 pointer-events-none select-none">
            {/* PV Modules */}
            <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">PV Modules</span>
                <div className="font-bold text-lg">
                    <span className="text-white">{stats.validModules}</span>
                    <span className="text-slate-400 text-base">/{stats.totalModules}</span>
                </div>
                <div className="w-full h-1 bg-slate-700 mt-1">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-300" 
                        style={{ width: `${moduleProgress}%` }}
                    />
                </div>
            </div>

            {/* DC Power */}
            <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">DC Power</span>
                <div className="font-bold text-lg">
                    <span className="text-white">{stats.validDC.toFixed(1)}</span>
                    <span className="text-slate-400 text-base">/{stats.totalDC.toFixed(1)} <span className="text-sm font-normal">kWp</span></span>
                </div>
                <div className="w-full h-1 bg-slate-700 mt-1">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-300" 
                        style={{ width: `${powerProgress}%` }}
                    />
                </div>
            </div>

            {/* Production */}
            <div className="flex flex-col items-center gap-1.5 min-w-[180px]">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Est. Annual Production/Cons.</span>
                <div className="font-bold text-lg">
                    <span className="text-white">{stats.annualProdMWh.toFixed(2)}</span>
                    <span className="text-slate-400 text-base ml-1">
                        {stats.annualConsMWh > 0 ? ` / ${stats.annualConsMWh.toFixed(2)}` : ''} <span className="text-sm font-normal">MWh</span>
                    </span>
                </div>
                <div className="w-full h-1 bg-slate-700 mt-1">
                    <div 
                        className={`h-full transition-all duration-300 ${stats.annualConsMWh > 0 && stats.annualProdMWh >= stats.annualConsMWh ? 'bg-emerald-500' : 'bg-slate-500'}`} 
                        style={{ width: `${prodProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
