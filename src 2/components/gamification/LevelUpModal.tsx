import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getLevelTitle } from '../../lib/gamification';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  xpGained: number;
}

export default function LevelUpModal({ isOpen, onClose, newLevel, xpGained }: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti
      const fire = () => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7C3AED', '#A78BFA', '#C4B5FD', '#F59E0B', '#10B981'],
        });
      };
      fire();
      setTimeout(fire, 300);
      setTimeout(fire, 600);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[70]"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-[71] px-8"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center relative overflow-hidden">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-100/50 to-transparent" />

              {/* Content */}
              <div className="relative z-10">
                {/* Stars animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-200"
                >
                  <Star className="w-10 h-10 text-white" fill="white" />
                </motion.div>

                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-28 font-bold text-gray-900 mb-1"
                >
                  Level Up!
                </motion.h2>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-36 font-extrabold text-[#7C3AED]">Lv.{newLevel}</p>
                  <p className="text-15 text-[#9CA3AF] mt-1">{getLevelTitle(newLevel)}</p>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 bg-purple-50 rounded-2xl p-3"
                >
                  <p className="text-14 text-[#7C3AED] font-semibold">+{xpGained} XP 획득!</p>
                </motion.div>

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={onClose}
                  className="mt-6 w-full bg-[#7C3AED] text-white rounded-14 py-4 text-15 font-semibold"
                >
                  계속하기
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
