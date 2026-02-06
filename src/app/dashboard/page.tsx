'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Target,
  Flame,
  TrendingUp,
  TreeDeciduous,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DashboardPage() {
  const router = useRouter();
  const {
    techTree,
    todayQuest,
    setTodayQuest,
    stats,
    updateStats,
    onboardingData,
    addQuestToHistory,
    updateQuestInHistory,
  } = useAppStore();

  const [showAlternative, setShowAlternative] = useState(false);
  const [questStatus, setQuestStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);

  // Redirect if not onboarded
  useEffect(() => {
    if (!techTree) {
      router.push('/onboarding');
    } else if (!todayQuest && techTree.recommended_first_quest) {
      setTodayQuest(techTree.recommended_first_quest);
    }
  }, [techTree, todayQuest, setTodayQuest, router]);

  if (!techTree || !onboardingData) {
    return null;
  }

  const daysUntilDeadline = differenceInDays(
    new Date(techTree.estimated_completion_date),
    new Date()
  );

  const currentQuest = todayQuest || techTree.recommended_first_quest;

  const handleCompleteQuest = () => {
    if (!currentQuest) return;
    
    setQuestStatus('completed');
    updateStats({
      streak: stats.streak + 1,
      totalCompleted: stats.totalCompleted + 1,
      weeklyCompletionRate: Math.min(100, stats.weeklyCompletionRate + 14),
    });
    
    addQuestToHistory({
      ...currentQuest,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const handleFailQuest = () => {
    setQuestStatus('failed');
    setShowAlternative(true);
    updateStats({
      streak: 0,
      totalFailed: stats.totalFailed + 1,
    });
  };

  const handleTryAlternative = () => {
    if (currentQuest?.alternative) {
      setTodayQuest(currentQuest.alternative as typeof currentQuest);
      setQuestStatus(null);
      setShowAlternative(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                🌅 Good Morning, Tyler & Poby
              </h1>
              <p className="text-muted-foreground">
                Day {stats.totalCompleted + 1} of "{onboardingData.goal}"
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/tree')}
              className="gap-2"
            >
              <TreeDeciduous className="w-4 h-4" />
              Tech-Tree 보기
            </Button>
          </div>
        </motion.div>

        {/* Today's Quest Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass quest-card overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Target className="w-3 h-3 mr-1" />
                  TODAY'S QUEST
                </Badge>
                {currentQuest?.estimated_time && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {currentQuest.estimated_time}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {questStatus === 'completed' ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">축하합니다! 🎉</h3>
                  <p className="text-muted-foreground">
                    오늘의 퀘스트를 완료했어요. 내일 또 만나요!
                  </p>
                </div>
              ) : showAlternative && currentQuest?.alternative ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-2">
                      괜찮아요. 실패도 데이터예요. 대신 이건 어때요?
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="text-xl font-semibold mb-2">
                      {currentQuest.alternative.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {currentQuest.alternative.description}
                    </p>
                    <Button onClick={handleTryAlternative} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      대체 퀘스트로 시도하기
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-2xl font-semibold mb-3">
                      {currentQuest?.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {currentQuest?.description}
                    </p>
                    {currentQuest?.why && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-sm">
                          <span className="font-medium text-primary">왜 이게 중요할까요?</span>
                          <br />
                          {currentQuest.why}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-primary to-accent"
                      onClick={handleCompleteQuest}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      완료했어요!
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setShowAlternative(true)}
                    >
                      나중에
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={handleFailQuest}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.streak}일</p>
                  <p className="text-xs text-muted-foreground">연속 달성</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.weeklyCompletionRate}%</p>
                  <p className="text-xs text-muted-foreground">이번 주 완료율</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                  <p className="text-xs text-muted-foreground">총 완료</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">D-{daysUntilDeadline}</p>
                  <p className="text-xs text-muted-foreground">목표까지</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Goal Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TreeDeciduous className="w-5 h-5 text-primary" />
                목표 진행 상황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{onboardingData.goal}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(techTree.estimated_completion_date), 'yyyy년 M월 d일', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                  <Progress value={Math.min(100, (stats.totalCompleted / 30) * 100)} className="h-2" />
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/tree')}
                  >
                    Tech-Tree에서 전체 경로 보기
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
