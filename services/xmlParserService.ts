
import { ProposedChange } from "../types";

/**
 * Rimuove i prefissi di numerazione riga (es. "18 | ", "5| ") 
 * che il modello può erroneamente includere copiando l'EDITOR_STATE.
 */
function stripLineNumbers(content: string): string {
    // Pattern: inizio riga, opzionale spazi, numero, pipe, opzionale spazio
    // Es: "18 | testo" -> "testo", "5| testo" -> "testo", "123 |testo" -> "testo"
    return content
        .split('\n')
        .map(line => line.replace(/^\s*\d+\s*\|\s?/, ''))
        .join('\n');
}

/**
 * Rimuove i wrapper Markdown (es. ```typescript ... ```) che gli LLM
 * spesso inseriscono erroneamente dentro i tag XML.
 */
export function cleanLLMContent(content: string): string {
    let cleaned = content.trim();
    
    // 1. Rimuovi eventuali line numbers copiati dall'editor
    cleaned = stripLineNumbers(cleaned);
    
    // 2. Rimuovi blocchi di codice markdown
    // Supporta ```lang, ``` o solo indentazione se necessario
    const codeBlockRegex = /^```(?:[\w\+\-\.]*)?\s*([\s\S]*?)\s*```$/i;
    
    const match = cleaned.match(codeBlockRegex);
    if (match) {
        cleaned = match[1].trim();
        // Applica di nuovo strip dopo aver rimosso markdown wrapper
        cleaned = stripLineNumbers(cleaned);
    }
    
    return cleaned.trim();
}

/**
 * Cerca ed estrae il primo comando XML valido nel testo fornito, partendo da un indice dato.
 * Supporta formattazione "sporca" e case-insensitivity parziale.
 */
export function extractNextCommand(fullText: string, startIndex: number): { command: ProposedChange | null, newIndex: number } {
    const subsection = fullText.substring(startIndex);
    
    // Regex robuste con case-insensitivity (/i) e gestione spazi flessibili
    
    // 1. APPEND: <SCRATCHPAD_APPEND> ... </SCRATCHPAD_APPEND>
    const appendRegex = /(<SCRATCHPAD_APPEND>)([\s\S]*?)(<\/\s*SCRATCHPAD_APPEND>)/i;
    
    // 2. EDIT: <EDIT_LINES start="1" end="2"> ... </EDIT_LINES>
    // Gestisce start="1", start='1', start=1. Gestisce spazi extra.
    const editRegex = /(<EDIT_LINES\s+start=["']?(\d+)["']?\s+end=["']?(\d+)["']?>)([\s\S]*?)(<\/\s*EDIT_LINES>)/i;
    
    // 3. UPDATE: <SCRATCHPAD_UPDATE> ... </SCRATCHPAD_UPDATE>
    const updateRegex = /(<SCRATCHPAD_UPDATE>)([\s\S]*?)(<\/\s*SCRATCHPAD_UPDATE>)/i;

    // Troviamo tutti i match potenziali
    const matches = [
        { type: 'append', match: subsection.match(appendRegex) },
        { type: 'edit_lines', match: subsection.match(editRegex) },
        { type: 'replace', match: subsection.match(updateRegex) }
    ].filter(m => m.match !== null)
     .sort((a, b) => (a.match!.index || 0) - (b.match!.index || 0)); // Ordina per chi appare prima

    // Se non c'è nessun match, usciamo
    if (matches.length === 0) {
        return { command: null, newIndex: startIndex };
    }

    const best = matches[0];
    const m = best.match!;
    
    // Calcoliamo l'indice assoluto dove finisce questo tag nel fullText
    const matchRelativeStart = m.index || 0;
    const matchLength = m[0].length;
    const newAbsoluteIndex = startIndex + matchRelativeStart + matchLength;

    const id = `prop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let command: ProposedChange | null = null;

    if (best.type === 'append') {
        command = {
            id,
            type: 'append',
            status: 'pending',
            description: 'Append code to file',
            newContent: cleanLLMContent(m[2]), // Group 2 è il contenuto
        };
    } else if (best.type === 'edit_lines') {
        // Group 2 = start, Group 3 = end, Group 4 = content
        const start = parseInt(m[2], 10);
        const end = parseInt(m[3], 10);
        command = {
            id,
            type: 'edit_lines',
            status: 'pending',
            description: `Edit lines ${start}-${end}`,
            lineStart: start,
            lineEnd: end,
            newContent: cleanLLMContent(m[4]),
        };
    } else if (best.type === 'replace') {
        command = {
            id,
            type: 'replace',
            status: 'pending',
            description: 'Full Rewrite',
            newContent: cleanLLMContent(m[2]), // Group 2 è il contenuto
        };
    }

    return { command, newIndex: newAbsoluteIndex };
}
