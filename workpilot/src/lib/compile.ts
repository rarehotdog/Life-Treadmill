import { parseInputsCsv, ensureMinimumInputs } from '@/lib/csv';
import { compileWithOpenAI, isOpenAIConfigured } from '@/lib/openai';
import type { InputField, Pilot, WorkflowCompileSpec, WorkflowStep } from '@/lib/types';

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
  return normalized || 'workflow';
}

function enforceCompileConstraints(spec: WorkflowCompileSpec, fallbackInputs: InputField[]): WorkflowCompileSpec {
  const inputs = ensureMinimumInputs(spec.inputs.length > 0 ? spec.inputs : fallbackInputs);

  let steps = spec.steps
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((step, index) => ({
      ...step,
      id: step.id || `step_${index + 1}`,
      order: index + 1
    }));

  if (steps.length < 4) {
    const needed = 4 - steps.length;
    for (let i = 0; i < needed; i += 1) {
      const order = steps.length + 1;
      steps.push({
        id: `step_${order}`,
        order,
        type: 'action',
        title: `추가 단계 ${order}`,
        description: '워크플로우 단계를 보강했습니다.',
        tool: 'simulated',
        requiresApproval: false
      });
    }
  }

  let openaiCount = steps.filter((step) => step.tool === 'openai').length;

  if (openaiCount === 0) {
    const last = steps[steps.length - 1];
    steps[steps.length - 1] = {
      ...last,
      type: 'output',
      tool: 'openai',
      title: '최종 결과 생성',
      promptTemplate:
        last.promptTemplate ||
        `다음 입력값을 바탕으로 결과를 작성하세요.\n${inputs
          .map((input) => `- ${input.label}: {{${input.key}}}`)
          .join('\n')}`
    };
    openaiCount = 1;
  }

  if (openaiCount > 1) {
    let seen = 0;
    steps = steps.map((step) => {
      if (step.tool !== 'openai') return step;
      seen += 1;
      if (seen === 1) {
        return {
          ...step,
          promptTemplate:
            step.promptTemplate ||
            `다음 입력값을 바탕으로 결과를 작성하세요.\n${inputs
              .map((input) => `- ${input.label}: {{${input.key}}}`)
              .join('\n')}`
        };
      }
      return {
        ...step,
        tool: 'simulated',
        promptTemplate: undefined
      };
    });
  }

  if (!steps.some((step) => step.requiresApproval)) {
    const approvalIndex = Math.max(0, steps.length - 2);
    steps[approvalIndex] = {
      ...steps[approvalIndex],
      requiresApproval: true,
      type: 'condition',
      title: '결과 승인',
      description: '최종 생성 전에 승인합니다.'
    };
  }

  steps = steps.map((step, index) => {
    if (step.tool === 'openai' && !step.promptTemplate) {
      return {
        ...step,
        promptTemplate: `다음 정보를 바탕으로 결과를 작성하세요.\n${inputs
          .map((input) => `- ${input.label}: {{${input.key}}}`)
          .join('\n')}`
      };
    }
    return {
      ...step,
      id: step.id || `step_${index + 1}`,
      order: index + 1
    };
  });

  return {
    oneLiner: spec.oneLiner,
    inputs,
    steps
  };
}

function buildFallbackSteps(inputs: InputField[], mode: Pilot['recordMode']): WorkflowStep[] {
  const fieldLines = inputs.map((input) => `- ${input.label}: {{${input.key}}}`).join('\n');
  const modeText =
    mode === 'capture' ? '캡쳐 화면' : mode === 'describe' ? '업무 설명' : '프롬프트 정의';

  return [
    {
      id: 'step_1',
      order: 1,
      type: 'trigger',
      title: '요청 수집',
      description: '입력 폼 값을 수집합니다.',
      tool: 'simulated',
      requiresApproval: false
    },
    {
      id: 'step_2',
      order: 2,
      type: 'action',
      title: '컨텍스트 정리',
      description: `${modeText} 기반 컨텍스트를 정리합니다.`,
      tool: 'simulated',
      requiresApproval: false
    },
    {
      id: 'step_3',
      order: 3,
      type: 'action',
      title: '초안 준비',
      description: '최종 생성 전에 핵심 포인트를 준비합니다.',
      tool: 'simulated',
      requiresApproval: false
    },
    {
      id: 'step_4',
      order: 4,
      type: 'condition',
      title: '승인 체크포인트',
      description: '사용자 승인을 받은 뒤 최종 생성으로 진행합니다.',
      tool: 'simulated',
      requiresApproval: true
    },
    {
      id: 'step_5',
      order: 5,
      type: 'output',
      title: '최종 결과 생성',
      description: '입력값을 바탕으로 최종 결과를 생성합니다.',
      tool: 'openai',
      requiresApproval: false,
      promptTemplate: [
        '당신은 WorkPilot 실행 엔진입니다.',
        '아래 입력을 바탕으로 결과를 한국어 마크다운으로 작성하세요.',
        fieldLines
      ].join('\n')
    }
  ];
}

export async function compileWorkflow(args: {
  name: string;
  recordMode: Pilot['recordMode'];
  record: Pilot['record'];
}): Promise<{ spec: WorkflowCompileSpec; mode: 'openai' | 'fallback' }> {
  const csvInputs = ensureMinimumInputs(parseInputsCsv(args.record.inputsCsv));

  if (isOpenAIConfigured()) {
    try {
      const spec = await compileWithOpenAI({
        name: args.name,
        recordMode: args.recordMode,
        record: args.record
      });

      return {
        spec: enforceCompileConstraints(spec, csvInputs),
        mode: 'openai'
      };
    } catch {
      // fall through to deterministic fallback
    }
  }

  const fallbackOneLinerSource =
    args.record.captureNote || args.record.taskDescription || args.record.prompt || args.name;

  const fallback: WorkflowCompileSpec = {
    oneLiner: `${fallbackOneLinerSource?.trim().slice(0, 80) || '반복 업무를 자동 실행 가능한 형태로 변환합니다.'}`,
    inputs: csvInputs,
    steps: buildFallbackSteps(csvInputs, args.recordMode)
  };

  return {
    spec: enforceCompileConstraints(fallback, csvInputs),
    mode: 'fallback'
  };
}

export function buildDefaultName(name?: string): string {
  if (name?.trim()) return name.trim();
  const now = new Date();
  return `WorkPilot-${slugify(now.toISOString())}`;
}
