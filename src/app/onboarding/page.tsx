'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Target, Clock, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import type { OnboardingData } from '@/types';

const questions = [
  {
    id: 'goal',
    icon: Target,
    title: '어떤 사람이 되고 싶어요?',
    subtitle: '북극성이 될 큰 목표를 알려주세요',
    placeholder: '예: Stanford MBA 합격, 10kg 감량 후 마라톤 완주, 개발자로 이직',
    type: 'textarea' as const,
  },
  {
    id: 'deadline',
    icon: Clock,
    title: '언제까지 이루고 싶어요?',
    subtitle: '현실적인 기한을 설정하면 AI가 경로를 계산해요',
    placeholder: '',
    type: 'date' as const,
  },
  {
    id: 'routine_time',
    icon: Sparkles,
    title: '루틴은 언제가 좋아요?',
    subtitle: '퀘스트를 수행할 최적의 시간대를 선택하세요',
    placeholder: '',
    type: 'choice' as const,
    choices: [
      { value: 'morning', label: '🌅 아침형', description: '하루를 시작하며 집중' },
      { value: 'evening', label: '🌙 저녁형', description: '하루를 마무리하며 집중' },
    ],
  },
  {
    id: 'existing_progress',
    icon: Upload,
    title: '이미 하고 있는 게 있나요?',
    subtitle: '기존 진행 상황을 알려주면 더 정확한 계획을 세워요 (선택)',
    placeholder: '예: GMAT 600점 보유, 매일 30분 운동 중, 기초 코딩 공부 완료',
    type: 'textarea' as const,
    optional: true,
  },
  {
    id: 'constraints',
    icon: AlertTriangle,
    title: '지금 가장 큰 제약은 뭐예요?',
    subtitle: '현실적인 제약을 알면 실행 가능한 계획을 만들어요',
    placeholder: '예: 하루 2시간만 투자 가능, 주말만 집중 가능, 예산 50만원 이내',
    type: 'textarea' as const,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setOnboardingData, setTechTree, setIsLoading, isLoading } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    goal: '',
    deadline: '',
    routine_time: '',
    existing_progress: '',
    constraints: '',
  });

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const canProceed = currentQuestion.optional || answers[currentQuestion.id]?.trim();

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - generate tech tree
      setIsLoading(true);
      
      const onboardingData: OnboardingData = {
        goal: answers.goal,
        deadline: answers.deadline,
        routine_time: answers.routine_time as 'morning' | 'evening',
        existing_progress: answers.existing_progress || undefined,
        constraints: answers.constraints,
      };

      setOnboardingData(onboardingData);

      try {
        // Call API to generate tech tree
        const response = await fetch('/api/gemini/generate-tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingData),
        });

        if (response.ok) {
          const techTree = await response.json();
          setTechTree(techTree);
          router.push('/dashboard');
        } else {
          // Use mock data for demo
          const mockTechTree = generateMockTechTree(onboardingData);
          setTechTree(mockTechTree);
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Failed to generate tech tree:', error);
        // Use mock data for demo
        const mockTechTree = generateMockTechTree(onboardingData);
        setTechTree(mockTechTree);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-1 mb-12" />

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <currentQuestion.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentQuestion.title}</h2>
                  <p className="text-muted-foreground">{currentQuestion.subtitle}</p>
                </div>
              </div>

              {/* Input based on type */}
              {currentQuestion.type === 'textarea' && (
                <Textarea
                  value={answers[currentQuestion.id]}
                  onChange={(e) =>
                    setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                  }
                  placeholder={currentQuestion.placeholder}
                  className="min-h-[120px] text-lg bg-background/50 border-border/50 focus:border-primary/50"
                />
              )}

              {currentQuestion.type === 'date' && (
                <Input
                  type="date"
                  value={answers[currentQuestion.id]}
                  onChange={(e) =>
                    setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                  }
                  className="text-lg bg-background/50 border-border/50 focus:border-primary/50"
                  min={new Date().toISOString().split('T')[0]}
                />
              )}

              {currentQuestion.type === 'choice' && currentQuestion.choices && (
                <div className="grid gap-4">
                  {currentQuestion.choices.map((choice) => (
                    <button
                      key={choice.value}
                      onClick={() =>
                        setAnswers({ ...answers, [currentQuestion.id]: choice.value })
                      }
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        answers[currentQuestion.id] === choice.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="text-lg font-medium">{choice.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {choice.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.optional && (
                <p className="text-sm text-muted-foreground mt-4">
                  * 건너뛰어도 괜찮아요
                </p>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-end mt-8">
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className="px-8"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                Tech-Tree 생성 중...
              </>
            ) : currentStep === questions.length - 1 ? (
              <>
                완료
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                다음
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mock tech tree generator for demo
function generateMockTechTree(data: OnboardingData) {
  const today = new Date().toISOString().split('T')[0];
  const deadline = new Date(data.deadline);
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    root: {
      id: 'root',
      title: data.goal,
      status: 'in_progress' as const,
      children: [
        {
          id: 'phase-1',
          title: '기초 다지기',
          status: 'in_progress' as const,
          estimated_days: Math.floor(daysUntilDeadline * 0.3),
          children: [
            {
              id: 'quest-1-1',
              title: '현재 상태 점검하기',
              status: 'pending' as const,
              estimated_days: 1,
            },
            {
              id: 'quest-1-2',
              title: '필요한 자료 수집하기',
              status: 'locked' as const,
              estimated_days: 3,
            },
            {
              id: 'quest-1-3',
              title: '기초 계획 수립하기',
              status: 'locked' as const,
              estimated_days: 2,
            },
          ],
        },
        {
          id: 'phase-2',
          title: '본격 실행',
          status: 'locked' as const,
          estimated_days: Math.floor(daysUntilDeadline * 0.5),
          children: [
            {
              id: 'quest-2-1',
              title: '핵심 역량 개발',
              status: 'locked' as const,
              estimated_days: 14,
            },
            {
              id: 'quest-2-2',
              title: '실전 연습',
              status: 'locked' as const,
              estimated_days: 21,
            },
          ],
        },
        {
          id: 'phase-3',
          title: '마무리 & 검증',
          status: 'locked' as const,
          estimated_days: Math.floor(daysUntilDeadline * 0.2),
          children: [
            {
              id: 'quest-3-1',
              title: '최종 점검',
              status: 'locked' as const,
              estimated_days: 7,
            },
            {
              id: 'quest-3-2',
              title: '목표 달성',
              status: 'locked' as const,
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
      description: `${data.goal}을 향한 여정의 시작입니다. 지금 나의 위치를 정확히 파악하고, 어디서부터 시작할지 정리해보세요.`,
      why: '목표를 향한 첫 걸음은 현재 위치를 아는 것입니다. 이것이 명확해야 올바른 방향으로 나아갈 수 있어요.',
      estimated_time: '30분',
      status: 'pending' as const,
      scheduled_date: today,
    },
    estimated_completion_date: data.deadline,
  };
}
