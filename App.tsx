
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectList } from './pages/ProjectList';
import { ChatView } from './pages/ChatView';
import { ProjectDataView } from './pages/ProjectDataView';
import { SettingsView } from './pages/SettingsView';
import { AnalysisHub } from './pages/AnalysisHub';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Sidebar } from './components/Sidebar';

// Internal component to access Context for styling
const AppContent: React.FC = () => {
  const { settings } = useProject();

  // Map settings to CSS styles
  const getFontFamily = (font: string) => {
    switch (font) {
      // English
      case 'Roboto': return '"Roboto", "Noto Sans TC", sans-serif';
      case 'Merriweather': return '"Merriweather", "Noto Serif TC", serif';
      case 'Open Sans': return '"Open Sans", "Noto Sans TC", sans-serif';
      case 'Lexend': return '"Lexend", "Noto Sans TC", sans-serif';
      
      // Chinese
      case 'Noto Sans TC': return '"Noto Sans TC", sans-serif';
      case 'Noto Serif TC': return '"Noto Serif TC", serif';
      case 'Zen Maru Gothic': return '"Zen Maru Gothic", sans-serif';
      case 'Shippori Mincho': return '"Shippori Mincho", serif';
      case 'Zen Old Mincho': return '"Zen Old Mincho", serif';
      
      default: return '"Inter", "Noto Sans TC", sans-serif';
    }
  };

  const getFontSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm'; // Tailwind text-sm (0.875rem)
      case 'large': return 'text-lg'; // Tailwind text-lg (1.125rem)
      default: return 'text-base'; // Tailwind text-base (1rem)
    }
  };

  return (
    <HashRouter>
      <div 
        className={`flex h-screen w-screen bg-dark-bg text-dark-text antialiased overflow-hidden ${getFontSizeClass(settings.fontSize)}`}
        style={{ fontFamily: getFontFamily(settings.fontFamily) }}
      >
          {/* Sidebar: Hidden on Mobile, Visible on Desktop */}
          <div className="hidden md:flex w-72 flex-col h-full shrink-0">
              <Sidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full relative overflow-hidden min-w-0">
              <Routes>
              <Route path="/" element={<ProjectList />} />
              <Route path="/chat/:projectId" element={<ChatView />} />
              <Route path="/data/:projectId" element={<ProjectDataView />} />
              <Route path="/analysis/:projectId" element={<AnalysisHub />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </div>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

export default App;