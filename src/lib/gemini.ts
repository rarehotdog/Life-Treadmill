import { GoogleGenerativeAI } from '@google/generative-ai';
import { isFlagEnabled } from '../config/flags';
import { trackError, trackEvent, trackTiming } from './telemetry';
import type { Quest, UserProfile } from '../types/app';

// ── Init ──
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI?.getGenerativeModel({ model: 'gemini-2.0-flash' });

const AI_TIMEOUT_MS = Number(import.meta.env.VITE_GEMINI_TIMEOUT_MS ?? 12000);
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000;

let consecutiveFailures = 0;
let circuitOpenedUntil = 0;

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenedUntil;
}

function registerFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenedUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    trackEvent('ai.circuit_opened', {
      failures: consecutiveFailures,
      cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
    });
  }
}

function registerSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenedUntil = 0;
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY && API_KEY !== 'your_api_key_here';
}

function parseJSON<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`Gemini timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function guardedGenerateContent(prompt: string, eventName: string): Promise<string | null> {
  if (!model) return null;

  const guardrailsEnabled = isFlagEnabled('ai_guardrails_v2');
  if (guardrailsEnabled && isCircuitOpen()) {
    trackEvent('ai.circuit_blocked', {
      eventName,
      openedUntil: circuitOpenedUntil,
    });
    return null;
  }

  const startedAt = performance.now();

  try {
    const response = guardrailsEnabled
      ? await withTimeout(model.generateContent(prompt), AI_TIMEOUT_MS)
      : await model.generateContent(prompt);

    registerSuccess();

    trackTiming('ai.generate.success', performance.now() - startedAt, {
      eventName,
    });

    return response.response.text();
  } catch (error) {
    if (guardrailsEnabled) {
      registerFailure();
    }

    trackError(error, {
      eventName,
      guardrailsEnabled,
    });

    return null;
  }
}

function isValidNodeStatus(status: string): status is TechTreeNode['status'] {
  return status === 'completed' || status === 'in_progress' || status === 'locked';
}

function isValidTechTreeNode(node: unknown): node is TechTreeNode {
  if (!node || typeof node !== 'object') return false;

  const candidate = node as Partial<TechTreeNode>;
  if (typeof candidate.id !== 'string') return false;
  if (typeof candidate.title !== 'string') return false;
  if (typeof candidate.status !== 'string' || !isValidNodeStatus(candidate.status)) return false;

  if (candidate.estimatedDays !== undefined && typeof candidate.estimatedDays !== 'number') {
    return false;
  }

  if (candidate.children !== undefined && !Array.isArray(candidate.children)) {
    return false;
  }

  if (candidate.children) {
    return candidate.children.every((child) => isValidTechTreeNode(child));
  }

  return true;
}

function isValidTechTreeResponse(value: unknown): value is TechTreeResponse {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TechTreeResponse>;
  return (
    typeof candidate.estimatedCompletionDate === 'string' &&
    isValidTechTreeNode(candidate.root)
  );
}

function isValidQuest(value: unknown): value is Quest {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<Quest>;
  const validTimeOfDay =
    candidate.timeOfDay === 'morning' ||
    candidate.timeOfDay === 'afternoon' ||
    candidate.timeOfDay === 'evening';

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.duration === 'string' &&
    typeof candidate.completed === 'boolean' &&
    validTimeOfDay
  );
}

function isValidFailureRootCause(cause: string): cause is FailureAnalysis['rootCause'] {
  return (
    cause === 'time' ||
    cause === 'motivation' ||
    cause === 'difficulty' ||
    cause === 'environment' ||
    cause === 'other'
  );
}

function isValidFailureAnalysis(value: unknown): value is FailureAnalysis {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FailureAnalysis>;

  return (
    typeof candidate.rootCause === 'string' &&
    isValidFailureRootCause(candidate.rootCause) &&
    typeof candidate.explanation === 'string' &&
    typeof candidate.encouragement === 'string' &&
    isValidQuest(candidate.recoveryQuest)
  );
}

// ── Tech Tree ──
export interface TechTreeNode {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'locked';
  estimatedDays?: number;
  children?: TechTreeNode[];
}

export interface TechTreeResponse {
  root: TechTreeNode;
  estimatedCompletionDate: string;
}

export interface QuestGenerationContext {
  energy?: number;
  voiceCheckIn?: string;
  recentFailurePattern?: string;
}

export async function generateTechTree(profile: UserProfile): Promise<TechTreeResponse | null> {
  if (!model) return null;

  const today = getTodayString();

  const prompt = `당신은 목표 설계 전문 AI입니다. 사용자의 목표를 분석하여 단계별 테크트리를 설계해주세요.

## 사용자 정보
- 목표: ${profile.goal}
- 마감일: ${profile.deadline || '없음'}
- 제약 조건: ${profile.constraints || '없음'}
- 현재 진행일: Day ${profile.currentDay}
- 오늘 날짜: ${today}

## 응답 형식 (순수 JSON만, 설명 없이)
{
  "root": {
    "id": "root",
    "title": "${profile.goal}",
    "status": "in_progress",
    "children": [
      {
        "id": "phase1",
        "title": "1단계 제목 (구체적으로)",
        "status": "in_progress",
        "estimatedDays": 14,
        "children": [
          {"id": "q1-1", "title": "구체적 세부 퀘스트", "status": "completed", "estimatedDays": 3},
          {"id": "q1-2", "title": "구체적 세부 퀘스트", "status": "in_progress", "estimatedDays": 5},
          {"id": "q1-3", "title": "구체적 세부 퀘스트", "status": "locked", "estimatedDays": 6}
        ]
      }
    ]
  },
  "estimatedCompletionDate": "YYYY-MM-DD"
}

## 규칙
1. 3-5개의 주요 단계(phase)를 생성
2. 각 단계에 2-4개의 세부 퀘스트 포함
3. 첫 단계의 첫 퀘스트만 completed, 다음 퀘스트는 in_progress, 나머지는 locked
4. Day ${profile.currentDay}이면 그에 맞는 진행 상태 반영
5. 제목은 한국어로, 구체적이고 실행 가능하게
6. estimatedDays는 현실적으로 계산
7. 목표 "${profile.goal}"에 정확히 맞는 전문적인 단계로 설계`;

  const raw = await guardedGenerateContent(prompt, 'generateTechTree');
  if (!raw) return null;

  const parsed = parseJSON<TechTreeResponse>(raw);
  if (!parsed || !isValidTechTreeResponse(parsed)) {
    trackEvent('ai.generate_tree_failed', {
      reason: 'invalid_response',
    });
    return null;
  }

  trackEvent('ai.generate_tree', {
    rootTitle: parsed.root.title,
  });

  return parsed;
}

// ── Personalized Quests ──
export async function generatePersonalizedQuests(
  profile: UserProfile,
  techTree?: TechTreeResponse | null,
  context?: QuestGenerationContext,
): Promise<Quest[] | null> {
  if (!model) return null;

  const treeContext = techTree
    ? `\n현재 테크트리 진행 상황: ${JSON.stringify(techTree.root.children?.map((phase) => ({
      title: phase.title,
      status: phase.status,
      currentQuest: phase.children?.find((quest) => quest.status === 'in_progress')?.title,
    })) || [])}`
    : '';
  const contextHint = context
    ? `\n추가 맥락:\n- 현재 에너지(1-5): ${context.energy ?? 'unknown'}\n- 최근 음성 체크인: ${context.voiceCheckIn || '없음'}\n- 최근 실패 패턴: ${context.recentFailurePattern || 'unknown'}`
    : '';

  const prompt = `당신은 개인 성장 코치 AI입니다. 사용자의 목표와 현재 진행 상황을 바탕으로 오늘 실행할 3개의 데일리 퀘스트를 생성하세요.

## 사용자 정보
- 이름: ${profile.name}
- 목표: ${profile.goal}
- 마감일: ${profile.deadline}
- 선호 루틴: ${profile.routineTime === 'morning' ? '아침형' : '저녁형'}
- 제약 조건: ${profile.constraints}
- 현재 Day ${profile.currentDay}
- 연속 달성: ${profile.streak}일${treeContext}${contextHint}

## 응답 형식 (순수 JSON만)
{
  "quests": [
    {
      "id": "1",
      "title": "구체적인 퀘스트 제목",
      "duration": "소요 시간",
      "completed": false,
      "alternative": "더 쉬운 5분짜리 대안",
      "timeOfDay": "morning",
      "description": "이 퀘스트가 목표에 어떻게 도움되는지 1줄"
    }
  ]
}

## 규칙
1. 퀘스트는 반드시 목표 "${profile.goal}"에 직접 연결
2. 테크트리에서 현재 in_progress인 단계의 퀘스트와 연관
3. 시간대: ${profile.routineTime === 'morning' ? '첫 번째는 아침' : '첫 번째는 저녁'}, 나머지는 오후/저녁 배분
4. 각 퀘스트는 오늘 완료 가능하고 구체적이어야 함
5. alternative는 시간이 없을 때 5-10분으로 할 수 있는 축소 버전
6. Day ${profile.currentDay}에 맞는 난이도 조절 (초반엔 쉽게, 점차 어렵게)
7. 제약 조건 "${profile.constraints}" 반영
8. 에너지가 낮거나(<=2) 음성 체크인에 피곤/무기력 신호가 있으면 첫 퀘스트를 5-10분 저강도로 제안
9. 최근 실패 패턴이 있으면 같은 패턴을 피하는 대체안을 description에 명시`;

  const raw = await guardedGenerateContent(prompt, 'generatePersonalizedQuests');
  if (!raw) return null;

  const parsed = parseJSON<{ quests: Quest[] }>(raw);
  if (!parsed?.quests || !Array.isArray(parsed.quests)) {
    trackEvent('ai.generate_quests_failed', {
      reason: 'invalid_json',
    });
    return null;
  }

  const validQuests = parsed.quests
    .filter((quest) => isValidQuest(quest))
    .slice(0, 3)
    .map((quest, index) => ({
      ...quest,
      id: quest.id || String(index + 1),
      completed: false,
    }));

  if (!validQuests.length) {
    trackEvent('ai.generate_quests_failed', {
      reason: 'empty_after_validation',
    });
    return null;
  }

  trackEvent('ai.generate_quests', {
    count: validQuests.length,
  });

  return validQuests;
}

// ── AI Insight ──
export async function getAIInsight(profile: UserProfile, completionRate: number): Promise<string | null> {
  if (!model) return null;

  const prompt = `개인 성장 코치로서 짧은 인사이트를 제공하세요.

사용자: ${profile.name}
목표: ${profile.goal}
Day ${profile.currentDay}, 연속 ${profile.streak}일, 오늘 완료율 ${completionRate}%

한국어로 1-2문장. 따뜻하고 통찰력 있게. JSON 없이 텍스트만.`;

  const raw = await guardedGenerateContent(prompt, 'getAIInsight');
  if (!raw) return null;

  return raw.trim();
}

// ── Failure Analysis ──
export interface FailureAnalysis {
  rootCause: 'time' | 'motivation' | 'difficulty' | 'environment' | 'other';
  explanation: string;
  recoveryQuest: Quest;
  encouragement: string;
}

export type FailureReasonCode = 'time' | 'motivation' | 'difficulty' | 'environment' | 'health' | 'other';

export interface FailureContext {
  reasonCode: FailureReasonCode;
  reasonText: string;
  energy?: number;
  remainingMinutes?: number;
}

export async function analyzeFailure(
  quest: Quest,
  context: FailureContext,
  profile: UserProfile,
): Promise<FailureAnalysis | null> {
  if (!model) return null;

  const prompt = `사용자가 퀘스트를 완료하지 못했습니다. 공감하며 분석하고 회복 방안을 제안하세요.

실패한 퀘스트: ${quest.title}
사용자 이유 코드: ${context.reasonCode}
사용자 이유 상세: ${context.reasonText}
목표: ${profile.goal}
현재 에너지(1-5): ${context.energy ?? 'unknown'}
오늘 남은 시간(분): ${context.remainingMinutes ?? 'unknown'}

JSON 형식으로만 응답:
{
  "rootCause": "time" | "motivation" | "difficulty" | "environment" | "other",
  "explanation": "공감하며 분석 (한국어)",
  "recoveryQuest": {
    "id": "recovery-1",
    "title": "5-10분 대안 퀘스트",
    "duration": "10분",
    "completed": false,
    "timeOfDay": "morning",
    "description": "이 행동이 어떻게 도움되는지"
  },
  "encouragement": "따뜻한 격려 (한국어 2-3문장)"
}`;

  const raw = await guardedGenerateContent(prompt, 'analyzeFailure');
  if (!raw) return null;

  const parsed = parseJSON<FailureAnalysis>(raw);
  if (!parsed || !isValidFailureAnalysis(parsed)) {
    return null;
  }

  return {
    ...parsed,
    recoveryQuest: {
      ...parsed.recoveryQuest,
      timeOfDay: quest.timeOfDay,
      completed: false,
    },
  };
}
