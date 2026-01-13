
import { ChatSession, Message, UploadedFile, Role, AISettings, SavedSnippet } from "../types";

const DB_NAME = 'MasterPromptEngineDB';
const DB_VERSION = 2; // Incrementata per risolvere version conflict
const FILE_STORE_NAME = 'files';
const SESSIONS_KEY = 'masterpromptengine_sessions_v2'; 
const DIVINE_MEMORIES_KEY = 'masterpromptengine_divine_memories';
const SETTINGS_KEY = 'masterpromptengine_settings_v1';
const SNIPPETS_KEY = 'masterpromptengine_snippets_v1';

// --- IndexedDB per i File ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!indexedDB) {
      reject(new Error("IndexedDB non supportato dal browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      const errorMsg = error?.message || 'Sconosciuto';
      
      // Se è un errore di versione, prova a cancellare e ricreare
      if (errorMsg.includes('version')) {
        console.warn('Rilevato version conflict, cancello il DB vecchio...');
        indexedDB.deleteDatabase(DB_NAME);
        reject(new Error(`DB version conflict - ricarica la pagina`));
      } else {
        reject(new Error(`Errore apertura DB: ${errorMsg}`));
      }
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // Creazione object store se non esiste
      if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store '${FILE_STORE_NAME}' creato (upgrade da v${oldVersion} a v${DB_VERSION})`);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

export const saveFilesToDB = async (files: UploadedFile[]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([FILE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FILE_STORE_NAME);
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = () => {
      if (files.length === 0) {
        resolve();
        return;
      }
      let itemsProcessed = 0;
      files.forEach(file => {
        const request = store.add(file);
        request.onsuccess = () => {
          itemsProcessed++;
          if (itemsProcessed === files.length) resolve();
        };
        request.onerror = () => reject("Errore salvataggio file");
      });
    };
    clearRequest.onerror = (e) => reject(e);
  });
};

export const loadFilesFromDB = async (): Promise<UploadedFile[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(FILE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as UploadedFile[]);
      };
      request.onerror = () => reject("Errore caricamento file");
    });
  } catch (e) {
    console.error("Database non inizializzato o errore:", e);
    return [];
  }
};

// --- LocalStorage per le Sessioni ---

export const saveSessionsToStorage = (sessions: ChatSession[]) => {
  try {
    const cleanSessions = sessions.map(session => ({
      ...session,
      messages: session.messages.filter(m => !m.isThinking && !m.isStreaming)
    }));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(cleanSessions));
  } catch (e) {
    console.error("Errore salvataggio sessioni:", e);
  }
};

export const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) {
        const oldChat = localStorage.getItem('masterpromptengine_chat_history');
        if (oldChat) {
            const messages = JSON.parse(oldChat);
            const migratedSession: ChatSession = {
                id: Date.now().toString(),
                title: "Chat Migrata",
                messages: messages,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            return [migratedSession];
        }
        return [];
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Errore caricamento sessioni:", e);
    return [];
  }
};

// --- Memorie Divine (Globali) ---

export const saveDivineMemoriesToStorage = (memories: string[]) => {
  try {
    localStorage.setItem(DIVINE_MEMORIES_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error("Errore salvataggio memorie divine:", e);
  }
};

export const loadDivineMemoriesFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem(DIVINE_MEMORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Errore caricamento memorie divine:", e);
    return [];
  }
};

// --- Snippets (Libreria Codice) ---

export const saveSnippetsToStorage = (snippets: SavedSnippet[]) => {
  try {
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
  } catch (e) {
    console.error("Errore salvataggio snippet:", e);
  }
};

export const loadSnippetsFromStorage = (): SavedSnippet[] => {
  try {
    const stored = localStorage.getItem(SNIPPETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Errore caricamento snippet:", e);
    return [];
  }
};

// --- Settings ---

export const saveSettingsToStorage = (settings: AISettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch(e) { console.error(e); }
};

export const loadSettingsFromStorage = (): AISettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure legacy settings have enableMaker
        if (typeof parsed.enableMaker === 'undefined') {
            parsed.enableMaker = false; // DEFAULT OFF
        }
        return parsed;
    }
  } catch(e) {}
  
  return {
    provider: 'ollama',
    ollamaUrl: 'http://localhost:7860',
    ollamaModel: 'qwen3-8b-64k-custom:latest',
    temperature: 0.25,
    enableMaker: false // Default DISATTIVATO (Standard Mode)
  };
};

export const clearAllData = async () => {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(DIVINE_MEMORIES_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(SNIPPETS_KEY);
  localStorage.removeItem('masterpromptengine_chat_history');
  try {
    const db = await openDB();
    const transaction = db.transaction([FILE_STORE_NAME], 'readwrite');
    transaction.objectStore(FILE_STORE_NAME).clear();
  } catch (e) {
    console.warn('Impossibile pulire IndexedDB, lo cancello:', e);
    indexedDB.deleteDatabase(DB_NAME);
  }
};

// Utility per risolvere problemi di versioning
export const resetIndexedDB = async () => {
  return new Promise<void>((resolve) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      console.log('IndexedDB cancellato con successo');
      resolve();
    };
    deleteRequest.onerror = () => {
      console.error('Errore cancellazione IndexedDB');
      resolve(); // Risolviamo comunque per non bloccare l'app
    };
  });
};
