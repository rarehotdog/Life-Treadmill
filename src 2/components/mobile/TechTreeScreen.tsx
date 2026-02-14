import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Trophy, Lock, RefreshCw, CheckCircle2, Circle, Loader2, Zap } from 'lucide-react';
import type { UserProfile } from '../../../App';
import { generateTechTree, isGeminiConfigured, type TechTreeNode, type TechTreeResponse } from '../../lib/gemini';

interface TechTreeScreenProps {
  profile: UserProfile;
  techTree?: TechTreeResponse | null;
  onTechTreeUpdate?: (tree: TechTreeResponse) => void;
}

// Default fallback tree
function createDefaultTree(goal: string): TechTreeResponse {
  return {
    root: {
      id: 'root',
      title: goal,
      status: 'in_progress',
      children: [
        {
          id: 'phase1',
          title: '기초 다지기',
          status: 'in_progress',
          estimatedDays: 14,
          children: [
            { id: 'q1-1', title: '현재 상태 파악하기', status: 'completed', estimatedDays: 2 },
            { id: 'q1-2', title: '필요한 자료 조사', status: 'in_progress', estimatedDays: 5 },
            { id: 'q1-3', title: '실행 계획 수립', status: 'locked', estimatedDays: 7 },
          ],
        },
        {
          id: 'phase2',
          title: '핵심 역량 개발',
          status: 'locked',
          estimatedDays: 30,
          children: [
            { id: 'q2-1', title: '스킬 학습', status: 'locked', estimatedDays: 14 },
            { id: 'q2-2', title: '실전 적용', status: 'locked', estimatedDays: 10 },
            { id: 'q2-3', title: '피드백 반영', status: 'locked', estimatedDays: 6 },
          ],
        },
        {
          id: 'phase3',
          title: '실전 & 마무리',
          status: 'locked',
          estimatedDays: 21,
          children: [
            { id: 'q3-1', title: '최종 준비', status: 'locked', estimatedDays: 10 },
            { id: 'q3-2', title: '목표 달성', status: 'locked', estimatedDays: 11 },
          ],
        },
      ],
    },
    estimatedCompletionDate: '계산 중...',
  };
}

export default function TechTreeScreen({ profile, techTree: initialTechTree, onTechTreeUpdate }: TechTreeScreenProps) {
  const [tree, setTree] = useState<TechTreeResponse>(
    initialTechTree || createDefaultTree(profile.goal)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!initialTechTree);

  // Load saved tree from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ltr_techTree');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTree(parsed);
        setHasGenerated(true);
      } catch { /* ignore */ }
    }
  }, []);

  // Generate tree with AI
  const handleGenerateTree = useCallback(async () => {
    if (!isGeminiConfigured()) return;

    setIsLoading(true);
    try {
      const result = await generateTechTree(profile);
      if (result) {
        setTree(result);
        setHasGenerated(true);
        localStorage.setItem('ltr_techTree', JSON.stringify(result));
        onTechTreeUpdate?.(result);
      }
    } catch (error) {
      console.error('TechTree generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile, onTechTreeUpdate]);

  // Calculate progress
  const countNodes = (node: TechTreeNode): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    if (node.children) {
      for (const child of node.children) {
        if (child.children && child.children.length > 0) {
          const sub = countNodes(child);
          total += sub.total;
          completed += sub.completed;
        } else {
          total++;
          if (child.status === 'completed') completed++;
        }
      }
    }
    return { total, completed };
  };

  const { total, completed } = countNodes(tree.root);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getPhaseProgress = (phase: TechTreeNode) => {
    if (!phase.children || phase.children.length === 0) return 0;
    const done = phase.children.filter(c => c.status === 'completed').length;
    return Math.round((done / phase.children.length) * 100);
  };

  return (
    <div className="px-5 pt-4 pb-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-28 font-bold text-gray-900 tracking-tight-custom leading-tight">Journey</h1>
          <p className="text-14 text-[#9CA3AF] mt-0.5">목표를 향한 여정</p>
        </div>
        {isGeminiConfigured() && (
          <button
            onClick={handleGenerateTree}
            disabled={isLoading}
            className="w-9 h-9 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-center mt-1"
          >
            {isLoading ? (
              <Loader2 className="w-[18px] h-[18px] text-[#7C3AED] animate-spin" />
            ) : (
              <RefreshCw className="w-[18px] h-[18px] text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* ── AI Generate Banner ── */}
      {!hasGenerated && isGeminiConfigured() && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleGenerateTree}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#7C3AED] to-indigo-500 rounded-2xl p-4 mb-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-15 font-bold text-white">AI 테크트리 생성</p>
              <p className="text-13 text-white/70">"{profile.goal}" 맞춤 여정을 설계합니다</p>
            </div>
          </div>
        </motion.button>
      )}

      {/* ── Root Goal Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-5 mb-4 text-white relative overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-12 text-white/60">최종 목표</p>
            <p className="text-15 font-bold leading-snug">{tree.root.title}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10">
          <div className="flex justify-between text-13 mb-1">
            <span className="text-white/70">전체 진행률</span>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <div className="flex justify-between text-12 text-white/50 mt-1.5">
            <span>{completed}/{total} 완료</span>
            <span>예상: {tree.estimatedCompletionDate}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Loading State ── */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl p-8 border border-[#F3F4F6] flex flex-col items-center mb-4"
        >
          <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-15 font-semibold text-gray-900 mb-1">AI가 여정을 설계하고 있어요</p>
          <p className="text-13 text-[#9CA3AF]">"{profile.goal}" 분석 중...</p>
        </motion.div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 mb-4 bg-white rounded-2xl p-3 border border-[#F3F4F6]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-12 text-[#6B7280]">완료</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-12 text-[#6B7280]">진행중</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-12 text-[#6B7280]">잠김</span>
        </div>
      </div>

      {/* ── Phases ── */}
      {!isLoading && (
        <div className="space-y-3">
          {tree.root.children?.map((phase, pi) => {
            const phaseProgress = getPhaseProgress(phase);
            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + pi * 0.08 }}
              >
                {/* Phase card */}
                <div className={`rounded-2xl p-4 border-2 transition-colors ${
                  phase.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200'
                    : phase.status === 'in_progress'
                    ? 'bg-white border-amber-200'
                    : 'bg-gray-50/50 border-[#E5E7EB]'
                }`}>
                  {/* Phase header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        phase.status === 'completed'
                          ? 'bg-emerald-100'
                          : phase.status === 'in_progress'
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                      }`}>
                        {phase.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : phase.status === 'in_progress' ? (
                          <Circle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-15 font-semibold ${
                          phase.status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                        }`}>{phase.title}</p>
                        {phase.estimatedDays && (
                          <p className="text-12 text-[#9CA3AF]">{phase.estimatedDays}일 예상</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-13 font-semibold ${
                      phase.status === 'completed' ? 'text-emerald-600' :
                      phase.status === 'in_progress' ? 'text-amber-600' : 'text-gray-400'
                    }`}>{phaseProgress}%</span>
                  </div>

                  {/* Phase progress bar */}
                  <div className="h-1 bg-black/5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        phase.status === 'completed' ? 'bg-emerald-500' :
                        phase.status === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'
                      }`}
                      style={{ width: `${phaseProgress}%` }}
                    />
                  </div>

                  {/* Sub-quests */}
                  <div className="space-y-1.5">
                    {phase.children?.map((quest) => (
                      <div
                        key={quest.id}
                        className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${
                          quest.status === 'locked' ? 'opacity-40' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          quest.status === 'completed' ? 'bg-emerald-500' :
                          quest.status === 'in_progress' ? 'bg-amber-400' : 'bg-gray-200'
                        }`}>
                          {quest.status === 'completed' ? (
                            <span className="text-white text-11 font-bold">✓</span>
                          ) : quest.status === 'in_progress' ? (
                            <span className="text-white text-11">●</span>
                          ) : (
                            <Lock className="w-2.5 h-2.5 text-gray-400" />
                          )}
                        </div>
                        <span className={`text-14 ${
                          quest.status === 'completed' ? 'text-emerald-700 line-through' :
                          quest.status === 'in_progress' ? 'text-gray-900 font-medium' : 'text-gray-400'
                        }`}>{quest.title}</span>
                        {quest.estimatedDays && (
                          <span className="text-11 text-[#9CA3AF] ml-auto">{quest.estimatedDays}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connector */}
                {pi < (tree.root.children?.length || 0) - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-[#E5E7EB]" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
