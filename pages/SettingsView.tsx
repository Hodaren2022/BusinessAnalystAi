
import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useProject } from '../context/ProjectContext';
import { GEMINI_MODELS } from '../constants';
import { FontFamily, FontSize, Language } from '../types';
import { Type, Palette, Cpu, Sliders, Globe, UserCog, Key, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, Play } from 'lucide-react';
import { validateApiKey } from '../services/geminiService';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, t } = useProject();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance'>('general');
  const [showKey, setShowKey] = useState(false);
  
  // Test Key State
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const fontOptions: FontFamily[] = [
    'Inter', 'Roboto', 'Open Sans', 
    'Noto Sans TC', 'Noto Serif TC', 'Zen Maru Gothic', 'Shippori Mincho', 'Zen Old Mincho'
  ];

  const hasCustomKey = settings.customApiKey && settings.customApiKey.trim().length > 0;

  const handleTestKey = async () => {
      if (!settings.customApiKey) return;
      
      setIsTesting(true);
      setTestStatus('idle');
      setTestMessage('');
      
      try {
          await validateApiKey(settings.customApiKey);
          setTestStatus('success');
          setTestMessage('API Key is valid and working!');
      } catch (e: any) {
          console.error(e);
          setTestStatus('error');
          let msg = 'Connection failed.';
          if (e.message?.includes('403') || e.toString().includes('403')) {
             msg = 'Invalid API Key (403). Please check the key.';
          } else if (e.message?.includes('429') || e.toString().includes('429')) {
             msg = 'Quota Exceeded (429). Billing may not be enabled.';
          } else {
             msg = e.message || 'Unknown error.';
          }
          setTestMessage(msg);
      } finally {
          setIsTesting(false);
      }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg">
      <Header title={t('settings')} showBack />
      
      <div className="flex border-b border-slate-700 bg-dark-bg sticky top-0 z-10">
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'general' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Cpu size={18} /> {t('general')}
        </button>
        <button 
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'appearance' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Palette size={18} /> {t('appearance')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        
        {activeTab === 'general' && (
          <div className="space-y-8 animate-fade-in">

            {/* API Key Configuration */}
            <div>
               <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                 <Key size={14} /> {t('enter_api_key')}
               </h2>
               <div className={`bg-dark-card p-4 rounded-xl border transition-colors ${hasCustomKey ? 'border-primary/50' : 'border-slate-800'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs text-slate-400">{t('quota_desc')}</p>
                    {hasCustomKey && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>}
                  </div>
                  
                  <div className="flex gap-2">
                      <div className="relative flex-1">
                          <input 
                            type={showKey ? "text" : "password"}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-12 text-slate-200 text-sm focus:border-primary outline-none placeholder-slate-600 transition-all"
                            placeholder={t('api_key_placeholder')}
                            value={settings.customApiKey || ''}
                            onChange={(e) => {
                                updateSettings({ customApiKey: e.target.value });
                                setTestStatus('idle');
                            }}
                            onBlur={(e) => updateSettings({ customApiKey: e.target.value.trim() })}
                            autoComplete="off"
                          />
                          <button 
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-2"
                          >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                      </div>
                      <button 
                        onClick={handleTestKey}
                        disabled={!hasCustomKey || isTesting}
                        className={`px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                            testStatus === 'success' ? 'bg-green-900/30 text-green-400 border border-green-900' :
                            testStatus === 'error' ? 'bg-red-900/30 text-red-400 border border-red-900' :
                            'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                         {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                         {isTesting ? 'Testing...' : 'Test'}
                      </button>
                  </div>
                  
                  {testStatus === 'success' && (
                      <div className="mt-2 text-xs text-green-400 flex items-center gap-1 animate-fade-in">
                          <CheckCircle size={12} /> {testMessage}
                      </div>
                  )}
                  {testStatus === 'error' && (
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1 animate-fade-in">
                          <AlertTriangle size={12} /> {testMessage}
                      </div>
                  )}

                  <div className="mt-2 text-right">
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                    >
                        {t('get_api_key')} &rarr;
                    </a>
                  </div>
               </div>
            </div>
            
            {/* Language Setting */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                <Globe size={14} /> {t('language')}
              </h2>
              <div className="flex bg-dark-card p-1 rounded-xl border border-slate-800">
                 {(['English', 'Chinese'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => updateSettings({ language: lang })}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                        settings.language === lang 
                          ? 'bg-slate-700 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'English' ? 'English' : '繁體中文'}
                    </button>
                  ))}
              </div>
            </div>

            {/* User Preferences */}
            <div>
               <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                 <UserCog size={14} /> {t('ai_preferences')}
               </h2>
               <div className="bg-dark-card p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400 mb-3">{t('ai_preferences_desc')}</p>
                  <textarea 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:border-primary outline-none min-h-[100px] resize-none placeholder-slate-600"
                    placeholder={t('preferences_placeholder')}
                    value={settings.userPreferences || ''}
                    onChange={(e) => updateSettings({ userPreferences: e.target.value })}
                  />
               </div>
            </div>

            {/* Model Selection */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                <Cpu size={14} /> {t('model_intelligence')}
              </h2>
              <div className="space-y-3">
                {GEMINI_MODELS.map(model => (
                  <div 
                    key={model.id}
                    onClick={() => updateSettings({ model: model.id })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      settings.model === model.id 
                        ? 'bg-blue-900/20 border-primary' 
                        : 'bg-dark-card border-transparent hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${settings.model === model.id ? 'text-primary' : 'text-slate-200'}`}>
                        {model.name}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        settings.model === model.id ? 'border-primary' : 'border-slate-600'
                      }`}>
                        {settings.model === model.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                 <Sliders size={14} /> {t('creativity')}
              </h2>
              
              <div className="bg-dark-card p-6 rounded-xl border border-slate-800">
                <div className="flex justify-between mb-2">
                   <span className="text-xl font-bold text-white">{settings.temperature}</span>
                   <span className="text-sm text-primary">
                     {settings.temperature < 0.5 ? t('precise') : settings.temperature > 0.8 ? t('creative') : t('balanced')}
                   </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{t('precise')}</span>
                  <span>{t('creative')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                {t('creativity_desc')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-fade-in">
             <div>
               <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                 <Type size={14} /> {t('text_size')}
               </h2>
               <div className="bg-dark-card p-1 rounded-xl border border-slate-800 flex">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ fontSize: size })}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                        settings.fontSize === size 
                          ? 'bg-slate-700 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
               </div>
               <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-slate-300">
                    {t('preview_text')}
                    <br/>
                    <span className="text-slate-500 text-sm">{t('preview_text_sub')}</span>
                  </p>
               </div>
             </div>

             <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                   <Type size={14} /> {t('font_style')}
                </h2>
                <div className="space-y-2">
                   {fontOptions.map((font) => (
                      <div 
                        key={font}
                        onClick={() => updateSettings({ fontFamily: font })}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          settings.fontFamily === font 
                            ? 'bg-blue-900/20 border-primary' 
                            : 'bg-dark-card border-transparent hover:bg-slate-800'
                        }`}
                      >
                         <div className="flex flex-col">
                            <span style={{ fontFamily: font === 'Inter' ? 'Inter, sans-serif' : font }} className={`text-lg ${settings.fontFamily === font ? 'text-primary' : 'text-slate-200'}`}>
                              {font === 'Noto Sans TC' ? 'Noto Sans TC (黑體)' : 
                               font === 'Noto Serif TC' ? 'Noto Serif TC (宋體)' : 
                               font === 'Zen Maru Gothic' ? 'Zen Maru Gothic (圓體)' :
                               font === 'Shippori Mincho' ? 'Shippori Mincho (明朝體)' :
                               font === 'Zen Old Mincho' ? 'Zen Old Mincho (古風明朝)' : font}
                            </span>
                            {['Noto Sans TC', 'Noto Serif TC', 'Zen Maru Gothic', 'Shippori Mincho', 'Zen Old Mincho'].includes(font) && (
                                <span className="text-xs text-slate-500">Traditional Chinese</span>
                            )}
                         </div>
                         {settings.fontFamily === font && (
                           <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/50">
           <button 
            onClick={() => updateSettings({ 
              model: 'gemini-2.5-flash', 
              temperature: 0.7, 
              language: 'English',
              fontSize: 'medium',
              fontFamily: 'Inter',
              userPreferences: '',
              customApiKey: ''
            })}
            className="w-full py-4 rounded-xl text-slate-500 font-medium hover:bg-dark-card hover:text-red-400 transition-colors"
          >
            {t('reset_settings')}
          </button>
        </div>

      </div>
    </div>
  );
};
