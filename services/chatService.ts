import { AnalysisResult, Message, ProjectContext, AISettings } from "../types";
import { retrieveContext } from "./ragService";
import { generateOllamaStream, generateOllamaResponse } from "./ollamaService";
import { StreamChunk } from "./streamTypes";
import { STANDARD_SYSTEM_INSTRUCTION, MAKER_SYSTEM_INSTRUCTION } from "../config/systemPrompts";

// --- INTENT CLASSIFIER (4-MODE SYSTEM: CHAT, DISCOVERY, ANALYZE, MODIFY) ---
type IntentMode = 'CHAT' | 'DISCOVERY' | 'ANALYZE' | 'MODIFY';

function classifyIntent(msg: string, hasEditorContent: boolean): IntentMode {
  const m = msg.trim().toLowerCase();

  // CHAT: saluti, ringraziamenti, conferme, frasi casuali brevi
  if (/^(ciao|hey|salve|buongiorno|buonasera|ok|va bene|capito|sì|si|no|grazie|perfetto|ottimo|grande|fantastico|eccomi|sono tornato|ci sei)[\?!\.]*$/i.test(m)) {
    return 'CHAT';
  }

  // MODIFY (URGENT): Eliminazioni, rimozioni - PRIMA di ANALYZE perché "togli X?" con ? è MODIFY
  if (/^(togli|rimuovi|elimina|cancella|leva)\s+/i.test(m)) {
    return 'MODIFY';
  }

  // MODIFY (SURGICAL): Modifiche puntuali esplicite
  if (/^(cambia|sostituisci|modifica)\s+.*(con|in)/i.test(m)) {
    return 'MODIFY';
  }
  
  // MODIFY (SURGICAL): Aggiunte puntuali
  if (/^(aggiungi|inserisci|metti)\s+/i.test(m)) {
    return 'MODIFY';
  }

  // MODIFY (FULL REWRITE): Riscritture complete esplicite
  if (/^(riscrivi|rifai|rendilo|fallo)\s+(tutto|sota|meglio|production|completo)/i.test(m)) {
    return 'MODIFY';
  }
  
  // MODIFY: Conferme dopo analisi ("sì fallo", "ok procedi")
  if (/^(sì|si|ok|procedi|fallo|vai|esegui|applicalo|confermo)[\s,\.!]*$/i.test(m) || /^(sì|si|ok),?\s*(fallo|procedi|vai)/i.test(m)) {
    return 'MODIFY';
  }

  // MODIFY: Risposta a domande di discovery (contiene dettagli per generare)
  // Pattern: risposte che contengono info sul target/uso come "per studiare", "studente", "principiante"
  if (!hasEditorContent && /(per\s+(studiare|imparare|lavorare|creare|scrivere)|studente|principiante|esperto|universitario|professionale|chatgpt|claude|api)/i.test(m) && m.length > 15) {
    return 'MODIFY';
  }

  // DISCOVERY: L'utente sta chiedendo di CREARE qualcosa da zero (senza editor content)
  if (!hasEditorContent && /^(mi serve|ho bisogno|vorrei|avrei bisogno|fammi|creami|costruiscimi|genera|crea|scrivi)\s+(un|una|il|la|dei|delle)?\s*(prompt|sistema|assistente|chatbot|bot|agente|tutor|helper)/i.test(m)) {
    return 'DISCOVERY';
  }
  
  // DISCOVERY: Anche richieste vaghe di creazione
  if (!hasEditorContent && /(serve|bisogno|vorrei|voglio)\s+.*\s+(per|che|da)/i.test(m) && m.length > 20) {
    return 'DISCOVERY';
  }

  // ANALYZE: Domande esplicite
  if (m.includes('?') || /^(come |cosa |qual|perché |perche |puoi |potresti |che ne pensi|com'è|dimmi|spiega|analizza|descrivi|valuta|controlla|verifica|leggi|guarda)/i.test(m)) {
    return 'ANALYZE';
  }

  // Default: se editor vuoto → CHAT/DISCOVERY, altrimenti → ANALYZE
  return hasEditorContent ? 'ANALYZE' : 'CHAT';
}

// --- CONTEXT WINDOW MANAGEMENT (SOTA 2026) ---
const MAX_HISTORY_MESSAGES = 30; // Sliding window: keep last N messages
const CONTEXT_BUDGET_RATIO = 0.7; // 70% of context for system+history, 30% buffer

/**
 * SOTA Context Architecture:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SYSTEM PROMPT (always present, never truncated)            │
 * │  ├── Base Instruction (MAKER/STANDARD)                     │
 * │  ├── <DIVINE_MEMORIES> (global rules)                      │
 * │  ├── <SESSION_MEMORIES> (session learnings)                │
 * │  ├── <PROJECT_CONTEXT> (if set)                            │
 * │  ├── <RAG_CONTEXT> (retrieved file chunks)                 │
 * │  ├── <CURRENT_EDITOR_STATE> (notepad content)              │
 * │  └── <CURRENT_INTENT> (classified intent hint)             │
 * ├─────────────────────────────────────────────────────────────┤
 * │ HISTORY (sliding window, last N messages - CLEAN)          │
 * ├─────────────────────────────────────────────────────────────┤
 * │ LAST USER MESSAGE (current turn - CLEAN + snippet)         │
 * └─────────────────────────────────────────────────────────────┘
 */

function buildEnrichedSystemPrompt(
  baseInstruction: string,
  divineMemories: string[],
  memories: string[],
  projectContext: ProjectContext,
  retrievedContext: string | null,
  notepadContent: string,
  attachedSnippet: string | null,
  intentMode: IntentMode
): string {
  
  const sections: string[] = [baseInstruction];

  // 1. DIVINE MEMORIES (Global - highest priority)
  if (divineMemories.length > 0) {
    sections.push(`
<DIVINE_MEMORIES priority="HIGHEST">
These are IMMUTABLE global rules that apply to ALL conversations:
${divineMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}
</DIVINE_MEMORIES>`);
  }

  // 2. SESSION MEMORIES (Per-session learnings)
  if (memories.length > 0) {
    sections.push(`
<SESSION_MEMORIES priority="HIGH">
Learnings from THIS conversation session:
${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}
</SESSION_MEMORIES>`);
  }

  // 3. PROJECT CONTEXT (If set)
  if (projectContext?.isSet && projectContext.content) {
    sections.push(`
<PROJECT_CONTEXT>
${projectContext.content}
</PROJECT_CONTEXT>`);
  }

  // 4. RAG CONTEXT (Retrieved file chunks)
  if (retrievedContext) {
    sections.push(`
<RAG_CONTEXT source="uploaded_files">
${retrievedContext}
</RAG_CONTEXT>`);
  }

  // 5. EDITOR STATE (Current notepad content)
  let editorSection = "";
  if (attachedSnippet) {
    const notepadLines = notepadContent.split('\n');
    const numberedNotepad = notepadLines.map((l, i) => `${i + 1} | ${l}`).join('\n');
    const snippetLines = attachedSnippet.split('\n');
    const numberedSnippet = snippetLines.map((l, i) => `${i + 1} | ${l}`).join('\n');
    
    editorSection = `
<EDITOR_STATE>
<FULL_NOTEPAD lines="${notepadLines.length}">
${numberedNotepad}
</FULL_NOTEPAD>

<FOCUSED_SELECTION lines="${snippetLines.length}" mode="PRIMARY_TARGET">
${numberedSnippet}
</FOCUSED_SELECTION>

⚠️ USER SELECTED ${snippetLines.length} LINES. Modify ONLY the FOCUSED_SELECTION using line numbers 1-${snippetLines.length}.
</EDITOR_STATE>`;
  } else if (notepadContent && notepadContent.trim()) {
    const lines = notepadContent.split('\n');
    const numbered = lines.map((l, i) => `${i + 1} | ${l}`).join('\n');
    editorSection = `
<EDITOR_STATE lines="${lines.length}">
${numbered}
</EDITOR_STATE>

EDITOR: ${lines.length} lines total. Use exact line numbers for <EDIT_LINES>.`;
  } else {
    editorSection = `
<EDITOR_STATE>
(Empty - user has not written any prompt yet)
</EDITOR_STATE>`;
  }
  sections.push(editorSection);

  // 6. CURRENT INTENT (Classified from last message)
  const intentHints: Record<IntentMode, string> = {
    'CHAT': `
<CURRENT_INTENT mode="CONVERSATIONAL">
User is making casual conversation. Respond briefly (1-2 sentences).
DO NOT output XML tags. DO NOT analyze editor content.
</CURRENT_INTENT>`,
    'DISCOVERY': `
<CURRENT_INTENT mode="DISCOVERY">
L'utente vuole CREARE qualcosa di nuovo.

Se NON ha ancora dato dettagli (uso, target, scopo):
→ Fai 2-3 domande brevi per capire meglio
→ Rispondi con TESTO, niente XML

Se HA GIÀ dato dettagli ("per studiare", "studente", "ChatGPT", etc.):
→ HAI ABBASTANZA INFO! Genera il prompt ORA!
→ Usa <SCRATCHPAD_UPDATE>prompt completo</SCRATCHPAD_UPDATE>
→ Output SOLO XML, niente testo
</CURRENT_INTENT>`,
    'ANALYZE': `
<CURRENT_INTENT mode="INFORMATION_REQUEST">
User is ASKING A QUESTION about the editor content.

⚠️⚠️⚠️ CRITICAL RULES ⚠️⚠️⚠️
- DO NOT output <SCRATCHPAD_UPDATE>
- DO NOT output <EDIT_LINES>
- DO NOT output <SCRATCHPAD_APPEND>
- DO NOT output ANY XML TAGS

Respond with TEXT ONLY. Analyze what you see. Ask if they want changes.
</CURRENT_INTENT>`,
    'MODIFY': `
<CURRENT_INTENT mode="MODIFICATION_REQUEST">
L'utente vuole MODIFICARE il contenuto dell'editor.

AZIONE DA ESEGUIRE:
1. Leggi ATTENTAMENTE <EDITOR_STATE> per trovare le righe
2. Identifica ESATTAMENTE quali righe modificare/eliminare
3. Output SOLO il comando XML appropriato

COMANDI:
• Aggiunte: <SCRATCHPAD_APPEND>contenuto</SCRATCHPAD_APPEND>
• Modifiche: <EDIT_LINES start="X" end="Y">nuovo contenuto</EDIT_LINES>
• ELIMINAZIONI: <EDIT_LINES start="X" end="Y"></EDIT_LINES>  ← TAG VUOTO!
• Riscrittura totale: <SCRATCHPAD_UPDATE>tutto il contenuto nuovo</SCRATCHPAD_UPDATE>

⚠️ PER ELIMINARE RIGHE: usa EDIT_LINES con contenuto COMPLETAMENTE VUOTO tra i tag!
Esempio: <EDIT_LINES start="10" end="15"></EDIT_LINES>

OUTPUT: SOLO XML, nessun testo prima o dopo.
</CURRENT_INTENT>`
  };
  sections.push(intentHints[intentMode]);

  return sections.join('\n\n');
}

/**
 * Apply sliding window to history to prevent context overflow.
 * Keeps: first message (welcome) + last N messages
 */
function truncateHistory(history: Message[], maxMessages: number): Message[] {
  if (history.length <= maxMessages) {
    return history;
  }
  
  // Keep first message (usually welcome/system context) + last (maxMessages-1) messages
  const firstMessage = history[0];
  const recentMessages = history.slice(-(maxMessages - 1));
  
  return [firstMessage, ...recentMessages];
}

// --- CHAT STREAMING ---

export async function* generateChatResponseStream(
  history: Message[],
  files: any[],
  projectContext: ProjectContext,
  memories: string[],
  divineMemories: string[],
  enableMaker: boolean,
  settings: AISettings,
  notepadContent: string,
  attachedSnippet: string | null = null
): AsyncGenerator<StreamChunk> {

  const baseInstruction = enableMaker ? MAKER_SYSTEM_INSTRUCTION : STANDARD_SYSTEM_INSTRUCTION;

  // RAG Context Enrichment (async)
  const lastUserMessage = [...history].reverse().find(m => m.role === 'user')?.text || "";
  const retrievedContext = await retrieveContext(lastUserMessage, files);

  // Intent Classification
  const hasEditorContent = !!(notepadContent && notepadContent.trim());
  const intentMode = classifyIntent(lastUserMessage, hasEditorContent);

  // BUILD ENRICHED SYSTEM PROMPT (all context goes here)
  const enrichedSystemPrompt = buildEnrichedSystemPrompt(
    baseInstruction,
    divineMemories,
    memories,
    projectContext,
    retrievedContext,
    notepadContent,
    attachedSnippet,
    intentMode
  );

  // TRUNCATE HISTORY (sliding window) - messages stay CLEAN
  const truncatedHistory = truncateHistory(history, MAX_HISTORY_MESSAGES);

  // Stream with enriched system prompt and clean history
  yield* generateOllamaStream(truncatedHistory, enrichedSystemPrompt, settings);
}


// --- TEXT IMPROVEMENT (Refactoring / Analysis) ---

export async function runTextImprovement(
  inputText: string,
  taskType: 'rewrite' | 'shorten' | 'expand' | 'format',
  settings: AISettings
): Promise<string> {

  const prompts: Record<string, string> = {
    rewrite: `Riscrivi il testo seguente in modo più chiaro, preciso e professionale:\n\n${inputText}`,
    shorten: `Sintetizza il testo seguente mantenendo solo le informazioni essenziali:\n\n${inputText}`,
    expand: `Espandi il testo seguente aggiungendo dettagli, esempi e spiegazioni:\n\n${inputText}`,
    format: `Formatta il testo seguente per migliorarne la leggibilità e struttura:\n\n${inputText}`
  };

  const systemInstruction = "Sei un esperto di editing e scrittura tecnica. Rispondi SOLO con il testo migliorato, senza commenti aggiuntivi.";

  return await generateOllamaResponse(prompts[taskType], systemInstruction, settings, false);
}

// --- PROMPT ANALYSIS ---

export async function analyzePromptDeeply(
  userPrompt: string,
  settings: AISettings
): Promise<AnalysisResult> {

  const systemInstruction = `Sei un esperto di analisi dei prompt. Analizza il prompt dell'utente e restituisci un oggetto JSON con questa struttura esatta:
{
  "clarity": "high|medium|low",
  "completeness": "high|medium|low",
  "suggestions": ["suggerimento 1", "suggerimento 2", ...]
}

Rispondi SOLO con JSON valido, nient'altro.`;

  const analysisPrompt = `Analizza questo prompt:\n\n"${userPrompt}"\n\nRispondi in JSON.`;

  try {
    const response = await generateOllamaResponse(analysisPrompt, systemInstruction, settings, true);
    const parsed = JSON.parse(response.trim());
    return {
      overallScore: 70,
      summary: "Analisi automatica",
      criteriaScores: {
        clarity: parsed.clarity === 'high' ? 90 : parsed.clarity === 'medium' ? 60 : 30,
        specificity: 50,
        context: 50,
        constraints: 50,
        persona: 50,
        logic: 50,
        creativity: 50,
        robustness: 50
      },
      lineByLineCritique: [],
      keyIssues: [],
      detailedSuggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((s: string) => ({ suggestion: s, examples: [] })) : [],
      probingQuestions: [],
      promptVariations: []
    };
  } catch (e) {
    console.error("Analisi fallita:", e);
    return {
      overallScore: 50,
      summary: "Impossibile analizzare",
      criteriaScores: {
        clarity: 50,
        specificity: 50,
        context: 50,
        constraints: 50,
        persona: 50,
        logic: 50,
        creativity: 50,
        robustness: 50
      },
      lineByLineCritique: [],
      keyIssues: [],
      detailedSuggestions: [{ suggestion: "Impossibile analizzare il prompt.", examples: [] }],
      probingQuestions: [],
      promptVariations: []
    };
  }
}

// --- TOKEN USAGE CALCULATION (Estimated for Ollama) ---

export async function calculateTokenUsage(
  messages: Message[],
  files: any[],
  currentInput: string,
  settings: AISettings,
  projectContext?: any,
  memories?: string[],
  divineMemories?: string[],
  notepadContent?: string
): Promise<{ input: number; output: number }> {

  // Build complete context string
  let contextText = '';

  if (projectContext?.isSet && projectContext.content) {
    contextText += projectContext.content + '\n';
  }

  if (memories && memories.length > 0) {
    contextText += memories.join('\n') + '\n';
  }

  if (divineMemories && divineMemories.length > 0) {
    contextText += divineMemories.join('\n') + '\n';
  }

  if (notepadContent) {
    contextText += notepadContent + '\n';
  }

  if (files && files.length > 0) {
    contextText += files.map((f: any) => f.content || '').join('\n') + '\n';
  }

  // Add all message text
  const allMessagesText = messages.map(m => m.text || '').join(' ');
  const totalInput = contextText + allMessagesText + currentInput;

  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(totalInput.length / 4);

  // Calculate output from assistant messages
  const outputText = messages.filter(m => m.role === 'model').map(m => m.text || '').join(' ');
  const outputTokens = Math.ceil(outputText.length / 4);

  return {
    input: inputTokens,
    output: outputTokens
  };
}
