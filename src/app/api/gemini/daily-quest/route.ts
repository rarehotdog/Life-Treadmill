import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TechTree, DailyQuestResponse } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface DailyQuestRequest {
  techTree: TechTree;
  yesterdayStatus: 'completed' | 'failed' | 'skipped' | null;
  recentLogs: string[];
  routineTime: 'morning' | 'evening';
}

export async function POST(request: NextRequest) {
  try {
    const { techTree, yesterdayStatus, recentLogs, routineTime }: DailyQuestRequest =
      await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(generateMockDailyQuest(techTree, yesterdayStatus));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `You are a personal life coach AI. Based on the user's context and tech-tree, recommend today's most impactful quest.

Tech-Tree: ${JSON.stringify(techTree)}
Yesterday's Quest Status: ${yesterdayStatus || 'No quest yesterday'}
Recent Context Logs: ${recentLogs.join('\n') || 'None'}
Routine Preference: ${routineTime}
Current Date: ${new Date().toISOString().split('T')[0]}

${
  yesterdayStatus === 'failed'
    ? `
The user failed yesterday's quest. Be understanding and suggest:
1. An alternative quest that achieves similar progress but is easier
2. A recovery plan that doesn't feel punishing
`
    : ''
}

Return ONLY valid JSON with this structure:
{
  "today_quest": {
    "id": "quest-${Date.now()}",
    "goal_id": "root",
    "title": "Specific task title in Korean",
    "description": "Clear, step-by-step description in Korean",
    "why": "Why this quest moves you forward today (Korean)",
    "estimated_time": "XX분",
    "status": "pending",
    "scheduled_date": "${new Date().toISOString().split('T')[0]}",
    "alternative": {
      "id": "alt-${Date.now()}",
      "title": "Easier alternative in Korean",
      "description": "Description in Korean",
      "estimated_time": "XX분"
    }
  },
  "message": "Personalized ${routineTime === 'morning' ? 'morning' : 'evening'} message in Korean, addressing the user warmly and explaining why this quest matters today",
  "stats": {
    "streak": 0,
    "weekly_completion_rate": 0,
    "estimated_goal_date": "${techTree.estimated_completion_date}"
  }
}

Rules:
1. Message should be warm, encouraging, in Korean
2. Quest should be specific and completable today
3. Always provide an easier alternative
4. If failed yesterday, be understanding, not punishing
5. Return ONLY valid JSON`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const dailyQuest: DailyQuestResponse = JSON.parse(cleaned);

    return NextResponse.json(dailyQuest);
  } catch (error) {
    console.error('Failed to generate daily quest:', error);
    
    // Return mock data on error
    return NextResponse.json(
      generateMockDailyQuest(
        { root: { id: 'root', title: '목표', status: 'in_progress' }, estimated_completion_date: '' },
        null
      )
    );
  }
}

function generateMockDailyQuest(
  techTree: TechTree,
  yesterdayStatus: 'completed' | 'failed' | 'skipped' | null
): DailyQuestResponse {
  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const baseQuest = {
    id: `quest-${Date.now()}`,
    goal_id: 'root',
    title: '오늘의 한 걸음: 25분 집중 세션',
    description:
      '타이머를 25분 맞추고, 목표와 관련된 작업에 집중해보세요.\n\n1. 방해 요소 제거 (알림 끄기)\n2. 25분 동안 한 가지만 집중\n3. 5분 휴식 후 기록 남기기',
    why: '완벽한 계획보다 작은 실행이 중요해요. 25분이면 충분히 의미 있는 진전을 만들 수 있어요.',
    estimated_time: '25분',
    status: 'pending' as const,
    scheduled_date: today,
    alternative: {
      id: `alt-${Date.now()}`,
      goal_id: 'root',
      title: '더 쉬운 버전: 5분 마이크로 액션',
      description: '딱 5분만! 목표와 관련된 가장 작은 행동 하나를 해보세요.',
      why: '5분도 0분보다 낫죠. 시작하면 더 하고 싶어질 거예요.',
      estimated_time: '5분',
      status: 'pending' as const,
      scheduled_date: today,
    },
  };

  let message = `${greeting}! ☀️\n\n`;

  if (yesterdayStatus === 'failed') {
    message += `어제는 조금 어려웠나봐요. 괜찮아요, 그것도 데이터예요.\n오늘은 더 작게 시작해볼까요? 작은 성공이 쌓이면 큰 변화가 되니까요.`;
  } else if (yesterdayStatus === 'completed') {
    message += `어제 퀘스트 완료, 멋져요! 🎉\n오늘도 그 기세로 한 걸음 더 나아가봐요.`;
  } else {
    message += `"${techTree.root.title}"을 향한 여정, 오늘도 함께해요.\n한 번에 다 하려고 하지 마세요. 오늘의 한 걸음에만 집중하면 돼요.`;
  }

  return {
    today_quest: baseQuest,
    message,
    stats: {
      streak: yesterdayStatus === 'completed' ? 1 : 0,
      weekly_completion_rate: 0,
      estimated_goal_date: techTree.estimated_completion_date || today,
    },
  };
}
