
import React, { useState } from 'react';
import { ProposedChange } from '../types';
import { Check, X, GitPullRequest, ArrowRight, FileCode, AlertCircle } from 'lucide-react';

interface DiffProposalCardProps {
  change: ProposedChange;
  onApply: () => void;
  onDiscard: () => void;
}

const DiffProposalCard: React.FC<DiffProposalCardProps> = ({ change, onApply, onDiscard }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (change.status !== 'pending') {
    return (
      <div className={`mt-2 p-3 rounded-lg border text-sm flex items-center gap-3 ${
        change.status === 'applied' 
          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
          : 'bg-red-950/30 border-red-500/30 text-red-400'
      }`}>
        {change.status === 'applied' ? <Check size={16} /> : <X size={16} />}
        <span className="font-mono font-bold">
          {change.status === 'applied' ? 'Modifica Applicata con Successo' : 'Modifica Rifiutata'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-2 rounded-xl overflow-hidden border border-indigo-500/40 bg-[#0f172a] shadow-xl animate-in slide-in-from-left-2">
      {/* Header */}
      <div className="bg-slate-800/80 p-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-indigo-500 rounded text-white shadow-lg shadow-indigo-500/20">
              <GitPullRequest size={16} />
           </div>
           <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Proposta di Modifica</h4>
              <p className="text-[10px] text-slate-400 font-mono">
                {change.type === 'edit_lines' && `Righe ${change.lineStart} - ${change.lineEnd}`}
                {change.type === 'append' && 'Append to End'}
                {change.type === 'replace' && 'Full Rewrite'}
              </p>
           </div>
        </div>
        <button 
           onClick={() => setIsExpanded(!isExpanded)} 
           className="text-xs text-indigo-400 hover:text-white underline"
        >
          {isExpanded ? 'Nascondi Dettagli' : 'Mostra Dettagli'}
        </button>
      </div>

      {/* Diff View */}
      {isExpanded && (
        <div className="font-mono text-xs overflow-x-auto">
          {change.originalContent && (
            <div className="bg-red-950/20 border-b border-slate-800">
               <div className="px-3 py-1 text-[10px] font-bold text-red-400/70 uppercase bg-red-900/10 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Originale
               </div>
               <pre className="p-3 text-red-200/70 whitespace-pre-wrap opacity-80 decoration-slice line-through decoration-red-500/30">
                  {change.originalContent}
               </pre>
            </div>
          )}
          
          <div className="bg-emerald-950/20">
             <div className="px-3 py-1 text-[10px] font-bold text-emerald-400/70 uppercase bg-emerald-900/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Nuovo Codice
             </div>
             <pre className="p-3 text-emerald-100 whitespace-pre-wrap">
                {change.newContent}
             </pre>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 bg-slate-900/50 border-t border-slate-700 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
           <AlertCircle size={12} />
           <span>Controlla prima di applicare</span>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={onDiscard}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all text-xs font-bold flex items-center gap-1"
            >
              <X size={14} /> Scarta
            </button>
            <button 
              onClick={onApply}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all text-xs font-bold flex items-center gap-2"
            >
              <Check size={14} /> Applica Modifica
            </button>
        </div>
      </div>
    </div>
  );
};

export default DiffProposalCard;
