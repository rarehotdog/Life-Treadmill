import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap } from 'lucide-react';

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
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-3xl z-[61] safe-bottom"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h2 className="text-22 font-bold text-gray-900">오늘 컨디션은?</h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Energy Slider */}
              <div className="mb-8">
                <p className="text-14 text-[#9CA3AF] mb-4">에너지 레벨</p>
                <div className="flex justify-between mb-3">
                  {energyLabels.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setEnergy(i + 1)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                        energy === i + 1
                          ? `bg-gradient-to-br ${energyColors[i]} scale-110 shadow-lg`
                          : 'bg-gray-100 scale-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${(energy / 5) * 100}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${energyColors[energy - 1]}`}
                  />
                </div>
              </div>

              {/* Mood */}
              <div className="mb-8">
                <p className="text-14 text-[#9CA3AF] mb-4">기분</p>
                <div className="flex gap-3">
                  {moods.map(m => (
                    <button
                      key={m.emoji}
                      onClick={() => setMood(m.emoji)}
                      className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${
                        mood === m.emoji
                          ? 'border-[#7C3AED] bg-purple-50'
                          : 'border-[#F3F4F6]'
                      }`}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-13 text-[#6B7280]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!mood}
                className={`w-full py-4 rounded-14 text-15 font-semibold transition-all ${
                  mood
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                시작하기
              </button>

              {energy <= 2 && mood && (
                <p className="text-13 text-amber-600 text-center mt-3">
                  컨디션이 안 좋으시군요. 오늘은 가벼운 퀘스트로 조정해드릴게요 💛
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
