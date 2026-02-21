'use client';

import { Badge } from '@/components/ui/badge';
import { WorkflowCanvas, type WorkflowMapEdge, type WorkflowMapNode } from '@/components/workflow/workflow-canvas';
import type { RunnerStepStatus } from '@/components/runner/step-list';
import type { WorkflowStep } from '@/lib/types';

const stepPositions = [
  { x: 22, y: 30 },
  { x: 42, y: 30 },
  { x: 62, y: 30 },
  { x: 62, y: 58 },
  { x: 42, y: 58 },
  { x: 22, y: 58 }
];

function statusLabel(status: RunnerStepStatus): string {
  if (status === 'running') return '진행 중';
  if (status === 'done') return '완료';
  if (status === 'waiting_approval') return '승인 대기';
  return '대기';
}

function statusTone(status: RunnerStepStatus, requiresApproval: boolean): WorkflowMapNode['tone'] {
  if (status === 'running') return 'active';
  if (status === 'done') return 'success';
  if (status === 'waiting_approval') return 'warning';
  if (requiresApproval) return 'warning';
  return 'muted';
}

function hasProgress(status: RunnerStepStatus): boolean {
  return status === 'running' || status === 'done' || status === 'waiting_approval';
}

export function RunnerWorkflowMap({
  steps,
  statuses,
  phase,
  outputReady,
  selectedStepId,
  onSelectStep
}: {
  steps: WorkflowStep[];
  statuses: RunnerStepStatus[];
  phase: 'idle' | 'running' | 'waiting_approval' | 'done' | 'error';
  outputReady: boolean;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
}) {
  const orderedSteps = [...steps]
    .map((step, index) => ({
      step,
      status: statuses[index] || 'idle'
    }))
    .sort((a, b) => a.step.order - b.step.order)
    .slice(0, 6);

  const nodes: WorkflowMapNode[] = [
    {
      id: 'input',
      label: '입력 폼',
      caption: '동적 필드',
      x: 12,
      y: 20,
      size: 'sm',
      tone: phase === 'idle' ? 'muted' : 'info'
    },
    {
      id: 'output',
      label: '마크다운 결과',
      caption: outputReady ? '결과 준비' : '대기',
      x: 84,
      y: 58,
      size: 'sm',
      tone: outputReady ? 'success' : phase === 'error' ? 'warning' : 'muted',
      pulse: phase === 'running'
    }
  ];

  orderedSteps.forEach(({ step, status }, index) => {
    const position = stepPositions[index];
    if (!position) return;

    nodes.push({
      id: step.id,
      label: `${step.order}. ${step.title}`,
      caption: `${statusLabel(status)}${step.requiresApproval ? ' • checkpoint' : ''}`,
      x: position.x,
      y: position.y,
      size: 'sm',
      tone: statusTone(status, step.requiresApproval),
      pulse: status === 'running',
      interactive: true
    });
  });

  const edges: WorkflowMapEdge[] = [];
  if (orderedSteps.length > 0) {
    edges.push({
      from: 'input',
      to: orderedSteps[0].step.id,
      highlighted: hasProgress(orderedSteps[0].status)
    });
  }

  for (let i = 0; i < orderedSteps.length - 1; i += 1) {
    const current = orderedSteps[i];
    const next = orderedSteps[i + 1];
    edges.push({
      from: current.step.id,
      to: next.step.id,
      highlighted: hasProgress(current.status) || hasProgress(next.status)
    });
  }

  if (orderedSteps.length > 0) {
    const last = orderedSteps[orderedSteps.length - 1];
    edges.push({
      from: last.step.id,
      to: 'output',
      highlighted: outputReady || phase === 'done',
      dashed: !outputReady
    });
  }

  const stepIdSet = new Set(orderedSteps.map((item) => item.step.id));

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">실행 맵</h3>
        <Badge className="bg-slate-900 text-slate-200">
          {phase === 'idle'
            ? '대기'
            : phase === 'running'
              ? '실행 중'
              : phase === 'waiting_approval'
                ? '승인 대기'
                : phase === 'done'
                  ? '완료'
                  : '오류'}
        </Badge>
      </div>

      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        minHeightClassName="min-h-[340px]"
        selectedNodeId={selectedStepId ?? null}
        onNodeClick={
          onSelectStep
            ? (nodeId) => {
                if (!stepIdSet.has(nodeId)) return;
                onSelectStep(nodeId);
              }
            : undefined
        }
      />
    </section>
  );
}
