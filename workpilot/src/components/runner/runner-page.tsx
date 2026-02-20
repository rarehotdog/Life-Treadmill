'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { AuditLogList } from '@/components/runner/audit-log-list';
import { EditPanel } from '@/components/runner/edit-panel';
import { StepList, type RunnerStepStatus } from '@/components/runner/step-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Pilot, RunLog } from '@/lib/types';

function createInitialStatuses(stepsLength: number): RunnerStepStatus[] {
  return new Array(stepsLength).fill('idle');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function RunnerPage({ pilotId }: { pilotId: string }) {
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'running' | 'waiting_approval' | 'done' | 'error'>('idle');
  const [statuses, setStatuses] = useState<RunnerStepStatus[]>([]);
  const [approvalIndex, setApprovalIndex] = useState<number | null>(null);

  const canRun = phase === 'idle' || phase === 'done' || phase === 'error';
  const waitingApproval = phase === 'waiting_approval';

  useEffect(() => {
    async function loadPilot() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pilots/${pilotId}`);
        const data = (await response.json()) as { pilot?: Pilot; runLogsLast3?: RunLog[]; error?: string };

        if (!response.ok || !data.pilot) {
          throw new Error(data.error || 'Pilot을 불러오지 못했습니다.');
        }

        setPilot(data.pilot);
        setLogs(data.runLogsLast3 ?? []);
        setStatuses(createInitialStatuses(data.pilot.steps.length));

        const initialValues: Record<string, string> = {};
        data.pilot.inputs.forEach((input) => {
          initialValues[input.key] = '';
        });
        setValues(initialValues);
      } catch (error) {
        const message = error instanceof Error ? error.message : '로딩 중 오류가 발생했습니다.';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPilot();
  }, [pilotId]);

  const firstApprovalStep = useMemo(() => {
    if (!pilot) return -1;
    return pilot.steps.findIndex((step) => step.requiresApproval);
  }, [pilot]);

  function updateStatus(index: number, status: RunnerStepStatus) {
    setStatuses((prev) => prev.map((item, idx) => (idx === index ? status : item)));
  }

  async function executeRun() {
    if (!pilot) return;

    const unfinishedIndices = pilot.steps
      .map((_, idx) => idx)
      .filter((idx) => statuses[idx] !== 'done');

    if (unfinishedIndices.length > 0) {
      updateStatus(unfinishedIndices[0], 'running');
    }

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pilotId: pilot.id,
          values
        })
      });

      const data = (await response.json()) as {
        output?: string;
        creditsLeft?: number;
        runLog?: RunLog;
        error?: string;
      };

      if (!response.ok || !data.output) {
        throw new Error(data.error || '실행에 실패했습니다.');
      }

      for (const index of unfinishedIndices) {
        updateStatus(index, 'done');
        await sleep(180);
      }

      setOutput(data.output);
      const creditsLeft = data.creditsLeft;
      if (typeof creditsLeft === 'number') {
        setPilot((prev) => (prev ? { ...prev, credits: creditsLeft } : prev));
      }
      if (data.runLog) {
        setLogs((prev) => [data.runLog!, ...prev].slice(0, 3));
      }

      setPhase('done');
      toast.success('실행이 완료되었습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '실행 중 오류가 발생했습니다.';
      setPhase('error');
      toast.error(message);
    }
  }

  async function handleRun() {
    if (!pilot || !canRun) return;

    setOutput('');
    setPhase('running');
    setApprovalIndex(null);
    setStatuses(createInitialStatuses(pilot.steps.length));

    for (let i = 0; i < pilot.steps.length; i += 1) {
      updateStatus(i, 'running');
      await sleep(280);

      if (i === firstApprovalStep && firstApprovalStep >= 0) {
        updateStatus(i, 'waiting_approval');
        setApprovalIndex(i);
        setPhase('waiting_approval');
        return;
      }

      updateStatus(i, 'done');
    }

    await executeRun();
  }

  async function handleApprove() {
    if (!pilot) return;

    setPhase('running');
    if (approvalIndex !== null) {
      updateStatus(approvalIndex, 'done');
      await sleep(180);
    }

    await executeRun();
  }

  async function handleCopyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success('결과를 복사했습니다.');
    } catch {
      toast.error('결과 복사에 실패했습니다.');
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">Pilot 로딩 중...</p>
      </main>
    );
  }

  if (!pilot) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">Pilot을 찾을 수 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{pilot.name}</h1>
          <p className="text-sm text-muted-foreground">{pilot.oneLiner}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>🪙 {pilot.credits}</Badge>
          <Badge>v{pilot.version}</Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>입력값</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pilot.inputs.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </Label>
                <Input
                  id={field.key}
                  value={values[field.key] ?? ''}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value
                    }))
                  }
                  placeholder={field.placeholder || `${field.label} 입력`}
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleRun} disabled={!canRun}>
                Run
              </Button>
              {waitingApproval ? (
                <Button variant="secondary" onClick={handleApprove}>
                  Approve
                </Button>
              ) : null}
              <Badge>
                상태:{' '}
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
          </CardContent>
        </Card>

        <StepList steps={pilot.steps} statuses={statuses} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>결과</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopyOutput} disabled={!output}>
              결과 복사
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {output ? (
            <div className="markdown-output rounded-lg border border-border bg-muted p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">실행 후 결과가 이곳에 표시됩니다.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <AuditLogList logs={logs} />
        <EditPanel
          pilot={pilot}
          onSaved={(next) => {
            setPilot(next);
            setStatuses(createInitialStatuses(next.steps.length));
          }}
        />
      </div>
    </main>
  );
}
