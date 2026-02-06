import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles, Target, Clock, AlertTriangle, User } from 'lucide-react';
import type { UserProfile } from '../../App';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

const questions = [
  {
    id: 'name',
    icon: User,
    title: '이름이 뭐예요?',
    subtitle: '앞으로 이렇게 불러드릴게요',
    placeholder: '이름 또는 닉네임',
    type: 'text' as const,
  },
  {
    id: 'goal',
    icon: Target,
    title: '어떤 사람이 되고 싶어요?',
    subtitle: '북극성이 될 큰 목표를 알려주세요',
    placeholder: '예: Stanford MBA 합격, 10kg 감량',
    type: 'textarea' as const,
  },
  {
    id: 'deadline',
    icon: Clock,
    title: '언제까지 이루고 싶어요?',
    subtitle: '현실적인 기한을 설정해주세요',
    placeholder: '',
    type: 'date' as const,
  },
  {
    id: 'routineTime',
    icon: Sparkles,
    title: '루틴은 언제가 좋아요?',
    subtitle: '퀘스트를 수행할 최적의 시간대',
    placeholder: '',
    type: 'choice' as const,
    choices: [
      { value: 'morning', label: '🌅 아침형', description: '하루를 시작하며 집중' },
      { value: 'evening', label: '🌙 저녁형', description: '하루를 마무리하며 집중' },
    ],
  },
  {
    id: 'constraints',
    icon: AlertTriangle,
    title: '가장 큰 제약은 뭐예요?',
    subtitle: '현실적인 제약을 알면 더 좋은 계획을 세워요',
    placeholder: '예: 하루 2시간만 투자 가능',
    type: 'textarea' as const,
  },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    name: '',
    goal: '',
    deadline: '',
    routineTime: '',
    constraints: '',
  });

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const canProceed = answers[currentQuestion.id]?.trim();

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      const profile: UserProfile = {
        name: answers.name,
        goal: answers.goal,
        deadline: answers.deadline,
        routineTime: answers.routineTime as 'morning' | 'evening',
        constraints: answers.constraints,
        currentDay: 1,
        streak: 0,
        weeklyCompletion: 0,
        estimatedGoalDate: answers.deadline,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <span className="text-sm text-gray-500">
            {currentStep + 1} / {questions.length}
          </span>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="px-5 py-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <currentQuestion.icon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentQuestion.title}</h1>
              <p className="text-gray-500">{currentQuestion.subtitle}</p>
            </div>
          </div>

          {/* Input */}
          {currentQuestion.type === 'text' && (
            <input
              type="text"
              value={answers[currentQuestion.id]}
              onChange={(e) =>
                setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
              }
              placeholder={currentQuestion.placeholder}
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
            />
          )}

          {currentQuestion.type === 'textarea' && (
            <textarea
              value={answers[currentQuestion.id]}
              onChange={(e) =>
                setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
              }
              placeholder={currentQuestion.placeholder}
              rows={4}
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors resize-none"
            />
          )}

          {currentQuestion.type === 'date' && (
            <input
              type="date"
              value={answers[currentQuestion.id]}
              onChange={(e) =>
                setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
              }
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
              min={new Date().toISOString().split('T')[0]}
            />
          )}

          {currentQuestion.type === 'choice' && currentQuestion.choices && (
            <div className="space-y-3">
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice.value}
                  onClick={() =>
                    setAnswers({ ...answers, [currentQuestion.id]: choice.value })
                  }
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    answers[currentQuestion.id] === choice.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{choice.label}</div>
                  <div className="text-sm text-gray-500">{choice.description}</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-white border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
            canProceed
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === questions.length - 1 ? (
            <>
              완료
              <Sparkles className="w-5 h-5" />
            </>
          ) : (
            <>
              다음
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
