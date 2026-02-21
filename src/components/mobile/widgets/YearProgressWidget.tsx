import { motion } from 'motion/react';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getYearImage, setItemString, STORAGE_KEYS } from '../../../lib/app-storage';
import { trackEvent } from '../../../lib/telemetry';

interface YearProgressWidgetProps {
  currentDay: number;
  goalId: string;
}

export default function YearProgressWidget({ currentDay, goalId }: YearProgressWidgetProps) {
  const [yearImage, setYearImage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = 365;
  const percentage = ((dayOfYear / totalDays) * 100).toFixed(1);

  const achievementRate = Math.min(100, currentDay);
  const brightness = 0.05 + (achievementRate / 100) * 0.95;
  const grayscale = 1 - achievementRate / 100;

  const dots = Array.from({ length: totalDays }, (_, i) => i < dayOfYear);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setYearImage(result);
      const writeResult = setItemString(STORAGE_KEYS.yearImage(goalId), result);
      if (!writeResult.success) {
        setSaveError('이미지 저장 실패: 저장공간을 확인해 주세요.');
        trackEvent('storage.write_failed', {
          scope: 'year_widget_image',
          reason: writeResult.reason ?? 'unknown',
        });
        return;
      }
      setSaveError(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const saved = getYearImage(goalId);
    setYearImage(saved);
  }, [goalId]);

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg">
      <div className="absolute inset-0 overflow-hidden">
        {yearImage ? (
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-1000"
            style={{ backgroundImage: `url(${yearImage})`, filter: `brightness(${brightness}) grayscale(${grayscale})` }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
        )}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 card-padding">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="heading-3 text-white">Year Progress</h2>
            <p className="body-13 text-white/60">{today.getFullYear()}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="heading-1 font-bold text-white">{percentage}%</p>
              <p className="caption-12 text-white/60">{dayOfYear}/{totalDays} days</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all ml-2"
            >
              <Upload size={14} className="text-white/80" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-full h-2 overflow-hidden mb-3">
          <motion.div
            className="h-full bg-white/90"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
          <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-0.5">
            {dots.slice(0, 182).map((filled, index) => (
              <div key={index} className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-[repeat(26,minmax(0,1fr))] gap-0.5">
            {dots.slice(182).map((filled, index) => (
              <div key={index + 182} className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="caption-12 text-white/70">Achievement: </span>
            <span className="caption-12 text-white font-bold">{achievementRate.toFixed(0)}%</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="caption-12 text-white/70">Brightness: </span>
            <span className="caption-12 text-white font-bold">{(brightness * 100).toFixed(0)}%</span>
          </div>
        </div>
        {saveError ? <p className="caption-12 mt-2 text-rose-200">{saveError}</p> : null}
      </div>
    </div>
  );
}
