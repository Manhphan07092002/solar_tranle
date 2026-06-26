import React, { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Box,
  Zap,
  BarChart3,
  FileText,
  Menu,
  Plus
} from 'lucide-react';
import { Project, ProjectStatus, ProjectType, DesignState } from './types';
import { MOCK_PROJECTS } from './constants';
import { SolarAssistant } from './components/SolarAssistant';
import logo from './Images/1763293698135-932453456.png';

// Components
import Dashboard from './components/Dashboard';
import DesignWizard from './components/DesignWizard';

import { projectService } from './services/apiService';

// Main App Component
export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'design'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = localStorage.getItem('designWizard_currentStep');
      if (saved !== null) {
        const step = parseInt(saved, 10);
        if (!isNaN(step) && step >= 0 && step < 7) return step;
      }
    } catch (e) {}
    return 0;
  });

  // Save currentStep to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('designWizard_currentStep', currentStep.toString());
    } catch (e) {}
  }, [currentStep]);

  // Fetch projects on mount
  React.useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const newProjectData: Partial<Project> = {
        id: `p${Date.now()}`,
        name: 'New Untitled Project',
        address: '',
        owner: 'Unknown',
        capacityKWp: 0,
        status: ProjectStatus.Draft,
        type: ProjectType.Residential,
        thumbnailUrl: 'https://picsum.photos/400/200?grayscale'
      };

      const createdProject = await projectService.create(newProjectData);
      setProjects([createdProject, ...projects]);
      setActiveProject(createdProject);
      setCurrentView('design');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const newProjectData: Partial<Project> = {
        ...project,
        id: `p${Date.now()}`,
        name: `${project.name} (Copy)`,
        lastModified: new Date().toISOString(),
        status: ProjectStatus.Draft
      };

      // In a real app we'd omit the ID so DB generates it, but here we mock it
      const createdProject = await projectService.create(newProjectData);
      setProjects([createdProject, ...projects]);
    } catch (error) {
      console.error('Failed to duplicate:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectService.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    setCurrentView('design');
  };

  const handleExitDesign = () => {
    setActiveProject(null);
    setCurrentView('dashboard');
    loadProjects(); // Refresh list on exit
  };

  const handleFinishDesign = async (finalCapacity: number, designData: DesignState) => {
    if (activeProject) {
      try {
        setLoading(true); // Show loading feedback
        const updates = {
          status: ProjectStatus.Designed,
          capacityKWp: finalCapacity,
          designState: designData,
          // Sync root fields if present in designData
          ...(designData.projectDetails?.name ? { name: designData.projectDetails.name } : {}),
          ...(designData.projectDetails?.address ? { address: designData.projectDetails.address } : {})
        };

        // Save to MongoDB via API
        await projectService.update(activeProject.id, updates);

        // Update local state immediately
        const updatedProjects = projects.map(p =>
          p.id === activeProject.id
            ? { ...p, ...updates, lastModified: new Date().toISOString() }
            : p
        );
        setProjects(updatedProjects);
      } catch (error) {
        console.error('Failed to update project:', error);
        alert('Failed to save project!');
      } finally {
        setLoading(false);
      }
    }
    setActiveProject(null);
    setCurrentView('dashboard');
  };

  const handleSaveProgress = async (designData: DesignState) => {
    if (activeProject) {
      try {
        // Save without closing or changing status
        const updates = {
          designState: designData,
          ...(designData.projectDetails?.name ? { name: designData.projectDetails.name } : {}),
          ...(designData.projectDetails?.address ? { address: designData.projectDetails.address } : {})
        };
        await projectService.update(activeProject.id, updates);

        // Update local state silently
        const updatedProjects = projects.map(p =>
          p.id === activeProject.id
            ? { ...p, ...updates, lastModified: new Date().toISOString() }
            : p
        );
        setProjects(updatedProjects);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-surface font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-primary text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300">
        <div className="p-4 flex flex-col items-center gap-2 border-b border-slate-700 h-auto py-6">

          <span className="font-bold text-lg text-white hidden md:block text-center">Solar Design</span>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={currentView === 'dashboard'}
            onClick={handleExitDesign}
          />
          {currentView === 'design' && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 hidden md:block">
                Design Steps
              </div>
              {/* Sidebar steps synchronized with DesignWizard */}
              {[
                { label: '1. Map & Basics', icon: <MapPin size={20} /> },
                { label: '2. Consumption', icon: <Zap size={20} /> },
                { label: '3. Modeling', icon: <Box size={20} /> },
                { label: '4. PV Layout', icon: <Box size={20} /> },
                { label: '5. Electrical', icon: <Zap size={20} /> },
                { label: '6. Summary', icon: <FileText size={20} /> },
                { label: '7. Financial', icon: <BarChart3 size={20} /> },
              ].map((step, idx) => (
                <SidebarItem
                  key={idx}
                  icon={step.icon}
                  label={step.label}
                  active={currentStep === idx}
                  onClick={() => setCurrentStep(idx)}
                  minimal
                />
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-white">JD</span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">John Doe</p>
              <p className="text-xs text-slate-400">Senior Engineer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {currentView === 'design' && activeProject ? (
              <>
                <h2 className="text-xl font-semibold text-slate-800">{activeProject.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${activeProject.status === ProjectStatus.Designed ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                  {activeProject.status}
                </span>
              </>
            ) : (
              <h2 className="text-xl font-semibold text-slate-800">Your Projects</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentView === 'dashboard' && (
              <button
                onClick={handleCreateProject}
                className="bg-secondary hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Create Project
              </button>
            )}
            {currentView === 'design' && (
              <button
                onClick={handleExitDesign}
                className="text-slate-500 hover:text-slate-800 px-3 py-2 text-sm font-medium"
              >
                Save & Close
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 relative">
          {currentView === 'dashboard' ? (
            <Dashboard
              projects={projects}
              onOpenProject={handleOpenProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
            />
          ) : activeProject ? (
            <DesignWizard
              project={activeProject}
              onFinish={handleFinishDesign}
              onSave={handleSaveProgress}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />
          ) : null}
        </div>

        {/* Floating Gemini AI */}
        {currentView === 'design' && (
          <SolarAssistant projectContext={activeProject ? `Project: ${activeProject.name}, Type: ${activeProject.type}, Capacity: ${activeProject.capacityKWp}kWp` : 'No active project'} />
        )}
      </main>
    </div>
  );
}

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, minimal?: boolean }> = ({ icon, label, active, onClick, minimal }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2
        ${active
          ? 'bg-slate-800 text-white border-blue-500'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'
        }
        ${minimal ? 'py-2 text-slate-500' : ''}
      `}
    >
      {icon}
      <span className="hidden md:block truncate">{label}</span>
    </button>
  )
}
