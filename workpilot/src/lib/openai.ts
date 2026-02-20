import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import type { WorkflowCompileSpec } from '@/lib/types';

const openAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const compileInputFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  placeholder: z.string().optional()
});

const compileStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  type: z.enum(['trigger', 'action', 'condition', 'output']),
  title: z.string().min(1),
  description: z.string().min(1),
  tool: z.enum(['simulated', 'openai']),
  requiresApproval: z.boolean(),
  promptTemplate: z.string().optional()
});

const compileSpecSchema = z.object({
  oneLiner: z.string().min(1),
  inputs: z.array(compileInputFieldSchema),
  steps: z.array(compileStepSchema)
});

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function compileWithOpenAI(args: {
  name: string;
  recordMode: 'capture' | 'describe' | 'prompt';
  record: {
    taskDescription?: string;
    prompt?: string;
    inputsCsv?: string;
    exampleInput?: string;
    exampleOutput?: string;
    captureDataUrl?: string;
    captureNote?: string;
  };
}): Promise<WorkflowCompileSpec> {
  const client = getClient();
  if (!client) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const systemText = [
    'You are a workflow compiler for WorkPilot.',
    'Return only structured JSON matching the schema.',
    'Constraints:',
    '- steps length must be between 4 and 6',
    '- exactly one step must have tool=openai',
    '- at least one step must have requiresApproval=true',
    '- if tool=openai then promptTemplate is required and can use {{variable}} syntax',
    '- output language should be Korean'
  ].join('\n');

  const userPayload = {
    name: args.name,
    recordMode: args.recordMode,
    record: args.record
  };

  const content: Array<Record<string, string>> = [
    {
      type: 'input_text',
      text: `${systemText}\n\nInput:\n${JSON.stringify(userPayload, null, 2)}`
    }
  ];

  if (args.record.captureDataUrl) {
    content.push({
      type: 'input_image',
      image_url: args.record.captureDataUrl
    });
  }

  const response = await (client.responses as any).parse({
    model: openAIModel,
    input: [{ role: 'user', content }],
    text: {
      format: zodTextFormat(compileSpecSchema, 'workflow_spec')
    }
  });

  const parsed = (response as any).output_parsed;
  return compileSpecSchema.parse(parsed);
}

export async function runWithOpenAI(args: {
  prompt: string;
}): Promise<{ output: string; totalTokens?: number }> {
  const client = getClient();
  if (!client) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const response = await client.responses.create({
    model: openAIModel,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: args.prompt
          }
        ]
      }
    ]
  });

  const outputText = response.output_text || '결과를 생성하지 못했습니다.';
  const totalTokens = (response as any).usage?.total_tokens;

  return {
    output: outputText,
    totalTokens
  };
}
