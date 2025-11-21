
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  role: 'user' | 'model';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, role }) => {
  if (!content) return null;

  // Split by newlines to handle paragraphs and lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const key = `line-${index}`;
    const trimmed = line.trim();

    // Handle Headers (###)
    if (trimmed.startsWith('### ')) {
      if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc ml-5 mb-4 space-y-1">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<h3 key={key} className="text-lg font-bold mt-4 mb-2">{parseBold(trimmed.replace('### ', ''))}</h3>);
      return;
    }
    
    // Handle Headers (##)
    if (trimmed.startsWith('## ')) {
       if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc ml-5 mb-4 space-y-1">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<h2 key={key} className="text-xl font-bold mt-6 mb-3 border-b border-slate-600/30 pb-1">{parseBold(trimmed.replace('## ', ''))}</h2>);
      return;
    }

    // Handle Bullet Points (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      const text = trimmed.substring(2);
      listItems.push(<li key={key} className="leading-relaxed">{parseBold(text)}</li>);
      return;
    }

    // Handle Numbered Lists (1. )
    if (/^\d+\.\s/.test(trimmed)) {
        inList = true; // We reuse UL for simplicity, or could switch to OL
        const text = trimmed.replace(/^\d+\.\s/, '');
        listItems.push(<li key={key} className="leading-relaxed"><span className="font-semibold mr-1">{trimmed.match(/^\d+\./)?.[0]}</span>{parseBold(text)}</li>);
        return;
    }

    // Close list if we encounter a non-list line
    if (inList && trimmed !== '') {
      elements.push(<ul key={`list-${index}`} className="list-disc ml-5 mb-4 space-y-1">{listItems}</ul>);
      listItems = [];
      inList = false;
    }

    // Empty lines (Paragraph breaks)
    if (trimmed === '') {
       elements.push(<div key={key} className="h-2" />); // Spacer
       return;
    }

    // Regular Paragraph
    elements.push(<p key={key} className="mb-2 leading-relaxed">{parseBold(line)}</p>);
  });

  // Flush remaining list
  if (inList) {
    elements.push(<ul key="list-end" className="list-disc ml-5 mb-4 space-y-1">{listItems}</ul>);
  }

  return <div className={`markdown-body ${role === 'user' ? 'text-white' : 'text-slate-200'}`}>{elements}</div>;
};

// Helper to parse **bold** text
const parseBold = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-indigo-200">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};
