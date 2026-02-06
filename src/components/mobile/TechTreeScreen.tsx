'use client';

import { motion } from 'framer-motion';
import { Trophy, Lock, Flower2, Apple, Sprout } from 'lucide-react';
import type { UserProfile } from '@/types';

interface TechTreeScreenProps {
  profile: UserProfile;
}

interface TreeNode {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'locked';
  children?: TreeNode[];
}

export default function TechTreeScreen({ profile }: TechTreeScreenProps) {
  // 예시 테크트리 데이터
  const techTree: TreeNode = {
    id: 'root',
    title: profile.goal,
    status: 'in_progress',
    children: [
      {
        id: 'phase1',
        title: '기초 다지기',
        status: 'in_progress',
        children: [
          { id: 'q1', title: '현재 상태 점검', status: 'completed' },
          { id: 'q2', title: '자료 수집', status: 'in_progress' },
          { id: 'q3', title: '계획 수립', status: 'locked' },
        ],
      },
      {
        id: 'phase2',
        title: '본격 실행',
        status: 'locked',
        children: [
          { id: 'q4', title: '핵심 역량 개발', status: 'locked' },
          { id: 'q5', title: '실전 연습', status: 'locked' },
        ],
      },
      {
        id: 'phase3',
        title: '마무리',
        status: 'locked',
        children: [
          { id: 'q6', title: '최종 점검', status: 'locked' },
          { id: 'q7', title: '목표 달성!', status: 'locked' },
        ],
      },
    ],
  };

  const getStatusIcon = (status: TreeNode['status']) => {
    switch (status) {
      case 'completed':
        return <Apple className="w-5 h-5 text-emerald-500" />;
      case 'in_progress':
        return <Flower2 className="w-5 h-5 text-yellow-500" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusEmoji = (status: TreeNode['status']) => {
    switch (status) {
      case 'completed':
        return '🍎';
      case 'in_progress':
        return '🌸';
      case 'locked':
        return '🔒';
    }
  };

  const getStatusStyle = (status: TreeNode['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-300 text-emerald-700';
      case 'in_progress':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      case 'locked':
        return 'bg-gray-50 border-gray-200 text-gray-400';
    }
  };

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">테크트리</h1>
        <p className="text-gray-500 text-sm">목표를 향한 여정을 확인하세요</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 bg-white rounded-2xl p-3 border border-gray-100">
        <div className="flex items-center gap-1.5">
          <span>🍎</span>
          <span className="text-xs text-gray-600">완료</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🌸</span>
          <span className="text-xs text-gray-600">진행중</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🔒</span>
          <span className="text-xs text-gray-600">잠김</span>
        </div>
      </div>

      {/* Root Goal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 mb-4 text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-emerald-100 text-xs">최종 목표</p>
            <p className="font-bold text-lg">{techTree.title}</p>
          </div>
        </div>
      </motion.div>

      {/* Tree Phases */}
      <div className="space-y-4">
        {techTree.children?.map((phase, phaseIndex) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: phaseIndex * 0.1 }}
          >
            {/* Phase Header */}
            <div
              className={`rounded-2xl p-4 border-2 ${getStatusStyle(phase.status)}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{getStatusEmoji(phase.status)}</span>
                <span className="font-semibold">{phase.title}</span>
              </div>

              {/* Phase Quests */}
              <div className="space-y-2 ml-2">
                {phase.children?.map((quest, questIndex) => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: phaseIndex * 0.1 + questIndex * 0.05 }}
                    className={`flex items-center gap-2 p-2 rounded-xl ${
                      quest.status === 'locked' ? 'opacity-50' : ''
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        quest.status === 'completed'
                          ? 'bg-emerald-100'
                          : quest.status === 'in_progress'
                          ? 'bg-yellow-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      {quest.status === 'completed' ? (
                        <span className="text-sm">✓</span>
                      ) : quest.status === 'in_progress' ? (
                        <span className="text-sm">●</span>
                      ) : (
                        <Lock className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        quest.status === 'completed'
                          ? 'text-emerald-700 line-through'
                          : quest.status === 'in_progress'
                          ? 'text-yellow-700 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {quest.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Connector Line */}
            {phaseIndex < (techTree.children?.length || 0) - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-0.5 h-4 bg-gray-200" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
