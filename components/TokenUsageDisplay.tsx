
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TokenUsageDisplayProps {
  currentTokenUsage: { inputTokens: number, outputTokens: number };
}

const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({ currentTokenUsage }) => {
  
  return (
    <div className="mx-0 mb-4 bg-slate-900/80 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between shadow-inner">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <ArrowUp size={12} />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-1">Input Tokens</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-300 leading-none">
               {currentTokenUsage.inputTokens.toLocaleString()}
            </span>
            <span className="text-[8px] text-slate-600">real-time</span>
          </div>
        </div>
      </div>
      
      <div className="h-6 w-px bg-slate-700/50 mx-2" />
      
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-1">Output Tokens</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-600">real-time</span>
            <span className="text-xs font-mono font-bold text-emerald-400 leading-none">
               {currentTokenUsage.outputTokens.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowDown size={12} />
        </div>
      </div>
      
      <div className="h-6 w-px bg-slate-700/50 mx-2" />
      
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-1">Total</span>
        <span className="text-xs font-mono font-bold text-yellow-400 leading-none">
          {(currentTokenUsage.inputTokens + currentTokenUsage.outputTokens).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default TokenUsageDisplay;
