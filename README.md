# MasterPromptEngine: Advanced PROMPT Engineering Tool

MasterPromptEngine is a **PROMPT EDITOR**, NOT a coding assistant. It's a 100% local, AI-powered tool for creating, improving, and managing **PROMPTS** (instructions for Large Language Models). Built on the **MAKER Framework**, it transforms raw ideas into production-grade prompt text through a specialized 4-stage meta-prompting pipeline.

## 🎯 What MasterPromptEngine Does

- **INPUT**: Your rough idea for an AI prompt (e.g., "I need a legal assistant for contract review")
- **OUTPUT**: A complete, structured PROMPT TEXT ready to copy-paste into ChatGPT, Claude, or any LLM
- **NOT A CODING TOOL**: MasterPromptEngine doesn't write application code. It writes **INSTRUCTIONS** for other AIs.

Think of it as "Photoshop for Prompts" - a professional editor for crafting high-quality AI instructions.

## 🧠 The MAKER Framework (Meta-Prompting Pipeline)

When **MAKER Mode** is active, MasterPromptEngine constructs complex prompts through four meta-prompting agents:

1.  **THE ARCHITECT (Prompt Structure)**: Designs the prompt blueprint - defines role, sections, output format, and structural hierarchy.
2.  **THE ENGINEER (Instruction Layer)**: Adds step-by-step instructions, behavioral patterns, examples, and reasoning frameworks.
3.  **THE GUARDIAN (Constraints Layer)**: Defines limitations, ethical boundaries, edge case handling, and "NEVER DO" rules.
4.  **THE PERFECTIONIST (Polish Layer)**: Synthesizes all layers into a cohesive, production-ready PROMPT TEXT with optimal clarity and token efficiency.

## 🛠️ Scratchpad Protocol (Surgical Prompt Editing)

MasterPromptEngine doesn't just "chat"; it operates directly on your **PROMPT TEXT** via the **Scratchpad Protocol**. Using a specialized XML command set, the AI performs surgical modifications to the prompt you're writing:

- `<SCRATCHPAD_APPEND>`: Add new sections or instructions to your prompt without rewriting everything.
- `<EDIT_LINES start="X" end="Y">`: Modify specific lines of your prompt with precision.
- `<SCRATCHPAD_UPDATE>`: Complete prompt rewrite when you need a fresh start.

**Example**: You write "You are a lawyer" → AI suggests `<EDIT_LINES start="1" end="1">You are a senior corporate lawyer specializing in M&A transactions with 15 years of experience.</EDIT_LINES>`

## 💾ession Memories**: Prompt engineering insights learned during the current session (e.g., "User prefers few-shot examples", "Target LLM is GPT-4", "User wants formal tone").
- **Divine Memories (Global)**: Universal prompt engineering best practices that apply across all sessions (e.g., "Always define role clearly", "Use concrete examples", "Specify output format")
- **Sacred Memories (Session-Local)**: Learned constraints and context specific to the current conversation.
- **Divine Memories (Global Wisdom)**: Immutable rules and global knowledge (e.g., "Always use Tailwind", "Target ES2022") that persist across all sessions.

## 🔍 RAG & Context Engine (Reference Material for Prompts)

Upload reference documents that should inform your prompt creation:

- **Multi-Format Support**: `.ts`, `.tsx`, `.js`, `.py`, `.pdf`, `.docx`, `.zip`
- **Semantic Chunking**: Documents are split into 2000-token chunks with 400-token overlap
- **Context Injection**: When you ask for prompt improvements, MasterPromptEngine automatically retrieves the 10 most relevant chunks from uploaded docs to inform suggestions

**Use Case**: Upload your company's style guide → MasterPromptEngine will create prompts that match your brand voice.

## � Interface Preview

MasterPromptEngine features a clean, 3-panel interface designed for prompt engineering workflows:

![MasterPromptEngine Interface](screenshots/main-interface.png)

**Key Features Shown**:
- **Left Panel**: Session history, Knowledge Base integration, Memory system
- **Center Panel**: Active scratchpad with XML command visualization
- **Right Panel**: Model selection, token usage tracking, real-time AI responses

## �🚀 Local Stack & Setup

MasterPromptEngine runs entirely on your hardware. No API keys, no telemetry, zero latency.

### Prerequisites
- **Node.js** (v18+)
- **Docker Desktop**
- **Ollama** (Running inside Docker)

### 1. Initialize Ollama Container
```bash
docker run -d -p 7860:11434 --name agente_segreto_main ollama/ollama:latest
```

### 2. Pull the Target Model
We recommend **Qwen3 4B Instruct** for the best balance of speed and reasoning.
```bash
docker exec -it agente_segreto_main ollama pull qwen3:4b-instruct
```

### 3. Launch MasterPromptEngine
```bash
npm install
npm run dev
```
Access the IDE at `http://localhost:3000`.

## ⚙️ Technical Specifications
- **Model**: `qwen3:4b-instruct` (Optimized for 128k context)
- **Context Window**: 131,072 tokens
- **Temperature**: 0.25 (Deterministic precision)
- **Storage**: IndexedDB (Files) + LocalStorage (Metadata)

---
*Built for developers who demand absolute control over their AI stack.*

