import { motion } from 'motion/react';
import { Circle, CheckCircle2, Plus, ChevronRight, Sparkles, X, Share2 } from 'lucide-react';
import type { UserProfile, Quest } from '../../../App';
import type { UserStats } from '../../lib/gamification';
import Tready from '../character/Tready';
import XPBar from '../gamification/XPBar';
import LifeCalendar from './widgets/LifeCalendar';

interface HomeScreenProps {
  profile: UserProfile;
  quests: Quest[];
  onQuestToggle: (questId: string) => void;
  onQuestFail?: (questId: string) => void;
  completionRate: number;
  isGeneratingQuests?: boolean;
  onRegenerateQuests?: () => void;
  aiMessage?: string | null;
  isAiEnabled?: boolean;
  stats: UserStats;
  energy?: number;
  onOpenShare?: () => void;
  onOpenEnergy?: () => void;
}

export default function HomeScreen({
  profile,
  quests,
  onQuestToggle,
  onQuestFail,
  completionRate,
  isGeneratingQuests,
  onRegenerateQuests,
  aiMessage,
  isAiEnabled,
  stats,
  energy,
  onOpenShare,
  onOpenEnergy,
}: HomeScreenProps) {
  const today = new Date();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
  const completedCount = quests.filter(q => q.completed).length;

  // Year progress
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = today.getFullYear() % 4 === 0 ? 366 : 365;
  const yearProgress = ((dayOfYear / totalDays) * 100).toFixed(1);

  // D-Day
  const getDDay = () => {
    if (!profile.deadline || profile.deadline === '무제한') return 'NaN';
    const deadline = new Date(profile.deadline);
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`;
  };

  return (
    <div className="px-5 pt-4 pb-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-28 font-bold text-gray-900 tracking-tight-custom leading-tight">Daily</h1>
          <p className="text-14 text-[#9CA3AF] mt-0.5">
            {today.getMonth() + 1}월 {today.getDate()}일 ({dayOfWeek})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenShare && (
            <button onClick={onOpenShare} className="w-9 h-9 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-center">
              <Share2 className="w-[16px] h-[16px] text-gray-600" />
            </button>
          )}
          <button className="w-9 h-9 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-center">
            <Plus className="w-[18px] h-[18px] text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Tready Character + XP ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Tready
          level={stats.level}
          isRunning={completedCount > 0 && completedCount < quests.length}
          isSad={stats.currentStreak === 0 && stats.totalDaysActive > 1}
          completionRate={completionRate}
          className="mb-3"
        />
        <XPBar xp={stats.xp} level={stats.level} className="mb-4" />
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="bg-blue-50 rounded-2xl p-14">
          <p className="text-12 font-semibold text-blue-600 mb-1">Today</p>
          <p className="text-22 font-bold text-gray-900 leading-none">{completedCount}/{quests.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-orange-50 rounded-2xl p-14">
          <p className="text-12 font-semibold text-orange-600 mb-1">Streak</p>
          <p className="text-22 font-bold text-gray-900 leading-none">{stats.currentStreak} <span className="text-base">🔥</span></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          onClick={onOpenEnergy}
          className="bg-purple-50 rounded-2xl p-14 cursor-pointer">
          <p className="text-12 font-semibold text-purple-600 mb-1">{energy ? 'Energy' : 'D-Day'}</p>
          <p className="text-22 font-bold text-gray-900 leading-none">
            {energy ? `${energy}/5 ⚡` : getDDay()}
          </p>
        </motion.div>
      </div>

      {/* ── Year Progress ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="bg-gradient-to-br from-fuchsia-400 via-pink-500 to-purple-500 rounded-3xl p-5 mb-4 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full" />
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div>
            <p className="text-15 font-semibold text-white/90">Year Progress</p>
            <p className="text-13 text-white/60 mt-0.5">{today.getFullYear()}</p>
          </div>
          <div className="text-right">
            <p className="text-36 font-extrabold leading-none">{yearProgress}%</p>
            <p className="text-13 text-white/60 mt-1">{dayOfYear}/{totalDays} days</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 relative z-10">
          {Array.from({ length: 52 }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.floor(dayOfYear / 7) ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
        <div className="flex justify-center mt-3 gap-1 relative z-10">
          <div className="w-6 h-1 bg-white/60 rounded-full" />
          <div className="w-1 h-1 bg-white/30 rounded-full" />
          <div className="w-1 h-1 bg-white/30 rounded-full" />
        </div>
      </motion.div>

      {/* ── Life Calendar ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <LifeCalendar />
      </motion.div>

      {/* ── Today's Quest ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 tracking-snug">Today's Quest</h2>
          <span className="text-14 text-[#9CA3AF]">{completedCount}/{quests.length} completed</span>
        </div>

        {isGeneratingQuests ? (
          <div className="bg-white rounded-14 p-6 border border-[#F3F4F6] flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-13 text-[#9CA3AF]">AI가 퀘스트를 생성하고 있어요...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quests.map((quest, index) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.04 }}
                onClick={() => onQuestToggle(quest.id)}
                className={`bg-white rounded-14 p-4 border cursor-pointer active:scale-[0.98] transition-all ${
                  quest.completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#F3F4F6]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-px">
                    {quest.completed ? (
                      <CheckCircle2 className="w-[22px] h-[22px] text-emerald-500" />
                    ) : (
                      <Circle className="w-[22px] h-[22px] text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-15 font-medium leading-snug ${quest.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {quest.title}
                    </p>
                    {quest.description && (
                      <p className="text-13 text-[#9CA3AF] mt-1 leading-relaxed">{quest.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-12 text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded-lg">{quest.duration}</span>
                    {!quest.completed && onQuestFail && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onQuestFail(quest.id); }}
                        className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            <button
              onClick={isAiEnabled && onRegenerateQuests ? onRegenerateQuests : undefined}
              className="w-full py-3 text-14 font-medium text-[#7C3AED] flex items-center justify-center gap-1.5 hover:bg-purple-50 rounded-14 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Quest
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Priority Matrix ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Priority Matrix</h3>
          <button className="text-14 text-[#7C3AED] flex items-center gap-0.5 font-medium">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PriorityCell color="red" label="Do First" content={quests.filter(q => !q.completed && q.timeOfDay === 'morning')[0]?.title} />
          <PriorityCell color="yellow" label="Schedule" content={quests.filter(q => !q.completed && q.timeOfDay === 'afternoon')[0]?.title} />
          <PriorityCell color="green" label="Delegate" content={undefined} />
          <PriorityCell color="gray" label="Eliminate" content={undefined} />
        </div>
      </motion.div>

      {/* ── Current Goal ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-5 mb-4 text-white relative overflow-hidden">
        <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-2xl">🎯</span>
        </div>
        <p className="text-12 text-white/70 font-medium mb-1">Current Goal</p>
        <h3 className="text-22 font-bold leading-tight mb-4 pr-14">{profile.goal}</h3>
        <div className="mb-2">
          <div className="flex justify-between text-14 mb-1.5">
            <span className="text-white/80">Progress</span>
            <span className="font-semibold">{completionRate.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.6 }}
              className="h-full bg-white rounded-full" />
          </div>
        </div>
        <div className="flex justify-between text-14 mt-3">
          <span className="text-white/70">Day {profile.currentDay}</span>
          <span className="text-white/70">{profile.deadline === '무제한' ? '무제한' : getDDay()}</span>
        </div>
      </motion.div>

      {/* ── AI Insight ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
        className="bg-white rounded-2xl p-4 border border-[#E9D5FF]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-[10px] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-15 font-semibold text-gray-900 mb-1">AI Insight</p>
            <p className="text-13 text-[#6B7280] leading-relaxed">
              {aiMessage || '오늘 첫 퀘스트를 완료하고 스트릭을 시작해보세요! 작은 시작이 큰 변화의 첫걸음이에요.'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PriorityCell({ color, label, content }: { color: string; label: string; content?: string }) {
  const styles: Record<string, { bg: string; dot: string; text: string }> = {
    red:    { bg: 'bg-red-50',    dot: '🔴', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-50', dot: '🟡', text: 'text-yellow-600' },
    green:  { bg: 'bg-green-50',  dot: '🟢', text: 'text-green-600' },
    gray:   { bg: 'bg-gray-50',   dot: '⚫', text: 'text-gray-500' },
  };
  const s = styles[color] || styles.gray;
  return (
    <div className={`${s.bg} rounded-xl p-3`}>
      <p className={`text-12 font-semibold ${s.text} mb-1`}>{s.dot} {label}</p>
      <p className="text-12 text-[#6B7280]">{content ? `• ${content}` : '• Empty'}</p>
    </div>
  );
}
