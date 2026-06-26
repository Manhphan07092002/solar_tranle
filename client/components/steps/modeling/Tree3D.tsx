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
        side: 'rgba(21, 128, 61, 0.95)',
        top: isSelected ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.9)',
        trunk: '#78350f' // brown
    };

    const renderCylinder = (cx: number, cy: number, z: number, height: number, radius: number, colorSide: string, colorTop?: string, sides = 8, onTopClick?: (e: any) => void) => {
        const angleStep = (Math.PI * 2) / sides;
        const faceWidth = 2 * radius * Math.tan(Math.PI / sides);
        const faces = [];

        // Side faces
        for (let i = 0; i < sides; i++) {
            const angle = i * angleStep;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            
            faces.push(
                <div
                    key={`face-${i}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: x - faceWidth / 2,
                        top: y,
                        width: faceWidth,
                        height: height,
                        background: colorSide,
                        borderLeft: `1px solid rgba(0,0,0,0.15)`,
                        borderRight: `1px solid rgba(0,0,0,0.15)`,
                        transformOrigin: '50% 0',
                        transform: `translateZ(${z + height}px) rotateZ(${angle + Math.PI/2}rad) rotateX(-90deg)`,
                    }}
                />
            );
        }
        
        // Top face
        if (colorTop) {
            faces.push(
                <div
                    key="top"
                    className={`absolute ${onTopClick ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
                    onClick={onTopClick}
                    style={{
                        left: cx - radius,
                        top: cy - radius,
                        width: radius * 2,
                        height: radius * 2,
                        borderRadius: '50%',
                        background: colorTop,
                        transform: `translateZ(${z + height}px)`,
                    }}
                />
            );
        }
        
        return faces;
    };

    const trunkRadius = Math.max(2, radiusPx * 0.2);
    const crownHeight = heightPx - trunkHeightPx;

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', zIndex: 12 }}>
            {/* Trunk: 6 sides is enough for a thin brown cylinder */}
            {renderCylinder(center.x, center.y, 0, trunkHeightPx, trunkRadius, colors.trunk, undefined, 6)}
            
            {/* Crown Base: Wide cylinder */}
            {renderCylinder(center.x, center.y, trunkHeightPx, crownHeight * 0.6, radiusPx, colors.side, colors.side, 12)}
            
            {/* Crown Top: Narrower cylinder to make it look like a tree */}
            {renderCylinder(center.x, center.y, trunkHeightPx + crownHeight * 0.6, crownHeight * 0.4, radiusPx * 0.6, colors.side, colors.top, 12, (e) => onObjectClick(tree.id, e))}
            
            {/* Base shadow/floor footprint */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(0px)` }}>
                <svg className="w-full h-full overflow-hidden">
                    <circle cx={center.x} cy={center.y} r={radiusPx} fill="rgba(0,0,0,0.3)" />
                </svg>
            </div>
        </div>
    );
};

export default React.memo(Tree3D);
