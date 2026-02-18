import { motion } from 'motion/react';
import { CheckCircle2, Circle, Mic, Plus, Share2, X } from 'lucide-react';
import type { Quest, UserProfile } from '../../types/app';
import type { UserStats } from '../../lib/gamification';
import { Badge, Button, Card, CardContent, Progress } from '../ui';
import AIInsight from './AIInsight';
import EisenhowerMatrix from './EisenhowerMatrix';
import GitHubContributionChart from './widgets/GitHubContributionChart';
import YearProgressWidget from './widgets/YearProgressWidget';

interface HomeScreenProps {
  profile: UserProfile;
  quests: Quest[];
  onQuestToggle: (questId: string) => void;
  onQuestFail?: (questId: string) => void;
  completionRate: number;
  isGeneratingQuests?: boolean;
  onRegenerateQuests?: () => void;
  aiMessage?: string | null;
  isAiEnabled?: boolean;
  stats: UserStats;
  energy?: number;
  onOpenShare?: () => void;
  onOpenEnergy?: () => void;
  onOpenFutureSelf?: () => void;
  onOpenVoiceCheckIn?: () => void;
  futureSelfPrompt?: string;
  latestVoiceCheckIn?: string;
}

function buildContributionData(seed: number): number[][] {
  const weeks = 24;
  const data: number[][] = [];
  let value = Math.max(1, seed);

  for (let week = 0; week < weeks; week += 1) {
    const row: number[] = [];
    for (let day = 0; day < 7; day += 1) {
      value = (value * 1664525 + 1013904223) % 4294967296;
      row.push(value % 5);
    }
    data.push(row);
  }

  return data;
}

export default function HomeScreen({
  profile,
  quests,
  onQuestToggle,
  onQuestFail,
  completionRate,
  isGeneratingQuests,
  onRegenerateQuests,
  aiMessage,
  isAiEnabled,
  stats,
  energy,
  onOpenShare,
  onOpenEnergy,
  onOpenFutureSelf,
  onOpenVoiceCheckIn,
  futureSelfPrompt,
  latestVoiceCheckIn,
}: HomeScreenProps) {
  void futureSelfPrompt;
  void latestVoiceCheckIn;

  const today = new Date();
  const nextQuest = quests.find((quest) => !quest.completed);
  const completedToday = quests.filter((quest) => quest.completed).length;
  const dayLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  const getDDay = () => {
    if (!profile.deadline || profile.deadline === '무제한') return '∞';

    const deadline = new Date(profile.deadline);
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-Day';
    return `D+${Math.abs(diff)}`;
  };

  const timeOfDay: 'morning' | 'afternoon' | 'evening' =
    today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening';

  return (
    <div data-testid="screen-home" className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white">
        <div className="screen-wrap-tight pb-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="heading-1 text-gray-900">Daily</h1>
              <p className="body-14 mt-0.5 text-gray-500">{dayLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenVoiceCheckIn ? (
                <Button
                  data-testid="open-voice-checkin"
                  onClick={onOpenVoiceCheckIn}
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gray-100"
                >
                  <Mic size={18} className="text-gray-600" />
                </Button>
              ) : null}
              {onOpenShare ? (
                <Button
                  data-testid="open-share-card"
                  onClick={onOpenShare}
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gray-100"
                >
                  <Share2 size={18} className="text-gray-600" />
                </Button>
              ) : null}
              <Button
                data-testid="open-future-self"
                onClick={onOpenFutureSelf}
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              >
                <Plus size={20} className="text-white" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="px-3 py-2">
                <p className="mb-0.5 text-xs text-blue-600">Today</p>
                <p className="text-lg font-bold text-blue-900">{completedToday}/{quests.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="px-3 py-2">
                <p className="mb-0.5 text-xs text-orange-600">Streak</p>
                <p className="text-lg font-bold text-orange-900">{stats.currentStreak} 🔥</p>
              </CardContent>
            </Card>
            <Button
              data-testid="open-energy-checkin"
              onClick={onOpenEnergy}
              variant="ghost"
              className="h-auto rounded-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100 px-3 py-2 text-left hover:bg-gradient-to-br"
            >
              <span>
                <p className="mb-0.5 text-xs text-purple-600">{energy ? 'Energy' : 'D-Day'}</p>
                <p className="text-lg font-bold text-purple-900">{energy ? `${energy}/5` : getDDay()}</p>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="screen-wrap-tight space-y-4">
        <AIInsight currentQuest={nextQuest} completionRate={completionRate} timeOfDay={timeOfDay} />

        <YearProgressWidget currentDay={profile.currentDay} goalId={profile.goal || 'default'} />

        <GitHubContributionChart data={buildContributionData(stats.currentStreak + profile.currentDay)} streak={stats.currentStreak} />

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
          <CardContent className="card-padding">
            <p className="caption-12 mb-1 text-white/80">Current Goal</p>
            <h3 className="heading-3 mb-3">{profile.goal}</h3>
            <Progress value={completionRate} className="h-2 bg-white/25 [&>div]:bg-white" />
            <div className="mt-2 flex items-center justify-between body-13 text-white/85">
              <span>Day {profile.currentDay}</span>
              <span>{profile.deadline === '무제한' ? '무제한' : getDDay()}</span>
            </div>
          </CardContent>
        </Card>

        <EisenhowerMatrix quests={quests} onQuestToggle={onQuestToggle} />

        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="heading-2 text-gray-900">Today's Quest</h2>
            <Button
              onClick={isAiEnabled && onRegenerateQuests ? onRegenerateQuests : undefined}
              variant="link"
              className="h-auto p-0 text-sm font-semibold text-blue-600"
            >
              + 새로고침
            </Button>
          </div>

          {isGeneratingQuests ? (
            <Card className="rounded-2xl border-gray-200 bg-white">
              <CardContent className="flex flex-col items-center p-6">
                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-gray-500">AI가 퀘스트를 생성하고 있어요...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {quests.map((quest) => (
                <motion.button
                  key={quest.id}
                  data-testid={`quest-item-${quest.id}`}
                  onClick={() => onQuestToggle(quest.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    quest.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {quest.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-300" />}
                    </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`mb-1 body-15 font-semibold ${quest.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {quest.title}
                    </h4>
                    {quest.description ? (
                      <p className={`mb-2 body-13 ${quest.completed ? 'text-gray-300' : 'text-gray-600'}`}>{quest.description}</p>
                    ) : null}
                    <Badge className="rounded-full bg-blue-50 text-blue-600">{quest.duration}</Badge>
                  </div>
                    {!quest.completed && onQuestFail ? (
                      <Button
                        data-testid={`quest-fail-${quest.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onQuestFail(quest.id);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-red-50 p-0 hover:bg-red-50"
                      >
                        <X size={14} className="text-red-400" />
                      </Button>
                    ) : null}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {aiMessage ? (
          <Card className="rounded-xl border border-purple-100 bg-white">
            <CardContent className="p-3">
              <p className="body-14 text-gray-700">{aiMessage}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
