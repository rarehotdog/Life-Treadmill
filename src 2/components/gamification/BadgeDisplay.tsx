import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { BADGES, type Badge } from '../../lib/gamification';

interface BadgeDisplayProps {
  earnedBadgeIds: string[];
  className?: string;
}

export function BadgeGrid({ earnedBadgeIds, className = '' }: BadgeDisplayProps) {
  return (
    <div className={`grid grid-cols-4 gap-3 ${className}`}>
      {BADGES.map(badge => {
        const earned = earnedBadgeIds.includes(badge.id);
        return (
          <div
            key={badge.id}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              earned ? '' : 'opacity-30 grayscale'
            }`}
          >
            <span className="text-2xl">{badge.emoji}</span>
            <span className="text-11 text-center text-[#6B7280] leading-tight">{badge.title}</span>
          </div>
        );
      })}
    </div>
  );
}

// Badge unlock notification
interface BadgeUnlockProps {
  badge: Badge | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BadgeUnlockModal({ badge, isOpen, onClose }: BadgeUnlockProps) {
  if (!badge) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[70]"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-0 flex items-center justify-center z-[71] px-8"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-xs text-center">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl mb-4"
              >
                {badge.emoji}
              </motion.div>

              <h3 className="text-22 font-bold text-gray-900 mb-1">뱃지 획득!</h3>
              <p className="text-15 font-semibold text-[#7C3AED] mb-2">{badge.title}</p>
              <p className="text-13 text-[#9CA3AF]">{badge.description}</p>

              <button onClick={onClose} className="mt-6 w-full bg-[#7C3AED] text-white rounded-14 py-3 text-15 font-semibold">
                멋져요!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
