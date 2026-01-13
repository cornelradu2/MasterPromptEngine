// ============================================================================
// MASTERPROMPTENGINE SYSTEM PROMPTS - MAIN INDEX
// Re-exports from modular files for backward compatibility
// ============================================================================

// --- SHARED COMPONENTS ---
export { 
  SCRATCHPAD_PROTOCOL, 
  SHARED_CAPABILITIES, 
  PROMPT_QUALITY_RUBRIC,
  AGENT_FORMAT_TEMPLATE,
  ALLEGATI_SECTION,
  AGENT_LOOP_CONTROL 
} from './prompts/shared';

// --- STANDARD MODE ---
export { 
  STANDARD_SYSTEM_INSTRUCTION, 
  BASE_SYSTEM_INSTRUCTION  // Legacy alias
} from './prompts/standardPrompt';

// --- MAKER MODE ---
export { 
  MAKER_SYSTEM_INSTRUCTION, 
  MAKER_DOCTRINE, 
  MAKER_PROTOCOL_SHORT, 
  AGENTS 
} from './prompts/makerPrompt';
