import React, { useState } from 'react';
import { DesignState } from '../../../types';
import ProjectSummaryTab from './ProjectSummaryTab';
import ProjectLayoutTab from './ProjectLayoutTab';
import { FileText, Download, Settings, ChevronDown } from 'lucide-react';

interface StepSummaryProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
}

export default function StepSummary({ designData, setDesignData }: StepSummaryProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'layout'>('summary');

    return (
        <div className="h-full flex flex-col bg-[#f5f6f8] overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10 shrink-0 print:hidden">
                <div className="flex gap-6">
                    <button 
                        onClick={() => setActiveTab('summary')}
                        className={`text-sm font-bold uppercase tracking-wider pb-3 -mb-3 border-b-4 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Project Summary
                    </button>
                    <button 
                        onClick={() => setActiveTab('layout')}
                        className={`text-sm font-bold uppercase tracking-wider pb-3 -mb-3 border-b-4 transition-colors ${activeTab === 'layout' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Project Layout
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                        Report Settings <ChevronDown size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-300"></div>
                    <button onClick={() => window.print()} className="text-blue-600 hover:text-blue-800" title="Print Report">
                        <FileText size={18} />
                    </button>
                    <button onClick={() => window.print()} className="text-blue-600 hover:text-blue-800" title="Download Report (PDF)">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 print:p-0 print:overflow-visible">
                <div className="max-w-6xl mx-auto print:max-w-none">
                    {/* Render both tabs in print mode for a complete report */}
                    <div className="print:block hidden mb-8">
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">SolarEdge Design Report</h1>
                        <p className="text-slate-500">Project: {designData.projectDetails?.name || 'Untitled Project'}</p>
                    </div>
                    
                    <div className="print:hidden">
                        {activeTab === 'summary' ? (
                            <ProjectSummaryTab designData={designData} />
                        ) : (
                            <ProjectLayoutTab designData={designData} />
                        )}
                    </div>

                    <div className="hidden print:block print:space-y-8">
                        <ProjectSummaryTab designData={designData} />
                        <div className="page-break-before" style={{pageBreakBefore: 'always'}}></div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Project Layout & Losses</h2>
                        <ProjectLayoutTab designData={designData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
