
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, AppSettings } from '../types';
import { subscribeToProjects } from '../services/firestoreService';
import { translations, TranslationKey } from '../locales/translations';

interface ProjectContextType {
  projects: Project[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  loading: boolean;
  t: (key: TranslationKey) => string;
}

const defaultSettings: AppSettings = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  language: 'English',
  fontSize: 'medium',
  fontFamily: 'Inter',
  userPreferences: ''
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });
    
    // Load settings from local storage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }

    return () => unsubscribe();
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));
  };

  const t = (key: TranslationKey): string => {
    const langData = translations[settings.language as keyof typeof translations];
    return (langData as any)[key] || key;
  };

  return (
    <ProjectContext.Provider value={{ projects, settings, updateSettings, loading, t }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
