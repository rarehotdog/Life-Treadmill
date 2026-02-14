import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2 } from 'lucide-react';
import type { UserProfile } from '../../../App';

interface ShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  streak: number;
  level: number;
  completionRate: number;
  questTitle?: string;
}

export default function ShareCard({ isOpen, onClose, profile, streak, level, completionRate, questTitle }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw gradient background
      const grad = ctx.createLinearGradient(0, 0, 540, 540);
      grad.addColorStop(0, '#7C3AED');
      grad.addColorStop(1, '#4F46E5');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 540, 540, 24);
      ctx.fill();

      // Draw text
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('LIFE TREADMILLS', 40, 50);

      ctx.fillStyle = 'white';
      ctx.font = '800 48px Inter, sans-serif';
      ctx.fillText(`${streak}일 연속 🔥`, 40, 140);

      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillText(profile.name, 40, 200);

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText(`Lv.${level} · ${profile.goal}`, 40, 240);

      if (questTitle) {
        ctx.fillText(`오늘: ${questTitle}`, 40, 290);
      }

      // Progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.roundRect(40, 440, 460, 12, 6);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.roundRect(40, 440, 460 * (completionRate / 100), 12, 6);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillText(`오늘 완료율 ${Math.round(completionRate)}%`, 40, 480);
      ctx.fillText('#LifeTreadmills #NoMoreTreadmill', 40, 510);

      // Download
      const link = document.createElement('a');
      link.download = `ltr-${streak}days.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Share card download error:', e);
    }
  };

  const handleShare = async () => {
    const text = `${streak}일 연속 달성! 🔥\nLv.${level} · ${profile.goal}\n#LifeTreadmills #NoMoreTreadmill`;

    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Life Treadmills' });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('클립보드에 복사되었어요!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-3xl z-[61] safe-bottom"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-22 font-bold text-gray-900">공유하기</h2>
                <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Preview Card */}
              <div
                ref={cardRef}
                className="bg-gradient-to-br from-[#7C3AED] to-indigo-600 rounded-3xl p-6 text-white mb-6 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

                <p className="text-12 text-white/60 font-medium mb-6">LIFE TREADMILLS</p>

                <p className="text-36 font-extrabold leading-none mb-2">{streak}일 연속 🔥</p>
                <p className="text-15 font-semibold">{profile.name}</p>
                <p className="text-13 text-white/70 mt-1">Lv.{level} · {profile.goal}</p>

                {questTitle && (
                  <p className="text-13 text-white/60 mt-3">오늘: {questTitle}</p>
                )}

                <div className="mt-6">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${completionRate}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-11 text-white/50">
                    <span>오늘 완료율 {Math.round(completionRate)}%</span>
                    <span>#LifeTreadmills</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-4 bg-gray-100 rounded-14 text-15 font-medium text-gray-900"
                >
                  <Download className="w-5 h-5" />
                  이미지 저장
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-4 bg-[#7C3AED] rounded-14 text-15 font-medium text-white"
                >
                  <Share2 className="w-5 h-5" />
                  공유하기
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
