
import React, { useState, useRef, useEffect } from 'react';
import { Save, Copy, Eraser, PenTool, Check, Sparkles, ArrowRightCircle, BookmarkPlus, X, Loader2, Code2, Terminal, Book, Trash2, ChevronRight } from 'lucide-react';
import { SavedSnippet } from '../types';

interface InteractiveNotepadProps {
  content: string;
  onChange: (newContent: string) => void;
  onAction?: (action: 'improve' | 'paste_to_chat' | 'save_reusable', text: string, range?: { start: number; end: number }) => void;
  isProcessing?: boolean;
  snippets?: SavedSnippet[];
  onDeleteSnippet?: (id: string) => void;
}

interface SelectionMenu {
  x: number;
  y: number;
  text: string;
  start: number;
  end: number;
  show: boolean;
}

const InteractiveNotepad: React.FC<InteractiveNotepadProps> = ({ 
  content, 
  onChange, 
  onAction, 
  isProcessing = false,
  snippets = [],
  onDeleteSnippet
}) => {
  const [copied, setCopied] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu>({ x: 0, y: 0, text: '', start: 0, end: 0, show: false });
  const [currentLine, setCurrentLine] = useState(1);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync Scroll tra textarea e numeri di riga
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Gestione avanzata input (Tab key e Current Line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Inserisce 2 spazi invece del tab reale per consistenza
      const spaces = "  "; 
      const newValue = content.substring(0, start) + spaces + content.substring(end);
      
      onChange(newValue);
      
      // Riposiziona il cursore
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     updateCurrentLine(e.currentTarget);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
     updateCurrentLine(e.currentTarget);
     setIsLibraryOpen(false); // Chiudi libreria se clicco nell'editor
  };

  const updateCurrentLine = (textarea: HTMLTextAreaElement) => {
     const textUpToCursor = textarea.value.substr(0, textarea.selectionStart);
     const line = textUpToCursor.split('\n').length;
     setCurrentLine(line);
  };

  const insertSnippet = (snippetContent: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue = content.substring(0, start) + snippetContent + content.substring(end);
    onChange(newValue);
    setIsLibraryOpen(false);
    
    // Restore focus and cursor
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + snippetContent.length;
    }, 0);
  };

  // Context Menu Logic
  const handleContainerMouseUp = (e: React.MouseEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
    if (libraryRef.current && libraryRef.current.contains(e.target as Node)) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selectedText = textarea.value.substring(start, end);
      const menuHeight = 50; 
      const menuWidth = 280;
      
      let x = e.clientX - (menuWidth / 2);
      let y = e.clientY - menuHeight - 10;

      if (x < 10) x = 10;
      if (y < 10) y = e.clientY + 20;

      setSelectionMenu({ x, y, text: selectedText, start, end, show: true });
    } else {
      setSelectionMenu(prev => ({ ...prev, show: false }));
    }
  };

  const executeAction = (action: 'improve' | 'paste_to_chat' | 'save_reusable') => {
    if (onAction && selectionMenu.text) {
      onAction(action, selectionMenu.text, { start: selectionMenu.start, end: selectionMenu.end });
      setSelectionMenu(prev => ({ ...prev, show: false }));
    }
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => setSelectionMenu(prev => ({ ...prev, show: false }));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcolo linee
  const lines = content.split('\n');

  return (
    <div 
      className="flex flex-col h-full bg-[#0b1120] relative group border-r border-white/5"
      onMouseUp={handleContainerMouseUp}
    >
      {/* VS Code Style Header */}
      <div className="flex items-center justify-between h-10 px-3 bg-[#162032] border-b border-white/5 select-none relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
             <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
             <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
             <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded text-xs font-medium border border-indigo-500/20">
            <Code2 size={14} />
            <span>editor.tsx</span> {/* Finto nome file per estetica */}
          </div>
          {isProcessing && <span className="flex items-center gap-1 text-[10px] text-yellow-400 animate-pulse font-mono"><Loader2 size={10} className="animate-spin" /> WRITING...</span>}
        </div>
        
        <div className="flex items-center gap-1">
          <div className="relative" ref={libraryRef}>
            <button 
                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                className={`p-1.5 transition-colors rounded relative ${isLibraryOpen ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700'}`}
                title="Libreria Snippet"
            >
                <Book size={14} />
                {snippets.length > 0 && (
                   <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-indigo-500 animate-pulse" />
                )}
            </button>
            
            {/* Snippet Library Dropdown */}
            {isLibraryOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 z-50">
                    <div className="p-2 border-b border-slate-700 bg-slate-900/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Prompts</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                        {snippets.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500 italic">
                                Nessuno snippet salvato. Seleziona del testo e clicca "Salva".
                            </div>
                        ) : (
                            snippets.map(snippet => (
                                <div key={snippet.id} className="group flex items-center justify-between p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                    <div 
                                        className="flex-1 min-w-0 flex flex-col gap-0.5"
                                        onClick={() => insertSnippet(snippet.content)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Terminal size={12} className="text-indigo-400 flex-shrink-0" />
                                            <span className="text-xs font-bold text-slate-200 truncate">{snippet.title}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 truncate font-mono opacity-70">
                                            {snippet.content.substring(0, 30).replace(/\n/g, ' ')}...
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteSnippet && onDeleteSnippet(snippet.id); }}
                                        className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-slate-700/50"
                                        title="Elimina"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>

          <button 
            onClick={() => onChange('')}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-slate-700"
            title="Clear Buffer"
          >
            <Eraser size={14} />
          </button>
          <button 
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors rounded hover:bg-slate-700"
            title="Copy Buffer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative flex overflow-hidden bg-[#0f172a]">
        
        {/* Line Numbers Gutter */}
        <div 
            ref={lineNumbersRef}
            className="w-12 pt-4 pb-4 bg-[#0b1120] border-r border-slate-800 text-slate-600 font-mono text-sm leading-6 text-right pr-3 select-none overflow-hidden flex-shrink-0"
            aria-hidden="true"
        >
            {lines.map((_, i) => (
                <div key={i} className={`h-6 ${currentLine === i + 1 ? 'text-indigo-400 font-bold' : ''}`}>
                    {i + 1}
                </div>
            ))}
        </div>

        {/* Code Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => { onChange(e.target.value); updateCurrentLine(e.target); }}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          placeholder="// Type your code here..."
          className="flex-1 h-full bg-transparent text-slate-200 pt-4 pl-4 pb-4 resize-none focus:outline-none font-mono text-sm leading-6 custom-scrollbar selection:bg-indigo-500/30 whitespace-pre"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          disabled={isProcessing}
        />

        {/* Floating Menu */}
        {selectionMenu.show && !isProcessing && (
          <div 
            ref={menuRef}
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
            className="fixed z-50 flex items-center gap-1 p-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl animate-in zoom-in-95 duration-100"
            onMouseDown={(e) => e.stopPropagation()}
          >
             <button onClick={() => executeAction('improve')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 rounded-md transition-colors">
                <Sparkles size={14} className="text-yellow-300" /> Refactor
             </button>
             <div className="w-px h-4 bg-slate-600 mx-1" />
             <button onClick={() => executeAction('paste_to_chat')} className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                To Chat
             </button>
             <button onClick={() => executeAction('save_reusable')} className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                Save
             </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#1e293b] border-t border-white/5 flex items-center px-3 justify-between text-[10px] font-mono text-slate-500 select-none">
         <div className="flex gap-3">
            <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer"><Terminal size={10} /> MASTER-PROMPT-ENV</span>
            <span>Ln {currentLine}, Col 1</span>
         </div>
         <div className="flex gap-3">
             <span>UTF-8</span>
             <span>{lines.length} Lines</span>
             <span>{content.length} Chars</span>
         </div>
      </div>
    </div>
  );
};

export default InteractiveNotepad;
