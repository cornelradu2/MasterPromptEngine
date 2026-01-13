
import { MakerProcess, MakerStep, MakerAgentRole, ProjectContext, AISettings } from "../types";
import { generateOllamaResponse } from "./ollamaService";

// IMPORTS MODULARI DAGLI AGENTI DEDICATI
import { ARCHITECT_PROMPT } from "../config/prompts/architect";
import { ENGINEER_PROMPT } from "../config/prompts/engineer";
import { GUARDIAN_PROMPT } from "../config/prompts/guardian";
import { PERFECTIONIST_PROMPT } from "../config/prompts/perfectionist";

// --- MAPPING AGENTS ---
const AGENT_CONFIG: Record<MakerAgentRole, { prompt: string, title: string, desc: string, temp: number }> = {
    'ARCHITECT': {
        prompt: ARCHITECT_PROMPT,
        title: "The Architect",
        desc: "Defining structural blueprint & identity...",
        temp: 0.7
    },
    'ENGINEER': {
        prompt: ENGINEER_PROMPT,
        title: "The Engineer",
        desc: "Planning implementation logic & algorithms...",
        temp: 0.5
    },
    'GUARDIAN': {
        prompt: GUARDIAN_PROMPT,
        title: "The Guardian",
        desc: "Adding safety protocols & constraints...",
        temp: 0.3
    },
    'PERFECTIONIST': {
        prompt: PERFECTIONIST_PROMPT,
        title: "The Perfectionist",
        desc: "Synthesizing Master Prompt & Executing...",
        temp: 0.2
    }
};

const PIPELINE_SEQUENCE: MakerAgentRole[] = ['ARCHITECT', 'ENGINEER', 'GUARDIAN', 'PERFECTIONIST'];

// --- HELPERS ---

async function unifiedGenerate(
    prompt: string, 
    systemInstruction: string, 
    settings: AISettings,
    temperature: number
): Promise<string> {
    
    // OLLAMA ONLY ROUTE
    return await generateOllamaResponse(prompt, systemInstruction, settings, false);
}

// --- LOGIC ---

export async function classifyTaskComplexity(userPrompt: string, settings: AISettings): Promise<'SIMPLE' | 'COMPLEX'> {
    // Force COMPLEX to trigger the Pipeline UI when Maker Mode is active
    return 'COMPLEX';
}

export async function* runMakerLoop(
  userPrompt: string,
  settings: AISettings,
  context: ProjectContext | undefined,
  memories: string[] | undefined,
  divineMemories: string[]
): AsyncGenerator<MakerProcess> {

  // Initialize Fixed Pipeline Steps
  const steps: MakerStep[] = PIPELINE_SEQUENCE.map((role, idx) => ({
    id: idx + 1,
    agentRole: role,
    title: AGENT_CONFIG[role].title,
    description: AGENT_CONFIG[role].desc,
    status: 'pending',
    logs: []
  }));

  let processState: MakerProcess = {
    id: Date.now().toString(),
    userPrompt,
    status: 'executing',
    steps: steps,
    currentStepIndex: 0,
    finalResult: '',
    createdAt: Date.now()
  };

  yield { ...processState };

  let currentContextCode = ""; // This holds the code as it evolves

  // --- THE SEQUENTIAL LOOP ---
  for (let i = 0; i < PIPELINE_SEQUENCE.length; i++) {
    const role = PIPELINE_SEQUENCE[i];
    const config = AGENT_CONFIG[role];
    const currentStep = processState.steps[i];

    // Update Status
    processState.currentStepIndex = i;
    processState.steps[i].status = 'working';
    processState.steps[i].inputContext = currentContextCode; // Save snapshot of input
    processState.steps[i].logs.push(`Agent ${config.title} activated.`);
    yield { ...processState };

    // Construct Prompt
    let fullPrompt = "";
    
    if (role === 'ARCHITECT') {
        // First step: Just the user prompt + context
        fullPrompt = `
        USER REQUEST: "${userPrompt}"
        
        PROJECT CONTEXT: ${context?.content || "None"}
        MEMORIES: ${memories?.join('; ') || "None"}
        DIVINE TRUTHS: ${divineMemories.join('; ')}
        
        Start the design phase. Define the STRUCTURAL BLUEPRINT.
        `;
    } else if (role === 'PERFECTIONIST') {
        // Final step: The Synthesizer
        fullPrompt = `
        ORIGINAL REQUEST: "${userPrompt}"
        
        --- ACCUMULATED "NOISE" (INSTRUCTIONS FROM COMMITTEE) ---
        ${currentContextCode}
        ---------------------------------------------------------
        
        TASK:
        1. Synthesize the above instructions into a Master Prompt.
        2. EXECUTE the Original Request using that Master Prompt.
        3. Output ONLY the final result (Code/Answer).
        `;
    } else {
        // Intermediate steps (Engineer, Guardian): Add to the pile
        fullPrompt = `
        ORIGINAL REQUEST: "${userPrompt}"
        
        CURRENT INSTRUCTION SET (So Far):
        \`\`\`
        ${currentContextCode}
        \`\`\`
        
        Your turn. Add your specific layer of instructions (Logic/Safety) to this buffer.
        DO NOT WRITE CODE. WRITE INSTRUCTIONS/PROMPTS.
        `;
    }

    try {
        const output = await unifiedGenerate(fullPrompt, config.prompt, settings, config.temp);
        
        if (role === 'PERFECTIONIST') {
             currentContextCode = output; // The final result
        } else {
             // Accumulate the "Noise"
             currentContextCode += `\n\n--- [${role} LAYER] ---\n${output}`;
        }
        
        processState.steps[i].outputContent = output;
        processState.steps[i].status = 'completed';
        processState.steps[i].logs.push("Layer added successfully.");
        
        // Update final result continuously to show progress
        processState.finalResult = currentContextCode; 

    } catch (e: any) {
        processState.steps[i].status = 'failed';
        processState.steps[i].logs.push(`CRITICAL ERROR: ${e.message}`);
        processState.status = 'failed';
        yield { ...processState };
        return;
    }

    yield { ...processState };
  }

  processState.status = 'completed';
  yield { ...processState };
}
