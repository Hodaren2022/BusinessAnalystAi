
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Settings as SettingsIcon, MoreVertical, Copy, Trash, FileText } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ProjectStatus, Project } from '../types';
import { createProject, duplicateProject, deleteProject } from '../services/firestoreService';
import { DEFAULT_PROJECT_DATA } from '../constants';

export const ProjectList: React.FC = () => {
  const { projects, loading, t } = useProject();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const id = await createProject({
        name: newProjectName,
        description: 'New Business Model Analysis',
        status: ProjectStatus.DRAFT,
        data: DEFAULT_PROJECT_DATA,
        perspective: '3rd_person'
      });
      setIsCreating(false);
      setNewProjectName('');
      navigate(`/chat/${id}`);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setActiveMenuId(null);
      const newName = `${project.name} (Copy)`;
      await duplicateProject(project, newName);
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation();
      setActiveMenuId(null);
      if(window.confirm("Are you sure you want to delete this project?")) {
          await deleteProject(projectId);
      }
  };

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setActiveMenuId(null);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-dark-muted">{t('loading')}</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-bg h-full">
      {/* Header */}
      <div className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-dark-card shrink-0">
        <h1 className="text-xl font-bold text-dark-text">{t('dashboard')}</h1>
        <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-dark-card md:hidden">
          <SettingsIcon size={24} className="text-dark-muted" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 md:p-8 pb-2 md:pb-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
          <input 
            type="text" 
            placeholder={t('search_placeholder')} 
            className="w-full bg-dark-card text-dark-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary border-none placeholder-dark-muted"
          />
        </div>
      </div>

      {/* Project List - Responsive Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map(project => (
            <div 
              key={project.id}
              onClick={() => navigate(`/chat/${project.id}`)}
              className="relative bg-dark-card p-5 rounded-2xl border border-slate-700/30 active:scale-[0.99] hover:border-primary/50 hover:bg-slate-800 transition-all cursor-pointer group flex flex-col h-48 shadow-sm hover:shadow-lg"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  project.status === ProjectStatus.COMPLETED ? 'bg-green-900/30 text-green-400' :
                  project.status === ProjectStatus.IN_PROGRESS ? 'bg-amber-900/30 text-amber-400' :
                  'bg-slate-700/50 text-slate-400'
                }`}>
                  {project.status}
                </span>
                
                <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === project.id ? null : project.id);
                  }}
                  className="p-1 -mr-1 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreVertical size={16} className="text-dark-muted" />
                </button>

                {/* Dropdown Menu */}
                {activeMenuId === project.id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-4 top-10 z-20 w-40 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden animate-fade-in"
                    >
                        <button 
                          onClick={(e) => handleDuplicate(e, project)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                        >
                            <Copy size={14} /> {t('duplicate')}
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, project.id)}
                          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        >
                            <Trash size={14} /> {t('delete')}
                        </button>
                    </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-dark-text mb-2 line-clamp-1">{project.name}</h3>
              <p className="text-sm text-dark-muted line-clamp-2 flex-1">{project.description}</p>
              
              <div className="mt-3 flex items-center justify-between text-xs text-dark-muted pt-3 border-t border-slate-700/30">
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                   <FileText size={12} /> 
                   {project.perspective === '1st_person' ? '1st Person' : '3rd Person'}
                </span>
              </div>
            </div>
          ))}
          
          {/* Add New Card (Desktop) */}
          <div 
            onClick={() => setIsCreating(true)}
            className="hidden md:flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-slate-700 hover:border-primary/50 hover:bg-slate-800/30 cursor-pointer transition-all group"
          >
              <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
                 <Plus size={24} className="text-slate-400 group-hover:text-primary" />
              </div>
              <span className="text-slate-400 font-medium group-hover:text-slate-200">{t('create_project')}</span>
          </div>
        </div>
        
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-dark-muted">
            <p>{t('no_projects')}</p>
            <p className="text-sm mt-2">{t('start_analysis')}</p>
          </div>
        )}
      </div>

      {/* Mobile FAB (Hidden on Desktop) */}
      <div className="absolute bottom-6 right-6 z-30 md:hidden">
        <button 
          onClick={() => setIsCreating(true)}
          className="w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-blue-600 transition-colors text-white"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Create Dialog Overlay */}
      {isCreating && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-dark-card w-full max-w-md rounded-2xl p-6 animate-slide-up shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{t('create_project')}</h2>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                type="text"
                placeholder={t('project_name_placeholder')}
                className="w-full bg-dark-bg text-dark-text p-4 rounded-xl mb-6 border border-slate-700 focus:border-primary outline-none"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                  disabled={!newProjectName.trim()}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
