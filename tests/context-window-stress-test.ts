/**
 * CONTEXT WINDOW STRESS TEST - MasterPromptEngine
 * 
 * Test per verificare che qwen3-8b-64k-custom:latest regga 50k context window
 * 
 * CRITICHE DA VERIFICARE:
 * 1. Il modello non crasha con 50k context
 * 2. La risposta è coerente (non troncata/garbage)
 * 3. Latency e token count sono ragionevoli
 * 4. VRAM usage rimane sotto 12GB
 * 
 * ATTENZIONE: Qwen3 8B ufficialmente supporta fino a 128k context,
 * ma con 12GB VRAM il limite pratico dipende dalla quantizzazione.
 * Test incrementale: 32k → 40k → 50k
 */

const OLLAMA_URL = 'http://localhost:7860';
const MODEL = 'qwen3-8b-64k-custom:latest';

// --- GENERATORE DI CONTENUTO FILLER ---

/**
 * Genera testo filler per riempire il context.
 * ~4 caratteri = ~1 token (approssimazione per testo misto IT/EN)
 */
function generateFillerText(targetTokens: number): string {
    // Contenuto realistico: simula un documento RAG + notepad + history
    const chunks: string[] = [];
    
    // Simula documenti RAG (variati per evitare pattern ripetitivi)
    const ragTemplates = [
        `## Documento ${Math.random().toString(36).slice(2, 8)}\n\nQuesto documento descrive le best practices per la scrittura di prompt efficaci. Un prompt ben strutturato include: identità chiara, contesto specifico, formato di output desiderato, e vincoli espliciti. È fondamentale evitare ambiguità e fornire esempi concreti quando possibile.\n\n`,
        `### Sezione Tecnica\n\nL'architettura del sistema si basa su tre componenti principali: il parser XML per l'estrazione dei comandi, il servizio RAG per il recupero del contesto, e il controller centrale per la gestione dello stato. Ogni componente è progettato per essere stateless e facilmente testabile.\n\n`,
        `#### Note Implementative\n\nQuando si lavora con modelli LLM, è cruciale gestire correttamente i timeout e i retry. La configurazione consigliata prevede un timeout di 120 secondi per richieste standard e 300 secondi per operazioni MAKER complesse. Il backoff esponenziale è implementato con base 2.\n\n`,
        `**Esempio di Prompt Efficace:**\n\n\`\`\`\nSei un assistente specializzato in [DOMINIO]. Il tuo compito è [TASK]. \nRispondi sempre in [FORMATO]. Non includere mai [VINCOLO].\n\`\`\`\n\n`,
        `### Metriche di Qualità\n\n- Completezza: il prompt copre tutti i casi d'uso?\n- Chiarezza: le istruzioni sono univoche?\n- Robustezza: gestisce edge cases?\n- Efficienza: minimizza i token necessari?\n\n`,
    ];
    
    // Simula chat history (messaggi alternati user/assistant)
    const historyTemplates = [
        `USER: Come posso migliorare questo prompt per renderlo più specifico?\n\nASSISTANT: Per migliorare la specificità, considera di aggiungere esempi concreti di input/output attesi e definire chiaramente i vincoli del dominio.\n\n`,
        `USER: Il modello non segue le istruzioni di formattazione.\n\nASSISTANT: Prova ad aggiungere un reminder alla fine del prompt: "IMPORTANTE: Rispetta SEMPRE il formato richiesto." e fornisci un esempio esplicito.\n\n`,
        `USER: Qual è la differenza tra APPEND e UPDATE?\n\nASSISTANT: APPEND aggiunge contenuto alla fine del notepad esistente, UPDATE sostituisce completamente il contenuto. Usa APPEND per aggiunte incrementali, UPDATE per riscritture complete.\n\n`,
    ];
    
    // Simula notepad content (prompt in costruzione)
    const notepadContent = `# Prompt per Code Review Assistant

## Identità
Sei un esperto revisore di codice Python con oltre 10 anni di esperienza in progetti enterprise.
Hai competenze specifiche in: performance optimization, security best practices, design patterns.

## Comportamento
1. Analizza il codice riga per riga
2. Identifica bug, code smells, e violazioni di best practices
3. Suggerisci miglioramenti concreti con esempi di codice
4. Sii costruttivo e educativo, mai critico in modo negativo

## Formato Output
Rispondi in markdown con le seguenti sezioni:
- **Sommario**: 2-3 frasi di overview
- **Issues Critici**: bug e problemi di sicurezza
- **Suggerimenti**: miglioramenti opzionali
- **Codice Corretto**: versione migliorata

## Vincoli
- Non eseguire mai il codice
- Non suggerire dipendenze non standard senza giustificazione
- Limita la risposta a 500 parole massimo

`;
    
    // Costruisci il payload
    let totalChars = 0;
    const targetChars = targetTokens * 4; // ~4 char/token
    
    // Aggiungi notepad (sempre presente)
    chunks.push(`<ACTIVE_SCRATCHPAD_CONTENT>\n${notepadContent}\n</ACTIVE_SCRATCHPAD_CONTENT>\n\n`);
    totalChars += chunks[chunks.length - 1].length;
    
    // Aggiungi RAG context
    chunks.push(`--- RAG CONTEXT ---\n`);
    while (totalChars < targetChars * 0.5) { // 50% RAG
        const template = ragTemplates[Math.floor(Math.random() * ragTemplates.length)];
        chunks.push(template);
        totalChars += template.length;
    }
    chunks.push(`--- END RAG CONTEXT ---\n\n`);
    
    // Aggiungi history
    chunks.push(`--- CHAT HISTORY ---\n`);
    while (totalChars < targetChars * 0.85) { // 35% history
        const template = historyTemplates[Math.floor(Math.random() * historyTemplates.length)];
        chunks.push(template);
        totalChars += template.length;
    }
    chunks.push(`--- END CHAT HISTORY ---\n\n`);
    
    // User message finale
    chunks.push(`USER: Analizza il prompt nel notepad e dimmi se è ben strutturato. Rispondi in modo conciso.\n`);
    
    return chunks.join('');
}

// --- SYSTEM PROMPT COMPATTO ---
const SYSTEM_PROMPT = `Sei MasterPromptEngine, un assistente per prompt engineering. Rispondi in modo conciso e preciso.`;

// --- API CALL CON METRICHE ---
interface TestResult {
    contextSize: number;
    targetTokens: number;
    actualInputTokens: number;
    actualOutputTokens: number;
    responseLength: number;
    durationMs: number;
    tokensPerSecond: number;
    success: boolean;
    error?: string;
    responsePreview: string;
    hasThinking: boolean;
}

async function testContextWindow(targetTokens: number, contextSize: number): Promise<TestResult> {
    const startTime = Date.now();
    const fillerText = generateFillerText(targetTokens);
    
    console.log(`\n📊 Testing ${targetTokens} target tokens with num_ctx=${contextSize}...`);
    console.log(`   Generated filler: ${fillerText.length} chars (~${Math.round(fillerText.length/4)} tokens estimate)`);
    
    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: fillerText }
                ],
                stream: false,
                think: true, // THINKING ATTIVO
                options: {
                    temperature: 0.25,
                    num_ctx: contextSize // VARIABILE
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        const durationMs = Date.now() - startTime;
        
        const content = data.message?.content || '';
        const thinking = data.message?.thinking || '';
        const promptTokens = data.prompt_eval_count || 0;
        const outputTokens = data.eval_count || 0;
        
        // Calcola tokens/second (solo per output, più significativo)
        const evalDurationSec = (data.eval_duration || 1) / 1e9;
        const tokensPerSecond = outputTokens / evalDurationSec;
        
        // Successo: ha risposto qualcosa, ha token count valido, no errori
        const isSuccess = content.length > 0 && 
                          promptTokens > 0 && 
                          !content.toLowerCase().includes('error') &&
                          !content.toLowerCase().includes('failed');
        
        return {
            contextSize,
            targetTokens,
            actualInputTokens: promptTokens,
            actualOutputTokens: outputTokens,
            responseLength: content.length,
            durationMs,
            tokensPerSecond,
            success: isSuccess,
            responsePreview: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
            hasThinking: thinking.length > 0
        };
        
    } catch (error) {
        return {
            contextSize,
            targetTokens,
            actualInputTokens: 0,
            actualOutputTokens: 0,
            responseLength: 0,
            durationMs: Date.now() - startTime,
            tokensPerSecond: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            responsePreview: '',
            hasThinking: false
        };
    }
}

// --- MAIN TEST SUITE ---
async function runStressTest() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       CONTEXT WINDOW STRESS TEST - MasterPromptEngine');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Model: ${MODEL}`);
    console.log(`Ollama URL: ${OLLAMA_URL}`);
    console.log(`Thinking: ENABLED`);
    console.log(`Temperature: 0.25`);
    console.log('');
    
    // Test incrementale: modello custom 128K con YaRN - target 80k
    const testConfigs = [
        { targetTokens: 20000, contextSize: 32768, name: '20k tokens / 32k ctx (baseline)' },
        { targetTokens: 40000, contextSize: 51200, name: '40k tokens / 50k ctx' },
        { targetTokens: 60000, contextSize: 65536, name: '60k tokens / 64k ctx' },
        { targetTokens: 75000, contextSize: 81920, name: '75k tokens / 80k ctx (TARGET)' },
    ];
    
    const results: TestResult[] = [];
    
    for (const config of testConfigs) {
        console.log(`\n▶ TEST: ${config.name}`);
        console.log('─'.repeat(60));
        
        const result = await testContextWindow(config.targetTokens, config.contextSize);
        results.push(result);
        
        if (result.success) {
            console.log(`✅ SUCCESS`);
            console.log(`   Input tokens:  ${result.actualInputTokens.toLocaleString()}`);
            console.log(`   Output tokens: ${result.actualOutputTokens.toLocaleString()}`);
            console.log(`   Duration:      ${(result.durationMs / 1000).toFixed(1)}s`);
            console.log(`   Speed:         ${result.tokensPerSecond.toFixed(1)} tok/s`);
            console.log(`   Thinking:      ${result.hasThinking ? 'YES' : 'NO'}`);
            console.log(`   Response:      "${result.responsePreview}"`);
        } else {
            console.log(`❌ FAILED: ${result.error}`);
            console.log(`   Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
        }
    }
    
    // --- SUMMARY ---
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\nResults: ${passed}/${total} tests passed\n`);
    
    console.log('┌─────────────────────┬───────────┬───────────┬──────────┬──────────┐');
    console.log('│ Context Size        │ Input Tok │ Output Tok│ Duration │ Status   │');
    console.log('├─────────────────────┼───────────┼───────────┼──────────┼──────────┤');
    
    for (const r of results) {
        const status = r.success ? '✅ PASS' : '❌ FAIL';
        const inputTok = r.actualInputTokens > 0 ? r.actualInputTokens.toLocaleString().padStart(9) : '   N/A   ';
        const outputTok = r.actualOutputTokens > 0 ? r.actualOutputTokens.toLocaleString().padStart(9) : '   N/A   ';
        const duration = `${(r.durationMs / 1000).toFixed(1)}s`.padStart(8);
        const ctxLabel = `${(r.contextSize/1024).toFixed(0)}k ctx`.padEnd(19);
        
        console.log(`│ ${ctxLabel} │${inputTok} │${outputTok} │${duration} │ ${status} │`);
    }
    
    console.log('└─────────────────────┴───────────┴───────────┴──────────┴──────────┘');
    
    // --- RACCOMANDAZIONE ---
    const maxSuccessful = results.filter(r => r.success).sort((a, b) => b.contextSize - a.contextSize)[0];
    
    if (maxSuccessful) {
        console.log(`\n🎯 RACCOMANDAZIONE:`);
        console.log(`   Context window massimo testato con successo: ${(maxSuccessful.contextSize / 1024).toFixed(0)}k tokens`);
        console.log(`   Input tokens gestiti: ${maxSuccessful.actualInputTokens.toLocaleString()}`);
        
        if (maxSuccessful.contextSize >= 51200) {
            console.log(`\n   ✅ 50k context window è SUPPORTATO`);
            console.log(`   Puoi aggiornare ollamaService.ts: num_ctx: 51200`);
        } else {
            console.log(`\n   ⚠️  50k context NON raggiunto`);
            console.log(`   Mantieni num_ctx: ${maxSuccessful.contextSize} per stabilità`);
        }
    } else {
        console.log(`\n❌ TUTTI I TEST FALLITI - Verifica connessione Ollama e modello`);
    }
    
    // Return exit code
    return passed === total ? 0 : 1;
}

// --- ESECUZIONE ---
runStressTest()
    .then(exitCode => {
        console.log(`\n═══════════════════════════════════════════════════════════════`);
        process.exit(exitCode);
    })
    .catch(err => {
        console.error('\n💀 FATAL ERROR:', err);
        process.exit(1);
    });
