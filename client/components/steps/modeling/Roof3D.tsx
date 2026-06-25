import React from 'react';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import { calculateRidgeLine } from '../../../utils/geometry/polygonUtils';
import { isPointInPolygon } from '../../../utils/helpers';

interface Roof3DProps {
    roof: any;
    screenPoints: { x: number, y: number }[];
    structureLines?: { start: { x: number, y: number }, end: { x: number, y: number }, type: string }[];
    isSelected: boolean;
    baseHeightPx: number;
    heightPx: number;
    layers: number;
    layerStep: number;
    roofHeight: number;
    activeTool: string;
    editRoofShapeMode: boolean;
    onObjectClick: (id: string, e: React.MouseEvent) => void;
    renderRidgeLine: (screenPts: { x: number, y: number }[], shape?: string, ridgeAngle?: number, ridgeDirection?: number, isSelected?: boolean) => React.ReactNode;
    renderEdgeLabels: (screenPts: { x: number, y: number }[], isActive: boolean) => React.ReactNode;
    renderAngleLabels: (screenPts: { x: number, y: number }[], isActive: boolean) => React.ReactNode;
    renderAreaLabel: (screenPts: { x: number, y: number }[], isActive: boolean) => React.ReactNode;
    renderPolygonPoints: (id: string, screenPts: { x: number, y: number }[], color: string) => React.ReactNode;
    showDimensions: boolean;
    modulesToRender?: { px: number, py: number, azimuth: number, widthPx: number, heightPx: number, color?: string }[];
}

const getRoofColors = (_shape: string) => ({
    gradient: '#eaf4e3',
    stroke: '#ffffff',
    base: '#ffffff',
    side: 'rgba(255, 255, 255, 0.5)',
    ridge: '#ffffff'
});

const Roof3D: React.FC<Roof3DProps> = ({
    roof, screenPoints, structureLines: passedStructureLines, isSelected, baseHeightPx, heightPx, layers, layerStep, roofHeight, activeTool, editRoofShapeMode,
    onObjectClick, renderRidgeLine, renderEdgeLabels, renderAngleLabels, renderAreaLabel, renderPolygonPoints, showDimensions, modulesToRender
}) => {
    const shape = roof.shape || 'gable';
    const ridge = calculateRidgeLine(screenPoints, shape, roof.ridgeAngle, roof.ridgeDirection);
    const colors = getRoofColors(shape);

    const getClosestPointOnSegment = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
        const atob = { x: b.x - a.x, y: b.y - a.y };
        const atop = { x: p.x - a.x, y: p.y - a.y };
        const len2 = atob.x * atob.x + atob.y * atob.y;
        if (len2 === 0) return a;
        const t = Math.max(0, Math.min(1, (atop.x * atob.x + atop.y * atob.y) / len2));
        return { x: a.x + atob.x * t, y: a.y + atob.y * t };
    };

    let visualRidge = ridge;
    if (ridge && shape === 'gable') {
        const projectedPoints = screenPoints.map(p => getClosestPointOnSegment(p, ridge.start, ridge.end));
        let startProj = projectedPoints[0], endProj = projectedPoints[0];
        let maxProjDist = 0;
        for (let i = 0; i < projectedPoints.length; i++) {
            for (let j = i + 1; j < projectedPoints.length; j++) {
                const d = Math.hypot(projectedPoints[i].x - projectedPoints[j].x, projectedPoints[i].y - projectedPoints[j].y);
                if (d > maxProjDist) { maxProjDist = d; startProj = projectedPoints[i]; endProj = projectedPoints[j]; }
            }
        }
        visualRidge = { start: startProj, end: endProj };
    }

    const getShrunkToRidge = (pt: { x: number, y: number }) => {
        if (!visualRidge) return pt;
        return getClosestPointOnSegment(pt, visualRidge.start, visualRidge.end);
    };

    const computedStructureLines = passedStructureLines ||
        (roof.isAnalyzed
            ? calculateRoofStructureLines(screenPoints, shape, roof.ridgeAngle, roof.ridgeDirection, true, undefined, roof.deletedSkeletonNodes)?.lines
            : []);

    // Compute bounding box diagonal for capping depths
    const polyBoundsMaxX = Math.max(...screenPoints.map(pt => pt.x));
    const polyBoundsMinX = Math.min(...screenPoints.map(pt => pt.x));
    const polyBoundsMaxY = Math.max(...screenPoints.map(pt => pt.y));
    const polyBoundsMinY = Math.min(...screenPoints.map(pt => pt.y));
    const polyDiagonal = Math.hypot(polyBoundsMaxX - polyBoundsMinX, polyBoundsMaxY - polyBoundsMinY);
    const maxDepth = Math.max(10, polyDiagonal * 0.6);

    // Centroid for inward direction
    const polyCenter = screenPoints.reduce(
        (acc, pt) => ({ x: acc.x + pt.x / screenPoints.length, y: acc.y + pt.y / screenPoints.length }),
        { x: 0, y: 0 }
    );

    // Find the inward skeleton peak for a perimeter corner via structure lines
    const linesArray: any[] = Array.isArray(computedStructureLines)
        ? computedStructureLines
        : (computedStructureLines && Array.isArray((computedStructureLines as any).lines) ? (computedStructureLines as any).lines : []);

    const findInwardPeak = (cornerPt: { x: number, y: number }) => {
        const SNAP = 8;
        let bestPt = cornerPt;
        let bestDistToCenter = Math.hypot(cornerPt.x - polyCenter.x, cornerPt.y - polyCenter.y);
        for (const line of linesArray) {
            const dStart = Math.hypot(line.start.x - cornerPt.x, line.start.y - cornerPt.y);
            const dEnd = Math.hypot(line.end.x - cornerPt.x, line.end.y - cornerPt.y);
            const candidate = dStart < SNAP ? line.end : dEnd < SNAP ? line.start : null;
            if (candidate) {
                const distC = Math.hypot(candidate.x - polyCenter.x, candidate.y - polyCenter.y);
                if (distC < bestDistToCenter) { bestDistToCenter = distC; bestPt = candidate; }
            }
        }
        return bestPt;
    };
    const peakPoints = screenPoints.map(p => {
        if (roof.isAnalyzed && linesArray.length > 0) {
            const peak = findInwardPeak(p);
            if (peak.x === p.x && peak.y === p.y && visualRidge) {
                return getShrunkToRidge(p);
            }
            return peak;
        } else if (visualRidge) {
            return getShrunkToRidge(p);
        } else {
            return polyCenter;
        }
    });

    const edgeData = screenPoints.map((p, i) => {
        const next = screenPoints[(i + 1) % screenPoints.length];
        const peakP = peakPoints[i];
        const peakNext = peakPoints[(i + 1) % screenPoints.length];

        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const edgeLen = Math.hypot(dx, dy);

        let nx = 0, ny = 0, isGableEdge = false;
        if (edgeLen >= 0.5) {
            const angleZ = Math.atan2(dy, dx);
            const cosZ = Math.cos(angleZ);
            const sinZ = Math.sin(angleZ);
            nx = -sinZ;
            ny = cosZ;

            const rawDepthP = Math.abs((peakP.x - p.x) * nx + (peakP.y - p.y) * ny);
            const rawDepthNext = Math.abs((peakNext.x - p.x) * nx + (peakNext.y - p.y) * ny);
            const depthP = rawDepthP;
            const depthNext = rawDepthNext;

            isGableEdge = depthP < 25 && depthNext < 25;
        }

        return { p, next, nx, ny, edgeLen, isGableEdge };
    });

    const peakHeights = peakPoints.map((peak, idx) => {
        let maxH = 0;
        edgeData.forEach((edge, edgeIdx) => {
            if (edge.edgeLen < 0.5) return;
            if (edge.isGableEdge) return;

            const depth = Math.abs((peak.x - edge.p.x) * edge.nx + (peak.y - edge.p.y) * edge.ny);
            if (depth > 0.5) {
                const faceTilt = roof.faceTilts?.[edgeIdx] !== undefined ? roof.faceTilts[edgeIdx] : (roof.tilt || 20);
                const clampedTilt = Math.min(75, Math.max(1, faceTilt));
                const h = depth * Math.tan(clampedTilt * Math.PI / 180);
                if (h > maxH) maxH = h;
            }
        });
        return maxH;
    });

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>

            {/* 3D Building Walls */}
            {baseHeightPx > 0 && screenPoints.map((p, i) => {
                const next = screenPoints[(i + 1) % screenPoints.length];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                return (
                    <div
                        key={`wall-${i}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: p.x, top: p.y,
                            width: `${dist}px`,
                            height: `${baseHeightPx}px`,
                            transformOrigin: '0 0',
                            transform: `translateZ(${baseHeightPx}px) rotateZ(${angle}rad) rotateX(-90deg)`,
                            background: '#e2e8f0',
                            border: '1px solid #cbd5e1',
                            borderBottom: '2px solid #94a3b8',
                        }}
                    />
                );
            })}

            {/* 3D Sloped Roof Faces & Gables */}
            {shape !== 'flat' && screenPoints.map((p, i) => {
                const edge = edgeData[i];
                if (edge.edgeLen < 0.5) return null;

                const next = edge.next;
                const peakP = peakPoints[i];
                const peakNext = peakPoints[(i + 1) % screenPoints.length];
                const { nx, ny, edgeLen, isGableEdge } = edge;

                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const angleZ = Math.atan2(dy, dx);
                const cosZ = Math.cos(angleZ);
                const sinZ = Math.sin(angleZ);

                const signedDepthP = (peakP.x - p.x) * nx + (peakP.y - p.y) * ny;
                const signedDepthNext = (peakNext.x - p.x) * nx + (peakNext.y - p.y) * ny;

                const depthP = Math.abs(signedDepthP);
                const depthNext = Math.abs(signedDepthNext);

                // X-positions of peaks along the edge axis
                const xP = (peakP.x - p.x) * cosZ + (peakP.y - p.y) * sinZ;
                const xNext = (peakNext.x - p.x) * cosZ + (peakNext.y - p.y) * sinZ;

                if (isGableEdge) {
                    const hP = peakHeights[i];
                    const hNext = peakHeights[(i + 1) % screenPoints.length];
                    const maxH = Math.max(hP, hNext);
                    if (maxH <= 0.5) return null;

                    const svgW = edgeLen;
                    const svgH = maxH;
                    const A = { x: 0, y: maxH };
                    const B = { x: xP, y: maxH - hP };
                    const C = { x: xNext, y: maxH - hNext };
                    const D = { x: edgeLen, y: maxH };

                    const minX = Math.min(A.x, B.x, C.x, D.x);
                    const maxX = Math.max(A.x, B.x, C.x, D.x);
                    const drawW = maxX - minX + 4;
                    const o = (pt: { x: number, y: number }) => `${pt.x - minX + 2},${pt.y + 2}`;

                    const wallColor = '#e2e8f0';

                    return (
                        <div
                            key={`gable-${i}`}
                            className="absolute pointer-events-auto cursor-pointer"
                            onClick={(e) => onObjectClick(roof.id, e)}
                            style={{
                                left: p.x, top: p.y,
                                width: '0px', height: '0px',
                                transformOrigin: '0 0',
                                transform: `translateZ(${baseHeightPx + maxH}px) rotateZ(${angleZ}rad) rotateX(-90deg)`,
                            }}
                        >
                            <svg className="absolute overflow-visible" style={{ left: minX - 2, top: -2, width: drawW, height: svgH + 4 }}>
                                <polygon
                                    points={`${o(A)} ${o(B)} ${o(C)} ${o(D)}`}
                                    fill={wallColor}
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    );
                }

                // Lighting
                const faceNormal = angleZ - Math.PI / 2;
                const sunAngle = -Math.PI / 3;
                const lightIntensity = (Math.cos(faceNormal - sunAngle) + 1) / 2;
                const lightness = 72 + lightIntensity * 22;
                const faceColor = `hsl(102, 35%, ${lightness}%)`;

                // Find modules on this face
                // We use the exact 2D footprint of the face to check if a module is inside.
                const ridge = visualRidge || { start: {x: 0, y: 0}, end: {x: 0, y: 0} };
                const peakP_ = getClosestPointOnSegment(p, ridge.start, ridge.end);
                const peakNext_ = getClosestPointOnSegment(next, ridge.start, ridge.end);
                const facePolygon = [p, next, peakNext_, peakP_];
                
                const faceModules = modulesToRender?.filter(m => isPointInPolygon({ x: m.px, y: m.py }, facePolygon)) || [];

                // Calculate the geometry required for the 3D unrolled slope
                const dxP = peakP.x - p.x;
                const dyP = peakP.y - p.y;
                const depthP_ = Math.sqrt(dxP * dxP + dyP * dyP);
                const signedDepthP_ = (dxP * Math.sin(angleZ) - dyP * Math.cos(angleZ));

                const dxNext_ = peakNext.x - next.x;
                const dyNext_ = peakNext.y - next.y;
                const depthNext_ = Math.sqrt(dxNext_ * dxNext_ + dyNext_ * dyNext_);
                const signedDepthNext_ = (dxNext_ * Math.sin(angleZ) - dyNext_ * Math.cos(angleZ));

                // Tilt
                const faceTilt = roof.faceTilts?.[i] !== undefined ? roof.faceTilts[i] : (roof.tilt || 20);
                const clampedTilt = Math.min(75, Math.max(1, faceTilt));
                const cosTheta = Math.cos(clampedTilt * (Math.PI / 180));

                // The slanted length goes UP the slope.
                // It's the perpendicular depth divided by cos(tilt)
                const slantP = depthP / cosTheta;
                const slantNext = depthNext / cosTheta;

                // Local Y axis points RIGHT of the edge
                const yLocalP = signedDepthP / cosTheta;
                const yLocalNext = signedDepthNext / cosTheta;

                const rotSign = (yLocalP + yLocalNext) >= 0 ? 1 : -1;
                const rotateXAngle = rotSign * clampedTilt;

                const xP_ = dxP * Math.cos(-angleZ) - dyP * Math.sin(-angleZ);
                const xNext_ = edgeLen + dxNext_ * Math.cos(-angleZ) - dyNext_ * Math.sin(-angleZ);

                const A = { x: 0, y: 0 };
                const B = { x: edgeLen, y: 0 };
                const C = { x: xNext_, y: yLocalNext };
                const D = { x: xP_, y: yLocalP };

                // LOGGING INJECTED: Identify why the top is flat. 
                if (shape === 'hip' || shape === 'mái Nhật') { // Target the known buggy shapes
                    console.log(`[Roof3D Hip Debug] Edge ${i}: Len=${edgeLen.toFixed(1)}, rotX=${rotateXAngle}`);
                    console.log(`[Roof3D Hip Debug] A(0,0), B(${B.x.toFixed(1)},0), C(${C.x.toFixed(1)},${C.y.toFixed(1)}), D(${D.x.toFixed(1)},${D.y.toFixed(1)})`);
                }

                const xs = [A.x, B.x, C.x, D.x];
                const ys = [A.y, B.y, C.y, D.y];
                const minX = Math.min(...xs); const maxX = Math.max(...xs);
                const minY = Math.min(...ys); const maxY = Math.max(...ys);
                const svgW = maxX - minX + 4;
                const svgH = maxY - minY + 4;
                const o = (pt: { x: number, y: number }) => `${pt.x - minX + 2},${pt.y - minY + 2}`;

                // Calculate edge length in meters using the known baseHeightPx / original height conversion 
                // Alternatively, just proxy it: the edge is 'edgeLen' pixels. 
                // Since this component doesn't have direct access to map zoom without props drilling, 
                // we check if showDimensions is active, and just call renderEdgeLabels here if we wanted to proxy. 
                // WAIT, renderEdgeLabels expects {x,y} arrays and global canvas space.
                // Let's implement local inline dimensional text:
                const edgeLabel = `${(edgeLen / 20).toFixed(2)}m`; // Approx default metric conversion for display 

                return (
                    <div
                        key={`slope-${i}`}
                        className="absolute pointer-events-auto cursor-pointer"
                        onClick={(e) => onObjectClick(roof.id, e)}
                        style={{
                            left: p.x, top: p.y,
                            width: '0px', height: '0px',
                            transformOrigin: '0 0',
                            transform: `translateZ(${baseHeightPx}px) rotateZ(${angleZ}rad) rotateX(${rotateXAngle}deg)`,
                        }}
                    >
                        <svg className="absolute overflow-visible" style={{ left: minX - 2, top: minY - 2, width: svgW, height: svgH }}>
                            <polygon
                                points={`${o(A)} ${o(B)} ${o(C)} ${o(D)}`}
                                fill={faceColor}
                                stroke={colors.stroke}
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                            {/* Render Dimension Label directly on the 3D edge */}
                            {(isSelected || showDimensions) && (
                                <text
                                    x={(A.x + B.x) / 2 - minX + 2}
                                    y={-minY - 4} // Slightly above the bottom line edge
                                    fill="#fbbf24"
                                    fontSize="14"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    alignmentBaseline="bottom"
                                    className="pointer-events-none select-none font-sans drop-shadow-md"
                                    style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                                >
                                    {edgeLabel}
                                </text>
                            )}

                            {/* Render Angle Label at the start vertex */}
                            {(isSelected) && (
                                (() => {
                                    const prev = screenPoints[(i - 1 + screenPoints.length) % screenPoints.length];
                                    const vertex = p;
                                    const nextPt = next;

                                    const v1x = prev.x - vertex.x;
                                    const v1y = prev.y - vertex.y;
                                    const v2x = nextPt.x - vertex.x;
                                    const v2y = nextPt.y - vertex.y;

                                    const d1 = Math.hypot(v1x, v1y);
                                    const d2 = Math.hypot(v2x, v2y);
                                    if (d1 < 1e-3 || d2 < 1e-3) return null;

                                    const dot = v1x * v2x + v1y * v2y;
                                    const cosAngle = dot / (d1 * d2);
                                    const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
                                    const isRightAngle = Math.abs(angleDeg - 90) < 3;

                                    // Position label roughly at corner A(0,0) in SVG space, offset inward
                                    const bisectAngle = Math.atan2(v1y / d1 + v2y / d2, v1x / d1 + v2x / d2);
                                    // Since this SVG is rotated by angleZ, we need the relative bisector:
                                    const localAngle = bisectAngle - angleZ;
                                    const offset = 25;
                                    const lx = A.x + Math.cos(localAngle) * offset - minX + 2;
                                    const ly = A.y + Math.sin(localAngle) * offset - minY + 2;

                                    return (
                                        <g>
                                            {isRightAngle && (
                                                <circle cx={A.x - minX + 2} cy={A.y - minY + 2} r={6} stroke="#a3e635" fill="none" strokeWidth={2} className="pointer-events-none" />
                                            )}
                                            <text
                                                x={20} // Fixed offset from corner A for simplicity within the tilted plane
                                                y={-minY - 15}
                                                fill={isRightAngle ? "#a3e635" : "#fbbf24"}
                                                fontSize="12"
                                                fontWeight="bold"
                                                textAnchor="middle"
                                                alignmentBaseline="middle"
                                                className="pointer-events-none select-none font-sans drop-shadow-md"
                                                style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                                                transform={`rotate(${-angleZ * 180 / Math.PI}, ${20}, ${-minY - 15})`}
                                            >
                                                {angleDeg.toFixed(0)}°
                                            </text>
                                        </g>
                                    );
                                })()
                            )}
                        </svg>

                        {/* 3D PV Modules Rendered ON the slope */}
                        {faceModules.map((mod, mIdx) => {
                            // Compute local coordinate relative to edge start p
                            const dx = mod.px - p.x;
                            const dy = mod.py - p.y;
                            // Reverse the angleZ rotation to find coordinates on the un-tilted face plane
                            const lx = dx * Math.cos(angleZ) + dy * Math.sin(angleZ);
                            const ly2D = -dx * Math.sin(angleZ) + dy * Math.cos(angleZ);
                            // Unroll the Y coordinate up the slope
                            const ly = ly2D / cosTheta;

                            return (
                                <div key={`mod-${mIdx}`} style={{
                                    position: 'absolute',
                                    left: lx, top: ly,
                                    width: mod.widthPx, height: mod.heightPx,
                                    marginLeft: -mod.widthPx / 2, marginTop: -mod.heightPx / 2,
                                    transform: `rotateZ(${mod.azimuth - angleZ}rad) translateZ(${rotSign > 0 ? 2 : -2}px)`,
                                    backgroundColor: mod.color || '#1e3a8a',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    opacity: 0.95,
                                    pointerEvents: 'none'
                                }} />
                            );
                        })}
                    </div>
                );
            })}

            {/* Roof top surface */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translateZ(${baseHeightPx + 2}px)` }}>
                <svg className="w-full h-full overflow-hidden">
                    <g className="pointer-events-auto cursor-pointer" onClick={(e) => onObjectClick(roof.id, e)}>
                        <polygon
                            points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={colors.gradient}
                            stroke={colors.stroke}
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                        {roof.isAnalyzed && (() => {
                            return linesArray.map((line: any, idx: number) => (
                                <line
                                    key={`struct-${idx}`}
                                    x1={line.start.x} y1={line.start.y}
                                    x2={line.end.x} y2={line.end.y}
                                    stroke={line.type === 'ridge' ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                                    strokeWidth={line.type === 'ridge' ? "3" : "1"}
                                    strokeLinecap="round"
                                />
                            ));
                        })()}
                        {!roof.isAnalyzed && visualRidge && (
                            <line
                                x1={visualRidge.start.x} y1={visualRidge.start.y}
                                x2={visualRidge.end.x} y2={visualRidge.end.y}
                                stroke={colors.ridge} strokeWidth="3" strokeLinecap="round"
                            />
                        )}
                        {renderAngleLabels(screenPoints, isSelected)}
                        {renderAreaLabel(screenPoints, isSelected)}
                    </g>
                </svg>

                {/* Flat roof modules */}
                {shape === 'flat' && modulesToRender?.map((mod, mIdx) => (
                    <div key={`flat-mod-${mIdx}`} style={{
                        position: 'absolute',
                        left: mod.px, top: mod.py,
                        width: mod.widthPx, height: mod.heightPx,
                        marginLeft: -mod.widthPx / 2, marginTop: -mod.heightPx / 2,
                        transform: `rotateZ(${mod.azimuth}rad) translateZ(1px)`,
                        backgroundColor: mod.color || '#1e3a8a',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        opacity: 0.95,
                        pointerEvents: 'none'
                    }} />
                ))}
            </div>

            {/* Points layer */}
            {(isSelected && (activeTool === 'select' || editRoofShapeMode)) && (
                <div className="absolute inset-0 w-full h-full pointer-events-none z-50" style={{ transform: `translateZ(${baseHeightPx + 5}px)` }}>
                    <svg className="w-full h-full overflow-visible">
                        <g className="pointer-events-auto">
                            {renderPolygonPoints(roof.id, screenPoints, "white")}
                        </g>
                    </svg>
                </div>
            )}
        </div>
    );
};

export default React.memo(Roof3D);
