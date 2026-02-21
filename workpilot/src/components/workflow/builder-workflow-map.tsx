'use client';

import { Badge } from '@/components/ui/badge';
import { WorkflowCanvas, type WorkflowMapEdge, type WorkflowMapNode } from '@/components/workflow/workflow-canvas';
import type { Pilot, RecordMode } from '@/lib/types';

const stepPositions = [
  { x: 22, y: 30 },
  { x: 42, y: 30 },
  { x: 62, y: 30 },
  { x: 62, y: 58 },
  { x: 42, y: 58 },
  { x: 22, y: 58 }
];

function modeLabel(mode: RecordMode): string {
  if (mode === 'capture') return 'Capture';
  if (mode === 'describe') return 'Describe';
  return 'Prompt';
}

function buildDraftMap(recordMode: RecordMode): { nodes: WorkflowMapNode[]; edges: WorkflowMapEdge[] } {
  const nodes: WorkflowMapNode[] = [
    {
      id: 'capture',
      label: 'Capture',
      caption: 'Image + Note',
      x: 20,
      y: 24,
      size: 'sm',
      tone: recordMode === 'capture' ? 'active' : 'muted'
    },
    {
      id: 'describe',
      label: 'Describe',
      caption: 'Task Text',
      x: 42,
      y: 24,
      size: 'sm',
      tone: recordMode === 'describe' ? 'active' : 'muted'
    },
    {
      id: 'prompt',
      label: 'Prompt',
      caption: 'CSV + Prompt',
      x: 64,
      y: 24,
      size: 'sm',
      tone: recordMode === 'prompt' ? 'active' : 'muted'
    },
    {
      id: 'compile',
      label: 'Compile',
      caption: 'Workflow JSON',
      x: 42,
      y: 52,
      size: 'md',
      tone: 'info'
    },
    {
      id: 'api',
      label: 'POST /api/pilots',
      caption: 'create + save',
      x: 42,
      y: 78,
      size: 'md',
      tone: 'default'
    },
    {
      id: 'share',
      label: '/pilot/[id]',
      caption: 'share link',
      x: 72,
      y: 78,
      size: 'sm',
      tone: 'default'
    }
  ];

  const edges: WorkflowMapEdge[] = [
    { from: 'capture', to: 'compile', highlighted: recordMode === 'capture' },
    { from: 'describe', to: 'compile', highlighted: recordMode === 'describe' },
    { from: 'prompt', to: 'compile', highlighted: recordMode === 'prompt' },
    { from: 'compile', to: 'api', highlighted: true },
    { from: 'api', to: 'share', highlighted: true }
  ];

  return { nodes, edges };
}

function buildCompiledMap(pilot: Pilot): { nodes: WorkflowMapNode[]; edges: WorkflowMapEdge[] } {
  const sortedSteps = [...pilot.steps].sort((a, b) => a.order - b.order).slice(0, 6);
  const nodes: WorkflowMapNode[] = [
    {
      id: 'record',
      label: `Record (${modeLabel(pilot.recordMode)})`,
      caption: '입력 컨텍스트',
      x: 14,
      y: 18,
      size: 'sm',
      tone: 'info'
    },
    {
      id: 'compile',
      label: 'Compile',
      caption: 'steps + inputs',
      x: 34,
      y: 18,
      size: 'sm',
      tone: 'active'
    },
    {
      id: 'share',
      label: '/pilot/[id]',
      caption: '즉시 실행 링크',
      x: 84,
      y: 58,
      size: 'sm',
      tone: 'success'
    }
  ];

  sortedSteps.forEach((step, index) => {
    const position = stepPositions[index];
    if (!position) return;

    nodes.push({
      id: step.id,
      label: `${step.order}. ${step.title}`,
      caption: `${step.tool}${step.requiresApproval ? ' • checkpoint' : ''}`,
      x: position.x,
      y: position.y,
      size: 'sm',
      tone: step.requiresApproval ? 'warning' : step.tool === 'openai' ? 'active' : 'default',
      interactive: true
    });
  });

  const edges: WorkflowMapEdge[] = [{ from: 'record', to: 'compile', highlighted: true }];
  if (sortedSteps.length > 0) {
    edges.push({ from: 'compile', to: sortedSteps[0].id, highlighted: true });
  }
  for (let i = 0; i < sortedSteps.length - 1; i += 1) {
    edges.push({
      from: sortedSteps[i].id,
      to: sortedSteps[i + 1].id,
      highlighted: true
    });
  }
  if (sortedSteps.length > 0) {
    edges.push({ from: sortedSteps[sortedSteps.length - 1].id, to: 'share', highlighted: true });
  } else {
    edges.push({ from: 'compile', to: 'share', highlighted: true });
  }

  return { nodes, edges };
}

export function BuilderWorkflowMap({
  pilot,
  recordMode,
  selectedStepId,
  onSelectStep
}: {
  pilot: Pilot | null;
  recordMode: RecordMode;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
}) {
  const graph = pilot ? buildCompiledMap(pilot) : buildDraftMap(recordMode);
  const selectableStepIds = new Set((pilot?.steps ?? []).map((step) => step.id));

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">워크플로우 맵</h3>
        <Badge className="bg-slate-900 text-slate-200">{pilot ? 'Compiled 미리보기' : 'Draft 미리보기'}</Badge>
      </div>

      <WorkflowCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        minHeightClassName="min-h-[340px]"
        selectedNodeId={pilot ? selectedStepId ?? null : null}
        onNodeClick={
          pilot && onSelectStep
            ? (nodeId) => {
                if (!selectableStepIds.has(nodeId)) return;
                onSelectStep(nodeId);
              }
            : undefined
        }
      />

      <p className="text-xs text-muted-foreground">
        {pilot
          ? '생성된 step 흐름을 링크 실행 경로까지 시각화했습니다.'
          : '선택한 Record 모드가 Compile 경로로 이어지는 구조를 미리 보여줍니다.'}
      </p>
    </section>
  );
}
