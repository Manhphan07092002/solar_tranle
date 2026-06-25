import { DesignState, LatLngPoint, RoofSurface, PVModule } from '../../types';
import { calculateRoofStructureLines } from './roofGeometry';
import { isPointInPolygon } from '../helpers';
import { getPolygonLongestEdgeAngle, doLineSegmentsIntersect, getMinDistanceToPolygonEdges } from './polygonUtils';
import { getMetersPerPixel, latLngToPixel, pixelToLatLng } from '../mapUtils';

export interface PlacementContext {
    designData: DesignState;
    orientation: 'portrait' | 'landscape';
    colSpacing: number;
    rowSpacing: number;
    sideSetback: number;
    setback: number;
    currentPPM: number;
    latLngToScreenPixel: (ll: LatLngPoint) => { x: number; y: number };
    screenToMeter: (x: number, y: number) => { x: number; y: number };
    meterToScreen: (xm: number, ym: number) => { x: number; y: number };
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
    const { designData, orientation, colSpacing, rowSpacing, sideSetback, setback, currentPPM, latLngToScreenPixel, screenToMeter, meterToScreen } = ctx;

    if (!designData.selectedModule) return null;

    const modW = (designData.selectedModule.width / 1000) * currentPPM;
    const modH = (designData.selectedModule.height / 1000) * currentPPM;
    const finalOrientation = orientation;
    const center = { x: rawX, y: rawY };

    let validRoof = null;
    let azimuth = 0;
    for (const roof of designData.roofs) {
        const screenPoints = roof.points.map(latLngToScreenPixel);
        if (isPointInPolygon(center, screenPoints)) {
            validRoof = roof;
            azimuth = getPolygonLongestEdgeAngle(screenPoints);
            break;
        }
    }
    if (!validRoof) return null;

    const roofScreenPoints = validRoof.points.map(latLngToScreenPixel);
    const mappedOverrides: Record<number, { x: number; y: number }> = {};
    if (validRoof.skeletonNodeOverrides) {
        for (const [key, ll] of Object.entries(validRoof.skeletonNodeOverrides))
            mappedOverrides[Number(key)] = latLngToScreenPixel(ll as LatLngPoint);
    }
    const roofLinesData = calculateRoofStructureLines(
        roofScreenPoints, validRoof.shape, validRoof.ridgeAngle, validRoof.ridgeDirection,
        validRoof.isAnalyzed, mappedOverrides, validRoof.deletedSkeletonNodes,
        validRoof.addedSkeletonNodes?.map(latLngToScreenPixel)
    );
    const structureLines = Array.isArray(roofLinesData) ? roofLinesData : (roofLinesData?.lines || []);

    let finalAzimuth = azimuth;
    let centerMeter = screenToMeter(center.x, center.y);
    let slideVector: { x: number; y: number } | null = null;

    const roofModules = designData.modules.filter(m => m.surfaceId === validRoof!.id);
    if (roofModules.length > 0) {
        let closestMod = null, minDist = Infinity, closestModScreen = null;
        for (const rm of roofModules) {
            const rmScreen = meterToScreen(rm.xMeter, rm.yMeter);
            let crossesStructure = false;
            for (const line of structureLines) {
                if (doLineSegmentsIntersect(center, rmScreen, line.start, line.end)) { crossesStructure = true; break; }
            }
            if (crossesStructure) continue;
            const dist = Math.hypot(center.x - rmScreen.x, center.y - rmScreen.y);
            if (dist < minDist) { minDist = dist; closestMod = rm; closestModScreen = rmScreen; }
        }
        if (closestMod && closestModScreen) {
            const screenDx = center.x - closestModScreen.x;
            const screenDy = center.y - closestModScreen.y;
            const cosA = Math.cos(-closestMod.azimuth);
            const sinA = Math.sin(-closestMod.azimuth);
            const localX = screenDx * cosA - screenDy * sinA;
            const localY = screenDx * sinA + screenDy * cosA;

            const base = designData.selectedModule;
            const refModW = (closestMod.orientation === 'portrait' ? base.width : base.height) / 1000 * currentPPM;
            const refModH = (closestMod.orientation === 'portrait' ? base.height : base.width) / 1000 * currentPPM;
            const newModW = (finalOrientation === 'portrait' ? base.width : base.height) / 1000 * currentPPM;
            const newModH = (finalOrientation === 'portrait' ? base.height : base.width) / 1000 * currentPPM;

            const snap1D = (val: number, refSize: number, newSize: number, gap: number) => {
                const step = newSize + gap;
                if (Math.abs(refSize - newSize) < 0.1) return Math.round(val / step) * step;
                const firstStep = (refSize + newSize) / 2 + gap;
                if (Math.abs(val) < firstStep / 2) return 0;
                const sign = val > 0 ? 1 : -1;
                const n = Math.max(0, Math.round((Math.abs(val) - firstStep) / step));
                return sign * (firstStep + n * step);
            };

            const snapLocalX = snap1D(localX, refModW, newModW, colSpacing * currentPPM);
            const snapLocalY = snap1D(localY, refModH, newModH, rowSpacing * currentPPM);
            const cosRev = Math.cos(closestMod.azimuth);
            const sinRev = Math.sin(closestMod.azimuth);
            const finalScreenX = closestModScreen.x + snapLocalX * cosRev - snapLocalY * sinRev;
            const finalScreenY = closestModScreen.y + snapLocalX * sinRev + snapLocalY * cosRev;
            finalAzimuth = closestMod.azimuth;
            centerMeter = screenToMeter(finalScreenX, finalScreenY);
            let moveX = 0, moveY = 0;
            if (Math.abs(snapLocalX) > Math.abs(snapLocalY)) moveX = snapLocalX > 0 ? -1 : 1;
            else moveY = snapLocalY > 0 ? -1 : 1;
            slideVector = { x: moveX * cosRev - moveY * sinRev, y: moveX * sinRev + moveY * cosRev };
        }
    }

    const cosAzimuth = Math.cos(finalAzimuth), sinAzimuth = Math.sin(finalAzimuth);
    const finalModW = finalOrientation === 'portrait' ? modW : modH;
    const finalModH = finalOrientation === 'portrait' ? modH : modW;
    const hw = finalModW / 2, hh = finalModH / 2;

    const checkBoundaries = (cx: number, cy: number) => {
        // Clockwise: TL, TR, BR, BL — order matters for edge-intersection checks
        const corners = [
            [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
        ].map(([lx, ly]) => ({
            x: cx + lx * cosAzimuth - ly * sinAzimuth,
            y: cy + lx * sinAzimuth + ly * cosAzimuth,
        }));
        const s = 0.5; // shrink by 0.5px to avoid false positives on touching edges
        const shrunk = [
            [-(hw - s), -(hh - s)], [(hw - s), -(hh - s)], [(hw - s), (hh - s)], [-(hw - s), (hh - s)]
        ].map(([lx, ly]) => ({
            x: cx + lx * cosAzimuth - ly * sinAzimuth,
            y: cy + lx * sinAzimuth + ly * cosAzimuth,
        }));

        for (const c of corners) { if (!isPointInPolygon(c, roofScreenPoints)) return true; }
        if (sideSetback > 0) {
            for (const c of corners) { if (getMinDistanceToPolygonEdges(c, roofScreenPoints) < sideSetback * currentPPM) return true; }
        }
        const distPtToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
            const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
            if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
            const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
            return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
        };
        for (const line of structureLines) {
            for (let i = 0; i < 4; i++) {
                if (doLineSegmentsIntersect(shrunk[i], shrunk[(i + 1) % 4], line.start, line.end)) return true;
            }
            if (line.type === 'ridge' && setback > 0) {
                for (const c of corners) { if (distPtToSeg(c, line.start, line.end) < setback * currentPPM) return true; }
            }
        }
        return false;
    };

    const finalScreen = meterToScreen(centerMeter.x, centerMeter.y);
    let { x: fsx, y: fsy } = finalScreen;
    let hitBoundary = checkBoundaries(fsx, fsy);

    if (hitBoundary && slideVector) {
        let steps = 0;
        const maxSlide = Math.max(hw, hh) * 2;
        while (hitBoundary && steps < maxSlide) {
            fsx += slideVector.x;
            fsy += slideVector.y;
            steps++;
            hitBoundary = checkBoundaries(fsx, fsy);
        }
        if (!hitBoundary) centerMeter = screenToMeter(fsx, fsy);
    }

    let hasCollision = designData.obstructions.some(obs =>
        isPointInPolygon(meterToScreen(centerMeter.x, centerMeter.y), obs.points.map(latLngToScreenPixel))
    );
    if (!hasCollision) {
        hasCollision = designData.modules.some(m => {
            const dist = Math.hypot(m.xMeter - centerMeter.x, m.yMeter - centerMeter.y);
            return dist < Math.min(finalModW, finalModH) * 0.9 / currentPPM;
        });
    }

    return {
        isValid: !hitBoundary && !hasCollision,
        xMeter: centerMeter.x,
        yMeter: centerMeter.y,
        azimuth: finalAzimuth,
        roofId: validRoof.id,
    };
}
