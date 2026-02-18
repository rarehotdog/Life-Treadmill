import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Share2, X } from 'lucide-react';
import type { UserProfile } from '../../types/app';
import { Button, Card, CardContent } from '../ui';

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

      const grad = ctx.createLinearGradient(0, 0, 540, 540);
      grad.addColorStop(0, '#7C3AED');
      grad.addColorStop(1, '#4F46E5');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 540, 540, 24);
      ctx.fill();

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

      const link = document.createElement('a');
      link.download = `ltr-${streak}days.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Share card download error:', error);
    }
  };

  const handleShare = async () => {
    const text = `${streak}일 연속 달성! 🔥\nLv.${level} · ${profile.goal}\n#LifeTreadmills #NoMoreTreadmill`;

    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Life Treadmills' });
      } catch {
        // user canceled
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('클립보드에 복사되었어요!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            data-testid="share-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60"
          />
          <motion.div
            data-testid="share-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="modal-sheet safe-bottom"
          >
            <div className="modal-handle-wrap">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            <div className="modal-body">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="modal-title text-gray-900">공유하기</h2>
                <Button data-testid="share-modal-close" onClick={onClose} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              <Card
                ref={cardRef}
                className="relative mb-6 overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#7C3AED] to-indigo-600 text-white"
              >
                <CardContent className="card-padding">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5" />

                  <p className="caption-12 mb-6 font-medium text-white/60">LIFE TREADMILLS</p>

                  <p className="mb-2 text-36 font-extrabold leading-none">{streak}일 연속 🔥</p>
                  <p className="body-15 font-semibold">{profile.name}</p>
                  <p className="body-13 mt-1 text-white/70">Lv.{level} · {profile.goal}</p>

                  {questTitle ? <p className="body-13 mt-3 text-white/60">오늘: {questTitle}</p> : null}

                  <div className="mt-6">
                    <div className="h-2 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white" style={{ width: `${completionRate}%` }} />
                    </div>
                    <div className="caption-11 mt-2 flex justify-between text-white/50">
                      <span>오늘 완료율 {Math.round(completionRate)}%</span>
                      <span>#LifeTreadmills</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Button data-testid="share-modal-download" onClick={handleDownload} variant="secondary" className="cta-secondary bg-gray-100 text-gray-900">
                  <Download className="mr-2 h-5 w-5" />
                  이미지 저장
                </Button>
                <Button data-testid="share-modal-share" onClick={handleShare} className="cta-secondary bg-[#7C3AED] text-white hover:bg-[#7C3AED]">
                  <Share2 className="mr-2 h-5 w-5" />
                  공유하기
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
