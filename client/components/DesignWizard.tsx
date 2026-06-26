import React, { useState, useMemo, useCallback, useRef, Suspense, lazy, useEffect } from 'react';
import { Project, ProjectStatus, ProjectType, DesignState } from '../types';
import { ChevronRight, Check, Loader2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

import StepSetup from './steps/StepSetup';
import StepConsumption from './steps/StepConsumption';
import StepModeling from './steps/StepModeling';
import StepPVLayout from './steps/StepPVLayout';
import StepElectrical from './steps/StepElectrical';
import StepSummary from './steps/summary/StepSummary';

// Lazy load heavy connection step (includes Recharts)
const StepFinancial = lazy(() => import('./steps/StepFinancial'));

interface DesignWizardProps {
    project: Project;
    onFinish: (finalCapacity: number, designData: DesignState) => void;
    onSave: (designData: DesignState) => Promise<void>;
    currentStep: number;
    onStepChange: (step: number) => void;
}

const STEPS = ['Map & Basics', 'Consumption', 'Modeling', 'PV Layout', 'Electrical', 'Summary', 'Financial'];

export default function DesignWizard({ project, onFinish, onSave, currentStep, onStepChange }: DesignWizardProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
        show: boolean;
    }>({ type: 'info', message: '', show: false });
    const [designData, setDesignData] = useState<DesignState>(() => {
        const baseData = project.designState ? JSON.parse(JSON.stringify(project.designState)) : {
            roofs: [],
            obstructions: [],
            trees: [],
            modules: [],
            selectedModule: null,
            selectedInverter: null,
            inverterCount: 1,

            siteImageUrl: null,
            mapConfig: null,
            weather: null,

            // Step 1 Defaults
            customer: {
                firstName: '',
                lastName: '',
                email: '',
                company: ''
            },
            grid: {
                gridType: '400V L-L, 230V L-N',
                powerFactor: '1',
                exportLimit: false
            },
            notes: '',
            projectDetails: {
                name: project.name,
                address: project.address,
                city: '',
                zipCode: '',
                country: '',
                selectedStationId: ''
            },

            // Step 2 Consumption
            consumption: {
                utilityProvider: 'solar',
                utilityRate: '',
                useIndependentExportRate: false,
                annualConsumption: 0,
                monthlyBill: 0,
                consumptionProfile: ''
            },

            financialSettings: {
                tariff: 0.15,
                systemCostPerWatt: 1.10,
                discountRate: 5.0,
                electricityInflation: 3.0
            },

            // Step 4: PV Layout Config defaults
            pvLayoutConfig: {
                rowSpacing: 0.02,
                colSpacing: 0.02,
                orientation: 'portrait' as 'portrait' | 'landscape',
                setback: 0.5
            }
        };

        // Auto-fix any corrupted points (null, NaN) from previous bugs
        const filterValidPoints = (pts: any[]) => {
            if (!Array.isArray(pts)) return [];
            return pts.filter(p =>
                p && typeof p === 'object' && !Array.isArray(p) &&
                typeof p.lat === 'number' && typeof p.lng === 'number' &&
                isFinite(p.lat) && isFinite(p.lng) &&
                Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
            );
        };

        if (baseData.roofs) {
            baseData.roofs = baseData.roofs
                .map((r: any) => ({ ...r, points: filterValidPoints(r.points) }))
                .filter((r: any) => r.points.length >= 3);
        }
        if (baseData.obstructions) {
            baseData.obstructions = baseData.obstructions
                .map((o: any) => ({ ...o, points: filterValidPoints(o.points) }))
                .filter((o: any) => o.points.length >= 3);
        }

        // Drop legacy modules that do not have the expected xMeter/yMeter properties
        if (baseData.modules && baseData.modules.length > 0) {
            if (baseData.modules[0].x !== undefined && baseData.modules[0].xMeter === undefined) {
                console.warn("Found legacy project data with pixel-based modules. Clearing modules for safety. Please re-run Auto Layout.");
                baseData.modules = [];
            }
        }

        return baseData;
    });

    // Calculate final capacity (exclude shaded modules) - memoized to avoid recalculation
    const validModules = useMemo(
        () => designData.modules.filter(m => !m.isShaded),
        [designData.modules]
    );

    const currentCapacity = useMemo(
        () => (validModules.length * (designData.selectedModule?.power || 0)) / 1000,
        [validModules, designData.selectedModule]
    );

    // Use a ref to access the latest designData in useCallback without triggering re-renders
    const designDataRef = useRef(designData);
    if (designDataRef.current !== designData) {
        designDataRef.current = designData;
    }

    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedSnapshotRef = useRef<string>('');
    const skipFirstAutoSaveRef = useRef(true);

    useEffect(() => {
        // Avoid auto-saving immediately on mount (initial hydration)
        if (skipFirstAutoSaveRef.current) {
            skipFirstAutoSaveRef.current = false;
            return;
        }

        // Debounce auto-save to avoid spamming MongoDB while user is typing/drawing
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                const snapshot = JSON.stringify(designDataRef.current);
                if (snapshot === lastSavedSnapshotRef.current) return;

                await onSave(designDataRef.current);
                lastSavedSnapshotRef.current = snapshot;
            } catch (error) {
                // Keep auto-save silent; manual save/finish already shows UI feedback
                console.error('Auto-save failed:', error);
            }
        }, 800);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [designData, onSave]);



    const handleFinish = useCallback(async () => {
        // Save before finishing
        try {
            await onSave(designDataRef.current);
            setNotification({
                type: 'success',
                message: 'Design completed and saved successfully!',
                show: true
            });
            // Hide notification after 3 seconds
            setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            // Call onFinish after a short delay to show notification
            setTimeout(() => onFinish(currentCapacity, designDataRef.current), 500);
        } catch (error) {
            setNotification({
                type: 'error',
                message: 'Failed to save final design. Please try again.',
                show: true
            });
            console.error('Final save failed:', error);
            // Hide notification after 4 seconds
            setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
        }
    }, [onSave, currentCapacity, onFinish]);

    const handleNext = useCallback(async () => {
        await onSave(designDataRef.current);
        if (currentStep === STEPS.length - 1) {
            handleFinish();
        } else {
            onStepChange(currentStep + 1);
        }
    }, [onSave, currentStep, handleFinish, onStepChange]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setSaveStatus('saving');

        try {
            await onSave(designDataRef.current);
            setSaveStatus('saved');
            setNotification({
                type: 'success',
                message: 'All design data has been saved successfully!',
                show: true
            });
            // Reset status after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000);
            // Hide notification after 3 seconds
            setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
        } catch (error) {
            setSaveStatus('error');
            setNotification({
                type: 'error',
                message: 'Failed to save design data. Please try again.',
                show: true
            });
            console.error('Save failed:', error);
            // Reset status after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);
            // Hide notification after 4 seconds
            setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
        } finally {
            setIsSaving(false);
        }
    }, [onSave]);

    // Optimize Step Rendering: Only re-render current step when necessary props change
    const StepComponent = useMemo(() => {
        switch (currentStep) {
            case 0: return <StepSetup project={project} designData={designData} setDesignData={setDesignData} />;
            case 1: return <StepConsumption designData={designData} setDesignData={setDesignData} />;
            case 2: return <StepModeling designData={designData} setDesignData={setDesignData} />;
            case 3: return <StepPVLayout designData={designData} setDesignData={setDesignData} />;
            case 4:
                return <StepElectrical designData={designData} setDesignData={setDesignData} />;
            case 5:
                return <StepSummary designData={designData} setDesignData={setDesignData} projectId={project.id} />;
            case 6:
                return (
                    <Suspense fallback={
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                            <p className="text-slate-500 font-medium">Loading financial models...</p>
                        </div>
                    }>
                        <StepFinancial designData={designData} setDesignData={setDesignData} />
                    </Suspense>
                );
            default: return null;
        }
    }, [currentStep, project, designData, setDesignData]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Notification Toast */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all transform ${notification.type === 'success' ? 'bg-green-500 text-white' :
                    notification.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {notification.type === 'success' && <CheckCircle size={20} />}
                    {notification.type === 'error' && <AlertCircle size={20} />}
                    <span className="font-medium">{notification.message}</span>
                    <button
                        onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                        className="ml-2 hover:opacity-80 transition-opacity"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Wizard Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {STEPS.map((step, idx) => (
                        <React.Fragment key={step}>
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap
                  ${idx === currentStep ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                                        idx < currentStep ? 'text-green-600' : 'text-slate-400'}
                `}
                                onClick={() => onStepChange(idx)}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0
                  ${idx === currentStep ? 'bg-blue-600 text-white' :
                                        idx < currentStep ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {idx < currentStep ? <Check size={12} /> : idx + 1}
                                </div>
                                <span className="hidden sm:inline">{step}</span>
                            </div>
                            {idx < STEPS.length - 1 && <ChevronRight size={16} className="text-slate-300 shrink-0" />}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-3 py-2 text-sm font-medium rounded shadow-sm transition-all flex items-center gap-2
                            ${isSaving ? 'bg-gray-400 text-white cursor-not-allowed' :
                                saveStatus === 'saved' ? 'bg-green-600 text-white' :
                                    saveStatus === 'error' ? 'bg-red-600 text-white' :
                                        'bg-slate-600 text-white hover:bg-slate-700'}
                        `}
                        title="Save all progress"
                    >
                        <Save size={16} />
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                            </>
                        ) : saveStatus === 'saved' ? (
                            'Saved!'
                        ) : saveStatus === 'error' ? (
                            'Error!'
                        ) : (
                            'Save'
                        )}
                    </button>
                    <button
                        onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className={`px-4 py-2 text-sm font-medium text-white rounded shadow-sm transition-colors
               ${currentStep === STEPS.length - 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
             `}
                    >
                        {currentStep === STEPS.length - 1 ? 'Finish Design' : 'Next Step'}
                    </button>
                </div>
            </div>

            {/* Wizard Content */}
            <div className="flex-1 overflow-hidden relative">
                {StepComponent}
            </div>
        </div>
    );
}