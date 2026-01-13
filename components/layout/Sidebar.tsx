
import React from 'react';
import { Cpu, Settings as SettingsIcon, X, PlusCircle, MessageSquare, Trash2, Crown } from 'lucide-react';
import { UploadedFile, ChatSession, AISettings, Message } from '../../types';
import FileUploader from '../FileUploader';
import TokenUsageDisplay from '../TokenUsageDisplay';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onSessionDelete: (id: string, e: React.MouseEvent) => void;
  onNewSession: () => void;
  onSettingsOpen: () => void;
  onDivineOpen: () => void;
  files: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  currentTokenUsage: { inputTokens: number, outputTokens: number };
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen, setIsOpen, sessions, currentSessionId, onSessionSelect, onSessionDelete, onNewSession,
  onSettingsOpen, onDivineOpen, files, onFilesAdded, setFiles, currentTokenUsage
}) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed md:relative z-50 h-full w-72 bg-[#1e293b]/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex-shrink-0`}>
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500 rounded shadow-lg shadow-indigo-500/20"><Cpu className="text-white" size={20} /></div>
          <span className="font-bold tracking-tight">MasterPromptEngine</span>
          <button onClick={onSettingsOpen} className="ml-auto p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><SettingsIcon size={18} /></button>
          <button onClick={() => setIsOpen(false)} className="md:hidden"><X size={20}/></button>
        </div>
        <div className="p-4 pb-0"><button onClick={onNewSession} className="w-full flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all font-semibold text-sm"><PlusCircle size={18} /> Nuova Chat</button></div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cronologia</h3>
            {sessions.map(session => (
                <div key={session.id} onClick={() => { onSessionSelect(session.id); if(window.innerWidth < 768) setIsOpen(false); }} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-slate-700/50 border border-indigo-500/30 text-white' : 'text-slate-400 hover:bg-slate-800 border border-transparent'}`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {session.makerProcess ? <Cpu size={16} className="text-purple-400" /> : <MessageSquare size={16} className={currentSessionId === session.id ? "text-indigo-400" : "text-slate-600"} />}
                        <span className="truncate text-xs font-medium">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => onSessionDelete(session.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"><Trash2 size={12} /></button>
                    </div>
                </div>
            ))}
        </div>
        <div className="p-4 border-t border-white/5 bg-[#162032]">
            <TokenUsageDisplay currentTokenUsage={currentTokenUsage} />
            <FileUploader files={files} setFiles={setFiles} onFilesAdded={onFilesAdded} isCompact={true} />
            <button 
               onClick={onDivineOpen} 
               className="mt-4 w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold text-amber-400 hover:text-white hover:bg-amber-500/20 transition-all border border-amber-500/20 mb-2 group"
               title="Regole che valgono per tutte le chat"
            >
               <Crown size={14} className="group-hover:rotate-12 transition-transform" /> 
               MEMORIE DIVINE (GLOBAL)
            </button>
            <div className="text-[10px] text-center text-slate-500 mt-2 font-mono">Provider: Ollama (Local)</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
