import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { OnboardingData, TechTree } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const data: OnboardingData = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      // Return mock data if no API key
      return NextResponse.json(generateMockTechTree(data));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `You are a life planning AI. Given a user's goal and constraints, create a detailed tech-tree (skill tree) that breaks down the goal into actionable sub-goals and quests.

User Goal: ${data.goal}
Deadline: ${data.deadline}
Routine Preference: ${data.routine_time}
Constraints: ${data.constraints}
${data.existing_progress ? `Existing Progress: ${data.existing_progress}` : ''}

Create a JSON tech-tree with this EXACT structure (no markdown, just pure JSON):
{
  "root": {
    "id": "root",
    "title": "Main Goal Title",
    "status": "in_progress",
    "children": [
      {
        "id": "sub-1",
        "title": "Sub-goal 1",
        "status": "in_progress",
        "estimated_days": 30,
        "children": [
          {"id": "quest-1-1", "title": "Quest 1.1", "estimated_days": 7, "status": "pending"},
          {"id": "quest-1-2", "title": "Quest 1.2", "estimated_days": 7, "status": "locked"}
        ]
      },
      {
        "id": "sub-2",
        "title": "Sub-goal 2",
        "status": "locked",
        "estimated_days": 45,
        "children": []
      }
    ]
  },
  "recommended_first_quest": {
    "id": "first-quest",
    "goal_id": "root",
    "title": "First actionable task",
    "description": "Detailed description of what to do",
    "why": "Why this is the best first step",
    "estimated_time": "30분",
    "status": "pending",
    "scheduled_date": "${new Date().toISOString().split('T')[0]}",
    "alternative": {
      "id": "alt-first",
      "title": "Easier alternative",
      "description": "A simpler version if the main quest feels too hard",
      "estimated_time": "15분"
    }
  },
  "estimated_completion_date": "${data.deadline}"
}

Rules:
1. Break down into 3-5 major sub-goals
2. Each sub-goal should have 2-4 specific quests
3. First quest should be achievable TODAY in under 1 hour
4. Status: "pending" for first available, "locked" for dependent tasks
5. Be specific and actionable, not vague
6. Consider the user's constraints realistically
7. All text should be in Korean
8. Return ONLY valid JSON, no explanation or markdown`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON response
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const techTree: TechTree = JSON.parse(cleaned);

    return NextResponse.json(techTree);
  } catch (error) {
    console.error('Failed to generate tech tree:', error);
    
    // Return mock data on error
    const data: OnboardingData = await request.json().catch(() => ({
      goal: '목표',
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      routine_time: 'morning' as const,
      constraints: '',
    }));
    
    return NextResponse.json(generateMockTechTree(data));
  }
}

// Mock tech tree generator for demo/fallback
function generateMockTechTree(data: OnboardingData): TechTree {
  const today = new Date().toISOString().split('T')[0];
  const deadline = new Date(data.deadline);
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    root: {
      id: 'root',
      title: data.goal,
      status: 'in_progress',
      children: [
        {
          id: 'phase-1',
          title: '🎯 기초 다지기',
          status: 'in_progress',
          estimated_days: Math.floor(daysUntilDeadline * 0.3),
          children: [
            {
              id: 'quest-1-1',
              title: '현재 상태 점검하기',
              status: 'pending',
              estimated_days: 1,
            },
            {
              id: 'quest-1-2',
              title: '필요한 자료 수집하기',
              status: 'locked',
              estimated_days: 3,
            },
            {
              id: 'quest-1-3',
              title: '기초 계획 수립하기',
              status: 'locked',
              estimated_days: 2,
            },
          ],
        },
        {
          id: 'phase-2',
          title: '🚀 본격 실행',
          status: 'locked',
          estimated_days: Math.floor(daysUntilDeadline * 0.5),
          children: [
            {
              id: 'quest-2-1',
              title: '핵심 역량 개발',
              status: 'locked',
              estimated_days: 14,
            },
            {
              id: 'quest-2-2',
              title: '실전 연습',
              status: 'locked',
              estimated_days: 21,
            },
          ],
        },
        {
          id: 'phase-3',
          title: '✨ 마무리 & 검증',
          status: 'locked',
          estimated_days: Math.floor(daysUntilDeadline * 0.2),
          children: [
            {
              id: 'quest-3-1',
              title: '최종 점검',
              status: 'locked',
              estimated_days: 7,
            },
            {
              id: 'quest-3-2',
              title: '목표 달성!',
              status: 'locked',
              estimated_days: 1,
            },
          ],
        },
      ],
    },
    recommended_first_quest: {
      id: 'first-quest',
      goal_id: 'root',
      title: '오늘의 첫 걸음: 현재 상태 점검하기',
      description: `"${data.goal}"을 향한 여정의 시작입니다. 지금 나의 위치를 정확히 파악하고, 어디서부터 시작할지 정리해보세요.\n\n1. 목표와 관련해서 지금까지 해온 것들 적어보기\n2. 현재 나의 강점과 약점 파악하기\n3. 가장 먼저 해결해야 할 것 1가지 선정하기`,
      why: '목표를 향한 첫 걸음은 현재 위치를 아는 것입니다. 이것이 명확해야 올바른 방향으로 나아갈 수 있어요.',
      estimated_time: '30분',
      status: 'pending',
      scheduled_date: today,
      alternative: {
        id: 'alt-first',
        goal_id: 'root',
        title: '더 쉬운 버전: 5분 브레인덤프',
        description: '타이머 5분 맞추고, 목표와 관련해서 떠오르는 생각을 막 적어보세요. 정리 안 해도 돼요!',
        why: '완벽하게 분석하지 않아도 괜찮아요. 일단 시작하는 게 중요해요.',
        estimated_time: '5분',
        status: 'pending',
        scheduled_date: today,
      },
    },
    estimated_completion_date: data.deadline,
  };
}
