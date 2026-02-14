import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X, WandSparkles } from 'lucide-react';

interface FutureSelfVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  goal: string;
  initialPrompt?: string;
  onSave: (prompt: string) => void;
}

export default function FutureSelfVisualizer({
  isOpen,
  onClose,
  userName,
  goal,
  initialPrompt,
  onSave,
}: FutureSelfVisualizerProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');

  const palette = useMemo(() => {
    const seed = [...prompt].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 42;
    const palettes = [
      ['#0EA5E9', '#22D3EE', '#34D399'],
      ['#8B5CF6', '#EC4899', '#F97316'],
      ['#22C55E', '#84CC16', '#EAB308'],
      ['#6366F1', '#14B8A6', '#06B6D4'],
    ];
    return palettes[seed % palettes.length];
  }, [prompt]);

  const visionTitle = prompt.trim() || '미래의 나를 상상해보세요';

  const handleSave = () => {
    if (!prompt.trim()) return;
    onSave(prompt.trim());
    onClose();
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
            className="fixed inset-0 bg-black/40 z-[60]"
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
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-500" />
                  <h2 className="text-22 font-bold text-gray-900">Future Self</h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="text-13 text-[#6B7280] mb-2">달성한 미래의 나를 한 줄로 써보세요</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예) 올해 10kg 감량해서 하프 마라톤 완주"
                className="w-full h-24 bg-[#F3F4F6] rounded-2xl p-4 text-14 leading-relaxed resize-none"
              />

              <div
                className="rounded-3xl p-5 text-white mt-4 mb-5 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`,
                }}
              >
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/20 rounded-full" />
                <p className="text-12 text-white/80 mb-1">Vision Card</p>
                <p className="text-18 font-bold leading-tight mb-3 pr-6">{visionTitle}</p>
                <p className="text-12 text-white/85">{userName} · {goal}</p>
              </div>

              <button
                onClick={handleSave}
                disabled={!prompt.trim()}
                className="w-full py-4 rounded-14 text-15 font-semibold bg-[#111827] text-white disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <WandSparkles className="w-4 h-4" />
                비전 저장하기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
