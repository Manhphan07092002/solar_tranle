import React, { useEffect, useState } from 'react';
import { projectService } from '../services/apiService';
import { Project, DesignState } from '../types';
import StepSummary from './steps/summary/StepSummary';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SharedProjectView({ token }: { token: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProject = async () => {
            if (!token) return;
            try {
                const data = await projectService.getShared(token);
                setProject(data);
            } catch (err) {
                setError('Project not found or access has been revoked.');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-slate-500 font-medium">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm text-center max-w-md">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
                    <p className="text-slate-500">{error}</p>
                    <a href="/" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col">
            {/* Minimal Header */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                        PV Designer
                    </span>
                </div>
                <div className="text-sm font-medium text-slate-500">
                    Shared Proposal
                </div>
            </header>

            {/* Read-only Summary View */}
            <div className="flex-1 overflow-hidden relative">
                <StepSummary 
                    designData={project.designState as DesignState} 
                    setDesignData={() => {}} // No-op since it's read-only
                />
                
                {/* Overlay to block any accidental interactions if necessary */}
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 999 }}></div>
            </div>
        </div>
    );
}
