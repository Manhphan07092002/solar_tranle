import React from 'react';

interface Tree3DProps {
    tree: any;
    center: { x: number, y: number };
    isSelected: boolean;
    heightPx: number;
    radiusPx: number;
    crownLayers: number;
    trunkHeightPx: number;
    onObjectClick: (id: string, e: React.MouseEvent) => void;
}

const Tree3D: React.FC<Tree3DProps> = ({
    tree, center, isSelected, heightPx, radiusPx, crownLayers, trunkHeightPx, onObjectClick
}) => {
    const colors = {
        base: '#15803d', // darker green
        side: 'rgba(21, 128, 61, 0.8)',
        top: isSelected ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.7)',
        trunk: '#78350f' // brown
    };

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', zIndex: 12 }}>
            {/* Trunk */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(0px)` }}>
                <svg className="w-full h-full overflow-visible">
                    <line x1={center.x} y1={center.y} x2={center.x} y2={center.y - trunkHeightPx} stroke={colors.trunk} strokeWidth={radiusPx * 0.4} className="opacity-80" style={{ transformOrigin: `${center.x}px ${center.y}px`, transform: 'rotateX(90deg)' }} />
                </svg>
            </div>

            {/* Crown layers */}
            {Array.from({ length: crownLayers }).map((_, i) => {
                const layerZ = trunkHeightPx + i * ((heightPx - trunkHeightPx) / crownLayers);
                const layerRadiusMultiplier = Math.sin(Math.PI * (i / (crownLayers - 1))) * 1.2;
                const currentRadius = radiusPx * Math.min(1, layerRadiusMultiplier + 0.2);

                return (
                    <div key={i} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(${layerZ}px)` }}>
                        <svg className="w-full h-full overflow-visible">
                            <circle
                                cx={center.x}
                                cy={center.y}
                                r={Math.max(2, currentRadius)}
                                fill={i === crownLayers - 1 ? colors.top : colors.side}
                                stroke={colors.base}
                                strokeWidth="1"
                                opacity={0.8}
                                className={i === crownLayers - 1 ? "pointer-events-auto cursor-pointer" : ""}
                                onClick={i === crownLayers - 1 ? (e) => onObjectClick(tree.id, e) : undefined}
                            />
                        </svg>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(Tree3D);
