import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus } from '../types';
import { Clock, MapPin, Trash2, Copy, Edit3, Search, Filter, ArrowUpDown } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onOpenProject: (p: Project) => void;
  onDuplicateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'capacity-desc' | 'capacity-asc';
type StatusFilter = 'all' | ProjectStatus;

const Dashboard: React.FC<DashboardProps> = ({ projects, onOpenProject, onDuplicateProject, onDeleteProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Derived state
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.address.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-desc': return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
          case 'date-asc': return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          case 'capacity-desc': return b.capacityKWp - a.capacityKWp;
          case 'capacity-asc': return a.capacityKWp - b.capacityKWp;
          default: return 0;
        }
      });
  }, [projects, searchTerm, statusFilter, sortBy]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Projects Dashboard</h1>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search size={16} />
            </span>
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value={ProjectStatus.Draft}>Draft</option>
                <option value={ProjectStatus.Designed}>Designed</option>
                <option value={ProjectStatus.Installed}>Installed</option>
              </select>
              <Filter size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="capacity-desc">Highest Cap.</option>
                <option value="capacity-asc">Lowest Cap.</option>
              </select>
              <ArrowUpDown size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No projects found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="mt-4 text-sm text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col">
              {/* Thumbnail */}
              <div className="relative h-40 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onOpenProject(project)}>
                <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold shadow-sm backdrop-blur-md bg-white/90
                        ${project.status === ProjectStatus.Installed ? 'text-blue-600' : 'text-slate-600'}
                    `}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate cursor-pointer hover:text-blue-600" onClick={() => onOpenProject(project)}>{project.name}</h3>
                <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                  <MapPin size={14} />
                  <span className="truncate">{project.address || 'No address defined'}</span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Capacity</p>
                    <p className="text-sm font-semibold text-slate-700">{project.capacityKWp.toFixed(1)} kWp</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Last Modified</p>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock size={12} />
                      {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit" onClick={() => onOpenProject(project)}>
                  <Edit3 size={16} />
                </button>
                <button className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded" title="Duplicate" onClick={() => onDuplicateProject(project)}>
                  <Copy size={16} />
                </button>
                <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete" onClick={() => onDeleteProject(project.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
