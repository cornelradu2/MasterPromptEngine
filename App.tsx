
import React from 'react';
import { Loader2, PanelRightClose, PanelRightOpen, Menu } from 'lucide-react';
import { useMasterPromptController } from './hooks/useMasterPromptController';
import { ViewMode } from './types';
import Sidebar from './components/layout/Sidebar';
import WorkspacePanel from './components/layout/WorkspacePanel';
import ChatPanel from './components/layout/ChatPanel';
import ProjectContextModal from './components/ProjectContextModal';
import MemoriesModal from './components/MemoriesModal';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const { state, actions } = useMasterPromptController();
  
  if (!state.isAppLoaded) {
      return (
        <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center flex-col gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
        </div>
      );
  }

  // --- DERIVED PROPS FOR CLEANER RENDER ---
  const currentSession = state.currentSession;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a] text-slate-100">
      
      {/* --- MODALS --- */}
      <ProjectContextModal 
          isOpen={state.modals.context} 
          onClose={() => actions.setModals(p => ({...p, context: false}))} 
          onSave={actions.updateContext} 
          initialContext={currentSession?.projectContext} 
      />
      <MemoriesModal 
          isOpen={state.modals.memories} 
          onClose={() => actions.setModals(p => ({...p, memories: false}))} 
          onSave={actions.updateMemories} 
          initialMemories={currentSession?.memories} 
          title="Memorie Sacre" 
      />
      <MemoriesModal 
          isOpen={state.modals.divine} 
          onClose={() => actions.setModals(p => ({...p, divine: false}))} 
          onSave={actions.setDivineMemories} 
          initialMemories={state.divineMemories} 
          title="Memorie Divine" 
          isDivine={true} 
      />
      <SettingsModal 
          isOpen={state.modals.settings} 
          onClose={() => actions.setModals(p => ({...p, settings: false}))} 
          onSave={actions.setSettings} 
          initialSettings={state.settings}
          onDeleteAllChats={actions.deleteAllSessions}
          onShowArchived={actions.showArchivedSessions}
          totalChatCount={state.sessions.length}
      />

      {/* --- MOBILE HEADER --- */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 p-4 bg-[#0f172a]/95 border-b border-white/5 flex items-center justify-between backdrop-blur">
          <button onClick={() => actions.setIsSidebarOpen(true)} className="p-2 text-slate-300"><Menu size={24} /></button>
          <span className="font-bold truncate max-w-[200px]">{currentSession?.title || 'Chat'}</span>
          <button onClick={() => actions.setIsChatPanelOpen(!state.isChatPanelOpen)} className="p-2 text-slate-300">
             {state.isChatPanelOpen ? <PanelRightClose size={24} /> : <PanelRightOpen size={24} />}
          </button>
      </header>
      
      {/* --- LAYOUT --- */}

      {/* 1. LEFT SIDEBAR */}
      <Sidebar 
          isOpen={state.isSidebarOpen}
          setIsOpen={actions.setIsSidebarOpen}
          sessions={state.sessions}
          currentSessionId={state.currentSessionId}
          onSessionSelect={(id) => { actions.setCurrentSessionId(id); actions.setViewMode(state.sessions.find(s=>s.id===id)?.makerProcess ? ViewMode.MAKER_PROCESS : ViewMode.CHAT); actions.setAttachedSnippet(null); }}
          onSessionDelete={actions.deleteSession}
          onNewSession={actions.createNewSession}
          onSettingsOpen={() => actions.setModals(p => ({...p, settings: true}))}
          onDivineOpen={() => actions.setModals(p => ({...p, divine: true}))}
          files={state.files}
          onFilesAdded={actions.handleFilesAdded}
          setFiles={actions.setFiles}
          currentTokenUsage={state.currentTokenUsage}
      />

      <main className="flex-1 flex flex-row min-w-0 pt-16 md:pt-0 bg-[#0f172a] relative overflow-hidden">
        
        {/* 2. CENTER WORKSPACE (Editor / Dashboard) */}
        <WorkspacePanel 
            viewMode={state.viewMode}
            setViewMode={actions.setViewMode}
            activeMakerProcess={state.activeMakerProcess}
            notepadContent={state.notepadContent}
            onNotepadChange={actions.handleNotepadChange}
            onNotepadAction={actions.handleNotepadAction}
            isProcessing={state.isNotepadProcessing}
            snippets={state.snippets}
            onDeleteSnippet={actions.deleteSnippet}
            isChatOpen={state.isChatPanelOpen}
        />

        {/* 3. RIGHT CHAT PANEL */}
        <ChatPanel 
            isOpen={state.isChatPanelOpen}
            setIsOpen={actions.setIsChatPanelOpen}
            messages={state.messages}
            settings={state.settings}
            input={state.input}
            setInput={actions.setInput}
            onSend={actions.handleSendMessage}
            isLoading={state.isLoading}
            attachedSnippet={state.attachedSnippet}
            setAttachedSnippet={actions.setAttachedSnippet}
            onResetView={() => actions.setViewMode(ViewMode.CHAT)}
            onContextClick={() => actions.setModals(p => ({...p, context: true}))}
            onMemoriesClick={() => actions.setModals(p => ({...p, memories: true}))}
            onMakerToggle={actions.toggleMakerMode}
            onReasoningEffortChange={actions.setReasoningEffort}
            onApplyChange={actions.applyProposal}
            onDiscardChange={actions.discardProposal}
            isContextSet={currentSession?.projectContext?.isSet}
            hasMemories={(currentSession?.memories?.length || 0) > 0}
        />

      </main>
    </div>
  );
};

export default App;
