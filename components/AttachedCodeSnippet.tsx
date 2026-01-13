
import React, { useState } from 'react';
import { Paperclip, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface AttachedCodeSnippetProps {
  content: string;
}

const AttachedCodeSnippet: React.FC<AttachedCodeSnippetProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const lineCount = content.split('\n').length;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-slate-600/30 bg-slate-900/30">
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full flex items-center justify-between p-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-xs font-medium text-slate-300"
      >
        <div className="flex items-center gap-2">
            <Paperclip size={14} className="text-slate-400" />
            <span>Code Attached ({lineCount} lines)</span>
        </div>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isExpanded && (
        <div className="relative">
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors z-10"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <div className="p-3 bg-black/30 text-[10px] md:text-xs font-mono text-slate-300 max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar leading-relaxed break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachedCodeSnippet;
