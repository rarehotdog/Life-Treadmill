import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Target, Flame, Calendar, Award, BarChart3 } from 'lucide-react';
import type { UserProfile } from '../../../App';
import type { UserStats } from '../../lib/gamification';
import { BadgeGrid } from '../gamification/BadgeDisplay';
import XPBar from '../gamification/XPBar';

interface ProgressScreenProps {
  profile: UserProfile;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  stats?: UserStats;
  earnedBadgeIds?: string[];
}

export default function ProgressScreen({
  profile,
  completionRate: _completionRate,
  completedCount,
  totalCount,
  stats,
  earnedBadgeIds = [],
}: ProgressScreenProps) {
  // Load quest history from localStorage
  const [weeklyData, setWeeklyData] = useState<{ day: string; completed: number; total: number }[]>([]);

  useEffect(() => {
    const history: Record<string, { completed: number; total: number }> = {};

    // Build history from localStorage
    const savedHistory = localStorage.getItem('ltr_questHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        Object.assign(history, parsed);
      } catch { /* ignore */ }
    }

    // Add today's data
    const todayStr = new Date().toISOString().split('T')[0];
    history[todayStr] = { completed: completedCount, total: totalCount };
    localStorage.setItem('ltr_questHistory', JSON.stringify(history));

    // Build weekly data
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekly = days.map((label, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = history[dateStr];
      return {
        day: label,
        completed: entry?.completed || 0,
        total: entry?.total || 3,
      };
    });

    setWeeklyData(weekly);
  }, [completedCount, totalCount]);

  // Year progress
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = now.getFullYear() % 4 === 0 ? 366 : 365;
  const yearProgress = (dayOfYear / totalDays) * 100;

  // D-Day
  const getDDay = () => {
    if (!profile.deadline || profile.deadline === '무제한') return '∞';
    const deadline = new Date(profile.deadline);
    const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Today index in weekly data
  const todayIdx = (() => {
    const d = now.getDay();
    return d === 0 ? 6 : d - 1;
  })();

  // Streak badge target
  const nextBadge = Math.ceil((profile.streak + 1) / 7) * 7;
  const daysUntilBadge = nextBadge - profile.streak;

  return (
    <div className="px-5 pt-4 pb-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-28 font-bold text-gray-900 tracking-tight-custom leading-tight">Progress</h1>
        <p className="text-14 text-[#9CA3AF] mt-0.5">당신의 성장을 확인하세요</p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 border border-[#F3F4F6]">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-22 font-bold text-gray-900 leading-none">{profile.streak}일</p>
          <p className="text-13 text-[#9CA3AF] mt-1">연속 달성</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="bg-white rounded-2xl p-4 border border-[#F3F4F6]">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-22 font-bold text-gray-900 leading-none">{profile.weeklyCompletion}%</p>
          <p className="text-13 text-[#9CA3AF] mt-1">주간 완료율</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl p-4 border border-[#F3F4F6]">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-22 font-bold text-gray-900 leading-none">{profile.currentDay}</p>
          <p className="text-13 text-[#9CA3AF] mt-1">진행 일수</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-white rounded-2xl p-4 border border-[#F3F4F6]">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-22 font-bold text-gray-900 leading-none">D-{getDDay()}</p>
          <p className="text-13 text-[#9CA3AF] mt-1">목표까지</p>
        </motion.div>
      </div>

      {/* ── Year Progress ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-gray-900">연간 진행률</h3>
            <p className="text-12 text-[#9CA3AF]">{now.getFullYear()}년</p>
          </div>
        </div>
        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yearProgress}%` }}
            transition={{ duration: 0.8 }}
            className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
          />
        </div>
        <div className="flex justify-between text-13">
          <span className="text-[#9CA3AF]">지나간 {dayOfYear}일</span>
          <span className="font-semibold text-blue-600">{yearProgress.toFixed(1)}%</span>
          <span className="text-[#9CA3AF]">남은 {totalDays - dayOfYear}일</span>
        </div>
      </motion.div>

      {/* ── Weekly Chart ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-15 font-semibold text-gray-900">이번 주 기록</h3>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-28">
          {weeklyData.map((data, index) => {
            const height = data.total > 0 ? (data.completed / data.total) * 100 : 0;
            const isToday = index === todayIdx;
            return (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-20 bg-[#F3F4F6] rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.3 + index * 0.06, duration: 0.5 }}
                    className={`absolute bottom-0 w-full rounded-lg ${
                      isToday
                        ? 'bg-gradient-to-t from-[#7C3AED] to-purple-400'
                        : height > 0
                        ? 'bg-purple-200'
                        : ''
                    }`}
                  />
                </div>
                <span className={`text-11 ${isToday ? 'text-[#7C3AED] font-bold' : 'text-[#9CA3AF]'}`}>
                  {data.day}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── XP & Level ── */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-15 font-semibold text-gray-900">레벨 & 경험치</h3>
            <span className="text-14 font-bold text-[#7C3AED]">{stats.xp} XP</span>
          </div>
          <XPBar xp={stats.xp} level={stats.level} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-purple-50 rounded-xl p-2 text-center">
              <p className="text-15 font-bold text-[#7C3AED]">{stats.totalQuestsCompleted}</p>
              <p className="text-11 text-[#9CA3AF]">총 퀘스트</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-2 text-center">
              <p className="text-15 font-bold text-orange-600">{stats.longestStreak}</p>
              <p className="text-11 text-[#9CA3AF]">최장 스트릭</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2 text-center">
              <p className="text-15 font-bold text-emerald-600">{stats.perfectDays}</p>
              <p className="text-11 text-[#9CA3AF]">퍼펙트 데이</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Badges ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-15 font-semibold text-gray-900">뱃지</h3>
          <span className="text-13 text-[#9CA3AF]">{earnedBadgeIds.length}/12 획득</span>
        </div>
        <BadgeGrid earnedBadgeIds={earnedBadgeIds} />
      </motion.div>

      {/* ── Achievement ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
        className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-15 font-bold text-gray-900">다음 뱃지까지</p>
            <p className="text-13 text-[#6B7280]">
              {daysUntilBadge}일 더 연속 달성하면 🔥 {nextBadge}일 뱃지!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
