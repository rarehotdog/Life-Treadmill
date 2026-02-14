import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Heart, ArrowRight } from 'lucide-react';
import type { UserProfile, Quest } from '../../../App';
import { analyzeFailure, isGeminiConfigured, type FailureAnalysis } from '../../lib/gemini';

interface FailureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  profile: UserProfile;
  onAcceptRecovery: (quest: Quest) => void;
}

export default function FailureSheet({ isOpen, onClose, quest, profile, onAcceptRecovery }: FailureSheetProps) {
  const [reason, setReason] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [step, setStep] = useState<'reason' | 'analysis'>('reason');

  const quickReasons = [
    { emoji: '⏰', label: '시간이 부족했어요' },
    { emoji: '😮‍💨', label: '의욕이 없었어요' },
    { emoji: '😰', label: '너무 어려웠어요' },
    { emoji: '🏠', label: '환경이 안 됐어요' },
    { emoji: '🤒', label: '컨디션이 안 좋았어요' },
  ];

  const handleAnalyze = async (selectedReason: string) => {
    if (!quest || !isGeminiConfigured()) {
      // Provide default fallback
      setAnalysis({
        rootCause: 'other',
        explanation: '괜찮아요, 누구나 어려운 날이 있어요.',
        recoveryQuest: {
          id: `recovery-${Date.now()}`,
          title: '5분만 집중해보기',
          duration: '5분',
          completed: false,
          timeOfDay: 'morning',
          description: '아주 작은 행동이라도 오늘의 흐름을 만들어요',
        },
        encouragement: '완벽하지 않아도 괜찮아요. 다시 시작하는 것 자체가 대단한 거예요. 작은 한 걸음이 내일의 큰 변화를 만들어갑니다.',
      });
      setStep('analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeFailure(quest, selectedReason, profile);
      if (result) {
        setAnalysis(result);
        setStep('analysis');
      }
    } catch {
      // Fallback
      setAnalysis({
        rootCause: 'other',
        explanation: '분석 중 문제가 발생했지만, 괜찮아요.',
        recoveryQuest: {
          id: `recovery-${Date.now()}`,
          title: `${quest.title} - 축소 버전`,
          duration: '5분',
          completed: false,
          timeOfDay: quest.timeOfDay,
          description: '작게 시작해서 모멘텀을 만들어보세요',
        },
        encouragement: '실패는 성장의 일부예요. 다시 시도하는 용기가 중요합니다.',
      });
      setStep('analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setAnalysis(null);
    setStep('reason');
    onClose();
  };

  const handleAccept = () => {
    if (analysis?.recoveryQuest) {
      onAcceptRecovery(analysis.recoveryQuest);
    }
    handleClose();
  };

  const rootCauseEmoji: Record<string, string> = {
    time: '⏰',
    motivation: '😮‍💨',
    difficulty: '😰',
    environment: '🏠',
    other: '💭',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 z-[60]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-3xl z-[61] safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8 max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-22 font-bold text-gray-900">
                  {step === 'reason' ? '무슨 일이 있었나요?' : '괜찮아요 💛'}
                </h2>
                <button onClick={handleClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {step === 'reason' && (
                <>
                  {/* Failed quest info */}
                  {quest && (
                    <div className="bg-red-50 rounded-14 p-3 mb-4">
                      <p className="text-13 text-red-600 font-medium">완료하지 못한 퀘스트</p>
                      <p className="text-15 text-gray-900 font-medium mt-0.5">{quest.title}</p>
                    </div>
                  )}

                  {/* Quick reasons */}
                  <p className="text-14 text-[#9CA3AF] mb-3">이유를 선택하거나 직접 입력해주세요</p>
                  <div className="space-y-2 mb-4">
                    {quickReasons.map(r => (
                      <button
                        key={r.label}
                        onClick={() => handleAnalyze(r.label)}
                        disabled={isAnalyzing}
                        className="w-full bg-white border border-[#F3F4F6] rounded-14 p-3.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors active:scale-[0.98]"
                      >
                        <span className="text-xl">{r.emoji}</span>
                        <span className="text-15 text-gray-900">{r.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="직접 입력..."
                      className="flex-1 bg-[#F3F4F6] rounded-14 px-4 py-3 text-15 placeholder:text-[#9CA3AF]"
                    />
                    <button
                      onClick={() => reason.trim() && handleAnalyze(reason)}
                      disabled={!reason.trim() || isAnalyzing}
                      className="bg-[#7C3AED] rounded-14 px-4 py-3 text-white disabled:opacity-40"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </>
              )}

              {step === 'analysis' && analysis && (
                <>
                  {/* Analysis */}
                  <div className="bg-amber-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{rootCauseEmoji[analysis.rootCause] || '💭'}</span>
                      <p className="text-15 font-semibold text-gray-900">분석 결과</p>
                    </div>
                    <p className="text-14 text-[#6B7280] leading-relaxed">{analysis.explanation}</p>
                  </div>

                  {/* Encouragement */}
                  <div className="bg-purple-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Heart className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <p className="text-14 text-[#6B7280] leading-relaxed">{analysis.encouragement}</p>
                    </div>
                  </div>

                  {/* Recovery Quest */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 mb-6 border border-emerald-200">
                    <p className="text-12 text-emerald-600 font-semibold mb-1">대안 퀘스트</p>
                    <p className="text-15 font-bold text-gray-900 mb-1">{analysis.recoveryQuest.title}</p>
                    <p className="text-13 text-[#6B7280] mb-2">{analysis.recoveryQuest.description}</p>
                    <span className="text-12 text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      {analysis.recoveryQuest.duration}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={handleAccept}
                      className="w-full bg-[#7C3AED] text-white rounded-14 py-4 text-15 font-semibold"
                    >
                      대안 퀘스트 수락하기
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-full bg-gray-100 text-gray-600 rounded-14 py-4 text-15 font-medium"
                    >
                      괜찮아요, 넘어갈게요
                    </button>
                  </div>
                </>
              )}

              {/* Loading */}
              {isAnalyzing && (
                <div className="flex flex-col items-center py-8">
                  <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-15 font-medium text-gray-900">AI가 분석하고 있어요...</p>
                  <p className="text-13 text-[#9CA3AF]">공감하는 회복 방안을 찾는 중</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
