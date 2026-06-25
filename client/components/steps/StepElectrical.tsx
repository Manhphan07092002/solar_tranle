import React from 'react';
import { DesignState } from '../../types';
import { useElectrical } from './electrical/useElectrical';
import ElectricalToolbar from './electrical/ElectricalToolbar';
import ElectricalSidebar from './electrical/ElectricalSidebar';
import ElectricalCanvas from './electrical/ElectricalCanvas';
import ElectricalHelpPanel from './electrical/ElectricalHelpPanel';

export default function StepElectrical({ designData, setDesignData }: { designData: DesignState, setDesignData: React.Dispatch<React.SetStateAction<DesignState>> }) {
    const el = useElectrical(designData, setDesignData);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <ElectricalToolbar
                designData={designData}
                activeTool={el.activeTool} setActiveTool={el.setActiveTool}
                selectedModuleIndex={el.selectedModuleIndex} setSelectedModuleIndex={el.setSelectedModuleIndex}
                selectedModuleIndices={el.selectedModuleIndices} setSelectedModuleIndices={el.setSelectedModuleIndices}
                snapToGrid={el.snapToGrid} setSnapToGrid={el.setSnapToGrid}
                showHelp={el.showHelp} setShowHelp={el.setShowHelp}
                canUndo={el.canUndo} canRedo={el.canRedo}
                handleUndo={el.handleUndo} handleRedo={el.handleRedo}
                handleAutoStringing={el.handleAutoStringing}
                alignModules={el.alignModules}
                commitDesign={el.commitDesign}
            />

            <div className="flex-1 flex overflow-hidden">
                <ElectricalSidebar
                    designData={designData} setDesignData={setDesignData}
                    strings={el.strings}
                    activeStringId={el.activeStringId} setActiveStringId={el.setActiveStringId}
                    dcAcRatio={el.dcAcRatio}
                    minStringLen={el.minStringLen} maxStringLen={el.maxStringLen}
                    showModuleInfo={el.showModuleInfo} setShowModuleInfo={el.setShowModuleInfo}
                    selectedModuleInfo={el.selectedModuleInfo}
                    handleAddString={el.handleAddString}
                    handleDeleteString={el.handleDeleteString}
                />

                <ElectricalCanvas
                    designData={designData}
                    strings={el.strings}
                    activeStringId={el.activeStringId} setActiveStringId={el.setActiveStringId}
                    activeTool={el.activeTool}
                    selectedModuleIndex={el.selectedModuleIndex}
                    selectedModuleIndices={el.selectedModuleIndices}
                    isDragging={el.isDragging}
                    snapToGrid={el.snapToGrid}
                    hoveredModuleIndex={el.hoveredModuleIndex} setHoveredModuleIndex={el.setHoveredModuleIndex}
                    copiedModules={el.copiedModules}
                    constraintViolations={el.constraintViolations}
                    highlightedStringId={el.highlightedStringId} setHighlightedStringId={el.setHighlightedStringId}
                    showDistance={el.showDistance}
                    stringIconOffsets={el.stringIconOffsets} setStringIconOffsets={el.setStringIconOffsets}
                    draggingIconRef={el.draggingIconRef}
                    CANVAS_SIZE={el.CANVAS_SIZE} GRID_SIZE={el.GRID_SIZE}
                    minStringLen={el.minStringLen} maxStringLen={el.maxStringLen}
                    latLngToScreenPixel={el.latLngToScreenPixel}
                    meterToScreen={el.meterToScreen}
                    getModuleRenderContext={el.getModuleRenderContext}
                    getDistanceToNearestModule={el.getDistanceToNearestModule}
                    handleModuleClick={el.handleModuleClick}
                    handleModuleMouseDown={el.handleModuleMouseDown}
                    handleMouseMove={el.handleMouseMove}
                    handleMouseUp={el.handleMouseUp}
                    handleCanvasClick={el.handleCanvasClick}
                />
            </div>

            <ElectricalHelpPanel showHelp={el.showHelp} setShowHelp={el.setShowHelp} />
        </div>
    );
}
