import { motion } from 'motion/react';

interface GitHubContributionChartProps {
  data?: number[][]; // 7 rows (days) x 52 cols (weeks)
  className?: string;
}

export default function GitHubContributionChart({ data, className = '' }: GitHubContributionChartProps) {
  // Generate sample data if not provided (52 weeks x 7 days)
  const chartData = data || generateSampleData();

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value === 1) return 'bg-emerald-200';
    if (value === 2) return 'bg-emerald-300';
    if (value === 3) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const days = ['월', '', '수', '', '금', '', ''];

  // Calculate which months to show (every 4 weeks approximately)
  const getMonthLabels = () => {
    const labels: { index: number; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const weekIndex = Math.floor((i / 12) * 52);
      if (weekIndex < 52) {
        labels.push({ index: weekIndex, label: months[i] });
      }
    }
    return labels;
  };

  return (
    <div className={`${className}`}>
      {/* Month labels */}
      <div className="flex mb-1 ml-6">
        {getMonthLabels().map((month, idx) => (
          <span
            key={idx}
            className="text-[10px] text-gray-400"
            style={{ 
              position: 'relative',
              left: `${month.index * 3}px`,
              marginRight: '12px'
            }}
          >
            {month.label}
          </span>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] mr-1">
          {days.map((day, idx) => (
            <span key={idx} className="text-[10px] text-gray-400 h-[10px] leading-[10px]">
              {day}
            </span>
          ))}
        </div>

        {/* Chart grid */}
        <div className="flex gap-[2px] overflow-x-auto">
          {chartData.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[2px]">
              {week.map((value, dayIdx) => (
                <motion.div
                  key={`${weekIdx}-${dayIdx}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: (weekIdx * 7 + dayIdx) * 0.001,
                    duration: 0.2 
                  }}
                  className={`w-[10px] h-[10px] rounded-[2px] ${getColor(value)}`}
                  title={`Week ${weekIdx + 1}, Day ${dayIdx + 1}: ${value} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-gray-400">Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-[10px] h-[10px] rounded-[2px] ${getColor(level)}`}
          />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>
    </div>
  );
}

// Generate sample contribution data
function generateSampleData(): number[][] {
  const weeks: number[][] = [];
  const today = new Date();
  
  for (let week = 0; week < 52; week++) {
    const weekData: number[] = [];
    for (let day = 0; day < 7; day++) {
      // Create realistic looking data
      // More activity on weekdays, less on weekends
      const isWeekend = day === 5 || day === 6;
      const baseChance = isWeekend ? 0.3 : 0.6;
      
      // Recent weeks have more activity
      const recencyBonus = week > 40 ? 0.2 : 0;
      
      const random = Math.random();
      let value = 0;
      
      if (random < baseChance + recencyBonus) {
        value = Math.floor(Math.random() * 4) + 1;
      }
      
      weekData.push(value);
    }
    weeks.push(weekData);
  }
  
  return weeks;
}
