// ─── Shared types for the Electrical Design step ────────────────────────────

export type ActiveTool = 'select' | 'edit';

export interface DraggingIcon {
    id: string;
    startMouseX: number;
    startMouseY: number;
    startOffsetX: number;
    startOffsetY: number;
}

export interface ModuleRenderContext {
    width: number;
    height: number;
    cx: number;
    cy: number;
    rotationDeg: number;
    x: number;
    y: number;
}
