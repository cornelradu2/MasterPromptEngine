
import React from 'react';
import { ViewMode, MakerProcess, SavedSnippet } from '../../types';
import InteractiveNotepad from '../InteractiveNotepad';
import MakerDashboard from '../MakerDashboard';
import { MessageSquare } from 'lucide-react';

interface WorkspacePanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeMakerProcess: MakerProcess | null;
  notepadContent: string;
  onNotepadChange: (content: string) => void;
  onNotepadAction: (action: any, text: string, range?: any) => void;
  isProcessing: boolean;
  snippets: SavedSnippet[];
  onDeleteSnippet: (id: string) => void;
  isChatOpen: boolean;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  viewMode, setViewMode, activeMakerProcess, notepadContent, onNotepadChange, 
  onNotepadAction, isProcessing, snippets, onDeleteSnippet, isChatOpen
}) => {
  return (
    <section className={`flex-1 flex flex-col relative border-r border-white/5 transition-all duration-300 ${isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {viewMode === ViewMode.MAKER_PROCESS && activeMakerProcess ? (
             <div className="h-full flex flex-col overflow-hidden relative">
                <MakerDashboard process={activeMakerProcess} />
                {activeMakerProcess.status === 'completed' && (
                   <div className="absolute bottom-6 right-6 z-20">
                      <button onClick={() => setViewMode(ViewMode.CHAT)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-xl font-bold transition-all hover:scale-105">
                         <MessageSquare size={18} /> Torna alla Chat
                      </button>
                   </div>
                )}
             </div>
        ) : (
            <InteractiveNotepad 
                content={notepadContent} 
                onChange={onNotepadChange} 
                onAction={onNotepadAction}
                isProcessing={isProcessing}
                snippets={snippets}
                onDeleteSnippet={onDeleteSnippet}
            />
        )}
    </section>
  );
};

export default WorkspacePanel;
