'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Pilot, WorkflowStep } from '@/lib/types';

export function EditPanel({ pilot, onSaved }: { pilot: Pilot; onSaved: (pilot: Pilot) => void }) {
  const [oneLiner, setOneLiner] = useState(pilot.oneLiner);
  const [steps, setSteps] = useState<WorkflowStep[]>(pilot.steps);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOneLiner(pilot.oneLiner);
    setSteps(pilot.steps);
  }, [pilot]);

  function handleToggleApproval(stepId: string) {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, requiresApproval: !step.requiresApproval } : step)));
  }

  function handlePromptChange(stepId: string, promptTemplate: string) {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, promptTemplate } : step)));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/pilots/${pilot.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oneLiner,
          steps
        })
      });

      const data = (await response.json()) as { pilot?: Pilot; error?: string };
      if (!response.ok || !data.pilot) {
        throw new Error(data.error || '수정에 실패했습니다.');
      }

      onSaved(data.pilot);
      toast.success(`수정 완료 (v${data.pilot.version})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>워크플로우 편집 (버전업)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="oneLiner">One-liner</Label>
          <Input id="oneLiner" value={oneLiner} onChange={(event) => setOneLiner(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>승인 체크포인트 설정</Label>
          {steps.map((step) => (
            <div key={step.id} className="rounded-md border border-border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={step.requiresApproval}
                  onChange={() => handleToggleApproval(step.id)}
                  className="h-4 w-4"
                />
                <span>
                  {step.order}. {step.title}
                </span>
              </label>

              {step.tool === 'openai' ? (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`prompt-${step.id}`}>OpenAI Prompt Template</Label>
                  <Textarea
                    id={`prompt-${step.id}`}
                    value={step.promptTemplate ?? ''}
                    onChange={(event) => handlePromptChange(step.id, event.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? '저장 중...' : '변경 저장 (version +1)'}
        </Button>
      </CardContent>
    </Card>
  );
}
