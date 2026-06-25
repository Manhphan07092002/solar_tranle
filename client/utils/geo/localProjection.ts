import { LatLngPoint } from '../../types';

// Earth radius in meters
const R = 6378137;

/**
 * Converts a LatLng coordinate to a local East-North-Up (ENU) meter-based coordinate
 * relative to a given origin point. This provides an engineering-grade Cartesian plane
 * for layout and physics calculations.
 * 
 * @param origin The center of the project (usually map center)
 * @param point The point to convert
 * @returns { x: number, y: number } in meters relative to origin
 */
export function latLngToMeters(origin: LatLngPoint, point: LatLngPoint): { x: number, y: number } {
    if (!origin || !point) return { x: 0, y: 0 };

    // Convert to radians
    const lat1 = origin.lat * Math.PI / 180;
    const lng1 = origin.lng * Math.PI / 180;
    const lat2 = point.lat * Math.PI / 180;
    const lng2 = point.lng * Math.PI / 180;

    // Standard local projection (equirectangular approximation for small distances)
    // x = Easting (meters)
    // y = Northing (meters)
    const x = R * (lng2 - lng1) * Math.cos(lat1);
    const y = R * (lat2 - lat1);

    return { x, y };
}
