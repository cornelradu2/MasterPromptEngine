
import React, { useRef, useEffect, useState } from 'react';
import { Bot, User as UserIcon, Loader2, Send, TriangleAlert, Folder, Cpu, PanelRightClose, Paperclip, Code2, X, Brain, Zap, Sparkles } from 'lucide-react';
import { Message, Role, AISettings, ReasoningEffort } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer';
import AnalysisCard from '../AnalysisCard';
import ThinkingProcess from '../ThinkingProcess';
import AttachedCodeSnippet from '../AttachedCodeSnippet';
import DiffProposalCard from '../DiffProposalCard';

interface ChatPanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: Message[];
  settings: AISettings;
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  attachedSnippet: string | null;
  setAttachedSnippet: (val: string | null) => void;
  onResetView: () => void;
  onContextClick: () => void;
  onMemoriesClick: () => void;
  onMakerToggle: () => void;
  onReasoningEffortChange: (effort: ReasoningEffort) => void;
  onApplyChange?: (messageId: string) => void;
  onDiscardChange?: (messageId: string) => void;
  isContextSet?: boolean;
  hasMemories?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen, setIsOpen, messages, settings, input, setInput, onSend, isLoading, 
  attachedSnippet, setAttachedSnippet, onResetView, onContextClick, onMemoriesClick, onMakerToggle,
  onReasoningEffortChange,
  onApplyChange, onDiscardChange,
  isContextSet, hasMemories
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showReasoningPopup, setShowReasoningPopup] = useState(false);
  const reasoningPopupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reasoningPopupRef.current && !reasoningPopupRef.current.contains(event.target as Node)) {
        setShowReasoningPopup(false);
      }
    };
    if (showReasoningPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReasoningPopup]);

  // Get slider value from effort
  const effortToSlider = (effort: ReasoningEffort): number => {
    switch (effort) {
      case 'low': return 0;
      case 'medium': return 1;
      case 'high': return 2;
      default: return 1;
    }
  };

  // Get effort from slider value
  const sliderToEffort = (value: number): ReasoningEffort => {
    switch (value) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      default: return 'medium';
    }
  };

  // Get reasoning effort display info
  const getReasoningEffortInfo = () => {
    switch (settings.reasoningEffort) {
      case 'low':
        return { icon: Zap, label: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-500/20', title: 'Fast Mode', desc: 'Risposte veloci senza thinking' };
      case 'high':
        return { icon: Sparkles, label: '🔬', color: 'text-purple-400', bg: 'bg-purple-500/20', title: 'Deep Mode', desc: 'Ragionamento esteso e approfondito' };
      default:
        return { icon: Brain, label: '🧠', color: 'text-blue-400', bg: 'bg-blue-500/20', title: 'Balanced', desc: 'Thinking bilanciato' };
    }
  };

  const reasoningInfo = getReasoningEffortInfo();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <section className={`
        w-full md:w-[450px] flex-shrink-0 flex flex-col bg-[#0b1120] border-l border-white/5 shadow-2xl z-20 absolute md:relative h-full top-0 right-0 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:hidden'}
    `}>
       <div className="p-3 border-b border-white/5 bg-[#162032] flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Bot size={18} className={settings.enableMaker ? "text-purple-400" : "text-indigo-400"} />
             <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200">
                    {settings.enableMaker ? "MasterPromptEngine MAKER" : "MasterPromptEngine Standard"}
                </span>
                <span className="text-[10px] text-slate-500">
                    {settings.enableMaker ? "Architect Mode Active" : "Pair Programmer Mode"}
                </span>
             </div>
          </div>
          <div className="flex gap-1">
             <button onClick={onResetView} title="Reset View" className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white md:hidden"><PanelRightClose size={16} /></button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0f172a]">
         {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 space-y-2">
                <Bot size={48} />
                <p className="text-xs text-center px-4">Sono pronto. Usa il Code Editor a sinistra per i tuoi draft, io sono qui a destra per assisterti.</p>
            </div>
         ) : (
            messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[95%] ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                        {msg.role === Role.MODEL && <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${settings.enableMaker ? 'bg-purple-600' : 'bg-indigo-600'}`}><Bot size={12} className="text-white" /></div>}
                        {msg.role === Role.USER && <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><UserIcon size={12} className="text-slate-300" /></div>}
                        
                        <div className={`p-3 rounded-2xl text-sm shadow-sm flex flex-col gap-2 max-w-full overflow-hidden ${
                            msg.role === Role.USER 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none w-full'
                        }`}>
                            {msg.analysisResult ? <AnalysisCard result={msg.analysisResult} /> : (
                                <>
                                    {msg.thoughtContent && <ThinkingProcess content={msg.thoughtContent} isComplete={!msg.isThinking} />}
                                    
                                    {msg.text && (
                                       <MarkdownRenderer 
                                          content={msg.text} 
                                          className={msg.role === Role.USER ? 'prose-invert text-xs' : 'text-xs'} 
                                       />
                                    )}
                                    
                                    {msg.attachedSnippet && <AttachedCodeSnippet content={msg.attachedSnippet} />}

                                    {/* PROPOSED CHANGE CARD (MICRO-PR) */}
                                    {msg.proposedChange && onApplyChange && onDiscardChange && (
                                       <DiffProposalCard 
                                          change={msg.proposedChange} 
                                          onApply={() => onApplyChange(msg.id)}
                                          onDiscard={() => onDiscardChange(msg.id)}
                                       />
                                    )}

                                    {msg.isThinking && !msg.text && !msg.thoughtContent && <Loader2 className="animate-spin text-slate-400" size={14} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))
         )}
         <div ref={messagesEndRef} />
       </div>

       <div className="p-3 bg-[#162032] border-t border-white/5 relative">
          {attachedSnippet && (
            <div className="mx-1 mb-2 p-2 bg-indigo-900/20 border border-indigo-500/30 rounded-lg flex items-start justify-between animate-in slide-in-from-bottom-2">
               <div className="flex gap-2 overflow-hidden">
                  <div className="mt-0.5 text-indigo-400"><Code2 size={16} /></div>
                  <div className="flex flex-col min-w-0">
                     <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1"><Paperclip size={10} /> Snippet Allegato</span>
                     <code className="text-[10px] text-slate-400 font-mono line-clamp-2 break-all opacity-80">{attachedSnippet}</code>
                  </div>
               </div>
               <button onClick={() => setAttachedSnippet(null)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"><X size={14}/></button>
            </div>
          )}

          <div className="flex items-center justify-between mb-2 px-1">
             <div className="flex gap-2 relative">
                <button onClick={onContextClick} className={`p-1 rounded hover:bg-slate-700 ${isContextSet ? 'text-indigo-400' : 'text-slate-500'}`} title="Context"><TriangleAlert size={16} /></button>
                <button onClick={onMemoriesClick} className={`p-1 rounded hover:bg-slate-700 ${hasMemories ? 'text-pink-400' : 'text-slate-500'}`} title="Memories"><Folder size={16} /></button>
                <button onClick={onMakerToggle} className={`p-1 rounded hover:bg-slate-700 transition-all ${settings.enableMaker ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-slate-500'}`} title="Toggle Maker"><Cpu size={16} /></button>
                
                {/* REASONING EFFORT BUTTON + POPUP */}
                <div className="relative" ref={reasoningPopupRef}>
                  <button 
                    onClick={() => setShowReasoningPopup(!showReasoningPopup)} 
                    className={`p-1 px-2 rounded hover:bg-slate-700 transition-all flex items-center gap-1 ${reasoningInfo.bg} ${reasoningInfo.color}`} 
                    title={reasoningInfo.title}
                  >
                    <reasoningInfo.icon size={14} />
                    <span className="text-[10px] font-bold uppercase">
                      {settings.reasoningEffort === 'low' ? 'FAST' : settings.reasoningEffort === 'high' ? 'DEEP' : 'BAL'}
                    </span>
                  </button>

                  {/* POPUP VERSO L'ALTO */}
                  {showReasoningPopup && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-2 z-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain size={16} className="text-blue-400" />
                        <span className="text-sm font-bold text-white">Reasoning Effort</span>
                      </div>
                      
                      {/* SLIDER */}
                      <div className="space-y-3">
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="1"
                          value={effortToSlider(settings.reasoningEffort || 'medium')}
                          onChange={(e) => {
                            const effort = sliderToEffort(parseInt(e.target.value));
                            onReasoningEffortChange(effort);
                          }}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        
                        {/* LABELS */}
                        <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                          <span className={settings.reasoningEffort === 'low' ? 'text-yellow-400 font-bold' : ''}>⚡ Fast</span>
                          <span className={settings.reasoningEffort === 'medium' ? 'text-blue-400 font-bold' : ''}>🧠 Balanced</span>
                          <span className={settings.reasoningEffort === 'high' ? 'text-purple-400 font-bold' : ''}>🔬 Deep</span>
                        </div>

                        {/* DESCRIPTION */}
                        <div className={`p-2 rounded-lg text-[10px] ${reasoningInfo.bg} ${reasoningInfo.color}`}>
                          <div className="font-bold">{reasoningInfo.title}</div>
                          <div className="opacity-80">{reasoningInfo.desc}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
          
          <div className="relative">
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())} 
              placeholder={attachedSnippet ? "Scrivi una richiesta per il codice allegato..." : (settings.enableMaker ? "Chiedi all'Architetto..." : "Scrivi a MasterPromptEngine...")}
              className={`w-full bg-slate-800 text-white border rounded-xl pl-3 pr-10 py-3 focus:outline-none resize-none text-sm min-h-[44px] max-h-[120px] transition-colors ${settings.enableMaker ? 'border-purple-500/50 focus:border-purple-500' : 'border-slate-700 focus:border-indigo-500'}`} 
              rows={1} 
            />
            <button onClick={onSend} disabled={(!input.trim() && !attachedSnippet) || isLoading} className={`absolute right-2 bottom-2 p-1.5 text-white rounded-lg disabled:opacity-50 transition-all ${settings.enableMaker ? 'bg-purple-600 hover:bg-purple-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
       </div>
    </section>
  );
};

export default ChatPanel;
