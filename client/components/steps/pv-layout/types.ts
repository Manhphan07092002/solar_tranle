// ─── Shared types for the PV Layout step ───────────────────────────────────

export type ActiveTool = 'select' | 'edit';

export type ModuleOrientation = 'portrait' | 'landscape';

export interface PVConfig {
    rowSpacing: number;
    colSpacing: number;
    orientation: ModuleOrientation;
    setback: number;
    sideSetback: number;
    simMonth: number;
    simHour: number;
    showShading: boolean;
}

export interface PreviewPlacement {
    isValid: boolean;
    xMeter: number;
    yMeter: number;
    azimuth: number;
    roofId: string;
    screenX: number;
    screenY: number;
}

export interface ClipboardEntry {
    dxMeter: number;
    dyMeter: number;
    azimuthOffset: number;
    orientation: ModuleOrientation;
}

export interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export interface ViewState {
    center: { lat: number; lng: number };
    zoom: number;
}
