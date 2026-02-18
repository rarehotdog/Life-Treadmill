import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Zap } from 'lucide-react';
import { Button, Progress } from '../ui';

interface EnergyCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (energy: number, mood: string) => void;
}

const moods = [
  { emoji: '😊', label: '좋아요' },
  { emoji: '😐', label: '보통' },
  { emoji: '😔', label: '별로' },
];

export default function EnergyCheckIn({ isOpen, onClose, onSubmit }: EnergyCheckInProps) {
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState('');

  const handleSubmit = () => {
    if (!mood) return;
    onSubmit(energy, mood);
    onClose();
  };

  const energyLabels = ['😴', '😪', '😐', '💪', '⚡'];
  const energyColors = [
    'from-red-400 to-red-500',
    'from-orange-400 to-orange-500',
    'from-yellow-400 to-yellow-500',
    'from-emerald-400 to-emerald-500',
    'from-blue-400 to-cyan-500',
  ];

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            data-testid="energy-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <motion.div
            data-testid="energy-modal"
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
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <h2 className="modal-title text-gray-900">오늘 컨디션은?</h2>
                </div>
                <Button data-testid="energy-modal-close" onClick={onClose} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              <div className="mb-8">
                <p className="body-14 mb-4 text-[#9CA3AF]">에너지 레벨</p>
                <div className="mb-3 flex justify-between">
                  {energyLabels.map((label, i) => (
                    <Button
                      key={label}
                      type="button"
                      onClick={() => setEnergy(i + 1)}
                      variant="ghost"
                      className={`h-14 w-14 rounded-2xl p-0 text-2xl transition-all ${
                        energy === i + 1 ? `bg-gradient-to-br ${energyColors[i]} scale-110 shadow-lg` : 'scale-100 bg-gray-100'
                      }`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <Progress
                  value={(energy / 5) * 100}
                  className={`h-2 overflow-hidden rounded-full bg-gray-100 [&>div]:bg-gradient-to-r ${energyColors[energy - 1]}`}
                />
              </div>

              <div className="mb-8">
                <p className="body-14 mb-4 text-[#9CA3AF]">기분</p>
                <div className="flex gap-3">
                  {moods.map((item) => (
                    <Button
                      key={item.emoji}
                      variant="ghost"
                      className={`flex-1 min-h-12 rounded-2xl border-2 px-2 py-3 ${
                        mood === item.emoji ? 'border-[#7C3AED] bg-purple-50' : 'border-[#F3F4F6] bg-white'
                      }`}
                      onClick={() => setMood(item.emoji)}
                    >
                      <span className="flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="body-13 text-[#6B7280]">{item.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                data-testid="energy-modal-submit"
                onClick={handleSubmit}
                disabled={!mood}
                className={`w-full cta-primary ${mood ? 'bg-[#7C3AED] text-white' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}
              >
                시작하기
              </Button>

              {energy <= 2 && mood ? (
                <p className="body-13 mt-3 text-center text-amber-600">
                  컨디션이 안 좋으시군요. 오늘은 가벼운 퀘스트로 조정해드릴게요 💛
                </p>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
