import { z } from 'zod';

import { getPilot, getRunLogs, updatePilot } from '@/lib/store';
import { getRequestId, jsonWithRequestId } from '@/lib/request';
import type { InputField, WorkflowStep } from '@/lib/types';

const inputSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  placeholder: z.string().optional()
});

const stepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  type: z.enum(['trigger', 'action', 'condition', 'output']),
  title: z.string().min(1),
  description: z.string().min(1),
  tool: z.enum(['simulated', 'openai']),
  requiresApproval: z.boolean(),
  promptTemplate: z.string().optional()
});

const patchBodySchema = z.object({
  oneLiner: z.string().min(1).optional(),
  inputs: z.array(inputSchema).optional(),
  steps: z.array(stepSchema).optional()
});

function normalizeSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const sorted = [...steps]
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((step, index) => ({
      ...step,
      order: index + 1,
      id: step.id || `step_${index + 1}`
    }));

  if (!sorted.some((step) => step.requiresApproval)) {
    const approvalIndex = Math.max(0, sorted.length - 2);
    sorted[approvalIndex] = {
      ...sorted[approvalIndex],
      requiresApproval: true,
      type: 'condition'
    };
  }

  const openAISteps = sorted.filter((step) => step.tool === 'openai');
  if (openAISteps.length === 0 && sorted.length > 0) {
    const lastIndex = sorted.length - 1;
    sorted[lastIndex] = {
      ...sorted[lastIndex],
      tool: 'openai',
      type: 'output',
      promptTemplate: sorted[lastIndex].promptTemplate || '입력값을 바탕으로 결과를 작성하세요.'
    };
  }

  if (openAISteps.length > 1) {
    let seen = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].tool !== 'openai') continue;
      seen += 1;
      if (seen > 1) {
        sorted[i] = {
          ...sorted[i],
          tool: 'simulated',
          promptTemplate: undefined
        };
      }
    }
  }

  return sorted;
}

function normalizeInputs(inputs: InputField[]): InputField[] {
  const unique = new Map<string, InputField>();
  for (const input of inputs) {
    if (!unique.has(input.key)) {
      unique.set(input.key, input);
    }
  }

  const finalInputs = [...unique.values()];
  return finalInputs.length
    ? finalInputs
    : [
        {
          key: 'source_text',
          label: '원본 데이터',
          required: true,
          placeholder: '요약할 텍스트나 핵심 데이터를 입력하세요'
        }
      ];
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const pilot = await getPilot(context.params.id, { requestId });
  if (!pilot) {
    return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
  }

  return jsonWithRequestId(
    {
      pilot,
      runLogsLast3: await getRunLogs(context.params.id, 3, { requestId }),
    },
    requestId,
  );
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const pilot = await getPilot(context.params.id, { requestId });
  if (!pilot) {
    return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithRequestId(
        { error: parsed.error.issues[0]?.message || '요청이 올바르지 않습니다.' },
        requestId,
        { status: 400 },
      );
    }

    const updated = await updatePilot(
      context.params.id,
      (prev) => {
        const nextSteps = parsed.data.steps ? normalizeSteps(parsed.data.steps) : prev.steps;
        const nextInputs = parsed.data.inputs ? normalizeInputs(parsed.data.inputs) : prev.inputs;

        return {
          ...prev,
          oneLiner: parsed.data.oneLiner ?? prev.oneLiner,
          inputs: nextInputs,
          steps: nextSteps,
          version: prev.version + 1,
        };
      },
      { requestId },
    );

    if (!updated) {
      return jsonWithRequestId({ error: 'Pilot을 찾을 수 없습니다.' }, requestId, { status: 404 });
    }

    return jsonWithRequestId({ pilot: updated }, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pilot 수정 중 오류가 발생했습니다.';
    console.error(`[api/pilots/:id] requestId=${requestId} error=${message}`);
    return jsonWithRequestId({ error: message }, requestId, { status: 500 });
  }
}
