const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('e:/web/solaredge-clone---pv-designer - Copy/client/components/steps/StepModeling.tsx');
const destPathOuter = path.resolve('e:/web/solaredge-clone---pv-designer - Copy/client/components/steps/modeling/useModeling.ts');

const srcCode = fs.readFileSync(srcPath, 'utf8');
const lines = srcCode.split('\n');

// Find start and end of the hook body
const startIdx = lines.findIndex(l => l.includes('export default function StepModeling('));
const endIdx = lines.findIndex(l => l.includes('const renderPropertiesPanel = () => {'));

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find start or end bounds');
    process.exit(1);
}

// Extract imports
const imports = [];
for (let i = 0; i < startIdx; i++) {
    if (lines[i].trim() && !lines[i].includes('HistoryAction') && !lines[i].includes('HistoryState') && !lines[i].includes('historyReducer')) {
        imports.push(lines[i]);
    }
}

// Prepare the useModeling outer shell
const hookHeader = `
import { ActiveTool, MapLayer, HistoryAction, HistoryState, historyReducer, DragState, SelectedPoint, SelectedEdge, ContextMenuState, SnapTarget, MeasurementResult, CopiedObjects, extractScene } from './types';

export function useModeling(designData: any, setDesignData: any) {
`;

// Extract body
let body = [];
// Skip the component declaration line
// Lines from startIdx + 1 down to endIdx - 1
for (let i = startIdx + 1; i < endIdx; i++) {
    body.push(lines[i]);
}

// Return block
const returnBlock = `
    return {
        canvasRef, worldTransformRef,
        debouncedDesignData, setDebouncedDesignData,
        activeTool, setActiveTool,
        currentLayer, setCurrentLayer,
        selectedId, setSelectedId,
        selectedIds, setSelectedIds,
        snapToGrid, setSnapToGrid,
        smartSnap, setSmartSnap,
        snapTarget, setSnapTarget,
        showDimensions, setShowDimensions,
        layerVisibility, setLayerVisibility,
        showLayerPanel, setShowLayerPanel,
        is3D, setIs3D,
        tiltAngle, setTiltAngle,
        rotationAngle, setRotationAngle,
        rotationRef, tiltRef,
        isRotatingView, setIsRotatingView,
        isMapPanning, setIsMapPanning,
        roofHeight3D, setRoofHeight3D,
        editRoofShapeMode, setEditRoofShapeMode,
        dragState, setDragState,
        selectedPoint, setSelectedPoint,
        selectedEdge, setSelectedEdge,
        contextMenu, setContextMenu,
        isOrthogonalLocked, setIsOrthogonalLocked,
        isDrawing, setIsDrawing,
        points, setPoints,
        previewPoint, setPreviewPoint,
        measurementMode, setMeasurementMode,
        measurementPoints, setMeasurementPoints,
        measurementResults, setMeasurementResults,
        snapCursor, setSnapCursor,
        showHelp, setShowHelp,
        validationErrors, setValidationErrors,
        validationWarnings, setValidationWarnings,
        validationStrict, setValidationStrict,
        dismissedWarnings, setDismissedWarnings,
        copiedObjects, setCopiedObjects,
        history, dispatchHistory,
        canUndo, canRedo,
        viewState, setViewState,
        
        currentStoredToScreen, currentGetPolygonArea,
        commitDesign, handleUndo, handleRedo, handleCopy, handlePaste,
        handleSelectAll, handleDelete, handleBulkDelete, handleSplitRoof,
        handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
        handleObjectClick, handlePointMouseDown, handleSkeletonNodeMouseDown,
        handleSkeletonNodeDoubleClick, handleSkeletonEdgeDoubleClick, handleEdgeMouseDown,
        handleEdgeDoubleClick, handlePointDoubleClick, handleContextMenu,
        handleAutoFixInvalidPoints, handleFinishPoly, handleZoomIn, handleZoomOut
    };
}
`;

const finalCode = imports.join('\n') + '\n\n' + hookHeader + body.join('\n') + '\n' + returnBlock;

fs.writeFileSync(destPathOuter, finalCode, 'utf8');
console.log('Successfully extracted useModeling.ts!');
