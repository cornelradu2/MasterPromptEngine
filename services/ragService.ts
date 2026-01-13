
import { FileChunk, UploadedFile } from "../types";

// Configurazione RAG Ottimizzata
const CHUNK_SIZE = 2000; // Aumentato per catturare più contesto
const CHUNK_OVERLAP = 400; // Più overlap per non perdere connessioni logiche
const MAX_CONTEXT_CHUNKS = 10; // Meno chunk ma più significativi

/**
 * Divide un testo lungo in chunk rispettando confini semantici (paragrafi, frasi).
 */
export const createChunks = (text: string, fileId: string, fileName: string): FileChunk[] => {
  const chunks: FileChunk[] = [];
  if (!text || text.length === 0) return chunks;

  // Normalizza newlines
  const cleanText = text.replace(/\r\n/g, '\n');
  
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + CHUNK_SIZE;
    
    if (endIndex >= cleanText.length) {
      endIndex = cleanText.length;
    } else {
      // Cerca un punto di taglio naturale (Paragrafo > Frase > Parola)
      // Cerchiamo indietro dal limite per non eccedere troppo il CHUNK_SIZE
      const lookBackLimit = Math.max(startIndex, endIndex - 300);
      
      const lastDoubleNewline = cleanText.lastIndexOf('\n\n', endIndex);
      const lastPeriod = cleanText.lastIndexOf('. ', endIndex);
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);

      if (lastDoubleNewline > lookBackLimit) {
        endIndex = lastDoubleNewline + 2;
      } else if (lastPeriod > lookBackLimit) {
        endIndex = lastPeriod + 2;
      } else if (lastSpace > lookBackLimit) {
        endIndex = lastSpace + 1;
      }
      // Se non trova nulla, taglia brutalmente al limite (fallback)
    }

    const chunkContent = cleanText.substring(startIndex, endIndex).trim();
    
    if (chunkContent.length > 50) { // Ignora frammenti minuscoli
        chunks.push({
          id: `${fileId}-chk-${chunkIndex}`,
          fileId,
          fileName,
          content: chunkContent,
          index: chunkIndex
        });
        chunkIndex++;
    }

    // Avanza sottraendo l'overlap, ma non se siamo alla fine
    if (endIndex === cleanText.length) break;
    startIndex = endIndex - CHUNK_OVERLAP;
  }

  return chunks;
};

/**
 * Calcola un punteggio di rilevanza avanzato (Weighted Keyword Density)
 */
const calculateRelevanceScore = (query: string, chunkContent: string): number => {
  const normalizedQuery = query.toLowerCase().replace(/[^\w\s]/g, '');
  const normalizedContent = chunkContent.toLowerCase();
  
  // Tokenizzazione query (rimuove stop words banali se necessario, qui semplice)
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2);
  
  if (queryTokens.length === 0) return 0;

  let score = 0;
  let distinctMatches = 0;

  // 1. Exact Phrase Match (Molto forte)
  if (normalizedContent.includes(normalizedQuery)) {
    score += 100;
  }

  // 2. Token Matching & Density
  queryTokens.forEach(token => {
    // Regex per trovare parola intera (evita match parziali errati es: "var" in "variegato")
    const regex = new RegExp(`\\b${token}\\b`, 'gi');
    const matches = (normalizedContent.match(regex) || []).length;
    
    if (matches > 0) {
      score += (10 * matches); // Premia la frequenza
      distinctMatches++;
      
      // Boost per termini tecnici/codice
      if (token.includes('_') || /[A-Z]/.test(token) || token.length > 8) {
        score += 5;
      }
    } else if (normalizedContent.includes(token)) {
      // Fallback match parziale (meno punti)
      score += 3;
    }
  });

  // 3. Coverage Bonus: Premia chunk che contengono PIÙ parole diverse della query
  const coverageRatio = distinctMatches / queryTokens.length;
  score *= (1 + coverageRatio); 

  return score;
};

/**
 * Recupera i chunk più rilevanti dai file caricati basandosi sulla query dell'utente.
 */
export const retrieveContext = (userQuery: string, files: UploadedFile[]): string => {
  if (files.length === 0) return "Nessun file nella Knowledge Base.";

  let allChunks: FileChunk[] = [];

  // Raccogli/Genera chunks
  files.forEach(file => {
    if (file.chunks && file.chunks.length > 0) {
      allChunks = allChunks.concat(file.chunks);
    } else {
      const tempChunks = createChunks(file.content, file.id, file.name);
      allChunks = allChunks.concat(tempChunks);
    }
  });

  // Scoring
  const scoredChunks = allChunks.map(chunk => ({
    chunk,
    score: calculateRelevanceScore(userQuery, chunk.content)
  }));

  // Filtra e Ordina
  const relevantChunks = scoredChunks
    .filter(item => item.score > 5) // Threshold minimo per rumore
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXT_CHUNKS);

  if (relevantChunks.length === 0) {
    // Fallback: Se la query è vaga, restituisci sommari o inizio file
    console.warn("RAG: Nessun match forte trovato. Fallback ai primi chunk.");
    const introChunks = files.slice(0, 3).map(f => {
        // Prendi il primo chunk significativo
        const chunks = f.chunks || createChunks(f.content, f.id, f.name);
        return chunks[0];
    }).filter(Boolean);
    
    if (introChunks.length > 0) {
         return introChunks.map(c => `
<RELEVANT_CONTEXT file="${c.fileName}" type="fallback_intro">
${c.content.substring(0, 1000)}...
</RELEVANT_CONTEXT>`).join('\n');
    }
    return "Nessun contesto rilevante trovato nei file.";
  }

  // Formatta l'output
  return relevantChunks.map(item => `
<RELEVANT_CONTEXT file="${item.chunk.fileName}" relevance="${Math.round(item.score)}">
${item.chunk.content}
</RELEVANT_CONTEXT>`).join('\n\n');
};
