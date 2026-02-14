import { useMemo } from 'react';
import { Flame } from 'lucide-react';

interface LifeCalendarProps {
  className?: string;
}

export default function LifeCalendar({ className = '' }: LifeCalendarProps) {
  // Load real data from localStorage
  const { calendarData, monthLabels, streak, yearProgress } = useMemo(() => {
    const history: Record<string, { completed: number; total: number }> = {};
    const saved = localStorage.getItem('ltr_questHistory');
    if (saved) {
      try { Object.assign(history, JSON.parse(saved)); } catch { /* ignore */ }
    }

    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const startDay = startOfYear.getDay(); // 0=Sun

    // Build 53 weeks x 7 days grid
    const weeks: { date: string; rate: number; isFuture: boolean }[][] = [];
    let currentWeek: { date: string; rate: number; isFuture: boolean }[] = [];

    // Pad first week
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
      currentWeek.push({ date: '', rate: -1, isFuture: false });
    }

    const endOfYear = new Date(year, 11, 31);
    const todayStr = now.toISOString().split('T')[0];
    let currentStreak = 0;
    let tempStreak = 0;

    for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const isFuture = dateStr > todayStr;
      const entry = history[dateStr];
      const rate = entry && entry.total > 0 ? entry.completed / entry.total : 0;

      // Count streak backwards from today
      if (!isFuture && dateStr <= todayStr) {
        if (rate > 0) tempStreak++;
        else if (dateStr < todayStr) tempStreak = 0;
      }

      currentWeek.push({ date: dateStr, rate: isFuture ? -1 : rate, isFuture });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push({ date: '', rate: -1, isFuture: true });
      weeks.push(currentWeek);
    }

    currentStreak = tempStreak;

    // Month labels
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels: { label: string; weekIdx: number }[] = [];
    months.forEach((label, monthIdx) => {
      const firstOfMonth = new Date(year, monthIdx, 1);
      const dayOfYear = Math.floor((firstOfMonth.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.floor((dayOfYear + (startDay === 0 ? 6 : startDay - 1)) / 7);
      labels.push({ label, weekIdx });
    });

    const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = year % 4 === 0 ? 366 : 365;

    return {
      calendarData: weeks,
      monthLabels: labels,
      streak: currentStreak,
      yearProgress: Math.round((dayOfYear / totalDays) * 100),
    };
  }, []);

  const getColor = (rate: number, isFuture: boolean) => {
    if (rate === -1 || isFuture) return 'bg-gray-50';
    if (rate === 0) return 'bg-gray-100';
    if (rate < 0.5) return 'bg-emerald-200';
    if (rate < 1) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-15 font-semibold text-gray-900">Life Calendar</h3>
          <p className="text-12 text-[#9CA3AF]">{new Date().getFullYear()}년</p>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-14 font-bold text-gray-900">{streak}일</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex mb-1 ml-4 overflow-x-auto">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-10 text-[#9CA3AF] flex-shrink-0"
            style={{ marginLeft: i === 0 ? `${m.weekIdx * 11}px` : '0', width: `${(monthLabels[i + 1]?.weekIdx || 53) - m.weekIdx}` ? `${((monthLabels[i + 1]?.weekIdx || 53) - m.weekIdx) * 11}px` : 'auto' }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex" style={{ gap: '2px' }}>
          {/* Day labels */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: '2px' }}>
            {['M', '', 'W', '', 'F', '', ''].map((d, i) => (
              <span key={i} className="text-10 text-[#9CA3AF] w-3 h-[9px] leading-[9px]">{d}</span>
            ))}
          </div>

          {calendarData.map((week, wi) => (
            <div key={wi} className="flex flex-col flex-shrink-0" style={{ gap: '2px' }}>
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`w-[9px] h-[9px] rounded-[2px] ${getColor(day.rate, day.isFuture)}`}
                  title={day.date ? `${day.date}: ${Math.round(day.rate * 100)}%` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend + Progress */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <span className="text-10 text-[#9CA3AF]">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div key={i} className={`w-[9px] h-[9px] rounded-[2px] ${getColor(v, false)}`} />
          ))}
          <span className="text-10 text-[#9CA3AF]">More</span>
        </div>
        <span className="text-12 font-semibold text-[#7C3AED]">{yearProgress}%</span>
      </div>
    </div>
  );
}
