import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Heart, Loader2, X } from 'lucide-react';
import type { Quest, UserProfile } from '../../types/app';
import { analyzeFailure, isGeminiConfigured, type FailureAnalysis, type FailureReasonCode } from '../../lib/gemini';
import { Button, Card, CardContent, Input } from '../ui';

export interface FailureResolutionMeta {
  reasonCode: FailureReasonCode;
  reasonText: string;
  rootCause: FailureAnalysis['rootCause'];
}

interface FailureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  profile: UserProfile;
  energy?: number;
  onAcceptRecovery: (quest: Quest, meta: FailureResolutionMeta) => void;
}

export default function FailureSheet({ isOpen, onClose, quest, profile, energy, onAcceptRecovery }: FailureSheetProps) {
  const [reason, setReason] = useState('');
  const [selectedReasonCode, setSelectedReasonCode] = useState<FailureReasonCode>('other');
  const [selectedReasonText, setSelectedReasonText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [step, setStep] = useState<'reason' | 'analysis'>('reason');

  const quickReasons = [
    { emoji: '⏰', label: '시간이 부족했어요', code: 'time' as const },
    { emoji: '😮‍💨', label: '의욕이 없었어요', code: 'motivation' as const },
    { emoji: '😰', label: '너무 어려웠어요', code: 'difficulty' as const },
    { emoji: '🏠', label: '환경이 안 됐어요', code: 'environment' as const },
    { emoji: '🤒', label: '컨디션이 안 좋았어요', code: 'health' as const },
  ];

  const estimateRemainingMinutes = () => {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const ms = Math.max(0, end.getTime() - now.getTime());
    return Math.floor(ms / (1000 * 60));
  };

  const handleAnalyze = async (selectedReasonTextInput: string, selectedReasonCodeInput: FailureReasonCode) => {
    setSelectedReasonText(selectedReasonTextInput);
    setSelectedReasonCode(selectedReasonCodeInput);

    if (!quest || !isGeminiConfigured()) {
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
      const result = await analyzeFailure(
        quest,
        {
          reasonCode: selectedReasonCodeInput,
          reasonText: selectedReasonTextInput,
          energy,
          remainingMinutes: estimateRemainingMinutes(),
        },
        profile,
      );
      if (result) {
        setAnalysis(result);
        setStep('analysis');
      }
    } catch {
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
    setSelectedReasonCode('other');
    setSelectedReasonText('');
    onClose();
  };

  const handleAccept = () => {
    if (!analysis?.recoveryQuest) return;

    onAcceptRecovery(analysis.recoveryQuest, {
      reasonCode: selectedReasonCode,
      reasonText: selectedReasonText,
      rootCause: analysis.rootCause,
    });
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
      {isOpen ? (
        <>
          <motion.div
            data-testid="failure-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />

          <motion.div
            data-testid="failure-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="modal-sheet safe-bottom"
          >
            <div className="modal-handle-wrap">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            <div className="modal-body">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="modal-title text-gray-900">{step === 'reason' ? '무슨 일이 있었나요?' : '괜찮아요 💛'}</h2>
                <Button data-testid="failure-modal-close" onClick={handleClose} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              {step === 'reason' ? (
                <>
                  {quest ? (
                    <Card className="mb-4 rounded-14 border-0 bg-red-50">
                      <CardContent className="card-padding-sm">
                        <p className="body-13 font-medium text-red-600">완료하지 못한 퀘스트</p>
                        <p className="body-15 mt-0.5 font-medium text-gray-900">{quest.title}</p>
                      </CardContent>
                    </Card>
                  ) : null}

                  <p className="modal-subtle mb-3">이유를 선택하거나 직접 입력해주세요</p>
                  <div className="mb-4 space-y-2">
                    {quickReasons.map((item) => (
                      <Button
                        key={item.label}
                        onClick={() => handleAnalyze(item.label, item.code)}
                        disabled={isAnalyzing}
                        variant="ghost"
                        className="h-auto w-full justify-start gap-3 rounded-14 border border-[#F3F4F6] bg-white px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <span className="body-15 text-gray-900">{item.label}</span>
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="직접 입력..."
                      className="input-surface h-12 border-0 px-4 py-3 placeholder:text-[#9CA3AF]"
                    />
                    <Button
                      onClick={() => {
                        if (reason.trim()) handleAnalyze(reason, 'other');
                      }}
                      disabled={!reason.trim() || isAnalyzing}
                      className="cta-secondary min-w-12 bg-[#7C3AED] px-3 text-white"
                    >
                      {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    </Button>
                  </div>
                </>
              ) : null}

              {step === 'analysis' && analysis ? (
                <>
                  <Card className="mb-4 rounded-2xl border-0 bg-amber-50">
                    <CardContent className="card-padding">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xl">{rootCauseEmoji[analysis.rootCause] || '💭'}</span>
                        <p className="body-15 font-semibold text-gray-900">분석 결과</p>
                      </div>
                      <p className="body-14 text-[#6B7280]">{analysis.explanation}</p>
                    </CardContent>
                  </Card>

                  <Card className="mb-4 rounded-2xl border-0 bg-purple-50">
                    <CardContent className="card-padding">
                      <div className="flex items-start gap-3">
                        <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-500" />
                        <p className="body-14 text-[#6B7280]">{analysis.encouragement}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                    <CardContent className="card-padding">
                      <p className="caption-12 mb-1 font-semibold text-emerald-600">대안 퀘스트</p>
                      <p className="body-15 mb-1 font-bold text-gray-900">{analysis.recoveryQuest.title}</p>
                      <p className="body-13 mb-2 text-[#6B7280]">{analysis.recoveryQuest.description}</p>
                      <span className="caption-12 rounded-lg bg-emerald-100 px-2 py-0.5 text-emerald-600">{analysis.recoveryQuest.duration}</span>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Button data-testid="failure-modal-accept" onClick={handleAccept} className="cta-primary w-full bg-[#7C3AED] text-white hover:bg-[#7C3AED]">
                      대안 퀘스트 수락하기
                    </Button>
                    <Button data-testid="failure-modal-skip" onClick={handleClose} variant="secondary" className="cta-secondary w-full bg-gray-100 text-gray-600">
                      괜찮아요, 넘어갈게요
                    </Button>
                  </div>
                </>
              ) : null}

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-8">
                  <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
                  <p className="body-15 font-medium text-gray-900">AI가 분석하고 있어요...</p>
                  <p className="body-13 text-[#9CA3AF]">공감하는 회복 방안을 찾는 중</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
