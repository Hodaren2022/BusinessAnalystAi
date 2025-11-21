
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getProjectById, updateProject } from '../services/firestoreService';
import { generateExecutiveReport, generateProjectVideo } from '../services/geminiService';
import { ProjectData, GeneratedMedia } from '../types';
import { BarChart, FileText, Video, Play, Download, RefreshCw, PieChart } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

// --- Components for Charts ---

const SimpleBarChart: React.FC<{ data: { label: string, value: number, color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 10); // Base max 10
  return (
    <div className="space-y-3 w-full">
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{item.label}</span>
            <span>{item.value}/10</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const MatrixChart: React.FC<{ points: { x: number, y: number, label: string }[] }> = ({ points }) => {
  return (
    <div className="relative w-full aspect-square bg-slate-800/50 rounded-xl border border-slate-700 p-2">
      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 border-b border-slate-700/50 flex">
          <div className="flex-1 border-r border-slate-700/50"></div>
          <div className="flex-1"></div>
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-slate-700/50"></div>
          <div className="flex-1"></div>
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-1 left-2 text-[10px] text-slate-500">High Power</div>
      <div className="absolute bottom-1 right-2 text-[10px] text-slate-500">High Interest</div>
      <div className="absolute bottom-1 left-2 text-[10px] text-slate-500">Low</div>

      {/* Points */}
      {points.map((p, i) => (
        <div 
          key={i}
          className="absolute w-3 h-3 bg-purple-500 rounded-full border border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(p.x / 10) * 100}%`, bottom: `${(p.y / 10) * 100}%` }}
          title={p.label}
        >
           <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-white bg-black/70 px-1 rounded whitespace-nowrap">
             {p.label}
           </span>
        </div>
      ))}
    </div>
  );
};

// --- Main Page ---

export const AnalysisHub: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t, settings } = useProject();
  const [data, setData] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'report' | 'media'>('charts');
  const [loading, setLoading] = useState(true);
  
  // Generation States
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  useEffect(() => {
    if (projectId) {
      getProjectById(projectId).then(p => {
        if (p) setData(p.data);
        setLoading(false);
      });
    }
  }, [projectId]);

  const handleGenerateReport = async () => {
    if (!data || !projectId) return;
    setIsGeneratingReport(true);
    try {
      // Pass stored custom API key to the service
      const report = await generateExecutiveReport(data, settings.customApiKey);
      const newData = { ...data, executiveSummary: report };
      setData(newData);
      await updateProject(projectId, { data: newData });
    } catch (e) {
      console.error(e);
      alert("Report generation failed.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!data || !projectId) return;
    
    // Check for API Key selection for VEO
    // ONLY check if we are NOT using a custom API Key.
    // If user provided a custom key, we skip the AI Studio environment check/enforcement.
    if (!settings.customApiKey && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
       const hasKey = await (window as any).aistudio.hasSelectedApiKey();
       if (!hasKey) {
         try {
            await (window as any).aistudio.openSelectKey();
         } catch (e) {
            console.error("Key selection cancelled or failed", e);
            return;
         }
       }
    }

    setIsGeneratingVideo(true);
    try {
      // Pass stored custom API key to the service
      const videoUrl = await generateProjectVideo(data, settings.customApiKey);
      const newMedia: GeneratedMedia = {
        id: Date.now().toString(),
        type: 'video',
        url: videoUrl,
        promptUsed: "Business Concept Visualization",
        createdAt: Date.now()
      };
      
      const newData = { 
        ...data, 
        generatedMedia: [...(data.generatedMedia || []), newMedia] 
      };
      
      setData(newData);
      await updateProject(projectId, { data: newData });
    } catch (e) {
      console.error(e);
      alert("Video generation failed. Please ensure you have access to Veo models and have selected an API Key.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (loading) return <div className="flex-1 flex justify-center items-center text-dark-muted">{t('loading')}</div>;
  if (!data) return <div className="flex-1 flex justify-center items-center text-dark-muted">No Data Found</div>;

  return (
    <div className="flex-1 flex flex-col bg-dark-bg">
      <Header title={t('analysis_hub')} showBack onBack={() => navigate(`/chat/${projectId}`)} />

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'charts', icon: <PieChart size={16} />, label: t('charts') },
          { id: 'report', icon: <FileText size={16} />, label: t('report') },
          { id: 'media', icon: <Video size={16} />, label: t('media') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-24">
        
        {/* CHARTS TAB */}
        {activeTab === 'charts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-dark-card p-5 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">{t('swot_impact_analysis')}</h3>
              {data.swot.some(s => s.impactScore) ? (
                <SimpleBarChart 
                  data={data.swot.map(s => ({
                    label: s.content.substring(0, 15) + '...',
                    value: s.impactScore || 5,
                    color: s.type === 'strength' ? '#4ade80' : s.type === 'weakness' ? '#f87171' : s.type === 'opportunity' ? '#60a5fa' : '#fbbf24'
                  }))}
                />
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  {t('swot_impact_desc')}
                </div>
              )}
            </div>

            <div className="bg-dark-card p-5 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">{t('stakeholder_matrix')}</h3>
              {data.stakeholders.some(s => s.powerScore) ? (
                <MatrixChart 
                  points={data.stakeholders.map(s => ({
                    x: s.interestScore || 5,
                    y: s.powerScore || 5,
                    label: s.name
                  }))}
                />
              ) : (
                 <div className="text-center py-4 text-slate-500 text-sm">
                  {t('stakeholder_matrix_desc')}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2 text-center">
                X: Interest (1-10) | Y: Power (1-10)
              </p>
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'report' && (
          <div className="space-y-4 animate-fade-in">
             {!data.executiveSummary ? (
               <div className="flex flex-col items-center justify-center py-12">
                 <p className="text-slate-400 mb-4 text-center text-sm">Generate a formal markdown report based on your current data.</p>
                 <button 
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-primary/20"
                 >
                    {isGeneratingReport ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
                    {t('generate_report')}
                 </button>
               </div>
             ) : (
               <>
                 <div className="flex justify-end">
                    <button 
                      onClick={handleGenerateReport} 
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw size={12} /> {t('regenerate')}
                    </button>
                 </div>
                 <div className="bg-white text-slate-900 p-6 rounded-xl shadow-sm overflow-hidden">
                    <h1 className="text-2xl font-bold mb-4 border-b pb-2">Executive Report</h1>
                    <div className="prose prose-sm max-w-none">
                        {/* Simple Markdown Rendering */}
                        {data.executiveSummary.split('\n').map((line, i) => {
                            if (line.startsWith('###')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('###', '')}</h3>;
                            if (line.startsWith('##')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('##', '')}</h2>;
                            if (line.startsWith('**')) return <strong key={i} className="block mt-2">{line.replace(/\*\*/g, '')}</strong>;
                            if (line.startsWith('-')) return <li key={i} className="ml-4">{line.replace('-', '')}</li>;
                            return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
                        })}
                    </div>
                 </div>
               </>
             )}
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === 'media' && (
           <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-2xl border border-indigo-500/30">
                 <h3 className="font-bold text-white text-lg mb-2">AI Concept Video</h3>
                 <p className="text-sm text-indigo-200 mb-4 leading-relaxed">
                   {t('video_desc')}
                   <br/>
                   <span className="text-xs opacity-70">*Note: Requires Veo model access and a valid API Key selection.</span>
                 </p>
                 
                 <button 
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30"
                 >
                    {isGeneratingVideo ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} /> {t('generating_video')}
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="currentColor" /> {t('generate_video')}
                      </>
                    )}
                 </button>
              </div>

              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-400 uppercase">{t('gallery')}</h4>
                 {(!data.generatedMedia || data.generatedMedia.length === 0) && (
                    <div className="text-center py-8 text-slate-600 text-sm">{t('no_videos')}</div>
                 )}
                 {data.generatedMedia?.map((media) => (
                    <div key={media.id} className="bg-dark-card rounded-xl overflow-hidden border border-slate-700">
                       <div className="aspect-video bg-black relative flex items-center justify-center">
                          <video 
                            src={media.url} 
                            controls 
                            className="w-full h-full object-contain"
                            poster="https://via.placeholder.com/640x360/0f172a/475569?text=Veo+Video+Preview"
                          />
                       </div>
                       <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-400">
                            {new Date(media.createdAt).toLocaleString()}
                          </span>
                          <a 
                            href={media.url} 
                            download 
                            className="p-2 hover:bg-slate-700 rounded-full text-slate-300"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
