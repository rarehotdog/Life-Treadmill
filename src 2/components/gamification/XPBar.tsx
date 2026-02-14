import { motion } from 'motion/react';
import { getXPForNextLevel } from '../../lib/gamification';

interface XPBarProps {
  xp: number;
  level: number;
  className?: string;
}

export default function XPBar({ xp, level, className = '' }: XPBarProps) {
  const { current, required, progress } = getXPForNextLevel(xp);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-12 font-semibold text-[#7C3AED]">Lv.{level}</span>
        <span className="text-11 text-[#9CA3AF]">{current}/{required} XP</span>
      </div>
      <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-[#7C3AED] to-purple-500 rounded-full"
        />
      </div>
    </div>
  );
}
