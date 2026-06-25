const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, 'usePVLayout.ts');
const pvPlacementPath = path.join(__dirname, '../../../utils/geometry/pvPlacement.ts');

const hookContent = fs.readFileSync(hookPath, 'utf8');
const lines = hookContent.split('\n');

// Find calculatePlacement boundaries
let calcStart = -1, calcEnd = -1;
let openBraces = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function calculatePlacement(rawX: number, rawY: number) {')) {
        calcStart = i;
        openBraces = 1;
        break;
    }
}
if (calcStart !== -1) {
    for (let i = calcStart + 1; i < lines.length; i++) {
        if (lines[i].includes('{')) openBraces += (lines[i].match(/\{/g) || []).length;
        if (lines[i].includes('}')) openBraces -= (lines[i].match(/\}/g) || []).length;
        if (openBraces === 0) {
            calcEnd = i;
            break;
        }
    }
}

console.log(`calculatePlacement: ${calcStart} to ${calcEnd}`);

// Find distPtToSeg inside handleAutoLayout
let distPtStart = -1, distPtEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const distPtToSeg = (p: { x: number; y: number }')) {
        distPtStart = i;
        openBraces = 1;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('{')) openBraces += (lines[j].match(/\{/g) || []).length;
            if (lines[j].includes('}')) openBraces -= (lines[j].match(/\}/g) || []).length;
            if (openBraces === 0) {
                distPtEnd = j;
                break;
            }
        }
        break;
    }
}

// Find isOverlappingStructureLine inside handleAutoLayout
let isOverlapStart = -1, isOverlapEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const isOverlappingStructureLine = (centerPt: { x: number; y: number }')) {
        isOverlapStart = i;
        openBraces = 1;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('{')) openBraces += (lines[j].match(/\{/g) || []).length;
            if (lines[j].includes('}')) openBraces -= (lines[j].match(/\}/g) || []).length;
            if (openBraces === 0) {
                isOverlapEnd = j;
                break;
            }
        }
        break;
    }
}

console.log(`distPtToSeg: ${distPtStart} to ${distPtEnd}`);
console.log(`isOverlappingStructureLine: ${isOverlapStart} to ${isOverlapEnd}`);

// Create pvPlacement.ts content
const pvPlacementContent = `import { DesignState, LatLngPoint, RoofSurface, PVModule } from '../../types';
import { calculateRoofStructureLines } from './roofGeometry';
import { isPointInPolygon, doLineSegmentsIntersect, getPolygonLongestEdgeAngle } from '../helpers';
import { getMetersPerPixel, latLngToPixel, pixelToLatLng } from '../mapUtils';

export interface PlacementContext {
    designData: DesignState;
    orientation: 'portrait' | 'landscape';
    colSpacing: number;
    rowSpacing: number;
    sideSetback: number;
    setback: number;
    currentPPM: number;
    latLngToScreenPixel: (ll: LatLngPoint) => {x: number; y: number};
    screenToMeter: (x: number, y: number) => {xMeter: number; yMeter: number};
    meterToScreen: (xm: number, ym: number) => {x: number; y: number};
}

export const snap1D = (val: number, refSize: number, newSize: number, gap: number) => {
    const step = newSize + gap;
    if (Math.abs(refSize - newSize) < 0.1) return Math.round(val / step) * step;
    const firstStep = (refSize + newSize) / 2 + gap;
    if (Math.abs(val) < firstStep / 2) return 0;
    const sign = val > 0 ? 1 : -1;
    const n = Math.max(0, Math.round((Math.abs(val) - firstStep) / step));
    return sign * (firstStep + n * step);
};

export const distPtToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

export const isOverlappingStructureLine = (
    cornerPts: { x: number; y: number }[],
    structureLines: any[],
    setbackPx: number
) => {
    for (const line of structureLines) {
        if (isPointInPolygon(line.start, cornerPts) || isPointInPolygon(line.end, cornerPts)) return true;
        for (let i = 0; i < 4; i++) {
            if (doLineSegmentsIntersect(cornerPts[i], cornerPts[(i + 1) % 4], line.start, line.end)) return true;
        }
        if (line.type === 'ridge' && setbackPx > 0) {
            for (const c of cornerPts) { if (distPtToSeg(c, line.start, line.end) < setbackPx - 1) return true; }
        }
    }
    return false;
};

// Extracted calculatePlacement logic
export function calculatePlacement(rawX: number, rawY: number, ctx: PlacementContext) {
    const { designData, orientation, colSpacing, rowSpacing, currentPPM, latLngToScreenPixel, screenToMeter, meterToScreen } = ctx;
    
${lines.slice(calcStart + 1, calcEnd).join('\n')}
}
`;

fs.writeFileSync(pvPlacementPath, pvPlacementContent);
console.log('Created pvPlacement.ts');

// Remove the extracted functions from usePVLayout.ts
// We also need to add the import in usePVLayout.ts
let newLines = [];
let addedImport = false;

for (let i = 0; i < lines.length; i++) {
    if (i >= calcStart && i <= calcEnd) continue;
    if (i >= distPtStart && i <= distPtEnd) continue;
    if (i >= isOverlapStart && i <= isOverlapEnd) continue;

    if (!addedImport && lines[i].includes('import { isPointInPolygon }')) {
        newLines.push(lines[i]);
        newLines.push("import { calculatePlacement, distPtToSeg, isOverlappingStructureLine, PlacementContext } from '../../../utils/geometry/pvPlacement';");
        addedImport = true;
        continue;
    }

    // Replace calls to calculatePlacement to pass context
    let line = lines[i];
    if (line.includes('calculatePlacement(')) {
        line = line.replace('calculatePlacement(e.clientX - rect.left, e.clientY - rect.top)', 'calculatePlacement(e.clientX - rect.left, e.clientY - rect.top, getPlacementContext())');
        line = line.replace('calculatePlacement(lastMousePosRef.current.x, lastMousePosRef.current.y)', 'calculatePlacement(lastMousePosRef.current.x, lastMousePosRef.current.y, getPlacementContext())');
    }
    if (line.includes('isOverlappingStructureLine(')) {
        line = line.replace('isOverlappingStructureLine(centerPt, cornerPts)', 'isOverlappingStructureLine(cornerPts, structureLines, setbackPx)');
    }
    if (line.includes('snap1D(') && !line.includes('export const snap1D')) {
        // if snap1D is inside usePVLayout wait we didn't extract snap1D string from usePVLayout, we redefined it inside pvPlacement.ts!
        // So we need to remove snap1D from calculatePlacement? It is inside calculatePlacement already!
    }

    // Inject getPlacementContext builder inside usePVLayout
    if (line.includes('const getRenderPPM = () => ')) {
        newLines.push(line);
        newLines.push(`
    const getPlacementContext = useCallback((): PlacementContext => ({
        designData, orientation, colSpacing, rowSpacing, sideSetback, setback,
        currentPPM: getRenderPPM(), latLngToScreenPixel, screenToMeter, meterToScreen
    }), [designData, orientation, colSpacing, rowSpacing, sideSetback, setback, getRenderPPM, latLngToScreenPixel, screenToMeter, meterToScreen]);
`);
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync(hookPath, newLines.join('\n'));
console.log('Updated usePVLayout.ts');

