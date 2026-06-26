import React from 'react';

interface Obstruction3DProps {
    obs: any;
    screenPoints: { x: number, y: number }[];
    isSelected: boolean;
    heightPx: number;
    baseElevationPx: number;
    layers: number;
    layerStep: number;
    onObjectClick: (id: string, e: React.MouseEvent) => void;
}

const Obstruction3D: React.FC<Obstruction3DProps> = ({
    obs, screenPoints, isSelected, heightPx, baseElevationPx, onObjectClick
}) => {
    const colors = {
        base: '#b91c1c', // darker red for sides
        side: 'rgba(185, 28, 28, 0.85)',
        top: isSelected ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.9)'
    };

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', zIndex: 10, transform: `translateZ(${baseElevationPx}px)` }}>
            {/* Side faces */}
            {screenPoints.map((p, i) => {
                const next = screenPoints[(i + 1) % screenPoints.length];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 0.5) return null;
                const angle = Math.atan2(dy, dx);

                return (
                    <div
                        key={`obs-wall-${i}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: p.x,
                            top: p.y,
                            width: `${dist}px`,
                            height: `${heightPx}px`,
                            transformOrigin: '0 0',
                            transform: `translateZ(${heightPx}px) rotateZ(${angle}rad) rotateX(-90deg)`,
                            background: colors.side,
                            border: `1px solid ${colors.base}`,
                            borderBottom: `2px solid ${colors.base}`,
                        }}
                    />
                );
            })}

            {/* Top surface */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(${heightPx}px)` }}>
                <svg className="w-full h-full overflow-hidden">
                    <g className="pointer-events-auto cursor-pointer" onClick={(e) => onObjectClick(obs.id, e)}>
                        <polygon
                            points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={colors.top}
                            stroke="#ef4444"
                            strokeWidth="2"
                        />
                    </g>
                </svg>
            </div>
            
            {/* Base shadow/floor footprint */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(0px)` }}>
                <svg className="w-full h-full overflow-hidden">
                    <polygon
                        points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(0,0,0,0.3)"
                    />
                </svg>
            </div>
        </div>
    );
};

export default React.memo(Obstruction3D);
