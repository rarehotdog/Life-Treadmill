'use client';

import { motion } from 'framer-motion';
import { Flame, CheckCircle2, Circle, Sparkles, ChevronRight } from 'lucide-react';
import type { UserProfile, Quest } from '@/types';

interface HomeScreenProps {
  profile: UserProfile;
  quests: Quest[];
  onQuestToggle: (questId: string) => void;
  completionRate: number;
}

export default function HomeScreen({
  profile,
  quests,
  onQuestToggle,
  completionRate,
}: HomeScreenProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  };

  const getTimeIcon = (timeOfDay: Quest['timeOfDay']) => {
    switch (timeOfDay) {
      case 'morning':
        return '🌅';
      case 'afternoon':
        return '☀️';
      case 'evening':
        return '🌙';
    }
  };

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">{getGreeting()}</p>
        <h1 className="text-2xl font-bold text-gray-900">{profile.name}님</h1>
      </div>

      {/* Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 mb-6 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-100 text-sm">Day {profile.currentDay}</p>
            <p className="text-lg font-semibold">{profile.goal}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
            <Flame className="w-4 h-4 text-orange-300" />
            <span className="font-bold">{profile.streak}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-emerald-100">오늘의 진행률</span>
            <span className="font-semibold">{Math.round(completionRate)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-emerald-100">예상 목표 달성</span>
          <span className="font-medium">{profile.estimatedGoalDate}</span>
        </div>
      </motion.div>

      {/* Today's Quests */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">오늘의 퀘스트</h2>
          <span className="text-sm text-gray-500">
            {quests.filter((q) => q.completed).length}/{quests.length} 완료
          </span>
        </div>

        <div className="space-y-3">
          {quests.map((quest, index) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onQuestToggle(quest.id)}
              className={`bg-white rounded-2xl p-4 border-2 transition-all cursor-pointer active:scale-[0.98] ${
                quest.completed
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-gray-100 hover:border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {quest.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getTimeIcon(quest.timeOfDay)}</span>
                    <span
                      className={`font-medium ${
                        quest.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                      }`}
                    >
                      {quest.title}
                    </span>
                  </div>
                  {quest.description && (
                    <p className="text-sm text-gray-500 mb-2">{quest.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {quest.duration}
                    </span>
                    {quest.alternative && !quest.completed && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        대체: {quest.alternative}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">AI 인사이트</p>
            <p className="text-sm text-gray-600">
              {profile.streak > 0
                ? `${profile.streak}일 연속 달성 중이에요! 이 페이스면 목표에 더 빨리 도달할 수 있어요.`
                : '오늘 첫 퀘스트를 완료하고 스트릭을 시작해보세요!'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
