import React from 'react';
import { DesignState } from '../../types';
import { useModeling } from './modeling/useModeling';
import ModelingToolbar from './modeling/ModelingToolbar';
import ModelingPropertiesPanel from './modeling/ModelingPropertiesPanel';
import ModelingHelpPanel from './modeling/ModelingHelpPanel';
import ModelingLayerPanel from './modeling/ModelingLayerPanel';
import ModelingCanvas from './modeling/ModelingCanvas';

export default function StepModeling({ designData, setDesignData }: { designData: DesignState, setDesignData: React.Dispatch<React.SetStateAction<DesignState>> }) {
    const {
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
        handleBulkDelete, renderContextMenu,
        handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
        handleObjectClick, handlePointMouseDown, handleSkeletonNodeMouseDown,
        handleSkeletonNodeDoubleClick, handleSkeletonEdgeDoubleClick, handleEdgeMouseDown,
        handleEdgeDoubleClick, handlePointDoubleClick, handleContextMenu,
        handleAutoFixInvalidPoints, handleFinishPoly, handleZoomIn, handleZoomOut
    } = useModeling(designData, setDesignData);

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-300 relative overflow-hidden">
            <ModelingPropertiesPanel
                selectedId={selectedId} setSelectedId={setSelectedId}
                selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                editRoofShapeMode={editRoofShapeMode} setEditRoofShapeMode={setEditRoofShapeMode}
                activeTool={activeTool} setActiveTool={setActiveTool}
                setIsDrawing={setIsDrawing} setPoints={setPoints}
                designData={designData} setDesignData={setDesignData} commitDesign={commitDesign}
                latLngToScreenPixel={currentStoredToScreen} localGetPolygonArea={currentGetPolygonArea}
                validationErrors={validationErrors} validationWarnings={validationWarnings}
                setDismissedWarnings={setDismissedWarnings} handleBulkDelete={handleBulkDelete}
            />

            <ModelingHelpPanel showHelp={showHelp} setShowHelp={setShowHelp} />

            <ModelingLayerPanel
                showLayerPanel={showLayerPanel} setShowLayerPanel={setShowLayerPanel}
                layerVisibility={layerVisibility} setLayerVisibility={setLayerVisibility}
                designData={designData}
            />

            <ModelingToolbar
                activeTool={activeTool} setActiveTool={setActiveTool}
                setIsDrawing={setIsDrawing} setPoints={setPoints}
                selectedId={selectedId} setSelectedId={setSelectedId}
                selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                measurementMode={measurementMode} setMeasurementMode={setMeasurementMode}
                showHelp={showHelp} setShowHelp={setShowHelp}
                showLayerPanel={showLayerPanel} setShowLayerPanel={setShowLayerPanel}
                designData={designData} commitDesign={commitDesign}
                handleCopy={handleCopy} handlePaste={handlePaste} copiedObjects={copiedObjects}
                handleUndo={handleUndo} handleRedo={handleRedo} canUndo={canUndo} canRedo={canRedo}
                validationErrors={validationErrors} validationWarnings={validationWarnings}
                validationStrict={validationStrict} setValidationStrict={setValidationStrict}
                setValidationErrors={setValidationErrors} setValidationWarnings={setValidationWarnings}
                setDismissedWarnings={setDismissedWarnings} handleAutoFixInvalidPoints={handleAutoFixInvalidPoints}
                measurementResults={measurementResults} setMeasurementResults={setMeasurementResults}
            />

            <ModelingCanvas
                canvasRef={canvasRef} worldTransformRef={worldTransformRef}
                is3D={is3D} setIs3D={setIs3D}
                tiltAngle={tiltAngle} setTiltAngle={setTiltAngle}
                rotationAngle={rotationAngle} setRotationAngle={setRotationAngle}
                rotationRef={rotationRef} tiltRef={tiltRef}
                isRotatingView={isRotatingView} setIsRotatingView={setIsRotatingView}
                viewState={viewState} setViewState={setViewState}
                designData={designData}
                snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
                smartSnap={smartSnap} setSmartSnap={setSmartSnap}
                showDimensions={showDimensions} setShowDimensions={setShowDimensions}
                measurementMode={measurementMode}
                isDrawing={isDrawing} setIsDrawing={setIsDrawing}
                measurementPoints={measurementPoints} points={points} setPoints={setPoints}
                previewPoint={previewPoint} snapCursor={snapCursor} snapTarget={snapTarget}
                selectedId={selectedId} selectedIds={selectedIds}
                roofHeight3D={roofHeight3D} currentLayer={currentLayer}
                activeTool={activeTool} setActiveTool={setActiveTool}
                editRoofShapeMode={editRoofShapeMode} setEditRoofShapeMode={setEditRoofShapeMode}
                onCanvasClick={handleCanvasClick} onCanvasMouseDown={handleCanvasMouseDown}
                onCanvasMouseMove={handleCanvasMouseMove} onCanvasMouseUp={handleCanvasMouseUp}
                onObjectClick={handleObjectClick} onPointMouseDown={handlePointMouseDown}
                onSkeletonNodeMouseDown={handleSkeletonNodeMouseDown} onSkeletonNodeDoubleClick={handleSkeletonNodeDoubleClick}
                onSkeletonEdgeDoubleClick={handleSkeletonEdgeDoubleClick} onEdgeMouseDown={handleEdgeMouseDown}
                onEdgeDoubleClick={handleEdgeDoubleClick} onPointDoubleClick={handlePointDoubleClick}
                onContextMenu={handleContextMenu}
                handleFinishPoly={handleFinishPoly} handleZoomIn={handleZoomIn} handleZoomOut={handleZoomOut}
            />
            {renderContextMenu()}
        </div>
    );
}