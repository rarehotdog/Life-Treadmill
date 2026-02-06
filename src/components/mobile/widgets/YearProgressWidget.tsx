import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';

interface YearProgressWidgetProps {
  className?: string;
}

export default function YearProgressWidget({ className = '' }: YearProgressWidgetProps) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  
  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = totalDays - daysPassed;
  const progress = (daysPassed / totalDays) * 100;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">연간 진행률</h3>
          <p className="text-xs text-gray-500">{now.getFullYear()}년</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
        />
        {/* Marker for today */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-full shadow-md"
          style={{ marginLeft: '-2px' }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500">지나간 날</p>
          <p className="font-bold text-gray-900">{daysPassed}일</p>
        </div>
        <div className="text-center">
          <p className="text-blue-600 font-bold text-lg">{progress.toFixed(1)}%</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">남은 날</p>
          <p className="font-bold text-gray-900">{daysRemaining}일</p>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          오늘은 {formatDate(now)} · {now.getFullYear()}년의 {Math.round(progress)}%가 지났어요
        </p>
      </div>
    </div>
  );
}
