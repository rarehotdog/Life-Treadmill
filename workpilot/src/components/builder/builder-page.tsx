'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BuilderWorkflowMap } from '@/components/workflow/builder-workflow-map';
import type { Pilot, RecordMode } from '@/lib/types';

type CreatePilotResponse = {
  pilot: Pilot;
  url: string;
  compileMode: 'openai' | 'fallback';
};

type BuilderTemplate = {
  id: string;
  label: string;
  mode: RecordMode;
  name: string;
  taskDescription?: string;
  prompt?: string;
  inputsCsv?: string;
  exampleInput?: string;
  exampleOutput?: string;
  captureNote?: string;
};

const builderTemplates: BuilderTemplate[] = [
  {
    id: 'weekly-report',
    label: '주간 리포트',
    mode: 'describe',
    name: '주간 리포트 자동 작성',
    taskDescription:
      '매주 금요일 17시에 지난주 주요 지표를 3줄 인사이트로 요약하고, 공유용 마크다운 포맷으로 정리한다.',
    exampleInput: '리드 20건, 전환율 24%, 이탈 고객 2건, 주요 이슈 1건',
    exampleOutput: '핵심 지표 요약 + 인사이트 + 다음 액션'
  },
  {
    id: 'sales-followup',
    label: '세일즈 팔로업',
    mode: 'prompt',
    name: '세일즈 후속 메일 작성',
    inputsCsv:
      'key,label,required,placeholder\ncompany_name,고객사 이름,true,회사명을 입력하세요\nmeeting_summary,미팅 요약,true,핵심 논의 내용을 입력하세요\nnext_action,다음 액션,true,예: 데모 일정 확정',
    prompt:
      '입력값을 바탕으로 전문적인 후속 이메일을 작성하세요. 본문은 한국어, 마지막에 다음 액션을 체크리스트로 제시하세요.',
    exampleInput: 'company_name=Acme, meeting_summary=제품 데모 긍정적, next_action=기술 검토 미팅',
    exampleOutput: '안녕하세요 ... 다음 액션: [ ] 기술 검토 미팅 확정'
  },
  {
    id: 'capture-recap',
    label: '캡처 기반 요약',
    mode: 'capture',
    name: '캡처 기반 데이터 요약',
    captureNote: '스프레드시트 화면에서 핵심 수치를 읽고 팀 공유용 요약 메시지를 만든다.',
    exampleInput: 'capture + 메모',
    exampleOutput: '요약/인사이트/리스크 3단 구성'
  }
];

export function BuilderPage() {
  const [name, setName] = useState('');
  const [recordMode, setRecordMode] = useState<RecordMode>('capture');
  const [taskDescription, setTaskDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [inputsCsv, setInputsCsv] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [captureNote, setCaptureNote] = useState('');
  const [captureFile, setCaptureFile] = useState<File | null>(null);

  const [created, setCreated] = useState<CreatePilotResponse | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const absoluteShareUrl = useMemo(() => {
    if (!created) return '';
    if (typeof window === 'undefined') return created.url;
    return new URL(created.url, window.location.origin).toString();
  }, [created]);

  const selectedStep = useMemo(() => {
    if (!created || !selectedStepId) return null;
    return created.pilot.steps.find((step) => step.id === selectedStepId) ?? null;
  }, [created, selectedStepId]);

  useEffect(() => {
    if (!created?.pilot.steps.length) {
      setSelectedStepId(null);
      return;
    }

    const firstStepId = created.pilot.steps[0].id;
    setSelectedStepId((prev) => (prev && created.pilot.steps.some((step) => step.id === prev) ? prev : firstStepId));
  }, [created]);

  function applyTemplate(template: BuilderTemplate) {
    setSelectedTemplateId(template.id);
    setRecordMode(template.mode);
    setName(template.name);
    setTaskDescription(template.taskDescription ?? '');
    setPrompt(template.prompt ?? '');
    setInputsCsv(template.inputsCsv ?? '');
    setExampleInput(template.exampleInput ?? '');
    setExampleOutput(template.exampleOutput ?? '');
    setCaptureNote(template.captureNote ?? '');
    setCaptureFile(null);
    toast.success(`'${template.label}' 템플릿을 적용했습니다.`);
  }

  function resetBuilderInputs() {
    setSelectedTemplateId(null);
    setName('');
    setRecordMode('capture');
    setTaskDescription('');
    setPrompt('');
    setInputsCsv('');
    setExampleInput('');
    setExampleOutput('');
    setCaptureNote('');
    setCaptureFile(null);
    setCreated(null);
    setSelectedStepId(null);
    toast.success('Builder 입력을 초기화했습니다.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('recordMode', recordMode);
      formData.set('taskDescription', taskDescription);
      formData.set('prompt', prompt);
      formData.set('inputsCsv', inputsCsv);
      formData.set('exampleInput', exampleInput);
      formData.set('exampleOutput', exampleOutput);
      formData.set('captureNote', captureNote);
      if (captureFile) {
        formData.set('captureFile', captureFile);
      }

      const response = await fetch('/api/pilots', {
        method: 'POST',
        body: formData
      });

      const data = (await response.json()) as CreatePilotResponse | { error: string };
      if (!response.ok) {
        throw new Error((data as { error: string }).error || '생성에 실패했습니다.');
      }

      setCreated(data as CreatePilotResponse);
      setSelectedStepId((data as CreatePilotResponse).pilot.steps[0]?.id ?? null);
      toast.success('워크플로우를 생성했습니다. 링크를 공유해 바로 실행하세요.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '생성 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!absoluteShareUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteShareUrl);
      toast.success('링크를 복사했습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="space-y-2">
        <Badge className="w-fit">WorkPilot MVP</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Record → Compile → Run</h1>
        <p className="text-sm text-muted-foreground">
          반복 업무를 한 번만 기록하면, 실행 가능한 워크플로우 링크를 즉시 생성합니다.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>데모 템플릿</CardTitle>
          <CardDescription>원클릭으로 예시 업무를 채워 바로 Compile을 테스트할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {builderTemplates.map((template) => (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              className={selectedTemplateId === template.id ? 'border-sky-300/70 bg-sky-500/10' : undefined}
              onClick={() => applyTemplate(template)}
            >
              {template.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={resetBuilderInputs}>
            입력 초기화
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Builder</CardTitle>
            <CardDescription>업무를 기록하고 Compile & Create Link를 실행하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow 이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 주간 리포트 자동 작성"
              />
            </div>

            <Tabs value={recordMode} onValueChange={(value) => setRecordMode(value as RecordMode)}>
              <TabsList className="w-full justify-start gap-1 bg-secondary">
                <TabsTrigger value="capture">Capture</TabsTrigger>
                <TabsTrigger value="describe">Describe</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
              </TabsList>

              <TabsContent value="capture" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="captureFile">스크린샷 업로드</Label>
                  <Input
                    id="captureFile"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setCaptureFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">이미지 파일만, 최대 5MB</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captureNote">캡쳐 메모</Label>
                  <Textarea
                    id="captureNote"
                    value={captureNote}
                    onChange={(event) => setCaptureNote(event.target.value)}
                    placeholder="이 화면에서 어떤 데이터를 다루는지 간단히 설명하세요"
                  />
                </div>
              </TabsContent>

              <TabsContent value="describe" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="taskDescription">업무 설명</Label>
                  <Textarea
                    id="taskDescription"
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    placeholder="예: 매주 금요일 5시 지난주 데이터 요약 후 슬랙 공유"
                    className="min-h-[140px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="prompt" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="inputsCsv">입력 필드 CSV</Label>
                  <Textarea
                    id="inputsCsv"
                    value={inputsCsv}
                    onChange={(event) => setInputsCsv(event.target.value)}
                    placeholder={"key,label,required,placeholder\\ncompany_name,고객사 이름,true,회사명을 입력하세요"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">프롬프트 지시서</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="입력값으로 어떤 결과를 생성할지 작성하세요"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exampleInput">예시 입력 (선택)</Label>
                <Textarea
                  id="exampleInput"
                  value={exampleInput}
                  onChange={(event) => setExampleInput(event.target.value)}
                  placeholder="샘플 입력 데이터"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exampleOutput">예시 출력 (선택)</Label>
                <Textarea
                  id="exampleOutput"
                  value={exampleOutput}
                  onChange={(event) => setExampleOutput(event.target.value)}
                  placeholder="원하는 출력 포맷"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '컴파일 중...' : 'Compile & Create Link'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compile 결과</CardTitle>
            <CardDescription>생성된 Steps, Inputs, 공유 링크를 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <BuilderWorkflowMap
              pilot={created?.pilot ?? null}
              recordMode={recordMode}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
            />

            <Separator />

            {!created ? (
              <p className="text-sm text-muted-foreground">아직 생성된 워크플로우가 없습니다.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">공유 링크</h3>
                    <Badge>{created.compileMode === 'openai' ? 'OpenAI compile' : 'Fallback compile'}</Badge>
                  </div>
                  <p className="break-all rounded-md border border-border bg-muted p-2 text-xs">{absoluteShareUrl}</p>
                  <Button type="button" size="sm" variant="secondary" onClick={handleCopyLink}>
                    링크 복사
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">One-liner</h3>
                  <p className="text-sm text-muted-foreground">{created.pilot.oneLiner}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">입력 필드</h3>
                  <div className="space-y-2">
                    {created.pilot.inputs.map((input) => (
                      <div key={input.key} className="rounded-md border border-border p-2 text-xs">
                        <p className="font-medium">{input.label}</p>
                        <p className="text-muted-foreground">key: {input.key}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Steps</h3>
                  <div className="space-y-2">
                    {created.pilot.steps.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        className={`w-full rounded-md border p-2 text-left text-xs transition ${
                          selectedStepId === step.id
                            ? 'border-sky-300/70 bg-sky-500/10'
                            : 'border-border hover:border-sky-300/70'
                        }`}
                        onClick={() => setSelectedStepId(step.id)}
                      >
                        <p className="font-medium">
                          {step.order}. {step.title}
                        </p>
                        <p className="text-muted-foreground">{step.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedStep ? (
                  <div className="space-y-2 rounded-lg border border-sky-300/40 bg-sky-500/5 p-3">
                    <h3 className="text-sm font-semibold">선택 단계 상세</h3>
                    <p className="text-xs text-muted-foreground">
                      type: {selectedStep.type} | tool: {selectedStep.tool} | approval:{' '}
                      {selectedStep.requiresApproval ? '필요' : '불필요'}
                    </p>
                    {selectedStep.promptTemplate ? (
                      <pre className="overflow-auto rounded-md border border-border bg-muted p-2 text-[11px] leading-relaxed">
                        {selectedStep.promptTemplate}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </main>
  );
}
