import React, { useMemo } from 'react';
import { DesignState } from '../../../types';

interface Props {
    designData: DesignState;
}

export default function StringPreview({ designData }: Props) {
    const modules = designData.modules;
    const strings = designData.strings || [];

    const { viewBox, scale } = useMemo(() => {
        if (modules.length === 0) return { viewBox: '0 0 300 300', scale: 1 };
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        modules.forEach(m => {
            if (m.xMeter < minX) minX = m.xMeter;
            if (m.xMeter > maxX) maxX = m.xMeter;
            if (m.yMeter < minY) minY = m.yMeter;
            if (m.yMeter > maxY) maxY = m.yMeter;
        });

        // Add padding
        const padding = 5; // 5 meters padding
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const w = Math.max(maxX - minX, 10);
        const h = Math.max(maxY - minY, 10);
        
        return {
            viewBox: `${minX} ${minY} ${w} ${h}`,
            scale: 1, // SVG handles scaling via viewBox
        };
    }, [modules]);

    const moduleWidth = (designData.selectedModule?.width || 1134) / 1000;
    const moduleHeight = (designData.selectedModule?.height || 2278) / 1000;

    if (modules.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-300">
                <span className="text-slate-400 text-sm">No modules placed yet</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[300px] bg-white rounded-lg border border-slate-200 overflow-hidden relative shadow-sm">
            {/* Grid background for aesthetics */}
            <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <svg viewBox={viewBox} className="w-full h-full absolute inset-0 drop-shadow-sm">
                
                {/* Draw Modules */}
                {modules.map((m, idx) => {
                    const isPortrait = m.orientation === 'portrait';
                    const w = isPortrait ? moduleWidth : moduleHeight;
                    const h = isPortrait ? moduleHeight : moduleWidth;
                    
                    return (
                        <rect 
                            key={`mod-${idx}`}
                            x={m.xMeter - w / 2}
                            y={m.yMeter - h / 2}
                            width={w}
                            height={h}
                            transform={`rotate(${(m.azimuth * 180) / Math.PI}, ${m.xMeter}, ${m.yMeter})`}
                            fill="white"
                            stroke="#94a3b8"
                            strokeWidth={0.2}
                            rx={0.1}
                        />
                    );
                })}

                {/* Draw Strings */}
                {strings.map(str => {
                    const stringModules = modules.filter(m => m.stringId === str.id)
                        .sort((a, b) => (a.yMeter - b.yMeter) || (a.xMeter - b.xMeter));
                    
                    if (stringModules.length < 2) return null;

                    let pathD = `M ${stringModules[0].xMeter} ${stringModules[0].yMeter}`;
                    for (let i = 1; i < stringModules.length; i++) {
                        pathD += ` L ${stringModules[i].xMeter} ${stringModules[i].yMeter}`;
                    }

                    return (
                        <path 
                            key={`str-${str.id}`}
                            d={pathD}
                            fill="none"
                            stroke={str.color}
                            strokeWidth={0.3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    );
                })}

                {/* Draw String Nodes */}
                {strings.map(str => {
                    const stringModules = modules.filter(m => m.stringId === str.id);
                    return stringModules.map((m, idx) => (
                        <circle 
                            key={`node-${str.id}-${idx}`}
                            cx={m.xMeter}
                            cy={m.yMeter}
                            r={0.4}
                            fill={str.color}
                        />
                    ));
                })}
            </svg>
            
            <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                {strings.map((str, idx) => (
                    <div key={str.id} className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-semibold text-slate-700 shadow-sm border border-slate-100">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: str.color}}></div>
                        String {idx + 1} ({modules.filter(m => m.stringId === str.id).length})
                    </div>
                ))}
            </div>
        </div>
    );
}
