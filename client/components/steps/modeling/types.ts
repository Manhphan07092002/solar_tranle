import { DesignState, LatLngPoint } from '../../../types';

export type ActiveTool = 'select' | 'pan' | 'roof' | 'obstruction' | 'tree' | 'rotate';
export type MapLayer = 'google' | 'esri' | 'osm';

export type SceneState = Pick<DesignState, 'roofs' | 'obstructions' | 'trees' | 'mapConfig'>;

export const extractScene = (d: DesignState): SceneState => ({
    roofs: d.roofs,
    obstructions: d.obstructions,
    trees: d.trees,
    mapConfig: d.mapConfig,
});

export type HistoryAction =
    | { type: 'APPLY_SCENE_CHANGE'; payload: SceneState }
    | { type: 'UNDO' }
    | { type: 'REDO' };

export type HistoryState = {
    past: SceneState[];
    present: SceneState;
    future: SceneState[];
};

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case 'APPLY_SCENE_CHANGE':
            return {
                past: [...state.past.slice(-49), state.present], // keep max 50 items
                present: action.payload,
                future: [],
            };
        case 'UNDO':
            if (state.past.length === 0) return state;
            return {
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [state.present, ...state.future],
            };
        case 'REDO':
            if (state.future.length === 0) return state;
            return {
                past: [...state.past, state.present],
                present: state.future[0],
                future: state.future.slice(1),
            };
        default:
            return state;
    }
}

export interface DragState {
    type: 'point' | 'edge' | 'skeletonNode' | 'object';
    activeId: string;
    activeIndex: number;
    movingPoints: { id: string, type: 'roof' | 'obstruction', index: number }[];
}

export interface SelectedPoint {
    id: string;
    index: number;
    type: 'roof' | 'obstruction' | 'skeletonNode';
}

export interface SelectedEdge {
    id: string;
    index: number;
    type: 'roof' | 'obstruction';
}

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'roof' | 'canvas' | 'obstruction' | 'tree';
    id: string | null;
}

export interface SnapTarget {
    x: number;
    y: number;
    type: 'grid' | 'point' | 'ortho' | null;
}

export interface MeasurementResult {
    distance: number;
    points: Array<{ x: number, y: number }>;
}

export interface CopiedObjects {
    roofs: any[]; // Using any to avoid circular deps if RoofSurface needs it, but we can use imports
    obstructions: any[];
    trees?: any[];
}
