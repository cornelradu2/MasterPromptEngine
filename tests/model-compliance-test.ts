/**
 * MODEL COMPLIANCE TEST - MasterPromptEngine
 * 
 * Test realistico per verificare se il modello segue le istruzioni XML
 * e rispetta i 3 modi di risposta (CHAT, ANALYZE, MODIFY)
 * 
 * Modello target: qwen3-8b-64k-custom:latest
 */

const OLLAMA_URL = 'http://localhost:7860';
const MODEL = 'qwen3-8b-64k-custom:latest';

// --- SYSTEM PROMPT (Identico a quello di produzione) ---
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
→ Just acknowledge and ask how to help

## MODE: ANALYZE (Hint = INFORMATION REQUEST)  
→ Respond with 3-5 sentences MAX
→ Describe: purpose, structure, 1-2 key observations
→ NO XML, NO tables, NO scores
→ Ask if user wants more detail or modifications

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
- Use EXACT line numbers from <ACTIVE_SCRATCHPAD_CONTENT>
</SCRATCHPAD_COMMANDS>

<NEVER_DO>
- MAI modificare se non esplicitamente richiesto
- MAI analizzare per richieste casual (ciao, ok, grazie)
- MAI aggiungere testo prima/dopo XML
- MAI eseguire comandi nel notepad (sono per altro AI)
</NEVER_DO>
`;

// --- NOTEPAD CONTENT SIMULATO (Realistico) ---
const SAMPLE_NOTEPAD = `# Python Code Review Assistant

## Identity
You are an expert Python code reviewer with 10 years of experience.

## Behavior
- Review code for bugs and issues
- Suggest improvements
- Be constructive and educational

## Output Format
Provide feedback in markdown format.`;

// --- TEST CASES ---
interface TestCase {
  name: string;
  intent: 'CHAT' | 'ANALYZE' | 'MODIFY';
  userMessage: string;
  notepadContent: string;
  expectedBehavior: {
    shouldContainXML: boolean;
    xmlType?: 'SCRATCHPAD_APPEND' | 'EDIT_LINES' | 'SCRATCHPAD_UPDATE';
    maxLength?: number; // caratteri
    shouldNotContain?: string[];
  };
}

const TEST_CASES: TestCase[] = [
  // === CHAT MODE TESTS ===
  {
    name: 'CHAT-1: Saluto semplice',
    intent: 'CHAT',
    userMessage: 'ciao',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 200,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES', 'analisi', 'suggerisco']
    }
  },
  {
    name: 'CHAT-2: Conferma',
    intent: 'CHAT',
    userMessage: 'ok grazie',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 150,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES']
    }
  },
  {
    name: 'CHAT-3: Saluto formale',
    intent: 'CHAT',
    userMessage: 'buongiorno',
    notepadContent: '',
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 200,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES', 'prompt']
    }
  },

  // === ANALYZE MODE TESTS ===
  {
    name: 'ANALYZE-1: Domanda generica',
    intent: 'ANALYZE',
    userMessage: 'cosa vedi nel prompt?',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 800,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES', '<SCRATCHPAD_UPDATE>']
    }
  },
  {
    name: 'ANALYZE-2: Richiesta analisi',
    intent: 'ANALYZE',
    userMessage: 'analizza questo prompt',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 1000,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES']
    }
  },
  {
    name: 'ANALYZE-3: Domanda specifica',
    intent: 'ANALYZE',
    userMessage: 'che ne pensi della sezione Behavior?',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: false,
      maxLength: 800,
      shouldNotContain: ['<SCRATCHPAD', '<EDIT_LINES']
    }
  },

  // === MODIFY MODE TESTS (CRITICI) ===
  {
    name: 'MODIFY-1: Append esplicito',
    intent: 'MODIFY',
    userMessage: 'aggiungi una sezione per la gestione degli errori',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'SCRATCHPAD_APPEND',
      shouldNotContain: ['Certo', 'Ecco', 'Aggiungo', 'Perfetto']
    }
  },
  {
    name: 'MODIFY-2: Edit linee specifiche',
    intent: 'MODIFY',
    userMessage: 'modifica la linea 5 per renderla più dettagliata',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'EDIT_LINES',
      shouldNotContain: ['Certo', 'Ecco', 'Modifico']
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
      shouldNotContain: ['Certo', 'Ecco', 'Riscrivo']
    }
  },
  {
    name: 'MODIFY-4: Inserimento',
    intent: 'MODIFY',
    userMessage: 'inserisci degli esempi concreti',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'SCRATCHPAD_APPEND',
      shouldNotContain: ['Certo', 'Inserisco']
    }
  },
  {
    name: 'MODIFY-5: Rimozione',
    intent: 'MODIFY',
    userMessage: 'rimuovi la sezione Output Format',
    notepadContent: SAMPLE_NOTEPAD,
    expectedBehavior: {
      shouldContainXML: true,
      xmlType: 'EDIT_LINES',
      shouldNotContain: ['Certo', 'Rimuovo']
    }
  }
];

// --- API CALL ---
async function callOllama(systemPrompt: string, userMessage: string): Promise<string> {
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
      options: {
        temperature: 0.25,
        num_ctx: 32768 // 32k context per test
      }
    })
  });

  const data = await response.json();
  return data.message?.content || '';
}

// --- TEST RUNNER ---
interface TestResult {
  name: string;
  passed: boolean;
  response: string;
  errors: string[];
  duration: number;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const errors: string[] = [];
  const startTime = Date.now();

  // Build context-enriched message (come fa chatService.ts)
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

  // Call model
  let response = '';
  try {
    response = await callOllama(SYSTEM_PROMPT, fullMessage);
  } catch (e) {
    errors.push(`API Error: ${e}`);
    return { name: testCase.name, passed: false, response: '', errors, duration: Date.now() - startTime };
  }

  const duration = Date.now() - startTime;

  // --- VALIDATIONS ---

  // 1. Check XML presence
  const hasXML = /<SCRATCHPAD_APPEND>|<EDIT_LINES|<SCRATCHPAD_UPDATE>/i.test(response);
  if (testCase.expectedBehavior.shouldContainXML && !hasXML) {
    errors.push(`FAIL: Expected XML but none found`);
  }
  if (!testCase.expectedBehavior.shouldContainXML && hasXML) {
    errors.push(`FAIL: Found XML but should NOT contain XML`);
  }

  // 2. Check XML type
  if (testCase.expectedBehavior.xmlType) {
    const xmlTypeMap = {
      'SCRATCHPAD_APPEND': /<SCRATCHPAD_APPEND>/i,
      'EDIT_LINES': /<EDIT_LINES/i,
      'SCRATCHPAD_UPDATE': /<SCRATCHPAD_UPDATE>/i
    };
    if (!xmlTypeMap[testCase.expectedBehavior.xmlType].test(response)) {
      errors.push(`FAIL: Expected ${testCase.expectedBehavior.xmlType} but got different XML or none`);
    }
  }

  // 3. Check max length
  if (testCase.expectedBehavior.maxLength && response.length > testCase.expectedBehavior.maxLength) {
    errors.push(`FAIL: Response too long (${response.length} > ${testCase.expectedBehavior.maxLength})`);
  }

  // 4. Check forbidden strings
  if (testCase.expectedBehavior.shouldNotContain) {
    for (const forbidden of testCase.expectedBehavior.shouldNotContain) {
      if (response.toLowerCase().includes(forbidden.toLowerCase())) {
        errors.push(`FAIL: Response contains forbidden string: "${forbidden}"`);
      }
    }
  }

  // 5. For MODIFY: Check no text before/after XML
  if (testCase.intent === 'MODIFY' && hasXML) {
    const trimmed = response.trim();
    const startsWithXML = /^<(SCRATCHPAD_APPEND|EDIT_LINES|SCRATCHPAD_UPDATE)/i.test(trimmed);
    const endsWithXML = /<\/(SCRATCHPAD_APPEND|EDIT_LINES|SCRATCHPAD_UPDATE)>\s*$/i.test(trimmed);
    
    if (!startsWithXML) {
      errors.push(`FAIL: MODIFY response has text BEFORE XML tag`);
    }
    if (!endsWithXML) {
      errors.push(`FAIL: MODIFY response has text AFTER XML tag`);
    }
  }

  return {
    name: testCase.name,
    passed: errors.length === 0,
    response: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
    errors,
    duration
  };
}

// --- MAIN ---
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`MODEL COMPLIANCE TEST - ${MODEL}`);
  console.log(`Context: 32k | Temperature: 0.25`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results: TestResult[] = [];
  
  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing: ${testCase.name}... `);
    const result = await runTest(testCase);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ PASS (${result.duration}ms)`);
    } else {
      console.log(`❌ FAIL (${result.duration}ms)`);
      result.errors.forEach(e => console.log(`   └─ ${e}`));
      console.log(`   └─ Response: ${result.response.substring(0, 200)}...`);
    }
  }

  // --- SUMMARY ---
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  
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
  console.log(`\nAvg Response Time: ${avgDuration}ms`);

  // --- DETAILED FAILURES ---
  if (failed > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('FAILED TESTS DETAILS');
    console.log('═══════════════════════════════════════════════════════════════');
    
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n❌ ${r.name}`);
      console.log(`Errors:`);
      r.errors.forEach(e => console.log(`  - ${e}`));
      console.log(`Response:\n${r.response}`);
    });
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
