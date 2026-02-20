import { runWithOpenAI, isOpenAIConfigured } from '@/lib/openai';
import type { Pilot } from '@/lib/types';

function applyVariables(template: string, values: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => values[key] ?? '');
}

function buildFallbackOutput(pilot: Pilot, values: Record<string, string>): string {
  const lines = Object.entries(values).map(([key, value]) => `- **${key}**: ${value || '(비어 있음)'}`);

  return [
    `# ${pilot.name} 실행 결과`,
    '',
    `## 요약`,
    `${pilot.oneLiner}`,
    '',
    '## 입력값',
    ...(lines.length ? lines : ['- 입력값이 없습니다.']),
    '',
    '## 제안 결과',
    '1. 핵심 이슈를 3줄로 요약합니다.',
    '2. 실행 가능한 다음 액션을 우선순위로 정리합니다.',
    '3. 공유용 메시지 템플릿을 생성합니다.'
  ].join('\n');
}

export async function runWorkflow(args: {
  pilot: Pilot;
  values: Record<string, string>;
}): Promise<{ output: string; totalTokens?: number; mode: 'openai' | 'fallback' }> {
  const openAIStep = args.pilot.steps.find((step) => step.tool === 'openai');
  const baseTemplate =
    openAIStep?.promptTemplate ||
    `아래 입력으로 결과를 작성하세요.\n${args.pilot.inputs
      .map((input) => `- ${input.label}: {{${input.key}}}`)
      .join('\n')}`;

  const finalPrompt = applyVariables(baseTemplate, args.values);

  if (isOpenAIConfigured()) {
    try {
      const result = await runWithOpenAI({ prompt: finalPrompt });
      return {
        output: result.output,
        totalTokens: result.totalTokens,
        mode: 'openai'
      };
    } catch {
      // fall through to deterministic fallback
    }
  }

  return {
    output: buildFallbackOutput(args.pilot, args.values),
    mode: 'fallback'
  };
}
