// Shared stream types for AI services
export type StreamChunk = {
  type: 'text' | 'thought' | 'grounding' | 'token_count';
  content: string;
  tokenData?: {
    prompt_eval_count?: number;
    eval_count?: number;
    total_duration?: number;
    prompt_eval_duration?: number;
    eval_duration?: number;
  };
};
