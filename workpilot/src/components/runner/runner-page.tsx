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
import { RunnerWorkflowMap } from '@/components/workflow/runner-workflow-map';
import { cn } from '@/lib/utils';
import type { Pilot, RunLog } from '@/lib/types';

function createInitialStatuses(stepsLength: number): RunnerStepStatus[] {
  return new Array(stepsLength).fill('idle');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function statusText(status: RunnerStepStatus): string {
  if (status === 'running') return '진행 중';
  if (status === 'done') return '완료';
  if (status === 'waiting_approval') return '승인 대기';
  return '대기';
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
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const canRun = phase === 'idle' || phase === 'done' || phase === 'error';
  const waitingApproval = phase === 'waiting_approval';
  const draftStorageKey = useMemo(() => `workpilot:runner-draft:${pilotId}`, [pilotId]);

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
        setSelectedStepId(data.pilot.steps[0]?.id ?? null);
        setShowValidation(false);

        const initialValues: Record<string, string> = {};
        data.pilot.inputs.forEach((input) => {
          initialValues[input.key] = '';
        });

        try {
          const rawDraft = localStorage.getItem(draftStorageKey);
          if (rawDraft) {
            const parsedDraft = JSON.parse(rawDraft) as Record<string, string>;
            data.pilot.inputs.forEach((input) => {
              if (typeof parsedDraft[input.key] === 'string') {
                initialValues[input.key] = parsedDraft[input.key];
              }
            });
          } else {
            const latestRunValues = data.runLogsLast3?.[0]?.inputValues;
            if (latestRunValues) {
              data.pilot.inputs.forEach((input) => {
                if (typeof latestRunValues[input.key] === 'string') {
                  initialValues[input.key] = latestRunValues[input.key];
                }
              });
            }
          }
        } catch {
          // ignore malformed draft and continue with blank defaults
        }
        setValues(initialValues);
      } catch (error) {
        const message = error instanceof Error ? error.message : '로딩 중 오류가 발생했습니다.';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPilot();
  }, [draftStorageKey, pilotId]);

  useEffect(() => {
    if (!pilot) return;

    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(values));
    } catch {
      // ignore storage errors on private mode/quota
    }
  }, [draftStorageKey, pilot, values]);

  const firstApprovalStep = useMemo(() => {
    if (!pilot) return -1;
    return pilot.steps.findIndex((step) => step.requiresApproval);
  }, [pilot]);

  const selectedStep = useMemo(() => {
    if (!pilot || !selectedStepId) return null;
    return pilot.steps.find((step) => step.id === selectedStepId) ?? null;
  }, [pilot, selectedStepId]);

  const selectedStepStatus = useMemo(() => {
    if (!pilot || !selectedStep) return 'idle';
    const stepIndex = pilot.steps.findIndex((step) => step.id === selectedStep.id);
    if (stepIndex < 0) return 'idle';
    return statuses[stepIndex] || 'idle';
  }, [pilot, selectedStep, statuses]);

  const requiredMissingKeys = useMemo(() => {
    if (!pilot) return [];

    return pilot.inputs
      .filter((field) => field.required)
      .filter((field) => !values[field.key]?.trim())
      .map((field) => field.key);
  }, [pilot, values]);

  const requiredMissingSet = useMemo(() => new Set(requiredMissingKeys), [requiredMissingKeys]);

  function validateBeforeRun(): boolean {
    if (!pilot) return false;
    if (requiredMissingKeys.length === 0) return true;

    const missingLabels = pilot.inputs
      .filter((field) => requiredMissingSet.has(field.key))
      .map((field) => field.label)
      .slice(0, 3)
      .join(', ');

    toast.error(`필수 입력을 채워주세요: ${missingLabels}`);
    return false;
  }

  function applyInputValues(nextValues: Record<string, string>) {
    if (!pilot) return;

    const normalized: Record<string, string> = {};
    pilot.inputs.forEach((input) => {
      normalized[input.key] = nextValues[input.key] ?? '';
    });
    setValues(normalized);
  }

  function handleUseLatestInputs() {
    if (!logs.length) {
      toast.error('최근 실행 이력이 없습니다.');
      return;
    }

    applyInputValues(logs[0].inputValues);
    toast.success('최근 실행 입력값을 불러왔습니다.');
  }

  function handleResetInputs() {
    if (!pilot) return;

    const resetValues: Record<string, string> = {};
    pilot.inputs.forEach((input) => {
      resetValues[input.key] = '';
    });
    setValues(resetValues);
    setShowValidation(false);
    toast.success('입력값을 초기화했습니다.');
  }

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
    setShowValidation(true);

    if (!validateBeforeRun()) {
      return;
    }

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
                  className={cn(showValidation && requiredMissingSet.has(field.key) ? 'border-red-400/80 focus-visible:ring-red-400/70' : null)}
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

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleUseLatestInputs}>
                최근 실행값 불러오기
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleResetInputs}>
                입력 초기화
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">입력값은 현재 브라우저에 자동 저장됩니다.</p>

            {showValidation && requiredMissingKeys.length > 0 ? (
              <p className="text-xs text-red-300">필수 입력 {requiredMissingKeys.length}개가 누락되었습니다.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <RunnerWorkflowMap
            steps={pilot.steps}
            statuses={statuses}
            phase={phase}
            outputReady={Boolean(output)}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
          />
          <StepList
            steps={pilot.steps}
            statuses={statuses}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
          />

          {selectedStep ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">선택 단계 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="font-medium">
                  {selectedStep.order}. {selectedStep.title}
                </p>
                <p className="text-muted-foreground">{selectedStep.description}</p>
                <p className="text-muted-foreground">
                  상태: {statusText(selectedStepStatus)} | type: {selectedStep.type} | tool: {selectedStep.tool} | approval:{' '}
                  {selectedStep.requiresApproval ? '필요' : '불필요'}
                </p>
                {selectedStep.promptTemplate ? (
                  <pre className="overflow-auto rounded-md border border-border bg-muted p-2 text-[11px] leading-relaxed">
                    {selectedStep.promptTemplate}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
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
            setSelectedStepId((prev) => (prev && next.steps.some((step) => step.id === prev) ? prev : next.steps[0]?.id ?? null));
          }}
        />
      </div>
    </main>
  );
}
