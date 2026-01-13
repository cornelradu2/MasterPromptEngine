
import React, { useState, useEffect, useRef } from 'react';
import { Message, Role, UploadedFile, ViewMode, ChatSession, ProjectContext, MakerProcess, AISettings, SavedSnippet, ProposedChange, ReasoningEffort } from '../types';
import { generateChatResponseStream, analyzePromptDeeply, runTextImprovement } from '../services/chatService';
import { runMakerLoop, classifyTaskComplexity } from '../services/makerService';
import { extractNextCommand } from '../services/xmlParserService';
import { 
    saveFilesToDB, loadFilesFromDB, saveSessionsToStorage, loadSessionsFromStorage,
    saveDivineMemoriesToStorage, loadDivineMemoriesFromStorage,
    saveSettingsToStorage, loadSettingsFromStorage,
    saveSnippetsToStorage, loadSnippetsFromStorage
} from '../services/storageService';

const createSessionObject = (): ChatSession => ({
    id: Date.now().toString(),
    title: "Nuova Conversazione",
    messages: [{ id: 'welcome', role: Role.MODEL, text: "Ciao. Sono **MasterPromptEngine** (Standard Mode). Usa l'editor a sinistra per lavorare insieme sul codice. Se hai bisogno dell'Architetto, attiva il pulsante **MAKER** in basso.", timestamp: Date.now() }],
    notepadContent: "",
    // IMPORTANTE: Reset esplicito del contesto di sessione
    memories: [], 
    projectContext: { content: "", isSet: false },
    createdAt: Date.now(),
    updatedAt: Date.now()
});

export const useMasterPromptController = () => {
    // --- STATE ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [divineMemories, setDivineMemories] = useState<string[]>([]);
    const [snippets, setSnippets] = useState<SavedSnippet[]>([]);
    const [settings, setSettings] = useState<AISettings>({ 
        provider: 'ollama', 
        ollamaUrl: 'http://localhost:7860', 
        ollamaModel: 'qwen3-8b-64k-custom', // Custom: YaRN 128K + thinking template, 64k ctx
        temperature: 0.25, 
        enableMaker: false,
        reasoningEffort: 'medium' // Default: balanced thinking
    });
    
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CHAT);
    const [activeMakerProcess, setActiveMakerProcess] = useState<MakerProcess | null>(null);
    const [input, setInput] = useState('');
    const [attachedSnippet, setAttachedSnippet] = useState<string | null>(null);
    const [attachedSnippetRange, setAttachedSnippetRange] = useState<{ start: number, end: number } | null>(null);
    
    // Real-time token tracking from Ollama
    const [currentTokenUsage, setCurrentTokenUsage] = useState<{ inputTokens: number, outputTokens: number }>({ 
        inputTokens: 0, 
        outputTokens: 0 
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isNotepadProcessing, setIsNotepadProcessing] = useState(false);
    const [isAppLoaded, setIsAppLoaded] = useState(false);

    // Modals
    const [modals, setModals] = useState({
        context: false,
        memories: false,
        divine: false,
        settings: false
    });

    // Derived
    const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
    const messages = currentSession?.messages || [];
    const notepadContent = currentSession?.notepadContent || "";

    // --- LIFECYCLE & PERSISTENCE ---
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const loadedSessions = loadSessionsFromStorage();
                const loadedFiles = await loadFilesFromDB();
                const loadedDivine = loadDivineMemoriesFromStorage();
                const loadedSettings = loadSettingsFromStorage();
                const loadedSnippets = loadSnippetsFromStorage();

                setFiles(loadedFiles || []);
                setDivineMemories(loadedDivine || []); // Carica memorie globali
                setSettings(loadedSettings);
                setSnippets(loadedSnippets || []);

                if (loadedSessions.length > 0) {
                    setSessions(loadedSessions);
                    const mostRecent = loadedSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
                    setCurrentSessionId(mostRecent.id);
                } else {
                    createNewSession();
                }
            } catch (error) { console.error("Init Error:", error); } finally { setIsAppLoaded(true); }
        };
        initializeApp();
    }, []);

    useEffect(() => { if (isAppLoaded) saveSessionsToStorage(sessions); }, [sessions, isAppLoaded]);
    useEffect(() => { if (isAppLoaded) saveFilesToDB(files); }, [files, isAppLoaded]);
    useEffect(() => { if (isAppLoaded) saveDivineMemoriesToStorage(divineMemories); }, [divineMemories, isAppLoaded]);
    useEffect(() => { if (isAppLoaded) saveSettingsToStorage(settings); }, [settings, isAppLoaded]);
    useEffect(() => { if (isAppLoaded) saveSnippetsToStorage(snippets); }, [snippets, isAppLoaded]);

    // --- ACTIONS ---

    const createNewSession = () => {
        const newSession = createSessionObject();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setViewMode(ViewMode.CHAT);
        setActiveMakerProcess(null);
        setAttachedSnippet(null);
        setInput('');
        if(window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const deleteSession = (idToDelete: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Eliminare definitivamente questa chat?")) return;
        const remaining = sessions.filter(s => s.id !== idToDelete);
        if (remaining.length === 0) {
            const newSession = createSessionObject();
            setSessions([newSession]);
            setCurrentSessionId(newSession.id);
        } else {
            setSessions(remaining);
            if (currentSessionId === idToDelete) setCurrentSessionId(remaining[0].id);
        }
    };

    const deleteAllSessions = () => {
        const newSession = createSessionObject();
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
        setViewMode(ViewMode.CHAT);
        setActiveMakerProcess(null);
        setAttachedSnippet(null);
        setInput('');
    };

    const showArchivedSessions = () => {
        // Placeholder: in futuro implementare visualizzazione archiviate
        alert("Funzionalità 'Chat Archiviate' sarà implementata in futuro.\nAttualmente tutte le chat sono già visibili nella sidebar.");
    };

    const updateCurrentSessionMessages = (newMessages: Message[]) => {
        if (!currentSessionId) return;
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                let title = s.title;
                if (s.messages.length <= 1 && newMessages.length > 1) {
                    const userFirstMsg = newMessages.find(m => m.role === Role.USER);
                    if (userFirstMsg) title = userFirstMsg.text.substring(0, 30) + (userFirstMsg.text.length > 30 ? '...' : '');
                }
                return { ...s, messages: newMessages, title, updatedAt: Date.now() };
            }
            return s;
        }));
    };

    const handleNotepadChange = (newContent: string) => {
        if (!currentSessionId) return;
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, notepadContent: newContent } : s));
    };

    const toggleMakerMode = () => {
        const newState = !settings.enableMaker;
        setSettings(prev => ({ ...prev, enableMaker: newState }));
        if (!currentSessionId) return;
        const sysMsg: Message = { 
            id: Date.now().toString(), 
            role: Role.MODEL, 
            text: newState 
                ? "⚠️ **SYSTEM ACTIVATE:** Identity Switched to **MasterPromptEngine MAKER**. I am now the Architect." 
                : "ℹ️ **SYSTEM:** Identity Switched to **MasterPromptEngine Standard**. Let's code.", 
            timestamp: Date.now() 
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, sysMsg] } : s));
    };

    const setReasoningEffort = (effort: ReasoningEffort) => {
        setSettings(prev => ({ ...prev, reasoningEffort: effort }));
        if (!currentSessionId) return;
        const effortLabels = {
            low: '⚡ **FAST MODE** - Risposte veloci senza thinking',
            medium: '🧠 **BALANCED MODE** - Thinking bilanciato',
            high: '🔬 **DEEP MODE** - Ragionamento esteso e approfondito'
        };
        const sysMsg: Message = { 
            id: Date.now().toString(), 
            role: Role.MODEL, 
            text: `ℹ️ **Reasoning Effort:** ${effortLabels[effort]}`, 
            timestamp: Date.now() 
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, sysMsg] } : s));
    };

    const handleFilesAdded = async (newFiles: UploadedFile[]) => {
        setFiles(prev => [...prev, ...newFiles]); // UI update handled by FileUploader, here just context update
        if (!currentSessionId) return;
        const fileNames = newFiles.map(f => f.name).join(", ");
        const userMsg: Message = { id: Date.now().toString(), role: Role.USER, text: `**[SYSTEM]** Upload completato: ${fileNames}`, timestamp: Date.now() };
        updateCurrentSessionMessages([...messages, userMsg]);
    };

    const handleNotepadAction = async (action: 'improve' | 'paste_to_chat' | 'save_reusable', text: string, range?: { start: number, end: number }) => {
        switch(action) {
            case 'paste_to_chat':
                setAttachedSnippet(text);
                setAttachedSnippetRange(range || null);
                if (window.innerWidth < 768) setIsChatPanelOpen(true);
                break;
            case 'improve':
                if (!currentSessionId || !range) return;
                setIsNotepadProcessing(true);
                try {
                    const improvedText = await runTextImprovement(text, 'rewrite', settings);
                    const newContent = notepadContent.substring(0, range.start) + improvedText + notepadContent.substring(range.end);
                    handleNotepadChange(newContent);
                } catch (error) { console.error("Improvement Failed", error); } finally { setIsNotepadProcessing(false); }
                break;
            case 'save_reusable':
                if (!text) return;
                const name = prompt("Nome dello Snippet:", text.substring(0, 30));
                if (name) setSnippets(prev => [{ id: Date.now().toString(), title: name, content: text, language: 'text', timestamp: Date.now() }, ...prev]);
                break;
        }
    };

    // --- PROPOSAL MANAGEMENT (MICRO-PR) ---
    
    const applyProposal = (messageId: string) => {
        const session = sessions.find(s => s.id === currentSessionId);
        if (!session) return;
        
        const message = session.messages.find(m => m.id === messageId);
        const change = message?.proposedChange;
        
        if (!change || change.status !== 'pending') return;

        let newNotepadContent = session.notepadContent || "";

        // If this is a snippet modification WITH a range, apply to the original notepad position
        if (change.isSnippetModification && change.snippetRange) {
            const { start, end } = change.snippetRange;
            
            // Apply the modification to the snippet, then replace it in the notepad
            const snippetText = newNotepadContent.substring(start, end);
            const snippetLines = snippetText.split('\n');
            let modifiedSnippet = snippetText;

            if (change.type === 'edit_lines' && change.lineStart && change.lineEnd) {
                const startIdx = Math.max(0, change.lineStart - 1);
                const endIdx = Math.min(snippetLines.length, change.lineEnd);
                const cleanedContent = change.newContent.replace(/^\n/, '').replace(/\n$/, '').trim();
                
                // If content is empty → DELETE lines, otherwise REPLACE
                if (cleanedContent === '') {
                    snippetLines.splice(startIdx, Math.max(0, endIdx - startIdx));
                } else {
                    const newLines = cleanedContent.split('\n');
                    snippetLines.splice(startIdx, Math.max(0, endIdx - startIdx), ...newLines);
                }
                modifiedSnippet = snippetLines.join('\n');
            } else if (change.type === 'append') {
                modifiedSnippet = snippetText + "\n" + change.newContent;
            } else if (change.type === 'replace') {
                modifiedSnippet = change.newContent;
            }

            // Replace the snippet in the notepad at its original position
            newNotepadContent = newNotepadContent.substring(0, start) + modifiedSnippet + newNotepadContent.substring(end);
            
        } else {
            // Standard notepad modification (no snippet)
            const lines = newNotepadContent.split('\n');

            if (change.type === 'edit_lines' && change.lineStart && change.lineEnd) {
                const startIdx = Math.max(0, change.lineStart - 1);
                const endIdx = Math.min(lines.length, change.lineEnd);
                
                // Safety Check
                if (startIdx <= lines.length) {
                    const cleanedContent = change.newContent.replace(/^\n/, '').replace(/\n$/, '').trim();
                    
                    // If content is empty → DELETE lines, otherwise REPLACE
                    if (cleanedContent === '') {
                        lines.splice(startIdx, Math.max(0, endIdx - startIdx));
                    } else {
                        const newLines = cleanedContent.split('\n');
                        lines.splice(startIdx, Math.max(0, endIdx - startIdx), ...newLines);
                    }
                    newNotepadContent = lines.join('\n');
                }
            } else if (change.type === 'append') {
                newNotepadContent = (newNotepadContent ? newNotepadContent + "\n" : "") + change.newContent;
            } else if (change.type === 'replace') {
                newNotepadContent = change.newContent;
            }
        }

        // Apply update
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    notepadContent: newNotepadContent,
                    messages: s.messages.map(m => m.id === messageId ? { ...m, proposedChange: { ...change, status: 'applied' } } : m)
                };
            }
            return s;
        }));
    };

    const discardProposal = (messageId: string) => {
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => {
                        if (m.id === messageId && m.proposedChange) {
                            return { ...m, proposedChange: { ...m.proposedChange, status: 'discarded' } };
                        }
                        return m;
                    })
                };
            }
            return s;
        }));
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && !attachedSnippet) || isLoading || !currentSessionId) return;
        
        // Build message text for AI (includes snippet for context)
        let userText = input;
        let aiContextText = input;
        if (attachedSnippet) aiContextText += `\n\n\`\`\`\n${attachedSnippet}\n\`\`\``;

        // Store the range before clearing for use in proposal processing
        const currentSnippetRange = attachedSnippetRange;
        const currentAttachedSnippet = attachedSnippet;
        
        setInput('');
        setAttachedSnippet(null);
        setAttachedSnippetRange(null);
        setIsLoading(true);

        // Message for UI (snippet stored separately, not in text)
        const userMsg: Message = { 
            id: Date.now().toString(), 
            role: Role.USER, 
            text: userText, 
            timestamp: Date.now(),
            attachedSnippet: currentAttachedSnippet || undefined
        };
        const updatedMessages = [...messages, userMsg];
        updateCurrentSessionMessages(updatedMessages);

        try {
            const routingId = 'routing-' + Date.now();
            updateCurrentSessionMessages([...updatedMessages, { id: routingId, role: Role.MODEL, text: "", thoughtContent: settings.enableMaker ? "Evaluating Complexity..." : "Processing...", timestamp: Date.now(), isThinking: true }]);

            let complexity = 'SIMPLE';
            if (settings.enableMaker) complexity = await classifyTaskComplexity(aiContextText, settings);
            
            if (complexity === 'COMPLEX') {
                updateCurrentSessionMessages(updatedMessages); // Remove routing msg
                setViewMode(ViewMode.MAKER_PROCESS);
                const processGenerator = runMakerLoop(aiContextText, settings, currentSession?.projectContext, currentSession?.memories, divineMemories);
                for await (const processUpdate of processGenerator) {
                    setActiveMakerProcess(processUpdate);
                    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, makerProcess: processUpdate } : s));
                }
            } else {
                const botMsgId = (Date.now() + 1).toString();
                updateCurrentSessionMessages([...updatedMessages, { id: botMsgId, role: Role.MODEL, text: '', thoughtContent: '', timestamp: Date.now(), isThinking: true, isStreaming: true }]);
                
                // Use the attached snippet directly (already stored)
                const extractedSnippet = currentAttachedSnippet;
                
                // Build messages for AI with full context (use aiContextText for last message)
                const messagesForAI = [...updatedMessages];
                messagesForAI[messagesForAI.length - 1] = { ...userMsg, text: aiContextText };
                
                const stream = generateChatResponseStream(
                    messagesForAI, 
                    files, 
                    currentSession?.projectContext || { content: '', isSet: false },
                    currentSession?.memories || [],
                    divineMemories,
                    settings.enableMaker,
                    settings,
                    notepadContent,
                    extractedSnippet // Pass the attached snippet
                );
                
                let fullText = '';
                let fullThought = '';
                let processedTextIndex = 0;
                let pendingProposal: ProposedChange | null = null;

                for await (const chunk of stream) {
                    if (chunk.type === 'thought') {
                        fullThought += chunk.content;
                        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, thoughtContent: fullThought } : m) } : s));
                    } else if (chunk.type === 'token_count' && chunk.tokenData) {
                        // Capture EXACT token counts from Ollama
                        setCurrentTokenUsage({
                            inputTokens: chunk.tokenData.prompt_eval_count || 0,
                            outputTokens: chunk.tokenData.eval_count || 0
                        });
                    } else {
                        fullText += chunk.content;
                        
                        // Auto-Memory Logic (Solo per SESSION memories)
                        const memoryRegex = /\[\[MEMORY:\s*(.*?)\]\]/g;
                        let memMatch;
                        while ((memMatch = memoryRegex.exec(fullText)) !== null) {
                            const newMem = memMatch[1].trim();
                            setSessions(prev => prev.map(s => {
                                if (s.id === currentSessionId && !s.memories?.includes(newMem)) return { ...s, memories: [...(s.memories || []), newMem] };
                                return s;
                            }));
                        }
                        
                        // --- XML PARSING VIA SERVICE (ROBUST) ---
                        const { command, newIndex } = extractNextCommand(fullText, processedTextIndex);
                        
                        if (command) {
                            pendingProposal = command;
                            processedTextIndex = newIndex;

                            // Mark as snippet modification if there was an attached snippet
                            if (extractedSnippet && currentSnippetRange) {
                                pendingProposal.isSnippetModification = true;
                                pendingProposal.snippetRange = currentSnippetRange;
                                
                                // For snippet modifications, line numbers refer to the SNIPPET, not notepad
                                // We need to store the snippet content to apply modifications correctly
                                if (pendingProposal.type === 'edit_lines') {
                                    const snippetLines = extractedSnippet.split('\n');
                                    const startIdx = Math.max(0, (pendingProposal.lineStart || 1) - 1);
                                    const endIdx = Math.min(snippetLines.length, pendingProposal.lineEnd || snippetLines.length);
                                    pendingProposal.originalContent = snippetLines.slice(startIdx, endIdx).join('\n');
                                } else if (pendingProposal.type === 'replace') {
                                    pendingProposal.originalContent = extractedSnippet.substring(0, 300) + (extractedSnippet.length > 300 ? "..." : "");
                                }
                            } else {
                                // Standard notepad modification
                                if (pendingProposal.type === 'edit_lines' && notepadContent) {
                                    const lines = notepadContent.split('\n');
                                    const startIdx = Math.max(0, (pendingProposal.lineStart || 1) - 1);
                                    const endIdx = Math.min(lines.length, pendingProposal.lineEnd || lines.length);
                                    pendingProposal.originalContent = lines.slice(startIdx, endIdx).join('\n');
                                } else if (pendingProposal.type === 'replace' && notepadContent) {
                                    pendingProposal.originalContent = notepadContent.substring(0, 300) + (notepadContent.length > 300 ? "..." : "");
                                }
                            }
                        }

                        // CLEAN TEXT FOR UI (Remove XML tags visually)
                        const cleanText = fullText
                           .replace(/\[\[MEMORY:\s*(.*?)\]\]/g, '\n> 🧠 **Memoria Acquisita (Session):** $1\n')
                           .replace(/<SCRATCHPAD_APPEND>[\s\S]*?<\/SCRATCHPAD_APPEND>/gi, '') // Hide Raw XML
                           .replace(/<EDIT_LINES[\s\S]*?<\/EDIT_LINES>/gi, '') // Hide Raw XML
                           .replace(/<SCRATCHPAD_UPDATE>[\s\S]*?<\/SCRATCHPAD_UPDATE>/gi, ''); // Hide Raw XML
                           
                        setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
                            ...s, 
                            messages: s.messages.map(m => m.id === botMsgId ? { 
                                ...m, 
                                text: cleanText, 
                                isThinking: false,
                                proposedChange: pendingProposal || m.proposedChange // Attach proposal if found
                            } : m) 
                        } : s));
                    }
                }
                setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, isStreaming: false, isThinking: false } : m) } : s));
            }
        } catch (e) {
            console.error(e);
            updateCurrentSessionMessages([...updatedMessages, { id: Date.now().toString(), role: Role.MODEL, text: `Errore: ${e}.`, timestamp: Date.now() }]);
        } finally { setIsLoading(false); }
    };

    // --- API EXPORT ---
    return {
        state: {
            sessions, currentSessionId, currentSession, messages, files, settings,
            viewMode, activeMakerProcess, input, attachedSnippet, notepadContent,
            isSidebarOpen, isChatPanelOpen, isLoading, isNotepadProcessing, isAppLoaded,
            currentTokenUsage,
            modals, divineMemories, snippets
        },
        actions: {
            createNewSession, deleteSession, deleteAllSessions, showArchivedSessions, 
            setCurrentSessionId, setViewMode,
            setInput, setAttachedSnippet, setIsSidebarOpen, setIsChatPanelOpen,
            setModals, setSettings, setDivineMemories, setSnippets,
            handleSendMessage, handleFilesAdded, handleNotepadChange, handleNotepadAction,
            toggleMakerMode,
            setReasoningEffort,
            updateContext: (ctx: ProjectContext) => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, projectContext: ctx } : s)),
            updateMemories: (mems: string[]) => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, memories: mems } : s)),
            deleteSnippet: (id: string) => setSnippets(prev => prev.filter(s => s.id !== id)),
            setFiles,
            applyProposal,
            discardProposal
        }
    };
};
