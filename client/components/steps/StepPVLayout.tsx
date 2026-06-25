import React from 'react';
import { DesignState } from '../../types';
import { usePVLayout } from './pv-layout/usePVLayout';
import PVLayoutSidebar from './pv-layout/PVLayoutSidebar';
import PVLayoutCanvas from './pv-layout/PVLayoutCanvas';

export default function StepPVLayout({
    designData,
    setDesignData,
}: {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
}) {
    const layout = usePVLayout(designData, setDesignData);

    return (
        <div className="h-full flex">
            <PVLayoutSidebar
                designData={designData}
                setDesignData={setDesignData}
                pvConfig={layout.pvConfig}
                setPvConfig={layout.setPvConfig}
                activeTool={layout.activeTool}
                setActiveTool={layout.setActiveTool}
                isRecalculatingShading={layout.isRecalculatingShading}
                totalPower={layout.totalPower}
                onAutoLayout={layout.handleAutoLayout}
                onClearModules={layout.clearModules}
                onRecalculateShading={layout.handleRecalculateShading}
            />
            <PVLayoutCanvas
                designData={designData}
                viewState={layout.viewState}
                activeTool={layout.activeTool}
                previewPlacement={layout.previewPlacement}
                clipboard={layout.clipboard}
                selectionBox={layout.selectionBox}
                selectedModuleIndices={layout.selectedModuleIndices}
                orientation={layout.orientation}
                simMonth={layout.simMonth}
                simHour={layout.simHour}
                showShading={layout.showShading}
                latLngToScreenPixel={layout.latLngToScreenPixel}
                meterToScreen={layout.meterToScreen}
                getRenderPPM={layout.getRenderPPM}
                onWheel={layout.handleWheel}
                onClick={layout.handleCanvasClick}
                onMouseDown={layout.handleCanvasMouseDown}
                onMouseUp={layout.handleCanvasMouseUp}
                onMouseMove={layout.handleCanvasMouseMove}
                onMouseLeave={layout.handleCanvasMouseLeave}
                onZoomIn={layout.handleZoomIn}
                onZoomOut={layout.handleZoomOut}
                onDeleteModule={layout.deleteModule}
                onRotateModule={layout.rotateModule}
            />
        </div>
    );
}
