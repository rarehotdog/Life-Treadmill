import { motion } from 'motion/react';
import { getLevelTitle } from '../../lib/gamification';

interface TreadyProps {
  level: number;
  isRunning: boolean;  // quests in progress
  isSad: boolean;      // missed quests
  completionRate: number;
  className?: string;
}

export default function Tready({ level, isRunning, isSad, completionRate, className = '' }: TreadyProps) {
  const getMood = () => {
    if (isSad) return { face: '😢', bg: 'from-gray-200 to-gray-300' };
    if (completionRate >= 100) return { face: '🤩', bg: 'from-amber-300 to-yellow-400' };
    if (completionRate >= 50) return { face: '😊', bg: 'from-emerald-300 to-teal-400' };
    if (isRunning) return { face: '🏃', bg: 'from-blue-300 to-cyan-400' };
    return { face: '😐', bg: 'from-purple-300 to-violet-400' };
  };

  const mood = getMood();
  const title = getLevelTitle(level);

  // Environment background based on level
  const getEnvironment = () => {
    if (level >= 20) return { emoji: '🌌', label: '우주' };
    if (level >= 15) return { emoji: '🏔️', label: '산꼭대기' };
    if (level >= 10) return { emoji: '🌊', label: '해변' };
    if (level >= 5) return { emoji: '🌲', label: '숲' };
    return { emoji: '🌿', label: '공원' };
  };

  const env = getEnvironment();

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      {/* Background */}
      <div className={`bg-gradient-to-br ${mood.bg} p-5 relative`}>
        {/* Environment decorations */}
        <div className="absolute top-2 right-3 text-2xl opacity-60">{env.emoji}</div>
        <div className="absolute top-3 right-12 text-lg opacity-40">{env.emoji}</div>

        {/* Character area */}
        <div className="flex flex-col items-center py-3">
          {/* Character */}
          <motion.div
            animate={isRunning ? {
              y: [0, -8, 0],
              rotate: [0, -2, 0, 2, 0],
            } : isSad ? {
              y: [0, 2, 0],
            } : {
              y: [0, -4, 0],
            }}
            transition={{
              duration: isRunning ? 0.5 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative"
          >
            {/* Shadow */}
            <motion.div
              animate={isRunning ? { scale: [1, 0.8, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/10 rounded-full blur-sm"
            />

            {/* Body */}
            <div className="text-6xl leading-none relative z-10">
              {mood.face}
            </div>
          </motion.div>

          {/* Treadmill */}
          <div className="mt-2 relative">
            <div className="w-24 h-2 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                animate={isRunning ? { x: [-24, 0] } : {}}
                transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                className="flex gap-2 absolute inset-0"
              >
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-3 h-full bg-black/10 rounded-full flex-shrink-0" />
                ))}
              </motion.div>
            </div>
          </div>

          {/* Level badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full text-13 font-bold text-gray-800">
              Lv.{level}
            </span>
            <span className="text-13 font-medium text-gray-700/80">{title}</span>
          </div>
        </div>

        {/* Progress trail */}
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i < Math.ceil(completionRate / 10) ? 1 : 0.2 }}
              className={`flex-1 h-1 rounded-full ${
                i < Math.ceil(completionRate / 10) ? 'bg-white/70' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
