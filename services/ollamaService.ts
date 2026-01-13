
import { AISettings, Message, ReasoningEffort } from "../types";
import { StreamChunk } from "./streamTypes";

// --- THINKING TIMEOUT CONFIG ---
const THINKING_TIMEOUT_MS = 120000; // 120 secondi max per il thinking
const THINKING_LOOP_DETECTOR_THRESHOLD = 3; // Numero di frasi ripetute per rilevare loop

// --- REASONING EFFORT CONFIG ---
function getReasoningConfig(effort: ReasoningEffort): { think: boolean; promptPrefix: string; promptSuffix: string } {
    switch (effort) {
        case 'low':
            return { 
                think: false, 
                promptPrefix: '', 
                promptSuffix: ' /nothink' 
            };
        case 'medium':
            return { 
                think: true, 
                promptPrefix: '', 
                promptSuffix: '' 
            };
        case 'high':
            return { 
                think: true, 
                promptPrefix: '[DEEP REASONING MODE] Ragiona in modo esteso e approfondito, considerando tutte le alternative possibili, step by step, prima di fornire la risposta finale.\n\n', 
                promptSuffix: '' 
            };
        default:
            return { think: true, promptPrefix: '', promptSuffix: '' };
    }
}

// Helper to clean up history for Ollama (which expects clean "role" and "content")
const formatHistoryForOllama = (history: Message[], systemInstruction: string) => {
    const messages = [];
    
    // Add system instruction as first message
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }

    history.forEach(msg => {
        messages.push({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text || "(no text)"
        });
    });

    return messages;
};

// --- OLLAMA STREAMING ---

export async function* generateOllamaStream(
    history: Message[],
    systemInstruction: string,
    settings: AISettings
): AsyncGenerator<StreamChunk> {
    
    // Apply reasoning effort configuration
    const reasoningConfig = getReasoningConfig(settings.reasoningEffort || 'medium');
    
    // Modify system instruction with prefix if HIGH effort
    const modifiedSystemInstruction = reasoningConfig.promptPrefix + systemInstruction;
    
    // Modify last user message with suffix if LOW effort
    const modifiedHistory = [...history];
    if (reasoningConfig.promptSuffix && modifiedHistory.length > 0) {
        const lastMsg = modifiedHistory[modifiedHistory.length - 1];
        if (lastMsg.role === 'user') {
            modifiedHistory[modifiedHistory.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + reasoningConfig.promptSuffix
            };
        }
    }
    
    const messages = formatHistoryForOllama(modifiedHistory, modifiedSystemInstruction);

    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), THINKING_TIMEOUT_MS);

        const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.ollamaModel,
                messages: messages,
                stream: true,
                think: reasoningConfig.think, // Dynamic based on effort level
                options: {
                    temperature: settings.temperature,
                    num_ctx: 65536 // 64k context (custom model supports 128k, limited for 12GB VRAM)
                }
            }),
            signal: controller.signal
        });

        if (!response.body) throw new Error("Ollama connection failed: No body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let insideThinkTag = false;
        
        // --- THINKING LOOP DETECTION ---
        let thinkingStartTime = Date.now();
        let accumulatedThinking = '';
        let recentSentences: string[] = [];
        let loopDetected = false;
        let hasProducedContent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                clearTimeout(timeoutId);
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    
                    // --- TOKEN COUNT CAPTURE (final response) ---
                    if (json.done && json.prompt_eval_count !== undefined) {
                        clearTimeout(timeoutId);
                        yield { 
                            type: 'token_count', 
                            content: '',
                            tokenData: {
                                prompt_eval_count: json.prompt_eval_count || 0,
                                eval_count: json.eval_count || 0,
                                total_duration: json.total_duration || 0,
                                prompt_eval_duration: json.prompt_eval_duration || 0,
                                eval_duration: json.eval_duration || 0
                            }
                        };
                        continue;
                    }
                    
                    if (json.done) continue;

                    // --- QWEN3 NATIVE THINKING (think=true API) ---
                    // When think=true, Ollama returns separate 'thinking' field
                    const thinking = json.message?.thinking || '';
                    if (thinking) {
                        accumulatedThinking += thinking;
                        
                        // --- LOOP DETECTION: Check for repeated sentences ---
                        const sentences = thinking.split(/[.!?]+/).filter(s => s.trim().length > 20);
                        for (const sentence of sentences) {
                            const normalized = sentence.trim().toLowerCase().slice(0, 50);
                            if (normalized.length > 0) {
                                const matches = recentSentences.filter(s => s === normalized).length;
                                if (matches >= THINKING_LOOP_DETECTOR_THRESHOLD) {
                                    loopDetected = true;
                                    console.warn(`[LOOP DETECTED] Repeated sentence: "${normalized.slice(0,30)}..."`);
                                }
                                recentSentences.push(normalized);
                                // Keep only last 50 sentences for comparison
                                if (recentSentences.length > 50) recentSentences.shift();
                            }
                        }
                        
                        // --- TIMEOUT CHECK: After 120s, force decision ---
                        const elapsedTime = Date.now() - thinkingStartTime;
                        if ((elapsedTime > THINKING_TIMEOUT_MS || loopDetected) && !hasProducedContent) {
                            console.warn(`[THINKING TIMEOUT] Elapsed: ${elapsedTime}ms, Loop: ${loopDetected}`);
                            
                            // Yield warning message to user
                            yield { 
                                type: 'thought', 
                                content: `\n\n⚠️ [TIMEOUT: Ragionamento interrotto dopo ${Math.round(elapsedTime/1000)}s]\n` +
                                         `Riepilogo: Ho analizzato la richiesta ma il ragionamento era troppo lungo.\n` +
                                         `Decisione forzata: Procedo con l'azione più ragionevole.\n\n`
                            };
                            
                            // Force a simple response - abort and let frontend handle
                            clearTimeout(timeoutId);
                            controller.abort();
                            
                            // Emit a forced decision based on context
                            yield { 
                                type: 'text', 
                                content: `Mi scuso, la richiesta era ambigua o complessa. Puoi riformularla in modo più semplice? Ad esempio:\n` +
                                         `- "Aggiungi X alla riga Y"\n` +
                                         `- "Elimina la riga Z"\n` +
                                         `- "Riscrivi tutto il prompt"`
                            };
                            return;
                        }
                        
                        yield { type: 'thought', content: thinking };
                    }

                    let content = json.message?.content || '';
                    if (!content) continue;
                    
                    // Mark that we've produced actual content (not just thinking)
                    hasProducedContent = true;

                    // --- FALLBACK: DEEPSEEK/LEGACY THINKING PARSING ---
                    // DeepSeek R1 uses <think>...</think> inline
                    
                    // Start thinking
                    if (content.includes('<think>')) {
                        insideThinkTag = true;
                        content = content.replace('<think>', '');
                        yield { type: 'thought', content: content };
                        continue;
                    }

                    // End thinking
                    if (content.includes('</think>')) {
                        insideThinkTag = false;
                        const parts = content.split('</think>');
                        yield { type: 'thought', content: parts[0] };
                        yield { type: 'text', content: parts[1] };
                        continue;
                    }

                    // Content routing
                    if (insideThinkTag) {
                        yield { type: 'thought', content: content };
                    } else {
                        yield { type: 'text', content: content };
                    }

                } catch (e) {
                    console.error("Ollama JSON parse error", e);
                }
            }
        }
        
        clearTimeout(timeoutId);
        
    } catch (e: any) {
        // Handle abort specifically
        if (e.name === 'AbortError') {
            console.warn("[THINKING TIMEOUT] Request aborted after timeout");
            yield { 
                type: 'text', 
                content: `⚠️ Timeout raggiunto (${THINKING_TIMEOUT_MS/1000}s). La richiesta era troppo complessa o ambigua.\n\n` +
                         `Prova a riformulare in modo più specifico, ad esempio:\n` +
                         `- "Aggiungi [testo] alla riga [numero]"\n` +
                         `- "Elimina le righe [da] a [a]"\n` +
                         `- "Riscrivi tutto il prompt su [argomento]"`
            };
            return;
        }
        console.error("Ollama Stream Error:", e);
        throw e;
    }
}

// --- OLLAMA GENERATION (ONE-SHOT / JSON) ---

export async function generateOllamaResponse(
    prompt: string,
    systemInstruction: string,
    settings: AISettings,
    jsonMode: boolean = false
): Promise<string> {
    try {
        // Apply reasoning effort configuration
        const reasoningConfig = getReasoningConfig(settings.reasoningEffort || 'medium');
        const modifiedSystemInstruction = reasoningConfig.promptPrefix + systemInstruction;
        const modifiedPrompt = prompt + reasoningConfig.promptSuffix;
        
        const messages = [
            { role: 'system', content: modifiedSystemInstruction },
            { role: 'user', content: modifiedPrompt }
        ];

        const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.ollamaModel,
                messages: messages,
                stream: false,
                think: reasoningConfig.think, // Dynamic based on effort level
                format: jsonMode ? "json" : undefined,
                options: {
                    temperature: settings.temperature,
                    num_ctx: 32768 // 32k context window (optimized for 12GB VRAM)
                }
            })
        });

        const data = await response.json();
        let content = data.message?.content || "";

        // Clean up thinking tags if present in non-stream mode
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        return content;
    } catch (e) {
        console.error("Ollama Generation Error:", e);
        throw e;
    }
}

// --- CONNECTION TEST ---

export async function testOllamaConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Check Tags (Models list)
        const response = await fetch(`${settings.ollamaUrl}/api/tags`);
        if (!response.ok) throw new Error(`Endpoint raggiungibile ma errore HTTP: ${response.status}`);

        const data = await response.json();
        
        // 2. Check if specific model exists (fuzzy match)
        const models = data.models || [];
        const modelExists = models.some((m: any) => m.name.includes(settings.ollamaModel));

        if (!modelExists) {
            return { 
                success: false, 
                message: `Connessione OK, ma modello '${settings.ollamaModel}' non trovato. Modelli disponibili: ${models.map((m:any) => m.name).slice(0, 3).join(', ')}...` 
            };
        }

        // 3. Try a minimal generation (Ping)
        const genResponse = await fetch(`${settings.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: settings.ollamaModel, 
                prompt: 'ping', 
                stream: false,
                options: { num_predict: 1 } 
            })
        });

        if (!genResponse.ok) throw new Error("Errore durante la generazione di test.");

        return { success: true, message: `Connessione stabilita! Modello: ${settings.ollamaModel}` };

    } catch (e: any) {
        return { success: false, message: `Errore Connessione: ${e.message || "Host non raggiungibile"}` };
    }
}
