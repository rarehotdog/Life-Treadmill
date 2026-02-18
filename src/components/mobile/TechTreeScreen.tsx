import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, Lock, RefreshCw, CheckCircle2, Circle, Loader2, Zap } from 'lucide-react';
import type { UserProfile } from '../../types/app';
import { generateTechTree, isGeminiConfigured, type TechTreeNode, type TechTreeResponse } from '../../lib/gemini';
import { getItemJSON, setItemJSON, STORAGE_KEYS } from '../../lib/app-storage';
import { Button, Card, CardContent, Progress } from '../ui';

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

function buildStatusMap(root: TechTreeNode): Record<string, TechTreeNode['status']> {
  const map: Record<string, TechTreeNode['status']> = {};
  const stack: TechTreeNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    map[node.id] = node.status;
    if (node.children) {
      for (const child of node.children) stack.push(child);
    }
  }
  return map;
}

export default function TechTreeScreen({ profile, techTree: initialTechTree, onTechTreeUpdate }: TechTreeScreenProps) {
  const [tree, setTree] = useState<TechTreeResponse>(
    initialTechTree || createDefaultTree(profile.goal)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!initialTechTree);
  const [changedNodeIds, setChangedNodeIds] = useState<Set<string>>(new Set());
  const [showRerouteBanner, setShowRerouteBanner] = useState(false);
  const prevStatusMapRef = useRef<Record<string, TechTreeNode['status']>>({});

  // Load saved tree from localStorage
  useEffect(() => {
    const saved = getItemJSON<TechTreeResponse>(STORAGE_KEYS.techTree);
    if (!saved) return;

    setTree(saved);
    setHasGenerated(true);
  }, []);

  useEffect(() => {
    const nextStatusMap = buildStatusMap(tree.root);
    const previousStatusMap = prevStatusMapRef.current;
    const changed = new Set<string>();

    for (const [id, status] of Object.entries(nextStatusMap)) {
      if (previousStatusMap[id] && previousStatusMap[id] !== status) {
        changed.add(id);
      }
    }

    prevStatusMapRef.current = nextStatusMap;

    if (changed.size > 0) {
      setChangedNodeIds(changed);
      setShowRerouteBanner(true);

      const clearId = window.setTimeout(() => setChangedNodeIds(new Set()), 1800);
      const hideId = window.setTimeout(() => setShowRerouteBanner(false), 2600);
      return () => {
        window.clearTimeout(clearId);
        window.clearTimeout(hideId);
      };
    }
    return;
  }, [tree]);

  // Generate tree with AI
  const handleGenerateTree = useCallback(async () => {
    if (!isGeminiConfigured()) return;

    setIsLoading(true);
    try {
      const result = await generateTechTree(profile);
      if (result) {
        setTree(result);
        setHasGenerated(true);
        setItemJSON(STORAGE_KEYS.techTree, result);
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
    <div data-testid="screen-techtree" className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 screen-wrap-tight">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="heading-1 text-gray-900">Journey</h1>
            <p className="body-14 mt-0.5 text-gray-500">목표를 향한 여정</p>
          </div>
          {isGeminiConfigured() && (
            <Button
              onClick={handleGenerateTree}
              disabled={isLoading}
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full bg-gray-100"
            >
              {isLoading ? (
                <Loader2 className="w-[18px] h-[18px] text-[#7C3AED] animate-spin" />
              ) : (
                <RefreshCw className="w-[18px] h-[18px] text-gray-600" />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="screen-wrap-tight">

      {/* ── AI Generate Banner ── */}
      {!hasGenerated && isGeminiConfigured() && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleGenerateTree}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#7C3AED] to-indigo-500 rounded-2xl card-padding mb-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="body-15 font-bold text-white">AI 테크트리 생성</p>
              <p className="body-13 text-white/70">"{profile.goal}" 맞춤 여정을 설계합니다</p>
            </div>
          </div>
        </motion.button>
      )}

      {/* ── Root Goal Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mb-4"
      >
        <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <CardContent className="card-padding">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative z-10 mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="caption-12 text-white/60">최종 목표</p>
                <p className="body-15 font-bold leading-snug">{tree.root.title}</p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="mb-1 flex justify-between body-13">
                <span className="text-white/70">전체 진행률</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-white/20 [&>div]:bg-white" />
              <div className="mt-1.5 flex justify-between caption-12 text-white/50">
                <span>{completed}/{total} 완료</span>
                <span>예상: {tree.estimatedCompletionDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Reroute Banner ── */}
      {showRerouteBanner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 card-padding-sm"
        >
          <p className="body-13 font-medium text-amber-700">경로가 업데이트되었습니다. 오늘의 최적 루트로 재배치했어요.</p>
        </motion.div>
      )}

      {/* ── Loading State ── */}
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <Card className="rounded-2xl border border-[#F3F4F6] bg-white">
            <CardContent className="flex flex-col items-center p-8">
              <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
              <p className="mb-1 body-15 font-semibold text-gray-900">AI가 여정을 설계하고 있어요</p>
              <p className="body-13 text-[#9CA3AF]">"{profile.goal}" 분석 중...</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Legend ── */}
      <Card className="mb-4 rounded-2xl border border-[#F3F4F6] bg-white">
        <CardContent className="flex items-center gap-4 card-padding">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="caption-12 text-[#6B7280]">완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="caption-12 text-[#6B7280]">진행중</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-gray-300" />
            <span className="caption-12 text-[#6B7280]">잠김</span>
          </div>
        </CardContent>
      </Card>

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
                } ${changedNodeIds.has(phase.id) ? 'ring-2 ring-violet-300' : ''}`}>
                  {/* Phase header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                          <p className={`body-15 font-semibold ${
                          phase.status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                        }`}>{phase.title}</p>
                        {phase.estimatedDays && (
                          <p className="caption-12 text-[#9CA3AF]">{phase.estimatedDays}일 예상</p>
                        )}
                      </div>
                    </div>
                    <span className={`body-13 font-semibold ${
                      phase.status === 'completed' ? 'text-emerald-600' :
                      phase.status === 'in_progress' ? 'text-amber-600' : 'text-gray-400'
                    }`}>{phaseProgress}%</span>
                  </div>

                  {/* Phase progress bar */}
                  <div className="h-1 bg-black/5 rounded-full overflow-hidden mb-3 relative">
                    <motion.div
                      className={`h-full rounded-full transition-all ${
                        phase.status === 'completed' ? 'bg-emerald-500' :
                        phase.status === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${phaseProgress}%` }}
                      transition={{ duration: 0.55 }}
                    />
                    {phase.status === 'in_progress' && (
                      <motion.div
                        className="absolute top-0 h-full w-10 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        initial={{ x: '-110%' }}
                        animate={{ x: '220%' }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </div>

                  {/* Sub-quests */}
                  <div className="space-y-1.5">
                    {phase.children?.map((quest) => (
                      <div
                        key={quest.id}
                        className={`flex items-center gap-2 py-2 px-2 rounded-lg ${
                          quest.status === 'locked' ? 'opacity-40' : ''
                        } ${changedNodeIds.has(quest.id) ? 'bg-violet-50' : ''}`}
                      >
                        {changedNodeIds.has(quest.id) && (
                          <motion.div
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-violet-500"
                          />
                        )}
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
                        <span className={`body-13 ${
                          quest.status === 'completed' ? 'text-emerald-700 line-through' :
                          quest.status === 'in_progress' ? 'text-gray-900 font-medium' : 'text-gray-400'
                        }`}>{quest.title}</span>
                        {quest.estimatedDays && (
                          <span className="caption-11 text-[#9CA3AF] ml-auto">{quest.estimatedDays}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connector */}
                {pi < (tree.root.children?.length || 0) - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-[#E5E7EB] relative overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-violet-300 to-transparent"
                        initial={{ y: -10 }}
                        animate={{ y: 18 }}
                        transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
