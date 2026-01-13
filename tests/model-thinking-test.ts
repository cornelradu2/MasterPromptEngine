/**
 * MODEL COMPLIANCE TEST WITH THINKING - MasterPromptEngine
 * 
 * Test realistico con THINKING MODE ATTIVO
 * Modello: qwen3-8b-64k-custom:latest con think=true
 * 
 * Verifica:
 * 1. Il modello ragiona prima di rispondere
 * 2. Il parsing XML funziona con thinking
 * 3. La qualità delle risposte migliora
 */

const OLLAMA_URL = 'http://localhost:7860';
const MODEL = 'qwen3-8b-64k-custom:latest';

// --- SYSTEM PROMPT (Identico a produzione) ---
const SYSTEM_PROMPT = `
<IDENTITY>
NAME: MasterPromptEngine
ROLE: World-class Prompt Engineering Specialist
MISSION: Transform raw prompts into SOTA-quality instructions for AI systems
LANGUAGE: Italian (unless requested otherwise)
</IDENTITY>

<CONTEXT>
You help users CREATE and IMPROVE PROMPTS (text instructions for AI systems).
User writes prompts in editor (left). You propose improvements via XML commands.
You are NOT a code generator. You are a "Photoshop for prompts".
</CONTEXT>

<RESPONSE_MODES>
The system has ALREADY classified user intent. Follow the [SYSTEM HINT] in the message.

## MODE: CHAT (Hint = CONVERSATIONAL)
→ Respond with 1-2 sentences, natural and friendly
→ NO analysis, NO XML, NO suggestions

## MODE: ANALYZE (Hint = INFORMATION REQUEST)  
→ Respond with 3-5 sentences MAX
→ Describe: purpose, structure, 1-2 key observations
→ NO XML, NO tables, NO scores

## MODE: MODIFY (Hint = MODIFICATION REQUEST)
→ Output ONLY the XML command
→ ZERO text before or after the XML
→ Choose correct command:
  - <SCRATCHPAD_APPEND> for adding content
  - <EDIT_LINES start="X" end="Y"> for changing specific lines
  - <SCRATCHPAD_UPDATE> for complete rewrite
</RESPONSE_MODES>

<SCRATCHPAD_COMMANDS>
COMMANDS:
1. APPEND: <SCRATCHPAD_APPEND>new content</SCRATCHPAD_APPEND>
2. EDIT: <EDIT_LINES start="5" end="8">replacement</EDIT_LINES>
3. REPLACE: <SCRATCHPAD_UPDATE>complete new content</SCRATCHPAD_UPDATE>

RULES:
- XML tags must be RAW (no markdown backticks)
- Output ONLY XML command, ZERO text before/after
- One command per response
</SCRATCHPAD_COMMANDS>

<NEVER_DO>
- MAI modificare se non esplicitamente richiesto
- MAI analizzare per richieste casual (ciao, ok, grazie)
- MAI aggiungere testo prima/dopo XML in MODIFY mode
</NEVER_DO>
`;

// --- NOTEPAD SIMULATO ---
const SAMPLE_NOTEPAD = `# Python Code Review Assistant

## Identity
You are an expert Python code reviewer with 10 years of experience.

## Behavior
- Review code for bugs and issues
- Suggest improvements
- Be constructive and educational

## Output Format
Provide feedback in markdown format.`;

// --- API CALL CON THINKING ---
interface OllamaResponse {
  message: {
    role: string;
    content: string;
    thinking?: string;
  };
}

async function callOllamaWithThinking(
  systemPrompt: string, 
  userMessage: string,
  enableThinking: boolean = true
): Promise<{ content: string; thinking: string | null }> {
  
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false,
      think: enableThinking, // <-- ATTIVA THINKING
      options: {
        temperature: 0.25,
        num_ctx: 32768
      }
    })
  });

  const data: OllamaResponse = await response.json();
  return {
    content: data.message?.content || '',
    thinking: data.message?.thinking || null
  };
}

// --- TEST CASES ---
interface TestCase {
  name: string;
  intent: 'CHAT' | 'ANALYZE' | 'MODIFY';
  userMessage: string;
  notepadContent: string;
  expectedBehavior: {
    shouldContainXML: boolean;
    xmlType?: 'SCRATCHPAD_APPEND' | 'EDIT_LINES' | 'SCRATCHPAD_UPDATE';
    maxContentLength?: number;
    shouldNotContainInContent?: string[];
  };
}

const TEST_CASES: TestCase[] = [
  // === CHAT ===
  {
    name: 'CHAT-1: Saluto',
    intent: 'CHAT',
    userMessage: 'ciao',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxContentLength: 200,
      shouldNotContainInContent: ['<SCRATCHPAD', '<EDIT_LINES', 'analisi']
    }
  },
  {
    name: 'CHAT-2: Conferma',
    intent: 'CHAT',
    userMessage: 'ok perfetto',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxContentLength: 150
    }
  },

  // === ANALYZE ===
  {
    name: 'ANALYZE-1: Domanda sul prompt',
    intent: 'ANALYZE',
    userMessage: 'cosa vedi nel prompt?',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxContentLength: 1000,
      shouldNotContainInContent: ['<SCRATCHPAD', '<EDIT_LINES']
    }
  },
  {
    name: 'ANALYZE-2: Analisi struttura',
    intent: 'ANALYZE',
    userMessage: 'analizza la struttura di questo prompt',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxContentLength: 1200
    }
  },
  {
    name: 'ANALYZE-3: Punti deboli',
    intent: 'ANALYZE',
    userMessage: 'quali sono i punti deboli?',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxContentLength: 1000
    }
  },

  // === MODIFY (CRITICI) ===
  {
    name: 'MODIFY-1: Aggiungi sezione',
    intent: 'MODIFY',
    userMessage: 'aggiungi una sezione per la gestione degli errori',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'SCRATCHPAD_APPEND',
      shouldNotContainInContent: ['Certo', 'Ecco', 'Aggiungo', 'Perfetto', 'Vado']
    }
  },
  {
    name: 'MODIFY-2: Modifica linee',
    intent: 'MODIFY',
    userMessage: 'modifica le linee 5-7 per renderle più dettagliate',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'EDIT_LINES',
      shouldNotContainInContent: ['Certo', 'Ecco', 'Modifico']
    }
  },
  {
    name: 'MODIFY-3: Riscrittura completa',
    intent: 'MODIFY',
    userMessage: 'riscrivi tutto il prompt in modo più professionale',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'SCRATCHPAD_UPDATE',
      shouldNotContainInContent: ['Certo', 'Ecco', 'Riscrivo']
    }
  },
  {
    name: 'MODIFY-4: Aggiungi esempi',
    intent: 'MODIFY',
    userMessage: 'inserisci degli esempi pratici di code review',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'SCRATCHPAD_APPEND',
      shouldNotContainInContent: ['Certo', 'Inserisco']
    }
  },
  {
    name: 'MODIFY-5: Migliora Identity',
    intent: 'MODIFY',
    userMessage: 'migliora la sezione Identity aggiungendo più dettagli sul ruolo',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'EDIT_LINES',
      shouldNotContainInContent: ['Certo', 'Miglioro']
    }
  }
];

// --- TEST RUNNER ---
interface TestResult {
  name: string;
  passed: boolean;
  content: string;
  thinking: string | null;
  thinkingLength: number;
  errors: string[];
  duration: number;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const errors: string[] = [];
  const startTime = Date.now();

  // Build enriched message
  const intentHint = {
    'CHAT': '[SYSTEM HINT: Intent = CONVERSATIONAL. Respond with 1-2 sentences. NO XML, NO analysis.]',
    'ANALYZE': '[SYSTEM HINT: Intent = INFORMATION REQUEST. Respond with 3-5 sentences text. NO XML commands.]',
    'MODIFY': '[SYSTEM HINT: Intent = MODIFICATION REQUEST. Output ONLY XML command. NO text before/after.]'
  }[testCase.intent];

  let editorBlock = '';
  if (testCase.notepadContent) {
    const lines = testCase.notepadContent.split('\n');
    const numbered = lines.map((l, i) => `${i + 1} | ${l}`).join('\n');
    editorBlock = `<ACTIVE_SCRATCHPAD_CONTENT>\n${numbered}\n</ACTIVE_SCRATCHPAD_CONTENT>\n\nEDITOR: ${lines.length} lines.\n\n`;
  }

  const fullMessage = `${intentHint}\n\n${editorBlock}${testCase.userMessage}`;

  // Call model with thinking
  let content = '';
  let thinking: string | null = null;
  
  try {
    const result = await callOllamaWithThinking(SYSTEM_PROMPT, fullMessage, true);
    content = result.content;
    thinking = result.thinking;
  } catch (e) {
    errors.push(`API Error: ${e}`);
    return { 
      name: testCase.name, 
      passed: false, 
      content: '', 
      thinking: null, 
      thinkingLength: 0,
      errors, 
      duration: Date.now() - startTime 
    };
  }

  const duration = Date.now() - startTime;
  const thinkingLength = thinking?.length || 0;

  // --- VALIDATIONS ---

  // 1. Check thinking exists (should always have thinking now)
  if (!thinking || thinking.length < 50) {
    errors.push(`WARNING: No substantial thinking generated (length: ${thinkingLength})`);
  }

  // 2. Check XML presence in CONTENT (not in thinking)
  const hasXML = /<SCRATCHPAD_APPEND>|<EDIT_LINES|<SCRATCHPAD_UPDATE>/i.test(content);
  if (testCase.expectedBehavior.shouldContainXML && !hasXML) {
    errors.push(`FAIL: Expected XML in content but none found`);
  }
  if (!testCase.expectedBehavior.shouldContainXML && hasXML) {
    errors.push(`FAIL: Found XML in content but should NOT contain XML`);
  }

  // 3. Check XML type
  if (testCase.expectedBehavior.xmlType) {
    const xmlTypeMap = {
      'SCRATCHPAD_APPEND': /<SCRATCHPAD_APPEND>/i,
      'EDIT_LINES': /<EDIT_LINES/i,
      'SCRATCHPAD_UPDATE': /<SCRATCHPAD_UPDATE>/i
    };
    if (!xmlTypeMap[testCase.expectedBehavior.xmlType].test(content)) {
      errors.push(`FAIL: Expected ${testCase.expectedBehavior.xmlType} but got different XML or none`);
    }
  }

  // 4. Check max length
  if (testCase.expectedBehavior.maxContentLength && content.length > testCase.expectedBehavior.maxContentLength) {
    errors.push(`FAIL: Content too long (${content.length} > ${testCase.expectedBehavior.maxContentLength})`);
  }

  // 5. Check forbidden strings in CONTENT
  if (testCase.expectedBehavior.shouldNotContainInContent) {
    for (const forbidden of testCase.expectedBehavior.shouldNotContainInContent) {
      if (content.toLowerCase().includes(forbidden.toLowerCase())) {
        errors.push(`FAIL: Content contains forbidden string: "${forbidden}"`);
      }
    }
  }

  // 6. For MODIFY: Check CONTENT is ONLY XML (no preamble text)
  if (testCase.intent === 'MODIFY' && hasXML) {
    const trimmed = content.trim();
    const startsWithXML = /^<(SCRATCHPAD_APPEND|EDIT_LINES|SCRATCHPAD_UPDATE)/i.test(trimmed);
    
    if (!startsWithXML) {
      errors.push(`FAIL: MODIFY content has text BEFORE XML tag`);
    }
  }

  // Filter out warnings for pass/fail
  const realErrors = errors.filter(e => e.startsWith('FAIL:'));

  return {
    name: testCase.name,
    passed: realErrors.length === 0,
    content: content.substring(0, 400) + (content.length > 400 ? '...' : ''),
    thinking: thinking ? thinking.substring(0, 300) + (thinking.length > 300 ? '...' : '') : null,
    thinkingLength,
    errors,
    duration
  };
}

// --- MAIN ---
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`MODEL COMPLIANCE TEST WITH THINKING`);
  console.log(`Model: ${MODEL} | think=true | Context: 32k | Temp: 0.25`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const results: TestResult[] = [];
  
  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing: ${testCase.name}... `);
    const result = await runTest(testCase);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ PASS (${result.duration}ms) [thinking: ${result.thinkingLength} chars]`);
    } else {
      console.log(`❌ FAIL (${result.duration}ms)`);
      result.errors.forEach(e => console.log(`   └─ ${e}`));
    }
  }

  // --- SUMMARY ---
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  const chatTests = results.filter(r => r.name.startsWith('CHAT'));
  const analyzeTests = results.filter(r => r.name.startsWith('ANALYZE'));
  const modifyTests = results.filter(r => r.name.startsWith('MODIFY'));

  console.log(`\nTotal:   ${passed}/${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`CHAT:    ${chatTests.filter(r => r.passed).length}/${chatTests.length}`);
  console.log(`ANALYZE: ${analyzeTests.filter(r => r.passed).length}/${analyzeTests.length}`);
  console.log(`MODIFY:  ${modifyTests.filter(r => r.passed).length}/${modifyTests.length}`);

  const avgDuration = Math.round(results.reduce((a, r) => a + r.duration, 0) / results.length);
  const avgThinking = Math.round(results.reduce((a, r) => a + r.thinkingLength, 0) / results.length);
  console.log(`\nAvg Response Time: ${avgDuration}ms`);
  console.log(`Avg Thinking Length: ${avgThinking} chars`);

  // --- THINKING ANALYSIS ---
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('THINKING ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  results.forEach(r => {
    const thinkingPreview = r.thinking ? r.thinking.substring(0, 150).replace(/\n/g, ' ') + '...' : 'NONE';
    console.log(`\n${r.passed ? '✅' : '❌'} ${r.name}`);
    console.log(`   Thinking (${r.thinkingLength} chars): ${thinkingPreview}`);
  });

  // --- DETAILED FAILURES ---
  if (failed > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('FAILED TESTS DETAILS');
    console.log('═══════════════════════════════════════════════════════════════════════');
    
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n❌ ${r.name}`);
      console.log(`Errors:`);
      r.errors.forEach(e => console.log(`  - ${e}`));
      console.log(`Content:\n${r.content}`);
      if (r.thinking) {
        console.log(`Thinking:\n${r.thinking}`);
      }
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
