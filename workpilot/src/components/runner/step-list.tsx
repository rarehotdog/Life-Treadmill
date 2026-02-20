import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowStep } from '@/lib/types';

export type RunnerStepStatus = 'idle' | 'running' | 'done' | 'waiting_approval';

function labelFromStatus(status: RunnerStepStatus): string {
  if (status === 'running') return '진행 중';
  if (status === 'done') return '완료';
  if (status === 'waiting_approval') return '승인 대기';
  return '대기';
}

function classFromStatus(status: RunnerStepStatus): string {
  if (status === 'running') return 'bg-blue-500/20 text-blue-200';
  if (status === 'done') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'waiting_approval') return 'bg-amber-500/20 text-amber-200';
  return 'bg-muted text-muted-foreground';
}

export function StepList({ steps, statuses }: { steps: WorkflowStep[]; statuses: RunnerStepStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>워크플로우 단계</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {step.order}. {step.title}
              </p>
              <Badge className={classFromStatus(statuses[index] || 'idle')}>{labelFromStatus(statuses[index] || 'idle')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{step.description}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>tool: {step.tool}</span>
              {step.requiresApproval ? <span>checkpoint</span> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
