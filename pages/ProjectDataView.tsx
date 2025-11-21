
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Users, Target, Lightbulb, AlertTriangle, Edit2, Plus, Trash, BarChart2 } from 'lucide-react';
import { Header } from '../components/Header';
import { getProjectById, updateProject } from '../services/firestoreService';
import { ProjectData, Stakeholder } from '../types';
import { DEFAULT_PROJECT_DATA } from '../constants';
import { useProject } from '../context/ProjectContext';

const Accordion: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="mb-3 bg-dark-card rounded-xl border border-slate-700/50 overflow-hidden shrink-0">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/20 transition-colors"
    >
      <div className="flex items-center gap-3 text-slate-200 font-medium">
        {icon}
        {title}
      </div>
      {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-y-auto`}>
      <div className="p-4 pt-0 border-t border-slate-700/50">
        {children}
      </div>
    </div>
  </div>
);

export const ProjectDataView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useProject();
  const [localData, setLocalData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string>('swot');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Stakeholder Editing State
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (projectId) {
      setIsLoading(true);
      getProjectById(projectId).then((p) => {
        if (isMounted) {
          if (p && p.data) {
            // Merge with defaults to prevent undefined crashes
            setLocalData({
              stakeholders: p.data.stakeholders || [],
              swot: p.data.swot || [],
              keyMetrics: p.data.keyMetrics || [],
              keyAssumptions: p.data.keyAssumptions || [],
              valueProposition: p.data.valueProposition || "",
              customerSegments: p.data.customerSegments || []
            });
          } else {
             // If project exists but no data, or project doesn't exist (though getProjectById handles that)
             // Fallback to default to avoid white screen
             setLocalData(DEFAULT_PROJECT_DATA);
          }
          setIsLoading(false);
        }
      }).catch(err => {
        console.error("Failed to load project data", err);
        if(isMounted) setIsLoading(false);
      });
    }
    
    return () => { isMounted = false; };
  }, [projectId]);

  const handleSave = async () => {
    if (projectId && localData) {
      try {
        await updateProject(projectId, { data: localData });
        setHasChanges(false);
      } catch (error) {
        console.error("Error saving data:", error);
        alert("Failed to save changes. Please try again.");
      }
    }
  };

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? '' : id);
  };

  const openStakeholderEdit = (sh: Stakeholder) => {
      setEditingStakeholder({...sh});
      setIsEditModalOpen(true);
  }

  const handleStakeholderSave = (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingStakeholder || !localData) return;

      const updatedList = localData.stakeholders.map(s => 
          s.id === editingStakeholder.id ? editingStakeholder : s
      );
      
      setLocalData({ ...localData, stakeholders: updatedList });
      setHasChanges(true);
      setIsEditModalOpen(false);
      setEditingStakeholder(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-dark-bg">
         <Header title={t('loading')} showBack onBack={() => navigate(projectId ? `/chat/${projectId}` : '/')} />
         <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
         </div>
      </div>
    );
  }

  if (!localData) {
    return (
      <div className="flex-1 flex flex-col h-full bg-dark-bg">
        <Header title={t('error')} showBack onBack={() => navigate(projectId ? `/chat/${projectId}` : '/')} />
        <div className="flex-1 flex items-center justify-center text-dark-muted">
          Project data not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg">
      <Header 
        title={t('edit_project_data')} 
        showBack 
        onBack={() => navigate(projectId ? `/chat/${projectId}` : '/')}
        rightAction={
          hasChanges && (
            <button onClick={handleSave} className="text-primary font-semibold px-3 py-1 rounded-lg bg-primary/10">
              {t('save')}
            </button>
          )
        } 
      />

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-24">
        <p className="text-dark-muted text-sm mb-4 px-1">
          {t('edit_data_desc')}
        </p>

        {/* SWOT */}
        <Accordion 
          title={t('swot_analysis')} 
          icon={<AlertTriangle size={18} className="text-blue-400" />}
          isOpen={openSection === 'swot'}
          onToggle={() => toggleSection('swot')}
        >
          <div className="space-y-3 mt-3">
             {(!localData.swot || localData.swot.length === 0) && (
               <div className="text-sm text-slate-500 italic">{t('no_swot')}</div>
             )}
             {localData.swot?.map((item, idx) => (
               <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 group">
                 <div className="flex justify-between mb-1">
                   <span className={`text-xs font-bold uppercase ${
                     item.type === 'strength' ? 'text-green-400' : 
                     item.type === 'weakness' ? 'text-red-400' :
                     item.type === 'opportunity' ? 'text-blue-400' : 'text-amber-400'
                   }`}>{item.type}</span>
                 </div>
                 <textarea 
                    className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none border-b border-transparent focus:border-slate-600"
                    value={item.content}
                    onChange={(e) => {
                      const newSwot = [...(localData.swot || [])];
                      newSwot[idx] = { ...item, content: e.target.value };
                      setLocalData({ ...localData, swot: newSwot });
                      setHasChanges(true);
                    }}
                    rows={2}
                 />
               </div>
             ))}
          </div>
        </Accordion>
        
        {/* Key Metrics */}
        <Accordion 
            title={t('key_metrics')} 
            icon={<BarChart2 size={18} className="text-emerald-400" />}
            isOpen={openSection === 'metrics'}
            onToggle={() => toggleSection('metrics')}
        >
             <div className="space-y-3 mt-3">
                 {(!localData.keyMetrics || localData.keyMetrics.length === 0) && (
                   <div className="text-sm text-slate-500 italic">{t('no_metrics')}</div>
                 )}
                 {localData.keyMetrics?.map((metric, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 relative">
                        {/* Label Input */}
                        <div className="mb-3 pr-8">
                             <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">{t('metric_label')}</label>
                             <textarea 
                                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 border-b border-slate-700/50 focus:border-primary focus:outline-none resize-none py-1"
                                placeholder="e.g. Market Size"
                                rows={1}
                                value={metric.label}
                                onChange={(e) => {
                                    const newMetrics = [...(localData.keyMetrics || [])];
                                    newMetrics[idx] = { ...metric, label: e.target.value };
                                    setLocalData({ ...localData, keyMetrics: newMetrics });
                                    setHasChanges(true);
                                }}
                                style={{ minHeight: '2rem' }}
                            />
                        </div>
                        
                        {/* Value Input */}
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">{t('metric_value')}</label>
                            <input 
                                className="w-full bg-transparent text-lg font-bold text-primary placeholder-slate-600 border-b border-slate-700/50 focus:border-primary focus:outline-none py-1"
                                placeholder="e.g. $1B"
                                value={metric.value}
                                onChange={(e) => {
                                    const newMetrics = [...(localData.keyMetrics || [])];
                                    newMetrics[idx] = { ...metric, value: e.target.value };
                                    setLocalData({ ...localData, keyMetrics: newMetrics });
                                    setHasChanges(true);
                                }}
                            />
                        </div>

                        {/* Delete Button */}
                        <button 
                            onClick={() => {
                                const newMetrics = localData.keyMetrics?.filter((_, i) => i !== idx);
                                setLocalData({ ...localData, keyMetrics: newMetrics });
                                setHasChanges(true);
                            }}
                            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <Trash size={14} />
                        </button>
                    </div>
                 ))}
                 
                 <button 
                    onClick={() => {
                        setLocalData({
                            ...localData, 
                            keyMetrics: [...(localData.keyMetrics || []), { id: Date.now().toString(), label: "", value: "" }]
                        });
                        setHasChanges(true);
                    }}
                    className="w-full py-3 mt-2 border border-dashed border-slate-600 rounded-lg text-sm text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-800/50"
                 >
                     <Plus size={16} /> {t('add_metric')}
                 </button>
             </div>
        </Accordion>

        {/* Stakeholders */}
        <Accordion 
          title={t('stakeholders')} 
          icon={<Users size={18} className="text-purple-400" />}
          isOpen={openSection === 'stakeholders'}
          onToggle={() => toggleSection('stakeholders')}
        >
           <div className="space-y-2 mt-3">
              {(!localData.stakeholders || localData.stakeholders.length === 0) && (
                <div className="text-sm text-slate-500 italic">{t('no_stakeholders')}</div>
              )}
              {localData.stakeholders?.map((sh, idx) => (
                <div 
                    key={idx} 
                    onClick={() => openStakeholderEdit(sh)}
                    className="relative flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-medium text-slate-200 flex items-center gap-2">
                        {sh.name} 
                        <Edit2 size={12} className="text-slate-500" />
                    </div>
                    <div className="text-xs text-purple-300 mb-1">{sh.type}</div>
                    <div className="text-xs text-slate-400 line-clamp-2">{sh.needs}</div>
                  </div>
                </div>
              ))}
           </div>
        </Accordion>

        {/* Value Proposition */}
        <Accordion 
          title={t('value_proposition')} 
          icon={<Lightbulb size={18} className="text-yellow-400" />}
          isOpen={openSection === 'value'}
          onToggle={() => toggleSection('value')}
        >
           <textarea 
              className="w-full mt-3 min-h-[120px] bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300 border border-slate-700/50 focus:border-primary outline-none"
              value={localData.valueProposition || ""}
              onChange={(e) => {
                setLocalData({...localData, valueProposition: e.target.value});
                setHasChanges(true);
              }}
              placeholder="Describe the unique value..."
           />
        </Accordion>

        {/* Customer Segments */}
        <Accordion 
          title={t('customer_segments')} 
          icon={<Target size={18} className="text-pink-400" />}
          isOpen={openSection === 'segments'}
          onToggle={() => toggleSection('segments')}
        >
          <div className="space-y-2 mt-3">
             {localData.customerSegments?.map((seg, idx) => (
               <div key={idx} className="flex gap-2">
                   <input 
                      className="flex-1 bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300 border border-slate-700/50 focus:border-primary outline-none"
                      value={seg}
                      onChange={(e) => {
                        const newSegs = [...(localData.customerSegments || [])];
                        newSegs[idx] = e.target.value;
                        setLocalData({...localData, customerSegments: newSegs});
                        setHasChanges(true);
                      }}
                   />
                   <button 
                        onClick={() => {
                             const newSegs = localData.customerSegments.filter((_, i) => i !== idx);
                             setLocalData({...localData, customerSegments: newSegs});
                             setHasChanges(true);
                        }}
                        className="p-3 bg-slate-800/50 rounded-lg text-red-400"
                   >
                       <Trash size={16} />
                   </button>
               </div>
             ))}
             <button 
                onClick={() => {
                    setLocalData({...localData, customerSegments: [...(localData.customerSegments || []), ""]});
                    setHasChanges(true);
                }}
                className="w-full py-3 mt-2 border border-dashed border-slate-600 rounded-lg text-sm text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-800/50"
             >
                 <Plus size={16} /> {t('add_segment')}
             </button>
          </div>
        </Accordion>

      </div>

      {/* Stakeholder Edit Modal */}
      {isEditModalOpen && editingStakeholder && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-dark-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
              <h3 className="text-lg font-bold mb-4">{t('edit_stakeholder')}</h3>
              <form onSubmit={handleStakeholderSave} className="space-y-4">
                  <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('name')}</label>
                      <input 
                        className="w-full bg-dark-bg p-3 rounded-xl border border-slate-700 text-white focus:border-primary outline-none"
                        value={editingStakeholder.name}
                        onChange={e => setEditingStakeholder({...editingStakeholder, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('type')}</label>
                      <input 
                        className="w-full bg-dark-bg p-3 rounded-xl border border-slate-700 text-white focus:border-primary outline-none"
                        value={editingStakeholder.type}
                        onChange={e => setEditingStakeholder({...editingStakeholder, type: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('needs_pain_points')}</label>
                      <textarea 
                        className="w-full bg-dark-bg p-3 rounded-xl border border-slate-700 text-white focus:border-primary outline-none h-24 resize-none"
                        value={editingStakeholder.needs}
                        onChange={e => setEditingStakeholder({...editingStakeholder, needs: e.target.value})}
                      />
                  </div>
                  <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setIsEditModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-medium"
                      >
                        {t('save_changes')}
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
