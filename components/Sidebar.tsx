
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Settings, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { createProject } from '../services/firestoreService';
import { ProjectStatus } from '../types';
import { DEFAULT_PROJECT_DATA } from '../constants';

export const Sidebar: React.FC = () => {
  const { projects, t } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-r border-slate-800">
      {/* Logo / Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mr-3">
           <span className="font-bold text-white text-lg">B</span>
        </div>
        <span className="font-bold text-slate-100 tracking-tight">Business AI</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 no-scrollbar">
        
        {/* Main Actions */}
        <div className="space-y-1">
            <button 
                onClick={() => navigate('/')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
                <LayoutDashboard size={20} />
                <span className="font-medium text-sm">{t('dashboard')}</span>
            </button>
             <button 
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/settings' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
                <Settings size={20} />
                <span className="font-medium text-sm">{t('settings')}</span>
            </button>
        </div>

        {/* Projects List */}
        <div>
            <div className="px-3 mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('projects')}</h3>
                <button onClick={() => setIsCreating(true)} className="text-slate-500 hover:text-primary">
                    <Plus size={16} />
                </button>
            </div>
            <div className="space-y-1">
                {projects.map(p => (
                    <button
                        key={p.id}
                        onClick={() => navigate(`/chat/${p.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group ${
                            location.pathname.includes(p.id) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                        }`}
                    >
                        <MessageSquare size={16} className={location.pathname.includes(p.id) ? 'text-primary' : 'text-slate-600 group-hover:text-slate-500'} />
                        <span className="font-medium text-sm truncate">{p.name}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Create Modal Overlay (Local to Sidebar) */}
      {isCreating && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl animate-slide-up">
                <h3 className="text-lg font-bold text-white mb-4">{t('create_project')}</h3>
                <form onSubmit={handleCreate}>
                    <input
                        autoFocus
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary outline-none mb-4"
                        placeholder={t('project_name_placeholder')}
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                        <button 
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            type="submit"
                            disabled={!newProjectName.trim()}
                            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
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