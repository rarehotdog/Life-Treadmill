import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Upload } from 'lucide-react';
import type { UserProfile } from '../../types/app';
import type { UserStats } from '../../lib/gamification';
import { getYearImage, setItemString, STORAGE_KEYS } from '../../lib/app-storage';
import { Button, Card, CardContent, Progress } from '../ui';

interface ProgressScreenProps {
  profile: UserProfile;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  stats?: UserStats;
}

export default function ProgressScreen({ profile, completionRate, completedCount, totalCount, stats }: ProgressScreenProps) {
  const [yearImage, setYearImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goalImageKey = profile.goal || 'default';

  const last7Days = [
    { date: 'Mon', completed: 3, total: 3, rate: 100 },
    { date: 'Tue', completed: 2, total: 3, rate: 67 },
    { date: 'Wed', completed: 3, total: 3, rate: 100 },
    { date: 'Thu', completed: 3, total: 3, rate: 100 },
    { date: 'Fri', completed: 2, total: 3, rate: 67 },
    { date: 'Sat', completed: 3, total: 3, rate: 100 },
    { date: 'Sun', completed: completedCount, total: totalCount, rate: completionRate },
  ];

  const monthlyStats = [
    { month: 'Jan', completed: 78, total: 93, rate: 84 },
    { month: 'Feb', completed: 65, total: 84, rate: 77 },
    { month: 'Mar', completed: 82, total: 93, rate: 88 },
    { month: 'Apr', completed: 75, total: 90, rate: 83 },
  ];

  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const endOfYear = new Date(currentDate.getFullYear(), 11, 31);
  const totalDaysInYear = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const yearProgress = (daysPassed / totalDaysInYear) * 100;

  const avgCompletionRate = last7Days.reduce((sum, d) => sum + d.rate, 0) / 7;
  const brightness = 0.3 + (avgCompletionRate / 100) * 0.7;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setYearImage(result);
      setItemString(STORAGE_KEYS.yearImage(goalImageKey), result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const savedImage = getYearImage(goalImageKey);
    if (savedImage) setYearImage(savedImage);
  }, [goalImageKey]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white screen-wrap-tight">
        <div className="flex items-center justify-between">
          <h1 className="heading-1 text-gray-900">Progress</h1>
          <Button variant="secondary" className="h-8 rounded-lg px-3 text-sm text-gray-600">
            This Week
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="screen-wrap-tight space-y-4">
        <Card className="relative overflow-hidden rounded-2xl border-0 shadow-sm">
          <div className="absolute inset-0 overflow-hidden">
            {yearImage ? (
              <div
                className="h-full w-full bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: `url(${yearImage})`, filter: `brightness(${brightness}) grayscale(${1 - avgCompletionRate / 100})` }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <CardContent className="relative z-10 space-y-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-white/90">Year Progress</p>
                <h2 className="text-2xl font-bold text-white">{currentDate.getFullYear()}</h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 rounded-lg border border-white/20 bg-white/20 px-3 text-xs text-white/90 backdrop-blur-sm hover:bg-white/30"
              >
                <Upload className="h-3.5 w-3.5" />
                이미지
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/80">{daysPassed} / {totalDaysInYear} days</span>
                <span className="text-sm font-bold text-white">{yearProgress.toFixed(1)}%</span>
              </div>
              <Progress value={yearProgress} className="h-1.5 bg-white/20 [&>div]:bg-white" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="mb-0.5 text-[10px] text-white/70">Day</p>
                <p className="text-lg font-bold text-white">{profile.currentDay}</p>
              </div>
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="mb-0.5 text-[10px] text-white/70">Completion</p>
                <p className="text-lg font-bold text-white">{avgCompletionRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="mb-0.5 text-[10px] text-white/70">Streak</p>
                <p className="text-lg font-bold text-white">{stats?.currentStreak ?? profile.streak}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <h3 className="heading-3 mb-4 text-gray-900">Weekly Overview</h3>
            <div className="relative mb-3 h-40">
              <div className="absolute inset-0 flex items-end justify-around gap-1">
                {last7Days.map((day, index) => (
                  <div key={day.date + index} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      className="relative w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400"
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.rate / 100) * 120}px` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                    <span className={`text-xs ${index === 6 ? 'font-bold text-blue-500' : 'text-gray-500'}`}>{day.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
              <div className="text-center">
                <p className="mb-1 text-xs text-gray-500">Completed</p>
                <p className="text-lg font-bold text-gray-900">{last7Days.reduce((sum, d) => sum + d.completed, 0)}</p>
              </div>
              <div className="border-x border-gray-100 text-center">
                <p className="mb-1 text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{last7Days.reduce((sum, d) => sum + d.total, 0)}</p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-xs text-gray-500">Avg Rate</p>
                <p className="text-lg font-bold text-blue-500">{avgCompletionRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <h3 className="heading-3 mb-4 text-gray-900">Monthly Breakdown</h3>
            <div className="space-y-3">
              {monthlyStats.map((month, index) => (
                <motion.div key={month.month} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{month.month}</span>
                    <span className="text-sm font-bold text-gray-900">{month.rate}%</span>
                  </div>
                  <Progress value={month.rate} className="h-2 bg-gray-100 [&>div]:bg-blue-500" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
