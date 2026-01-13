
import React, { useEffect, useRef, useState } from 'react';
import { MakerProcess, MakerStep } from '../types';
import { 
  CheckCircle2, 
  CircleDashed, 
  Loader2, 
  AlertTriangle, 
  Cpu, 
  ArrowDown,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Code,
  PencilRuler,
  Sparkles
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface MakerDashboardProps {
  process: MakerProcess;
}

const AgentIcon: React.FC<{ role: string; isActive: boolean }> = ({ role, isActive }) => {
    const colorClass = isActive ? "text-white" : "text-slate-400";
    switch(role) {
        case 'ARCHITECT': return <PencilRuler className={colorClass} size={20} />;
        case 'ENGINEER': return <Code className={colorClass} size={20} />;
        case 'GUARDIAN': return <ShieldCheck className={colorClass} size={20} />;
        case 'PERFECTIONIST': return <Sparkles className={colorClass} size={20} />;
        default: return <Cpu className={colorClass} size={20} />;
    }
};

const PipelineStep: React.FC<{ step: MakerStep; isActive: boolean; isLast: boolean }> = ({ step, isActive, isLast }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const borderColor = isActive 
    ? 'border-indigo-500' 
    : step.status === 'completed' 
        ? 'border-emerald-500/50' 
        : 'border-slate-800';
        
  const bgClass = isActive 
    ? 'bg-slate-800 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
    : step.status === 'completed'
        ? 'bg-slate-900/50 border-emerald-900/30'
        : 'bg-slate-950 border-slate-800 opacity-50';

  return (
    <div className="relative pl-12 pb-8">
      {/* Connector Line */}
      {!isLast && (
        <div className={`absolute left-[23px] top-10 bottom-0 w-0.5 ${step.status === 'completed' ? 'bg-emerald-500/30' : 'bg-slate-800'}`} />
      )}

      {/* Status Icon Bubble */}
      <div className={`
        absolute left-0 top-0 w-12 h-12 rounded-full border-4 bg-[#0f172a] flex items-center justify-center z-10
        ${isActive ? 'border-indigo-500' : step.status === 'completed' ? 'border-emerald-500' : 'border-slate-800'}
      `}>
        {step.status === 'working' ? (
            <Loader2 className="animate-spin text-indigo-500" size={20} />
        ) : step.status === 'completed' ? (
            <Check className="text-emerald-500" size={20} />
        ) : step.status === 'failed' ? (
            <AlertTriangle className="text-red-500" size={20} />
        ) : (
            <span className="text-slate-600 font-bold text-xs">{step.id}</span>
        )}
      </div>

      {/* Card Content */}
      <div ref={contentRef} className={`rounded-xl border p-5 transition-all duration-500 ${bgClass}`}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                    <AgentIcon role={step.agentRole} isActive={isActive} />
                </div>
                <div>
                    <h3 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-slate-300'}`}>{step.title}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{step.description}</p>
                </div>
            </div>
            {step.status === 'completed' && <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded font-mono">COMPLETE</div>}
        </div>

        {/* Live Logs */}
        {isActive && step.logs.length > 0 && (
            <div className="mt-4 mb-2 font-mono text-xs text-indigo-300/80 bg-black/20 p-2 rounded border border-indigo-500/10">
                {step.logs.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2">{'>'} {log}</div>)}
            </div>
        )}

        {/* Output Preview (Diff/Result) */}
        {step.outputContent && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Terminal size={12} />
                    <span>OUTPUT AGENTE</span>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar bg-[#0b1120] rounded border border-slate-800 p-2 text-xs opacity-80 hover:opacity-100 transition-opacity">
                    <MarkdownRenderer content={step.outputContent} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const MakerDashboard: React.FC<MakerDashboardProps> = ({ process }) => {
  const [copied, setCopied] = useState(false);
  if (!process) return null;

  const handleCopy = () => {
     navigator.clipboard.writeText(process.finalResult);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] text-slate-200 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Dashboard */}
      <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <Cpu className="text-purple-400 animate-pulse" size={24} />
                </div>
                <div>
                   <h1 className="text-xl font-bold text-white tracking-tight">MAKER Pipeline Active</h1>
                   <p className="text-xs text-purple-400 font-mono">SEQ-ID: {process.id} • STATUS: {process.status}</p>
                </div>
             </div>
             
             {/* Progress Bar */}
             <div className="w-48">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold">
                    <span>Assembly Line</span>
                    <span>{Math.round(((process.currentStepIndex + (process.status === 'completed' ? 1 : 0)) / process.steps.length) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-700"
                        style={{ width: `${((process.currentStepIndex + (process.status === 'completed' ? 1 : 0)) / process.steps.length) * 100}%` }}
                    />
                </div>
             </div>
          </div>
          
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm text-slate-300 italic truncate flex gap-2 items-center">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             "{process.userPrompt}"
          </div>
        </div>
      </div>

      {/* Main Pipeline Floor */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth">
         <div className="max-w-3xl mx-auto">
            
            {process.steps.map((step, index) => (
              <PipelineStep 
                key={step.id} 
                step={step} 
                isActive={process.status !== 'completed' && index === process.currentStepIndex} 
                isLast={index === process.steps.length - 1}
              />
            ))}

            {process.status === 'completed' && (
               <div className="mt-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
                  <div className="flex items-center justify-center mb-6 text-slate-500">
                    <ArrowDown className="animate-bounce" />
                  </div>
                  
                  <div className="bg-emerald-950/20 border border-emerald-500/40 p-1 rounded-2xl shadow-2xl">
                     <div className="bg-[#0f172a] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-emerald-900/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 className="text-emerald-400" size={18} />
                                    Final Deliverable
                                </h2>
                                <p className="text-xs text-emerald-500/70">Verified & Polished by Zenith.</p>
                            </div>
                            <button 
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'}`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copiato' : 'Copia Tutto'}
                            </button>
                        </div>
                        
                        <div className="p-6 bg-[#0b1120]">
                            <MarkdownRenderer content={process.finalResult || "Nessun output."} />
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>
    </div>
  );
};

export default MakerDashboard;
