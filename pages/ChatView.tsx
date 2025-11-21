
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Mic, Database, UserCircle, Users, Paperclip, X, FileIcon, PieChart, AlertCircle, Square, Key } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Header } from '../components/Header';
import { subscribeToMessages, addMessage, updateProject, getProjectById, uploadFile, updateMessage } from '../services/firestoreService';
import { generateResponse, analyzeProjectData } from '../services/geminiService';
import { Message, UserRole, ProjectData, Project, AnalysisPerspective, Attachment } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const ChatView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { settings, updateSettings, t } = useProject();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [perspective, setPerspective] = useState<AnalysisPerspective>('3rd_person');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [lastSubmittedText, setLastSubmittedText] = useState('');
  
  // Quota Error State
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  
  // Abort Controller Ref
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load project basic info
  useEffect(() => {
      if(!projectId) return;
      getProjectById(projectId).then(p => {
          if(p) {
              setProject(p);
              setPerspective(p.perspective || '3rd_person');
          }
      })
  }, [projectId]);

  // Subscribe to messages
  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = subscribeToMessages(projectId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [projectId]);

  // Auto scroll - only scroll when user sends a message or is near bottom
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement?.parentElement;
    if (!messagesContainer) return;
    
    const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 150;
    
    // Get the last message to check if it's from user
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    
    // Only auto-scroll in these cases:
    // 1. User just sent a message (always scroll)
    // 2. User is already near bottom (continue following conversation)
    // 3. AI starts typing AND user is near bottom
    if (isUserMessage || isNearBottom || (isTyping && isNearBottom)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, previewUrl]);

  const togglePerspective = async () => {
      if (!projectId || !project) return;
      const newPerspective = perspective === '1st_person' ? '3rd_person' : '1st_person';
      setPerspective(newPerspective);
      await updateProject(projectId, { perspective: newPerspective });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation (size < 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to read file as Base64 (for Images/PDF)
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Helper to read file as Text (for txt, html, csv, json, etc.)
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setIsTyping(false);
      // Restore the input so user can edit it
      setInput(lastSubmittedText);
      setWarningMsg("Stopped generation. Input restored.");
  };

  const handleSaveKey = () => {
      const keyToSave = customKeyInput.trim();
      if (keyToSave) {
          updateSettings({ customApiKey: keyToSave });
          setShowQuotaModal(false);
          setCustomKeyInput('');
          
          // Restore text to input logic happens in render usually, but let's ensure
          // we can retry immediately if there was text pending.
          if (input.trim() || lastSubmittedText || selectedFile) {
             // If input is empty but lastSubmittedText has content (from the error restoration), use that.
             // But handleSend clears input. We need to be careful.
             
             // Since 'input' state might be restored by the error catch block already:
             // If 'input' is populated, use it. 
             // If 'input' is empty but we have 'lastSubmittedText', put it back in input then send? 
             // Actually handleSend reads 'input'.
             
             // To auto-retry effectively:
             if (!input && lastSubmittedText) {
                 setInput(lastSubmittedText);
                 // We need to wait for state update or pass text directly. 
                 // Let's modify handleSend to accept optional text override or just rely on state?
                 // Better: Pass the key to handleSend, and let handleSend use current input state.
                 
                 // However, state updates are async.
                 // Let's just force a retry with the saved text passed as argument if needed, 
                 // or simpler: Just tell user to press send.
                 // BUT user request said "Auto retry".
                 
                 // Workaround: We can't easily "push" the input state and send in one go without refactoring handleSend.
                 // So we will pass the Manual Key to handleSend, and handleSend will use 'input' state.
                 // If 'input' was restored by the error handler, it should be there.
                 handleSend(keyToSave);
             } else {
                 handleSend(keyToSave);
             }
          }
      }
  };

  const handleSend = async (manualKey?: string) => {
    // If manualKey is provided, it means we are retrying. 
    // If 'input' is empty but we have 'lastSubmittedText', use that as the input source for this retry.
    let effectiveInput = input;
    if (manualKey && !input.trim() && lastSubmittedText) {
        effectiveInput = lastSubmittedText;
    }

    if ((!effectiveInput.trim() && !selectedFile) || !projectId) return;
    
    // Construct effective settings (Immediate override for this request)
    const effectiveSettings = manualKey 
        ? { ...settings, customApiKey: manualKey } 
        : settings;

    setErrorMsg(null);
    setWarningMsg(null);
    let userText = effectiveInput.trim();
    const currentFile = selectedFile;
    
    // Save text for potential restore
    setLastSubmittedText(userText);

    // Clear inputs immediately
    setInput('');
    clearFile();
    setIsTyping(true); 

    // Create AbortController
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    let aiAttachmentOption: { base64: string; mimeType: string } | undefined = undefined;
    
    try {
      // --- 1. PREPARE FILE DATA (Local) ---
      if (currentFile) {
         const isImage = currentFile.type.startsWith('image/');
         const isPDF = currentFile.type === 'application/pdf';
         const isText = 
             currentFile.type.startsWith('text/') || 
             currentFile.name.endsWith('.txt') || 
             currentFile.name.endsWith('.md') || 
             currentFile.name.endsWith('.html') || 
             currentFile.name.endsWith('.xml') || 
             currentFile.name.endsWith('.json') || 
             currentFile.name.endsWith('.csv');

         if (isImage || isPDF) {
             const base64 = await readFileAsBase64(currentFile);
             aiAttachmentOption = { base64, mimeType: currentFile.type };
         } else if (isText) {
             try {
                const textContent = await readFileAsText(currentFile);
                userText = (userText ? userText + "\n\n" : "") + 
                           `[Analysis Request for File: ${currentFile.name}]\nFile Content:\n\`\`\`\n${textContent}\n\`\`\``;
             } catch (err) {
                console.error("Failed to read text file:", err);
                userText += `\n\n[Attached File: ${currentFile.name}] (Error reading content)`;
             }
         } else {
             userText = (userText ? userText + "\n\n" : "") + 
                        `[Attached File: ${currentFile.name}]\n(Note: This file format cannot be analyzed directly.)`;
         }
      }

      // --- 2. SAVE USER MESSAGE FIRST ---
      const timestamp = Date.now();
      const userMessageData: Omit<Message, "id"> = {
        role: UserRole.USER,
        content: userText,
        timestamp: timestamp,
      };

      const userMessageId = await addMessage(projectId, userMessageData);

      // --- 3. START UPLOAD (Background) ---
      if (currentFile) {
          setIsUploading(true);
          uploadFile(currentFile, projectId)
             .then(async (url) => {
                 if (url) {
                     console.log("File uploaded successfully, updating message with attachment");
                     await updateMessage(projectId, userMessageId, {
                         attachment: {
                             url,
                             type: currentFile.type.startsWith('image/') ? 'image' : 'file',
                             name: currentFile.name,
                             mimeType: currentFile.type
                         }
                     });
                     console.log("Message updated with attachment URL");
                 }
                 setIsUploading(false);
             })
             .catch((err) => {
                 console.error("File upload failed:", err);
                 setIsUploading(false);
                 
                 // Show more specific error message
                 let errorMessage = "(Upload Failed - Local Preview)";
                 if (err.message?.includes("Authentication required")) {
                     errorMessage = "(Upload Failed - Authentication Error)";
                 } else if (err.message?.includes("timeout")) {
                     errorMessage = "(Upload Failed - Timeout)";
                 } else if (err.message?.includes("storage")) {
                     errorMessage = "(Upload Failed - Storage Error)";
                 }
                 
                 updateMessage(projectId, userMessageId, {
                     content: userText + "\n\n" + errorMessage
                 });
             });
      }

      // --- 4. GENERATE AI RESPONSE ---
      const contextMessages = [...messages, { ...userMessageData, id: 'temp' } as Message].slice(-10); 
      
      const responseText = await generateResponse(
        contextMessages, 
        "", 
        effectiveSettings, // Use effective settings to ensure Manual Key is used
        perspective,
        DEFAULT_SYSTEM_INSTRUCTION,
        {
            attachment: aiAttachmentOption,
            signal: currentSignal
        }
      );

      // --- 5. SAVE MODEL RESPONSE ---
      await addMessage(projectId, {
        role: UserRole.MODEL,
        content: responseText,
        timestamp: Date.now() + 100
      });

      // --- 6. BACKGROUND DATA ANALYSIS ---
      // Only proceed if not aborted
      if (!currentSignal.aborted) {
          const fullConversation = [...messages, 
              {role: UserRole.USER, content: userText}, 
              {role: UserRole.MODEL, content: responseText}
          ].map(m => `${m.role}: ${m.content}`).join('\n');

          analyzeProjectData(
              fullConversation, 
              project?.data || { stakeholders: [], swot: [], keyAssumptions: [], valueProposition: "", customerSegments: [] },
              aiAttachmentOption,
              effectiveSettings.customApiKey // Pass custom key to analysis too
          ).then(newData => {
              if (newData) {
                  updateProject(projectId, { data: newData });
                  setProject(prev => prev ? { ...prev, data: newData } : null);
              }
          });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
          console.log('Generation aborted by user');
          return;
      }
      
      console.error("Error in chat flow:", error);
      
      // Check for 429 / Quota Exceeded
      const errorString = JSON.stringify(error);
      if (error.message?.includes('429') || errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED')) {
          setShowQuotaModal(true);
          // Restore input so they don't lose it
          setInput(lastSubmittedText); 
          return; 
      }

      setErrorMsg("An error occurred processing your request. Please try again.");
      await addMessage(projectId, {
        role: UserRole.MODEL,
        content: "⚠️ I encountered a system error. Please try again.",
        timestamp: Date.now()
      });
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg min-w-0 relative">
      <Header 
        title={project?.name || "Chat"} 
        showBack 
        onBack={() => navigate('/')}
        rightAction={
          <div className="flex items-center gap-1 md:gap-2">
             <button 
                onClick={() => navigate(`/analysis/${projectId}`)}
                className="p-2 rounded-full hover:bg-dark-card text-purple-400 transition-colors"
                title={t('analysis_hub')}
             >
                <PieChart size={20} className="md:w-6 md:h-6" />
             </button>
             <button 
                onClick={togglePerspective}
                className={`p-2 rounded-full transition-colors ${
                    perspective === '1st_person' ? 'bg-primary/20 text-primary' : 'hover:bg-dark-card text-dark-muted'
                }`}
                title={t('perspective')}
             >
                {perspective === '1st_person' ? <UserCircle size={20} className="md:w-6 md:h-6" /> : <Users size={20} className="md:w-6 md:h-6" />}
             </button>
             <button onClick={() => navigate(`/data/${projectId}`)} className="p-2 rounded-full hover:bg-dark-card text-blue-400 transition-colors">
               <Database size={20} className="md:w-6 md:h-6" />
             </button>
          </div>
        }
      />
      
      {/* Perspective Indicator */}
      <div className="bg-dark-card/50 px-4 py-1 text-center border-b border-slate-800/50">
          <span className="text-xs text-slate-400 font-medium">
              {t('perspective')}: {perspective === '1st_person' ? t('first_person') : t('third_person')}
          </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-dark-muted opacity-50">
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4 grayscale opacity-50">
                         <span className="text-4xl">🤖</span>
                    </div>
                    <p className="text-lg">{t('start_describing')}</p>
                </div>
            )}
            
            {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === UserRole.USER ? 'items-end' : 'items-start'}`}>
                <div className={`flex ${msg.role === UserRole.USER ? 'justify-end' : 'justify-start'} w-full`}>
                    {msg.role === UserRole.MODEL && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 mr-3 mt-1 flex items-center justify-center text-xs font-bold shadow-lg">AI</div>
                    )}
                    
                    <div className={`flex flex-col max-w-[90%] md:max-w-[75%] lg:max-w-[60%] ${msg.role === UserRole.USER ? 'items-end' : 'items-start'}`}>
                        {/* Attachment Display */}
                        {msg.attachment && (
                            <div className="mb-2">
                                {msg.attachment.type === 'image' ? (
                                    <img 
                                        src={msg.attachment.url} 
                                        alt="Attachment" 
                                        className="rounded-lg max-h-64 object-cover border border-slate-700 shadow-md"
                                    />
                                ) : (
                                    <a 
                                        href={msg.attachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 bg-dark-card p-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors shadow-sm"
                                    >
                                        <FileIcon size={24} className="text-primary" />
                                        <span className="text-sm font-medium truncate max-w-[200px]">{msg.attachment.name}</span>
                                    </a>
                                )}
                            </div>
                        )}

                        {msg.content && msg.content.trim() !== '' && (
                            <div className={`p-4 md:p-5 rounded-2xl text-sm md:text-base leading-relaxed shadow-md ${
                            msg.role === UserRole.USER 
                                ? 'bg-primary text-white rounded-tr-sm' 
                                : 'bg-dark-card text-slate-200 rounded-tl-sm border border-slate-700/50'
                            }`}>
                                {msg.role === UserRole.MODEL ? (
                                    <MarkdownRenderer content={msg.content} role="model" />
                                ) : (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {msg.role === UserRole.USER && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 ml-3 mt-1 flex items-center justify-center overflow-hidden shadow-lg border border-slate-600">
                        <img src={`https://ui-avatars.com/api/?name=User&background=334155&color=fff`} alt="User" />
                    </div>
                    )}
                </div>
            </div>
            ))}
            
            {isTyping && (
            <div className="flex justify-start animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 mr-3 flex items-center justify-center text-xs shadow-lg">AI</div>
                <div className="bg-dark-card p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 shadow-md">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <span className="text-xs text-slate-500 mt-2 ml-1 block">{t('ai_thinking')}</span>
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error/Warning Alert */}
      {(errorMsg || warningMsg) && (
          <div className="px-4 md:px-8 pb-2 flex justify-center animate-slide-up">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${errorMsg ? 'bg-red-900/80 text-red-200' : 'bg-amber-900/80 text-amber-200'}`}>
                  <AlertCircle size={16} /> {errorMsg || warningMsg}
                  <button onClick={() => { setErrorMsg(null); setWarningMsg(null); }} className="ml-2 hover:text-white"><X size={14} /></button>
              </div>
          </div>
      )}

      {/* API Key Quota Modal */}
      {showQuotaModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slide-up">
                <div className="flex items-center gap-3 mb-4 text-red-400">
                    <AlertCircle size={32} />
                    <h3 className="text-xl font-bold text-white">{t('quota_exceeded')}</h3>
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">
                    {t('quota_desc')}
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">{t('enter_api_key')}</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                type="password"
                                value={customKeyInput}
                                onChange={(e) => setCustomKeyInput(e.target.value)}
                                placeholder={t('api_key_placeholder')}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>
                    
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline block text-right"
                    >
                        {t('get_api_key')} &rarr;
                    </a>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => setShowQuotaModal(false)}
                            className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            onClick={handleSaveKey}
                            disabled={!customKeyInput.trim()}
                            className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-blue-600 disabled:opacity-50"
                        >
                            {t('save_and_retry')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Upload Preview */}
      {selectedFile && (
        <div className="px-4 md:px-8 pb-2 bg-dark-bg flex items-center justify-center">
          <div className="max-w-3xl w-full relative bg-dark-card p-3 rounded-xl border border-slate-700 flex items-center gap-3 pr-10 shadow-lg">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-600" />
            ) : (
              <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                 <FileIcon size={24} className="text-slate-400" />
              </div>
            )}
            <div className="flex flex-col">
               <span className="text-sm text-slate-200 truncate max-w-[200px] md:max-w-md font-medium">{selectedFile.name}</span>
               <span className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(0)} KB</span>
               {isUploading && <span className="text-xs text-blue-400 animate-pulse">Uploading...</span>}
            </div>
            <button 
              onClick={clearFile}
              className="absolute top-1/2 -translate-y-1/2 right-3 bg-slate-600 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-dark-bg border-t border-dark-card shrink-0">
        <div className="max-w-4xl mx-auto w-full flex items-end bg-dark-card rounded-3xl p-2 border border-slate-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-lg">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            // Accept diverse types. Logic will handle them.
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.html,.md,.csv,.json"
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-dark-muted hover:text-primary hover:bg-slate-800 transition-colors rounded-full"
            title={t('upload_file_prompt')}
            disabled={isTyping}
          >
            <Paperclip size={22} />
          </button>
          
          {!selectedFile && (
             <button className="p-3 text-dark-muted hover:text-primary hover:bg-slate-800 transition-colors rounded-full hidden md:block">
               <Mic size={22} />
             </button>
          )}

          <textarea 
            rows={1}
            className="flex-1 bg-transparent text-dark-text p-3 max-h-32 focus:outline-none resize-none leading-normal min-h-[48px]"
            placeholder={selectedFile ? t('upload_file_prompt') : t('type_message')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
          />
          
          {/* Dynamic Send/Stop Button */}
          {isTyping ? (
            <button 
                onClick={handleStop}
                className="p-3 rounded-full transition-all duration-300 bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-600 scale-100"
                title={t('stop_generating')}
            >
                 <Square size={22} fill="currentColor" />
            </button>
          ) : (
            <button 
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedFile)}
                className={`p-3 rounded-full transition-all duration-300 ${
                (input.trim() || selectedFile) ? 'bg-primary text-white shadow-lg shadow-primary/40 hover:bg-blue-600 scale-100' : 'bg-slate-700 text-slate-500 scale-95'
                }`}
            >
                <Send size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
