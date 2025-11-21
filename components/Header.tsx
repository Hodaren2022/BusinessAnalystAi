
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack, rightAction, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // On desktop, if we are just navigating between main sections, we might obscure the back button
  // strictly speaking, users can use the sidebar. 
  // However, keep it simple: Hide back button on desktop if we are at root, show otherwise?
  // Or just rely on 'md:hidden' class for the back button specifically if the sidebar is sufficient.
  // For now, let's allow back button on mobile always, and on desktop only if it's NOT the dashboard.
  
  const isDashboard = location.pathname === '/';

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-dark-bg border-b border-dark-card z-10 shrink-0 w-full">
      <div className="flex items-center gap-3 overflow-hidden">
        {showBack && !isDashboard && (
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-dark-card text-dark-text transition-colors md:hidden" 
            title="Back"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-dark-text truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {rightAction}
      </div>
    </header>
  );
};
