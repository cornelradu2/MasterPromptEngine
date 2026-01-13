
import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingProcessProps {
  content: string;
  isComplete: boolean;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ content, isComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (contentRef.current && isExpanded) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isExpanded]);

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-indigo-500/20 bg-indigo-950/10">
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full flex items-center justify-between p-2 bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors text-xs font-medium text-indigo-300"
      >
        <div className="flex items-center gap-2">
            <BrainCircuit size={14} className={!isComplete ? "animate-pulse" : ""} />
            <span>{isComplete ? "Thought Process" : "Thinking..."}</span>
        </div>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isExpanded && (
        <div 
            ref={contentRef} 
            className="p-3 bg-black/20 text-[10px] md:text-xs font-mono text-indigo-200/70 max-h-[200px] overflow-y-auto overflow-x-hidden custom-scrollbar leading-relaxed break-all"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
            {content || <span className="italic opacity-50">Inizializzazione processo cognitivo...</span>}
            {!isComplete && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse align-middle" />}
        </div>
      )}
    </div>
  );
};

export default ThinkingProcess;
