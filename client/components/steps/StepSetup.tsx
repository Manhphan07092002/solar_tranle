import React from 'react';
import { Project, DesignState } from '../../types';
import { useSetup } from './setup/useSetup';
import SetupFormPanel from './setup/SetupFormPanel';
import SetupMapPanel from './setup/SetupMapPanel';

export default function StepSetup({ project, designData, setDesignData }: { project: Project, designData: DesignState, setDesignData: React.Dispatch<React.SetStateAction<DesignState>> }) {
    const s = useSetup(project, designData, setDesignData);

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
                <h2 className="text-xl font-bold text-slate-800">Project Details</h2>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <SetupFormPanel
                    designData={designData}
                    searchAddr={s.searchAddr}
                    searchInputRef={s.searchInputRef}
                    searchStatus={s.searchStatus}
                    searchFeedback={s.searchFeedback}
                    suggestions={s.suggestions}
                    showSuggestions={s.showSuggestions}
                    isLoadingSuggestions={s.isLoadingSuggestions}
                    handleSearchInputChange={s.handleSearchInputChange}
                    handleSuggestionClick={s.handleSuggestionClick}
                    handleManualSearch={s.handleManualSearch}
                    handleCurrentLocation={s.handleCurrentLocation}
                    clearSearch={s.clearSearch}
                    targetLocation={s.targetLocation}
                    projectName={s.projectName} setProjectName={s.setProjectName}
                    city={s.city} setCity={s.setCity}
                    zipCode={s.zipCode} setZipCode={s.setZipCode}
                    selectedStationId={s.selectedStationId} setSelectedStationId={s.setSelectedStationId}
                    openSections={s.openSections} toggleSection={s.toggleSection}
                    customerData={s.customerData} setCustomerData={s.setCustomerData}
                    gridData={s.gridData} setGridData={s.setGridData}
                    notes={s.notes} setNotes={s.setNotes}
                />

                <SetupMapPanel
                    designData={designData}
                    targetLocation={s.targetLocation}
                    handleMapCapture={s.handleMapCapture}
                />
            </div>
        </div>
    );
}
