import React, { useState } from 'react';
import { DesignState } from '../../../types';
import ProjectSummaryTab from './ProjectSummaryTab';
import ProjectLayoutTab from './ProjectLayoutTab';
import { FileText, Download, Settings, ChevronDown, Share2, Copy, CheckCircle2 } from 'lucide-react';
import ExportPDFButton from './ExportPDFButton';
import { projectService } from '../../../services/apiService';

interface StepSummaryProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
    projectId?: string;
}

export default function StepSummary({ designData, setDesignData, projectId }: StepSummaryProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'layout'>('summary');
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        if (!projectId) return;
        setIsSharing(true);
        try {
            const { shareToken } = await projectService.share(projectId);
            const url = `${window.location.origin}/share/${shareToken}`;
            setShareUrl(url);
        } catch (error) {
            console.error('Error sharing project:', error);
            alert('Failed to generate share link.');
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    <button onClick={() => window.print()} className="text-slate-500 hover:text-slate-800" title="Print Report">
                        <FileText size={18} />
                    </button>
                    {projectId && (
                        <button onClick={handleShare} disabled={isSharing} className="text-slate-500 hover:text-blue-600" title="Share Project">
                            {isSharing ? <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div> : <Share2 size={18} />}
                        </button>
                    )}
                    <ExportPDFButton designData={designData} targetId="pdf-report-content" />
                </div>
            </div>

            {/* Share Link Modal */}
            {shareUrl && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Project Shared Successfully</h3>
                        <p className="text-sm text-slate-500 mb-4">Anyone with this link can view the project report.</p>
                        <div className="flex items-center gap-2 mb-6">
                            <input type="text" value={shareUrl} readOnly className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none" />
                            <button onClick={copyToClipboard} className={`p-2 rounded-lg transition-colors ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <button onClick={() => setShareUrl('')} className="w-full py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 print:p-0 print:overflow-visible">
                <div id="pdf-report-content" className="max-w-6xl mx-auto print:max-w-none bg-[#f5f6f8] print:bg-white pb-8">
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
