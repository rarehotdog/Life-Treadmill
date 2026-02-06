import { GoogleGenerativeAI } from '@google/generative-ai';
import type { OnboardingData, TechTree, Quest, DailyQuestResponse } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Tech-Tree Generation Prompt
export function generateTechTreePrompt(data: OnboardingData): string {
  return `You are a life planning AI. Given a user's goal and constraints, create a detailed tech-tree (skill tree) that breaks down the goal into actionable sub-goals and quests.

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
    "scheduled_date": "${new Date().toISOString().split('T')[0]}"
  },
  "estimated_completion_date": "YYYY-MM-DD"
}

Rules:
1. Break down into 3-5 major sub-goals
2. Each sub-goal should have 2-4 specific quests
3. First quest should be achievable TODAY in under 1 hour
4. Status: "pending" for first available, "locked" for dependent tasks
5. Be specific and actionable, not vague
6. Consider the user's constraints realistically
7. Return ONLY valid JSON, no explanation or markdown`;
}

// Daily Quest Generation Prompt
export function generateDailyQuestPrompt(
  techTree: TechTree,
  yesterdayStatus: 'completed' | 'failed' | 'skipped' | null,
  recentLogs: string[],
  routineTime: 'morning' | 'evening'
): string {
  return `You are a personal life coach AI. Based on the user's context and tech-tree, recommend today's most impactful quest.

Tech-Tree: ${JSON.stringify(techTree)}
Yesterday's Quest Status: ${yesterdayStatus || 'No quest yesterday'}
Recent Context Logs: ${recentLogs.join('\n') || 'None'}
Routine Preference: ${routineTime}
Current Date: ${new Date().toISOString().split('T')[0]}

${yesterdayStatus === 'failed' ? `
The user failed yesterday's quest. Analyze why and suggest:
1. An alternative quest that achieves similar progress
2. A recovery plan that doesn't feel punishing
` : ''}

Return ONLY valid JSON with this structure:
{
  "today_quest": {
    "id": "quest-${Date.now()}",
    "goal_id": "root",
    "title": "Specific task title",
    "description": "Clear, step-by-step description",
    "why": "Why this quest moves you forward today",
    "estimated_time": "XX분",
    "status": "pending",
    "scheduled_date": "${new Date().toISOString().split('T')[0]}",
    "alternative": {
      "id": "alt-${Date.now()}",
      "title": "Easier alternative if needed",
      "description": "Description",
      "estimated_time": "XX분"
    }
  },
  "message": "Personalized morning/evening message in Korean, addressing the user warmly and explaining why this quest matters today",
  "stats": {
    "streak": 0,
    "weekly_completion_rate": 0,
    "estimated_goal_date": "YYYY-MM-DD"
  }
}

Rules:
1. Message should be warm, encouraging, in Korean
2. Quest should be specific and completable today
3. Always provide an easier alternative
4. If failed yesterday, be understanding, not punishing`;
}

// Failure Analysis Prompt
export function generateFailureAnalysisPrompt(
  quest: Quest,
  failureReason: string,
  techTree: TechTree
): string {
  return `A user failed to complete their quest. Analyze and suggest a recovery path.

Failed Quest: ${JSON.stringify(quest)}
User's Reason: ${failureReason}
Current Tech-Tree: ${JSON.stringify(techTree)}

Return ONLY valid JSON:
{
  "analysis": {
    "root_cause": "time" | "motivation" | "difficulty" | "environment" | "other",
    "explanation": "Brief analysis in Korean"
  },
  "recovery_quest": {
    "id": "recovery-${Date.now()}",
    "title": "Smaller, achievable step",
    "description": "Description",
    "why": "Why this helps recover momentum",
    "estimated_time": "XX분",
    "status": "pending"
  },
  "tree_adjustment": {
    "node_id": "affected node id",
    "new_estimated_days": 0,
    "reason": "Why the timeline needs adjustment"
  },
  "encouragement": "Warm, understanding message in Korean"
}`;
}

// Parse Gemini response safely
export function parseGeminiResponse<T>(response: string): T | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    console.error('Raw response:', response);
    return null;
  }
}

// Generate Tech Tree
export async function generateTechTree(data: OnboardingData): Promise<TechTree | null> {
  try {
    const prompt = generateTechTreePrompt(data);
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    return parseGeminiResponse<TechTree>(response);
  } catch (error) {
    console.error('Failed to generate tech tree:', error);
    return null;
  }
}

// Generate Daily Quest
export async function generateDailyQuest(
  techTree: TechTree,
  yesterdayStatus: 'completed' | 'failed' | 'skipped' | null,
  recentLogs: string[],
  routineTime: 'morning' | 'evening'
): Promise<DailyQuestResponse | null> {
  try {
    const prompt = generateDailyQuestPrompt(techTree, yesterdayStatus, recentLogs, routineTime);
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    return parseGeminiResponse<DailyQuestResponse>(response);
  } catch (error) {
    console.error('Failed to generate daily quest:', error);
    return null;
  }
}
