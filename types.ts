
export interface GeneratedImage {
  id: string;
  src: string;
  name: string;
  label: string;
}

export type LoadingState = 'idle' | 'describing' | 'editing-prompts' | 'generating' | 'done' | 'error';