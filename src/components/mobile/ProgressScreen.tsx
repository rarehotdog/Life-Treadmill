import { motion } from 'motion/react';
import { TrendingUp, Target, Flame, Calendar, Award } from 'lucide-react';
import type { UserProfile } from '../../../App';
import YearProgressWidget from './widgets/YearProgressWidget';

interface ProgressScreenProps {
  profile: UserProfile;
  completionRate: number;
  completedCount: number;
  totalCount: number;
}

export default function ProgressScreen({
  profile,
  completionRate,
  completedCount,
  totalCount,
}: ProgressScreenProps) {
  // 주간 데이터 (예시)
  const weeklyData = [
    { day: '월', completed: 3, total: 3 },
    { day: '화', completed: 2, total: 3 },
    { day: '수', completed: 3, total: 3 },
    { day: '목', completed: 1, total: 3 },
    { day: '금', completed: completedCount, total: totalCount },
    { day: '토', completed: 0, total: 3 },
    { day: '일', completed: 0, total: 3 },
  ];

  const today = new Date().getDay();
  const dayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">진행 현황</h1>
        <p className="text-gray-500 text-sm">당신의 성장을 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.streak}일</p>
          <p className="text-sm text-gray-500">연속 달성</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.weeklyCompletion}%</p>
          <p className="text-sm text-gray-500">주간 완료율</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.currentDay}</p>
          <p className="text-sm text-gray-500">진행 일수</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">D-{profile.daysUntilDeadline || '∞'}</p>
          <p className="text-sm text-gray-500">목표까지</p>
        </motion.div>
      </div>

      {/* Year Progress Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <YearProgressWidget />
      </motion.div>

      {/* Weekly Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-6"
      >
        <h2 className="font-bold text-gray-900 mb-4">이번 주 기록</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyData.map((data, index) => {
            const height = data.total > 0 ? (data.completed / data.total) * 100 : 0;
            const isToday = index === dayIndex;
            return (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className={`absolute bottom-0 w-full rounded-lg ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                        : 'bg-emerald-200'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs ${
                    isToday ? 'text-emerald-600 font-bold' : 'text-gray-500'
                  }`}
                >
                  {data.day}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">다음 뱃지까지</p>
            <p className="text-sm text-gray-600">
              {7 - profile.streak}일 더 연속 달성하면 🔥 뱃지 획득!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
