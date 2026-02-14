import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles, Target, Clock, AlertTriangle, User } from 'lucide-react';
import type { UserProfile } from '../../App';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

// Goal presets for quick selection
const goalPresets = [
  { emoji: '🎓', label: '시험/합격', example: 'TOEIC 900점, 자격증 취득' },
  { emoji: '💪', label: '건강/운동', example: '10kg 감량, 마라톤 완주' },
  { emoji: '💻', label: '커리어/기술', example: '코딩 마스터, 이직 성공' },
  { emoji: '📖', label: '학습/성장', example: '책 50권, 새 언어 배우기' },
  { emoji: '💰', label: '재테크/자산', example: '1000만원 모으기, 투자 시작' },
  { emoji: '🎨', label: '창작/취미', example: '앱 출시, 그림 100장' },
];

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
    placeholder: '직접 입력하기...',
    type: 'goal' as const,
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
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          {currentStep > 0 ? (
            <button onClick={handleBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <span className="text-13 text-[#9CA3AF] font-medium">{currentStep + 1} / {questions.length}</span>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-[#7C3AED] rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="px-5 py-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <currentQuestion.icon className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div>
              <h1 className="text-22 font-bold text-gray-900">{currentQuestion.title}</h1>
              <p className="text-14 text-[#9CA3AF]">{currentQuestion.subtitle}</p>
            </div>
          </div>

          {/* Text Input */}
          {currentQuestion.type === 'text' && (
            <input
              type="text"
              value={answers[currentQuestion.id]}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              placeholder={currentQuestion.placeholder}
              className="w-full p-4 text-15 border-2 border-gray-200 rounded-2xl focus:border-[#7C3AED] focus:outline-none transition-colors"
              autoFocus
            />
          )}

          {/* Goal with Presets */}
          {currentQuestion.type === 'goal' && (
            <div>
              {/* Presets */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {goalPresets.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setAnswers({ ...answers, goal: preset.example })}
                    className={`p-3 rounded-14 border-2 text-left transition-all ${
                      answers.goal === preset.example
                        ? 'border-[#7C3AED] bg-purple-50'
                        : 'border-[#F3F4F6] hover:border-purple-200'
                    }`}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <p className="text-13 font-medium text-gray-900 mt-1">{preset.label}</p>
                    <p className="text-11 text-[#9CA3AF] mt-0.5">{preset.example}</p>
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <textarea
                value={answers.goal}
                onChange={(e) => setAnswers({ ...answers, goal: e.target.value })}
                placeholder={currentQuestion.placeholder}
                rows={3}
                className="w-full p-4 text-15 border-2 border-gray-200 rounded-2xl focus:border-[#7C3AED] focus:outline-none transition-colors resize-none"
              />
            </div>
          )}

          {/* Textarea */}
          {currentQuestion.type === 'textarea' && (
            <textarea
              value={answers[currentQuestion.id]}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              placeholder={currentQuestion.placeholder}
              rows={4}
              className="w-full p-4 text-15 border-2 border-gray-200 rounded-2xl focus:border-[#7C3AED] focus:outline-none transition-colors resize-none"
            />
          )}

          {/* Date */}
          {currentQuestion.type === 'date' && (
            <input
              type="date"
              value={answers[currentQuestion.id]}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              className="w-full p-4 text-15 border-2 border-gray-200 rounded-2xl focus:border-[#7C3AED] focus:outline-none transition-colors"
              min={new Date().toISOString().split('T')[0]}
            />
          )}

          {/* Choice */}
          {currentQuestion.type === 'choice' && currentQuestion.choices && (
            <div className="space-y-3">
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice.value}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: choice.value })}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    answers[currentQuestion.id] === choice.value
                      ? 'border-[#7C3AED] bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{choice.label}</div>
                  <div className="text-13 text-[#9CA3AF]">{choice.description}</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-white border-t border-[#F3F4F6]">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full py-4 rounded-14 font-semibold text-15 flex items-center justify-center gap-2 transition-all ${
            canProceed
              ? 'bg-[#7C3AED] text-white hover:bg-purple-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === questions.length - 1 ? (
            <>완료 <Sparkles className="w-5 h-5" /></>
          ) : (
            <>다음 <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
