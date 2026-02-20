export type RecordMode = 'capture' | 'describe' | 'prompt';

export type InputField = {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string;
};

export type WorkflowStep = {
  id: string;
  order: number;
  type: 'trigger' | 'action' | 'condition' | 'output';
  title: string;
  description: string;
  tool: 'simulated' | 'openai';
  requiresApproval: boolean;
  promptTemplate?: string;
};

export type Pilot = {
  id: string;
  name: string;
  oneLiner: string;
  recordMode: RecordMode;
  record: {
    taskDescription?: string;
    prompt?: string;
    inputsCsv?: string;
    exampleInput?: string;
    exampleOutput?: string;
    captureDataUrl?: string;
    captureNote?: string;
  };
  inputs: InputField[];
  steps: WorkflowStep[];
  credits: number;
  version: number;
  createdAt: string;
};

export type RunLog = {
  id: string;
  pilotId: string;
  createdAt: string;
  inputValues: Record<string, string>;
  outputPreview: string;
  totalTokens?: number;
  status: 'success' | 'error';
};

export type WorkflowCompileSpec = {
  oneLiner: string;
  inputs: InputField[];
  steps: WorkflowStep[];
};
